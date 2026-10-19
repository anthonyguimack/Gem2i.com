"""Purchase emails for platform subscriptions (s149): KMS subscription receipt,
membership receipt and the membership "create your password" email. Templates
live in models/email_templates.py (auto-seeded, editable in the CMS). Always
best-effort and fire-and-forget: an email problem never breaks a payment."""

import asyncio
import logging
from datetime import datetime

from models.database import db

logger = logging.getLogger(__name__)


def _money(v) -> str:
    try:
        return f"${float(v or 0):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _date(v) -> str:
    if not v:
        return "—"
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).strftime("%B %d, %Y")
    except ValueError:
        return str(v)[:10]


async def _settings() -> dict:
    return await db.settings.find_one({}, {"_id": 0}) or {}


async def _send(key: str, email: str, variables: dict) -> None:
    from utils.email_render import render_and_send
    s = await _settings()
    m = await db.members.find_one({"email": email}, {"_id": 0, "first_name": 1, "last_name": 1}) or {}
    name = m.get("first_name") or email.split("@")[0]
    await render_and_send(key, s, email, name, {"name": name, **variables})


def _fire(coro) -> None:
    try:
        asyncio.get_running_loop().create_task(coro)
    except RuntimeError:
        pass


def kms_purchase(email: str, *, plan: str, list_price, paid, coupon: str, expires, reference: str) -> None:
    async def run():
        try:
            s = await _settings()
            kms_url = (s.get("kms_native_base") or "").rstrip("/") or (s.get("site_url") or "")
            disc = float(list_price or 0) - float(paid or 0)
            await _send("kms_subscription_purchase", email, {
                "plan": (plan or "").title(), "list_price": _money(list_price),
                "coupon": coupon or "—", "discount": f"−{_money(disc)}" if disc > 0 else "—",
                "amount_paid": _money(paid), "date": _date(datetime.utcnow().isoformat()),
                "expires": _date(expires), "reference": reference, "kms_url": kms_url})
        except Exception:
            logger.warning("KMS purchase email failed for %s", email, exc_info=True)
    _fire(run())


def membership_purchase(email: str, row: dict, *, membership_name: str, membership_id: str,
                        send_access: bool, access_token: str) -> None:
    async def run():
        try:
            credit = float(row.get("kms_credit") or 0)
            await _send("membership_purchase", email, {
                "membership_name": membership_name, "plan": (row.get("plan") or "").title(),
                "list_price": _money(row.get("list_amount")),
                "kms_credit": f"−{_money(credit)}" if credit > 0 else "—",
                "coupon": row.get("coupon_code") or "—",
                "amount_paid": _money(row.get("paid_amount") if row.get("paid_amount") is not None
                                      else row.get("final_amount")),
                "date": _date(row.get("paid_at")), "expires": _date(row.get("expires_at")),
                "membership_id": membership_id or "—", "reference": row.get("session_id") or ""})
            if send_access and access_token:
                s = await _settings()
                link = (s.get("site_url") or "").rstrip("/") + f"/membership/welcome?t={access_token}"
                await _send("membership_access", email, {"membership_name": membership_name,
                                                         "access_link": link})
        except Exception:
            logger.warning("Membership emails failed for %s", email, exc_info=True)
    _fire(run())
