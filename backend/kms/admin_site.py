"""KMS admin panel — Phase 3 (Tier-A remainder): Pages, Navigation, Widgets,
Galleries, Contact Messages, Users & Roles, Settings screens (General / SEO /
Preferences / Email / Social Login / Routes / Fonts / Themes), i18n dict.

All screens are admin-only (Varient parity: authors only get the posts pipeline).
Same conventions as admin.py: int `id` continuity, `lang_id` scoping, 303 redirects,
`_render_admin` for chrome. Settings writes bust the core 30s cache immediately.
"""
import logging
import math
import re
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi import File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from kms import core
from kms.admin import (_admin_gate, _next_id, _now_str, _render_admin, _slugify,
                       admin_router)
from kms.core import UPLOADS_DIR, db

logger = logging.getLogger(__name__)

GALLERY_SIZES = {"path_big": 1920, "path_small": 500}  # bound width, keep aspect


async def _unique_page_slug(base: str, exclude_id=None) -> str:
    slug, n = base, 2
    while True:
        q = {"slug": slug}
        if exclude_id is not None:
            q["id"] = {"$ne": exclude_id}
        if not await db.kms_pages.find_one(q, {"_id": 1}):
            return slug
        slug = f"{base}-{n}"
        n += 1


# ═══════════════════════════════ PAGES ═══════════════════════════════════════
@admin_router.get("/admin/pages", response_class=HTMLResponse)
async def pages_list(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    pages = [p async for p in db.kms_pages.find({"lang_id": lang_id})
             .sort([("page_order", 1), ("id", 1)])]
    return await _render_admin(request, user, "pages.html", active="pages",
                               title="Pages", pages=pages)


async def _page_form(request: Request, page=None):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    parents = [p async for p in db.kms_pages.find(
        {"lang_id": lang_id, "parent_id": 0, "page_type": "page"}).sort("page_order", 1)]
    return await _render_admin(
        request, user, "page_form.html", active="pages",
        title="Update Page" if page else "Add Page", page=page,
        parents=[p for p in parents if not page or p["id"] != page["id"]])


@admin_router.get("/admin/add-page", response_class=HTMLResponse)
async def add_page(request: Request):
    return await _page_form(request, None)


@admin_router.get("/admin/edit-page/{page_id}", response_class=HTMLResponse)
@admin_router.get("/admin/edit-menu-link/{page_id}", response_class=HTMLResponse)
async def edit_page(request: Request, page_id: int):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    page = await db.kms_pages.find_one({"id": page_id})
    if not page:
        return RedirectResponse("/admin/pages", status_code=303)
    return await _page_form(request, page)


@admin_router.post("/admin/page-save")
async def page_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    pid = int(form.get("id") or 0)
    existing = await db.kms_pages.find_one({"id": pid}) if pid else None
    title = (form.get("title") or "").strip()
    if not title:
        return RedirectResponse("/admin/pages", status_code=303)
    is_default = bool(existing and existing.get("is_custom") == 0)
    page_type = (existing or {}).get("page_type") if is_default else \
        ("link" if form.get("page_type") == "link" else "page")
    doc = {
        "lang_id": int(form.get("lang_id") or 1),
        "title": title,
        "description": (form.get("description") or "").strip() or None,
        "keywords": (form.get("keywords") or "").strip() or None,
        "page_order": int(form.get("page_order") or 0),
        "visibility": 1 if form.get("visibility") == "1" else 0,
        "title_active": 1 if form.get("title_active") == "1" else 0,
        "breadcrumb_active": 1 if form.get("breadcrumb_active") == "1" else 0,
        "right_column_active": 1 if form.get("right_column_active") == "1" else 0,
        "need_auth": 1 if form.get("need_auth") == "1" else 0,
        "location": form.get("location") or "top",
        "parent_id": int(form.get("parent_id") or 0),
        "page_type": page_type,
    }
    if is_default:
        # default module pages keep their slug + default name (Varient behavior)
        doc["slug"] = existing.get("slug")
    else:
        doc["slug"] = await _unique_page_slug(
            _slugify(form.get("slug") or title), exclude_id=pid or None)
        doc["link"] = (form.get("link") or "").strip() or None
        doc["page_content"] = form.get("page_content") or None
        doc["is_custom"] = 1
        doc["page_default_name"] = None
    if existing:
        await db.kms_pages.update_one({"id": pid}, {"$set": doc})
    else:
        doc.update(id=await _next_id(db.kms_pages), created_at=_now_str())
        await db.kms_pages.insert_one(doc)
    return RedirectResponse("/admin/pages", status_code=303)


@admin_router.post("/admin/page-delete")
async def page_delete(request: Request, page_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    page = await db.kms_pages.find_one({"id": page_id})
    if page and page.get("is_custom") != 0:  # default module pages are permanent
        await db.kms_pages.delete_one({"id": page_id})
        await db.kms_pages.update_many({"parent_id": page_id}, {"$set": {"parent_id": 0}})
    return RedirectResponse("/admin/pages", status_code=303)


# ═══════════════════════════ NAVIGATION ══════════════════════════════════════
@admin_router.get("/admin/navigation", response_class=HTMLResponse)
async def navigation(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    pages = [p async for p in db.kms_pages.find({"lang_id": lang_id})
             .sort([("page_order", 1), ("id", 1)])]
    cats = await core.categories(lang_id)
    return await _render_admin(request, user, "navigation.html", active="navigation",
                               title="Navigation", pages=pages,
                               cats=[c for c in cats if not c.get("parent_id")])


@admin_router.post("/admin/nav-move")
async def nav_move(request: Request, page_id: int = Form(...), direction: str = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    pages = [p async for p in db.kms_pages.find({"lang_id": lang_id})
             .sort([("page_order", 1), ("id", 1)])]
    idx = next((i for i, p in enumerate(pages) if p["id"] == page_id), None)
    if idx is not None:
        j = idx - 1 if direction == "up" else idx + 1
        if 0 <= j < len(pages):
            pages[idx], pages[j] = pages[j], pages[idx]
            for order, p in enumerate(pages, start=1):  # renumber the whole strip
                await db.kms_pages.update_one({"id": p["id"]},
                                              {"$set": {"page_order": order}})
    return RedirectResponse("/admin/navigation", status_code=303)


@admin_router.post("/admin/nav-visibility")
async def nav_visibility(request: Request, page_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    page = await db.kms_pages.find_one({"id": page_id})
    if page:
        await db.kms_pages.update_one(
            {"id": page_id}, {"$set": {"visibility": 0 if page.get("visibility") == 1 else 1}})
    return RedirectResponse("/admin/navigation", status_code=303)


@admin_router.post("/admin/nav-cat-toggle")
async def nav_cat_toggle(request: Request, cat_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    cat = await db.kms_categories.find_one({"id": cat_id})
    if cat:
        await db.kms_categories.update_one(
            {"id": cat_id}, {"$set": {"show_on_menu": 0 if cat.get("show_on_menu") == 1 else 1}})
    return RedirectResponse("/admin/navigation", status_code=303)


# ═════════════════════════════ WIDGETS ═══════════════════════════════════════
@admin_router.get("/admin/widgets", response_class=HTMLResponse)
async def widgets_list(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    widgets = [w async for w in db.kms_widgets.find({"lang_id": lang_id})
               .sort([("widget_order", 1), ("id", 1)])]
    return await _render_admin(request, user, "widgets.html", active="widgets",
                               title="Widgets", widgets=widgets)


async def _widget_form(request: Request, widget=None):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    return await _render_admin(
        request, user, "widget_form.html", active="widgets",
        title="Update Widget" if widget else "Add Widget", widget=widget,
        cats=[c for c in cats if not c.get("parent_id")])


@admin_router.get("/admin/add-widget", response_class=HTMLResponse)
async def add_widget(request: Request):
    return await _widget_form(request, None)


@admin_router.get("/admin/edit-widget/{widget_id}", response_class=HTMLResponse)
async def edit_widget(request: Request, widget_id: int):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    widget = await db.kms_widgets.find_one({"id": widget_id})
    if not widget:
        return RedirectResponse("/admin/widgets", status_code=303)
    return await _widget_form(request, widget)


@admin_router.post("/admin/widget-save")
async def widget_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    wid = int(form.get("id") or 0)
    existing = await db.kms_widgets.find_one({"id": wid}) if wid else None
    title = (form.get("title") or "").strip()
    if not title:
        return RedirectResponse("/admin/widgets", status_code=303)
    doc = {
        "lang_id": int(form.get("lang_id") or 1),
        "title": title,
        "widget_order": int(form.get("widget_order") or 0),
        "visibility": 1 if form.get("visibility") == "1" else 0,
    }
    if existing and existing.get("is_custom") == 0:
        # built-in widgets: only title/order/visibility + the category selector
        if existing.get("type") == "category":
            doc["display_category_id"] = int(form.get("display_category_id") or 0) or None
    else:
        doc.update(type="custom", is_custom=1,
                   content=form.get("content") or None, display_category_id=None)
    if existing:
        await db.kms_widgets.update_one({"id": wid}, {"$set": doc})
    else:
        doc.update(id=await _next_id(db.kms_widgets), created_at=_now_str())
        await db.kms_widgets.insert_one(doc)
    return RedirectResponse("/admin/widgets", status_code=303)


@admin_router.post("/admin/widget-delete")
async def widget_delete(request: Request, widget_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    w = await db.kms_widgets.find_one({"id": widget_id})
    if w and w.get("is_custom") != 0:  # built-in widgets can be hidden, not deleted
        await db.kms_widgets.delete_one({"id": widget_id})
    return RedirectResponse("/admin/widgets", status_code=303)


# ═════════════════════════════ GALLERY ═══════════════════════════════════════
@admin_router.get("/admin/gallery-images", response_class=HTMLResponse)
async def gallery_images(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    images = [g async for g in db.kms_gallery.find({"lang_id": lang_id}).sort("id", -1)]
    albums = [a async for a in db.kms_gallery_albums.find({"lang_id": lang_id}).sort("id", 1)]
    cats = [c async for c in db.kms_gallery_categories.find({"lang_id": lang_id}).sort("id", 1)]
    return await _render_admin(request, user, "gallery_images.html", active="gallery",
                               title="Gallery Images", images=images, albums=albums,
                               gcats=cats)


@admin_router.post("/admin/gallery-image-add")
async def gallery_image_add(request: Request, file: UploadFile = File(...),
                            title: str = Form(""), album_id: int = Form(0),
                            category_id: int = Form(0)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    try:
        from PIL import Image
    except ImportError:
        return HTMLResponse("Pillow not installed", status_code=500)
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        return RedirectResponse("/admin/gallery-images?err=size", status_code=303)
    try:
        im = Image.open(BytesIO(raw))
        im.load()
        if im.mode in ("RGBA", "P", "LA"):
            im = im.convert("RGB")
    except Exception:
        return RedirectResponse("/admin/gallery-images?err=type", status_code=303)
    folder = datetime.now(timezone.utc).strftime("%Y%m")
    (UPLOADS_DIR / "gallery" / folder).mkdir(parents=True, exist_ok=True)
    uid = uuid.uuid4().hex[:13]
    paths = {}
    for variant, width in GALLERY_SIZES.items():
        copy = im.copy()
        copy.thumbnail((width, width * 3))
        name = f"image_{width}x_{uid}.jpg"
        copy.save(UPLOADS_DIR / "gallery" / folder / name, "JPEG", quality=88)
        paths[variant] = f"uploads/gallery/{folder}/{name}"
    await db.kms_gallery.insert_one({
        "id": await _next_id(db.kms_gallery),
        "lang_id": (await core.default_lang()).get("id", 1),
        "title": title.strip() or None,
        "album_id": album_id or None, "category_id": category_id or None,
        **paths, "is_album_cover": 0, "storage": "local", "created_at": _now_str()})
    return RedirectResponse("/admin/gallery-images", status_code=303)


@admin_router.post("/admin/gallery-image-delete")
async def gallery_image_delete(request: Request, image_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    img = await db.kms_gallery.find_one({"id": image_id})
    if img:
        for k in GALLERY_SIZES:
            p = img.get(k)
            if p:
                try:
                    target = (UPLOADS_DIR / Path(p).relative_to("uploads")).resolve()
                    if str(target).startswith(str(UPLOADS_DIR.resolve())) and target.is_file():
                        target.unlink()
                except Exception:
                    pass
        await db.kms_gallery.delete_one({"id": image_id})
    return RedirectResponse("/admin/gallery-images", status_code=303)


@admin_router.post("/admin/gallery-image-cover")
async def gallery_image_cover(request: Request, image_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    img = await db.kms_gallery.find_one({"id": image_id})
    if img and img.get("album_id"):
        await db.kms_gallery.update_many({"album_id": img["album_id"]},
                                         {"$set": {"is_album_cover": 0}})
        await db.kms_gallery.update_one({"id": image_id}, {"$set": {"is_album_cover": 1}})
    return RedirectResponse("/admin/gallery-images", status_code=303)


@admin_router.get("/admin/gallery-albums", response_class=HTMLResponse)
async def gallery_albums(request: Request, edit: int = 0):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    albums = [a async for a in db.kms_gallery_albums.find({"lang_id": lang_id}).sort("id", 1)]
    counts = {a["id"]: await db.kms_gallery.count_documents({"album_id": a["id"]})
              for a in albums}
    editing = next((a for a in albums if a["id"] == edit), None) if edit else None
    return await _render_admin(request, user, "gallery_albums.html", active="gallery",
                               title="Gallery Albums", albums=albums, counts=counts,
                               editing=editing)


@admin_router.post("/admin/gallery-album-save")
async def gallery_album_save(request: Request, album_id: int = Form(0), name: str = Form("")):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    name = name.strip()
    if name:
        if album_id:
            await db.kms_gallery_albums.update_one({"id": album_id}, {"$set": {"name": name}})
        else:
            await db.kms_gallery_albums.insert_one({
                "id": await _next_id(db.kms_gallery_albums),
                "lang_id": (await core.default_lang()).get("id", 1),
                "name": name, "created_at": _now_str()})
    return RedirectResponse("/admin/gallery-albums", status_code=303)


@admin_router.post("/admin/gallery-album-delete")
async def gallery_album_delete(request: Request, album_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    n = await db.kms_gallery.count_documents({"album_id": album_id})
    if n:  # refuse: images must be moved/deleted first (no silent cascade)
        return RedirectResponse("/admin/gallery-albums?err=notempty", status_code=303)
    await db.kms_gallery_albums.delete_one({"id": album_id})
    await db.kms_gallery_categories.delete_many({"album_id": album_id})
    return RedirectResponse("/admin/gallery-albums", status_code=303)


@admin_router.get("/admin/gallery-categories", response_class=HTMLResponse)
async def gallery_categories(request: Request, edit: int = 0):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    cats = [c async for c in db.kms_gallery_categories.find({"lang_id": lang_id}).sort("id", 1)]
    albums = [a async for a in db.kms_gallery_albums.find({"lang_id": lang_id}).sort("id", 1)]
    counts = {c["id"]: await db.kms_gallery.count_documents({"category_id": c["id"]})
              for c in cats}
    editing = next((c for c in cats if c["id"] == edit), None) if edit else None
    return await _render_admin(request, user, "gallery_categories.html", active="gallery",
                               title="Gallery Categories", gcats=cats, albums=albums,
                               counts=counts, editing=editing)


@admin_router.post("/admin/gallery-category-save")
async def gallery_category_save(request: Request, cat_id: int = Form(0),
                                name: str = Form(""), album_id: int = Form(0)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    name = name.strip()
    if name:
        doc = {"name": name, "album_id": album_id or None}
        if cat_id:
            await db.kms_gallery_categories.update_one({"id": cat_id}, {"$set": doc})
        else:
            await db.kms_gallery_categories.insert_one({
                "id": await _next_id(db.kms_gallery_categories),
                "lang_id": (await core.default_lang()).get("id", 1),
                **doc, "created_at": _now_str()})
    return RedirectResponse("/admin/gallery-categories", status_code=303)


@admin_router.post("/admin/gallery-category-delete")
async def gallery_category_delete(request: Request, cat_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_gallery_categories.delete_one({"id": cat_id})
    await db.kms_gallery.update_many({"category_id": cat_id}, {"$set": {"category_id": None}})
    return RedirectResponse("/admin/gallery-categories", status_code=303)


# ═══════════════════════ CONTACT MESSAGES ════════════════════════════════════
@admin_router.get("/admin/contact-messages", response_class=HTMLResponse)
async def contact_messages(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    msgs = [m async for m in db.kms_contacts.find({}).sort("id", -1)]
    return await _render_admin(request, user, "contacts.html", active="contact-messages",
                               title="Contact Messages", msgs=msgs)


@admin_router.post("/admin/contact-delete")
async def contact_delete(request: Request, msg_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_contacts.delete_one({"id": msg_id})
    return RedirectResponse("/admin/contact-messages", status_code=303)


# ═══════════════════════════ USERS & ROLES ═══════════════════════════════════
async def _author_only_query() -> dict:
    """Solo autores (sin admins) para el recuento del panel de roles."""
    from utils.member_capabilities import type_ids_with
    from utils.product_access import membership_v2_enabled
    if await membership_v2_enabled(db):
        return {"$or": [{"cms_roles": "role_author"},
                        {"member_type_id": {"$in": list(await type_ids_with(db, "is_author"))}}]}
    return {"cms_roles": "role_author"}


async def _member_role(m: dict) -> str:
    """Autor = capacidad del TIPO de miembro (gobernanza 2026-07-21); el helper
    conserva la rama del rol `role_author` para las marcas sin migrar."""
    from utils.member_capabilities import is_author as _cap_is_author
    if (m.get("role") or "") == "admin" or "role_admin" in (m.get("cms_roles") or []):
        return "Super Admin"
    if await _cap_is_author(db, m):
        return "Author"
    return "Member"


@admin_router.get("/admin/users", response_class=HTMLResponse)
async def users_list(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    q = (request.query_params.get("q") or "").strip()
    filt = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        filt = {"$or": [{"email": rx}, {"username": rx},
                        {"first_name": rx}, {"last_name": rx}]}
    per = 20
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        page = 1
    total = await db.members.count_documents(filt)
    pages = max(1, math.ceil(total / per))
    page = min(page, pages)
    members = [m async for m in db.members.find(filt).sort("membership_number", 1)
               .skip((page - 1) * per).limit(per)]
    for m in members:
        m["kms_role"] = await _member_role(m)
    return await _render_admin(request, user, "users.html", active="users",
                               title="Users", members=members, q=q,
                               pager={"page": page, "pages": pages, "total": total})


@admin_router.get("/admin/roles-permissions", response_class=HTMLResponse)
async def roles_permissions(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    counts = {
        "Super Admin": await db.members.count_documents(
            {"$or": [{"role": "admin"}, {"cms_roles": "role_admin"}]}),
        "Author": await db.members.count_documents(await _author_only_query()),
    }
    counts["Member"] = await db.members.count_documents({}) - counts["Super Admin"] - counts["Author"]
    return await _render_admin(request, user, "roles.html", active="roles-permissions",
                               title="Roles & Permissions", counts=counts)


# ═════════════════════════════ SETTINGS ══════════════════════════════════════
# Field spec: (key, label, type, scope) — scope 'g' = general, 'l' = per-language.
# Types: text, textarea, number, checkbox, secret, select:<opt1|opt2...>
SETTINGS_SECTIONS = {
    "general-settings": {
        "title": "General Settings", "active": "general-settings",
        "fields": [
            ("application_name", "Application Name", "text", "l"),
            ("site_title", "Site Title", "text", "l"),
            ("home_title", "Home Title", "text", "l"),
            ("site_description", "Site Description (Meta Tag)", "textarea", "l"),
            ("keywords", "Keywords (Meta Tag)", "text", "l"),
            ("timezone", "Timezone", "text", "g"),
            ("google_analytics", "Google Analytics Code", "textarea", "g"),
            ("about_footer", "About Footer", "textarea", "l"),
            ("copyright", "Copyright", "text", "l"),
            ("contact_text", "Contact Page Text", "textarea", "l"),
            ("contact_address", "Contact Address", "text", "l"),
            ("contact_email", "Contact Email", "text", "l"),
            ("contact_phone", "Contact Phone", "text", "l"),
            ("cookies_warning", "Cookies Warning Enabled", "checkbox", "g_lang_first"),
            ("cookies_warning_text", "Cookies Warning Text", "textarea", "l"),
            ("optional_url_button_name", "Optional URL Button Name", "text", "l"),
        ]},
    "preferences": {
        "title": "Preferences", "active": "preferences",
        "fields": [
            ("show_newsticker", "Show News Ticker", "checkbox", "g"),
            ("show_featured_section", "Show Featured Section", "checkbox", "g"),
            ("show_latest_posts", "Show Latest Posts", "checkbox", "g"),
            ("show_latest_posts_on_slider", "Latest Posts on Slider", "checkbox", "g"),
            ("show_latest_posts_on_featured", "Latest Posts on Featured", "checkbox", "g"),
            ("show_post_author", "Show Post Author", "checkbox", "g"),
            ("show_post_date", "Show Post Date", "checkbox", "g"),
            ("show_hits", "Show Hits (Pageviews)", "checkbox", "g"),
            ("show_rss", "Show RSS Feeds", "checkbox", "g"),
            ("show_home_link", "Show Home Link on Menu", "checkbox", "g"),
            ("emoji_reactions", "Emoji Reactions", "checkbox", "g"),
            ("sticky_sidebar", "Sticky Sidebar", "checkbox", "g"),
            # s136: the PHP admin had these; the native rebuild read them but never
            # exposed them, so they could only be changed in the database.
            ("comment_system", "Comments (allow readers to comment)", "checkbox", "g"),
            ("comment_approval_system", "Approve Comments Before Publishing (off = publish instantly)", "checkbox", "g"),
            ("registration_system", "Registration System", "checkbox", "g"),
            ("email_verification", "Email Verification", "checkbox", "g"),
            ("approve_added_user_posts", "Approve Added User Posts", "checkbox", "g"),
            ("approve_updated_user_posts", "Approve Updated User Posts", "checkbox", "g"),
            ("pagination_per_page", "Posts Per Page", "number", "g"),
            ("menu_limit", "Menu Limit", "number", "g"),
            ("maintenance_mode_status", "Maintenance Mode", "checkbox", "g"),
            ("maintenance_mode_title", "Maintenance Mode Title", "text", "g"),
            ("maintenance_mode_description", "Maintenance Mode Description", "textarea", "g"),
        ]},
    "email-settings": {
        "title": "Email Settings", "active": "email-settings",
        "fields": [
            ("mail_protocol", "Mail Protocol", "select:smtp|mail", "g"),
            ("mail_host", "SMTP Host", "text", "g"),
            ("mail_port", "SMTP Port", "text", "g"),
            ("mail_username", "SMTP Username", "text", "g"),
            ("mail_password", "SMTP Password", "secret", "g"),
            ("mail_encryption", "Encryption", "select:tls|ssl|none", "g"),
            ("mail_title", "Mail Sender Title", "text", "g"),
            ("mail_reply_to", "Reply-To Address", "text", "g"),
            ("mail_contact_status", "Email Contact Messages", "checkbox", "g"),
            ("mail_contact", "Contact Notification Address", "text", "g"),
        ]},
    "social-login-settings": {
        "title": "Social Login Settings", "active": "social-login-settings",
        "fields": [
            ("google_client_id", "Google Client ID", "text", "g"),
            ("google_client_secret", "Google Client Secret", "secret", "g"),
            ("facebook_app_id", "Facebook App ID", "text", "g"),
            ("facebook_app_secret", "Facebook App Secret", "secret", "g"),
        ]},
    "seo-tools": {
        "title": "SEO Tools", "active": "seo-tools",
        "fields": [
            ("sitemap_frequency", "Sitemap Frequency",
             "select:auto|always|hourly|daily|weekly|monthly|yearly|never", "g"),
            ("sitemap_priority", "Sitemap Priority",
             "select:auto|0.1|0.2|0.3|0.4|0.5|0.6|0.7|0.8|0.9|1.0", "g"),
            ("google_news", "Google News Feed", "checkbox", "g"),
            ("custom_header_codes", "Custom Header Codes", "textarea", "g"),
            ("custom_footer_codes", "Custom Footer Codes", "textarea", "g"),
        ]},
    "storage": {
        "title": "Storage", "active": "storage",
        "fields": [
            ("storage", "Storage", "select:local|aws_s3", "g"),
            ("aws_key", "AWS Access Key", "text", "g"),
            ("aws_secret", "AWS Secret Key", "secret", "g"),
            ("aws_bucket", "S3 Bucket", "text", "g"),
            ("aws_region", "AWS Region", "text", "g"),
        ]},
    "cache-system": {
        "title": "Cache System", "active": "cache-system",
        "fields": [
            ("cache_system", "Cache System", "checkbox", "g"),
            ("static_cache_system", "Static Cache", "checkbox", "g"),
            ("cache_refresh_time", "Cache Refresh Time (minutes)", "number", "g"),
            ("refresh_cache_database_changes", "Refresh on Database Changes", "checkbox", "g"),
        ]},
    "google-news": {
        "title": "Google News", "active": "google-news",
        "fields": [
            ("google_news", "Google News Feed Enabled", "checkbox", "g"),
        ]},
    "route-settings": {
        "title": "Route Settings", "active": "route-settings",
        "fields": [
            (f"route_{k}", k.replace("-", " ").title(), "text", "g_routes")
            for k in ("admin", "profile", "tag", "reading-list", "settings",
                      "register", "posts", "search", "rss-feeds", "gallery-album",
                      "logout")
        ]},
    # KMS Colors — the 11 semantic theme tokens + typography (KMS_MODERNA_SPEC §1).
    # Feeds the --kms-* var block on every public page (both themes); blank = the
    # active theme's built-in default (core.THEME_TOKEN_DEFAULTS).
    "theme-colors": {
        "title": "Colors", "active": "theme-colors",
        "fields": [
            ("band", "Band / Masthead Background", "color", "g_theme_colors"),
            ("heading", "Headings / Titles", "color", "g_theme_colors"),
            ("accent", "Accent (rules / tabs / bullets)", "color", "g_theme_colors"),
            ("kicker", "Kicker Text", "color", "g_theme_colors"),
            ("box_bg", "Box / Callout Background", "color", "g_theme_colors"),
            ("ink", "Body Text", "color", "g_theme_colors"),
            ("muted", "Secondary Text", "color", "g_theme_colors"),
            ("line", "Hairlines / Borders", "color", "g_theme_colors"),
            ("row_alt", "Alternate Table Rows", "color", "g_theme_colors"),
            ("negative", "Negative / Down", "color", "g_theme_colors"),
            ("positive", "Positive / Up", "color", "g_theme_colors"),
            # Report-only header colour (iiReport bars / table headers); blank = band.
            ("report_band", "Report Headers (internal pages)", "color", "g_theme_colors"),
            ("heading_font", "Heading Font",
             "select:|Georgia, 'Times New Roman', serif|Helvetica, Arial, sans-serif"
             "|Arial, Helvetica, sans-serif|'Open Sans', Helvetica, sans-serif"
             "|'Inter', sans-serif", "g_theme_fonts"),
            ("body_font", "Body Font",
             "select:|Georgia, 'Times New Roman', serif|Helvetica, Arial, sans-serif"
             "|Arial, Helvetica, sans-serif|'Open Sans', Helvetica, sans-serif"
             "|'Inter', sans-serif", "g_theme_fonts"),
            ("heading_weight", "Heading Weight", "select:|400|600|700|800",
             "g_theme_fonts"),
        ]},
}
_SECRET_MASK = "********"


@admin_router.get("/admin/preferences", response_class=HTMLResponse)
@admin_router.get("/admin/email-settings", response_class=HTMLResponse)
@admin_router.get("/admin/social-login-settings", response_class=HTMLResponse)
@admin_router.get("/admin/seo-tools", response_class=HTMLResponse)
@admin_router.get("/admin/route-settings", response_class=HTMLResponse)
@admin_router.get("/admin/storage", response_class=HTMLResponse)
@admin_router.get("/admin/cache-system", response_class=HTMLResponse)
@admin_router.get("/admin/google-news", response_class=HTMLResponse)
@admin_router.get("/admin/theme-colors", response_class=HTMLResponse)
async def settings_screen(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    section = request.url.path.rstrip("/").rsplit("/", 1)[-1]
    spec = SETTINGS_SECTIONS[section]
    s = await core.kms_settings()
    lang_id = (await core.default_lang()).get("id", 1)
    gs = s.get("general") or {}
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    routes = gs.get("routes_decoded") or {}
    values = {}
    for key, _label, ftype, scope in spec["fields"]:
        if scope == "l":
            values[key] = ls.get(key)
        elif scope == "g_routes":
            rk = key[len("route_"):]
            values[key] = routes.get(rk) or rk
        elif scope == "g_lang_first":
            values[key] = ls.get(key) if ls.get(key) is not None else gs.get(key)
        elif scope == "g_theme_colors":
            values[key] = (gs.get("theme_colors") or {}).get(key)
        elif scope == "g_theme_fonts":
            values[key] = (gs.get("theme_fonts") or {}).get(key)
        else:
            values[key] = gs.get(key)
        if ftype == "secret" and values[key]:
            values[key] = _SECRET_MASK
    # effective per-token defaults for the active theme (picker swatches + hints)
    theme = core.active_theme(gs)
    return await _render_admin(request, user, "settings_form.html",
                               active=spec["active"], title=spec["title"],
                               section=section, fields=spec["fields"], values=values,
                               color_defaults=core.THEME_TOKEN_DEFAULTS[theme],
                               active_theme=theme,
                               saved=bool(request.query_params.get("saved")))


# ── General Settings — tabbed parity screen (Varient layout: General / Logo /
#    Contact / Social Media / Facebook Comments / Cookies / Header & Footer
#    Codes + reCAPTCHA + Maintenance Mode boxes; per-language via ?slang=) ─────
SOCIAL_CATALOG = [
    "facebook", "twitter", "instagram", "tiktok", "linkedin", "youtube",
    "whatsapp", "telegram", "pinterest", "threads", "snapchat", "discord",
    "reddit", "twitch", "vimeo", "spotify", "medium", "github", "email",
    "website",
]
_GS_L_TEXT = {"application_name", "about_footer", "optional_url_button_name",
              "copyright", "contact_text", "contact_address", "contact_email",
              "contact_phone", "cookies_warning_text"}
_GS_L_CB = {"cookies_warning"}
# NOTE: logo / logo_footer / logo_email / favicon are deliberately ABSENT — the
# platform CMS owns the brand marks (core.CMS_LOGO_SLOTS); the Logo tab shows them
# read-only, and a stale POST must not be able to write a second version here.
_GS_G_TEXT = {"timezone",
              "logo_size", "facebook_comment", "custom_header_codes",
              "custom_footer_codes", "maintenance_mode_title",
              "maintenance_mode_description", "recaptcha_site_key"}
_GS_G_CB = {"facebook_comment_active", "maintenance_mode_status"}
_GS_G_SECRET = {"recaptcha_secret_key"}
_GS_TABS = {"general", "logo", "contact", "social", "fbcomments", "cookies",
            "headercodes", "footercodes"}


@admin_router.get("/admin/general-settings", response_class=HTMLResponse)
async def general_settings(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    s = await core.kms_settings()
    langs = [lg for lg in await core.kms_languages() if lg.get("status") != 0]
    gs = s.get("general") or {}
    try:
        slang = int(request.query_params.get("slang") or gs.get("site_lang") or 1)
    except ValueError:
        slang = 1
    ls = (s.get("by_lang") or {}).get(str(slang)) or {}
    tab = request.query_params.get("tab") or "general"
    if tab not in _GS_TABS:
        tab = "general"
    try:
        import zoneinfo
        timezones = sorted(zoneinfo.available_timezones())
    except Exception:
        timezones = [gs.get("timezone") or "America/New_York", "UTC"]
    return await _render_admin(request, user, "general_settings.html",
                               active="general-settings", title="General Settings",
                               g=gs, l=ls, langs=langs, slang=slang, tab=tab,
                               timezones=timezones,
                               social=ls.get("social_decoded") or {},
                               social_catalog=SOCIAL_CATALOG,
                               brand_social_links=await core.brand_social_links(),
                               saved=bool(request.query_params.get("saved")))


@admin_router.post("/admin/general-settings-save")
async def general_settings_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    try:
        slang = int(form.get("slang") or 1)
    except ValueError:
        slang = 1
    tab = form.get("tab") if form.get("tab") in _GS_TABS else "general"
    keys = [k for k in (form.get("form_keys") or "").split(",") if k]
    updates = {}
    for key in keys:
        if key == "__social__":
            names = form.getlist("social_name")
            urls = form.getlist("social_url")
            social = {}
            for n, u in zip(names, urls):
                n = re.sub(r"[^a-z0-9_-]", "", (n or "").strip().lower())[:40]
                u = (u or "").strip()[:500]
                if n and u:
                    social[n] = u
            updates[f"by_lang.{slang}.social_decoded"] = social
        elif key in _GS_L_TEXT:
            updates[f"by_lang.{slang}.{key}"] = (form.get(key) or "").strip() or None
        elif key in _GS_L_CB:
            updates[f"by_lang.{slang}.{key}"] = 1 if form.get(key) == "1" else 0
        elif key in _GS_G_TEXT:
            updates[f"general.{key}"] = (form.get(key) or "").strip() or None
        elif key in _GS_G_CB:
            updates[f"general.{key}"] = 1 if form.get(key) == "1" else 0
        elif key in _GS_G_SECRET:
            raw = form.get(key)
            if raw and raw != _SECRET_MASK:
                updates[f"general.{key}"] = raw
    if updates:
        await db.kms_settings.update_one({"key": "kms"}, {"$set": updates})
        await core.kms_settings(force=True)
    return RedirectResponse(
        f"/admin/general-settings?slang={slang}&tab={tab}&saved=1", status_code=303)


@admin_router.post("/admin/settings-save")
async def settings_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    section = form.get("section") or ""
    spec = SETTINGS_SECTIONS.get(section)
    if not spec:
        return RedirectResponse("/admin", status_code=303)
    s = await core.kms_settings()
    lang_id = (await core.default_lang()).get("id", 1)
    gs = s.get("general") or {}
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    updates = {}
    for key, _label, ftype, scope in spec["fields"]:
        raw = form.get(key)
        if ftype == "checkbox":
            val = 1 if form.get(key) == "1" else 0
        elif ftype == "number":
            try:
                val = int(raw or 0)
            except ValueError:
                val = 0
        elif ftype == "secret":
            if raw is None or raw == "" or raw == _SECRET_MASK:
                continue  # keep the stored secret
            val = raw
        elif ftype == "color":
            val = (raw or "").strip()
            if val and not val.startswith("#"):
                val = "#" + val
            if not re.match(r"^#[0-9a-fA-F]{3,8}$", val):
                val = None  # blank/invalid ⇒ theme default
        else:
            val = (raw or "").strip() or None
        if scope == "l":
            updates[f"by_lang.{lang_id}.{key}"] = val
        elif scope == "g_routes":
            updates[f"general.routes_decoded.{key[len('route_'):]}"] = val
        elif scope == "g_lang_first":
            tgt = "by_lang.%s.%s" % (lang_id, key) if key in ls else f"general.{key}"
            updates[tgt] = val
        elif scope == "g_theme_colors":
            updates[f"general.theme_colors.{key}"] = val
        elif scope == "g_theme_fonts":
            updates[f"general.theme_fonts.{key}"] = val
        else:
            updates[f"general.{key}"] = val
    if updates:
        await db.kms_settings.update_one({"key": "kms"}, {"$set": updates})
        await core.kms_settings(force=True)
    return RedirectResponse(f"/admin/{section}?saved=1", status_code=303)


@admin_router.post("/admin/clear-cache")
async def clear_cache(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await core.kms_settings(force=True)
    core._cache["trans"] = {}
    return RedirectResponse(request.headers.get("referer") or "/admin/cache-system",
                            status_code=303)


# ── fonts ────────────────────────────────────────────────────────────────────
@admin_router.get("/admin/font-settings", response_class=HTMLResponse)
async def font_settings(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    s = await core.kms_settings()
    lang_id = (await core.default_lang()).get("id", 1)
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    fonts = [f async for f in db.kms_fonts.find({}).sort("font_name", 1)]
    return await _render_admin(request, user, "fonts.html", active="font-settings",
                               title="Font Settings", fonts=fonts,
                               primary=ls.get("primary_font"),
                               secondary=ls.get("secondary_font"),
                               tertiary=ls.get("tertiary_font"),
                               saved=bool(request.query_params.get("saved")))


@admin_router.post("/admin/font-settings-save")
async def font_settings_save(request: Request, primary_font: str = Form(""),
                             secondary_font: str = Form(""), tertiary_font: str = Form("")):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    await db.kms_settings.update_one({"key": "kms"}, {"$set": {
        f"by_lang.{lang_id}.primary_font": primary_font or None,
        f"by_lang.{lang_id}.secondary_font": secondary_font or None,
        f"by_lang.{lang_id}.tertiary_font": tertiary_font or None,
    }})
    await core.kms_settings(force=True)
    return RedirectResponse("/admin/font-settings?saved=1", status_code=303)


# ── themes (Magazine default; Moderna = KMS_MODERNA_THEME_PLAN) ──────────────
@admin_router.get("/admin/themes", response_class=HTMLResponse)
async def themes(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    s = await core.kms_settings()
    theme = core.active_theme(s.get("general") or {})
    return await _render_admin(request, user, "themes.html", active="themes",
                               title="Themes", theme=theme,
                               saved=bool(request.query_params.get("saved")))


@admin_router.post("/admin/theme-activate")
async def theme_activate(request: Request, theme: str = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    if theme in core.KMS_THEMES:
        await db.kms_settings.update_one({"key": "kms"},
                                         {"$set": {"general.theme": theme}})
        await core.kms_settings(force=True)
    return RedirectResponse("/admin/themes?saved=1", status_code=303)


@admin_router.post("/admin/theme-colors-import")
async def theme_colors_import(request: Request):
    """Best-effort seed of the KMS tokens from the CMS website palette
    (Settings → Colors → Website in the main CMS). Convenience only — the brief
    identities are deliberately distinct (plan §3/D2), so this maps what maps
    and leaves the finer tokens (ink/muted/line/rows/pos/neg) untouched."""
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    cms = await db.settings.find_one({}, {"theme_colors": 1}) or {}
    web = (cms.get("theme_colors") or {}).get("website") or {}
    hexre = re.compile(r"^#[0-9a-fA-F]{3,8}$")
    def pick(*keys):
        for k in keys:
            v = (web.get(k) or "").strip()
            if hexre.match(v):
                return v
        return None
    mapping = {
        "band": pick("primary", "button_bg"),
        "heading": pick("primary", "button_bg"),
        "accent": pick("accent", "button_hover_bg"),
        "kicker": pick("accent", "button_hover_bg"),
        "box_bg": pick("page_bg"),
    }
    updates = {f"general.theme_colors.{k}": v for k, v in mapping.items() if v}
    if updates:
        await db.kms_settings.update_one({"key": "kms"}, {"$set": updates})
        await core.kms_settings(force=True)
    return RedirectResponse("/admin/theme-colors?saved=1", status_code=303)


# ── languages + translations ─────────────────────────────────────────────────
@admin_router.get("/admin/language-settings", response_class=HTMLResponse)
async def language_settings(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    langs = await core.kms_languages()
    counts = {l["id"]: await db.kms_translations.count_documents({"lang_id": l["id"]})
              for l in langs}
    return await _render_admin(request, user, "languages.html", active="language-settings",
                               title="Languages", langs=langs, counts=counts)


@admin_router.post("/admin/language-status")
async def language_status(request: Request, lang_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang = await db.kms_languages.find_one({"id": lang_id})
    if lang:
        # the default site language can't be deactivated
        s = await core.kms_settings()
        if (s.get("general") or {}).get("site_lang") != lang_id or lang.get("status") == 0:
            await db.kms_languages.update_one(
                {"id": lang_id}, {"$set": {"status": 0 if lang.get("status") == 1 else 1}})
            await core.kms_settings(force=True)
    return RedirectResponse("/admin/language-settings", status_code=303)


# ═════════════════════════ COMMENTS (Phase 4a) ═══════════════════════════════
async def _comments_list(request: Request, *, status: int, title: str, active: str):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    rows = [c async for c in db.kms_comments.find({"status": status}).sort("id", -1).limit(300)]
    post_ids = list({c.get("post_id") for c in rows})
    posts = {p["id"]: p async for p in db.kms_posts.find(
        {"id": {"$in": post_ids}}, {"id": 1, "title": 1, "slug": 1})}
    return await _render_admin(request, user, "comments.html", active=active,
                               title=title, rows=rows, posts=posts, pending=status == 0)


@admin_router.get("/admin/comments", response_class=HTMLResponse)
async def comments_list(request: Request):
    return await _comments_list(request, status=1, title="Comments", active="comments")


@admin_router.get("/admin/pending-comments", response_class=HTMLResponse)
async def pending_comments(request: Request):
    return await _comments_list(request, status=0, title="Pending Comments",
                                active="pending-comments")


@admin_router.post("/admin/comment-approve")
async def comment_approve(request: Request, comment_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    c = await db.kms_comments.find_one({"id": comment_id})
    await db.kms_comments.update_one({"id": comment_id}, {"$set": {"status": 1}})
    # moderated comments earn their points at approval (D3); key is per-comment,
    # so a re-approve (or auto-approve race) can never double-credit
    if c and c.get("status") == 0 and c.get("user_id"):
        from utils import points as member_points
        await member_points.award(
            db, action="comment", mid=c["user_id"],
            ref={"post_id": c.get("post_id"), "comment_id": comment_id},
            key=f"comment:{comment_id}")
    return RedirectResponse("/admin/pending-comments", status_code=303)


@admin_router.post("/admin/comment-delete")
async def comment_delete(request: Request, comment_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_comments.delete_many(
        {"$or": [{"id": comment_id}, {"parent_id": comment_id}]})
    return RedirectResponse(request.headers.get("referer") or "/admin/comments",
                            status_code=303)


# ═════════════════════════ POLLS (Phase 4a) ══════════════════════════════════
@admin_router.get("/admin/polls", response_class=HTMLResponse)
async def polls_page(request: Request, edit: int = 0):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    polls = [p async for p in db.kms_polls.find({"lang_id": lang_id}).sort("id", -1)]
    counts, results = {}, {}
    for p in polls:
        counts[p["id"]] = await db.kms_poll_votes.count_documents({"poll_id": p["id"]})
        per = {}
        async for row in db.kms_poll_votes.aggregate(
                [{"$match": {"poll_id": p["id"]}},
                 {"$group": {"_id": "$vote", "n": {"$sum": 1}}}]):
            per[row["_id"]] = row["n"]
        results[p["id"]] = per
    editing = next((p for p in polls if p["id"] == edit), None) if edit else None
    return await _render_admin(request, user, "polls.html", active="polls",
                               title="Polls", polls=polls, counts=counts,
                               results=results, editing=editing)


@admin_router.post("/admin/poll-save")
async def poll_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    pid = int(form.get("id") or 0)
    question = (form.get("question") or "").strip()
    if not question:
        return RedirectResponse("/admin/polls", status_code=303)
    doc = {"lang_id": int(form.get("lang_id") or 1), "question": question,
           "status": 1 if form.get("status") == "1" else 0,
           "vote_permission": form.get("vote_permission") or "all"}
    for i in range(1, 11):
        doc[f"option{i}"] = (form.get(f"option{i}") or "").strip() or None
    if pid:
        await db.kms_polls.update_one({"id": pid}, {"$set": doc})
    else:
        doc.update(id=await _next_id(db.kms_polls), created_at=_now_str())
        await db.kms_polls.insert_one(doc)
    return RedirectResponse("/admin/polls", status_code=303)


@admin_router.post("/admin/poll-delete")
async def poll_delete(request: Request, poll_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_polls.delete_one({"id": poll_id})
    await db.kms_poll_votes.delete_many({"poll_id": poll_id})
    return RedirectResponse("/admin/polls", status_code=303)


# ═════════════════════ NEWSLETTER (Phase 4a) ═════════════════════════════════
@admin_router.get("/admin/newsletter", response_class=HTMLResponse)
async def newsletter_page(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    subs = [s async for s in db.kms_subscribers.find({}).sort("id", -1)]
    log = [l async for l in db.kms_newsletter_log.find({}).sort("id", -1).limit(10)]
    return await _render_admin(request, user, "newsletter.html", active="newsletter",
                               title="Newsletter", subs=subs, log=log)


@admin_router.get("/admin/newsletter-export")
async def newsletter_export(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lines = ["email,subscribed_at"]
    async for s in db.kms_subscribers.find({}).sort("id", 1):
        lines.append(f"{s.get('email','')},{s.get('created_at','')}")
    from fastapi.responses import Response
    return Response("\n".join(lines) + "\n", media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=subscribers.csv"})


@admin_router.post("/admin/subscriber-delete")
async def subscriber_delete(request: Request, sub_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_subscribers.delete_one({"id": sub_id})
    return RedirectResponse("/admin/newsletter", status_code=303)


# ═════════════════════ AD SPACES (Phase 4a) ══════════════════════════════════
AD_SPACE_NAMES = ["header", "index_top", "index_bottom", "post_top", "post_bottom",
                  "sidebar_top", "sidebar_bottom", "post_content"]


AD_SPACE_HINTS = {
    "header": "Below the navbar, every page",
    "index_top": "Top of the home page",
    "index_bottom": "Bottom of the home page",
    "post_top": "Above the article",
    "post_bottom": "Below the article",
    "sidebar_top": "Top of the sidebar",
    "sidebar_bottom": "Bottom of the sidebar",
    "post_content": "Inside the article, after paragraph N",
}


@admin_router.get("/admin/ad-spaces", response_class=HTMLResponse)
async def ad_spaces_page(request: Request, edit: int = 0, space: str = ""):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    ads = [a async for a in db.kms_ad_spaces.find({"lang_id": lang_id}).sort("id", 1)]
    editing = next((a for a in ads if a["id"] == edit), None) if edit else None
    # one row per slot (in render order); the public side keeps one ad per slot
    by_space = {}
    for a in ads:
        by_space.setdefault(a.get("ad_space"), a)
    slots = [{"name": n, "hint": AD_SPACE_HINTS.get(n, ""), "ad": by_space.get(n)}
             for n in AD_SPACE_NAMES]
    extra = [a for a in ads if by_space.get(a.get("ad_space")) is not a]
    return await _render_admin(request, user, "ad_spaces.html", active="ad-spaces",
                               title="Ad Spaces", ads=ads, editing=editing,
                               slots=slots, extra_ads=extra,
                               preset_space=space if space in AD_SPACE_NAMES else "",
                               used_spaces=set(by_space),
                               ads_on=await core.ads_enabled(),
                               categories=await core.categories(lang_id),
                               space_names=AD_SPACE_NAMES, hints=AD_SPACE_HINTS)


@admin_router.post("/admin/ads-toggle")
async def ads_toggle(request: Request, enabled: str = Form("")):
    """Master switch: off = no ad renders anywhere in the KMS (slots are kept)."""
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_settings.update_one({"key": "kms"},
                                     {"$set": {"general.ads_enabled": enabled == "1"}})
    await core.kms_settings(force=True)
    return RedirectResponse("/admin/ad-spaces", status_code=303)


@admin_router.post("/admin/ad-space-toggle")
async def ad_space_toggle(request: Request, ad_id: int = Form(...), enabled: str = Form("")):
    """Pause / resume a single slot without losing its code."""
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_ad_spaces.update_one({"id": ad_id}, {"$set": {"enabled": enabled == "1"}})
    return RedirectResponse("/admin/ad-spaces", status_code=303)


@admin_router.post("/admin/ad-space-save")
async def ad_space_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    aid = int(form.get("id") or 0)
    space = form.get("ad_space") or ""
    if space not in AD_SPACE_NAMES:
        return RedirectResponse("/admin/ad-spaces", status_code=303)

    def _num(k):
        v = (form.get(k) or "").strip()
        return int(v) if v.isdigit() else None

    doc = {"lang_id": int(form.get("lang_id") or 1), "ad_space": space,
           "ad_code_desktop": (form.get("ad_code_desktop") or "").strip() or None,
           "desktop_width": _num("desktop_width"), "desktop_height": _num("desktop_height"),
           "ad_code_mobile": (form.get("ad_code_mobile") or "").strip() or None,
           "mobile_width": _num("mobile_width"), "mobile_height": _num("mobile_height"),
           "display_category_id": _num("display_category_id"),
           "paragraph_number": _num("paragraph_number"),
           # s149: who sees it — everyone, or only readers with a paid KMS subscription
           "audience": "kms_paid" if form.get("audience") == "kms_paid" else "all",
           "enabled": form.get("enabled") == "1"}
    if aid:
        await db.kms_ad_spaces.update_one({"id": aid}, {"$set": doc})
    else:
        doc["id"] = await _next_id(db.kms_ad_spaces)
        await db.kms_ad_spaces.insert_one(doc)
    return RedirectResponse("/admin/ad-spaces", status_code=303)


@admin_router.post("/admin/ad-space-delete")
async def ad_space_delete(request: Request, ad_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_ad_spaces.delete_one({"id": ad_id})
    return RedirectResponse("/admin/ad-spaces", status_code=303)


# ═════════════════════ RSS IMPORT FEEDS (Phase 4b) ═══════════════════════════
@admin_router.get("/admin/feeds", response_class=HTMLResponse)
@admin_router.get("/admin/rss-feeds", response_class=HTMLResponse)
async def rss_feeds_page(request: Request, edit: int = 0):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    feeds = [f async for f in db.kms_rss_feeds.find({"lang_id": lang_id}).sort("id", 1)]
    cats = await core.categories(lang_id)
    editing = next((f for f in feeds if f["id"] == edit), None) if edit else None
    imported = request.query_params.get("imported")
    return await _render_admin(request, user, "rss_feeds.html", active="rss-feeds",
                               title="RSS Feeds", feeds=feeds, editing=editing,
                               cats=[c for c in cats if not c.get("parent_id")],
                               imported=imported,
                               err=request.query_params.get("err"))


@admin_router.post("/admin/feed-save")
async def feed_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    fid = int(form.get("id") or 0)
    name = (form.get("feed_name") or "").strip()
    url = (form.get("feed_url") or "").strip()
    if not name or not url.startswith(("http://", "https://")):
        return RedirectResponse("/admin/rss-feeds", status_code=303)
    doc = {
        "lang_id": int(form.get("lang_id") or 1),
        "feed_name": name[:500], "feed_url": url[:1000],
        "post_limit": min(max(int(form.get("post_limit") or 10), 1), 50),
        "category_id": int(form.get("category_id") or 0) or None,
        "image_saving_method": "url",
        "auto_update": 1 if form.get("auto_update") == "1" else 0,
        "author_username": user.get("u"),
        "author_membership": user.get("m"),
        "read_more_button": 1 if form.get("read_more_button") == "1" else 0,
        "read_more_button_text": (form.get("read_more_button_text") or "").strip() or None,
        "add_posts_as_draft": 1 if form.get("add_posts_as_draft") == "1" else 0,
        "generate_keywords_from_title": 1 if form.get("generate_keywords_from_title") == "1" else 0,
    }
    if fid:
        await db.kms_rss_feeds.update_one({"id": fid}, {"$set": doc})
    else:
        doc.update(id=await _next_id(db.kms_rss_feeds), created_at=_now_str(),
                   user_id=None, is_cron_updated=0)
        await db.kms_rss_feeds.insert_one(doc)
    return RedirectResponse("/admin/rss-feeds", status_code=303)


@admin_router.post("/admin/feed-delete")
async def feed_delete(request: Request, feed_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_rss_feeds.delete_one({"id": feed_id})
    return RedirectResponse("/admin/rss-feeds", status_code=303)


def _rss_items(xml_text: str) -> list:
    """Minimal RSS 2.0 / Atom item extraction — {title, link, summary, date}."""
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    items = []
    for it in root.iter("item"):  # RSS 2.0
        items.append({
            "title": (it.findtext("title") or "").strip(),
            "link": (it.findtext("link") or "").strip(),
            "summary": (it.findtext("description") or "").strip(),
        })
    if not items:  # Atom
        for it in root.findall(".//atom:entry", ns):
            link_el = it.find("atom:link", ns)
            items.append({
                "title": (it.findtext("atom:title", default="", namespaces=ns) or "").strip(),
                "link": (link_el.get("href") if link_el is not None else "") or "",
                "summary": (it.findtext("atom:summary", default="", namespaces=ns)
                            or it.findtext("atom:content", default="", namespaces=ns) or "").strip(),
            })
    return [i for i in items if i["title"]]


async def ingest_feed(feed: dict, author_name: str, author_membership) -> int:
    """Fetch + import a feed. Idempotent by post slug. Returns posts created."""
    import httpx
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(feed["feed_url"])
    items = _rss_items(resp.text)
    created = 0
    as_draft = feed.get("add_posts_as_draft") == 1
    for item in items[: feed.get("post_limit") or 10]:
        slug = _slugify(item["title"])
        if await db.kms_posts.find_one({"slug": slug}, {"_id": 1}):
            continue  # idempotent by slug
        content = f"<p>{item['summary']}</p>" if item["summary"] else ""
        if feed.get("read_more_button") == 1 and item["link"]:
            label = feed.get("read_more_button_text") or "Read More"
            content += f'<p><a href="{item["link"]}" target="_blank" rel="noopener">{label}</a></p>'
        await db.kms_posts.insert_one({
            "id": await _next_id(db.kms_posts),
            "lang_id": feed.get("lang_id") or 1, "title": item["title"][:500],
            "slug": slug, "summary": core.strip_tags(item["summary"], 200) or None,
            "keywords": (item["title"] if feed.get("generate_keywords_from_title") == 1 else None),
            "optional_url": item["link"] or None, "show_post_url": 1,
            "content": content, "category_id": feed.get("category_id"),
            "image_id": None, "image": None, "image_url": None,
            "image_description": None, "need_auth": 0, "visibility": 1,
            "post_type": "article", "status": 0 if as_draft else 1,
            "is_draft": 1 if as_draft else 0, "is_scheduled": 0,
            "created_at": _now_str(), "updated_at": _now_str(),
            "tags": [], "show_right_column": 1, "pageviews": 0,
            "author_username": author_name, "author_slug": _slugify(author_name or "admin"),
            "author_id_membership": author_membership, "user_id": None,
            "rss_feed_id": feed["id"]})
        created += 1
    await db.kms_rss_feeds.update_one(
        {"id": feed["id"]},
        {"$set": {"is_cron_updated": 1, "last_ingest_at": _now_str()}})
    return created


AUTO_INGEST_SECONDS = 3600


async def auto_ingest_due_feeds():
    """Lazy scheduled ingest (Phase 4c-2) — feeds w/ auto_update, ≥1h since last.
    Called opportunistically from admin page loads, same spirit as the lazy
    scheduled-post publisher. Failures are logged, never raised."""
    cutoff = datetime.now(timezone.utc)
    async for feed in db.kms_rss_feeds.find({"auto_update": 1}):
        last = feed.get("last_ingest_at") or "1970-01-01 00:00:00"
        try:
            last_dt = datetime.strptime(last, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            last_dt = datetime(1970, 1, 1, tzinfo=timezone.utc)
        if (cutoff - last_dt).total_seconds() < AUTO_INGEST_SECONDS:
            continue
        # claim first so concurrent workers / failures don't hot-loop the fetch
        claimed = await db.kms_rss_feeds.update_one(
            {"id": feed["id"], "last_ingest_at": feed.get("last_ingest_at")},
            {"$set": {"last_ingest_at": _now_str()}})
        if not claimed.modified_count and feed.get("last_ingest_at") is not None:
            continue
        try:
            n = await ingest_feed(feed, feed.get("author_username") or "admin",
                                  feed.get("author_membership"))
            if n:
                logger.info("kms auto-ingest: feed %s -> %d new posts", feed["id"], n)
        except Exception as e:
            logger.warning("kms auto-ingest failed for feed %s: %s", feed.get("id"), e)


@admin_router.post("/admin/feed-import")
async def feed_import(request: Request, feed_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    feed = await db.kms_rss_feeds.find_one({"id": feed_id})
    if not feed:
        return RedirectResponse("/admin/rss-feeds", status_code=303)
    try:
        created = await ingest_feed(feed, user.get("u"), user.get("m"))
    except Exception as e:
        logger.warning("kms rss import failed: %s", e)
        return RedirectResponse("/admin/rss-feeds?err=fetch", status_code=303)
    return RedirectResponse(f"/admin/rss-feeds?imported={created}", status_code=303)


# ═════════════════ NEWSLETTER BULK SEND (Phase 4b) ═══════════════════════════
async def _send_campaign(subject: str, body_html: str, host: str, log_id: int):
    """Background bulk send via the brand CMS SMTP settings."""
    from models.database import send_email_smtp
    settings = await db.settings.find_one({}) or {}
    sent = failed = 0
    async for sub in db.kms_subscribers.find({}):
        unsub = f'https://{host}/unsubscribe?token={sub.get("token", "")}'
        html = (body_html +
                f'<p style="font-size:12px;color:#888;margin-top:24px">'
                f'<a href="{unsub}">Unsubscribe</a></p>')
        try:
            await send_email_smtp(settings, sub["email"], sub["email"], subject, html)
            sent += 1
        except Exception as e:
            failed += 1
            logger.warning("kms newsletter send failed for %s: %s", sub.get("email"), e)
    await db.kms_newsletter_log.update_one(
        {"id": log_id}, {"$set": {"status": "done", "sent": sent, "failed": failed}})


@admin_router.post("/admin/newsletter-send")
async def newsletter_send(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    subject = (form.get("subject") or "").strip()
    body_html = form.get("body_html") or ""
    if not subject or not body_html.strip():
        return RedirectResponse("/admin/newsletter?err=empty", status_code=303)
    log_id = await _next_id(db.kms_newsletter_log)
    await db.kms_newsletter_log.insert_one({
        "id": log_id, "subject": subject, "status": "sending",
        "sent": 0, "failed": 0, "created_at": _now_str(),
        "recipients": await db.kms_subscribers.count_documents({})})
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    import asyncio
    asyncio.create_task(_send_campaign(subject, body_html, host, log_id))
    return RedirectResponse("/admin/newsletter?queued=1", status_code=303)


# ═══════════════════ BULK POST UPLOAD — CSV (Phase 4c-3) ═════════════════════
@admin_router.get("/admin/bulk-post-upload", response_class=HTMLResponse)
async def bulk_post_upload(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    return await _render_admin(request, user, "bulk_upload.html", active="bulk-post-upload",
                               title="Bulk Post Upload",
                               cats=[c for c in cats if not c.get("parent_id")],
                               created=request.query_params.get("created"),
                               skipped=request.query_params.get("skipped"),
                               err=request.query_params.get("err"))


@admin_router.post("/admin/bulk-post-upload")
async def bulk_post_upload_post(request: Request, file: UploadFile = File(...),
                                category_id: int = Form(0), as_draft: int = Form(1)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    import csv
    import io
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        return RedirectResponse("/admin/bulk-post-upload?err=size", status_code=303)
    try:
        text = raw.decode("utf-8-sig")
        rows = list(csv.DictReader(io.StringIO(text)))
    except Exception:
        return RedirectResponse("/admin/bulk-post-upload?err=parse", status_code=303)
    if not rows or "title" not in {k.strip().lower() for k in (rows[0] or {})}:
        return RedirectResponse("/admin/bulk-post-upload?err=columns", status_code=303)
    lang_id = (await core.default_lang()).get("id", 1)
    from kms.admin import _slugify as slugify, _unique_slug
    created = skipped = 0
    for row in rows[:500]:
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        title = row.get("title", "")[:500]
        if not title:
            skipped += 1
            continue
        slug = slugify(row.get("slug") or title)
        if await db.kms_posts.find_one({"slug": slug}, {"_id": 1}):
            skipped += 1
            continue  # idempotent by slug, same as RSS import
        content = row.get("content") or ""
        if content and "<" not in content:
            content = "<p>" + content.replace("\n\n", "</p><p>") + "</p>"
        tags_raw = [t.strip() for t in (row.get("tags") or "").split(",") if t.strip()]
        await db.kms_posts.insert_one({
            "id": await _next_id(db.kms_posts), "lang_id": lang_id,
            "title": title, "slug": slug,
            "summary": row.get("summary", "")[:500] or None,
            "keywords": row.get("keywords", "")[:500] or None,
            "optional_url": row.get("optional_url", "")[:1000] or None,
            "show_post_url": 1, "content": content,
            "category_id": category_id or None,
            "image_id": None, "image": None,
            "image_url": row.get("image_url", "")[:1000] or None,
            "image_description": None, "need_auth": 0, "visibility": 1,
            "post_type": "article", "status": 0 if as_draft else 1,
            "is_draft": 1 if as_draft else 0, "is_scheduled": 0,
            "created_at": _now_str(), "updated_at": _now_str(),
            "tags": [{"id": None, "tag": t, "slug": slugify(t)} for t in tags_raw],
            "show_right_column": 1, "pageviews": 0,
            "author_username": user.get("u"), "author_slug": slugify(user.get("u") or "admin"),
            "author_id_membership": user.get("m"), "user_id": None,
            "bulk_uploaded": 1})
        created += 1
    return RedirectResponse(
        f"/admin/bulk-post-upload?created={created}&skipped={skipped}", status_code=303)


# ═══════════ REWARD SYSTEM / EARNINGS / PAYOUTS (Phase 4c-3) ═════════════════
async def _author_stats() -> list:
    """Per-author pageviews / earned / paid / balance (reward_amount per 1k views)."""
    gs = (await core.kms_settings()).get("general") or {}
    try:
        rate = float(gs.get("reward_amount") or 0)
    except (TypeError, ValueError):
        rate = 0.0
    agg = db.kms_posts.aggregate([
        {"$group": {"_id": "$author_slug",
                    "name": {"$last": "$author_username"},
                    "membership": {"$last": "$author_id_membership"},
                    "views": {"$sum": {"$ifNull": ["$pageviews", 0]}},
                    "posts": {"$sum": 1}}}])
    paid_by_author = {}
    async for p in db.kms_payouts.find({}):
        key = p.get("author_slug") or ""
        paid_by_author[key] = paid_by_author.get(key, 0.0) + float(p.get("amount") or 0)
    stats = []
    async for a in agg:
        earned = round((a["views"] / 1000.0) * rate, 2)
        paid = round(paid_by_author.get(a["_id"] or "", 0.0), 2)
        stats.append({"slug": a["_id"], "name": a.get("name"),
                      "membership": a.get("membership"), "posts": a["posts"],
                      "views": a["views"], "earned": earned, "paid": paid,
                      "balance": round(earned - paid, 2)})
    stats.sort(key=lambda s: -s["views"])
    return stats


@admin_router.get("/admin/reward-system", response_class=HTMLResponse)
async def reward_system(request: Request):
    """Admin: full table + settings. Authors: their own row only (earnings view)."""
    user, r = await _admin_gate(request)  # authors allowed (own earnings)
    if r is not None:
        return r
    gs = (await core.kms_settings()).get("general") or {}
    stats = await _author_stats()
    if not user.get("a"):
        from kms.admin import _author_slug
        me = _author_slug(user)
        stats = [s for s in stats if s["slug"] == me]
    payouts = [p async for p in db.kms_payouts.find({}).sort("id", -1).limit(50)]
    if not user.get("a"):
        payouts = [p for p in payouts if p.get("author_slug") == _author_slug(user)]
    return await _render_admin(request, user, "rewards.html", active="reward-system",
                               title="Reward System" if user.get("a") else "My Earnings",
                               stats=stats, payouts=payouts,
                               reward_on=gs.get("reward_system_status") == 1,
                               rate=gs.get("reward_amount") or 0,
                               currency=gs.get("currency_symbol") or "$",
                               saved=bool(request.query_params.get("saved")))


@admin_router.post("/admin/reward-settings-save")
async def reward_settings_save(request: Request, reward_system_status: str = Form("0"),
                               reward_amount: str = Form("0")):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    try:
        amount = max(0.0, float(reward_amount or 0))
    except ValueError:
        amount = 0.0
    await db.kms_settings.update_one({"key": "kms"}, {"$set": {
        "general.reward_system_status": 1 if reward_system_status == "1" else 0,
        "general.reward_amount": amount}})
    await core.kms_settings(force=True)
    return RedirectResponse("/admin/reward-system?saved=1", status_code=303)


@admin_router.post("/admin/add-payout")
async def add_payout(request: Request, author_slug: str = Form(...),
                     amount: str = Form(...), note: str = Form("")):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    try:
        amt = round(float(amount), 2)
    except ValueError:
        return RedirectResponse("/admin/reward-system", status_code=303)
    if amt > 0:
        await db.kms_payouts.insert_one({
            "id": await _next_id(db.kms_payouts), "author_slug": author_slug.strip(),
            "amount": amt, "note": note.strip()[:500] or None,
            "paid_by": user.get("u"), "created_at": _now_str()})
    return RedirectResponse("/admin/reward-system", status_code=303)


@admin_router.post("/admin/payout-delete")
async def payout_delete(request: Request, payout_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_payouts.delete_one({"id": payout_id})
    return RedirectResponse("/admin/reward-system", status_code=303)


# ═══════════════ MEDIA FILE UPLOAD — audio/video (Phase 4c-3) ════════════════
MEDIA_EXTS = {".mp3", ".wav", ".ogg", ".m4a", ".mp4", ".webm"}


@admin_router.post("/admin/file/upload-media")
async def upload_media(request: Request, file: UploadFile = File(...)):
    user, r = await _admin_gate(request)
    if r is not None:
        return JSONResponse({"ok": False}, status_code=403)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in MEDIA_EXTS:
        return JSONResponse({"ok": False, "error": "Allowed: mp3, wav, ogg, m4a, mp4, webm"},
                            status_code=400)
    raw = await file.read()
    if len(raw) > 50 * 1024 * 1024:
        return JSONResponse({"ok": False, "error": "File too large (max 50MB)"},
                            status_code=400)
    folder = datetime.now(timezone.utc).strftime("%Y%m")
    uid = uuid.uuid4().hex[:13]
    rel = f"uploads/files/{folder}/media_{uid}{ext}"
    gs = (await core.kms_settings()).get("general") or {}
    mime = {"mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
            "m4a": "audio/mp4", "mp4": "video/mp4", "webm": "video/webm"}[ext[1:]]
    url = core.s3_put(gs, rel, raw, mime)
    if not url:
        (UPLOADS_DIR / "files" / folder).mkdir(parents=True, exist_ok=True)
        (UPLOADS_DIR / "files" / folder / f"media_{uid}{ext}").write_bytes(raw)
        url = "/" + rel
    await db.kms_files.insert_one({
        "id": await _next_id(db.kms_files), "file_name": file.filename,
        "path": rel, "url": url, "storage": "s3" if url.startswith("http") else "local",
        "user_id": None, "created_at": _now_str()})
    return JSONResponse({"ok": True, "url": url})


# ═══════════════ ADD LANGUAGE (Phase 4c-3 — multi-language admin) ════════════
@admin_router.post("/admin/language-add")
async def language_add(request: Request, name: str = Form(...), short_form: str = Form(...),
                       language_code: str = Form(""), text_direction: str = Form("ltr")):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    name, short = name.strip()[:100], short_form.strip().lower()[:5]
    if not name or not short or await db.kms_languages.find_one({"short_form": short}):
        return RedirectResponse("/admin/language-settings", status_code=303)
    new_id = await _next_id(db.kms_languages)
    order = await db.kms_languages.count_documents({}) + 1
    await db.kms_languages.insert_one({
        "id": new_id, "name": name, "short_form": short,
        "language_code": (language_code or f"{short}-{short.upper()}").strip()[:10],
        "text_direction": "rtl" if text_direction == "rtl" else "ltr",
        "text_editor_lang": short, "status": 0, "language_order": order})
    # seed the trans() dict by cloning the default language's labels
    base_lang = (await core.default_lang()).get("id", 1)
    batch, next_tid = [], await _next_id(db.kms_translations)
    async for t in db.kms_translations.find({"lang_id": base_lang}):
        batch.append({"id": next_tid, "lang_id": new_id,
                      "label": t.get("label"), "translation": t.get("translation")})
        next_tid += 1
    if batch:
        await db.kms_translations.insert_many(batch)
    await core.kms_settings(force=True)
    core._cache["trans"] = {}
    return RedirectResponse("/admin/language-settings", status_code=303)


# ═════════════ KMS-NATIVE REPLICATION — sender (Phase 5) ═════════════════════
@admin_router.post("/admin/kms-replicate")
async def kms_replicate(request: Request, post_id: int = Form(...)):
    """Hub → target replication, Mongo→Mongo (replaces the MySQL writer at
    cutover). Targets in settings.kms_native_replication_targets:
    [{name, url, key}] — url is the target insights base."""
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        return RedirectResponse("/admin/posts", status_code=303)
    # targets + keys live in kms_config, NOT settings (leak-proof, D-2026-48 convention)
    cfg = await db.kms_config.find_one({"key": "replication"}) or {}
    targets = cfg.get("targets") or []
    if not targets:
        return RedirectResponse("/admin/posts?repl=notargets", status_code=303)
    # bundle referenced image files (base64) so the target can serve them 1:1
    import base64
    files = {}
    img = post.get("image") or {}
    for k in ("image_big", "image_default", "image_slider", "image_mid", "image_small"):
        p = (img.get(k) or "").strip()
        if p and not p.startswith("http"):
            try:
                target_f = (UPLOADS_DIR / Path(p).relative_to("uploads")).resolve()
                if str(target_f).startswith(str(UPLOADS_DIR.resolve())) and target_f.is_file():
                    files[p] = base64.b64encode(target_f.read_bytes()).decode()
            except Exception:
                pass
    import httpx
    ok_targets, failed = [], []
    payload = {"post": post, "files": files}
    for t in targets:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    t["url"].rstrip("/") + "/internal/kms-native-replicate",
                    json=payload, headers={"X-Sync-Key": t.get("key") or ""})
            (ok_targets if resp.status_code == 200 else failed).append(t.get("name") or t["url"])
        except Exception as e:
            logger.warning("kms replicate to %s failed: %s", t.get("url"), e)
            failed.append(t.get("name") or t.get("url"))
    await db.kms_replications.update_one(
        {"slug": post.get("slug")},
        {"$set": {"targets": ok_targets, "failed": failed, "updated_at": _now_str()}},
        upsert=True)
    return RedirectResponse(
        f"/admin/posts?repl={'ok' if not failed else 'partial'}", status_code=303)


# ═════════════════════ AI WRITER → Claude (Phase 4a) ═════════════════════════
AI_SYSTEM = ("You are a writing assistant for a news/magazine site. Write the "
             "requested article content as clean HTML using only <p>, <h2>, <h3>, "
             "<ul>, <ol>, <li>, <strong>, <em> and <a> tags. No markdown, no "
             "<html>/<body> wrapper, no code fences.")


@admin_router.post("/admin/ai-writer")
async def ai_writer(request: Request):
    """AI Writer button in the post editor — Claude API, Prompt Manager key pattern."""
    user, r = await _admin_gate(request)  # admins AND authors (post editor tool)
    if r is not None:
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        body = {}
    prompt = (body.get("prompt") or "").strip()
    if not prompt:
        return JSONResponse({"ok": False, "error": "Empty prompt"}, status_code=400)
    s = await db.settings.find_one({}, {"claude_api_key": 1, "claude_model": 1}) or {}
    api_key = s.get("claude_api_key")
    if not api_key:
        return JSONResponse({"ok": False,
                             "error": "Claude API key is not configured (CMS → Settings → AI)"})
    import httpx
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01",
                         "content-type": "application/json"},
                json={"model": s.get("claude_model") or "claude-opus-4-8",
                      "max_tokens": 3000, "system": AI_SYSTEM,
                      "messages": [{"role": "user", "content": prompt}]})
        if resp.status_code != 200:
            detail = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            return JSONResponse({"ok": False, "error": detail})
        blocks = resp.json().get("content") or []
        text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
        if not text:
            return JSONResponse({"ok": False, "error": "Empty response from Claude"})
        return JSONResponse({"ok": True, "html": text})
    except Exception as e:  # network/timeouts — surface a readable error
        logger.warning("kms ai-writer failed: %s", e)
        return JSONResponse({"ok": False, "error": f"Request failed: {e}"})


TRANS_PER_PAGE = 50


@admin_router.get("/admin/edit-translations/{lang_id}", response_class=HTMLResponse)
async def edit_translations(request: Request, lang_id: int):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang = await db.kms_languages.find_one({"id": lang_id})
    if not lang:
        return RedirectResponse("/admin/language-settings", status_code=303)
    q = (request.query_params.get("q") or "").strip()
    filt = {"lang_id": lang_id}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        filt = {"lang_id": lang_id, "$or": [{"label": rx}, {"translation": rx}]}
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        page = 1
    total = await db.kms_translations.count_documents(filt)
    pages = max(1, math.ceil(total / TRANS_PER_PAGE))
    page = min(page, pages)
    rows = [t async for t in db.kms_translations.find(filt).sort("label", 1)
            .skip((page - 1) * TRANS_PER_PAGE).limit(TRANS_PER_PAGE)]
    return await _render_admin(request, user, "translations.html",
                               active="language-settings",
                               title=f"Translations — {lang.get('name')}",
                               lang=lang, rows=rows, q=q,
                               saved=bool(request.query_params.get("saved")),
                               pager={"page": page, "pages": pages, "total": total})


@admin_router.post("/admin/translations-save")
async def translations_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    lang_id = int(form.get("lang_id") or 0)
    changed = 0
    for key, val in form.multi_items():
        if key.startswith("t_"):
            tid = int(key[2:])
            res = await db.kms_translations.update_one(
                {"id": tid, "lang_id": lang_id, "translation": {"$ne": val}},
                {"$set": {"translation": val}})
            changed += res.modified_count
    if changed:
        core._cache["trans"] = {}  # bust the trans() cache
    back = form.get("back") or f"/admin/edit-translations/{lang_id}"
    sep = "&" if "?" in back else "?"
    return RedirectResponse(f"{back}{sep}saved=1", status_code=303)
