"""CMS endpoints for the Email Management section.

Exposes:
  GET    /admin/email-templates                  — list all templates (definitions + saved overrides)
  GET    /admin/email-templates/{key}            — fetch one template
  PUT    /admin/email-templates/{key}            — save subject/body/enabled
  POST   /admin/email-templates/{key}/reset      — reset to default
  POST   /admin/email-templates/{key}/preview    — render against sample (or custom) values
  POST   /admin/email-templates/{key}/test-send  — send the template to a real address
  GET    /admin/email-branding                   — fetch general branding
  PUT    /admin/email-branding                   — save general branding
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from models.database import db, require_admin, send_email_smtp, logger
from models.email_templates import (
    EMAIL_TEMPLATES,
    DEFAULT_EMAIL_BRANDING,
    EMAIL_FONT_OPTIONS,
    get_template_definition,
)
from utils.email_render import (
    get_template,
    get_branding,
    render_email,
    ensure_templates_seeded,
)

router = APIRouter()


@router.get("/admin/email-templates")
async def list_email_templates(user: dict = Depends(require_admin)):
    await ensure_templates_seeded()
    saved_rows = await db.email_templates.find({}, {"_id": 0}).to_list(200)
    saved_by_key = {r["key"]: r for r in saved_rows}
    out = []
    for t in EMAIL_TEMPLATES:
        saved = saved_by_key.get(t["key"], {})
        subject = saved.get("subject", t["default_subject"])
        body = saved.get("body", t["default_body"])
        # "Customised" means the operator deviated from the default subject
        # OR body — the seed-default rows still count as default.
        is_default = (subject == t["default_subject"]) and (body == t["default_body"])
        out.append({
            "key": t["key"],
            "name": t["name"],
            "description": t["description"],
            "variables": t["variables"],
            "subject": subject,
            "body": body,
            "enabled": saved.get("enabled", True),
            "is_default": is_default,
            "updated_at": saved.get("updated_at", ""),
        })
    return out


@router.get("/admin/email-templates/{key}")
async def get_email_template(key: str, user: dict = Depends(require_admin)):
    definition = get_template_definition(key)
    if not definition:
        raise HTTPException(status_code=404, detail="Template not found")
    saved = await db.email_templates.find_one({"key": key}, {"_id": 0}) or {}
    return {
        "key": key,
        "name": definition["name"],
        "description": definition["description"],
        "variables": definition["variables"],
        "default_subject": definition["default_subject"],
        "default_body": definition["default_body"],
        "sample_values": definition["sample_values"],
        "subject": saved.get("subject", definition["default_subject"]),
        "body":    saved.get("body", definition["default_body"]),
        "enabled": saved.get("enabled", True),
    }


@router.put("/admin/email-templates/{key}")
async def update_email_template(key: str, request: Request, user: dict = Depends(require_admin)):
    if not get_template_definition(key):
        raise HTTPException(status_code=404, detail="Template not found")
    body = await request.json()
    from datetime import datetime, timezone
    update = {
        "key": key,
        "subject": (body.get("subject") or "").strip(),
        "body": body.get("body") or "",
        "enabled": bool(body.get("enabled", True)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("email", ""),
    }
    if not update["subject"]:
        raise HTTPException(status_code=400, detail="Subject is required")
    if not update["body"].strip():
        raise HTTPException(status_code=400, detail="Body is required")
    await db.email_templates.update_one({"key": key}, {"$set": update}, upsert=True)
    return {"message": "Template saved", "template": update}


@router.post("/admin/email-templates/{key}/reset")
async def reset_email_template(key: str, user: dict = Depends(require_admin)):
    definition = get_template_definition(key)
    if not definition:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.email_templates.delete_one({"key": key})
    return {
        "message": "Template reset to default",
        "subject": definition["default_subject"],
        "body": definition["default_body"],
    }


@router.post("/admin/email-templates/{key}/preview")
async def preview_email_template(key: str, request: Request, user: dict = Depends(require_admin)):
    """Render the saved template (or the in-flight draft passed in the body)
    using sample variables so the operator can see exactly what the email
    will look like before saving."""
    definition = get_template_definition(key)
    if not definition:
        raise HTTPException(status_code=404, detail="Template not found")
    body = await request.json() if (await request.body()) else {}
    draft_subject = body.get("subject")
    draft_body = body.get("body")
    variables = {**definition["sample_values"], **(body.get("variables") or {})}

    # If the operator passed an in-flight draft we render *that*, otherwise
    # render whatever's stored in the DB (or the in-code default).
    if draft_subject is not None or draft_body is not None:
        # Temporarily stash the saved row, render against the draft, restore.
        saved = await db.email_templates.find_one({"key": key}, {"_id": 0})
        await db.email_templates.update_one(
            {"key": key},
            {"$set": {
                "key": key,
                "subject": draft_subject if draft_subject is not None else (saved or {}).get("subject", definition["default_subject"]),
                "body":    draft_body    if draft_body    is not None else (saved or {}).get("body", definition["default_body"]),
                "enabled": True,
            }},
            upsert=True,
        )
        try:
            rendered = await render_email(key, variables)
        finally:
            if saved is None:
                await db.email_templates.delete_one({"key": key})
            else:
                await db.email_templates.update_one({"key": key}, {"$set": {k: v for k, v in saved.items() if k != "_id"}}, upsert=True)
    else:
        rendered = await render_email(key, variables)

    return rendered


@router.post("/admin/email-templates/{key}/test-send")
async def test_send_email_template(key: str, request: Request, user: dict = Depends(require_admin)):
    definition = get_template_definition(key)
    if not definition:
        raise HTTPException(status_code=404, detail="Template not found")
    body = await request.json()
    to_email = (body.get("to_email") or "").strip()
    if not to_email:
        raise HTTPException(status_code=400, detail="to_email required")
    variables = {**definition["sample_values"], **(body.get("variables") or {})}
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("smtp_host"):
        raise HTTPException(status_code=400, detail="SMTP is not configured. Configure it in Settings → SMTP first.")
    try:
        rendered = await render_email(key, variables, platform_name=settings.get("brand_name", "Legacy"))
        await send_email_smtp(settings, to_email, "Test Recipient", rendered["subject"], rendered["html"])
        return {"success": True, "message": f"Test email sent to {to_email}"}
    except Exception as e:
        logger.warning(f"test-send failed for {key}: {e}")
        return {"success": False, "message": str(e)}


# ───── Branding (general design) ─────

@router.get("/admin/email-branding")
async def get_email_branding(user: dict = Depends(require_admin)):
    branding = await get_branding()
    return {**branding, "available_fonts": EMAIL_FONT_OPTIONS}


@router.put("/admin/email-branding")
async def update_email_branding(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    update = {
        "id": "main",
        "logo_url": (body.get("logo_url") or "").strip(),
        "primary_color": body.get("primary_color") or DEFAULT_EMAIL_BRANDING["primary_color"],
        "button_color": body.get("button_color") or DEFAULT_EMAIL_BRANDING["button_color"],
        "button_text_color": body.get("button_text_color") or DEFAULT_EMAIL_BRANDING["button_text_color"],
        "font_family": body.get("font_family") or DEFAULT_EMAIL_BRANDING["font_family"],
        "footer_text": body.get("footer_text") or "",
        "social_links": body.get("social_links") or [],
    }
    await db.email_branding.update_one({"id": "main"}, {"$set": update}, upsert=True)
    return {"message": "Branding saved", "branding": update}
