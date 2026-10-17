"""gem2i discount coupons (ported in spirit from AUX-1.0 routes/coupons.py).

Applies to e-ticket checkout and to the paid membership. gem_* collections only.

  Admin:
    GET    /api/admin/gem/coupons                 list (+ live usage)
    POST   /api/admin/gem/coupons                 create
    PUT    /api/admin/gem/coupons/{id}            update
    DELETE /api/admin/gem/coupons/{id}            delete (redemptions kept)
    GET    /api/admin/gem/coupons/{id}/redemptions
  Member (identity from JWT only):
    POST   /api/member/gem/coupons/validate       {code, context, amount, event_id?}

Coupon fields:
  code            uppercase, unique
  discount_type   'percent' (0-100) | 'flat' (amount in the checkout currency)
  discount_value
  applies_to      'tickets' | 'membership' | 'all'
  event_ids       [] = every event; else only those events (tickets)
  usage_mode      'total' (pooled) | 'per_member'
  usage_limit     0 = unlimited
  expires_at      ISO date/datetime or null
  active          bool
A redemption is recorded when the purchase COMPLETES (one per transaction,
unique index), so abandoned checkouts never burn a use.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from models.database import db, require_admin, logger
from routes.membership import get_current_member

router = APIRouter()

CONTEXTS = ("tickets", "membership")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(body: dict) -> dict:
    code = "".join((body.get("code") or "").split()).upper()
    if not code or len(code) > 40:
        raise HTTPException(status_code=422, detail="Code is required (max 40 characters)")
    dtype = body.get("discount_type") or "percent"
    if dtype not in ("percent", "flat"):
        raise HTTPException(status_code=422, detail="discount_type must be percent or flat")
    try:
        value = float(body.get("discount_value") or 0)
    except (TypeError, ValueError):
        value = 0.0
    value = max(0.0, min(100.0, value)) if dtype == "percent" else max(0.0, round(value, 2))
    if value <= 0:
        raise HTTPException(status_code=422, detail="The discount must be greater than 0")
    applies_to = body.get("applies_to") if body.get("applies_to") in ("tickets", "membership", "all") else "all"
    usage_mode = body.get("usage_mode") if body.get("usage_mode") in ("total", "per_member") else "total"
    event_ids = [e for e in (body.get("event_ids") or []) if isinstance(e, str) and e]
    return {
        "code": code, "discount_type": dtype, "discount_value": value,
        "applies_to": applies_to, "event_ids": event_ids if applies_to != "membership" else [],
        "usage_mode": usage_mode, "usage_limit": max(0, int(body.get("usage_limit") or 0)),
        "expires_at": body.get("expires_at") or None,
        "active": bool(body.get("active", True)),
        "description": (body.get("description") or "").strip()[:200],
    }


def _expired(c: dict) -> bool:
    exp = c.get("expires_at")
    if not exp:
        return False
    try:
        s = str(exp)
        if len(s) == 10:  # a bare date is valid through the end of that day
            s += "T23:59:59+00:00"
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > dt
    except Exception:
        return False


def discount_for(c: dict, amount: float) -> float:
    if c["discount_type"] == "percent":
        d = amount * c["discount_value"] / 100.0
    else:
        d = c["discount_value"]
    return round(min(max(d, 0.0), amount), 2)


async def resolve_coupon(code: str, member_id: str, context: str, amount: float,
                         event_id: str | None = None) -> tuple[dict, float]:
    """Validate a coupon for this member/purchase. Returns (coupon, discount).
    Raises HTTPException(400/404) with a member-readable reason."""
    code = "".join((code or "").split()).upper()
    if not code:
        raise HTTPException(status_code=422, detail="Enter a coupon code")
    c = await db.gem_coupons.find_one({"code": code}, {"_id": 0})
    if not c or not c.get("active"):
        raise HTTPException(status_code=404, detail="coupon_invalid")
    if _expired(c):
        raise HTTPException(status_code=400, detail="coupon_expired")
    if c["applies_to"] not in ("all", context):
        raise HTTPException(status_code=400, detail="coupon_not_applicable")
    if context == "tickets" and c.get("event_ids") and event_id not in c["event_ids"]:
        raise HTTPException(status_code=400, detail="coupon_not_applicable")
    limit = int(c.get("usage_limit") or 0)
    if limit > 0:
        if c.get("usage_mode") == "per_member":
            used = await db.gem_coupon_redemptions.count_documents({"coupon_id": c["id"], "member_id": member_id})
        else:
            used = int(c.get("usage_count") or 0)
        if used >= limit:
            raise HTTPException(status_code=400, detail="coupon_used_up")
    if amount <= 0:
        raise HTTPException(status_code=422, detail="Invalid amount")
    return c, discount_for(c, amount)


async def record_redemption(coupon_id: str, member_id: str, context: str, reference_id: str,
                            original: float, discount: float, currency: str = ""):
    """Idempotent per transaction (unique reference_id)."""
    if not coupon_id or not reference_id:
        return
    try:
        await db.gem_coupon_redemptions.insert_one({
            "id": str(uuid.uuid4()), "coupon_id": coupon_id, "member_id": member_id,
            "context": context, "reference_id": reference_id, "original": original,
            "discount": discount, "currency": currency, "created_at": _now_iso(),
        })
    except Exception:
        return  # already recorded (webhook + success-page poll both complete)
    await db.gem_coupons.update_one({"id": coupon_id}, {"$inc": {"usage_count": 1}})


async def ensure_coupon_indexes():
    await db.gem_coupons.create_index("code", unique=True)
    await db.gem_coupon_redemptions.create_index("reference_id", unique=True)
    await db.gem_coupon_redemptions.create_index([("coupon_id", 1), ("member_id", 1)])


# ================================================================ ADMIN
@router.get("/admin/gem/coupons")
async def admin_list(user: dict = Depends(require_admin)):
    return {"items": await db.gem_coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)}


@router.post("/admin/gem/coupons")
async def admin_create(request: Request, user: dict = Depends(require_admin)):
    doc = _clean(await request.json())
    if await db.gem_coupons.find_one({"code": doc["code"]}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="A coupon with this code already exists")
    doc.update({"id": str(uuid.uuid4()), "usage_count": 0, "created_at": _now_iso(), "updated_at": _now_iso()})
    await db.gem_coupons.insert_one(dict(doc))
    return doc


@router.put("/admin/gem/coupons/{cid}")
async def admin_update(cid: str, request: Request, user: dict = Depends(require_admin)):
    doc = _clean(await request.json())
    clash = await db.gem_coupons.find_one({"code": doc["code"], "id": {"$ne": cid}}, {"_id": 1})
    if clash:
        raise HTTPException(status_code=409, detail="A coupon with this code already exists")
    doc["updated_at"] = _now_iso()
    res = await db.gem_coupons.update_one({"id": cid}, {"$set": doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.gem_coupons.find_one({"id": cid}, {"_id": 0})


@router.delete("/admin/gem/coupons/{cid}")
async def admin_delete(cid: str, user: dict = Depends(require_admin)):
    res = await db.gem_coupons.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "deleted"}


@router.get("/admin/gem/coupons/{cid}/redemptions")
async def admin_redemptions(cid: str, user: dict = Depends(require_admin)):
    rows = await db.gem_coupon_redemptions.find({"coupon_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    ids = list({r["member_id"] for r in rows if r.get("member_id")})
    members = {m["member_id"]: m async for m in db.members.find(
        {"member_id": {"$in": ids}}, {"_id": 0, "member_id": 1, "first_name": 1, "last_name": 1, "membership_id": 1})}
    for r in rows:
        m = members.get(r.get("member_id")) or {}
        r["member_name"] = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        r["membership_id"] = m.get("membership_id", "")
    return {"items": rows}


# ================================================================ MEMBER
@router.post("/member/gem/coupons/validate")
async def member_validate(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    context = body.get("context") if body.get("context") in CONTEXTS else "tickets"
    try:
        amount = round(float(body.get("amount") or 0), 2)
    except (TypeError, ValueError):
        amount = 0.0
    c, discount = await resolve_coupon(body.get("code"), member["member_id"], context, amount, body.get("event_id"))
    return {"valid": True, "code": c["code"], "discount_type": c["discount_type"],
            "discount_value": c["discount_value"], "original": amount,
            "discount": discount, "total": round(amount - discount, 2)}
