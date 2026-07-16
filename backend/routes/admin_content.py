from fastapi import APIRouter, HTTPException, Request, Depends
from models.database import db, require_admin, hash_password
from utils.personality import pb_validate, scope_query, stamp
from datetime import datetime, timezone
from slugify import slugify
import uuid

router = APIRouter()

# Helper to extract a string from a localized value (dict or string)
def get_slug_text(value):
    """Extract a string suitable for slugification from a localized value.
    If value is a dict (localized), returns the first non-empty locale value.
    If value is a string, returns it as-is.
    """
    if value is None:
        return str(uuid.uuid4())
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        # Try common locales first
        for lang in ['en', 'es', 'fr', 'de', 'it', 'pt']:
            if value.get(lang):
                return str(value[lang])
        # Fall back to any non-empty value
        for v in value.values():
            if v and isinstance(v, str):
                return v
    return str(uuid.uuid4())

# CRUD Helpers
async def crud_list(col: str):
    return await db[col].find({}, {"_id": 0}).to_list(1000)

async def crud_create(col: str, data: dict):
    if "id" not in data:
        data["id"] = str(uuid.uuid4())
    data.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[col].insert_one(data)
    return await db[col].find_one({"id": data["id"]}, {"_id": 0})

async def crud_update(col: str, item_id: str, data: dict):
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data.pop("_id", None)
    await db[col].update_one({"id": item_id}, {"$set": data})
    return await db[col].find_one({"id": item_id}, {"_id": 0})

async def crud_delete(col: str, item_id: str):
    await db[col].delete_one({"id": item_id})
    return {"message": "Deleted"}

# Personality-aware CRUD (PB mini-sites). Admin list = EXACT scope (no global
# fallback) so each CMS tab shows precisely what is tagged to it. Create stamps
# the active personality. Update/delete go by UUID and preserve the existing
# pb_personality, so they need no personality argument.
async def crud_list_scoped(col: str, personality, sort_field: str = None):
    cur = db[col].find(scope_query({}, personality), {"_id": 0})
    if sort_field:
        cur = cur.sort(sort_field, 1)
    return await cur.to_list(1000)

async def crud_create_scoped(col: str, data: dict, personality):
    return await crud_create(col, stamp(data, personality))

# Hero Slides (CRUD)
@router.get("/admin/hero-slides")
async def admin_list_hero_slides(user: dict = Depends(require_admin)):
    slides = await db.hero_slides.find({}, {"_id": 0}).sort("date_start", 1).to_list(100)
    return slides

@router.post("/admin/hero-slides")
async def admin_create_hero_slide(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["id"] = str(uuid.uuid4())
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hero_slides.insert_one(body)
    return await db.hero_slides.find_one({"id": body["id"]}, {"_id": 0})

@router.get("/admin/hero-slides/{slide_id}")
async def admin_get_hero_slide(slide_id: str, user: dict = Depends(require_admin)):
    slide = await db.hero_slides.find_one({"id": slide_id}, {"_id": 0})
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    return slide

@router.put("/admin/hero-slides/{slide_id}")
async def admin_update_hero_slide(slide_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hero_slides.update_one({"id": slide_id}, {"$set": body})
    updated = await db.hero_slides.find_one({"id": slide_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Slide not found")
    return updated

@router.delete("/admin/hero-slides/{slide_id}")
async def admin_delete_hero_slide(slide_id: str, user: dict = Depends(require_admin)):
    result = await db.hero_slides.delete_one({"id": slide_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Slide not found")
    return {"message": "Deleted"}

# Legacy single-doc hero (kept for backward compat)
@router.get("/admin/hero")
async def admin_get_hero(user: dict = Depends(require_admin)):
    return await db.hero.find_one({}, {"_id": 0}) or {}

@router.put("/admin/hero")
async def admin_update_hero(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hero.update_one({}, {"$set": body}, upsert=True)
    return await db.hero.find_one({}, {"_id": 0})

# About
@router.get("/admin/about")
async def admin_get_about(personality: str = None, user: dict = Depends(require_admin)):
    return await db.about.find_one({"personality": personality}, {"_id": 0}) or {}

@router.put("/admin/about")
async def admin_update_about(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    body = await request.json()
    body["personality"] = personality
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.about.update_one({"personality": personality}, {"$set": body}, upsert=True)
    return await db.about.find_one({"personality": personality}, {"_id": 0})

# Services
@router.get("/admin/services")
async def admin_list_services(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("services", personality, sort_field="order")

@router.post("/admin/services")
async def admin_create_service(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("services", await request.json(), personality)

@router.put("/admin/services/{item_id}")
async def admin_update_service(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("services", item_id, await request.json())

@router.delete("/admin/services/{item_id}")
async def admin_delete_service(item_id: str, user: dict = Depends(require_admin)):
    tx = await db.payment_transactions.find_one({"service_id": item_id, "payment_status": "paid"}, {"_id": 0})
    if tx:
        raise HTTPException(status_code=400, detail="Cannot delete service with completed purchases")
    return await crud_delete("services", item_id)

# Blog
@router.get("/admin/blog")
async def admin_list_blog(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("blog_posts", personality, sort_field="created_at")

@router.post("/admin/blog")
async def admin_create_blog(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    body = await request.json()
    body["slug"] = slugify(get_slug_text(body.get("title")))
    body.setdefault("published", True)
    return await crud_create_scoped("blog_posts", body, personality)

@router.put("/admin/blog/{item_id}")
async def admin_update_blog(item_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    if "title" in body:
        body["slug"] = slugify(get_slug_text(body["title"]))
    return await crud_update("blog_posts", item_id, body)

@router.delete("/admin/blog/{item_id}")
async def admin_delete_blog(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("blog_posts", item_id)

# Blog Categories
@router.get("/admin/blog-categories")
async def admin_list_blog_categories(user: dict = Depends(require_admin)):
    return await db.blog_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)

@router.post("/admin/blog-categories")
async def admin_create_blog_category(request: Request, user: dict = Depends(require_admin)):
    return await crud_create("blog_categories", await request.json())

@router.put("/admin/blog-categories/{item_id}")
async def admin_update_blog_category(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("blog_categories", item_id, await request.json())

@router.delete("/admin/blog-categories/{item_id}")
async def admin_delete_blog_category(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("blog_categories", item_id)

# Books
@router.get("/admin/books")
async def admin_list_books(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("books", personality)

@router.post("/admin/books")
async def admin_create_book(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("books", await request.json(), personality)

@router.put("/admin/books/{item_id}")
async def admin_update_book(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("books", item_id, await request.json())

@router.delete("/admin/books/{item_id}")
async def admin_delete_book(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("books", item_id)

# Maps
@router.get("/admin/maps")
async def admin_list_maps(user: dict = Depends(require_admin)):
    return await crud_list("maps")

@router.post("/admin/maps")
async def admin_create_map(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["slug"] = slugify(get_slug_text(body.get("title")))
    body.setdefault("published", True)
    return await crud_create("maps", body)

@router.put("/admin/maps/{item_id}")
async def admin_update_map(item_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    if "title" in body:
        body["slug"] = slugify(get_slug_text(body["title"]))
    return await crud_update("maps", item_id, body)

@router.delete("/admin/maps/{item_id}")
async def admin_delete_map(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("maps", item_id)

# Map Locations
@router.get("/admin/map-locations")
async def admin_list_map_locations(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("map_locations", personality)

@router.post("/admin/map-locations")
async def admin_create_map_location(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("map_locations", await request.json(), personality)

@router.put("/admin/map-locations/{item_id}")
async def admin_update_map_location(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("map_locations", item_id, await request.json())

@router.delete("/admin/map-locations/{item_id}")
async def admin_delete_map_location(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("map_locations", item_id)

# Gallery
@router.get("/admin/gallery")
async def admin_list_gallery(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("gallery", personality, sort_field="order")

@router.post("/admin/gallery")
async def admin_create_gallery(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("gallery", await request.json(), personality)

@router.put("/admin/gallery/{item_id}")
async def admin_update_gallery(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("gallery", item_id, await request.json())

@router.delete("/admin/gallery/{item_id}")
async def admin_delete_gallery(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("gallery", item_id)

@router.put("/admin/gallery/reorder/batch")
async def admin_reorder_gallery(request: Request, user: dict = Depends(require_admin)):
    data = await request.json()
    for item in data.get("items", []):
        await db.gallery.update_one({"id": item["id"]}, {"$set": {"order": item["order"]}})
    return {"message": "Reordered"}

# Gallery Categories
@router.get("/admin/gallery-categories")
async def admin_list_gallery_categories(user: dict = Depends(require_admin)):
    return await db.gallery_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)

@router.post("/admin/gallery-categories")
async def admin_create_gallery_category(request: Request, user: dict = Depends(require_admin)):
    return await crud_create("gallery_categories", await request.json())

@router.put("/admin/gallery-categories/{item_id}")
async def admin_update_gallery_category(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("gallery_categories", item_id, await request.json())

@router.delete("/admin/gallery-categories/{item_id}")
async def admin_delete_gallery_category(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("gallery_categories", item_id)

# Portfolio
@router.get("/admin/portfolio")
async def admin_list_portfolio(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("portfolio", personality)

@router.post("/admin/portfolio")
async def admin_create_portfolio(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("portfolio", await request.json(), personality)

@router.put("/admin/portfolio/{item_id}")
async def admin_update_portfolio(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("portfolio", item_id, await request.json())

@router.delete("/admin/portfolio/{item_id}")
async def admin_delete_portfolio(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("portfolio", item_id)

# Testimonials
@router.get("/admin/testimonials")
async def admin_list_testimonials(personality: str = None, user: dict = Depends(require_admin)):
    return await crud_list_scoped("testimonials", personality, sort_field="order")

@router.post("/admin/testimonials")
async def admin_create_testimonial(request: Request, personality: str = None, user: dict = Depends(require_admin)):
    return await crud_create_scoped("testimonials", await request.json(), personality)

@router.put("/admin/testimonials/{item_id}")
async def admin_update_testimonial(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("testimonials", item_id, await request.json())

@router.delete("/admin/testimonials/{item_id}")
async def admin_delete_testimonial(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("testimonials", item_id)

# Contacts
@router.get("/admin/contacts")
async def admin_list_contacts(user: dict = Depends(require_admin)):
    return await crud_list("contacts")

@router.put("/admin/contacts/{item_id}")
async def admin_update_contact(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("contacts", item_id, await request.json())

@router.delete("/admin/contacts/{item_id}")
async def admin_delete_contact(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("contacts", item_id)

# Purchases
@router.get("/admin/purchases")
async def admin_list_purchases(user: dict = Depends(require_admin)):
    return await crud_list("payment_transactions")

# Settings
@router.get("/admin/settings")
async def admin_get_settings(user: dict = Depends(require_admin)):
    s = await db.settings.find_one({}, {"_id": 0}) or {}
    # Return a masked preview of the Stripe key — never the full secret.
    raw_key = s.get("stripe_api_key") or ""
    if raw_key:
        s["stripe_api_key_preview"] = (raw_key[:7] + "•••" + raw_key[-4:]) if len(raw_key) > 12 else "•••"
        s["stripe_api_key_set"] = True
    else:
        s["stripe_api_key_preview"] = ""
        s["stripe_api_key_set"] = False
    s.pop("stripe_api_key", None)
    # kms_sync_key: never expose the raw value; only report whether it is set.
    s["kms_sync_key_set"] = bool(s.get("kms_sync_key"))
    s.pop("kms_sync_key", None)
    # Discord webhook URLs are secrets (anyone holding one can post to the channel):
    # report only whether each is set, never return the raw URL.
    for _k in ("morning_discord_webhook", "news_discord_webhook", "news_discord_webhook_news"):
        s[_k + "_set"] = bool(s.get(_k))
        s.pop(_k, None)
    # Claude API key (Pro Manager): same masked/write-only secret pattern.
    s["claude_api_key_set"] = bool(s.get("claude_api_key"))
    s.pop("claude_api_key", None)
    return s

@router.put("/admin/settings")
async def admin_update_settings(request: Request, user: dict = Depends(require_admin)):
    from utils.runtime_config import normalize_site_url

    body = await request.json()
    if "site_url" in body:
        body["site_url"] = normalize_site_url(body.get("site_url"))
    # Stripe API key handling:
    #   • non-empty string → save as-is
    #   • empty string     → clear the saved key
    #   • key not present  → leave existing value untouched
    if "stripe_api_key" in body:
        new_key = (body.get("stripe_api_key") or "").strip()
        if not new_key:
            await db.settings.update_one({}, {"$unset": {"stripe_api_key": ""}})
            body.pop("stripe_api_key", None)
        else:
            body["stripe_api_key"] = new_key
    # kms_sync_key: same write-only pattern as stripe_api_key
    if "kms_sync_key" in body:
        new_sync_key = (body.get("kms_sync_key") or "").strip()
        if not new_sync_key:
            await db.settings.update_one({}, {"$unset": {"kms_sync_key": ""}})
            body.pop("kms_sync_key", None)
        else:
            body["kms_sync_key"] = new_sync_key
    # Discord webhook URLs + Claude API key: same write-only pattern
    # (empty clears, absent leaves as-is).
    for _k in ("morning_discord_webhook", "news_discord_webhook", "news_discord_webhook_news",
               "claude_api_key"):
        if _k in body:
            _v = (body.get(_k) or "").strip()
            if not _v:
                await db.settings.update_one({}, {"$unset": {_k: ""}})
                body.pop(_k, None)
            else:
                body[_k] = _v
    # Social Links (SOCIAL_LINKS_KMS_SYNC_PLAN): normalize each row against the
    # shared catalog so the KMS + website can consume them uniformly.
    #   • derive `key` from key/icon/platform for legacy rows (free-form kept as-is)
    #   • default `active` True (backward-compatible: a legacy row = active)
    #   • snap `icon` to the catalog icon when the key is known
    if "social_links" in body and isinstance(body["social_links"], list):
        from utils.social_catalog import resolve_key, get as catalog_get
        norm_rows = []
        for row in body["social_links"]:
            if not isinstance(row, dict):
                continue
            r = dict(row)
            key = resolve_key(platform=r.get("platform", ""), icon=r.get("icon", ""),
                              key=r.get("key", ""))
            if key:
                r["key"] = key
                entry = catalog_get(key)
                if entry:
                    r["icon"] = entry["icon"]
                    if not (r.get("platform") or "").strip():
                        r["platform"] = entry["label"]
            r["active"] = bool(r.get("active", True))
            norm_rows.append(r)
        body["social_links"] = norm_rows
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    if body:
        await db.settings.update_one({}, {"$set": body}, upsert=True)
    return await admin_get_settings(user=user)


@router.post("/admin/discord-test")
async def admin_discord_test(request: Request, user: dict = Depends(require_admin)):
    """Send a sample embed to a configured Discord webhook so the operator can
    validate it from CMS → Settings → Webhook without publishing real content.
    body: {"target": "morning" | "news" | "news_listing"}."""
    from utils import discord as _discord

    body = await request.json()
    target = (body.get("target") or "morning").strip()
    if target not in ("morning", "news", "news_listing"):
        target = "morning"
    s = await db.settings.find_one({}, {"_id": 0}) or {}
    webhook = _discord.resolve_webhook(s, target)
    if not webhook:
        return {"status": "skipped", "message": "webhook not configured"}

    def _brand(v):
        if isinstance(v, dict):
            return v.get("en") or next((x for x in v.values() if x), "")
        return v or ""

    brand = _brand(s.get("site_name")) or _brand(s.get("brand_name")) or "CMS"
    labels = {"morning": "Morning Brief", "news": "News (detail)", "news_listing": "News (listing)"}
    embed = _discord.build_embed(
        s,
        title=f"✅ Test — {labels[target]}",
        description=f"This is a test message from **{brand}** · CMS → Settings → Webhook.",
        url=(s.get("site_url") or ""),
    )
    payload = _discord.build_payload(s, brand, embed)
    return await _discord.send(webhook, payload)


@router.get("/admin/stripe-status")
async def admin_stripe_status(request: Request, user: dict = Depends(require_admin)):
    """Status indicator for the Stripe Settings tab. Tells the operator
    whether the key is configured (DB or env) and surfaces the exact
    webhook URL they need to register in their Stripe dashboard."""
    from utils.runtime_config import get_stripe_api_key, get_webhook_url, get_site_url
    api_key = await get_stripe_api_key()
    webhook_url = await get_webhook_url(str(request.base_url))
    site_url = await get_site_url(str(request.base_url))
    is_test = api_key.startswith("sk_test_")
    is_live = api_key.startswith("sk_live_")
    return {
        "configured": bool(api_key),
        "mode": "test" if is_test else ("live" if is_live else None),
        "webhook_url": webhook_url,
        "site_url": site_url,
    }


@router.post("/admin/stripe-test")
async def admin_stripe_test(request: Request, user: dict = Depends(require_admin)):
    """Pings Stripe to verify a key is live + valid.

    Accepts an optional body `{api_key}` so operators can test a key BEFORE
    saving it. If no api_key is supplied, falls back to the currently saved
    one (CMS or env). Calls Stripe's GET /v1/account with the bearer key —
    a successful 200 means the key is valid; 401 means invalid; anything
    else is bubbled up as a server-side issue.
    """
    import httpx
    from utils.runtime_config import get_stripe_api_key

    body = {}
    try:
        body = await request.json()
    except Exception:
        body = {}
    raw = (body.get("api_key") or "").strip()
    api_key = raw if raw else (await get_stripe_api_key())
    if not api_key:
        return {
            "ok": False,
            "code": "no_key",
            "message": "No Stripe key supplied or saved.",
        }
    if not (api_key.startswith("sk_test_") or api_key.startswith("sk_live_")):
        return {
            "ok": False,
            "code": "bad_format",
            "message": "Key must start with 'sk_test_' or 'sk_live_'.",
        }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.stripe.com/v1/account",
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except httpx.RequestError as e:
        return {"ok": False, "code": "network", "message": f"Could not reach Stripe: {e}"}

    if r.status_code == 200:
        data = r.json()
        return {
            "ok": True,
            "code": "valid",
            "mode": "test" if api_key.startswith("sk_test_") else "live",
            "account_id": data.get("id"),
            "business_name": (
                data.get("business_profile") or {}
            ).get("name") or data.get("display_name") or "",
            "country": data.get("country"),
            "default_currency": data.get("default_currency"),
            "email": data.get("email"),
        }
    if r.status_code == 401:
        return {
            "ok": False,
            "code": "invalid",
            "message": "Stripe rejected the key (401 Unauthorized).",
        }
    # Surface Stripe's own error message when available
    detail = ""
    try:
        detail = (r.json().get("error") or {}).get("message", "")
    except Exception:
        detail = r.text[:300]
    return {
        "ok": False,
        "code": f"http_{r.status_code}",
        "message": detail or f"Unexpected Stripe response (HTTP {r.status_code}).",
    }

# Pages
@router.get("/admin/pages/{page_type}")
async def admin_get_page(page_type: str, user: dict = Depends(require_admin)):
    page = await db.pages.find_one({"page_type": page_type}, {"_id": 0})
    return page or {"page_type": page_type, "title": page_type.replace("_", " ").title(), "content": ""}

@router.put("/admin/pages/{page_type}")
async def admin_update_page(page_type: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["page_type"] = page_type
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.pages.update_one({"page_type": page_type}, {"$set": body}, upsert=True)
    return await db.pages.find_one({"page_type": page_type}, {"_id": 0})

# Nav Pages
@router.get("/admin/nav-pages")
async def admin_list_nav_pages(user: dict = Depends(require_admin)):
    return await db.nav_pages.find({}, {"_id": 0}).sort("order", 1).to_list(100)

async def _sync_page_type(body: dict):
    """If nav_page has a page_type, sync content to pages collection so TermsPage/PrivacyPage stay current."""
    pt = body.get("page_type", "")
    if pt:
        sync = {"page_type": pt, "title": body.get("title", ""), "content": body.get("content", ""),
                "banner_image": body.get("banner_image", ""), "summary": body.get("summary", ""),
                "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.pages.update_one({"page_type": pt}, {"$set": sync}, upsert=True)

@router.post("/admin/nav-pages")
async def admin_create_nav_page(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.setdefault("id", str(uuid.uuid4()))
    body.setdefault("order", 0)
    for k in ("show_in_header", "show_in_footer", "open_in_new_tab", "login_required"):
        body.setdefault(k, False)
    for k in ("banner_image", "summary", "content"):
        body.setdefault(k, "")
    result = await crud_create("nav_pages", body)
    await _sync_page_type(body)
    return result

@router.put("/admin/nav-pages/{item_id}")
async def admin_update_nav_page(item_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    result = await crud_update("nav_pages", item_id, body)
    if result:
        await _sync_page_type(result)
    return result

@router.delete("/admin/nav-pages/{item_id}")
async def admin_delete_nav_page(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("nav_pages", item_id)

@router.post("/admin/seed-system-pages")
async def seed_system_pages(user: dict = Depends(require_admin)):
    system_pages = [
        {"title": "Home", "url": "/", "system": True, "system_key": "home", "show_in_header": True, "show_in_footer": False, "order": -100},
        {"title": "News", "url": "/news", "system": True, "system_key": "news", "show_in_header": False, "show_in_footer": False, "order": -90},
        {"title": "Gallery", "url": "/gallery", "system": True, "system_key": "gallery", "show_in_header": False, "show_in_footer": False, "order": -80},
        {"title": "Reading List", "url": "/reading-list", "system": True, "system_key": "reading_list", "show_in_header": False, "show_in_footer": False, "order": -70},
    ]
    seeded = 0
    for sp in system_pages:
        existing = await db.nav_pages.find_one({"system_key": sp["system_key"]}, {"_id": 0})
        if not existing:
            sp["id"] = str(uuid.uuid4())
            sp["open_in_new_tab"] = False
            sp["login_required"] = False
            sp["banner_image"] = ""
            sp["summary"] = ""
            sp["content"] = ""
            sp["page_type"] = ""
            sp["layout"] = ""
            sp["zones"] = {}
            sp["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.nav_pages.insert_one(sp)
            seeded += 1
    return {"seeded": seeded}

# Gallery Albums (CRUD)
@router.get("/admin/gallery-albums")
async def admin_list_gallery_albums(user: dict = Depends(require_admin)):
    return await db.gallery_albums.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.post("/admin/gallery-albums")
async def admin_create_gallery_album(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.setdefault("id", str(uuid.uuid4()))
    body.setdefault("order", 0)
    body.setdefault("cover_image", "")
    body.setdefault("description", "")
    return await crud_create("gallery_albums", body)

@router.put("/admin/gallery-albums/{item_id}")
async def admin_update_gallery_album(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("gallery_albums", item_id, await request.json())

@router.delete("/admin/gallery-albums/{item_id}")
async def admin_delete_gallery_album(item_id: str, user: dict = Depends(require_admin)):
    # Also delete all photos in this album
    await db.album_photos.delete_many({"album_id": item_id})
    return await crud_delete("gallery_albums", item_id)

# Album Photos (CRUD)
@router.get("/admin/album-photos/{album_id}")
async def admin_list_album_photos(album_id: str, user: dict = Depends(require_admin)):
    return await db.album_photos.find({"album_id": album_id}, {"_id": 0}).sort("order", 1).to_list(500)

@router.post("/admin/album-photos")
async def admin_create_album_photo(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.setdefault("id", str(uuid.uuid4()))
    body.setdefault("order", 0)
    body.setdefault("caption", "")
    return await crud_create("album_photos", body)

@router.put("/admin/album-photos/{item_id}")
async def admin_update_album_photo(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("album_photos", item_id, await request.json())

@router.delete("/admin/album-photos/{item_id}")
async def admin_delete_album_photo(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("album_photos", item_id)



# Users
@router.get("/admin/users")
async def admin_list_users(user: dict = Depends(require_admin)):
    return await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}).to_list(1000)

@router.post("/admin/users")
async def admin_create_user(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    existing = await db.users.find_one({"email": body.get("email", "")})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    new_user = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": body.get("email", ""),
        "first_name": body.get("first_name", ""), "last_name": body.get("last_name", ""),
        "name": f"{body.get('first_name', '')} {body.get('last_name', '')}".strip(),
        "phone": body.get("phone", ""), "password_hash": hash_password(body.get("password", "changeme123")),
        "role": "user", "picture": "", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    return {k: v for k, v in new_user.items() if k not in ("password_hash", "_id")}

@router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, request: Request, admin: dict = Depends(require_admin)):
    body = await request.json()
    update = {}
    for k in ("first_name", "last_name", "email", "phone"):
        if k in body:
            update[k] = body[k]
    if "first_name" in body or "last_name" in body:
        curr = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        fn = body.get("first_name", curr.get("first_name", ""))
        ln = body.get("last_name", curr.get("last_name", ""))
        update["name"] = f"{fn} {ln}".strip()
    if "password" in body and body["password"]:
        update["password_hash"] = hash_password(body["password"])
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# Member Types
@router.get("/admin/member-types")
async def admin_list_member_types(user: dict = Depends(require_admin)):
    return await db.member_types.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.post("/admin/member-types")
async def admin_create_member_type(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.setdefault("id", str(uuid.uuid4()))
    body.setdefault("order", 0)
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    return await crud_create("member_types", body)

@router.put("/admin/member-types/{item_id}")
async def admin_update_member_type(item_id: str, request: Request, user: dict = Depends(require_admin)):
    return await crud_update("member_types", item_id, await request.json())

@router.delete("/admin/member-types/{item_id}")
async def admin_delete_member_type(item_id: str, user: dict = Depends(require_admin)):
    return await crud_delete("member_types", item_id)


# Dashboard
@router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_admin)):
    blog_count = await db.blog_posts.count_documents({})
    services_count = await db.services.count_documents({})
    contacts_count = await db.contacts.count_documents({})
    unread_contacts = await db.contacts.count_documents({"read": False})
    purchases_count = await db.payment_transactions.count_documents({"payment_status": "paid"})
    gallery_count = await db.gallery.count_documents({})
    portfolio_count = await db.portfolio.count_documents({})
    testimonials_count = await db.testimonials.count_documents({})
    books_count = await db.books.count_documents({})
    maps_count = await db.maps.count_documents({})
    users_count = await db.members.count_documents({"role": {"$ne": "admin"}})
    members_count = await db.members.count_documents({})
    pages_count = await db.nav_pages.count_documents({})
    pipeline = [{"$match": {"payment_status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    revenue_result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    return {
        "blog_count": blog_count, "services_count": services_count,
        "contacts_count": contacts_count, "unread_contacts": unread_contacts,
        "purchases_count": purchases_count, "gallery_count": gallery_count,
        "portfolio_count": portfolio_count, "testimonials_count": testimonials_count,
        "books_count": books_count, "maps_count": maps_count,
        "users_count": users_count, "members_count": members_count, "pages_count": pages_count,
        "total_revenue": revenue_result[0]["total"] if revenue_result else 0
    }
