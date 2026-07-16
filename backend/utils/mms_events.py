"""Neutralized shim (gem2i fork). No MMS bus in the isolated product; the
membership funnel's referral-emit calls become no-ops."""


async def emit_mms_event(*args, **kwargs):
    return None


async def emit_soon(*args, **kwargs):
    return None
