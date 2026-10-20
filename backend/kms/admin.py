"""KMS admin panel — Phase 2 core: posts (article) CRUD + TinyMCE + file manager,
categories, tags, slider/featured/breaking/recommended, pending/scheduled/drafts.

Access: CMS admin -> Super Admin (everything); `role_author` -> Author (add/edit
OWN posts, file manager). Everyone else: no admin panel (403 -> login).
Post status convention (mirrors Varient): 1 = published, 0 = draft/pending;
is_scheduled = 1 until the due date passes (flipped by a lazy publisher check).
"""
import json
import logging
import math
import re
import time
import unicodedata
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response

from kms import core
from kms import iireport
# NOTE: `kms.ingest` is imported LAZILY inside the save handlers, not here — ingest.py
# imports from kms.admin at module load, so a top-level import here is circular.
from kms.core import UPLOADS_DIR, db, current_user, kms_enabled, login_redirect

logger = logging.getLogger(__name__)
admin_router = APIRouter()

IMG_SIZES = {  # variant -> (w, h) — mirrors the live install's variant scheme
    "image_big": (870, 580),
    "image_default": (550, 365),
    "image_slider": (400, 440),
    "image_mid": (240, 160),
    "image_small": (110, 75),
}
FILEMAN_PAGE = 24


# ── guards ───────────────────────────────────────────────────────────────────
async def _admin_gate(request: Request, admin_only: bool = False):
    """Returns (user, None) or (None, short-circuit response)."""
    if not await kms_enabled():
        return None, HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return None, login_redirect()
    if not (user.get("a") or (not admin_only and user.get("au"))):
        return None, RedirectResponse("/", status_code=303)
    return user, None


async def _next_id(coll) -> int:
    doc = await coll.find_one(sort=[("id", -1)])
    return int(doc["id"]) + 1 if doc and doc.get("id") is not None else 1


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text[:190] or uuid.uuid4().hex[:12]


def _coord(raw, limit: float):
    try:
        v = float(str(raw or "").strip().replace(",", "."))
    except ValueError:
        return None
    return round(v, 6) if -limit <= v <= limit else None


def _place_from_form(form) -> dict | None:
    """Post place for the gem2i Travel themes: {city, country, lat, lng}; None when empty."""
    place = {"city": (form.get("place_city") or "").strip()[:120] or None,
             "country": (form.get("place_country") or "").strip()[:120] or None,
             "lat": _coord(form.get("place_lat"), 90),
             "lng": _coord(form.get("place_lng"), 180)}
    if place["lat"] is None or place["lng"] is None:
        place["lat"] = place["lng"] = None
    return place if any(v is not None for v in place.values()) else None


async def _unique_slug(base: str, exclude_id=None) -> str:
    slug, n = base, 2
    while True:
        q = {"slug": slug}
        if exclude_id is not None:
            q["id"] = {"$ne": exclude_id}
        if not await db.kms_posts.find_one(q, {"_id": 1}):
            return slug
        slug = f"{base}-{n}"
        n += 1


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


async def publish_due_scheduled():
    """Lazy scheduled-post publisher — flip due scheduled posts to live.
    New model: `scheduled_at` (the explicit "Scheduled Publication" calendar
    field) is the due time and BECOMES the publication date (`created_at`) at
    fire time. Legacy scheduled posts without the field keep the old
    created_at-as-due-time behavior."""
    now = _now_str()
    due = [p async for p in db.kms_posts.find(
        {"is_scheduled": 1, "$or": [
            {"scheduled_at": {"$type": "string", "$lte": now}},
            {"scheduled_at": {"$in": [None]}, "created_at": {"$lte": now}},
        ]})]
    if not due:
        return
    from kms import news_bridge
    for p in due:
        sets = {"is_scheduled": 0}
        if p.get("scheduled_at"):
            sets["created_at"] = p["scheduled_at"]  # publication date = actual publish moment
        await db.kms_posts.update_one({"id": p["id"]}, {"$set": sets})
        p.update(sets)
        await news_bridge.sync_post(p)


async def _render_admin(request: Request, user: dict, template: str, **ctx) -> HTMLResponse:
    s = await core.kms_settings()
    lang = await core.default_lang()
    tmap = await core.trans_map(lang.get("id", 1))
    gs = s.get("general") or {}
    ls = (s.get("by_lang") or {}).get(str(lang.get("id", 1))) or {}
    base_ctx = {
        "request": request, "user": user, "gs": gs, "ls": ls,
        "app_name": ls.get("application_name") or "Insights",
        "site_title": ls.get("site_title") or "Insights",
        # logo / logo_footer / logo_email / favicon — absorbed from the CMS
        **(await core.brand_logos()),
        "is_admin": bool(user.get("a")),
        "active": ctx.pop("active", ""),
    }
    # Admin chrome colours + sidebar logo, pulled live from the central CMS
    # (Settings -> Colors -> "CMS Admin Panel" = theme_colors.admin; Settings ->
    # General -> "Logo On #1" = logo_on_1, resolved by brand_logos() as logo_footer).
    cms = await core.cms_settings()
    base_ctx["admin_colors"] = (cms.get("theme_colors") or {}).get("admin") or {}
    base_ctx["sidebar_logo"] = base_ctx.get("logo_footer") or base_ctx.get("logo")
    base_ctx["trans"] = lambda k: tmap.get(k) or k.replace("_", " ").title()
    base_ctx.update(ctx)
    html = core._env.get_template(f"admin/{template}").render(**base_ctx)
    return HTMLResponse(html)


# ── dashboard ────────────────────────────────────────────────────────────────
@admin_router.get("/admin", response_class=HTMLResponse)
@admin_router.get("/admin/", response_class=HTMLResponse)
async def dashboard(request: Request):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    await publish_due_scheduled()
    from kms.admin_site import auto_ingest_due_feeds  # lazy: admin_site imports admin
    await auto_ingest_due_feeds()
    # s150: an author sees ONLY their own posts — the dashboard used to list the
    # latest posts of everyone (admin included) and global counters.
    own = {} if user.get("a") else {"author_slug": _author_slug(user)}
    counts = {
        "posts": await db.kms_posts.count_documents({"status": 1, **own}),
        "drafts": await db.kms_posts.count_documents({"status": 0, **own}),
        "scheduled": await db.kms_posts.count_documents({"is_scheduled": 1, **own}),
        "categories": await db.kms_categories.count_documents({}),
        "tags": await db.kms_tags.count_documents({}),
        "images": await db.kms_images.count_documents({}),
        "members": await db.members.count_documents({}),
        "pageviews": (await db.kms_posts.aggregate(
            [{"$group": {"_id": None, "t": {"$sum": "$pageviews"}}}]).to_list(1) or [{"t": 0}])[0].get("t", 0),
    }
    latest = [p async for p in db.kms_posts.find(own).sort("created_at", -1).limit(8)]
    return await _render_admin(request, user, "dashboard.html", active="dashboard",
                               title="Admin", counts=counts, latest=latest)


# ── posts lists ──────────────────────────────────────────────────────────────
async def _posts_list(request: Request, *, title: str, active: str, filt: dict,
                      selection_type: str | None = None):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    await publish_due_scheduled()
    # A selection page (Slider / Featured / Breaking / Recommended) lists exactly
    # the posts that carry that selection — not the whole library with a checkbox
    # column. Posts are ADDED to a slot from the post editor ("Add to Slider" and
    # friends); the checkbox here is what takes them back out.
    # The status filter is dropped on purpose: a selected post that is not
    # published would otherwise be invisible here AND impossible to un-select,
    # while still occupying a slot in the stored selection.
    sel_ids = set()
    if selection_type:
        sel_ids = {s["post_id"] async for s in
                   db.kms_selections.find({"selection_type": selection_type})}
        filt = {"id": {"$in": sorted(sel_ids)}}
    if not user.get("a"):  # authors see only their own posts
        filt = {**filt, "author_slug": _author_slug(user)}
    q = (request.query_params.get("q") or "").strip()
    if q:
        filt = {**filt, "title": {"$regex": re.escape(q), "$options": "i"}}
    cat = (request.query_params.get("category") or "").strip()
    if cat.isdigit():
        filt = {**filt, "category_id": int(cat)}
    tier_f = (request.query_params.get("tier") or "").strip()
    if tier_f in ("public", "registered", "mastermind"):
        # docs without a tier field count as public (legacy default)
        filt = {**filt, "tier": {"$in": [tier_f, None]} if tier_f == "public" else tier_f}
    per = 15
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        page = 1
    total = await db.kms_posts.count_documents(filt)
    pages = max(1, math.ceil(total / per))
    page = min(page, pages)
    # Default order = the Date column, newest first; id breaks ties so posts
    # sharing a timestamp (batch seeds/imports) still list newest-added first.
    posts = [p async for p in db.kms_posts.find(filt)
             .sort([("created_at", -1), ("id", -1)])
             .skip((page - 1) * per).limit(per)]
    # Show the baked category banner (default_image + watermark/logo) as the admin
    # thumbnail for posts that have no image of their own — same fallback the public
    # surfaces use, so Portfolio & Rankings / Founder Stories / Stock 360 posts are
    # not blank in the list (Morning Brief / Weekly already carry an own image).
    await core.apply_default_images(posts)
    cats = await core.categories((await core.default_lang()).get("id", 1))
    return await _render_admin(
        request, user, "posts.html", active=active, title=title, posts=posts,
        cats=cats, q=q, cat_filter=cat, tier_filter=tier_f,
        selection_type=selection_type, sel_ids=sel_ids,
        pager={"page": page, "pages": pages, "total": total})


def _author_slug(user: dict) -> str:
    return _slugify(user.get("u") or user.get("e") or "author")


@admin_router.get("/admin/posts", response_class=HTMLResponse)
async def admin_posts(request: Request):
    # Published posts only (for authors too: their in-review posts live in
    # «Pending Posts», drafts/declined in «Drafts» — Anthony s150).
    return await _posts_list(request, title="Posts", active="posts",
                             filt={"status": 1, "is_scheduled": {"$ne": 1}})


@admin_router.get("/admin/pending-posts", response_class=HTMLResponse)
async def pending_posts(request: Request):
    return await _posts_list(request, title="Pending Posts", active="pending-posts",
                             filt={"status": 0, "is_draft": {"$ne": 1}})


@admin_router.get("/admin/scheduled-posts", response_class=HTMLResponse)
async def scheduled_posts(request: Request):
    return await _posts_list(request, title="Scheduled Posts", active="scheduled-posts",
                             filt={"is_scheduled": 1})


@admin_router.get("/admin/drafts", response_class=HTMLResponse)
async def drafts(request: Request):
    return await _posts_list(request, title="Drafts", active="drafts",
                             filt={"status": 0, "is_draft": 1})


@admin_router.get("/admin/slider-posts", response_class=HTMLResponse)
async def slider_posts(request: Request):
    return await _posts_list(request, title="Slider Posts", active="slider-posts",
                             filt={"status": 1}, selection_type="slider")


@admin_router.get("/admin/featured-posts", response_class=HTMLResponse)
async def featured_posts(request: Request):
    return await _posts_list(request, title="Featured Posts", active="featured-posts",
                             filt={"status": 1}, selection_type="featured")


@admin_router.get("/admin/breaking-news", response_class=HTMLResponse)
async def breaking_news(request: Request):
    return await _posts_list(request, title="Breaking News", active="breaking-news",
                             filt={"status": 1}, selection_type="breaking")


@admin_router.get("/admin/recommended-posts", response_class=HTMLResponse)
async def recommended_posts(request: Request):
    return await _posts_list(request, title="Recommended Posts", active="recommended-posts",
                             filt={"status": 1}, selection_type="recommended")


@admin_router.post("/admin/post-selection")
async def toggle_selection(request: Request, post_id: int = Form(...), sel: str = Form(...),
                           on: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return JSONResponse({"ok": False}, status_code=403)
    if sel not in ("slider", "featured", "breaking", "recommended"):
        return JSONResponse({"ok": False}, status_code=400)
    if on:
        exists = await db.kms_selections.find_one({"post_id": post_id, "selection_type": sel})
        if not exists:
            await db.kms_selections.insert_one(
                {"id": await _next_id(db.kms_selections), "post_id": post_id, "selection_type": sel})
    else:
        await db.kms_selections.delete_many({"post_id": post_id, "selection_type": sel})
    return JSONResponse({"ok": True})


# ── add / edit post ──────────────────────────────────────────────────────────
# Built post types (Phases 4c-1 + 4c-2).
POST_TYPES = {"article", "video", "audio", "gallery", "sorted_list",
              "table_of_contents", "trivia_quiz", "personality_quiz", "poll", "recipe"}
POST_TYPE_LABELS = {
    "article": "Article", "video": "Video", "audio": "Audio", "gallery": "Gallery",
    "sorted_list": "Sorted List", "table_of_contents": "Table of Contents",
    "trivia_quiz": "Trivia Quiz", "personality_quiz": "Personality Quiz",
    "poll": "Poll", "recipe": "Recipe"}
ITEM_POST_TYPES = {"gallery", "sorted_list", "table_of_contents"}
QUIZ_POST_TYPES = {"trivia_quiz", "personality_quiz", "poll"}


async def _post_form(request: Request, post=None, ptype: str = "article"):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    if post:
        ptype = post.get("post_type") or "article"
    if ptype not in POST_TYPES:
        ptype = "article"
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    sels = set()
    if post:
        sels = {s["selection_type"] async for s in db.kms_selections.find({"post_id": post["id"]})}
    # resolve which parent/sub the stored category_id maps to
    sel_parent, sel_sub = None, None
    if post and post.get("category_id"):
        cur = next((c for c in cats if c["id"] == post["category_id"]), None)
        if cur and cur.get("parent_id"):
            sel_parent, sel_sub = cur["parent_id"], cur["id"]
        elif cur:
            sel_parent = cur["id"]
    type_label = POST_TYPE_LABELS.get(ptype, "Article")
    pd = (post or {}).get("post_data") or {}
    if ptype == "audio":
        payload = pd.get("audios", [])
    elif ptype in QUIZ_POST_TYPES:
        payload = pd.get("quiz", {"questions": [], "results": []})
    elif ptype == "recipe":
        payload = pd.get("recipe", {})
    else:
        payload = pd.get("items", [])
    # Book + Company link — only the CURRENTLY-linked labels are needed for the
    # form (the search-as-you-type picker fetches options on demand via
    # /admin/search-books and /admin/search-companies, mirroring the CMS).
    def _loc(v):
        return (next((x for x in v.values() if x), "") if isinstance(v, dict) else (v or ""))
    # Multi-select: build [{id, label}] lists for the currently-linked books and
    # companies (fall back to the legacy singular fields for older posts).
    p = post or {}
    book_ids = list(p.get("related_book_ids") or [])
    if not book_ids and p.get("related_book_id"):
        book_ids = [p["related_book_id"]]
    related_books = []
    for bid in book_ids:
        b = await db.books.find_one({"id": bid}, {"_id": 0, "id": 1, "title": 1})
        if b:
            related_books.append({"id": b["id"], "label": _loc(b.get("title"))})
    company_ids = list(p.get("related_company_ids") or [])
    if not company_ids and p.get("related_company_id"):
        company_ids = [p["related_company_id"]]
    related_companies = []
    for cid in company_ids:
        co = await db.companies_directory.find_one({"id": cid}, {"_id": 0, "id": 1, "name": 1, "symbol": 1})
        if co:
            related_companies.append({"id": co["id"], "label": co["name"] + (f" ({co['symbol']})" if co.get("symbol") else "")})
    return await _render_admin(
        request, user, "post_form.html",
        active="add-post" if post is None else "posts",
        title=(f"Add {type_label} Post" if post is None else f"Update {type_label} Post"),
        post=post, ptype=ptype, is_item_type=ptype in ITEM_POST_TYPES,
        is_quiz_type=ptype in QUIZ_POST_TYPES,
        type_payload=json.dumps(payload),
        cats=[c for c in cats if not c.get("parent_id")],
        subcats=[c for c in cats if c.get("parent_id")], sels=sels,
        sel_parent=sel_parent, sel_sub=sel_sub,
        related_books=related_books, related_companies=related_companies)


@admin_router.get("/admin/search-books")
async def search_books(request: Request, q: str = ""):
    """Search-as-you-type for the post editor's Related Book picker."""
    user, r = await _admin_gate(request)
    if r is not None:
        return JSONResponse([], status_code=401)
    def _loc(v):
        return (next((x for x in v.values() if x), "") if isinstance(v, dict) else (v or ""))
    rows = await db.books.find({}, {"_id": 0, "id": 1, "title": 1}).to_list(1000)
    items = [{"id": b["id"], "label": _loc(b.get("title"))} for b in rows if b.get("id")]
    ql = (q or "").strip().lower()
    if ql:
        items = [b for b in items if ql in (b["label"] or "").lower()]
    items.sort(key=lambda x: (x["label"] or "").lower())
    return JSONResponse(items[:20])


@admin_router.get("/admin/search-companies")
async def search_companies(request: Request, q: str = ""):
    """Search-as-you-type for the post editor's Related Company picker."""
    user, r = await _admin_gate(request)
    if r is not None:
        return JSONResponse([], status_code=401)
    filt = {"status": "active"}
    qs = (q or "").strip()
    if qs:
        rx = {"$regex": re.escape(qs), "$options": "i"}
        filt["$or"] = [{"name": rx}, {"symbol": rx}]
    rows = await db.companies_directory.find(
        filt, {"_id": 0, "id": 1, "name": 1, "symbol": 1}
    ).sort("order_name", 1).limit(20).to_list(20)
    return JSONResponse([
        {"id": c["id"], "label": c.get("name") + (f" ({c['symbol']})" if c.get("symbol") else "")}
        for c in rows])


@admin_router.get("/admin/post-format", response_class=HTMLResponse)
async def post_format(request: Request):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    gs = (await core.kms_settings()).get("general") or {}
    formats = []
    for key in ("article", "video", "audio", "gallery", "sorted_list",
                "table_of_contents", "trivia_quiz", "personality_quiz", "poll", "recipe"):
        flag = gs.get(f"post_format_{key}")
        formats.append({"key": key, "label": POST_TYPE_LABELS[key],
                        "enabled": key == "article" or flag == 1 or flag is None})
    return await _render_admin(request, user, "post_format.html", active="add-post",
                               title="Choose a Post Format", formats=formats, coming=[])


@admin_router.get("/admin/add-post", response_class=HTMLResponse)
async def add_post(request: Request):
    ptype = request.query_params.get("type") or "article"
    return await _post_form(request, None, ptype=ptype)


@admin_router.get("/admin/edit-post/{post_id}", response_class=HTMLResponse)
async def edit_post(request: Request, post_id: int):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return RedirectResponse("/admin/posts", status_code=303)
    if not user.get("a") and post.get("author_slug") != _author_slug(user):
        return RedirectResponse("/admin/posts", status_code=303)
    return await _post_form(request, post)


# ── article reading-comprehension quiz editor (Stage 2) ──────────────────────
async def _quiz_gate(request: Request, post_id: int):
    """Admin gate + post ownership (same rule as edit-post). Returns
    (user, post, redirect|None)."""
    user, r = await _admin_gate(request)
    if r is not None:
        return None, None, r
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return None, None, RedirectResponse("/admin/posts", status_code=303)
    if not user.get("a") and post.get("author_slug") != _author_slug(user):
        return None, None, RedirectResponse("/admin/posts", status_code=303)
    return user, post, None


@admin_router.get("/admin/quiz/{post_id}", response_class=HTMLResponse)
async def quiz_editor(request: Request, post_id: int):
    user, post, r = await _quiz_gate(request, post_id)
    if r is not None:
        return r
    quiz = await db.kms_post_quizzes.find_one({"post_id": post_id}, {"_id": 0})
    return await _render_admin(
        request, user, "quiz_form.html", active="posts", title="Reading Quiz",
        post=post, has_quiz=bool(quiz),
        quiz_active=(0 if quiz and quiz.get("active") == 0 else 1),
        quiz_json=json.dumps((quiz or {}).get("questions") or []))


@admin_router.post("/admin/quiz/{post_id}/save")
async def quiz_editor_save(request: Request, post_id: int):
    user, post, r = await _quiz_gate(request, post_id)
    if r is not None:
        return r
    form = await request.form()
    if (form.get("action") or "").strip() == "delete":
        await db.kms_post_quizzes.delete_one({"post_id": post_id})
        return RedirectResponse(f"/admin/quiz/{post_id}?deleted=1", status_code=303)
    try:
        raw = json.loads(form.get("questions_json") or "[]")
    except Exception:
        raw = []
    questions = []
    for q in (raw if isinstance(raw, list) else []):
        text = str((q or {}).get("q") or "").strip()
        opts = [str(o or "").strip() for o in ((q or {}).get("options") or [])]
        opts = [o for o in opts if o]
        try:
            correct = int(q.get("correct"))
        except (TypeError, ValueError):
            correct = 0
        if not text or len(opts) < 2:
            continue
        if correct < 0 or correct >= len(opts):
            correct = 0
        questions.append({"q": text, "options": opts, "correct": correct,
                          "explanation": str((q or {}).get("explanation") or "").strip()})
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    existing = await db.kms_post_quizzes.find_one({"post_id": post_id}, {"created_at": 1})
    doc = {"post_id": post_id, "slug": post.get("slug"),
           "active": 1 if form.get("active") else 0,
           "title": "Reading comprehension", "questions": questions,
           "updated_at": now, "created_at": (existing or {}).get("created_at") or now}
    await db.kms_post_quizzes.replace_one({"post_id": post_id}, doc, upsert=True)
    return RedirectResponse(f"/admin/quiz/{post_id}?saved=1", status_code=303)


# ── quiz analytics (Stage 2 — attempts/results panel) ────────────────────────
def _pct(n, d):
    return round((n / d) * 100) if d else 0


@admin_router.get("/admin/quiz-analytics", response_class=HTMLResponse)
async def quiz_analytics(request: Request):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    attempts = [a async for a in db.kms_quiz_attempts.find(
        {}, {"_id": 0, "post_id": 1, "member_id": 1, "score": 1, "total": 1,
             "first_attempt": 1, "created_at": 1})]
    agg = {}
    for a in attempts:
        pid = a.get("post_id")
        g = agg.setdefault(pid, {"post_id": pid, "attempts": 0, "members": set(),
                                 "score_sum": 0, "total": a.get("total") or 0,
                                 "first": 0, "passes": 0, "last": ""})
        g["attempts"] += 1
        g["members"].add(a.get("member_id"))
        g["score_sum"] += a.get("score") or 0
        if a.get("total"):
            g["total"] = a["total"]
        if a.get("first_attempt"):
            g["first"] += 1
        if (a.get("total") or 0) > 0 and (a.get("score") or 0) / a["total"] >= 0.7:
            g["passes"] += 1
        if (a.get("created_at") or "") > g["last"]:
            g["last"] = a.get("created_at") or ""
    # titles for the posts that have attempts + posts that have a quiz but no attempt yet
    quiz_pids = {q["post_id"] async for q in db.kms_post_quizzes.find({}, {"post_id": 1})}
    all_pids = set(agg) | quiz_pids
    if not user.get("a"):  # s150: an author only sees the quizzes of their OWN posts
        own = {d["id"] async for d in db.kms_posts.find(
            {"id": {"$in": list(all_pids)}, "author_slug": _author_slug(user)}, {"id": 1})}
        all_pids &= own
    titles = {p["id"]: p.get("title") for p in
              [d async for d in db.kms_posts.find({"id": {"$in": list(all_pids)}}, {"id": 1, "title": 1})]}
    rows = []
    for pid in all_pids:
        g = agg.get(pid)
        if g:
            rows.append({"post_id": pid, "title": titles.get(pid) or f"Post {pid}",
                         "attempts": g["attempts"], "members": len(g["members"]),
                         "avg_score": round(g["score_sum"] / g["attempts"], 1) if g["attempts"] else 0,
                         "total": g["total"], "avg_pct": _pct(g["score_sum"], g["attempts"] * g["total"]) if g["total"] else 0,
                         "pass_pct": _pct(g["passes"], g["attempts"]), "first": g["first"], "last": g["last"]})
        else:
            rows.append({"post_id": pid, "title": titles.get(pid) or f"Post {pid}",
                         "attempts": 0, "members": 0, "avg_score": 0, "total": 0,
                         "avg_pct": 0, "pass_pct": 0, "first": 0, "last": ""})
    rows.sort(key=lambda x: (-x["attempts"], x["title"]))
    return await _render_admin(request, user, "quiz_analytics.html", active="quiz-analytics",
                               title="Quiz Analytics", rows=rows,
                               total_attempts=len(attempts))


@admin_router.get("/admin/quiz-analytics/{post_id}", response_class=HTMLResponse)
async def quiz_analytics_detail(request: Request, post_id: int):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id}, {"id": 1, "title": 1, "slug": 1, "status": 1,
                                                         "author_slug": 1})
    if not user.get("a") and (post or {}).get("author_slug") != _author_slug(user):
        return RedirectResponse("/admin/quiz-analytics", status_code=303)  # s150: own posts only
    quiz = await db.kms_post_quizzes.find_one({"post_id": post_id}, {"_id": 0})
    attempts = [a async for a in db.kms_quiz_attempts.find(
        {"post_id": post_id}, {"_id": 0}).sort("id", -1)]
    questions = (quiz or {}).get("questions") or []
    total_q = len(questions)
    # per-question correct rate (using each attempt's stored picks vs current key)
    q_stats = []
    for qi, q in enumerate(questions):
        correct = int(q.get("correct", -1))
        got = 0; answered = 0
        for a in attempts:
            picked = (a.get("answers") or {}).get(str(qi))
            if picked is None:
                continue
            answered += 1
            if int(picked) == correct:
                got += 1
        q_stats.append({"n": qi + 1, "q": q.get("q") or "",
                        "correct_pct": _pct(got, answered), "answered": answered})
    # score distribution 0..total_q
    dist = [0] * (total_q + 1) if total_q else []
    for a in attempts:
        s = a.get("score")
        if isinstance(s, int) and 0 <= s <= total_q:
            dist[s] += 1
    # recent attempts w/ member names — the KMS session `mid` (member _id) is NOT
    # members.member_id, so resolve by membership_number (reliably stored per attempt).
    mnums = list({a.get("membership_number") for a in attempts if a.get("membership_number")})
    members = {m.get("membership_number"): m for m in
               [d async for d in db.members.find(
                   {"membership_number": {"$in": mnums}},
                   {"membership_number": 1, "name": 1, "username": 1, "membership_id": 1})]}
    recent = []
    for a in attempts[:100]:
        m = members.get(a.get("membership_number")) or {}
        who = (m.get("name") or m.get("username") or m.get("membership_id")
               or (("#" + str(a.get("membership_number"))) if a.get("membership_number") else "—"))
        recent.append({"who": who,
                       "score": a.get("score"), "total": a.get("total"),
                       "pct": _pct(a.get("score") or 0, a.get("total") or 0),
                       "first": bool(a.get("first_attempt")), "at": a.get("created_at") or ""})
    uniq = len({a.get("member_id") for a in attempts})
    avg_score = round(sum((a.get("score") or 0) for a in attempts) / len(attempts), 1) if attempts else 0
    return await _render_admin(request, user, "quiz_analytics_detail.html", active="quiz-analytics",
                               title="Quiz Analytics", post=post, has_quiz=bool(quiz),
                               total_q=total_q, attempts_n=len(attempts), uniq=uniq,
                               avg_score=avg_score, q_stats=q_stats, dist=dist, recent=recent)


@admin_router.get("/admin/preview-post/{post_id}", response_class=HTMLResponse)
async def preview_post(request: Request, post_id: int):
    """Render a post exactly as the public page shows it — works for drafts,
    pending and scheduled posts that the public /{slug} route would hide."""
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return RedirectResponse("/admin/posts", status_code=303)
    if not user.get("a") and post.get("author_slug") != _author_slug(user):
        return RedirectResponse("/admin/posts", status_code=303)
    from kms.public import _render_post
    return await _render_post(request, post, preview=True)


@admin_router.post("/admin/preview-post")
async def preview_post_form(request: Request):
    """Live preview of the CURRENT editor state — renders exactly as the public
    page will look, from the submitted form fields, WITHOUT persisting anything.
    Lets an author see unsaved edits before saving. Starts from the stored post
    (so author/type payloads survive) and overlays the render-relevant fields
    using the SAME content transforms as post-save (doc_css lift + iiReport house
    style + image resolution)."""
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    form = await request.form()
    post_id = int(form.get("id") or 0)
    existing = await db.kms_posts.find_one({"id": post_id}) if post_id else None
    if existing and not user.get("a") and existing.get("author_slug") != _author_slug(user):
        return RedirectResponse("/admin/posts", status_code=303)
    post = dict(existing or {})
    post.setdefault("id", post_id or 0)
    post.setdefault("post_type", (form.get("post_type") or "article"))
    post.setdefault("author_slug", _author_slug(user))
    post.setdefault("pageviews", 0)
    title = (form.get("title") or "").strip() or post.get("title") or "Untitled"
    post["title"] = title
    post["slug"] = _slugify(form.get("slug") or title)
    post["summary"] = (form.get("summary") or "").strip() or None
    post["keywords"] = (form.get("keywords") or "").strip() or None
    post["category_id"] = (int(form.get("subcategory") or form.get("category") or 0)
                           or post.get("category_id"))
    tier = (form.get("tier") or "").strip()
    if tier not in ("public", "registered", "mastermind"):
        tier = post.get("tier") or "public"
    post["tier"] = tier
    post["need_auth"] = 1 if tier in ("registered", "mastermind") else 0
    # Main image — same "empty field = cleared" rule as post-save.
    _img_raw = form.get("image_id")
    image_id = (post.get("image_id") if _img_raw is None else (int(_img_raw or 0) or None))
    image = None
    if image_id:
        img = await db.kms_images.find_one({"id": image_id})
        if img:
            image = {k: img.get(k) for k in ("id", "image_big", "image_default",
                                             "image_slider", "image_mid", "image_small",
                                             "image_mime", "storage")}
    post["image_id"] = image_id
    post["image"] = image
    post["image_url"] = (form.get("image_url") or "").strip() or None
    post["image_description"] = (form.get("image_description") or "").strip() or None
    # Content + doc_css + iiReport house style (mirror of post-save).
    _content = form.get("content") or ""
    _doc_css = form.get("doc_css")
    if _doc_css is None:
        _doc_css = post.get("doc_css") or ""
    _m = re.search(r"<style[^>]*data-kms-doc[^>]*>(.*?)</style>", _content, re.S | re.I)
    if _m:
        if not (_doc_css or "").strip():
            _doc_css = _m.group(1).strip()
        _content = (_content[:_m.start()] + _content[_m.end():]).strip()
    _doc_css = (_doc_css or "").strip() or None
    # Channel parity (any category): normalize a manually-attached doc_css so the KMS
    # screen typography wins and the print sheet fills the column, exactly like an
    # ingested brief. No-op for iiReport (house style replaces it below).
    if _doc_css:
        from kms import ingest  # lazy: avoid the admin<->ingest circular import
        _doc_css = ingest.normalize_scoped_doc_css(_doc_css) or _doc_css
    if iireport.is_iireport(_content):
        _s = await core.cms_settings()
        _content, _doc_css, post["title"] = iireport.apply(
            _content, _doc_css, post["title"], _s,
            ((await core.kms_settings()).get("general") or {}).get("theme_colors"))
    post["content"] = _content
    post["doc_css"] = _doc_css
    from kms.public import _render_post
    return await _render_post(request, post, preview=True)


@admin_router.post("/admin/post-save")
async def post_save(request: Request):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    form = await request.form()
    post_id = int(form.get("id") or 0)
    existing = await db.kms_posts.find_one({"id": post_id}) if post_id else None
    if existing and not user.get("a") and existing.get("author_slug") != _author_slug(user):
        return RedirectResponse("/admin/posts", status_code=303)

    # Status → Delete (D-2026-80). Handled before anything is written: the editor
    # offers it beside publish/draft so a post can be removed without going back
    # to the list. Only for a post that already exists, same permission rule as
    # the list, and the browser asks for confirmation first.
    if (form.get("post_status") or "").strip() == "delete":
        if existing and _may_delete(user, existing):
            await _delete_post_cascade(existing["id"])
        return RedirectResponse("/admin/posts", status_code=303)

    lang_id = int(form.get("lang_id") or 1)
    title = (form.get("title") or "").strip()
    if not title:
        return RedirectResponse(request.headers.get("referer") or "/admin/add-post", status_code=303)
    slug = _slugify(form.get("slug") or title)
    slug = await _unique_slug(slug, exclude_id=post_id or None)
    # The form's Status select (published|pending|draft) wins; the legacy
    # status/as_draft button fields (bulk upload, external scripts) still work.
    post_status = (form.get("post_status") or "").strip()
    if post_status in ("published", "pending", "draft"):
        status = 1 if post_status == "published" else 0
        is_draft = 1 if post_status == "draft" else 0
    else:
        status = 1 if form.get("status") == "1" else 0
        is_draft = 1 if status == 0 and form.get("as_draft") == "1" else 0
    # s150 peer review (KMS_AUTHOR_PEER_REVIEW_PLAN): an AUTHOR never publishes. Any
    # "publish"/"pending"/"review" choice = submit for review; everything else = draft.
    # Enforced here, whatever the form sends.
    author_mode = not user.get("a")
    submit_review = False
    if author_mode:
        submit_review = post_status in ("review", "pending", "published")
        status, is_draft = 0, (0 if submit_review else 1)

    # dates — "Publication Date" (date_published -> created_at) is the displayed
    # date; "Scheduled Publication" (scheduled_at) is a future calendar time that
    # auto-publishes the post and overwrites created_at when it fires.
    created_at = (existing or {}).get("created_at") or _now_str()
    date_pub = (form.get("date_published") or "").strip()
    if date_pub:
        created_at = date_pub.replace("T", " ")[:19]
        if len(created_at) == 16:
            created_at += ":00"
    # "Last Updated" (date_updated -> updated_at) is the "Updated" date shown on
    # the article; blank = the current save moment (historical auto behavior).
    updated_at = _now_str()
    date_upd = (form.get("date_updated") or "").strip()
    if date_upd:
        updated_at = date_upd.replace("T", " ")[:19]
        if len(updated_at) == 16:
            updated_at += ":00"
    scheduled_at = (form.get("scheduled_at") or "").strip()
    if scheduled_at:
        scheduled_at = scheduled_at.replace("T", " ")[:19]
        if len(scheduled_at) == 16:
            scheduled_at += ":00"
    if scheduled_at and scheduled_at <= _now_str():
        scheduled_at = None  # past date = publish now
    scheduled_at = scheduled_at or None
    is_scheduled = 1 if (scheduled_at and status == 1) else 0

    cat_id = int(form.get("subcategory") or form.get("category") or 0) or None
    # Main image. The editor ALWAYS submits the hidden image_id field, so an empty
    # value is an explicit "Reset image" (clear it), NOT "keep the current one".
    # Only fall back to the stored image_id when the field is ABSENT entirely
    # (legacy scripts / bulk upload that never send it). Fixes "Reset image does
    # nothing" — before, an empty value fell through `0 or existing` to the old id.
    _img_raw = form.get("image_id")
    image_id = ((existing or {}).get("image_id") if _img_raw is None
                else (int(_img_raw or 0) or None))
    image = None
    if image_id:
        img = await db.kms_images.find_one({"id": image_id})
        if img:
            image = {k: img.get(k) for k in ("id", "image_big", "image_default",
                                             "image_slider", "image_mid", "image_small",
                                             "image_mime", "storage")}
    tags_raw = [t.strip() for t in (form.get("tags") or "").split(",") if t.strip()]
    tags = [{"id": None, "tag": t, "slug": _slugify(t)} for t in tags_raw]
    await _sync_tags(tags_raw, lang_id)

    # Content tier (KMS_CONTENT_TIERS_PLAN R6): public|registered|mastermind.
    # Legacy forms/scripts without the select fall back to the old need_auth
    # checkbox, else keep the stored tier. need_auth is auto-synced FROM tier.
    tier = (form.get("tier") or "").strip()
    if tier not in ("public", "registered", "mastermind"):
        tier = ("registered" if form.get("need_auth") == "1"
                else (existing or {}).get("tier") or "public")

    # Document CSS (TinyMCE-proof, mirrors the ingest `doc_css` field). The
    # Attach-HTML tool fills a hidden `doc_css` field with the scoped stylesheet
    # AND prepends a <style data-kms-doc> block for the editor preview. TinyMCE
    # strips <style> on save, so the hidden field is the source of truth; we also
    # lift any surviving <style data-kms-doc> out of `content` so it is not
    # rendered twice (the public render prepends doc_css). Editing a post without
    # re-attaching keeps the existing doc_css (the hidden field is pre-filled).
    _content = form.get("content") or ""
    _doc_css = form.get("doc_css")
    if _doc_css is None:
        _doc_css = (existing or {}).get("doc_css") or ""
    _m = re.search(r"<style[^>]*data-kms-doc[^>]*>(.*?)</style>", _content, re.S | re.I)
    if _m:
        if not (_doc_css or "").strip():
            _doc_css = _m.group(1).strip()
        _content = (_content[:_m.start()] + _content[_m.end():]).strip()
    _doc_css = (_doc_css or "").strip() or None
    # Channel parity (any category): normalize a manually-attached doc_css so the KMS
    # screen typography wins and the print sheet fills the column, exactly like an
    # ingested brief (morning brief / weekly market update / stock 360). No-op for
    # iiReport (its house style replaces doc_css below).
    if _doc_css:
        from kms import ingest  # lazy: avoid the admin<->ingest circular import
        _doc_css = ingest.normalize_scoped_doc_css(_doc_css) or _doc_css

    # iiReport house style: the KMS imposes its OWN design on uploaded Series
    # Ranking documents — discards the source's own stylesheet (blue letter
    # sheet), hides the document masthead + running header, and dates the title.
    # Detected by structure (`.sheet` + `table.rank`); other posts pass through.
    if iireport.is_iireport(_content):
        _s = await core.cms_settings()
        _content, _doc_css, title = iireport.apply(
            _content, _doc_css, title, _s,
            ((await core.kms_settings()).get("general") or {}).get("theme_colors"))

    doc = {
        "lang_id": lang_id, "title": title, "slug": slug,
        "summary": (form.get("summary") or "").strip() or None,
        "keywords": (form.get("keywords") or "").strip() or None,
        "optional_url": (form.get("optional_url") or "").strip() or None,
        "show_post_url": 1,
        "image_description": (form.get("image_description") or "").strip() or None,
        "content": _content, "doc_css": _doc_css,
        "category_id": cat_id, "image_id": image_id, "image": image,
        "image_url": (form.get("image_url") or "").strip() or None,
        "tier": tier,
        # Relate this post to one or more Reading-List books and/or Companies
        # (author-side link). Surfaces the post under each book's "Related
        # Insights" and each company's "Related Posts" on the public site. Ids
        # are the CMS ids (book = uuid, company = comp_*); empty clears the link.
        "related_book_ids": [x.strip() for x in (form.get("related_book_ids") or "").split(",") if x.strip()],
        "related_company_ids": [x.strip() for x in (form.get("related_company_ids") or "").split(",") if x.strip()],
        # Legacy singular fields are retired — clear them so stale values don't
        # linger and get picked up by the backward-compat readers.
        "related_book_id": None,
        "related_company_id": None,
        "need_auth": 1 if tier in ("registered", "mastermind") else 0,
        "visibility": 0 if form.get("visibility") == "0" else 1,
        "post_type": "article", "status": status, "is_draft": is_draft,
        "is_scheduled": is_scheduled, "scheduled_at": scheduled_at,
        "created_at": created_at,
        "updated_at": updated_at, "tags": tags,
        "show_right_column": (existing or {}).get("show_right_column", 1),
    }
    # Place (gem2i Travel themes): only when the editor sent the Place box, so bulk
    # upload / scripts never wipe it.
    if form.get("place_form") == "1":
        doc["place"] = _place_from_form(form)
    # dummy views: admin-entered offset shown ON TOP of the real pageviews on the
    # public site. The real counter (pageviews) stays automatic and untouched —
    # it keeps feeding Reward System earnings and analytics honestly.
    if user.get("a") and (form.get("dummy_views") or "").strip().isdigit():
        doc["dummy_views"] = int(form.get("dummy_views"))
    # share points: per-item Member Points value for contributor shares
    # (PMS_ROLES_POINTS_PLAN Phase 6). Blank = the point-table default.
    if user.get("a"):
        sp = (form.get("share_points") or "").strip()
        doc["share_points"] = int(sp) if sp.isdigit() else None
    # non-article post types (Phase 4c-1) — type data embedded in the post doc
    ptype = form.get("post_type") or (existing or {}).get("post_type") or "article"
    if ptype not in POST_TYPES:
        ptype = "article"
    doc["post_type"] = ptype
    if ptype == "video":
        doc["video_url"] = (form.get("video_url") or "").strip()[:1000] or None
        doc["video_embed_code"] = (form.get("video_embed_code") or "").strip() or None
    elif ptype == "recipe":
        try:
            rp = json.loads(form.get("type_payload") or "{}")
        except ValueError:
            rp = {}
        if not isinstance(rp, dict):
            rp = {}
        doc["post_data"] = {"recipe": {
            "prep_time": (rp.get("prep_time") or "").strip()[:100],
            "cook_time": (rp.get("cook_time") or "").strip()[:100],
            "serves": (rp.get("serves") or "").strip()[:100],
            "ingredients": [str(x).strip()[:500] for x in (rp.get("ingredients") or [])
                            if str(x).strip()][:100],
            "directions": [str(x).strip()[:2000] for x in (rp.get("directions") or [])
                           if str(x).strip()][:100],
        }}
    elif ptype in QUIZ_POST_TYPES:
        try:
            qp = json.loads(form.get("type_payload") or "{}")
        except ValueError:
            qp = {}
        if not isinstance(qp, dict):
            qp = {}
        questions = []
        for q in (qp.get("questions") or [])[:50]:
            if not isinstance(q, dict):
                continue
            qtext = (q.get("question") or "").strip()[:500]
            if not qtext:
                continue
            image_id = int(q.get("image_id") or 0) or None
            img = None
            if image_id:
                irow = await db.kms_images.find_one({"id": image_id})
                if irow:
                    img = {k: irow.get(k) for k in
                           ("id", "image_big", "image_default", "image_small")}
            answers = []
            for a in (q.get("answers") or [])[:10]:
                if not isinstance(a, dict):
                    continue
                atext = (a.get("text") or "").strip()[:500]
                if not atext:
                    continue
                answers.append({
                    "text": atext,
                    "correct": 1 if a.get("correct") else 0,
                    "result": (int(a.get("result")) if str(a.get("result") or "").isdigit()
                               else None)})
            if answers:
                questions.append({"question": qtext,
                                  "description": (q.get("description") or "").strip()[:1000] or None,
                                  "image_id": image_id if img else None, "image": img,
                                  "answers": answers})
        results = []
        for rrow in (qp.get("results") or [])[:20]:
            if not isinstance(rrow, dict):
                continue
            rtitle = (rrow.get("title") or "").strip()[:500]
            if not rtitle:
                continue
            results.append({
                "title": rtitle,
                "description": (rrow.get("description") or "").strip()[:2000] or None,
                "min_correct": int(rrow.get("min_correct") or 0),
                "max_correct": int(rrow.get("max_correct") or 0)})
        doc["post_data"] = {"quiz": {"questions": questions, "results": results}}
        doc["is_poll_public"] = 1 if form.get("is_poll_public") == "1" else 0
    elif ptype == "audio" or ptype in ITEM_POST_TYPES:
        try:
            payload = json.loads(form.get("type_payload") or "[]")
        except ValueError:
            payload = []
        if not isinstance(payload, list):
            payload = []
        if ptype == "audio":
            audios = [{"name": (a.get("name") or "").strip()[:255],
                       "url": (a.get("url") or "").strip()[:1000],
                       "download": 1 if a.get("download") else 0}
                      for a in payload[:20]
                      if isinstance(a, dict) and (a.get("url") or "").strip()]
            doc["post_data"] = {"audios": audios}
        else:
            items = []
            for it in payload[:50]:
                if not isinstance(it, dict):
                    continue
                item_title = (it.get("title") or "").strip()[:500]
                item_content = (it.get("content") or "").strip()
                image_id = int(it.get("image_id") or 0) or None
                img = None
                if image_id:
                    irow = await db.kms_images.find_one({"id": image_id})
                    if irow:
                        img = {k: irow.get(k) for k in
                               ("id", "image_big", "image_default", "image_small")}
                if item_title or item_content or img:
                    items.append({
                        "title": item_title, "content": item_content,
                        "image_id": image_id if img else None, "image": img,
                        "image_description":
                            (it.get("image_description") or "").strip()[:255] or None})
            doc["post_data"] = {"items": items}
            doc["show_item_numbers"] = 1 if form.get("show_item_numbers") == "1" else 0
    if author_mode:
        from kms import review as _review
        if existing and existing.get("status") == 1:
            # P6: an author's edit to a PUBLISHED post waits for the admin; the live
            # version stays up until then (review.pending_edit, applied on approval).
            pend = {k: v for k, v in doc.items()
                    if k not in ("status", "is_draft", "is_scheduled", "scheduled_at", "created_at")}
            await db.kms_posts.update_one({"id": post_id}, {"$set": {
                "review.pending_edit": pend, "review.edit_submitted_at": _review._iso()}})
            return RedirectResponse(f"/admin/edit-post/{post_id}?saved=1&edit_pending=1", status_code=303)
        # (re)submitting resets the votes — reviewers judge what would be published
        # Keep earlier rounds (votes + reviewers' comments) in review.history: a resubmit
        # starts a fresh round for ALL other authors, but the author still sees what
        # was asked last time. Saving as draft keeps the record too.
        old = (existing or {}).get("review") or {}
        history = list(old.get("history") or [])
        if old.get("votes"):
            history.append({k: old.get(k) for k in ("state", "required", "submitted_at", "decided_at", "decided_by", "votes")})
        if submit_review:
            doc["review"] = {**_review.new_review(await _review.approvals_required()), "history": history}
        else:
            doc["review"] = {"state": "draft", "votes": [], "history": history} if history else None
    if existing:
        await db.kms_posts.update_one({"id": post_id}, {"$set": doc})
        pid = post_id
    else:
        pid = await _next_id(db.kms_posts)
        doc.update(id=pid, pageviews=doc.get("pageviews", 0),
                   author_username=user.get("u"), author_slug=_author_slug(user),
                   author_id_membership=user.get("m"), user_id=None)
        await db.kms_posts.insert_one(doc)

    # selections (admin only)
    if user.get("a"):
        for sel in ("slider", "featured", "breaking", "recommended"):
            want = form.get(f"sel_{sel}") == "1"
            have = await db.kms_selections.find_one({"post_id": pid, "selection_type": sel})
            if want and not have:
                await db.kms_selections.insert_one(
                    {"id": await _next_id(db.kms_selections), "post_id": pid, "selection_type": sel})
            elif not want and have:
                await db.kms_selections.delete_many({"post_id": pid, "selection_type": sel})

    # feed the news.<brand> mirror in-process (Phase 5; dormant until cutover flag)
    from kms import news_bridge
    saved = await db.kms_posts.find_one({"id": pid})
    if saved:
        await news_bridge.sync_post(saved)
        # Morning Brief mirror: a brief saved directly in the KMS admin (category
        # "Morning Brief") gets/refreshes its morning_pages mirror, so it shows in the
        # IMS and the Brief site too — the KMS is the single source (parity with the
        # ingest path). Also keeps the header image in sync. No-op for normal posts.
        from kms.ingest import sync_morning_from_post
        await sync_morning_from_post(saved)
        if author_mode and submit_review:
            from kms import review as _review
            await _review.notify_reviewers(request, saved)
    return RedirectResponse(f"/admin/edit-post/{pid}?saved=1", status_code=303)


async def _sync_tags(tag_names: list, lang_id: int):
    for t in tag_names:
        slug = _slugify(t)
        if not await db.kms_tags.find_one({"tag_slug": slug, "lang_id": lang_id}):
            await db.kms_tags.insert_one({"id": await _next_id(db.kms_tags),
                                          "tag": t, "tag_slug": slug, "lang_id": lang_id})


async def _delete_post_cascade(post_id: int) -> None:
    """Remove a post and everything that points at it. ONE implementation, shared
    by the Posts list and the editor's Status → Delete (D-2026-80): a second copy
    would eventually forget a collection — the News mirror above all, which would
    leave the article live on news.<brand> after being deleted here."""
    # capture the slug BEFORE deleting — it is the key to the Morning Brief mirror
    doomed = await db.kms_posts.find_one({"id": post_id}, {"slug": 1})
    await db.kms_posts.delete_one({"id": post_id})
    await db.kms_selections.delete_many({"post_id": post_id})
    await db.kms_reactions.delete_many({"post_id": post_id})
    from kms import news_bridge
    await news_bridge.remove_post(post_id)
    # Brief mirror parity (D-2026): morning_pages feeds BOTH morningbrief.<brand>
    # and the IMS workspace, and the KMS→morning_pages mirror was write-only, so a
    # KMS delete used to leave the brief lingering in the IMS. Clear it here too.
    if doomed and doomed.get("slug"):
        from kms.ingest import remove_morning
        await remove_morning(doomed["slug"])


def _may_delete(user: dict, post: dict) -> bool:
    """Admins delete anything; an author only their own posts (same rule the
    Posts list has always enforced)."""
    return bool(user.get("a")) or post.get("author_slug") == _author_slug(user)


@admin_router.post("/admin/post-delete")
async def post_delete(request: Request, post_id: int = Form(...)):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return RedirectResponse("/admin/posts", status_code=303)
    if not _may_delete(user, post):
        return RedirectResponse("/admin/posts", status_code=303)
    await _delete_post_cascade(post_id)
    return RedirectResponse(request.headers.get("referer") or "/admin/posts", status_code=303)


@admin_router.post("/admin/post-approve")
async def post_approve(request: Request, post_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id})
    if post:
        from kms import review as _review  # s150: decisive admin approval + author notified
        await _review.admin_approve(request, post)
    return RedirectResponse(request.headers.get("referer") or "/admin/pending-posts", status_code=303)


@admin_router.post("/admin/post-set-draft")
async def post_set_draft(request: Request, post_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_posts.update_one(
        {"id": post_id},
        {"$set": {"status": 0, "is_draft": 1, "is_scheduled": 0, "scheduled_at": None,
                  "updated_at": _now_str()}})
    from kms import news_bridge
    moved = await db.kms_posts.find_one({"id": post_id})
    if moved:
        await news_bridge.sync_post(moved)  # unpublished → mirror row removed
    return RedirectResponse(request.headers.get("referer") or "/admin/posts", status_code=303)


# ── categories ───────────────────────────────────────────────────────────────
@admin_router.get("/admin/categories", response_class=HTMLResponse)
async def categories_page(request: Request, edit: int = 0):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    editing = next((c for c in cats if c["id"] == edit), None) if edit else None
    counts = {}
    for c in cats:
        counts[c["id"]] = await db.kms_posts.count_documents({"category_id": c["id"]})
    return await _render_admin(request, user, "categories.html", active="categories",
                               title="Categories", cats=cats, editing=editing, counts=counts)


@admin_router.post("/admin/category-save")
async def category_save(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    form = await request.form()
    cid = int(form.get("id") or 0)
    name = (form.get("name") or "").strip()
    if not name:
        return RedirectResponse("/admin/categories", status_code=303)
    doc = {
        "lang_id": int(form.get("lang_id") or 1), "name": name,
        "slug": _slugify(form.get("slug") or name),
        "parent_id": int(form.get("parent_id") or 0),
        "description": (form.get("description") or "").strip() or None,
        "keywords": (form.get("keywords") or "").strip() or None,
        "color": (form.get("color") or "#2d65fe").strip(),
        "block_type": form.get("block_type") or "block-1",
        "category_order": int(form.get("category_order") or 0),
        "show_on_homepage": 1 if form.get("show_on_homepage") == "1" else 0,
        "show_on_menu": 1 if form.get("show_on_menu") == "1" else 0,
        # Fallback thumbnail for posts in this (sub)category that have no image of
        # their own; with compose on, the linked company's logo is baked onto it.
        "default_image": (form.get("default_image") or "").strip() or None,
        "compose_company_logo": 1 if form.get("compose_company_logo") == "1" else 0,
        "category_status": 1,
    }
    if cid:
        await db.kms_categories.update_one({"id": cid}, {"$set": doc})
    else:
        doc["id"] = await _next_id(db.kms_categories)
        doc["created_at"] = _now_str()
        await db.kms_categories.insert_one(doc)
    return RedirectResponse("/admin/categories", status_code=303)


@admin_router.post("/admin/category-delete")
async def category_delete(request: Request, cat_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_categories.delete_one({"id": cat_id})
    return RedirectResponse("/admin/categories", status_code=303)


# ── tags ─────────────────────────────────────────────────────────────────────
@admin_router.get("/admin/tags", response_class=HTMLResponse)
async def tags_page(request: Request):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    tags = [t async for t in db.kms_tags.find({"lang_id": lang_id}).sort("id", -1)]
    for t in tags:
        t["count"] = await db.kms_posts.count_documents({"tags.slug": t.get("tag_slug")})
    return await _render_admin(request, user, "tags.html", active="tags",
                               title="Tags", tags=tags)


@admin_router.post("/admin/tag-delete")
async def tag_delete(request: Request, tag_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return r
    await db.kms_tags.delete_one({"id": tag_id})
    return RedirectResponse("/admin/tags", status_code=303)


# ── file manager (images) ────────────────────────────────────────────────────
@admin_router.get("/admin/watermark-logo")
async def watermark_logo(request: Request):
    """Serve the brand logo (settings.logo_on_1) from the KMS's OWN origin so the
    image-adjust modal can composite it onto the upload canvas without tainting it
    (a cross-origin logo would block canvas.toBlob). Resolves data-URI / local
    /api/uploads/* (main CMS) / /uploads/* (KMS) forms. Public: it's the brand logo."""
    if not await kms_enabled():
        return Response(status_code=404)
    s = await db.settings.find_one({}, {"logo_on_1": 1}) or {}
    return core.brand_asset_response((s.get("logo_on_1") or "").strip())         or Response(status_code=404)


@admin_router.post("/admin/file/get-images")
async def fm_get_images(request: Request, offset: int = Form(0), q: str = Form("")):
    user, r = await _admin_gate(request)
    if r is not None:
        return JSONResponse({"ok": False}, status_code=403)
    filt = {}
    if q.strip():
        filt["file_name"] = {"$regex": re.escape(q.strip()), "$options": "i"}
    total = await db.kms_images.count_documents(filt)
    imgs = [{"id": i["id"], "small": core.img_url(i.get("image_small") or i.get("image_mid")),
             "big": core.img_url(i.get("image_big") or i.get("image_default")),
             "name": i.get("file_name") or ""}
            async for i in db.kms_images.find(filt).sort("id", -1).skip(offset).limit(FILEMAN_PAGE)]
    return JSONResponse({"ok": True, "images": imgs, "total": total,
                         "more": offset + FILEMAN_PAGE < total})


@admin_router.post("/admin/file/upload-image")
async def fm_upload_image(request: Request, file: UploadFile = File(...),
                          watermark: int = Form(1)):
    user, r = await _admin_gate(request)
    if r is not None:
        return JSONResponse({"ok": False}, status_code=403)
    try:
        from PIL import Image
    except ImportError:
        return JSONResponse({"ok": False, "error": "Pillow not installed"}, status_code=500)
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        return JSONResponse({"ok": False, "error": "File too large (max 15MB)"}, status_code=400)
    try:
        im = Image.open(BytesIO(raw))
        im.load()
        if im.mode in ("RGBA", "P", "LA"):
            im = im.convert("RGB")
    except Exception:
        return JSONResponse({"ok": False, "error": "Not a valid image"}, status_code=400)

    folder = datetime.now(timezone.utc).strftime("%Y%m")
    rel_dir = f"uploads/images/{folder}"
    (UPLOADS_DIR / "images" / folder).mkdir(parents=True, exist_ok=True)
    uid = uuid.uuid4().hex[:13]
    gs = (await core.kms_settings()).get("general") or {}
    storage_used = "local"
    paths = {}

    def _store(rel, data):
        nonlocal storage_used
        s3_url = core.s3_put(gs, rel, data, "image/jpeg")
        if s3_url:
            storage_used = "s3"
            return s3_url
        (UPLOADS_DIR / "images" / folder / Path(rel).name).write_bytes(data)
        return rel

    # Clean master (un-watermarked, full-res-bounded). Kept so a brand can later
    # re-watermark its own copy per brand from a mark-free source (the watermark
    # itself is baked into the derivatives below and can't be un-baked).
    master = im.copy()
    master.thumbnail((2000, 6000))
    mbuf = BytesIO()
    master.save(mbuf, "JPEG", quality=92)
    master_path = _store(f"{rel_dir}/image_master_{uid}.jpg", mbuf.getvalue())

    # Per-brand watermark, burned in SERVER-SIDE from THIS brand's logo_on_1, so a
    # copy never carries another brand's mark. Off => derivatives stay clean.
    src = im
    if watermark:
        sdoc = await db.settings.find_one({}, {"logo_on_1": 1}) or {}
        logo_bytes = core.brand_asset_bytes((sdoc.get("logo_on_1") or "").strip())
        if logo_bytes:
            src = core.composite_watermark(im, logo_bytes)

    for variant, (w, h) in IMG_SIZES.items():
        copy = src.copy()
        copy.thumbnail((w, h * 3))  # keep aspect, bound by width
        buf = BytesIO()
        copy.save(buf, "JPEG", quality=88)
        paths[variant] = _store(f"{rel_dir}/image_{w}x{h}_{uid}.jpg", buf.getvalue())
    doc = {"id": await _next_id(db.kms_images), **paths, "image_master": master_path,
           "image_mime": "jpg", "file_name": file.filename or f"image-{uid}",
           "storage": storage_used, "user_id": None, "created_at": _now_str()}
    await db.kms_images.insert_one(doc)
    return JSONResponse({"ok": True, "id": doc["id"],
                         "small": core.img_url(doc["image_small"]),
                         "big": core.img_url(doc["image_big"])})


@admin_router.post("/admin/file/delete-image")
async def fm_delete_image(request: Request, image_id: int = Form(...)):
    user, r = await _admin_gate(request, admin_only=True)
    if r is not None:
        return JSONResponse({"ok": False}, status_code=403)
    img = await db.kms_images.find_one({"id": image_id})
    if img:
        for k in IMG_SIZES:
            p = img.get(k)
            if p:
                try:
                    target = (UPLOADS_DIR / Path(p).relative_to("uploads")).resolve()
                    if str(target).startswith(str(UPLOADS_DIR.resolve())) and target.is_file():
                        target.unlink()
                except Exception:
                    pass
        await db.kms_images.delete_one({"id": image_id})
    return JSONResponse({"ok": True})
