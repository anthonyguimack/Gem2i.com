"""Google reCAPTCHA v2 verification + CMS-managed config.

The site key + secret key are stored as a single document in the
`captcha_settings` collection (id: `"main"`).  Public endpoints call
`require_captcha(request, body)` which:
  • Reads the saved config.  If captcha is disabled (or no secret key has
    been set yet), returns immediately so existing flows keep working.
  • Otherwise pulls `captcha_token` from the request body and POSTs it to
    Google's siteverify endpoint along with the client IP.
  • Raises 400 with a clear, user-facing error if the token is missing,
    expired, or rejected.

The public config endpoint exposes ONLY the site key + enabled flag (never
the secret) so the frontend widget knows which sitekey to render.
"""
import logging
import httpx
from fastapi import HTTPException, Request
from models.database import db

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def get_captcha_settings() -> dict:
    """Return the saved captcha settings, with defaults filled in."""
    doc = await db.captcha_settings.find_one({"id": "main"}, {"_id": 0}) or {}
    return {
        "enabled": bool(doc.get("enabled", False)),
        "site_key": (doc.get("site_key") or "").strip(),
        "secret_key": (doc.get("secret_key") or "").strip(),
    }


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else ""


async def verify_captcha_token(token: str, request: Request) -> bool:
    """Hit Google's siteverify and return True/False.  Raises only on
    config issues (missing secret); transport problems are logged and
    treated as failure."""
    settings = await get_captcha_settings()
    if not settings["enabled"]:
        return True
    if not settings["secret_key"]:
        logger.warning("Captcha is enabled but no secret_key is configured — failing closed.")
        return False
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(VERIFY_URL, data={
                "secret": settings["secret_key"],
                "response": token,
                "remoteip": _client_ip(request),
            })
            data = resp.json()
            if not data.get("success"):
                logger.info(f"Captcha verification failed: {data.get('error-codes')}")
                return False
            return True
    except Exception as e:
        logger.warning(f"Captcha verification error: {e}")
        return False


async def require_captcha(request: Request, body: dict):
    """Raise HTTP 400 if captcha is enabled and the token is missing/invalid.

    Public endpoints call this before doing any expensive work or sending
    any email.  When captcha is disabled (default) this is a no-op."""
    settings = await get_captcha_settings()
    if not settings["enabled"]:
        return
    token = (body or {}).get("captcha_token", "")
    ok = await verify_captcha_token(token, request)
    if not ok:
        raise HTTPException(
            status_code=400,
            detail="CAPTCHA verification failed. Please tick the 'I'm not a robot' box and try again.",
        )
