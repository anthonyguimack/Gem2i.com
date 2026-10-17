"""gem2i paid membership (adapted from AUX-1.0 routes/paid_membership.py).

AUX sells its membership to KMS readers; gem2i has no KMS, so here an already
registered member buys a monthly / annual plan from My Account. While the plan
is active the member sits on the level the CMS configures (e.g. Nivel 1);
when it lapses they go back to the level they had — access is never cut off
(gem2i members are free members first). Renewing extends from the current
expiry. One-time Stripe payment per period (no auto-renew), coupons apply.

Config (CMS-managed, `gem_config {key: 'membership_plans'}`):
  enabled, name {en,es}, description {en,es}, benefits [{en,es}],
  currency, prices {monthly, annual}, level_id (granted while active)

  Member:
    GET  /api/member/gem/membership                 offer + my status
    POST /api/member/gem/membership/quote           {plan, coupon?}
    POST /api/member/gem/membership/checkout        {plan, coupon?, origin_url}
    GET  /api/member/gem/membership/status/{sid}    success-page poll (verifies with Stripe)
  Admin:
    GET/PUT /api/admin/gem/membership-config
    GET     /api/admin/gem/membership-subscriptions
Stripe completion also arrives through the shared gem webhook
(gem_tickets.gem_payment_webhook dispatches kind='membership' here).
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from models.database import db, require_admin, logger
from routes.membership import get_current_member
from utils.runtime_config import get_stripe_api_key
from utils.stripe_helpers import StripeHelper

router = APIRouter()

PLANS = ("monthly", "annual")
PLAN_DAYS = {"monthly": 30, "annual": 365}
DEFAULT_CONFIG = {
    "key": "membership_plans",
    "enabled": False,
    "name": {"en": "GEM2i Premium", "es": "GEM2i Premium"},
    "description": {"en": "Unlock every member section and benefit.",
                    "es": "Desbloquea todas las secciones y beneficios para miembros."},
    "benefits": [],
    "currency": "usd",
    "prices": {"monthly": 0, "annual": 0},
    "level_id": "level_1",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(v):
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def membership_config() -> dict:
    cfg = await db.gem_config.find_one({"key": "membership_plans"}, {"_id": 0}) or {}
    return {**DEFAULT_CONFIG, **cfg, "prices": {**DEFAULT_CONFIG["prices"], **(cfg.get("prices") or {})}}


def _status_of(member: dict) -> dict:
    pm = member.get("paid_membership") or {}
    exp = _parse(pm.get("expires_at"))
    active = bool(pm.get("active")) and exp is not None and exp > _now()
    return {"active": active, "plan": pm.get("plan"), "expires_at": pm.get("expires_at"),
            "started_at": pm.get("started_at"), "lapsed": bool(pm) and not active}


async def apply_lapse_if_due(member: dict) -> dict:
    """Called from get_current_member when the member carries a paid membership:
    once it expires, restore the level they had before and mark it inactive.
    Cheap: a date comparison unless the plan actually just lapsed."""
    pm = member.get("paid_membership") or {}
    if not pm.get("active"):
        return member
    exp = _parse(pm.get("expires_at"))
    if exp is None or exp > _now():
        return member
    restore = pm.get("prev_level_id")
    update = {"paid_membership.active": False, "paid_membership.lapsed_at": _now().isoformat()}
    if member.get("level_id") == pm.get("level_id"):
        update["level_id"] = restore
    res = await db.members.update_one(
        {"member_id": member["member_id"], "paid_membership.active": True}, {"$set": update})
    if res.modified_count:
        from routes.gem_calendar import notify
        await notify(member["member_id"], "membership_lapsed",
                     {"en": "Your membership expired", "es": "Tu membresía venció"},
                     {"en": "Renew it from My Account to keep your premium benefits.",
                      "es": "Renuévala desde Mi cuenta para mantener tus beneficios premium."},
                     "/my-account/membership")
        member = {**member, "level_id": update.get("level_id", member.get("level_id")),
                  "paid_membership": {**pm, "active": False}}
    return member


def _public_cfg(cfg: dict) -> dict:
    return {k: cfg.get(k) for k in ("enabled", "name", "description", "benefits", "currency", "prices")}


async def _quote(cfg: dict, plan: str, coupon_code: str, member_id: str) -> dict:
    if plan not in PLANS:
        raise HTTPException(status_code=422, detail="plan must be monthly or annual")
    price = round(float(cfg["prices"].get(plan) or 0), 2)
    if price <= 0:
        raise HTTPException(status_code=400, detail="This plan is not available")
    discount, coupon = 0.0, None
    if (coupon_code or "").strip():
        from routes.gem_coupons import resolve_coupon
        c, discount = await resolve_coupon(coupon_code, member_id, "membership", price)
        coupon = {"id": c["id"], "code": c["code"], "discount": discount, "subtotal": price}
    total = round(price - discount, 2)
    if 0 < total < 0.5:
        raise HTTPException(status_code=422, detail="amount_below_minimum")
    return {"plan": plan, "price": price, "discount": discount, "total": total,
            "currency": cfg.get("currency") or "usd", "coupon": coupon}


async def activate_membership(tx: dict) -> dict:
    """Idempotent: the transaction flips pending → completed exactly once,
    then the member's period is set/extended and the level granted."""
    if tx.get("status") == "completed":
        return tx
    res = await db.gem_transactions.update_one(
        {"id": tx["id"], "status": {"$ne": "completed"}},
        {"$set": {"status": "completed", "completed_at": _now().isoformat()}})
    if res.modified_count == 0:
        return await db.gem_transactions.find_one({"id": tx["id"]}, {"_id": 0})
    member = await db.members.find_one({"member_id": tx["member_id"]}, {"_id": 0}) or {}
    cfg = await membership_config()
    pm = member.get("paid_membership") or {}
    cur_exp = _parse(pm.get("expires_at")) if pm.get("active") else None
    start = cur_exp if cur_exp and cur_exp > _now() else _now()
    expires = start + timedelta(days=PLAN_DAYS[tx["plan"]])
    level_id = cfg.get("level_id") or None
    prev_level = pm.get("prev_level_id") if pm.get("active") else member.get("level_id")
    new_pm = {"active": True, "plan": tx["plan"], "tx_id": tx["id"],
              "started_at": pm.get("started_at") if pm.get("active") else _now().isoformat(),
              "expires_at": expires.isoformat(), "level_id": level_id, "prev_level_id": prev_level}
    update = {"paid_membership": new_pm, "updated_at": _now().isoformat()}
    if level_id:
        update["level_id"] = level_id
    await db.members.update_one({"member_id": tx["member_id"]}, {"$set": update})
    await db.gem_transactions.update_one({"id": tx["id"]}, {"$set": {"period_end": expires.isoformat()}})
    if tx.get("coupon"):
        from routes.gem_coupons import record_redemption
        await record_redemption(tx["coupon"]["id"], tx["member_id"], "membership", tx["id"],
                                float(tx["coupon"].get("subtotal") or 0), float(tx["coupon"].get("discount") or 0),
                                tx.get("currency", ""))
    from routes.gem_calendar import notify
    exp_day = expires.strftime("%Y-%m-%d")
    await notify(tx["member_id"], "membership_active",
                 {"en": "Your membership is active", "es": "Tu membresía está activa"},
                 {"en": f"Thanks! Your premium benefits are on until {exp_day}.",
                  "es": f"¡Gracias! Tus beneficios premium están activos hasta el {exp_day}."},
                 "/my-account/membership")
    return {**tx, "status": "completed", "period_end": expires.isoformat()}


async def ensure_membership_indexes():
    await db.gem_transactions.create_index([("kind", 1), ("member_id", 1), ("created_at", -1)])


# ================================================================ MEMBER
@router.get("/member/gem/membership")
async def my_membership(member: dict = Depends(get_current_member)):
    cfg = await membership_config()
    history = await db.gem_transactions.find(
        {"member_id": member["member_id"], "kind": "membership", "status": "completed"},
        {"_id": 0, "id": 1, "plan": 1, "total": 1, "currency": 1, "completed_at": 1,
         "period_end": 1, "coupon.code": 1}).sort("completed_at", -1).to_list(50)
    return {"offer": _public_cfg(cfg), "status": _status_of(member), "history": history}


@router.post("/member/gem/membership/quote")
async def quote(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    cfg = await membership_config()
    if not cfg.get("enabled"):
        raise HTTPException(status_code=404, detail="Membership is not available")
    q = await _quote(cfg, body.get("plan"), body.get("coupon"), member["member_id"])
    q.pop("coupon", None)
    return q


@router.post("/member/gem/membership/checkout")
async def checkout(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    origin = (body.get("origin_url") or "").rstrip("/")
    if not origin:
        raise HTTPException(status_code=422, detail="origin_url required")
    cfg = await membership_config()
    if not cfg.get("enabled"):
        raise HTTPException(status_code=404, detail="Membership is not available")
    q = await _quote(cfg, body.get("plan"), body.get("coupon"), member["member_id"])
    from routes.gem_passes import _member_display
    name, email = _member_display(member)
    tx_id = str(uuid.uuid4())
    plan_name = (cfg.get("name") or {}).get("en") or "Membership"
    session = None
    if q["total"] > 0:
        api_key = await get_stripe_api_key()
        if not api_key:
            raise HTTPException(status_code=503, detail="Payments are not configured yet")
        session = await StripeHelper(api_key).create_checkout_session(
            amount=q["total"], currency=q["currency"],
            product_name=f"{plan_name} — {'Annual' if q['plan'] == 'annual' else 'Monthly'}",
            success_url=f"{origin}/my-account/membership?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/my-account/membership",
            metadata={"gem_tx_id": tx_id, "kind": "membership", "plan": q["plan"]},
        )
    tx = {
        "id": tx_id, "kind": "membership", "status": "pending", "plan": q["plan"],
        "member_id": member["member_id"], "member_name": name, "member_email": email,
        "subtotal": q["price"], "total": q["total"], "currency": q["currency"], "coupon": q["coupon"],
        "payment": ({"provider": "stripe", "session_id": session.session_id} if session
                    else {"provider": "coupon", "session_id": f"free_{tx_id}"}),
        "created_at": _now().isoformat(),
    }
    await db.gem_transactions.insert_one(dict(tx))
    if session is None:
        await activate_membership(tx)
        return {"url": f"{origin}/my-account/membership?session_id=free_{tx_id}", "free": True}
    return {"url": session.url, "session_id": session.session_id}


@router.get("/member/gem/membership/status/{session_id}")
async def checkout_status(session_id: str, member: dict = Depends(get_current_member)):
    tx = await db.gem_transactions.find_one(
        {"payment.session_id": session_id, "member_id": member["member_id"], "kind": "membership"}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    if tx.get("status") == "completed" or (tx.get("payment") or {}).get("provider") == "coupon":
        return {"payment_status": "paid" if tx.get("status") == "completed" else tx.get("status")}
    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Payments not configured")
    st = await StripeHelper(api_key).get_checkout_status(session_id)
    if st.payment_status == "paid":
        if st.amount_total is not None and st.amount_total != round(float(tx.get("total") or 0) * 100):
            raise HTTPException(status_code=409, detail="Amount mismatch — contact support")
        await activate_membership(tx)
        return {"payment_status": "paid"}
    return {"payment_status": st.payment_status}


# ================================================================ ADMIN
@router.get("/admin/gem/membership-config")
async def admin_get_config(user: dict = Depends(require_admin)):
    cfg = await membership_config()
    levels = await db.member_levels.find({}, {"_id": 0, "id": 1, "name": 1}).sort("order", 1).to_list(50)
    return {"config": cfg, "levels": levels}


@router.put("/admin/gem/membership-config")
async def admin_put_config(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()

    def _loc(v):
        if isinstance(v, dict):
            return {"en": str(v.get("en") or "")[:500], "es": str(v.get("es") or "")[:500]}
        return {"en": str(v or "")[:500], "es": ""}

    prices = {}
    for p in PLANS:
        try:
            prices[p] = max(0.0, round(float((body.get("prices") or {}).get(p) or 0), 2))
        except (TypeError, ValueError):
            prices[p] = 0.0
    level_id = body.get("level_id") or None
    if level_id and not await db.member_levels.find_one({"id": level_id}, {"_id": 1}):
        raise HTTPException(status_code=422, detail="Unknown level")
    doc = {
        "key": "membership_plans", "enabled": bool(body.get("enabled")),
        "name": _loc(body.get("name")), "description": _loc(body.get("description")),
        "benefits": [_loc(b) for b in (body.get("benefits") or [])][:12],
        "currency": (body.get("currency") or "usd").lower()[:3], "prices": prices,
        "level_id": level_id, "updated_at": _now().isoformat(),
    }
    if doc["enabled"] and not any(prices.values()):
        raise HTTPException(status_code=422, detail="Set a price for at least one plan before enabling")
    await db.gem_config.update_one({"key": "membership_plans"}, {"$set": doc}, upsert=True)
    return await membership_config()


@router.get("/admin/gem/membership-subscriptions")
async def admin_subscriptions(user: dict = Depends(require_admin)):
    rows = await db.gem_transactions.find({"kind": "membership"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    ids = list({r["member_id"] for r in rows})
    members = {m["member_id"]: m async for m in db.members.find(
        {"member_id": {"$in": ids}}, {"_id": 0, "member_id": 1, "membership_id": 1, "paid_membership": 1})}
    for r in rows:
        m = members.get(r["member_id"]) or {}
        r["membership_id"] = m.get("membership_id", "")
        r["member_status"] = _status_of(m)
    return {"items": rows}
