"""gem2i Phase-5 — e-ticketing + Stripe + purchase economics (plan B1/B2/B3, §5).

Public:
  GET  /api/public/gem/events/{event_id}/tier-availability   remaining per tier
  POST /api/public/gem/payment-webhook                        Stripe webhook (verified)

Member (identity from JWT ONLY):
  POST /api/member/gem/checkout                    {event_id, tier, quantity, origin_url}
  GET  /api/member/gem/checkout-status/{session_id}   poll from the success page
  GET  /api/member/gem/my-tickets/{event_id}

Payments (D3): Stripe via the CMS-managed key (utils.runtime_config), one stack
platform-wide. The webhook NEVER trusts its payload (the legacy disabled-IPN
hole, fixed by construction):
  1. If `gem_config {key:'payments'}.webhook_secret` is set, the Stripe
     signature is verified first (forged body → 400).
  2. Regardless, completion state comes from retrieving the session FROM
     Stripe's API server-to-server — a forged session id fails retrieval, a
     real-but-unpaid session stays pending. The webhook body is only a hint.
  3. The paid amount reported by Stripe must match the transaction total.

Stock: per-tier arithmetic-on-read over gem_transactions (kind=ticket), where
`completed` always counts and `pending` counts only while its checkout session
is fresh (PENDING_HOLD_MINUTES) — abandoned checkouts release automatically.

Economics (B3): on completion the transaction stores {cost, profit,
commissions[6]} computed from tier cost and the 6 percentage levels in
`gem_config {key:'ecommissions'}` (seeded with zeros; operator/ETL sets real
values). Recipient resolution along the sponsor chain is report-time work
(post member-merge) — the per-transaction amounts are frozen here.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from models.database import db, require_admin, logger
from routes.membership import get_current_member
from routes.gem_passes import _make_qr, _member_display, _public_event_or_404, _now_iso, _today
from utils.runtime_config import get_stripe_api_key
from utils.stripe_helpers import StripeHelper

router = APIRouter()

TIER_KEYS = ["admission", "eprice", "vip", "gold", "ultra", "platinium"]
TIER_LABELS = {
    "admission": "G. Admission", "eprice": "ePrice", "vip": "VIP",
    "gold": "Gold", "ultra": "Ultra", "platinium": "Platinium",
}
PENDING_HOLD_MINUTES = 60
MAX_QTY = 10


async def seed_gem_ecommissions():
    """Ensure the 6-level split config exists (zeros until the operator/ETL
    sets the real legacy percentages). Idempotent, runs at startup."""
    await db.gem_config.update_one(
        {"key": "ecommissions"},
        {"$setOnInsert": {"key": "ecommissions", "levels": [0, 0, 0, 0, 0, 0]}},
        upsert=True)


# ---------------------------------------------------------------- helpers
def _tiers_of(ev: dict) -> dict:
    """Configured tiers only: price > 0 and stock set."""
    tiers = ev.get("tiers") or {}
    out = {}
    for k in TIER_KEYS:
        t = tiers.get(k) or {}
        if float(t.get("price") or 0) > 0 and int(t.get("stock") or 0) > 0:
            out[k] = {
                "label": t.get("label") or TIER_LABELS[k],
                "price": float(t["price"]),
                "cost": float(t.get("cost") or 0),
                "stock": int(t["stock"]),
            }
    return out


async def _sold(event_id: str, tier: str) -> int:
    """Tickets consuming stock: completed always; pending only while the
    checkout session is fresh (abandoned sessions auto-release)."""
    hold_cutoff = (datetime.now(timezone.utc) - timedelta(minutes=PENDING_HOLD_MINUTES)).isoformat()
    agg = db.gem_transactions.aggregate([
        {"$match": {"event_id": event_id, "kind": "ticket", "tier": tier,
                    "$or": [{"status": "completed"},
                            {"status": "pending", "created_at": {"$gte": hold_cutoff}}]}},
        {"$group": {"_id": None, "n": {"$sum": {"$ifNull": ["$quantity", 1]}}}},
    ])
    rows = await agg.to_list(1)
    return rows[0]["n"] if rows else 0


async def _availability(ev: dict) -> dict:
    out = {}
    for k, t in (_tiers_of(ev)).items():
        out[k] = {**t, "available": max(0, t["stock"] - await _sold(ev["id"], k))}
    return out


async def _economics(tier_cfg: dict, quantity: int, total: float) -> dict:
    cfg = await db.gem_config.find_one({"key": "ecommissions"}, {"_id": 0}) or {}
    levels = (cfg.get("levels") or [0] * 6)[:6]
    cost = round(tier_cfg.get("cost", 0) * quantity, 2)
    profit = round(total - cost, 2)
    return {"cost": cost, "profit": profit,
            "commissions": [round(profit * float(p or 0) / 100, 2) for p in levels]}


async def _send_ticket_email(to_email: str, to_name: str, ev: dict, tx: dict):
    from utils.email_render import render_and_send
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    site = (settings.get("site_url") or "").rstrip("/")
    qr_url = tx.get("qr", {}).get("image_url") or ""
    await render_and_send(
        "gem_ticket", settings, to_email, to_name,
        variables={
            "name": to_name,
            "event_title": ev.get("title", ""),
            "event_date": ev.get("event_date", ""),
            "tier_label": tx.get("tier_label", tx.get("tier", "")),
            "quantity": str(tx.get("quantity", 1)),
            "total": f"{tx.get('total', 0):.2f} {str(tx.get('currency', 'usd')).upper()}",
            "ticket_code": tx.get("qr", {}).get("code", ""),
            "qr_image_url": f"{site}{qr_url}" if qr_url.startswith("/") else qr_url,
            "event_url": f"{site}/events/{ev.get('slug', '')}",
        },
    )


async def _complete_ticket(tx: dict, background: BackgroundTasks | None = None) -> dict:
    """Idempotent completion: QR + economics + email exactly once."""
    if tx.get("status") == "completed":
        return tx
    ev = await db.gem_events.find_one({"id": tx["event_id"]}, {"_id": 0}) or {}
    tier_cfg = (_tiers_of(ev)).get(tx.get("tier")) or {"cost": 0}
    code = uuid.uuid4().hex
    patch = {
        "status": "completed",
        "completed_at": _now_iso(),
        "qr": {"code": code, "image_url": _make_qr(code)},
        "economics": await _economics(tier_cfg, int(tx.get("quantity") or 1), float(tx.get("total") or 0)),
    }
    res = await db.gem_transactions.update_one(
        {"id": tx["id"], "status": {"$ne": "completed"}}, {"$set": patch})
    if res.modified_count == 0:  # lost the race to another completer — no double QR/email
        return await db.gem_transactions.find_one({"id": tx["id"]}, {"_id": 0})
    tx = {**tx, **patch}
    if tx.get("member_email"):
        if background is not None:
            background.add_task(_send_ticket_email, tx["member_email"], tx.get("member_name", ""), ev, tx)
        else:
            try:
                await _send_ticket_email(tx["member_email"], tx.get("member_name", ""), ev, tx)
            except Exception as e:
                logger.warning(f"gem ticket email failed: {e}")
    return tx


# ================================================================ PUBLIC
@router.get("/public/gem/events/{event_id}/tier-availability")
async def tier_availability(event_id: str):
    ev = await _public_event_or_404(event_id)
    if ev.get("type") != "eticket":
        return {"tiers": {}, "currency": None}
    return {"tiers": await _availability(ev),
            "currency": (ev.get("payment") or {}).get("currency") or "usd"}


@router.post("/public/gem/payment-webhook")
async def gem_payment_webhook(request: Request, background: BackgroundTasks):
    body = await request.body()
    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Payments not configured")

    # 1) Signature verification when a webhook secret is configured (gem_config,
    #    never `settings` — house rule).
    pay_cfg = await db.gem_config.find_one({"key": "payments"}, {"_id": 0}) or {}
    secret = pay_cfg.get("webhook_secret")
    if secret:
        import stripe as _stripe
        try:
            _stripe.Webhook.construct_event(
                body, request.headers.get("Stripe-Signature", ""), secret)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid signature")

    helper = StripeHelper(api_key)
    try:
        event = await helper.handle_webhook(body, request.headers.get("Stripe-Signature"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    if not event.session_id:
        raise HTTPException(status_code=400, detail="No session in payload")

    tx = await db.gem_transactions.find_one(
        {"payment.session_id": event.session_id, "kind": "ticket"}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Unknown session")

    # 2) The payload is only a hint — Stripe's API is the source of truth.
    status = await helper.get_checkout_status(event.session_id)
    if status.payment_status != "paid":
        return {"status": "ignored"}
    # 3) Amount must match what we quoted (forged/partial sessions rejected).
    if status.amount_total is not None and status.amount_total != round(float(tx.get("total") or 0) * 100):
        logger.error(f"gem webhook amount mismatch tx={tx['id']} stripe={status.amount_total}")
        raise HTTPException(status_code=400, detail="Amount mismatch")

    await _complete_ticket(tx, background)
    return {"status": "ok"}


# ================================================================ MEMBER
@router.post("/member/gem/checkout")
async def gem_checkout(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    event_id, tier = body.get("event_id"), body.get("tier")
    quantity = int(body.get("quantity") or 1)
    origin = (body.get("origin_url") or "").rstrip("/")
    if not event_id or not tier or not origin:
        raise HTTPException(status_code=422, detail="event_id, tier and origin_url required")
    if not (1 <= quantity <= MAX_QTY):
        raise HTTPException(status_code=422, detail=f"Quantity must be 1-{MAX_QTY}")

    ev = await _public_event_or_404(event_id)
    if ev.get("type") != "eticket":
        raise HTTPException(status_code=422, detail="This event does not sell e-tickets")
    if (ev.get("event_date") or "") < _today():
        raise HTTPException(status_code=422, detail="This event already happened")
    tiers = _tiers_of(ev)
    if tier not in tiers:
        raise HTTPException(status_code=404, detail="Unknown tier")
    t = tiers[tier]
    if await _sold(event_id, tier) + quantity > t["stock"]:
        raise HTTPException(status_code=409, detail="tier_sold_out")

    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Payments are not configured yet")

    currency = (ev.get("payment") or {}).get("currency") or "usd"
    total = round(t["price"] * quantity, 2)
    name, email = _member_display(member)
    tx_id = str(uuid.uuid4())

    helper = StripeHelper(api_key)
    session = await helper.create_checkout_session(
        amount=total, currency=currency,
        product_name=f"{ev.get('title', 'Event')} — {t['label']} x{quantity}",
        success_url=f"{origin}/tickets/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/events/{ev.get('slug', '')}",
        metadata={"gem_tx_id": tx_id, "event_id": event_id, "tier": tier},
    )

    tx = {
        "id": tx_id,
        "event_id": event_id,
        "member_id": member["member_id"],   # identity from JWT ONLY
        "member_name": name,
        "member_email": email,
        "kind": "ticket",
        "status": "pending",
        "tier": tier,
        "tier_label": t["label"],
        "quantity": quantity,
        "amount": t["price"],
        "total": total,
        "currency": currency,
        "payment": {"provider": "stripe", "session_id": session.session_id},
        "created_at": _now_iso(),
    }
    await db.gem_transactions.insert_one(dict(tx))

    # Insert-then-verify (same pattern as guest passes): if a race oversold the
    # tier, void our pending hold before the member pays.
    if await _sold(event_id, tier) > t["stock"]:
        await db.gem_transactions.update_one(
            {"id": tx_id}, {"$set": {"status": "canceled", "canceled_at": _now_iso(),
                                     "canceled_by": "system_oversell"}})
        raise HTTPException(status_code=409, detail="tier_sold_out")

    return {"url": session.url, "session_id": session.session_id}


@router.get("/member/gem/checkout-status/{session_id}")
async def gem_checkout_status(session_id: str, background: BackgroundTasks,
                              member: dict = Depends(get_current_member)):
    """Success-page poll. Also completes the transaction when Stripe reports
    paid (same verified retrieve as the webhook), so the flow works even
    before the operator wires the webhook endpoint in Stripe."""
    tx = await db.gem_transactions.find_one(
        {"payment.session_id": session_id, "member_id": member["member_id"]}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    if tx.get("status") == "completed":
        return {"payment_status": "paid", "transaction": tx}
    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Payments not configured")
    status = await StripeHelper(api_key).get_checkout_status(session_id)
    if status.payment_status == "paid":
        if status.amount_total is not None and status.amount_total != round(float(tx.get("total") or 0) * 100):
            raise HTTPException(status_code=409, detail="Amount mismatch — contact support")
        tx = await _complete_ticket(tx, background)
        return {"payment_status": "paid", "transaction": tx}
    return {"payment_status": status.payment_status, "transaction": None}


@router.get("/member/gem/my-tickets/{event_id}")
async def my_tickets(event_id: str, member: dict = Depends(get_current_member)):
    cursor = db.gem_transactions.find(
        {"event_id": event_id, "member_id": member["member_id"], "kind": "ticket",
         "status": "completed"}, {"_id": 0}).sort([("created_at", -1)])
    return {"items": await cursor.to_list(50)}
