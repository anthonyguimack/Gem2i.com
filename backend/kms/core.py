"""KMS core — settings/session/i18n/data helpers + Jinja environment."""
import base64
import hashlib
import html
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import jwt as pyjwt
from fastapi import Request
from fastapi.responses import FileResponse, RedirectResponse, Response
from jinja2 import ChoiceLoader, Environment, FileSystemLoader, select_autoescape

from models.database import JWT_SECRET, db, verify_password  # noqa: F401

logger = logging.getLogger(__name__)

KMS_COOKIE = "kms_session"
DARK_COOKIE = "kms_dark"
KMS_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = KMS_DIR.parent / "uploads" / "kms"

# Paths that can never be treated as a post/category/page slug (catch-all guard)
RESERVED = {
    "", "admin", "login", "logout", "sso-login", "register", "search", "posts",
    "tag", "profile", "rss", "rss-feeds", "reading-list", "gallery-album",
    "uploads", "kms-static", "brand", "cat-thumb", "switch-dark-mode", "favicon.ico", "sitemap.xml",
    "api", "preview", "forgot-password", "reset-password", "confirm-email",
    "unsubscribe", "contact-post", "add-newsletter-post", "download-file",
    "comment-add", "poll-vote", "comment-like", "reading-list-toggle",
    "follow-user-post", "gnews", "quiz-submit", "post-poll-vote",
    "internal", "connect-with-google", "share-track", "subscribe",
}


def s3_put(gs: dict, key: str, data: bytes, mime: str) -> str | None:
    """Upload to the KMS S3 bucket when storage == aws_s3 (Phase 4c-3).
    Returns the public https URL, or None (caller falls back to local disk)."""
    if (gs.get("storage") or "local") != "aws_s3":
        return None
    bucket = (gs.get("aws_bucket") or "").strip()
    region = (gs.get("aws_region") or "us-east-1").strip()
    if not bucket or not (gs.get("aws_key") or "").strip():
        return None
    try:
        import boto3
        client = boto3.client("s3", region_name=region,
                              aws_access_key_id=gs.get("aws_key"),
                              aws_secret_access_key=gs.get("aws_secret"))
        client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=mime)
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    except Exception:
        logger.warning("kms s3 upload failed for %s — falling back to local", key,
                       exc_info=True)
        return None

POST_PER_PAGE_DEFAULT = 10


# ── flag gate ────────────────────────────────────────────────────────────────
async def kms_enabled() -> bool:
    s = await db.settings.find_one({}, {"kms_native_enabled": 1}) or {}
    return bool(s.get("kms_native_enabled"))


# ── settings / language ─────────────────────────────────────────────────────
_cache = {"t": 0.0, "settings": None, "trans": {}, "langs": None}
_CACHE_TTL = 30  # seconds — cheap consistency window, same spirit as news probes


async def kms_settings(force: bool = False) -> dict:
    now = time.monotonic()
    if force or _cache["settings"] is None or now - _cache["t"] > _CACHE_TTL:
        doc = await db.kms_settings.find_one({"key": "kms"}) or {}
        langs = [l async for l in db.kms_languages.find({}).sort("id", 1)]
        _cache.update(t=now, settings=doc, langs=langs, trans={})
    return _cache["settings"] or {}


async def kms_languages() -> list:
    await kms_settings()
    return _cache["langs"] or []


# ── brand social links (SOCIAL_LINKS_KMS_SYNC_PLAN) ──────────────────────────
# CMS Settings → Social Links is the single source of truth. The KMS runs on the
# same DB, so it reads db.settings directly (cached, same 30s window as everything
# else) — no sync, no API hop. Drives the footer links AND the post share buttons.
_cms_cache = {"t": 0.0, "doc": None}


async def cms_settings(force: bool = False) -> dict:
    """The main CMS settings doc (db.settings), cached with the shared 30s TTL."""
    now = time.monotonic()
    if force or _cms_cache["doc"] is None or now - _cms_cache["t"] > _CACHE_TTL:
        _cms_cache.update(t=now, doc=await db.settings.find_one({}) or {})
    return _cms_cache["doc"] or {}


# ── brand marks: the platform CMS is the single source of truth ──────────────
# The KMS used to keep its OWN copies of the brand artwork (kms_settings.general
# .logo / .logo_footer / .logo_email / .favicon), so every brand maintained two
# versions of the same marks, free to drift apart. They are now ABSORBED from the
# main CMS (Settings → General), one slot each:
#     KMS Logo        ← CMS "Logo On #2"  (scrolled header — the on-light mark)
#     KMS Footer Logo ← CMS "Logo On #1"  (hero/initial — the on-dark mark)
#     KMS Email Logo  ← CMS "Logo On #2"
#     KMS Favicon     ← CMS Favicon
# Same-DB read, like brand_social_links — no sync, no API hop. The legacy KMS
# value survives ONLY as a fallback while a brand's CMS slot is still empty, so a
# half-configured brand never renders a blank header.
CMS_LOGO_SLOTS = {"logo": "logo_on_2", "logo_footer": "logo_on_1",
                  "logo_email": "logo_on_2", "favicon": "favicon"}


async def brand_asset_value(slot: str) -> str:
    """The RAW stored value behind a brand slot, CMS-first (see CMS_LOGO_SLOTS)."""
    cms_key = CMS_LOGO_SLOTS.get(slot)
    if not cms_key:
        return ""
    val = ((await cms_settings()).get(cms_key) or "").strip()
    if not val:
        val = (((await kms_settings()).get("general") or {}).get(slot) or "").strip()
    return val


def brand_asset_url(slot: str, value: str) -> str:
    """URL for a brand mark. A CMS mark is a data-URI or an `/api/uploads/*` path,
    and neither is reachable on the KMS host (the insights vhost maps `/` →
    `<port>/insights/`, so the CMS's /api/uploads mount is not served here) — so
    anything not already absolute goes back through the KMS's own /brand/<slot>.
    The digest busts the browser cache the moment the artwork changes in the CMS."""
    v = (value or "").strip()
    if not v:
        return ""
    if v.startswith(("http://", "https://")):
        return v
    return f"/brand/{slot}?v={hashlib.sha1(v.encode('utf-8')).hexdigest()[:8]}"


async def brand_logos() -> dict:
    """{slot: url} for the four brand marks, ready to drop into a template."""
    cs = await cms_settings()
    gs = (await kms_settings()).get("general") or {}
    out = {}
    for slot, cms_key in CMS_LOGO_SLOTS.items():
        raw = (cs.get(cms_key) or "").strip() or (gs.get(slot) or "").strip()
        out[slot] = brand_asset_url(slot, raw)
    # A brand with no dedicated footer mark keeps falling back to the header one.
    out["logo_footer"] = out["logo_footer"] or out["logo"]
    return out


def brand_asset_response(value: str):
    """Serve a stored brand mark as bytes from the KMS origin. Handles the
    data-URI / `/api/uploads/*` (main CMS) / `/uploads/*` (KMS) forms. Returns
    None when the value resolves to nothing servable."""
    v = (value or "").strip()
    if not v:
        return None
    if v.startswith("data:"):
        try:
            header, b64 = v.split(",", 1)
            mime = header[5:].split(";")[0] or "image/png"
            return Response(content=base64.b64decode(b64), media_type=mime)
        except Exception:
            return None
    p = v.lstrip("/")
    if p.startswith("api/uploads/"):
        base, rel = UPLOADS_DIR.parent, p[len("api/uploads/"):]   # backend/uploads/<f>
    elif p.startswith("uploads/"):
        base, rel = UPLOADS_DIR, p[len("uploads/"):]              # backend/uploads/kms/<f>
    else:
        return None
    fp = (base / rel).resolve()
    if not (str(fp).startswith(str(base.resolve())) and fp.is_file()):
        return None
    return FileResponse(fp)


def brand_asset_path(value: str):
    """Resolved on-disk Path behind a stored asset ref (/api/uploads/* or /uploads/*),
    or None (data-URIs and external URLs have no local path). Path-traversal guarded."""
    v = (value or "").strip()
    if not v or v.startswith(("data:", "http://", "https://")):
        return None
    p = v.lstrip("/")
    if p.startswith("api/uploads/"):
        base, rel = UPLOADS_DIR.parent, p[len("api/uploads/"):]
    elif p.startswith("uploads/"):
        base, rel = UPLOADS_DIR, p[len("uploads/"):]
    else:
        return None
    fp = (base / rel).resolve()
    if not (str(fp).startswith(str(base.resolve())) and fp.is_file()):
        return None
    return fp


def brand_asset_bytes(value: str):
    """Raw bytes behind a stored brand mark (data-URI / /api/uploads/* /uploads/*),
    or None. Twin of brand_asset_response but returns bytes, for compositing the
    brand watermark onto uploaded images server-side (per-brand, at ingest)."""
    v = (value or "").strip()
    if not v:
        return None
    if v.startswith("data:"):
        try:
            return base64.b64decode(v.split(",", 1)[1])
        except Exception:
            return None
    fp = brand_asset_path(v)
    if not fp:
        return None
    try:
        return fp.read_bytes()
    except Exception:
        return None


def composite_watermark(im, logo_bytes):
    """Burn the brand logo bottom-right — the SERVER-SIDE twin of admin.js
    drawWatermark (width 20% of the image, 4% margin, 85% opacity). This lets every
    brand watermark its OWN uploads with its own logo_on_1, regardless of the upload
    path, instead of the browser baking one brand's mark that then travels on copy.
    Returns `im` unchanged if Pillow or the logo can't be loaded."""
    if not logo_bytes:
        return im
    try:
        from io import BytesIO
        from PIL import Image
        logo = Image.open(BytesIO(logo_bytes)).convert("RGBA")
    except Exception:
        return im
    cw, ch = im.size
    if not logo.width or not logo.height:
        return im
    tw = max(1, round(cw * 0.20))
    th = max(1, round(logo.height * (tw / logo.width)))
    m = round(cw * 0.04)
    try:
        logo = logo.resize((tw, th), Image.LANCZOS)
        alpha = logo.split()[3].point(lambda a: int(a * 0.85))
        logo.putalpha(alpha)
        base = im.convert("RGBA")
        base.alpha_composite(logo, (cw - tw - m, ch - th - m))
        return base.convert("RGB")
    except Exception:
        return im


def _whiten(logo):
    """Recolor a company logo to a solid-WHITE silhouette so it reads on the dark
    default background. Returns an RGBA image (white RGB, alpha = the mark's own
    shape) CROPPED to the mark's bounding box, or None when there is nothing to
    show.

    Robust to three logo kinds:
      • transparent PNG → the alpha channel IS the shape (kept soft for clean
        anti-aliased edges);
      • opaque plate (solid background) → knock the background out by COLOUR
        distance from the (uniform) corner colour, not luminance, so the artwork
        can be any colour on any plate;
      • grey / anti-aliased wordmark → the extracted mask is BINARISED so a grey
        mark becomes solid white, not the semi-transparent grey the old
        luminance ramp produced.
    The bounding-box crop strips the empty margins many source logos carry, which
    is what pushed a padded square logo (e.g. NETFLIX 200×200) down to the bottom
    once it was scaled to the target width."""
    from PIL import Image, ImageChops
    rgba = logo.convert("RGBA")
    a = rgba.split()[3]
    if a.getextrema()[0] < 245:                    # genuine transparency = the shape
        mask = a                                   # keep soft edges
    else:                                          # opaque plate: knock out the bg
        W, H = rgba.size
        corners = [rgba.getpixel(p)[:3] for p in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1))]
        bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))
        diff = ImageChops.difference(rgba.convert("RGB"), Image.new("RGB", rgba.size, bg))
        # Binarise: any pixel meaningfully different from the plate → solid white.
        mask = diff.convert("L").point(lambda v: 0 if v < 24 else 255)
    w = Image.new("RGBA", rgba.size, (255, 255, 255, 0))
    w.putalpha(mask)
    bbox = mask.getbbox()
    return w.crop(bbox) if bbox else w


def compose_category_thumb(base_bytes, company_logo_bytes=None, brand_bytes=None,
                           logo_frac=0.45, max_h_frac=0.24, center_frac=0.55,
                           out_width=900):
    """Bake a single thumbnail = default background + (optional) white company logo
    centered below the title + (optional) brand watermark bottom-right. Mirrors the
    Morning-Brief/watermark compositing. Returns JPEG bytes, or the raw background
    bytes if Pillow is unavailable."""
    try:
        from io import BytesIO
        from PIL import Image
    except Exception:
        return base_bytes
    try:
        base = Image.open(BytesIO(base_bytes)).convert("RGBA")
    except Exception:
        return base_bytes
    W, H = base.size
    # White company logo, CENTERED below the title. The whitened logo is cropped to
    # its own bounding box, then scaled to fit BOTH a max width and a max height (so
    # a tall/square logo can't overflow to the bottom), and centered on center_frac.
    if company_logo_bytes:
        try:
            logo = _whiten(Image.open(BytesIO(company_logo_bytes)).convert("RGBA"))
            if logo and logo.width and logo.height:
                scale = min(W * logo_frac / logo.width, H * max_h_frac / logo.height)
                tw = max(1, round(logo.width * scale))
                th = max(1, round(logo.height * scale))
                base.alpha_composite(logo.resize((tw, th), Image.LANCZOS),
                                     ((W - tw) // 2, round(H * center_frac) - th // 2))
        except Exception:
            pass
    # Brand watermark (per-instance logo_on_1), bottom-right, like every KMS upload.
    if brand_bytes:
        try:
            br = Image.open(BytesIO(brand_bytes)).convert("RGBA")
            if br.width and br.height:
                bw = max(1, round(W * 0.20))
                bh = max(1, round(br.height * (bw / br.width)))
                m = round(W * 0.04)
                br = br.resize((bw, bh), Image.LANCZOS)
                al = br.split()[3].point(lambda a: int(a * 0.85))
                br.putalpha(al)
                base.alpha_composite(br, (W - bw - m, H - bh - m))
        except Exception:
            pass
    out = base.convert("RGB")
    if out_width and out.width > out_width:
        out = out.resize((out_width, round(out.height * out_width / out.width)), Image.LANCZOS)
    buf = BytesIO()
    out.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


async def brand_social_links(active_only: bool = True) -> list:
    """Active brand networks joined to the shared catalog. Each entry:
      {key, label, icon, svg, url, share_url, share_capable}
    `share_url` is the catalog template ({url}/{title}/{image}) or None. Rows with
    no URL are skipped (nothing to link to); a genuine custom row renders as a
    display-only link with a generic glyph."""
    from utils.social_catalog import get as _catalog_get, resolve_key as _resolve_key, GENERIC_SVG
    s = await cms_settings()
    out = []
    for row in (s.get("social_links") or []):
        if not isinstance(row, dict):
            continue
        if active_only and row.get("active") is False:
            continue
        url = (row.get("url") or "").strip()
        if not url:
            continue
        key = row.get("key") or _resolve_key(platform=row.get("platform", ""),
                                              icon=row.get("icon", ""))
        entry = _catalog_get(key) if key else None
        if entry:
            out.append({"key": entry["key"], "label": row.get("platform") or entry["label"],
                        "icon": entry["icon"], "svg": entry["svg"], "url": url,
                        "share_url": entry["share_url"], "share_capable": entry["share_capable"]})
        else:
            out.append({"key": "", "label": row.get("platform") or "Link",
                        "icon": "website", "svg": GENERIC_SVG, "url": url,
                        "share_url": None, "share_capable": False})
    return out


def share_href(template: str, url: str = "", title: str = "", image: str = "") -> str:
    """Fill a catalog share_url template with url-encoded post values (Jinja filter)."""
    from urllib.parse import quote
    if not template:
        return url or "#"
    return (template.replace("{url}", quote(url or "", safe=""))
                    .replace("{title}", quote(title or "", safe=""))
                    .replace("{image}", quote(image or "", safe="")))


async def default_lang() -> dict:
    langs = await kms_languages()
    s = await kms_settings()
    site_lang = (s.get("general") or {}).get("site_lang") or 1
    for l in langs:
        if l.get("id") == site_lang:
            return l
    return langs[0] if langs else {"id": 1, "short_form": "en", "name": "English",
                                   "language_code": "en-US", "text_direction": "ltr"}


async def trans_map(lang_id: int) -> dict:
    key = str(lang_id)
    if key not in _cache["trans"]:
        rows = db.kms_translations.find({"lang_id": lang_id}, {"label": 1, "translation": 1})
        _cache["trans"][key] = {r.get("label"): r.get("translation") async for r in rows}
    return _cache["trans"][key]


# ── session ──────────────────────────────────────────────────────────────────
def current_user(request: Request):
    tok = request.cookies.get(KMS_COOKIE)
    if not tok:
        return None
    try:
        return pyjwt.decode(tok, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


async def make_session(member: dict) -> str:
    # Autor = capacidad del TIPO de miembro (gobernanza 2026-07-21); el helper
    # conserva la rama del rol `role_author` para las marcas sin migrar.
    from utils.member_capabilities import is_author as _cap_is_author
    role = member.get("role") or ""
    cms_roles = member.get("cms_roles") or []
    is_admin = role == "admin" or "role_admin" in cms_roles
    is_author = await _cap_is_author(db, member)
    payload = {
        "u": f"{member.get('first_name','')} {member.get('last_name','')}".strip()
             or member.get("username") or member.get("email"),
        "e": (member.get("email") or "").lower(),
        "a": bool(is_admin),
        "au": bool(is_author),
        "m": member.get("membership_number") or 0,
        "mid": member.get("id") or str(member.get("_id")),
        "exp": int(time.time()) + 60 * 60 * 12,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def login_redirect() -> RedirectResponse:
    # Live-install behavior: anonymous readers land on the admin login.
    # ROOT-RELATIVE: the insights vhost maps / -> /insights/, so Location headers
    # must be in the browser's URL space (news.py / morning.py convention).
    return RedirectResponse("/admin/login", status_code=303)


# ── data access ──────────────────────────────────────────────────────────────
PUBLIC_POST_FILTER = {"status": 1, "visibility": 1, "is_scheduled": {"$ne": 1}}

# ── content tiers (KMS_CONTENT_TIERS_PLAN, D-2026-63) ────────────────────────
# Viewer ladder: anonymous < public (subscriber cookie) < registered (active
# member login) < mastermind (Mastermind member level) < staff (admin/author).
# A post above the viewer's tier is INVISIBLE everywhere (R8): the public _gate
# resolves the viewer once per request and stashes the tier in a ContextVar so
# every post query below filters without threading a parameter through.
from contextvars import ContextVar

SUBSCRIBER_COOKIE = "user_email"        # shared with News/Brief (leadcapture)
TIER_ORDER = {"public": 0, "registered": 1, "mastermind": 2}
_tier_ctx: ContextVar = ContextVar("kms_viewer_tier", default="public")


def set_viewer_tier(tier: str) -> None:
    _tier_ctx.set(tier if tier in ("public", "registered", "mastermind", "staff")
                  else "public")


def viewer_tier() -> str:
    return _tier_ctx.get()


def tier_condition(tier: str | None = None) -> dict:
    t = tier or _tier_ctx.get()
    if t == "staff":
        return {}
    allowed = ["public", None]          # missing tier = legacy public
    if t in ("registered", "mastermind"):
        allowed.append("registered")
    if t == "mastermind":
        allowed.append("mastermind")
    return {"tier": {"$in": allowed}}


def public_post_filter(tier: str | None = None) -> dict:
    return {**PUBLIC_POST_FILTER, **tier_condition(tier)}


def post_visible(post: dict, tier: str | None = None) -> bool:
    t = tier or _tier_ctx.get()
    if t == "staff":
        return True
    return (TIER_ORDER.get(post.get("tier") or "public", 0)
            <= TIER_ORDER.get(t, 0))


_mm_cache = {"t": 0.0, "ids": set()}


async def mastermind_level_ids() -> set:
    now = time.monotonic()
    if now - _mm_cache["t"] > _CACHE_TTL:
        _mm_cache["ids"] = {l.get("id") async for l in
                            db.member_levels.find({"is_mastermind": True}, {"id": 1})}
        _mm_cache["t"] = now
    return _mm_cache["ids"]


async def _member_viewer(m: dict, sess: dict) -> dict:
    """Map a resolved member doc → viewer dict (staff / mastermind / registered)."""
    role = m.get("role") or ""
    cms = m.get("cms_roles") or []
    # s149: an expired PAID membership loses the member tiers — back to a reader
    # (public tier, subject to its own KMS subscription / paywall).
    if m.get("membership_source") == "paid" and role != "admin" and "role_admin" not in cms:
        from routes.paid_membership import membership_lapsed
        if await membership_lapsed(m):
            return {"tier": "public", "session": None,
                    "subscriber": (m.get("email") or "").lower() or None, "anon": False}
    from utils.member_capabilities import is_author as _cap_is_author, is_mastermind as _cap_is_mastermind
    if role == "admin" or "role_admin" in cms or await _cap_is_author(db, m):
        return {"tier": "staff", "session": sess, "subscriber": None, "anon": False}
    # Mastermind = TIPO de miembro con el flag encendido; nivel `is_mastermind`
    # mientras la marca no migre (el helper resuelve ambas formas).
    tier = "mastermind" if await _cap_is_mastermind(db, m) else "registered"
    return {"tier": tier, "session": sess, "subscriber": None, "anon": False}


async def resolve_viewer(request: Request) -> dict:
    """Always returns a viewer dict — the KMS is open at the PUBLIC tier
    (KMS_CONTENT_TIERS_PLAN, revised): public posts read freely, higher tiers
    stay hidden. Keys: tier (staff|mastermind|registered|public), session,
    subscriber, anon (True only for a pure anonymous visitor → gets the soft
    subscribe overlay). Recognition order:
      1. native KMS session cookie (kms_session)
      2. the My Account platform session (shared `.<brand>` session_token
         cookie) — so a logged-in member is recognised on this subdomain
         WITHOUT a separate KMS login (session sync, like /my-account)
      3. subscriber cookie (pre_registered lead) → public tier, no overlay
      4. anonymous → public tier + overlay."""
    # 1. native KMS session
    sess = current_user(request)
    if sess:
        if sess.get("a") or sess.get("au"):
            return {"tier": "staff", "session": sess, "subscriber": None, "anon": False}
        try:
            m = await db.members.find_one({"email": sess.get("e") or ""},
                                          {"level_id": 1, "role": 1, "cms_roles": 1, "email": 1,
                                           "member_id": 1,
                                           "membership_source": 1, "membership_expires_at": 1,
                                           "membership_subscription_id": 1})
            if m:
                return await _member_viewer(m, sess)
        except Exception:
            logger.warning("kms viewer level lookup failed", exc_info=True)
        return {"tier": "registered", "session": sess, "subscriber": None, "anon": False}
    # 2. My Account platform session (cross-subdomain session_token cookie)
    plat = request.cookies.get("session_token")
    if plat:
        try:
            payload = pyjwt.decode(plat, JWT_SECRET, algorithms=["HS256"])
            m = await db.members.find_one({"member_id": payload.get("user_id")})
            if m and (m.get("account_status") or "active") != "deactivated":
                psess = {"u": f"{m.get('first_name','')} {m.get('last_name','')}".strip()
                              or m.get("username") or m.get("email"),
                         "e": (m.get("email") or "").lower(),
                         "m": m.get("membership_number") or 0,
                         "mid": m.get("member_id") or str(m.get("_id")),
                         "platform": True}
                return await _member_viewer(m, psess)
        except Exception:
            pass
    # 3. subscriber cookie (pre_registered lead)
    email = (request.cookies.get(SUBSCRIBER_COOKIE) or "").strip().lower()
    if email and "@" in email:
        m = await db.members.find_one({"email": email}, {"account_status": 1})
        if m and (m.get("account_status") or "active") != "deactivated":
            return {"tier": "public", "session": None, "subscriber": email, "anon": False}
    # 4. anonymous → public tier, soft subscribe overlay
    return {"tier": "public", "session": None, "subscriber": None, "anon": True}


async def categories(lang_id: int) -> list:
    return [c async for c in db.kms_categories
            .find({"lang_id": lang_id, "category_status": {"$ne": 0}})
            .sort([("category_order", 1), ("id", 1)])]


async def category_by_slug(slug: str, lang_id: int):
    return await db.kms_categories.find_one(
        {"slug": slug, "lang_id": lang_id, "category_status": {"$ne": 0}})


async def latest_posts(lang_id: int, limit: int, skip: int = 0) -> list:
    cur = (db.kms_posts.find({**public_post_filter(), "lang_id": lang_id})
           .sort("created_at", -1).skip(skip).limit(limit))
    return await apply_default_images([p async for p in cur])


async def posts_by_category(cat_ids: list, lang_id: int, limit: int, skip: int = 0):
    cur = (db.kms_posts.find({**public_post_filter(), "lang_id": lang_id,
                              "category_id": {"$in": cat_ids}})
           .sort("created_at", -1).skip(skip).limit(limit))
    return await apply_default_images([p async for p in cur])


async def count_by_category(cat_ids: list, lang_id: int) -> int:
    return await db.kms_posts.count_documents(
        {**public_post_filter(), "lang_id": lang_id, "category_id": {"$in": cat_ids}})


async def post_by_slug(slug: str):
    return await apply_default_images(
        await db.kms_posts.find_one({**public_post_filter(), "slug": slug}))


async def page_by_slug(slug: str, lang_id: int):
    return await db.kms_pages.find_one({"slug": slug, "lang_id": lang_id, "visibility": 1})


async def selected_posts(selection_type: str, lang_id: int) -> list:
    """Posts an admin has picked for a slot (slider / featured / breaking /
    recommended), NEWEST FIRST.

    The order used to come from `kms_selections`, i.e. the order in which the
    boxes happened to be ticked — so the slider showed the oldest article first
    and buried the newest one at the end. `kms_selections` carries no rank field,
    so that order was incidental, not a curation. Sorted like every other public
    list instead (id breaks ties, matching latest_posts / the admin lists).
    """
    ids = [s["post_id"] async for s in db.kms_selections.find({"selection_type": selection_type})]
    if not ids:
        return []
    cur = (db.kms_posts.find({**public_post_filter(), "lang_id": lang_id, "id": {"$in": ids}})
           .sort([("created_at", -1), ("id", -1)]))
    return await apply_default_images([p async for p in cur])


async def widgets(lang_id: int) -> list:
    return [w async for w in db.kms_widgets
            .find({"lang_id": lang_id, "visibility": {"$ne": 0}}).sort("widget_order", 1)]


async def nav_pages(lang_id: int) -> list:
    return [p async for p in db.kms_pages
            .find({"lang_id": lang_id, "visibility": 1}).sort([("page_order", 1), ("id", 1)])]


def subcategories(cats: list, parent_id: int) -> list:
    return [c for c in cats if c.get("parent_id") == parent_id]


# ── category default images (fallback post thumbnails) ───────────────────────
CAT_THUMB_PREFIX = "/cat-thumb/"
_DEF_IMG_CACHE = {"t": 0.0, "map": {}}


async def default_image_categories() -> dict:
    """{category_id: {image, compose}} for categories that define a default image —
    used as the post thumbnail when a post has none of its own. 30s cache."""
    now = time.time()
    if now - _DEF_IMG_CACHE["t"] < 30 and _DEF_IMG_CACHE["map"]:
        return _DEF_IMG_CACHE["map"]
    m = {}
    async for c in db.kms_categories.find(
            {"default_image": {"$nin": [None, ""]}},
            {"id": 1, "default_image": 1, "compose_company_logo": 1,
             "compose_center_frac": 1, "compose_brand_watermark": 1}):
        m[c.get("id")] = {
            "image": c.get("default_image"),
            "compose": bool(c.get("compose_company_logo")),
            # Vertical position of the company logo (0..1). Blank = the 0.55 default
            # (title-at-top backdrops like Stock 360); a backdrop whose title sits
            # lower (e.g. Founder Stories, centered title) sets a larger value so the
            # logo lands BELOW the title.
            "center_frac": c.get("compose_center_frac"),
            # Whether to bake the brand watermark. Default on; a category whose
            # background ALREADY carries the brand mark opts out to avoid a double.
            "brand_watermark": c.get("compose_brand_watermark", True) is not False,
        }
    _DEF_IMG_CACHE.update(t=now, map=m)
    return m


async def apply_default_images(posts):
    """For posts with no image of their own whose (sub)category defines a default
    image, point `image_url` at the baked category-thumbnail endpoint, so every
    surface (Jinja templates + the External-Blog feed) shows it via post_image()."""
    if not posts:
        return posts
    seq = posts if isinstance(posts, list) else [posts]
    defs = await default_image_categories()
    if defs:
        for p in seq:
            if p and not p.get("image") and not p.get("image_url") \
                    and p.get("category_id") in defs and p.get("id") is not None:
                p["image_url"] = f"{CAT_THUMB_PREFIX}{p['id']}.jpg"
    return posts


async def post_company_logo(post):
    """(bytes, Path) of the logo of the FIRST company linked to a post (mono
    `logo_off` preferred — it whitens cleanly — else the color `logo_on`), or
    (None, None). The Path lets callers stat mtime for thumbnail cache-busting."""
    ids = list(post.get("related_company_ids") or [])
    if post.get("related_company_id"):
        ids.append(post["related_company_id"])
    for cid in ids:
        if not cid:
            continue
        c = await db.companies_directory.find_one(
            {"id": cid}, {"logo_off": 1, "logo_on": 1})
        if c:
            for f in ("logo_off", "logo_on"):
                b = brand_asset_bytes(c.get(f))
                if b:
                    return b, brand_asset_path(c.get(f))
    return None, None


async def ads_enabled() -> bool:
    """Master switch (Admin → Ad Spaces). Absent = on, so existing installs keep their ads."""
    return (await kms_settings()).get("general", {}).get("ads_enabled", True) is not False


async def viewer_is_kms_paid(request) -> bool:
    """s149 — a reader (lead, not a member) whose KMS subscription is paid and
    current: the audience of `audience: "kms_paid"` ads (the paid-membership
    banner). Cached on the request."""
    if request is None:
        return False
    cached = getattr(request.state, "kms_paid_reader", None)
    if cached is not None:
        return cached
    ok = False
    viewer = getattr(request.state, "kms_viewer", None) or {}
    email = viewer.get("subscriber")
    if email:
        m = await db.members.find_one({"email": email}, {"account_status": 1, "reader_tier": 1,
                                                         "reader_expires_at": 1, "reader_subscription_id": 1})
        if m and m.get("reader_tier") == "paid":
            exp = str(m.get("reader_expires_at") or "")
            ok = bool(m.get("reader_subscription_id")) or not exp or                 exp >= datetime.now(timezone.utc).isoformat()
    request.state.kms_paid_reader = ok
    return ok


async def ads_map(lang_id: int, request=None) -> dict:
    """{ad_space_name: doc} for the language — rendered by base/post/index/sidebar.
    Empty when advertising is switched off; paused slots (enabled:false) are skipped.
    s149: an ad with `audience: "kms_paid"` is shown only to paid KMS readers and,
    for them, wins over the general ad of the same slot."""
    if not await ads_enabled():
        return {}
    paid = await viewer_is_kms_paid(request)
    out = {}
    async for a in db.kms_ad_spaces.find({"lang_id": lang_id, "enabled": {"$ne": False}}):
        space = a.get("ad_space")
        if not space:
            continue
        if a.get("audience") == "kms_paid":
            if paid:
                out[space] = a
        elif space not in out or out[space].get("audience") != "kms_paid":
            out[space] = a
    return out


async def poll_ctx(user, lang_id: int):
    """Latest active poll + vote counts + whether the session member voted."""
    poll = await db.kms_polls.find_one({"lang_id": lang_id, "status": 1},
                                       sort=[("id", -1)])
    if not poll:
        return None, {}, False
    votes = {}
    async for row in db.kms_poll_votes.aggregate(
            [{"$match": {"poll_id": poll["id"]}},
             {"$group": {"_id": "$vote", "n": {"$sum": 1}}}]):
        votes[row["_id"]] = row["n"]
    voted = False
    if user and user.get("mid"):
        voted = bool(await db.kms_poll_votes.find_one(
            {"poll_id": poll["id"], "user_id": user["mid"]}))
    return poll, votes, voted


# ── template helpers ─────────────────────────────────────────────────────────
def img_url(path) -> str:
    p = (path or "").strip()
    if not p:
        return ""
    if p.startswith(("http://", "https://")):
        return p
    return "/" + p.lstrip("/")


def post_image(post: dict, size: str = "default") -> str:
    img = post.get("image") or {}
    p = img.get(f"image_{size}") or img.get("image_default") or img.get("image_big")
    if p:
        return img_url(p)
    if post.get("image_url"):
        return post["image_url"]
    return ""


def video_embed(post: dict) -> str:
    """Embed HTML for a video post: raw embed code wins, else YouTube/Vimeo URL
    conversion, else a <video> tag for direct media files."""
    code = (post.get("video_embed_code") or "").strip()
    if code:
        return code
    url = (post.get("video_url") or "").strip().replace('"', "%22")
    if not url:
        return ""
    m = re.search(r"(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([\w-]{6,})", url)
    if m:
        return (f'<iframe src="https://www.youtube.com/embed/{m.group(1)}" '
                'frameborder="0" allow="accelerometer; autoplay; encrypted-media; '
                'gyroscope; picture-in-picture" allowfullscreen></iframe>')
    m = re.search(r"vimeo\.com/(\d+)", url)
    if m:
        return (f'<iframe src="https://player.vimeo.com/video/{m.group(1)}" '
                'frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>')
    if url.rsplit("?", 1)[0].endswith((".mp4", ".webm", ".ogg")):
        return f'<video controls src="{url}"></video>'
    return ""


def strip_tags(value, limit: int = 0) -> str:
    txt = re.sub(r"<[^>]+>", " ", str(value or ""))
    txt = html.unescape(re.sub(r"\s+", " ", txt)).strip()
    if limit and len(txt) > limit:
        txt = txt[: limit].rsplit(" ", 1)[0] + "..."
    return txt


def char_limit(value, limit: int = 100) -> str:
    txt = str(value or "")
    return txt if len(txt) <= limit else txt[: limit].rsplit(" ", 1)[0] + "..."


# Timezone the KMS renders dates IN. Timestamps are STORED in UTC (admin._now_str);
# render() sets this from settings.general.timezone so fmt_date can convert to the
# brand's local time (the setting existed but was previously ignored → dates showed
# as raw UTC). None → no conversion (unchanged behaviour).
_DISPLAY_TZ: str | None = None


def fmt_date(value, with_time: bool = False) -> str:
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", ""))
    except ValueError:
        return str(value)
    if _DISPLAY_TZ:
        try:
            import zoneinfo
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)   # stored values are UTC
            dt = dt.astimezone(zoneinfo.ZoneInfo(_DISPLAY_TZ))
        except Exception:
            pass  # bad tz name / no zoneinfo data → fall back to raw value
    return dt.strftime("%b %d, %Y" + (" %H:%M" if with_time else ""))


def _make_env(loader) -> Environment:
    env = Environment(
        loader=loader,
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters.update(
        img_url=img_url, strip_tags=strip_tags, char_limit=char_limit, fmt_date=fmt_date,
        share_href=share_href)
    env.globals.update(post_image=post_image, video_embed=video_embed)
    return env


# _env stays the plain shared loader — the admin panel renders through it directly
# (admin chrome never theme-switches); public render() goes through env_for(theme).
_env = _make_env(FileSystemLoader(str(KMS_DIR / "templates")))

# ── themes ───────────────────────────────────────────────────────────────────
KMS_THEMES = ("magazine", "moderna", "gem2i")

# Semantic color tokens (KMS_MODERNA_THEME_PLAN §2.1/§4). Magazine's defaults are
# its current hardcoded values, so an unconfigured install renders unchanged;
# Moderna's built-in seed is the Carlos editorial palette (per-brand values are
# seeded into kms_settings at rollout).
THEME_TOKEN_DEFAULTS = {
    "magazine": {
        "band": "#161616", "heading": "#16181b", "accent": "#2d65fe",
        "kicker": "#2d65fe", "box_bg": "#f9f9f9", "ink": "#16181b",
        "muted": "#6c757d", "line": "#e6e6e6", "row_alt": "#f9f9f9",
        "negative": "#b4392b", "positive": "#1f6b48",
    },
    "moderna": {
        "band": "#1B2A4A", "heading": "#1B2A4A", "accent": "#C9A24B",
        "kicker": "#C9A24B", "box_bg": "#F6F5F1", "ink": "#1f2530",
        "muted": "#6a6456", "line": "#ddd9cf", "row_alt": "#f6f5f1",
        "negative": "#9e3b2f", "positive": "#1f6b48",
    },
    # gem2i (2026-10-19, bocetos/kms-home.html MG-1): the beta.gem2i.com night skin.
    "gem2i": {
        "band": "#04080C", "heading": "#FFFFFF", "accent": "#0068B3",
        "kicker": "#5AAFEA", "box_bg": "#0D1721", "ink": "#E6EDF3",
        "muted": "#8A98A6", "line": "#1C2631", "row_alt": "#0A121A",
        "negative": "#E5484D", "positive": "#2FBF71",
    },
}
THEME_FONT_DEFAULTS = {
    "magazine": {"heading_font": "'Inter', sans-serif",
                 "body_font": "'Open Sans', Helvetica, sans-serif",
                 "heading_weight": "700"},
    "moderna": {"heading_font": "Georgia, 'Times New Roman', serif",
                "body_font": "Georgia, 'Times New Roman', serif",
                "heading_weight": "400"},
    "gem2i": {"heading_font": "'Playfair Display', Georgia, serif",
              "body_font": "'Manrope', Helvetica, sans-serif",
              "heading_weight": "700"},
}

_HEX_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")


def active_theme(gs: dict) -> str:
    t = gs.get("theme")
    return t if t in KMS_THEMES else "magazine"


def theme_css(gs: dict, theme: str) -> str:
    """The :root {--kms-*} block for base.html — built in Python (not in the
    template) so autoescaping can't mangle quotes in font stacks. Values are
    sanitized: colors must be hex, fonts get CSS-breaking chars stripped."""
    tokens = dict(THEME_TOKEN_DEFAULTS[theme])
    for k, v in (gs.get("theme_colors") or {}).items():
        if k in tokens and isinstance(v, str) and _HEX_RE.match(v.strip()):
            tokens[k] = v.strip()
    fonts = dict(THEME_FONT_DEFAULTS[theme])
    for k, v in (gs.get("theme_fonts") or {}).items():
        if k in fonts and isinstance(v, str) and v.strip():
            fonts[k] = re.sub(r"[<>{};]", "", v.strip())
    decls = "".join(f"--kms-{k.replace('_', '-')}:{v};" for k, v in tokens.items())
    decls += (f"--kms-heading-font:{fonts['heading_font']};"
              f"--kms-body-font:{fonts['body_font']};"
              f"--kms-heading-weight:{fonts['heading_weight']};")
    return ":root{" + decls + "}"


_theme_envs = {"magazine": _env}


def env_for(theme: str) -> Environment:
    """Per-theme Jinja env, cached at module level. A theme env looks in
    templates/<theme>/ first and falls back to the shared templates/ — a theme
    only overrides the files it changes."""
    if theme not in _theme_envs:
        _theme_envs[theme] = _make_env(ChoiceLoader([
            FileSystemLoader(str(KMS_DIR / "templates" / theme)),
            FileSystemLoader(str(KMS_DIR / "templates")),
        ]))
    return _theme_envs[theme]


async def render(request: Request, template: str, **ctx) -> str:
    """Assemble the base context every page needs, then render."""
    s = await kms_settings()
    lang = await default_lang()
    lang_id = lang.get("id", 1)
    tmap = await trans_map(lang_id)
    cats = await categories(lang_id)
    user = current_user(request)
    gs = s.get("general") or {}
    global _DISPLAY_TZ
    _DISPLAY_TZ = (gs.get("timezone") or "").strip() or None
    ls = (s.get("by_lang") or {}).get(str(lang_id)) or {}
    theme = active_theme(gs)
    base_ctx = {
        "request": request,
        "theme": theme,
        "theme_css": theme_css(gs, theme),
        "gs": gs,
        "ls": ls,
        "lang": lang,
        "user": user,
        "dark": request.cookies.get(DARK_COOKIE) == "1",
        "categories": [c for c in cats if not c.get("parent_id")],
        "all_categories": cats,
        "nav_pages": await nav_pages(lang_id),
        "site_title": ls.get("site_title") or ls.get("application_name") or "Insights",
        "app_name": ls.get("application_name") or ls.get("site_title") or "Insights",
        # logo / logo_footer / logo_email / favicon — absorbed from the CMS
        **(await brand_logos()),
        # Brand homepage (the main website) — the top navbar logo links here so a KMS
        # reader can return to the brand home. Falls back to the KMS root if unset.
        "brand_home": ((await db.settings.find_one({}, {"_id": 0, "site_url": 1})) or {}).get("site_url") or "/",
        "brand_social_links": await brand_social_links(),
        "primary": "#2d65fe",
        "year": datetime.now(timezone.utc).year,
    }
    base_ctx["trans"] = lambda k: tmap.get(k) or k.replace("_", " ").title()
    base_ctx["ads"] = await ads_map(lang_id, request)
    poll, poll_votes, poll_voted = await poll_ctx(user, lang_id)
    base_ctx.update(poll=poll, poll_votes=poll_votes, poll_voted=poll_voted)
    # Soft subscribe overlay for anonymous visitors (set by public._gate). Public
    # content reads freely; the overlay is the News/Brief scroll/time funnel that
    # converts a visitor into a pre_registered lead (base.html injects it).
    base_ctx["show_subscribe_overlay"] = False
    if getattr(request.state, "kms_show_overlay", False):
        from utils.leadcapture import make_form_token
        nxt = request.url.path + (("?" + request.url.query) if request.url.query else "")
        _post = ctx.get("post")
        base_ctx.update(
            show_subscribe_overlay=True,
            subscribe_form_token=make_form_token(),
            subscribe_next=nxt if nxt.startswith("/") and not nxt.startswith("//") else "/",
            subscribe_ref=(request.query_params.get("ref") or "").strip(),
            # single-post pages only → lets /subscribe root the lead under the
            # article's author and hand off to the publication domain (D2/D3).
            subscribe_post_id=(_post.get("id") if isinstance(_post, dict) else None))
    base_ctx.update(ctx)
    # maintenance mode: public pages show the maintenance screen to everyone
    # except staff; the login page stays reachable so staff can get in.
    if (gs.get("maintenance_mode_status") == 1 and template != "login.html"
            and not (user and (user.get("a") or user.get("au")))):
        base_ctx["title"] = gs.get("maintenance_mode_title") or "Coming Soon!"
        return env_for(theme).get_template("maintenance.html").render(**base_ctx)
    return env_for(theme).get_template(template).render(**base_ctx)
