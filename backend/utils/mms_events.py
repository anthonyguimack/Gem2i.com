"""Neutralized shim (gem2i fork). No MMS bus in the isolated product; the
membership funnel's referral-emit calls become no-ops."""


async def emit_mms_event(*args, **kwargs):
    return None


async def emit_soon(*args, **kwargs):
    return None


async def product_points(db, product: str, mid: str | None = None) -> dict:
    """No MMS in gem2i yet (D-GEM-2026-06): the KMS points panel shows
    'unavailable', exactly like an A Capital brand without an MMS."""
    return {"product": product, "actions": [], "unavailable": True}
