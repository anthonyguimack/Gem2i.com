"""
Resolves runtime configuration values that admins can edit from the CMS
without restarting the server.

Lookup priority (first non-empty wins):
  1. settings.<key> in the `settings` Mongo collection (CMS-editable).
  2. os.environ[<env_key>]                            (deploy fallback).

This lets a fresh deploy use env vars (so the site can boot before any
admin logs in) and lets operators take over from the CMS afterwards
without touching server files.
"""
import os
from urllib.parse import urlparse

from models.database import db


def normalize_site_url(raw: str) -> str:
    """Coerce any input into a canonical "https://host[:port][/path]" string.

    Accepts examples like:
        "mydomain.com"           -> "https://mydomain.com"
        " https://mydomain.com/" -> "https://mydomain.com"
        "http://1.2.3.4:8000/x/" -> "http://1.2.3.4:8000/x"
        "https://a.com//"        -> "https://a.com"
    Returns "" for empty / blank input.
    """
    if not raw:
        return ""
    val = raw.strip()
    if not val:
        return ""
    # Add scheme if missing — default to https for production safety.
    if "://" not in val:
        val = "https://" + val
    parsed = urlparse(val)
    scheme = parsed.scheme.lower() if parsed.scheme in ("http", "https") else "https"
    netloc = parsed.netloc or parsed.path  # urlparse puts bare hosts in path
    path = parsed.path if parsed.netloc else ""
    out = f"{scheme}://{netloc}{path}".rstrip("/")
    return out


async def get_stripe_api_key() -> str:
    """CMS settings.stripe_api_key  -> os.environ['STRIPE_API_KEY'] -> ''."""
    settings = await db.settings.find_one(
        {}, {"_id": 0, "stripe_api_key": 1}
    ) or {}
    return (settings.get("stripe_api_key") or os.environ.get("STRIPE_API_KEY") or "").strip()


async def get_site_url(fallback_request_base: str = "") -> str:
    """CMS settings.site_url  -> os.environ['SITE_URL']  -> request.base_url.

    Always returned without a trailing slash so callers can safely append
    "/api/...". Empty string only if every source is empty.
    """
    settings = await db.settings.find_one(
        {}, {"_id": 0, "site_url": 1}
    ) or {}
    cms = normalize_site_url(settings.get("site_url"))
    if cms:
        return cms
    env = normalize_site_url(os.environ.get("SITE_URL"))
    if env:
        return env
    return (fallback_request_base or "").rstrip("/")


async def get_webhook_url(fallback_request_base: str = "") -> str:
    """The exact URL operators must register in their Stripe dashboard."""
    base = await get_site_url(fallback_request_base)
    return f"{base}/api/webhook/stripe" if base else ""
