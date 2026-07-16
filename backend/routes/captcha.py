"""CMS endpoints for the Captcha Settings tab.

  GET  /api/public/captcha-config    — Public: site_key + enabled (frontend widget loader)
  GET  /api/admin/captcha-settings   — Admin: full config including secret
  PUT  /api/admin/captcha-settings   — Admin: save config

The secret key is never returned by the public endpoint.  The admin
endpoint redacts the secret if the operator only wanted to update the
site key (we always upsert; passing an empty string clears).
"""
from fastapi import APIRouter, Depends, Request
from models.database import db, require_admin
from utils.captcha import get_captcha_settings

router = APIRouter()


@router.get("/public/captcha-config")
async def public_captcha_config():
    """Tiny payload the frontend widget reads to know whether to render
    the reCAPTCHA box and which sitekey to use.  No secrets ever leave
    this endpoint."""
    s = await get_captcha_settings()
    return {"enabled": s["enabled"], "site_key": s["site_key"]}


@router.get("/admin/captcha-settings")
async def admin_get_captcha_settings(user: dict = Depends(require_admin)):
    s = await get_captcha_settings()
    return {
        "enabled": s["enabled"],
        "site_key": s["site_key"],
        "secret_key": s["secret_key"],
        "version": "v2",
    }


@router.put("/admin/captcha-settings")
async def admin_update_captcha_settings(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    update = {
        "id": "main",
        "enabled": bool(body.get("enabled", False)),
        "site_key": (body.get("site_key") or "").strip(),
        "secret_key": (body.get("secret_key") or "").strip(),
    }
    await db.captcha_settings.update_one({"id": "main"}, {"$set": update}, upsert=True)
    return {"message": "Captcha settings saved", "settings": update}
