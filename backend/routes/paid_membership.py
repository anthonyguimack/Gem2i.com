"""KMS compatibility shim (gem2i). A Capital's KMS asks
`routes.paid_membership.membership_lapsed(member)` for members whose
membership_source == "paid". gem2i's paid membership lives in
routes/gem_membership.py (member.paid_membership sub-doc), so answer from it."""
from datetime import datetime, timezone


async def membership_lapsed(member: dict) -> bool:
    pm = (member or {}).get("paid_membership") or {}
    if not pm:
        return False
    if pm.get("active") is False:
        return True
    exp = pm.get("expires_at")
    return bool(exp and str(exp) < datetime.now(timezone.utc).isoformat())
