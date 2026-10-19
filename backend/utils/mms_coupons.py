"""KMS reader coupons — checkout side (s149, MMS_COUPONS_KMS_PLAN).

The MMS creates the coupons (`mms_coupons`, same Mongo DB as this CMS); the KMS
paywall and the paid membership page (routes/paid_membership.py) apply them
here — the same coupon works for either, `used_for` records where. Rules (Anthony, 2026-10-09):
- fixed USD amount or percentage, valid for ONE plan (monthly | annual);
- single use; the discount applies to EVERY charge (Stripe `duration: forever`);
- bound to the reader's subscriber cookie (email) — no extra form;
- amount above the price → $0. A $0 result never touches Stripe: the reader is
  activated directly and the purchase is recorded like a Stripe one, flagged
  `paid_with_coupon`;
- points are awarded on the LIST price (the coupon never changes points).
States mirror the LMS (s136): available · reserved (informative, NO lock, NO
time limit) · used. Single use is enforced by the atomic consume + the Stripe
coupon's `max_redemptions: 1` + expiring the other open sessions.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone

from models.database import db

logger = logging.getLogger(__name__)

PLAN_LABEL = {"monthly": "monthly", "annual": "annual"}


class CouponError(Exception):
    pass


def norm_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9-]", "", (code or "").strip().upper())[:40]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def final_price(list_price: float, coupon: dict) -> float:
    v = float(coupon.get("value") or 0)
    if coupon.get("discount_type") == "amount":
        out = list_price - v
    else:
        out = list_price * (1 - v / 100.0)
    return round(max(0.0, out), 2)


async def find_usable(code: str, plan: str, email: str) -> dict:
    """The coupon if this reader may apply it to this plan, else CouponError
    with the message shown at the paywall."""
    code = norm_code(code)
    if not code:
        raise CouponError("Please enter a coupon code.")
    c = await db.mms_coupons.find_one({"code": code, "deleted": {"$ne": True}}, {"_id": 0})
    if not c:
        raise CouponError("This coupon code does not exist.")
    if c.get("status") == "used":
        raise CouponError("This coupon has already been used.")
    if c.get("plan") and c["plan"] != plan:
        raise CouponError(f"This coupon is for the {PLAN_LABEL.get(c['plan'], c['plan'])} plan.")
    return c


async def reserve(coupon: dict, email: str) -> None:
    res = await db.mms_coupons.update_one(
        {"id": coupon["id"], "status": {"$ne": "used"}},
        {"$set": {"status": "reserved", "reserved_email": email, "checkout_at": _now()}})
    if not res.matched_count:
        raise CouponError("This coupon has already been used.")


async def attach_session(coupon_id: str, session_id: str) -> None:
    await db.mms_coupons.update_one(
        {"id": coupon_id, "status": {"$ne": "used"}},
        {"$set": {"reserved_session": session_id}, "$addToSet": {"checkout_sessions": session_id}})


async def consume(coupon_id: str, email: str, txn: str, plan: str,
                  list_price: float, paid: float, used_for: str = "kms_reader") -> bool:
    """Mark used (idempotent), then expire every OTHER open Stripe checkout
    carrying it. Returns False when it was already used."""
    before = await db.mms_coupons.find_one_and_update(
        {"id": coupon_id, "status": {"$ne": "used"}},
        {"$set": {"status": "used", "used_email": email, "used_at": _now(),
                  "transaction_id": txn, "plan_used": plan, "used_for": used_for,
                  "list_price": round(list_price, 2), "amount_paid": round(paid, 2),
                  "discount_applied": round(list_price - paid, 2)},
         "$unset": {"reserved_email": "", "reserved_session": ""}})
    if before:
        await expire_sessions([s for s in (before.get("checkout_sessions") or []) if s != txn])
    return bool(before)


async def expire_sessions(session_ids: list) -> None:
    if not session_ids:
        return
    from utils.runtime_config import get_stripe_api_key
    key = await get_stripe_api_key()
    if not key:
        return
    import stripe
    for sid in session_ids:
        try:
            sess = await asyncio.to_thread(stripe.checkout.Session.retrieve, sid, api_key=key)
            if sess.status == "open" and sess.payment_status != "paid":
                await asyncio.to_thread(stripe.checkout.Session.expire, sid, api_key=key)
        except Exception:
            pass


async def release_for(email: str) -> int:
    """Reader came back from Stripe without paying: coupons this reader holds
    in checkout go back to available and their open session is expired."""
    rows = await db.mms_coupons.find({"status": "reserved", "reserved_email": email}, {"_id": 0}).to_list(20)
    for c in rows:
        sid = c.get("reserved_session")
        if sid:
            from utils.runtime_config import get_stripe_api_key
            key = await get_stripe_api_key()
            if key:
                try:
                    import stripe
                    sess = await asyncio.to_thread(stripe.checkout.Session.retrieve, sid, api_key=key)
                    if sess.payment_status == "paid":
                        continue  # paid meanwhile — the webhook marks it used
                    if sess.status == "open":
                        await asyncio.to_thread(stripe.checkout.Session.expire, sid, api_key=key)
                except Exception:
                    pass
        await db.mms_coupons.update_one(
            {"id": c["id"], "status": "reserved"},
            {"$set": {"status": "available"},
             "$unset": {"reserved_email": "", "reserved_session": "", "checkout_at": ""}})
    return len(rows)


async def stripe_coupon_id(coupon: dict, api_key: str, brand: dict) -> str:
    """One Stripe coupon per MMS coupon (created lazily, reused across checkout
    attempts): duration forever (every charge) + max_redemptions 1 (Stripe
    itself refuses a second use)."""
    if coupon.get("stripe_coupon_id"):
        return coupon["stripe_coupon_id"]
    import stripe
    params = {"duration": "forever", "max_redemptions": 1,
              "name": f"{brand.get('name') or 'KMS'} · {coupon['code']}"[:40],
              "metadata": {"mms_coupon_id": coupon["id"], "code": coupon["code"],
                           "site": brand.get("site", ""), "brand": brand.get("name", "")}}
    if coupon.get("discount_type") == "amount":
        params.update(amount_off=int(round(float(coupon["value"]) * 100)), currency="usd")
    else:
        params["percent_off"] = float(coupon["value"])
    sc = await asyncio.to_thread(lambda: stripe.Coupon.create(api_key=api_key, **params))
    await db.mms_coupons.update_one({"id": coupon["id"]}, {"$set": {"stripe_coupon_id": sc.id}})
    return sc.id
