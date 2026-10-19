"""KMS public site — clean-room magazine theme (login-gated, matching the live mod)."""
import hashlib
import logging
import math
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Form, Request
from fastapi.responses import (FileResponse, HTMLResponse, JSONResponse,
                               RedirectResponse, Response)

from kms import core
from kms.core import (KMS_COOKIE, DARK_COOKIE, RESERVED, UPLOADS_DIR, db,
                      current_user, kms_enabled, login_redirect, verify_password)
from utils import points as member_points

logger = logging.getLogger(__name__)
page_router = APIRouter()


def _guard_response():
    return HTMLResponse("Not found", status_code=404)


# ── Member Points: referral + per-member view tracking (KMS_MEMBER_POINTS_PLAN) ──
REF_COOKIE = "kms_ref"          # 90-day attribution cookie for anonymous ?ref= visitors
_points_indexes_ready = False


async def _ensure_points_indexes():
    global _points_indexes_ready
    if _points_indexes_ready:
        return
    try:
        await db.kms_post_views.create_index(
            [("member_id", 1), ("post_id", 1)], unique=True)
        await db.referral_clicks.create_index([("clicked_at", -1)])
        _points_indexes_ready = True
    except Exception:
        logger.warning("kms points index creation failed", exc_info=True)


async def _resolve_ref(code: str):
    """?ref=CA-105 (membership_id, case-insensitive; D4) → member doc, or None.
    Fallback: trailing digits → membership_number, for legacy/odd prefixes."""
    code = (code or "").strip()
    if not code:
        return None
    m = await db.members.find_one(
        {"membership_id": re.compile(f"^{re.escape(code)}$", re.I)})
    if not m:
        tail = re.search(r"(\d+)$", code)
        if tail:
            m = await db.members.find_one({"membership_number": int(tail.group(1))})
    return m


async def _log_ref_click(request: Request, ref_code: str):
    """Anonymous ?ref= landing → referral_clicks (attribution funnel top)."""
    try:
        await _ensure_points_indexes()
        ref_m = await _resolve_ref(ref_code)
        await db.referral_clicks.insert_one({
            "id": uuid.uuid4().hex,
            "ref_code": ref_code,
            "ref_membership_number": (ref_m or {}).get("membership_number"),
            "path": str(request.url.path),
            "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else ""),
            "ua_hash": hashlib.sha1((request.headers.get("user-agent") or "")
                                    .encode()).hexdigest()[:16],
            "clicked_at": datetime.now(timezone.utc).isoformat(),
            "converted_member_id": None})
        # Premiar al SHARER (dueño del ?ref=) por el clic (Carlos 2026-08-14).
        # `affiliate_click` NO lleva prefijo `referral_` → el MMS acredita al miembro
        # del evento (el sharer) directamente, sin redirigir al sponsor. Se deduplica
        # por (ref, IP, día) para frenar el farming por recarga; las caps/cooldown de
        # la regla del MMS ponen el resto.
        if ref_m and ref_m.get("membership_number"):
            _ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "")
            _day = datetime.now(timezone.utc).isoformat()[:10]
            from utils.mms_events import emit_soon
            emit_soon(db, {
                "type": "affiliate_click",
                "membership_number": ref_m.get("membership_number"),
                "payload": {"ref_code": ref_code, "path": str(request.url.path)},
                "event_key": f"click:{ref_code}:{hashlib.sha1(_ip.encode()).hexdigest()[:12]}:{_day}",
            })
    except Exception:
        logger.warning("kms referral click log failed", exc_info=True)


async def _record_member_view(request: Request, post: dict, me: dict | None):
    """One kms_post_views doc per (member, post) — the anti-abuse dedup unit.
    Repeats grow view_count but the doc (and later its points) exists once.
    The automatic kms_posts.pageviews total is untouched by design."""
    if not me or not me.get("mid"):
        return
    try:
        await _ensure_points_indexes()
        now = datetime.now(timezone.utc).isoformat()
        ref_num = None
        ref_code = (request.query_params.get("ref") or "").strip()
        if ref_code:
            ref_m = await _resolve_ref(ref_code)
            if ref_m and (ref_m.get("id") or str(ref_m.get("_id"))) != me["mid"]:
                ref_num = ref_m.get("membership_number")   # self-ref ignored
        res = await db.kms_post_views.update_one(
            {"member_id": me["mid"], "post_id": post["id"]},
            {"$setOnInsert": {"id": uuid.uuid4().hex,
                              "membership_number": me.get("m") or 0,
                              "author_slug": post.get("author_slug") or "",
                              "first_viewed_at": now,
                              "counted": True,          # unique view; pointed once (Phase 3)
                              "ref_source": ref_num},
             "$set": {"last_viewed_at": now},
             "$inc": {"view_count": 1}},
            upsert=True)
        if res.upserted_id is not None:     # first-ever view of this post → point it
            await member_points.award(
                db, action="view", mid=me["mid"], membership_number=me.get("m"),
                ref={"post_id": post["id"], "ref_source": ref_num},
                key=f"view:{me['mid']}:{post['id']}")
    except Exception:
        logger.warning("kms member view record failed", exc_info=True)


async def _gate(request: Request):
    """Site-wide flag + tier resolution (KMS_CONTENT_TIERS_PLAN, revised model).

    The KMS is OPEN at the PUBLIC tier: every visitor passes and reads
    public-tier content. Higher tiers (registered / mastermind) stay hidden to
    lower tiers (R8). A logged-in My Account member is recognised here via the
    shared cross-subdomain session cookie — no separate KMS login (session sync,
    like /my-account). Anonymous visitors get the SOFT subscribe overlay
    (News/Brief style: a scroll/time modal injected by base.html), NOT a hard
    wall. Returns a short-circuit response only when the KMS is disabled."""
    if not await kms_enabled():
        return _guard_response()
    viewer = await core.resolve_viewer(request)
    request.state.kms_viewer = viewer
    core.set_viewer_tier(viewer["tier"])
    # anonymous → show the subscribe overlay (base.html reads this flag).
    request.state.kms_show_overlay = bool(viewer.get("anon"))
    # anonymous ?ref= visitor — log the click for the Member Points funnel; the
    # overlay form carries the ref through to /subscribe for sponsor attribution.
    if viewer.get("anon"):
        ref = (request.query_params.get("ref") or "").strip()
        if ref:
            await _log_ref_click(request, ref)
    return None


def _safe_next(path: str) -> str:
    p = (path or "").strip()
    return p if p.startswith("/") and not p.startswith("//") else "/"


async def _subscribe_gate_page(request: Request, error: str = "",
                               nxt: str = "") -> HTMLResponse:
    """The anonymous-visitor gate: brand-tokened standalone page with the
    News/Brief-style lead-capture form + a member-login link (Phase 3)."""
    from utils.leadcapture import make_form_token
    s = await core.kms_settings()
    gs = s.get("general") or {}
    lang_id = (await core.default_lang()).get("id", 1)
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    if not nxt:
        nxt = request.url.path + (("?" + request.url.query) if request.url.query else "")
    theme = core.active_theme(gs)
    marks = await core.brand_logos()
    html_out = core._env.get_template("subscribe_gate.html").render(
        request=request,
        theme_css=core.theme_css(gs, theme),
        site_title=ls.get("site_title") or ls.get("application_name") or "Insights",
        logo=marks["logo"],
        favicon=marks["favicon"],
        form_token=make_form_token(),
        next=_safe_next(nxt),
        error=error)
    return HTMLResponse(html_out, status_code=200)


@page_router.post("/subscribe")
async def kms_subscribe(request: Request, background_tasks: BackgroundTasks):
    """KMS consumer of the shared lead-capture funnel (Phase 3): creates the
    pre_registered member w/ sponsor attribution, then sets the cross-subdomain
    subscriber cookie (R5) and returns the visitor to the page they wanted."""
    if not await kms_enabled():
        return _guard_response()
    form = await request.form()
    body = {k: form.get(k) for k in
            ("first_name", "last_name", "email", "website", "form_token",
             "accepted", "aux_id", "next")}
    from kms import pub_redirect
    # The publication being read (single-post pages only) → drives author-root
    # sponsorship + the post-subscribe hand-off (KMS_PUBLICATION_SUBSCRIBE_
    # REDIRECT_PLAN, D2/D3).
    try:
        pid = int(form.get("post_id")) if (form.get("post_id") or "").strip() else None
    except (TypeError, ValueError):
        pid = None
    post = await db.kms_posts.find_one(
        {"id": pid}, {"_id": 0, "id": 1, "slug": 1, "author_slug": 1,
                      "author_id_membership": 1, "category_id": 1}) if pid else None
    # sponsor attribution ladder: explicit aux_id → ?ref / overlay ref / kms_ref
    # cookie (a sharer) → the article's AUTHOR (author-root) → AUX-1 (engine default)
    if not body.get("aux_id"):
        ref = (form.get("ref") or request.query_params.get("ref")
               or request.cookies.get(REF_COOKIE) or "").strip()
        if ref:
            ref_m = await _resolve_ref(ref)
            if ref_m:
                body["aux_id"] = str(ref_m.get("membership_number"))
    if not body.get("aux_id") and post:
        author_num = pub_redirect.author_sponsor(post)
        if author_num:
            body["aux_id"] = str(author_num)
    from utils import leadcapture
    res = await leadcapture.process_subscribe(
        request, background_tasks, body,
        source="kms", login_source="kms", default_sponsor_number=1)
    nxt = _safe_next(body.get("next") or "/")
    if res.get("status") != "ok":
        return await _subscribe_gate_page(
            request, error=res.get("message") or "Please try again.", nxt=nxt)
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    # Publication hand-off: send the reader to the publication's own domain with
    # THEIR new aux code (so their shares extend their branch); None → stay on KMS
    # (non-publication, or a Morning Brief with no matching brief page).
    # Carlos 2026-08-14: el lector se queda SIEMPRE en el KMS ("todo en el KMS,
    # los usuarios ven todo en el KMS"). Antes se le mandaba al dominio de la
    # publicación de origen (News/Brief) con su nuevo aux (pub_redirect hand-off,
    # D-2026-100). Ahora aterriza en el PROPIO post del KMS, con su ?ref para que
    # sus shares sigan extendiendo su rama — pero sin salir del KMS.
    dest = nxt
    if post and post.get("slug"):
        dest = f"/{post['slug']}"
        _new_aux = res.get("id_membership")
        if _new_aux:
            try:
                from routes.membership import get_aux_prefix
                dest += f"?ref={await get_aux_prefix()}-{_new_aux}"
            except Exception:
                logger.warning("kms subscribe ref build failed", exc_info=True)
    resp = RedirectResponse(dest, status_code=303)
    email = (body.get("email") or "").strip().lower()
    if email:
        leadcapture.set_subscriber_cookie(resp, email, settings)
    return resp


def _page(html: str) -> HTMLResponse:
    return HTMLResponse(html)


async def _paginate(request: Request, total: int, per_page: int):
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        page = 1
    pages = max(1, math.ceil(total / per_page)) if per_page else 1
    page = min(page, pages)
    return {"page": page, "pages": pages, "offset": (page - 1) * per_page,
            "total": total, "per_page": per_page}


# ── static / uploads ─────────────────────────────────────────────────────────
@page_router.get("/uploads/{path:path}")
async def kms_uploads(path: str):
    if not await kms_enabled():
        return _guard_response()
    target = (UPLOADS_DIR / path).resolve()
    if not str(target).startswith(str(UPLOADS_DIR.resolve())) or not target.is_file():
        return Response(status_code=404)
    return FileResponse(target)


@page_router.get("/cat-thumb/{post_id}.jpg")
async def kms_category_thumb(post_id: int):
    """Baked fallback thumbnail for a post that has no image of its own, when its
    (sub)category defines a default image: the default background + the per-instance
    brand watermark (always) + (if the category composes and the post is linked to a
    company) that company's white logo centered below the title. One real image,
    cached on disk and served to every surface (KMS pages, the feed, the company/book
    detail)."""
    if not await kms_enabled():
        return _guard_response()
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return Response(status_code=404)
    d = (await core.default_image_categories()).get(post.get("category_id"))
    if not d:
        return Response(status_code=404)
    bg_path = core.brand_asset_path(d.get("image"))
    if not bg_path:
        return Response(status_code=404)
    _cache_hdr = {"Cache-Control": "public, max-age=3600"}
    # Brand watermark — baked onto a category default (the brand's own mark, like the
    # Morning Brief), per-instance from settings.logo_on_1. A category can OPT OUT
    # (compose_brand_watermark=false) when its background already carries the brand
    # mark, so it is not doubled (e.g. Founder Stories).
    want_wm = d.get("brand_watermark", True)
    s = await db.settings.find_one({}, {"logo_on_1": 1}) or {}
    brand_bytes = core.brand_asset_bytes(s.get("logo_on_1")) if want_wm else None
    brand_path = core.brand_asset_path(s.get("logo_on_1")) if want_wm else None
    # Where the company logo sits (0..1); blank = the 0.55 default.
    _cf = d.get("center_frac")
    try:
        center_frac = float(_cf) if _cf not in (None, "") else 0.55
    except (TypeError, ValueError):
        center_frac = 0.55
    # Company logo — only when the category composes it AND the post is linked to a
    # company (Stock 360). Book Reviews (compose off) never overlays a company logo.
    logo_bytes = logo_path = None
    if d.get("compose"):
        logo_bytes, logo_path = await core.post_company_logo(post)
    # Nothing to overlay at all → serve the raw default background.
    if not brand_bytes and not logo_bytes:
        return FileResponse(bg_path, media_type="image/jpeg", headers=_cache_hdr)
    # Composite, cached per post; re-baked when any source file changes (mtime).
    cache_dir = UPLOADS_DIR / "cat-thumb-cache"
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    # Cache key = the source PATHS + their newest mtime, so it re-bakes both when a
    # source file changes AND when the post is relinked to a different company logo.
    newest = max((p.stat().st_mtime for p in (bg_path, logo_path, brand_path) if p),
                 default=0)
    # `v2` bumps the cache when the compositing CODE changes (white-silhouette +
    # bbox-crop + centered-below-title fix) — source mtimes alone wouldn't re-bake.
    sig = hashlib.md5(
        f"v2|{bg_path}|{logo_path}|{brand_path}|cf{center_frac}|wm{int(bool(want_wm))}|{int(newest)}"
        .encode()).hexdigest()[:10]
    cache = cache_dir / f"{post_id}-{sig}.jpg"
    if cache.is_file():
        return FileResponse(cache, media_type="image/jpeg", headers=_cache_hdr)
    data = core.compose_category_thumb(bg_path.read_bytes(), logo_bytes, brand_bytes,
                                       center_frac=center_frac)
    try:
        cache.write_bytes(data)
    except Exception:
        pass
    return Response(content=data, media_type="image/jpeg", headers=_cache_hdr)


@page_router.get("/brand/{slot}")
async def kms_brand_asset(slot: str):
    """The brand marks absorbed from the platform CMS, served from the KMS's own
    origin (the CMS `/api/uploads` mount is not reachable on this host). Public —
    it is the brand logo. Long-cached: the URL carries a digest of the stored
    value, so swapping the artwork in the CMS changes the URL."""
    if not await kms_enabled():
        return _guard_response()
    if slot not in core.CMS_LOGO_SLOTS:
        return Response(status_code=404)
    resp = core.brand_asset_response(await core.brand_asset_value(slot))
    if resp is None:
        return Response(status_code=404)
    resp.headers["Cache-Control"] = "public, max-age=604800"
    return resp


@page_router.get("/kms-static/{path:path}")
async def kms_static(path: str):
    if not await kms_enabled():
        return _guard_response()
    base = core.KMS_DIR / "static"
    target = (base / path).resolve()
    if not str(target).startswith(str(base.resolve())) or not target.is_file():
        return Response(status_code=404)
    return FileResponse(target)


# ── auth ─────────────────────────────────────────────────────────────────────
@page_router.get("/admin/login")
async def admin_login(request: Request, error: str = ""):
    if not await kms_enabled():
        return _guard_response()
    if current_user(request):
        return RedirectResponse("/", status_code=303)
    # Referral register panel (D2): shown when the visitor carries a ref
    # (?ref= or the kms_ref cookie) or is coming back from a /register POST.
    from utils.leadcapture import make_form_token
    q = request.query_params
    ref_code = (q.get("ref") or request.cookies.get(REF_COOKIE) or "").strip()
    return _page(await core.render(
        request, "login.html", error=error, title="Login",
        ref_code=ref_code, form_token=make_form_token(),
        registered=q.get("registered", ""), rerr=q.get("rerr", "")))


@page_router.post("/register")
async def register_post(request: Request, background_tasks: BackgroundTasks,
                        first_name: str = Form(""), last_name: str = Form(""),
                        email: str = Form(""), website: str = Form(""),
                        form_token: str = Form(""), accepted: str = Form(""),
                        ref: str = Form("")):
    """Referral lead capture (Member Points Phase 4, D2): the ?ref= visitor
    registers here → pre_registered member under the sharer's sponsorship
    (leadcapture engine: honeypot + signed token + acceptance). Reading access
    still requires activation — every referral is a lead first."""
    if not await kms_enabled():
        return _guard_response()
    ref_code = (ref or request.cookies.get(REF_COOKIE) or "").strip()
    sponsor = await _resolve_ref(ref_code)
    from utils.leadcapture import process_subscribe
    result = await process_subscribe(
        request, background_tasks,
        {"first_name": first_name, "last_name": last_name, "email": email,
         "website": website, "form_token": form_token, "accepted": accepted,
         "aux_id": sponsor.get("membership_number") if sponsor else None,
         "author": ""},
        source="kms_share", login_source="kms", default_sponsor_number=None)
    if result.get("status") != "ok":
        from urllib.parse import quote
        return RedirectResponse(
            f"/admin/login?rerr={quote(result.get('message') or 'Please try again.')}",
            status_code=303)
    if result.get("message") == "You are already subscribed":
        return RedirectResponse("/admin/login?registered=2", status_code=303)
    # brand-new pre_registered member → stamp the click conversion + point the sharer
    if sponsor and result.get("id_membership"):
        try:
            new_m = await db.members.find_one(
                {"membership_number": result["id_membership"]},
                {"member_id": 1, "email": 1})
            # self-referral guard: the sharer registering their own email earns nothing
            if new_m and (new_m.get("email") or "").lower() != (sponsor.get("email") or "").lower():
                await db.referral_clicks.find_one_and_update(
                    {"ref_code": re.compile(f"^{re.escape(ref_code)}$", re.I),
                     "converted_member_id": None},
                    {"$set": {"converted_member_id": new_m.get("member_id")}},
                    sort=[("clicked_at", -1)])
                # ⚠ `award()` antepone `kms_` al tipo → `kms_referral_signup`, que
                # NO coincide con la regla/embudo `referral_signup` del MMS (bug de
                # prefijo). Además hay que emitir con el REFERIDO (el nuevo lead), no
                # con el sponsor: el MMS resuelve el sponsor desde el referido
                # (paridad con enrollment.py). (Carlos 2026-08-14.)
                from utils.mms_events import emit_mms_event
                await emit_mms_event(db, {
                    "type": "referral_signup",
                    "membership_number": result["id_membership"],
                    "payload": {"source": "kms_share",
                                "sponsor_number": sponsor.get("membership_number"),
                                "referred_member_id": new_m.get("member_id")},
                    "event_key": f"refsignup:{new_m.get('member_id')}",
                })
        except Exception:
            logger.warning("referral signup credit failed", exc_info=True)
    return RedirectResponse("/admin/login?registered=1", status_code=303)


@page_router.post("/admin/login-post")
async def admin_login_post(request: Request, username: str = Form(""),
                           email: str = Form(""), password: str = Form("")):
    if not await kms_enabled():
        return _guard_response()
    ident = (email or username or "").strip().lower()
    member = await db.members.find_one(
        {"$or": [{"email": ident}, {"username": ident}]})
    ok = member and member.get("password_hash") and verify_password(password, member["password_hash"])
    if ok and (member.get("account_status") or "active") == "deactivated":
        ok = False
    if not ok:
        return RedirectResponse("/admin/login?error=1", status_code=303)
    resp = RedirectResponse("/", status_code=303)
    resp.set_cookie(KMS_COOKIE, await core.make_session(member), httponly=True,
                    secure=True, samesite="lax", max_age=60 * 60 * 12)
    # unified login history (replaces the old KMS→AUX login-event bridge)
    try:
        await db.member_logins.insert_one({
            "member_id": member.get("id") or str(member.get("_id")),
            "membership_number": member.get("membership_number"),
            "email": member.get("email"), "source": "kms",
            "logged_at": datetime.now(timezone.utc).isoformat(),
            "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else "")})
    except Exception:
        logger.warning("kms login-history write failed", exc_info=True)
    return resp


def _safe_next(nxt: str) -> str:
    """Only allow a same-site absolute path as the post-login destination — never
    a protocol-relative or off-site URL (open-redirect guard). Anything else → home.
    Lets a public-site KMS link (Insights card / "View all") land the member on the
    exact page they clicked instead of the KMS home."""
    if (isinstance(nxt, str) and nxt.startswith("/") and not nxt.startswith("//")
            and "\\" not in nxt and "/sso-login" not in nxt):
        return nxt
    return "/"


@page_router.get("/sso-login")
async def sso_login(request: Request, token: str = "", next: str = ""):
    """One-time sso_tokens handoff from My Account — consumed in-process
    (news/morning pattern). Replaces the old Varient SsoController round-trip.
    Optional `next` = a same-site path to land on after the session is seated."""
    if not await kms_enabled():
        return _guard_response()
    if not token:
        return login_redirect()
    doc = await db.sso_tokens.find_one_and_delete({"token": token})
    if not doc:
        return login_redirect()
    try:
        exp = datetime.fromisoformat(str(doc.get("expires_at")).replace("Z", ""))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            return login_redirect()
    except Exception:
        pass
    # members are keyed by member_id (what /auth/sso/generate stores) — the old
    # {"id": ...} lookup hit a nonexistent field and, with a null member_id,
    # could match an arbitrary member. Guard None explicitly.
    member = None
    if doc.get("member_id"):
        member = await db.members.find_one({"member_id": doc["member_id"]})
    if not member and doc.get("email"):
        member = await db.members.find_one({"email": (doc.get("email") or "").lower()})
    if not member or (member.get("account_status") or "active") == "deactivated":
        return login_redirect()
    resp = RedirectResponse(_safe_next(next), status_code=303)
    resp.set_cookie(KMS_COOKIE, await core.make_session(member), httponly=True,
                    secure=True, samesite="lax", max_age=60 * 60 * 12)
    # login-history parity with /admin/login-post (SSO entries were unrecorded)
    try:
        await db.member_logins.insert_one({
            "member_id": member.get("id") or str(member.get("_id")),
            "membership_number": member.get("membership_number"),
            "email": member.get("email"), "source": "kms",
            "logged_at": datetime.now(timezone.utc).isoformat(),
            "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else "")})
    except Exception:
        logger.warning("kms sso login-history write failed", exc_info=True)
    return resp


@page_router.get("/logout")
async def logout(request: Request):
    resp = RedirectResponse("/admin/login", status_code=303)
    resp.delete_cookie(KMS_COOKIE)
    return resp


@page_router.post("/switch-dark-mode")
async def switch_dark_mode(request: Request):
    dark = request.cookies.get(DARK_COOKIE) == "1"
    resp = JSONResponse({"ok": True, "dark": not dark})
    resp.set_cookie(DARK_COOKIE, "0" if dark else "1", max_age=60 * 60 * 24 * 365)
    return resp


# ── home ─────────────────────────────────────────────────────────────────────
@page_router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    if (r := await _gate(request)) is not None:
        return r
    s = await core.kms_settings()
    gs = s.get("general") or {}
    lang = await core.default_lang()
    lang_id = lang.get("id", 1)
    latest = await core.latest_posts(lang_id, 12)
    slider = latest if gs.get("show_latest_posts_on_slider") == 1 else \
        await core.selected_posts("slider", lang_id)
    featured = latest if gs.get("show_latest_posts_on_featured") == 1 else \
        await core.selected_posts("featured", lang_id)
    breaking = await core.selected_posts("breaking", lang_id)
    cats = await core.categories(lang_id)
    home_cats = [c for c in cats if c.get("show_on_homepage") == 1 and not c.get("parent_id")]
    cat_posts = {}
    for c in home_cats:
        ids = [c["id"]] + [sc["id"] for sc in core.subcategories(cats, c["id"])]
        cat_posts[c["id"]] = await core.posts_by_category(ids, lang_id, 13)
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    html = await core.render(
        request, "index.html",
        title=ls.get("home_title") or "Index",
        description=ls.get("site_description") or "",
        breaking=breaking, slider=slider[:6], featured=featured[:5],
        home_cats=home_cats, cat_posts=cat_posts, latest=latest,
        show_newsticker=gs.get("show_newsticker") == 1,
        show_featured=gs.get("show_featured_section") == 1,
        sidebar_widgets=await core.widgets(lang_id),
        popular=await _popular(lang_id), recommended=await core.selected_posts("recommended", lang_id),
        tags=await _tag_cloud(lang_id))
    return _page(html)


async def _popular(lang_id: int, limit: int = 5):
    cur = (db.kms_posts.find({**core.public_post_filter(), "lang_id": lang_id})
           .sort("pageviews", -1).limit(limit))
    return [p async for p in cur]


async def _tag_cloud(lang_id: int, limit: int = 20):
    return [t async for t in db.kms_tags.find({"lang_id": lang_id}).limit(limit)]


# ── listings ─────────────────────────────────────────────────────────────────
async def _listing(request: Request, *, title: str, posts: list, pager: dict,
                   heading=None, **extra):
    lang = await core.default_lang()
    html = await core.render(
        request, "listing.html", title=title, heading=heading or title,
        posts=posts, pager=pager,
        sidebar_widgets=await core.widgets(lang.get("id", 1)),
        popular=await _popular(lang.get("id", 1)),
        recommended=await core.selected_posts("recommended", lang.get("id", 1)),
        tags=await _tag_cloud(lang.get("id", 1)), **extra)
    return _page(html)


@page_router.get("/posts", response_class=HTMLResponse)
async def all_posts(request: Request):
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    per = core.POST_PER_PAGE_DEFAULT
    total = await db.kms_posts.count_documents({**core.public_post_filter(), "lang_id": lang_id})
    pager = await _paginate(request, total, per)
    posts = await core.latest_posts(lang_id, per, pager["offset"])
    return await _listing(request, title="Posts", posts=posts, pager=pager)


@page_router.get("/tag/{slug}", response_class=HTMLResponse)
async def tag_page(request: Request, slug: str):
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    tag = await db.kms_tags.find_one({"tag_slug": slug, "lang_id": lang_id})
    if not tag:
        return RedirectResponse("/", status_code=303)
    q = {**core.public_post_filter(), "lang_id": lang_id, "tags.slug": slug}
    total = await db.kms_posts.count_documents(q)
    pager = await _paginate(request, total, 10)
    posts = [p async for p in db.kms_posts.find(q).sort("created_at", -1)
             .skip(pager["offset"]).limit(10)]
    return await _listing(request, title=tag.get("tag") or slug, posts=posts, pager=pager,
                          heading=f"#{tag.get('tag')}")


@page_router.get("/search", response_class=HTMLResponse)
async def search(request: Request):
    if (r := await _gate(request)) is not None:
        return r
    q = (request.query_params.get("q") or "").strip()[:300]
    lang_id = (await core.default_lang()).get("id", 1)
    posts, total = [], 0
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        filt = {**core.public_post_filter(), "lang_id": lang_id,
                "$or": [{"title": rx}, {"summary": rx}, {"tags.tag": rx}]}
        total = await db.kms_posts.count_documents(filt)
        pager = await _paginate(request, total, 10)
        posts = [p async for p in db.kms_posts.find(filt).sort("created_at", -1)
                 .skip(pager["offset"]).limit(10)]
    else:
        pager = await _paginate(request, 0, 10)
    return await _listing(request, title=q or "Search", posts=posts, pager=pager,
                          heading=f'{q}' if q else "Search")


@page_router.get("/profile/{slug}", response_class=HTMLResponse)
async def profile(request: Request, slug: str):
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    q = {**core.public_post_filter(), "lang_id": lang_id, "author_slug": slug}
    total = await db.kms_posts.count_documents(q)
    if not total:
        legacy = await db.kms_users_legacy.find_one({"slug": slug})
        if not legacy:
            return RedirectResponse("/", status_code=303)
    pager = await _paginate(request, total, 10)
    posts = [p async for p in db.kms_posts.find(q).sort("created_at", -1)
             .skip(pager["offset"]).limit(10)]
    name = posts[0].get("author_username") if posts else slug.replace("-", " ").title()
    # followers (Phase 4b)
    followers = await db.kms_followers.count_documents({"following_slug": slug})
    me = core.current_user(request)
    is_following = bool(me and await db.kms_followers.find_one(
        {"following_slug": slug, "follower_id": me.get("mid")}))
    return await _listing(request, title=name, posts=posts, pager=pager, heading=name,
                          profile_slug=slug, follower_count=followers,
                          is_following=is_following)


# ── social login parity (Phase 4c-3) ─────────────────────────────────────────
@page_router.get("/connect-with-google")
async def connect_with_google(request: Request):
    """Parity route. The platform removed third-party Google OAuth (see
    routes/auth.py) and no brand has google_client_id configured — matching
    the live install's unconfigured state, the button is absent and this
    route degrades gracefully to the login page."""
    if not await kms_enabled():
        return Response(status_code=404)
    return RedirectResponse("/admin/login?error=google", status_code=303)


# ── Google News feed (Phase 4b) ──────────────────────────────────────────────
@page_router.get("/gnews/feed")
async def gnews_feed(request: Request):
    if not await kms_enabled():
        return Response(status_code=404)
    s = await core.kms_settings()
    if (s.get("general") or {}).get("google_news") != 1:
        return Response(status_code=404)
    lang = await core.default_lang()
    lang_id = lang.get("id", 1)
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    since = (datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S")
    cutoff = (datetime.now(timezone.utc)
              .replace(microsecond=0)).timestamp() - 48 * 3600
    cutoff_str = datetime.fromtimestamp(cutoff, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    posts = [p async for p in db.kms_posts.find(
        {**core.public_post_filter("public"), "lang_id": lang_id,
         "created_at": {"$gte": cutoff_str, "$lte": since}})
        .sort("created_at", -1).limit(100)]
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    site = ls.get("application_name") or "Insights"
    items = []
    for p in posts:
        date = str(p.get("created_at") or "").replace(" ", "T") + "+00:00"
        title = (p.get("title") or "").replace("&", "&amp;").replace("<", "&lt;")
        items.append(
            f"<url><loc>https://{host}/{p.get('slug')}</loc><news:news>"
            f"<news:publication><news:name>{site}</news:name>"
            f"<news:language>{lang.get('short_form') or 'en'}</news:language>"
            f"</news:publication><news:publication_date>{date}</news:publication_date>"
            f"<news:title>{title}</news:title></news:news></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
           + "".join(items) + "</urlset>")
    return Response(xml, media_type="application/xml")


# ── reactions (post detail widget) ───────────────────────────────────────────
REACTIONS = ["like", "dislike", "love", "funny", "angry", "sad", "wow"]


@page_router.post("/reaction/{post_id}/{kind}")
async def add_reaction(request: Request, post_id: int, kind: str):
    if not await kms_enabled() or kind not in REACTIONS:
        return JSONResponse({"ok": False}, status_code=400)
    # tier check: no reactions on posts the caller can't see (R8)
    viewer = await core.resolve_viewer(request)
    post = await db.kms_posts.find_one({"id": post_id}, {"tier": 1, "status": 1})
    if not post or not core.post_visible(post, (viewer or {}).get("tier") or "public"):
        return JSONResponse({"ok": False}, status_code=404)
    await db.kms_reactions.update_one(
        {"post_id": post_id}, {"$inc": {f"re_{kind}": 1}}, upsert=True)
    doc = await db.kms_reactions.find_one({"post_id": post_id}) or {}
    return JSONResponse({"ok": True, "counts": {k: doc.get(f"re_{k}", 0) for k in REACTIONS}})


# ── gallery ──────────────────────────────────────────────────────────────────
async def _render_gallery(request: Request, page_doc: dict):
    lang_id = (await core.default_lang()).get("id", 1)
    albums = [a async for a in db.kms_gallery_albums.find({"lang_id": lang_id}).sort("id", 1)]
    for a in albums:
        cover = await db.kms_gallery.find_one({"album_id": a["id"], "is_album_cover": 1}) or \
                await db.kms_gallery.find_one({"album_id": a["id"]})
        a["cover"] = cover
        a["count"] = await db.kms_gallery.count_documents({"album_id": a["id"]})
    html = await core.render(request, "gallery.html",
                             title=page_doc.get("title") or "Gallery",
                             page=page_doc, albums=albums)
    return _page(html)


@page_router.get("/gallery-album/{album_id}", response_class=HTMLResponse)
async def gallery_album(request: Request, album_id: int):
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    album = await db.kms_gallery_albums.find_one({"id": album_id})
    if not album:
        return RedirectResponse("/", status_code=303)
    images = [g async for g in db.kms_gallery.find({"album_id": album_id}).sort("id", 1)]
    cats = {c["id"]: c async for c in db.kms_gallery_categories.find({"lang_id": lang_id})}
    html = await core.render(request, "gallery_album.html",
                             title=album.get("name") or "Album",
                             album=album, images=images, gallery_cats=cats)
    return _page(html)


# ── cookies banner ───────────────────────────────────────────────────────────
@page_router.post("/close-cookies-warning-post")
async def close_cookies(request: Request):
    resp = JSONResponse({"ok": True})
    resp.set_cookie("kms_cookies_ok", "1", max_age=60 * 60 * 24 * 365)
    return resp


# ── sitemap ──────────────────────────────────────────────────────────────────
@page_router.get("/sitemap.xml")
async def sitemap(request: Request):
    if not await kms_enabled():
        return _guard_response()
    base = "https://" + (request.headers.get("x-forwarded-host") or request.headers.get("host") or "")
    lang_id = (await core.default_lang()).get("id", 1)
    urls = [f"<url><loc>{base}/</loc></url>"]
    for c in await core.categories(lang_id):
        urls.append(f"<url><loc>{base}/{c.get('slug')}</loc></url>")
    async for p in db.kms_posts.find({**core.public_post_filter("public"), "lang_id": lang_id},
                                     {"slug": 1, "updated_at": 1, "created_at": 1}).sort("created_at", -1):
        lastmod = str(p.get("updated_at") or p.get("created_at") or "")[:10]
        lm = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        urls.append(f"<url><loc>{base}/{p.get('slug')}</loc>{lm}</url>")
    async for pg in db.kms_pages.find({"lang_id": lang_id, "visibility": 1,
                                       "page_type": {"$ne": "link"}}, {"slug": 1}):
        urls.append(f"<url><loc>{base}/{pg.get('slug')}</loc></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
           + "".join(urls) + "</urlset>")
    return Response(content=xml, media_type="application/xml")


# ── RSS out ──────────────────────────────────────────────────────────────────
def _rss(request: Request, title: str, posts: list) -> Response:
    base = "https://" + (request.headers.get("x-forwarded-host") or request.headers.get("host") or "")
    items = []
    for p in posts:
        items.append(f"""<item>
<title><![CDATA[{p.get('title','')}]]></title>
<link>{base}/{p.get('slug','')}</link>
<guid>{base}/{p.get('slug','')}</guid>
<pubDate>{p.get('created_at','')}</pubDate>
<description><![CDATA[{p.get('summary') or ''}]]></description>
</item>""")
    xml = (f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>'
           f'<title><![CDATA[{title}]]></title><link>{base}</link><description/>'
           + "".join(items) + "</channel></rss>")
    return Response(content=xml, media_type="application/rss+xml")


@page_router.get("/rss/latest-posts")
async def rss_latest(request: Request):
    if not await kms_enabled():
        return _guard_response()
    lang_id = (await core.default_lang()).get("id", 1)
    return _rss(request, "Latest posts", await core.latest_posts(lang_id, 20))


@page_router.get("/rss/category/{slug}")
async def rss_category(request: Request, slug: str):
    if not await kms_enabled():
        return _guard_response()
    lang_id = (await core.default_lang()).get("id", 1)
    cat = await core.category_by_slug(slug, lang_id)
    if not cat:
        return Response(status_code=404)
    cats = await core.categories(lang_id)
    ids = [cat["id"]] + [c["id"] for c in core.subcategories(cats, cat["id"])]
    return _rss(request, cat.get("name") or slug,
                await core.posts_by_category(ids, lang_id, 20))


@page_router.get("/rss/author/{slug}")
async def rss_author(request: Request, slug: str):
    if not await kms_enabled():
        return _guard_response()
    lang_id = (await core.default_lang()).get("id", 1)
    posts = [p async for p in db.kms_posts.find(
        {**core.public_post_filter("public"), "lang_id": lang_id, "author_slug": slug})
        .sort("created_at", -1).limit(20)]
    return _rss(request, slug, posts)


@page_router.get("/api/latest-posts")
async def api_latest_posts(request: Request, limit: int = 10):
    """JSON teaser feed for the CMS External Blog section (Settings → Blog API
    URL) — the {posts:[{title,image,url,summary}]} shape the old KMS api.php
    served. Anonymous like the RSS feeds: only teaser metadata is exposed;
    clicking through still hits the KMS login gate on gated posts."""
    if not await kms_enabled():
        return _guard_response()
    core.set_viewer_tier("public")   # R9: the beta feed serves the public tier only
    base = _feed_base(request)
    lang_id = (await core.default_lang()).get("id", 1)
    posts = await core.latest_posts(lang_id, max(1, min(limit, 20)))
    return JSONResponse({"posts": [_teaser(p, base) for p in posts]})


def _feed_base(request: Request) -> str:
    return "https://" + (request.headers.get("x-forwarded-host")
                         or request.headers.get("host") or "")


def _teaser(p: dict, base: str) -> dict:
    """One post → the External-Blog teaser shape (absolutized URLs)."""
    img = core.post_image(p, "default")
    if img.startswith("/"):
        img = base + img
    return {"title": p.get("title") or "", "image": img,
            "url": f"{base}/{p.get('slug') or ''}",
            "summary": p.get("summary") or "",
            "date": p.get("created_at") or ""}


@page_router.get("/api/latest-by-category")
async def api_latest_by_category(request: Request, slugs: str = "", limit: int = 3):
    """Grouped teaser feed (EXTERNAL_BLOG_KMS_SECTIONS_PLAN Phase 1): one labelled
    group per requested category/subcategory slug, latest-first. Public tier ONLY
    (R9) — the single data source any KMS-backed website block reads. A pillar
    slug includes its subcategories; a leaf slug is just itself.
    → {sections:[{name, slug, url, posts:[{title,image,url,summary,date}]}]}"""
    if not await kms_enabled():
        return _guard_response()
    core.set_viewer_tier("public")   # R9 — never leak registered/mastermind
    base = _feed_base(request)
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    by_slug = {c.get("slug"): c for c in cats}
    by_id = {c.get("id"): c for c in cats}
    per = max(1, min(limit, 20))
    sections = []
    for slug in [s.strip() for s in (slugs or "").split(",") if s.strip()]:
        cat = by_slug.get(slug)
        if not cat:
            continue
        ids = [cat["id"]] + [c["id"] for c in core.subcategories(cats, cat["id"])]
        posts = await core.posts_by_category(ids, lang_id, per)
        parent = by_id.get(cat.get("parent_id"))
        cat_url = (f"{base}/{parent['slug']}/{cat['slug']}" if parent
                   else f"{base}/{cat['slug']}")
        sections.append({"name": cat.get("name") or slug, "slug": slug,
                         "url": cat_url, "posts": [_teaser(p, base) for p in posts]})
    return JSONResponse({"sections": sections})


@page_router.get("/api/categories")
async def api_categories(request: Request):
    """Public category list for the CMS block-config picker (Phase 4): lets the
    admin pick real KMS categories/subcategories instead of typing slugs.
    → {categories:[{id, name, slug, parent_id}]} (menu order)."""
    if not await kms_enabled():
        return _guard_response()
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    return JSONResponse({"categories": [
        {"id": c.get("id"), "name": c.get("name") or "",
         "slug": c.get("slug") or "", "parent_id": c.get("parent_id") or 0}
        for c in cats]})


# ── catch-alls: /{slug} = page | category | post ; /{a}/{b} = subcat | post ──
async def _render_category(request: Request, cat: dict):
    lang_id = (await core.default_lang()).get("id", 1)
    cats = await core.categories(lang_id)
    ids = [cat["id"]] + [c["id"] for c in core.subcategories(cats, cat["id"])]
    total = await core.count_by_category(ids, lang_id)
    pager = await _paginate(request, total, 10)
    posts = await core.posts_by_category(ids, lang_id, 10, pager["offset"])
    return await _listing(request, title=cat.get("name") or "", posts=posts, pager=pager)


async def _reader_gate(request: Request, post: dict, viewer: dict):
    """Block 4 (B4.1): pre_registered FREE leads read a limited number of DISTINCT
    posts, then the paywall. Only `subscriber` leads on the free tier are gated —
    members (level), staff and PAID readers are exempt. Re-reading a post already
    counted does NOT consume. Returns (allowed: bool, used: int, limit: int)."""
    email = (viewer or {}).get("subscriber")
    if not email:
        return True, 0, 0
    m = await db.members.find_one({"email": email}, {"reader_tier": 1, "kms_reads": 1,
                                                     "reader_subscription_id": 1, "reader_expires_at": 1,
                                                     "member_id": 1, "membership_source": 1,
                                                     "membership_expires_at": 1, "membership_subscription_id": 1})
    if m and m.get("membership_source") == "paid":
        # s149: an expired paid membership loses everything, the KMS included
        from routes.paid_membership import membership_lapsed
        if await membership_lapsed(m):
            s = await db.settings.find_one({}, {"_id": 0, "kms_free_read_limit": 1}) or {}
            lim = int(s.get("kms_free_read_limit") or 5)
            return False, lim, lim
    if m and m.get("reader_tier") == "paid" and not m.get("reader_subscription_id")             and (m.get("reader_expires_at") or "9999") < datetime.now(timezone.utc).isoformat():
        # s149: coupon access (no Stripe subscription to cancel) ends at its expiry
        await db.members.update_one({"email": email}, {"$set": {"reader_tier": "free"}})
        m["reader_tier"] = "free"
    if not m or (m.get("reader_tier") or "free") == "paid":
        return True, 0, 0
    s = await db.settings.find_one({}, {"_id": 0, "kms_free_read_limit": 1}) or {}
    try:
        limit = int(s.get("kms_free_read_limit") or 5)
    except (TypeError, ValueError):
        limit = 5
    reads = m.get("kms_reads") or []
    pid = post.get("id")
    if pid in reads:
        return True, len(reads), limit
    if len(reads) >= limit:
        return False, len(reads), limit
    await db.members.update_one({"email": email}, {"$addToSet": {"kms_reads": pid}})
    return True, len(reads) + 1, limit


async def _render_paywall(request: Request, post: dict, used: int, limit: int):
    s = await db.settings.find_one({}, {"_id": 0, "kms_reader_pricing": 1}) or {}
    pricing = s.get("kms_reader_pricing") or {}
    try:
        monthly = int(pricing.get("monthly") or 100)
        annual = int(pricing.get("annual") or 900)
    except (TypeError, ValueError):
        monthly, annual = 100, 900
    renew_url = ""
    viewer = getattr(request.state, "kms_viewer", None) or {}
    if viewer.get("subscriber"):
        mm = await db.members.find_one({"email": viewer["subscriber"]}, {"membership_source": 1})
        if (mm or {}).get("membership_source") == "paid":
            site = ((await db.settings.find_one({}, {"_id": 0, "site_url": 1})) or {}).get("site_url") or ""
            renew_url = site.rstrip("/") + "/membership"
    html = await core.render(
        request, "paywall.html", title="Continue reading", post=post,
        used=used, limit=limit, price_monthly=monthly, price_annual=annual, renew_url=renew_url)
    return _page(html)


async def _reader_prices() -> tuple:
    s = await db.settings.find_one({}, {"_id": 0, "kms_reader_pricing": 1}) or {}
    pricing = s.get("kms_reader_pricing") or {}
    try:
        return int(pricing.get("monthly") or 100), int(pricing.get("annual") or 900)
    except (TypeError, ValueError):
        return 100, 900


@page_router.post("/reader-coupon/validate")
async def reader_coupon_validate(request: Request):
    """s149 — check an MMS coupon for the chosen plan and quote the final price.
    Informative only: the checkout re-validates everything server-side."""
    from utils import mms_coupons
    email = (request.cookies.get(core.SUBSCRIBER_COOKIE) or "").strip().lower()
    if not email or "@" not in email:
        return JSONResponse({"ok": False, "message": "Please subscribe with your email first."})
    try:
        body = await request.json()
    except Exception:
        body = {}
    plan = (body.get("plan") or "monthly").lower()
    if plan not in ("monthly", "annual"):
        plan = "monthly"
    try:
        c = await mms_coupons.find_usable(body.get("code") or "", plan, email)
    except mms_coupons.CouponError as e:
        return JSONResponse({"ok": False, "message": str(e)})
    monthly, annual = await _reader_prices()
    price = annual if plan == "annual" else monthly
    return JSONResponse({"ok": True, "code": c["code"], "plan": c.get("plan") or plan,
                         "discount_type": c.get("discount_type"), "value": c.get("value"),
                         "list_price": price, "final_price": mms_coupons.final_price(price, c)})


@page_router.post("/reader-coupon/release")
async def reader_coupon_release(request: Request):
    """s149 — reader came back from Stripe without paying: free the coupon."""
    from utils import mms_coupons
    email = (request.cookies.get(core.SUBSCRIBER_COOKIE) or "").strip().lower()
    if not email:
        return JSONResponse({"ok": True, "released": 0})
    return JSONResponse({"ok": True, "released": await mms_coupons.release_for(email)})


async def _activate_reader_with_coupon(email: str, plan: str, coupon: dict, list_price: float) -> None:
    """s149 — $0 after the coupon: no Stripe. The reader becomes paid right away
    and the purchase is recorded like a Stripe one (flag `paid_with_coupon`) so
    the operator keeps track of every reader. Points as for a paid subscription
    (on the list price — the coupon never changes points)."""
    from utils import mms_coupons
    from routes.payments import _add_months
    _now = datetime.now(timezone.utc)
    now = _now.isoformat()
    # access lasts one period of the plan, like a paid one (no Stripe renewal)
    expires_iso = _add_months(_now, 12 if plan == "annual" else 1).isoformat()
    txn = f"coupon-{coupon['code']}-{uuid.uuid4().hex[:8]}"
    if not await mms_coupons.consume(coupon["id"], email, txn, plan, list_price, 0.0):
        raise mms_coupons.CouponError("This coupon has already been used.")
    md = {"kind": "kms_reader", "email": email, "plan": plan, "paid_with_coupon": True,
          "coupon_id": coupon["id"], "coupon_code": coupon["code"], "list_amount": list_price}
    await db.members.update_one({"email": email}, {"$set": {
        "reader_tier": "paid", "reader_plan": plan, "reader_subscription_id": "",
        "reader_paid_at": now, "reader_paid_with_coupon": coupon["code"],
        "reader_expires_at": expires_iso}})
    await db.kms_reader_subscriptions.insert_one({
        "email": email, "plan": plan, "amount": 0, "list_amount": list_price,
        "session_id": txn, "status": "active", "paid_at": now, "created_at": now,
        "expires_at": expires_iso,
        "paid_with_coupon": True, "coupon_code": coupon["code"], "gateway": "coupon"})
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()), "session_id": txn, "gateway": "coupon",
        "service_name": f"KMS Reader — {plan.title()} · {email}",
        "amount": 0.0, "list_amount": list_price, "currency": "usd",
        "status": "complete", "payment_status": "paid", "paid_with_coupon": True,
        "coupon_code": coupon["code"], "paid_at": now, "created_at": now, "metadata": md})
    from utils import subscription_emails
    subscription_emails.kms_purchase(email, plan=plan, list_price=list_price, paid=0,
                                     coupon=coupon["code"], expires=expires_iso, reference=txn)
    try:
        from utils.mms_events import emit_soon
        payer = await db.members.find_one({"email": email}, {"_id": 1, "membership_number": 1})
        if payer:
            mnum, pmid = payer.get("membership_number"), str(payer.get("_id"))
            emit_soon(db, {"type": "kms_reader_paid", "source": "kms",
                           "membership_number": mnum, "mid": pmid,
                           "payload": {"plan": plan, "amount": list_price, "source": "kms_reader",
                                       "coupon": coupon["code"], "paid": 0},
                           "event_key": f"kms-reader-paid:{txn}"})
            emit_soon(db, {"type": "referral_paid", "source": "kms",
                           "membership_number": mnum, "mid": pmid,
                           "payload": {"amount": list_price, "source": "kms_reader", "coupon": coupon["code"]},
                           "event_key": f"referral-paid:kms:{txn}"})
    except Exception:
        logger.warning("MMS reward emit on coupon reader activation failed", exc_info=True)


@page_router.post("/reader-checkout")
async def reader_checkout(request: Request):
    """B4.2 — Stripe Checkout (subscription) for the KMS reader tier. Monthly/annual
    price come from `settings.kms_reader_pricing` (inline price_data → no Stripe Price
    IDs to pre-create). On payment the webhook flips the member to reader_tier=paid.
    s149: optional `coupon` (MMS) — discount on every charge; $0 skips Stripe.
    Key-gated: returns a friendly message when Stripe is not configured yet."""
    import asyncio as _asyncio
    from utils import mms_coupons
    from utils.runtime_config import get_stripe_api_key
    email = (request.cookies.get(core.SUBSCRIBER_COOKIE) or "").strip().lower()
    if not email or "@" not in email:
        return JSONResponse({"ok": False, "message": "Please subscribe with your email first."})
    plan = (request.query_params.get("plan") or "monthly").lower()
    if plan not in ("monthly", "annual"):
        plan = "monthly"
    monthly, annual = await _reader_prices()
    amount = annual if plan == "annual" else monthly
    nxt = request.query_params.get("next") or "/"
    if not nxt.startswith("/") or nxt.startswith("//"):
        nxt = "/"
    coupon = None
    code = (request.query_params.get("coupon") or "").strip()
    if code:
        try:
            coupon = await mms_coupons.find_usable(code, plan, email)
            if mms_coupons.final_price(amount, coupon) <= 0:
                await mms_coupons.reserve(coupon, email)
                await _activate_reader_with_coupon(email, plan, coupon, float(amount))
                return JSONResponse({"ok": True, "url": f"{nxt}?subscribed=1", "free": True})
        except mms_coupons.CouponError as e:
            return JSONResponse({"ok": False, "message": str(e)})
    api_key = await get_stripe_api_key()
    if not api_key:
        return JSONResponse({"ok": False,
                             "message": "Payments are being set up — please check back soon."})
    interval = "year" if plan == "annual" else "month"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    base = f"https://{host}"
    # One Stripe account serves the 3 brands: the brand goes in the product name
    # (invoices, receipts, Subscriptions list), the subscription description and the
    # `site`/`brand` metadata.
    from utils.runtime_config import stripe_brand
    brand = await stripe_brand()
    md = {"kind": "kms_reader", "email": email, "plan": plan, "site": brand["site"], "brand": brand["name"]}
    product = f"{brand['name'] or 'Reader'} · KMS Reader — {plan.title()}"
    discounts = None
    if coupon:
        try:
            await mms_coupons.reserve(coupon, email)
            scid = await mms_coupons.stripe_coupon_id(coupon, api_key, brand)
        except mms_coupons.CouponError as e:
            return JSONResponse({"ok": False, "message": str(e)})
        except Exception as e:
            logger.error("reader-checkout stripe coupon error: %s", e)
            await mms_coupons.release_for(email)
            return JSONResponse({"ok": False, "message": "Could not apply the coupon. Please try again."})
        discounts = [{"coupon": scid}]
        md.update({"coupon_id": coupon["id"], "coupon_code": coupon["code"], "list_amount": str(amount)})

    def _create():
        import stripe
        extra = {"discounts": discounts} if discounts else {}
        return stripe.checkout.Session.create(
            api_key=api_key, mode="subscription",
            line_items=[{"price_data": {
                "currency": "usd",
                "product_data": {"name": product},
                "unit_amount": amount * 100, "recurring": {"interval": interval}},
                "quantity": 1}],
            success_url=f"{base}{nxt}?subscribed=1",
            cancel_url=f"{base}{nxt}?checkout=cancelled",
            customer_email=email, metadata=md,
            subscription_data={"metadata": md, "description": product}, **extra)

    try:
        session = await _asyncio.to_thread(_create)
    except Exception as e:
        logger.error("reader-checkout stripe error: %s", e)
        if coupon:
            await mms_coupons.release_for(email)
        return JSONResponse({"ok": False, "message": "Could not start checkout. Please try again."})
    if coupon:
        await mms_coupons.attach_session(coupon["id"], session.id)
    await db.kms_reader_subscriptions.insert_one({
        "email": email, "plan": plan, "amount": amount, "session_id": session.id,
        "status": "initiated", "created_at": datetime.now(timezone.utc).isoformat(),
        **({"coupon_code": coupon["code"], "final_amount": mms_coupons.final_price(amount, coupon)} if coupon else {})})
    return JSONResponse({"ok": True, "url": session.url})


async def _render_post(request: Request, post: dict, preview: bool = False):
    # defense in depth (R8): callers reach here via tier-filtered queries, but a
    # direct caller with an above-tier post gets not-found (admin preview exempt)
    if not preview and not core.post_visible(post):
        return _guard_response()
    # Block 4 — free-tier reading cap for pre_registered FREE leads (before content)
    reader_used, reader_limit = 0, 0
    if not preview:
        _viewer = await core.resolve_viewer(request)
        _allowed, reader_used, reader_limit = await _reader_gate(request, post, _viewer)
        if not _allowed:
            return await _render_paywall(request, post, reader_used, reader_limit)
    lang_id = (await core.default_lang()).get("id", 1)
    me = core.current_user(request)
    if not preview:
        await db.kms_posts.update_one({"id": post["id"]}, {"$inc": {"pageviews": 1}})
        await _record_member_view(request, post, me)
    reactions = await db.kms_reactions.find_one({"post_id": post["id"]}) or {}
    cats = await core.categories(lang_id)
    cat = next((c for c in cats if c["id"] == post.get("category_id")), None)
    related = await core.posts_by_category(
        [post.get("category_id")], lang_id, 5) if post.get("category_id") else []
    related = [p for p in related if p["id"] != post["id"]][:4]
    # comments (Phase 4a): approved only, threaded one level via parent_id
    s = await core.kms_settings()
    gs = s.get("general") or {}
    comments_enabled = gs.get("comment_system") == 1
    comments, comment_replies = [], {}
    my_likes = set()
    if comments_enabled:
        rows = [c async for c in db.kms_comments
                .find({"post_id": post["id"], "status": 1}).sort("id", 1)]
        comments = [c for c in rows if not c.get("parent_id")]
        for c in rows:
            if c.get("parent_id"):
                comment_replies.setdefault(c["parent_id"], []).append(c)
        if me and rows:
            my_likes = {cl["comment_id"] async for cl in db.kms_comment_likes.find(
                {"user_id": me.get("mid"),
                 "comment_id": {"$in": [c["id"] for c in rows]}})}
    # reading list state (Phase 4b)
    in_reading_list = bool(me and await db.kms_reading_lists.find_one(
        {"post_id": post["id"], "user_id": me.get("mid")}))
    # meta-row parity with the live install: comment/view counts + share row + Edit
    comment_count = await db.kms_comments.count_documents(
        {"post_id": post["id"], "status": 1})
    from kms.admin import _author_slug
    can_edit = bool(me and (me.get("a") or
                            (me.get("au") and post.get("author_slug") == _author_slug(me))))
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    share_url = f"https://{host}/{post.get('slug')}"
    # members share ref-coded URLs (?ref=<membership_id>, D4) — referral attribution
    share_ref_url = share_url
    if me and me.get("m") is not None:
        mem = await db.members.find_one(
            {"membership_number": me.get("m") or 0}, {"membership_id": 1})
        if mem and mem.get("membership_id"):
            share_ref_url = f"{share_url}?ref={mem['membership_id']}"
    # in-content ad injection + per-category ad filter (Phase 4b)
    post = {**post}
    ads = await core.ads_map(lang_id, request)
    for name in list(ads):
        cat_filter = ads[name].get("display_category_id")
        if cat_filter and cat_filter != post.get("category_id"):
            del ads[name]
    # quiz / poll / recipe context (Phase 4c-2) — answers sanitized server-side
    quiz_public, poll_agg, recipe = None, None, None
    if post.get("post_type") in ("trivia_quiz", "personality_quiz", "poll"):
        qz = (post.get("post_data") or {}).get("quiz") or {}
        quiz_public = {"questions": [
            {"question": q.get("question"), "description": q.get("description"),
             "image": q.get("image"),
             "answers": [a.get("text") for a in (q.get("answers") or [])]}
            for q in (qz.get("questions") or [])]}
        if post["post_type"] == "poll":
            from kms.interact import poll_post_aggregates
            poll_agg = await poll_post_aggregates(post, (me or {}).get("mid"))
    elif post.get("post_type") == "recipe":
        recipe = (post.get("post_data") or {}).get("recipe") or {}
    # Reading-comprehension quiz (member-only, article-attached). Stage 1: presentation
    # only — no attempt/score persistence yet (the Member-Points hook comes later). Gated
    # on `me` (a real member/staff session; free readers hold a subscriber cookie, not a
    # session) so the quiz + its answers are never emitted to anonymous/free-tier viewers.
    post_quiz = None
    if me:
        qz_doc = await db.kms_post_quizzes.find_one(
            {"post_id": post["id"], "active": {"$ne": 0}})
        if qz_doc and qz_doc.get("questions"):
            post_quiz = {"post_id": post["id"], "questions": [
                {"q": (q.get("q") or q.get("question") or ""),
                 "options": [str(o) for o in (q.get("options") or [])],
                 "correct": int(q.get("correct") or 0),
                 "explanation": (q.get("explanation") or "")}
                for q in qz_doc["questions"] if q.get("options")]}
    pc = ads.get("post_content")
    if pc and pc.get("paragraph_number") and pc.get("ad_code_desktop"):
        content = post.get("content") or ""
        ends = [mt.end() for mt in re.finditer(r"</p\s*>", content, flags=re.I)]
        if ends:
            cut = ends[min(int(pc["paragraph_number"]), len(ends)) - 1]
            ad_html = ('<div class="ad-space ad-post-content">'
                       f'<div class="ad-desktop">{pc.get("ad_code_desktop") or ""}</div>'
                       f'<div class="ad-mobile">{pc.get("ad_code_mobile") or ""}</div></div>')
            post["content"] = content[:cut] + ad_html + content[cut:]
    # Re-inject the brief's own scoped CSS (stored apart from `content` so a TinyMCE
    # save in the admin can't strip it). Prepending it here keeps ingested briefs on
    # their brand colours/layout no matter how often the post is edited.
    if post.get("doc_css"):
        # iiReport: re-tint the stored house style to today's palette (Settings →
        # Colors → KMS / Website), so existing reports follow a colour change.
        from kms import iireport
        post["doc_css"] = iireport.retint(
            post["doc_css"], await core.cms_settings(),
            ((await core.kms_settings()).get("general") or {}).get("theme_colors"))
        post["content"] = ('<style data-kms-doc="1">\n' + post["doc_css"]
                            + '\n</style>\n' + (post.get("content") or ""))
    html = await core.render(
        request, "post.html", title=post.get("title") or "",
        description=core.strip_tags(post.get("summary") or "", 200),
        post=post, cat=cat, related=related,
        reactions={k: reactions.get(f"re_{k}", 0) for k in REACTIONS},
        comments_enabled=comments_enabled, comments=comments,
        comment_replies=comment_replies, my_likes=my_likes,
        comment_pending=bool(request.query_params.get("cp")),
        comment_count=comment_count, can_edit=can_edit, share_url=share_url,
        share_ref_url=share_ref_url,
        in_reading_list=in_reading_list, ads=ads,
        quiz_public=quiz_public, poll_agg=poll_agg, recipe=recipe,
        post_quiz=post_quiz,
        sidebar_widgets=await core.widgets(lang_id),
        popular=await _popular(lang_id),
        recommended=await core.selected_posts("recommended", lang_id),
        tags=await _tag_cloud(lang_id),
        reader_used=reader_used, reader_limit=reader_limit,
        og_image=core.post_image(post, "big"), preview=preview)
    return _page(html)


async def _render_page(request: Request, page_doc: dict):
    html = await core.render(
        request, "page.html", title=page_doc.get("title") or "", page=page_doc)
    return _page(html)


@page_router.get("/{slug}", response_class=HTMLResponse)
async def any_slug(request: Request, slug: str):
    if slug in RESERVED:
        return Response(status_code=404)
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    # page -> category -> post (live-install disambiguation order)
    page_doc = await core.page_by_slug(slug, lang_id)
    if page_doc and page_doc.get("page_type") != "link":
        if page_doc.get("page_default_name") == "gallery":
            return await _render_gallery(request, page_doc)
        return await _render_page(request, page_doc)
    cat = await core.category_by_slug(slug, lang_id)
    if cat:
        return await _render_category(request, cat)
    post = await core.post_by_slug(slug)
    if post:
        return await _render_post(request, post)
    return RedirectResponse("/", status_code=303)


@page_router.get("/{parent}/{slug}", response_class=HTMLResponse)
async def two_segments(request: Request, parent: str, slug: str):
    if parent in RESERVED:
        return Response(status_code=404)
    if (r := await _gate(request)) is not None:
        return r
    lang_id = (await core.default_lang()).get("id", 1)
    cat = await core.category_by_slug(slug, lang_id)
    if cat and cat.get("parent_id"):
        return await _render_category(request, cat)
    post = await core.post_by_slug(slug)
    if post:
        return await _render_post(request, post)
    return RedirectResponse("/", status_code=303)
