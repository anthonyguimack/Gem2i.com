from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from models.database import db, require_admin, require_any_cms_access, send_email_smtp, UPLOAD_DIR, logger
from datetime import datetime, timezone, timedelta
import uuid
import io
import csv
import aiosmtplib
import aiofiles
import os

router = APIRouter()

# Image Upload — shared across every CMS section, so gated by "any CMS
# permission" instead of the URL-based section check (uploads don't belong
# to one specific section).
@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_any_cms_access)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, GIF, WebP, SVG) allowed")
    max_size = 10 * 1024 * 1024
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    total = 0
    async with aiofiles.open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 64):
            total += len(chunk)
            if total > max_size:
                await f.close()
                filepath.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large (max 10MB)")
            await f.write(chunk)
    return {"url": f"/api/uploads/{filename}", "filename": filename}


@router.post("/upload-file")
async def upload_document_file(file: UploadFile = File(...), user: dict = Depends(require_any_cms_access)):
    allowed = {
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/zip", "application/x-zip-compressed",
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")
    max_size = 25 * 1024 * 1024
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    total = 0
    async with aiofiles.open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 64):
            total += len(chunk)
            if total > max_size:
                await f.close()
                filepath.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large (max 25MB)")
            await f.write(chunk)
    return {"url": f"/api/uploads/{filename}", "filename": filename, "original_name": file.filename, "size": total, "content_type": file.content_type}


# CSV Export
@router.get("/admin/contacts/export")
async def export_contacts_csv(user: dict = Depends(require_admin)):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Subject", "Message", "Read", "Date"])
    for c in contacts:
        writer.writerow([c.get("name",""), c.get("email",""), c.get("phone",""), c.get("subject",""), c.get("message",""), "Yes" if c.get("read") else "No", c.get("created_at","")])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=contacts.csv"})

# Bulk Operations
@router.post("/admin/bulk-delete")
async def bulk_delete(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    collection = body.get("collection", "")
    ids = body.get("ids", [])
    allowed = {"blog_posts", "gallery", "portfolio", "testimonials", "contacts", "books", "nav_pages", "map_locations"}
    if collection not in allowed:
        raise HTTPException(status_code=400, detail="Invalid collection")
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    result = await db[collection].delete_many({"id": {"$in": ids}})
    return {"deleted": result.deleted_count}

@router.post("/admin/bulk-update")
async def bulk_update(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    collection = body.get("collection", "")
    ids = body.get("ids", [])
    update = body.get("update", {})
    allowed = {"blog_posts", "contacts", "gallery"}
    if collection not in allowed:
        raise HTTPException(status_code=400, detail="Invalid collection")
    if not ids or not update:
        raise HTTPException(status_code=400, detail="IDs and update data required")
    update.pop("_id", None)
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db[collection].update_many({"id": {"$in": ids}}, {"$set": update})
    return {"modified": result.modified_count}

# Section Ordering (per-theme)
DEFAULT_SECTION_ORDER = ["hero", "about", "services", "news", "blog", "reading_list", "map", "portfolio", "gallery", "testimonials", "contact"]
# Aurex theme includes 7 additional sections
AUREX_DEFAULT_ORDER = [
    "hero", "about", "aurex_audience", "services", "aurex_process", "aurex_video", "aurex_pricing",
    "aurex_team", "testimonials", "aurex_events", "news", "blog", "aurex_partners", "aurex_clients",
    "map", "contact",
]

def _default_order_for(theme: str) -> list[str]:
    return AUREX_DEFAULT_ORDER if theme == "aurex" else DEFAULT_SECTION_ORDER


@router.get("/admin/section-order")
async def get_section_order(user: dict = Depends(require_admin), theme: str | None = None):
    """Return the section order. If `theme` query param provided, return that
    theme's order; else return the legacy global order (default theme)."""
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    if theme:
        orders = settings.get("section_orders", {}) or {}
        return orders.get(theme, _default_order_for(theme))
    return settings.get("section_order", DEFAULT_SECTION_ORDER)


@router.put("/admin/section-order")
async def update_section_order(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    order = body.get("order", [])
    theme = body.get("theme")
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if theme:
        update_doc[f"section_orders.{theme}"] = order
    else:
        update_doc["section_order"] = order
    await db.settings.update_one({}, {"$set": update_doc}, upsert=True)
    return {"order": order, "theme": theme}


@router.get("/admin/section-config")
async def get_section_config(user: dict = Depends(require_admin), theme: str = "aurex"):
    """Per-section config { bg_color, font_family, enabled } for a theme."""
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    configs = (settings.get("section_configs") or {}).get(theme, {})
    return configs


@router.put("/admin/section-config")
async def update_section_config(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    theme = body.get("theme") or "aurex"
    configs = body.get("configs") or {}
    await db.settings.update_one({}, {"$set": {
        f"section_configs.{theme}": configs,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }}, upsert=True)
    return {"theme": theme, "configs": configs}

# SEO Meta
@router.get("/admin/seo")
async def admin_get_seo(user: dict = Depends(require_admin)):
    return await db.seo_meta.find({}, {"_id": 0}).to_list(100)

@router.put("/admin/seo/{page_path}")
async def admin_update_seo(page_path: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["page_path"] = page_path
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.seo_meta.update_one({"page_path": page_path}, {"$set": body}, upsert=True)
    return await db.seo_meta.find_one({"page_path": page_path}, {"_id": 0})

# Analytics
@router.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)

    # Helper: get proper month boundaries for last 6 months
    def get_month_ranges(n=6):
        ranges = []
        for i in range(n - 1, -1, -1):
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1
            m_start = datetime(year, month, 1, tzinfo=timezone.utc)
            ny, nm = (year, month + 1) if month < 12 else (year + 1, 1)
            m_end = datetime(ny, nm, 1, tzinfo=timezone.utc)
            ranges.append((m_start, m_end, m_start.strftime("%b %y")))
        return ranges

    month_ranges = get_month_ranges()

    monthly_contacts = []
    for m_start, m_end, label in month_ranges:
        count = await db.contacts.count_documents({"created_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}})
        monthly_contacts.append({"month": label, "contacts": count})
    monthly_revenue = []
    for m_start, m_end, label in month_ranges:
        pipeline = [{"$match": {"payment_status": "paid", "created_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
        result = await db.payment_transactions.aggregate(pipeline).to_list(1)
        monthly_revenue.append({"month": label, "revenue": result[0]["total"] if result else 0})
    top_services = await db.payment_transactions.aggregate([
        {"$match": {"payment_status": "paid"}}, {"$group": {"_id": "$service_name", "count": {"$sum": 1}, "revenue": {"$sum": "$amount"}}},
        {"$sort": {"count": -1}}, {"$limit": 5}
    ]).to_list(5)
    content_stats = {
        "blog_posts": await db.blog_posts.count_documents({}),
        "published_posts": await db.blog_posts.count_documents({"published": True}),
        "gallery_items": await db.gallery.count_documents({}),
        "portfolio_items": await db.portfolio.count_documents({}),
        "books": await db.books.count_documents({}),
        "map_locations": await db.map_locations.count_documents({}),
        "testimonials": await db.testimonials.count_documents({}),
        "total_contacts": await db.contacts.count_documents({}),
        "unread_contacts": await db.contacts.count_documents({"read": False}),
        "total_users": await db.members.count_documents({}),
        "total_pages": await db.nav_pages.count_documents({}),
    }
    monthly_registrations = []
    for m_start, m_end, label in month_ranges:
        count = await db.members.count_documents({"created_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}})
        monthly_registrations.append({"month": label, "members": count})
    monthly_logins = []
    for m_start, m_end, label in month_ranges:
        pipeline = [
            {"$match": {"logged_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}}},
            {"$group": {"_id": "$member_id"}},
            {"$count": "total"}
        ]
        result = await db.member_logins.aggregate(pipeline).to_list(1)
        monthly_logins.append({"month": label, "logins": result[0]["total"] if result else 0})
    return {
        "monthly_contacts": monthly_contacts, "monthly_revenue": monthly_revenue,
        "monthly_registrations": monthly_registrations, "monthly_logins": monthly_logins,
        "top_services": [{"name": s["_id"] or "Unknown", "count": s["count"], "revenue": s["revenue"]} for s in top_services],
        "content_stats": content_stats,
    }

# SMTP Test
@router.post("/admin/smtp/test-connection")
async def test_smtp_connection(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    host = body.get("smtp_host", "")
    port = body.get("smtp_port", 587)
    username = body.get("smtp_user", "")
    password = body.get("smtp_password", "")
    if not host or not username:
        raise HTTPException(status_code=400, detail="SMTP host and username required")
    try:
        smtp = aiosmtplib.SMTP(hostname=host, port=port, start_tls=True)
        await smtp.connect()
        await smtp.login(username, password)
        await smtp.quit()
        return {"success": True, "message": "SMTP connection successful!"}
    except Exception as e:
        return {"success": False, "message": f"Connection failed: {str(e)}"}

@router.post("/admin/smtp/test-email")
async def test_smtp_email(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    to_email = body.get("test_email", body.get("email_to", ""))
    if not to_email:
        raise HTTPException(status_code=400, detail="Test email address required")
    # Use the same template + branding pipeline as every other transactional
    # email so the operator can verify exactly how customer-facing messages
    # will look.  The body dict carries the *draft* SMTP settings the operator
    # is currently editing (host/user/pass/etc.) — pass it straight through.
    try:
        from utils.email_render import render_email, resolve_i18n
        from datetime import datetime, timezone
        # Branding pulls platform_name from the saved settings; merge what we got.
        saved = await db.settings.find_one({}, {"_id": 0}) or {}
        platform_name = resolve_i18n(body.get("brand_name") or saved.get("brand_name")) or "Legacy"
        rendered = await render_email("smtp_test", {
            "recipient_email": to_email,
            "platform_name": platform_name,
            "sent_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        }, platform_name=platform_name)
        await send_email_smtp(
            body, to_email, "Test Recipient", rendered["subject"], rendered["html"],
            body.get("email_from", body.get("smtp_user", "")),
            body.get("name_from", f"{platform_name} CMS"),
        )
        return {"success": True, "message": f"Test email sent to {to_email}!"}
    except Exception as e:
        return {"success": False, "message": f"Failed to send: {str(e)}"}


# ──────────── Backup & Restore ────────────

EXPORTABLE_COLLECTIONS = {
    "hero_slides": "Hero Slides",
    "about": "About",
    "services": "Services",
    "blog_posts": "Blog Posts",
    "books": "Reading List",
    "maps": "Maps",
    "map_locations": "Map Locations",
    "gallery": "Gallery",
    "gallery_albums": "Gallery Albums",
    "album_photos": "Album Photos",
    "portfolio": "Portfolio",
    "testimonials": "Testimonials",
    "nav_pages": "Pages",
    "pages": "System Pages",
    "settings": "Settings",
    "member_types": "Member Types",
}

@router.get("/admin/export-content")
async def export_content(request: Request, user: dict = Depends(require_admin)):
    collections = request.query_params.get("collections", "")
    selected = [c.strip() for c in collections.split(",") if c.strip()] if collections else list(EXPORTABLE_COLLECTIONS.keys())
    export_data = {"_meta": {"exported_at": datetime.now(timezone.utc).isoformat(), "version": "1.0", "collections": selected}}
    for col in selected:
        if col not in EXPORTABLE_COLLECTIONS:
            continue
        if col in ("about", "settings"):
            doc = await db[col].find_one({}, {"_id": 0})
            export_data[col] = doc
        else:
            docs = await db[col].find({}, {"_id": 0}).to_list(10000)
            export_data[col] = docs
    return export_data

@router.post("/admin/import-content")
async def import_content(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    mode = body.pop("_mode", "merge")
    imported = body.pop("_meta", None)
    results = {}
    for col, data in body.items():
        if col not in EXPORTABLE_COLLECTIONS or data is None:
            continue
        try:
            if col in ("about", "settings"):
                if isinstance(data, dict):
                    data.pop("_id", None)
                    data["updated_at"] = datetime.now(timezone.utc).isoformat()
                    if mode == "replace":
                        await db[col].delete_many({})
                        await db[col].insert_one(data)
                    else:
                        await db[col].update_one({}, {"$set": data}, upsert=True)
                    results[col] = {"status": "ok", "count": 1}
            elif isinstance(data, list):
                if mode == "replace":
                    await db[col].delete_many({})
                    if data:
                        clean = [{k: v for k, v in doc.items() if k != "_id"} for doc in data]
                        await db[col].insert_many(clean)
                    results[col] = {"status": "ok", "count": len(data)}
                else:
                    upserted = 0
                    for doc in data:
                        doc.pop("_id", None)
                        doc_id = doc.get("id")
                        if doc_id:
                            await db[col].update_one({"id": doc_id}, {"$set": doc}, upsert=True)
                        else:
                            doc["id"] = str(uuid.uuid4())
                            await db[col].insert_one(doc)
                        upserted += 1
                    results[col] = {"status": "ok", "count": upserted}
        except Exception as e:
            results[col] = {"status": "error", "message": str(e)}
    return {"success": True, "results": results}


# ──────────── Backup Snapshots ────────────

@router.get("/admin/backup-settings")
async def get_backup_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({}, {"_id": 0})
    return (settings or {}).get("backup_settings", {"enabled": False, "frequency": "daily", "max_snapshots": 5})

@router.get("/admin/contact-settings")
async def get_contact_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({}, {"_id": 0})
    return (settings or {}).get("contact_settings", {"title": "Contact", "subtitle": "Let's Work Together", "description": "Have a project in mind? Let's discuss how we can help"})

@router.put("/admin/contact-settings")
async def update_contact_settings(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    cs = {
        "title": body.get("title", "Contact"),
        "subtitle": body.get("subtitle", ""),
        "description": body.get("description", ""),
        "name_placeholder": body.get("name_placeholder", ""),
        "email_placeholder": body.get("email_placeholder", ""),
        "message_placeholder": body.get("message_placeholder", ""),
        "submit_text": body.get("submit_text", ""),
    }
    await db.settings.update_one({}, {"$set": {"contact_settings": cs, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return cs

@router.put("/admin/backup-settings")
async def update_backup_settings(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    bs = {"enabled": body.get("enabled", False), "frequency": body.get("frequency", "daily"), "max_snapshots": body.get("max_snapshots", 5)}
    await db.settings.update_one({}, {"$set": {"backup_settings": bs, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return bs

@router.get("/admin/backups")
async def list_backups(user: dict = Depends(require_admin)):
    backups = await db.backups.find({}, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(100)
    return backups

@router.get("/admin/backups/{backup_id}")
async def get_backup(backup_id: str, user: dict = Depends(require_admin)):
    backup = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    return backup.get("data", {})

@router.post("/admin/backups/create-now")
async def create_backup_now(request: Request, user: dict = Depends(require_admin)):
    body = await request.json() if (await request.body()) else {}
    label = body.get("label", "manual")
    from scheduler import create_backup_snapshot, cleanup_old_backups
    backup_id = await create_backup_snapshot(label=label)
    settings = await db.settings.find_one({}, {"_id": 0})
    max_s = (settings or {}).get("backup_settings", {}).get("max_snapshots", 5)
    await cleanup_old_backups(max_s)
    return {"success": True, "backup_id": backup_id}

@router.delete("/admin/backups/{backup_id}")
async def delete_backup(backup_id: str, user: dict = Depends(require_admin)):
    result = await db.backups.delete_one({"id": backup_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Backup not found")
    return {"message": "Backup deleted"}


# ── KMS sync ──────────────────────────────────────────────────────────────────

@router.get("/admin/kms-sync/failures")
async def kms_sync_failures(user: dict = Depends(require_admin)):
    """List pending failed KMS sync records."""
    docs = await db.kms_sync_failures.find(
        {"retried": False}, {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    return docs


@router.post("/admin/kms-sync/retry")
async def kms_sync_retry(user: dict = Depends(require_admin)):
    """Re-attempt KMS sync for every unretried failure.
    Marks each record retried=True whether it succeeds or not, so the list
    stays clean.  Fresh failures (if KMS is still down) are re-inserted as
    new records by sync_member_to_kms itself."""
    from utils.kms_sync import sync_member_to_kms

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    failures = await db.kms_sync_failures.find(
        {"retried": False}, {"_id": 0}
    ).to_list(200)

    if not failures:
        return {"retried": 0, "message": "No pending failures"}

    results = []
    for rec in failures:
        email = rec.get("email", "")
        member_id = rec.get("member_id", "")
        # Re-fetch the member so we have the full document including membership_number
        member = await db.members.find_one({"member_id": member_id}, {"_id": 0}) if member_id else None
        if not member:
            await db.kms_sync_failures.update_many(
                {"member_id": member_id, "retried": False},
                {"$set": {"retried": True, "retry_note": "member not found in DB"}}
            )
            results.append({"email": email, "status": "skipped — member not found"})
            continue

        # Mark retried before attempting so duplicates don't pile up
        await db.kms_sync_failures.update_many(
            {"member_id": member_id, "retried": False},
            {"$set": {"retried": True, "retried_at": datetime.now(timezone.utc).isoformat()}}
        )
        # sync_member_to_kms will insert a new failure record if this still fails
        await sync_member_to_kms(settings, member)
        results.append({"email": email, "status": "retried"})

    return {"retried": len(results), "results": results}
