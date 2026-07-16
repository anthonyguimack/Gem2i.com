from fastapi import APIRouter, HTTPException, Request, Query
from models.database import db, send_email_smtp, logger
from utils.personality import scoped_find, pb_validate, scope_query, has_content
from datetime import datetime, timezone
import uuid
import httpx

router = APIRouter()

# Fields that count as "real" About content. An About doc with none of these set
# is treated as empty so the global About is used as a fallback.
_ABOUT_CONTENT_FIELDS = ["title", "description", "image", "signature_name",
                         "signature_title", "button_text", "label"]

@router.get("/public/settings")
async def get_public_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        return {}
    SENSITIVE = {
        "smtp_password", "smtp_user",
        "stripe_api_key", "stripe_publishable_key", "stripe_webhook_secret",
        "stripe_api_key_preview",
        "kms_sync_key", "news_sync_key", "points_sync_key",
        "news_replication_targets",  # embeds per-target sync keys
        "morning_discord_webhook", "news_discord_webhook", "news_discord_webhook_news",
        "claude_api_key",
    }
    return {k: v for k, v in settings.items() if k not in SENSITIVE}

@router.get("/public/social-catalog")
async def get_social_catalog():
    """The shared social-network registry (SOCIAL_LINKS_KMS_SYNC_PLAN). The CMS
    Social Links tab, the website Footer/Navbar, and the KMS all render from this
    one list so icons/labels/capability stay identical everywhere. Static — safe
    to cache client-side."""
    from utils.social_catalog import SOCIAL_CATALOG
    return SOCIAL_CATALOG

@router.get("/public/hero")
async def get_public_hero():
    return await db.hero.find_one({}, {"_id": 0}) or {}

@router.get("/public/hero-slides")
async def get_public_hero_slides(page: str = Query("")):
    """Returns only currently active hero slides, optionally filtered by assigned page."""
    now = datetime.now(timezone.utc).isoformat()
    all_slides = await db.hero_slides.find({}, {"_id": 0}).sort("date_start", 1).to_list(100)
    active = []
    for s in all_slides:
        ds = s.get("date_start", "")
        de = s.get("date_end", "")
        if not ds and not de:
            active.append(s)
            continue
        if ds and not de:
            if now >= ds:
                active.append(s)
            continue
        if not ds and de:
            if now <= de:
                active.append(s)
            continue
        if ds <= now <= de:
            active.append(s)
    if page:
        active = [s for s in active if page in (s.get("assigned_pages") or [])]
    return active

@router.get("/public/site-pages")
async def get_public_site_pages():
    """Returns all site pages (system + custom) for hero assignment and other uses."""
    system_pages = [
        {"id": "home", "title": "Home", "url": "/", "system": True},
        {"id": "news", "title": "News", "url": "/news", "system": True},
        {"id": "gallery", "title": "Gallery", "url": "/gallery", "system": True},
        {"id": "reading-list", "title": "Reading List", "url": "/reading-list", "system": True},
    ]
    nav_pages = await db.nav_pages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    custom = [{"id": p["id"], "title": p["title"], "url": p.get("url", ""), "system": False} for p in nav_pages]
    return system_pages + custom

@router.get("/public/about")
async def get_public_about(personality: str = None):
    doc = None
    if personality:
        scoped = await db.about.find_one({"personality": personality}, {"_id": 0})
        # Treat an EMPTY personality-scoped doc as missing so the global About
        # still renders (fixes "empty Business About hides the global one").
        if has_content(scoped, _ABOUT_CONTENT_FIELDS):
            doc = scoped
    if not doc:
        doc = await db.about.find_one({"personality": None}, {"_id": 0}) or {}
    return doc

@router.get("/public/services")
async def get_public_services(personality: str = None):
    # Filter out services the admin flagged as hidden (visible=false), sorted by
    # the admin `order`. `personality` returns that PB mini-site's services,
    # falling back to the global catalogue when it has none of its own.
    base = {"$or": [{"visible": {"$ne": False}}, {"visible": {"$exists": False}}]}
    return await scoped_find(db.services, base, personality, sort_field="order", limit=100)

@router.get("/public/blog")
async def get_public_blog(page: int = 1, limit: int = 9, category: str = "", personality: str = None):
    base = {"published": True}
    if category:
        base["category"] = category
    # Prefer this PB mini-site's posts; fall back to global when it has none.
    p = pb_validate(personality)
    query = scope_query(base, p)
    if p and await db.blog_posts.count_documents(query) == 0:
        query = scope_query(base, None)
    total = await db.blog_posts.count_documents(query)
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.get("/public/blog/{slug}")
async def get_public_blog_detail(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.get("/public/books")
async def get_public_books(personality: str = None):
    return await scoped_find(db.books, {}, personality, limit=100)

@router.get("/public/maps")
async def get_public_maps():
    return await db.maps.find({"published": True}, {"_id": 0}).to_list(100)

@router.get("/public/maps/{slug}")
async def get_public_map_detail(slug: str):
    m = await db.maps.find_one({"slug": slug}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    return m

@router.get("/public/map-locations")
async def get_public_map_locations(map_type: str = "", personality: str = None):
    base = {}
    if map_type:
        base["map_type"] = map_type
    return await scoped_find(db.map_locations, base, personality, limit=500)

@router.get("/public/gallery")
async def get_public_gallery(category: str = "", personality: str = None):
    base = {}
    if category:
        base["category"] = category
    return await scoped_find(db.gallery, base, personality, sort_field="order", limit=100)

@router.get("/public/gallery-categories")
async def get_public_gallery_categories():
    return await db.gallery_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)

@router.get("/public/portfolio")
async def get_public_portfolio(personality: str = None):
    return await scoped_find(db.portfolio, {}, personality, limit=100)

@router.get("/public/testimonials")
async def get_public_testimonials(personality: str = None):
    # Hide testimonials the admin toggled off, sorted by `order`. `personality`
    # returns that PB mini-site's set, falling back to global when it has none.
    base = {"$or": [{"visible": {"$ne": False}}, {"visible": {"$exists": False}}]}
    return await scoped_find(db.testimonials, base, personality, sort_field="order", limit=100)

@router.get("/public/sections")
async def get_public_sections():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        return {}
    sections = settings.get("sections", {})
    active_theme = settings.get("active_theme", "default")
    # Legacy global order (for default/modern/classic themes)
    legacy_order = settings.get("section_order", ["hero", "about", "services", "news", "blog", "reading_list", "map", "portfolio", "gallery", "testimonials", "contact"])
    # Per-theme order: fall back to legacy if Aurex has no theme-specific order yet
    orders = settings.get("section_orders", {}) or {}
    aurex_default = ["hero", "about", "aurex_audience", "services", "aurex_process", "aurex_video", "aurex_pricing", "aurex_team", "testimonials", "aurex_events", "news", "blog", "aurex_partners", "aurex_clients", "map", "contact"]
    section_order = orders.get(active_theme) or (aurex_default if active_theme == "aurex" else legacy_order)
    section_configs = (settings.get("section_configs") or {}).get(active_theme, {})
    return {
        "sections": sections,
        "section_order": section_order,
        "active_theme": active_theme,
        "section_configs": section_configs,
    }

@router.get("/public/page/{page_type}")
async def get_public_page(page_type: str):
    page = await db.pages.find_one({"page_type": page_type}, {"_id": 0})
    return page or {"page_type": page_type, "title": page_type.replace("_", " ").title(), "content": ""}

@router.get("/public/nav-pages")
async def get_public_nav_pages():
    return await db.nav_pages.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.get("/public/seo/{page_path:path}")
async def get_public_seo(page_path: str):
    seo = await db.seo_meta.find_one({"page_path": page_path}, {"_id": 0})
    return seo or {}

# External Blog API
def _blog_post(p: dict) -> dict:
    return {"title": p.get("title", ""), "image": p.get("image", ""),
            "url": p.get("url", p.get("link", "")),
            "summary": (p.get("summary", "") or "")[:150],
            "date": p.get("date", "")}


@router.get("/blog/latest")
async def get_blog_latest(categories: str = "", per: int = 3):
    """External Blog feed proxy. When `categories` (comma-separated KMS
    category/subcategory slugs, supplied by the block's own config) is given,
    return grouped `{sections:[{label,slug,url,posts}]}` from the KMS grouped
    feed. Otherwise keep the legacy flat `{posts}` (latest 3) — so any block or
    theme not yet migrated is unaffected. Public tier only (enforced KMS-side)."""
    settings = await db.settings.find_one({}, {"_id": 0})
    blog_api_url = settings.get("blog_api_url", "") if settings else ""
    if not blog_api_url:
        return {"posts": [], "sections": [], "error": "Blog API URL not configured"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            if categories.strip():
                base = blog_api_url.split("/api/")[0] if "/api/" in blog_api_url \
                    else blog_api_url.rstrip("/")
                resp = await http_client.get(
                    f"{base}/api/latest-by-category",
                    params={"slugs": categories, "limit": max(1, min(per, 20))})
                if resp.status_code != 200:
                    return {"sections": [], "posts": [], "error": "Blog API unavailable"}
                data = resp.json()
                sections = [{"label": s.get("name", ""), "slug": s.get("slug", ""),
                             "url": s.get("url", ""),
                             "posts": [_blog_post(p) for p in s.get("posts", [])]}
                            for s in data.get("sections", [])]
                return {"sections": sections}
            resp = await http_client.get(blog_api_url)
            if resp.status_code != 200:
                return {"posts": [], "error": "Blog API unavailable"}
            data = resp.json()
            return {"posts": [_blog_post(p) for p in data.get("posts", [])[:3]]}
    except Exception as e:
        logger.warning(f"Blog API error: {e}")
        return {"posts": [], "sections": [], "error": "Blog API unavailable"}


@router.get("/blog/categories")
async def get_blog_categories():
    """Proxy the KMS public category list so the CMS block-config picker can list
    real categories/subcategories (EXTERNAL_BLOG_KMS_SECTIONS_PLAN Phase 4).
    → {categories:[{id,name,slug,parent_id}]}."""
    settings = await db.settings.find_one({}, {"_id": 0})
    blog_api_url = settings.get("blog_api_url", "") if settings else ""
    if not blog_api_url:
        return {"categories": []}
    try:
        base = blog_api_url.split("/api/")[0] if "/api/" in blog_api_url \
            else blog_api_url.rstrip("/")
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            resp = await http_client.get(f"{base}/api/categories")
            if resp.status_code != 200:
                return {"categories": []}
            return {"categories": resp.json().get("categories", [])}
    except Exception as e:
        logger.warning(f"Blog categories error: {e}")
        return {"categories": []}

# Contact Form
@router.post("/contact")
async def submit_contact(request: Request):
    body = await request.json()
    from utils.rate_limit import public_form_guard
    await public_form_guard(request, body, key="contact")
    contact = {
        "id": str(uuid.uuid4()), "name": body.get("name", ""), "email": body.get("email", ""),
        "phone": body.get("phone", ""), "subject": body.get("subject", ""),
        "message": body.get("message", ""), "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact)
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings and settings.get("smtp_host") and settings.get("email_to"):
        try:
            cc_list = [c.strip() for c in settings.get("email_cc", "").split(",") if c.strip()]
            from utils.email_render import render_and_send
            await render_and_send(
                "contact_form_admin", settings,
                settings["email_to"], settings.get("name_to", "Admin"),
                variables={
                    "name": contact["name"],
                    "email": contact["email"],
                    "phone": contact["phone"],
                    "subject": contact["subject"],
                    "message": contact["message"],
                },
                from_email=settings.get("email_from", ""),
                from_name=contact["name"],
                cc_list=cc_list,
            )
        except Exception as e:
            logger.warning(f"Failed to send contact email: {e}")
    return {"message": "Contact form submitted successfully", "id": contact["id"]}

# Search
@router.get("/search")
async def search_content(q: str = Query("", min_length=0)):
    query = q.strip()
    if not query:
        return {"results": [], "total": 0}
    regex = {"$regex": query, "$options": "i"}
    results = []
    blogs = await db.blog_posts.find({"$or": [{"title": regex}, {"summary": regex}, {"content": regex}], "published": True}, {"_id": 0}).limit(10).to_list(10)
    for b in blogs:
        results.append({"type": "blog", "title": b["title"], "summary": b.get("summary", "")[:150], "url": f"/news/{b['slug']}", "image": b.get("image", "")})
    services = await db.services.find({"$or": [{"title": regex}, {"description": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for s in services:
        results.append({"type": "service", "title": s["title"], "summary": s.get("description", "")[:150], "url": "/#services"})
    portfolios = await db.portfolio.find({"$or": [{"title": regex}, {"description": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for p in portfolios:
        results.append({"type": "portfolio", "title": p["title"], "summary": p.get("description", "")[:150], "url": "/#portfolio"})
    books = await db.books.find({"$or": [{"title": regex}, {"author": regex}, {"description": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for b in books:
        results.append({"type": "book", "title": b["title"], "summary": f"by {b.get('author', '')}", "url": "/reading-list"})
    pages = await db.nav_pages.find({"$or": [{"title": regex}, {"content": regex}]}, {"_id": 0}).limit(5).to_list(5)
    for p in pages:
        results.append({"type": "page", "title": p["title"], "summary": p.get("summary", "")[:150], "url": p.get("url", "/")})
    return {"results": results, "total": len(results)}

# Public Gallery Albums & Photos
@router.get("/public/gallery-albums")
async def get_public_gallery_albums():
    return await db.gallery_albums.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.get("/public/gallery-albums/{album_id}/photos")
async def get_public_album_photos(album_id: str):
    album = await db.gallery_albums.find_one({"id": album_id}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    photos = await db.album_photos.find({"album_id": album_id}, {"_id": 0}).sort("order", 1).to_list(500)
    return {"album": album, "photos": photos}

# Public service detail
@router.get("/public/services/{item_id}")
async def get_public_service_detail(item_id: str):
    service = await db.services.find_one({"id": item_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

