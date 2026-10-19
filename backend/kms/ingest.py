"""KMS HTML ingest — analyst watched-folder channels → native KMS posts.

`POST /internal/publish-html` (keyed by ``kms_config {key:"html_ingest"}.sync_key``)
accepts a self-contained brief HTML file and publishes it as a native
``kms_posts`` article in the channel's subcategory, running a SERVER-SIDE port
of the admin post-form "Attach HTML v3" transform (document CSS scoped under
``.post-content``; masthead stripped up to & including the first ``<h1>``; title
taken from that ``<h1>``). The in-process news bridge then mirrors the published
post to news.<brand> exactly as a manual KMS save would.

Registered before the public catch-alls (kms/__init__.py). ``internal`` is in
``core.RESERVED`` and this endpoint is POST-only, so it can never be shadowed by
a GET ``/{slug}`` / ``/{a}/{b}`` route.

See work-plans-MD/ANALYST_HTML_KMS_PIPELINE_PLAN.md (D1–D9). Carlos-first; the
channel map + sync key live in Mongo (kms_config), so the code is brand-generic.
"""
import hmac
import html as _htmllib
import logging
import re
import uuid
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

import html5lib
import tinycss2
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from kms.core import db, kms_enabled
from kms.admin import _slugify, _unique_slug, _now_str, _next_id

logger = logging.getLogger(__name__)
ingest_router = APIRouter()


# ── Attach-HTML v3 transform (server-side port of post_form.html JS) ───────────
# Physical page widths (cm/in/mm) — incl. min-/max- — become fluid so a brief
# authored as a print sheet ("8.5in wide .page") fills the article column instead
# of rendering as a narrow "sheet of paper on a desk" (the notebook look).
_WIDTH_RE = re.compile(r"(^|;)\s*(max-|min-)?width\s*:\s*[\d.]+(?:cm|in|mm)\s*(?=;|$)", re.I)
_BREAK_RE = re.compile(r"(^|;)\s*(?:page-break-[a-z]+|break-before|break-after)\s*:[^;]*(?=;|$)", re.I)
# The paper drop-shadow that frames the sheet — screen-only artifact, drop it.
_SHADOW_RE = re.compile(r"(^|;)\s*(?:-webkit-|-moz-)?box-shadow\s*:[^;]*(?=;|$)", re.I)
# background on html/body/:root = the "desk" behind the sheet; scoped to
# .post-content it would repaint the whole article area — drop it (root rules only).
_BG_RE = re.compile(r"(^|;)\s*background(?:-color)?\s*:[^;]*(?=;|$)", re.I)
# Typography from the source brief (font family / size / line-height). Dropped when a
# channel sets `strip_doc_fonts` so the KMS's own screen typography wins on EVERY
# element (incl. the brief's custom classes, by inheritance) while the brief keeps
# full control of its COLOURS and layout. Weight / spacing / transform are the
# author's emphasis and are preserved.
_FONT_RE = re.compile(
    r"(^|;)\s*(?:font|font-family|font-size|line-height)\s*:[^;]*(?=;|$)", re.I)
# The brief's outer "sheet" wrappers (a print page centered at a fixed width with
# side gutters). On screen the article must fill the KMS column edge-to-edge like
# its masthead image, so when a rule TARGETS one of these wrapper classes we append
# overrides that neutralise the horizontal frame (width / centering / side padding)
# while leaving its colours, borders and vertical rhythm — and every inner element
# (callouts, sections…) — untouched.
_FRAME_CLASSES = {
    "page", "body-inner", "bodyinner", "wrap", "wrapper", "sheet", "container",
    "inner", "doc", "document", "brief", "report", "content-wrap", "paper",
    "newsletter",  # AUREX briefs wrap in a 760px centered "newsletter" sheet →
                   # neutralise it so the article fills the KMS column edge-to-edge
                   # like Carlos's `.page` sheet, instead of a narrow boxed frame.
    "content",     # AUREX briefs put the body in a `.content` div with 30px side
                   # padding, insetting the text from the full-width featured image;
                   # neutralise it so text sits flush with the image (Carlos parity).
}


def _is_frame_selector(sel: str) -> bool:
    for part in sel.split(","):
        part = part.strip()
        if not part:
            continue
        last = re.split(r"\s+", part)[-1]  # the rightmost (target) simple selector
        m = re.fullmatch(r"\.([a-z0-9_-]+)", last, re.I)
        if m and m.group(1).lower() in _FRAME_CLASSES:
            return True
    return False


def _width_repl(m):
    prefix = (m.group(2) or "").lower()
    return m.group(1) + prefix + "width:" + ("0" if prefix == "min-" else "100%")


def _fix_decls(text: str, is_root: bool = False, strip_fonts: bool = False,
               is_frame: bool = False) -> str:
    """Print page-frame → screen: physical widths become fluid, print artifacts
    (page-break, paper drop-shadow) drop. For html/body/:root rules also drop the
    'desk' background so the brief never repaints the whole article area.
    strip_fonts also drops font family/size/line-height so the KMS typography wins.
    is_frame appends overrides that make a sheet wrapper fill the column width."""
    text = _WIDTH_RE.sub(_width_repl, text)
    text = _BREAK_RE.sub(r"\1", text)
    text = _SHADOW_RE.sub(r"\1", text)
    if is_root:
        text = _BG_RE.sub(r"\1", text)
    if strip_fonts:
        text = _FONT_RE.sub(r"\1", text)
    text = text.strip().strip(";").strip()
    if is_frame and text:
        # last-wins overrides: full width, no centering, no side gutters
        text += ";max-width:none;margin-left:0;margin-right:0;padding-left:0;padding-right:0"
    return text


def _scope_selector(selector_text: str) -> str:
    """Scope every selector under .post-content (html/body/:root → .post-content
    itself). Matches scopeSelector() in post_form.html."""
    out = []
    for s in selector_text.split(","):
        s = s.strip()
        if not s:
            continue
        if re.match(r"^(html|body|:root)$", s, re.I):
            out.append(".post-content")
        elif re.match(r"^(html|body|:root)\b", s, re.I):
            out.append(re.sub(r"^(html|body|:root)\s*", ".post-content ", s, flags=re.I))
        else:
            out.append(".post-content " + s)
    return ", ".join(out)


def _scope_rules(nodes, strip_fonts: bool = False) -> list:
    out = []
    for node in nodes:
        t = getattr(node, "type", None)
        if t == "qualified-rule":
            sel = tinycss2.serialize(node.prelude).strip()
            is_root = any(re.match(r"^(html|body|:root)\b", s.strip(), re.I)
                          for s in sel.split(","))
            decls = _fix_decls(tinycss2.serialize(node.content or []),
                               is_root=is_root, strip_fonts=strip_fonts,
                               is_frame=(strip_fonts and _is_frame_selector(sel)))
            if sel and decls:
                out.append(_scope_selector(sel) + "{" + decls + "}")
        elif t == "at-rule":
            kw = (node.lower_at_keyword or "")
            if kw == "media":
                media = tinycss2.serialize(node.prelude).strip()
                if "print" in media.lower():
                    continue  # print-only media never applies on screen
                inner = _scope_rules(
                    tinycss2.parse_rule_list(node.content or [], skip_comments=True,
                                             skip_whitespace=True), strip_fonts=strip_fonts)
                if inner:
                    out.append("@media " + media + "{" + "\n".join(inner) + "}")
            elif kw in ("keyframes", "-webkit-keyframes"):
                prelude = tinycss2.serialize(node.prelude).strip()
                body = tinycss2.serialize(node.content or [])
                out.append("@" + node.at_keyword + " " + prelude + "{" + body + "}")
            # @page / @font-face / @import dropped: print-only or external
    return out


def _scope_css(css_text: str, strip_fonts: bool = False) -> str:
    if not css_text.strip():
        return ""
    try:
        rules = tinycss2.parse_stylesheet(css_text, skip_whitespace=True, skip_comments=True)
        return "\n".join(_scope_rules(rules, strip_fonts=strip_fonts))
    except Exception:
        logger.warning("kms ingest: css scope failed", exc_info=True)
        return ""


def _inner_html(el) -> str:
    parts = []
    if el.text:
        parts.append(el.text)
    for child in list(el):
        parts.append(ET.tostring(child, method="html", encoding="unicode"))
    return "".join(parts)


def attach_html(raw: str, keep_doc_css: bool = True, strip_fonts: bool = False) -> tuple:
    """Port of the post-form Attach-HTML v3 flow: returns (content_html, title).

    content_html = <style data-kms-doc>…scoped doc css…</style> + body innerHTML
    (masthead removed). title = text of the first <h1> ("" if none).

    keep_doc_css=False drops the document stylesheet entirely (body innerHTML only),
    so the post renders with the KMS's own screen typography instead of the brief's
    print styling (9pt fonts, letter-page frame). This reproduces what a manual
    re-save in the KMS admin does (TinyMCE strips <style>), and is the right mode for
    briefs authored as print documents — see the morning_brief channel's strip_doc_css.
    """
    doc = html5lib.parse(raw, treebuilder="etree", namespaceHTMLElements=False)

    # 1) collect every <style> block (head + body), then remove them all.
    styles = [(s.text or "") for s in doc.iter("style")]
    parents = {c: p for p in doc.iter() for c in p}
    for s in list(doc.iter("style")):
        p = parents.get(s)
        if p is not None:
            p.remove(s)

    body = next(iter(doc.iter("body")), None) or doc

    # 2) strip the masthead: remove everything up to AND INCLUDING the first <h1>
    #    at every nesting level (logo band / running header / kicker / title).
    parents = {c: p for p in body.iter() for c in p}
    title = ""
    h1 = next(iter(body.iter("h1")), None)
    if h1 is not None:
        title = re.sub(r"\s+", " ", "".join(h1.itertext())).strip()
        node = h1
        while node is not None and node is not body:
            p = parents.get(node)
            if p is None:
                break
            kids = list(p)
            for c in kids[:kids.index(node)]:
                p.remove(c)
            p.text = None  # drop leading text that sat before the removed content
            node = p
        hp = parents.get(h1)
        if hp is not None:
            hp.remove(h1)
        body.text = None

    inner = _inner_html(body)
    if not keep_doc_css:
        return inner, title
    scoped = _scope_css("\n".join(x for x in styles if x.strip()), strip_fonts=strip_fonts)
    content = ('<style data-kms-doc="1">\n' + scoped + "\n</style>\n" + inner) if scoped else inner
    return content, title


def _renorm_rules(nodes) -> list:
    """Re-run the channel decl transforms on ALREADY-SCOPED rules (selectors kept
    verbatim; only declarations are normalized)."""
    out = []
    for node in nodes:
        t = getattr(node, "type", None)
        if t == "qualified-rule":
            sel = tinycss2.serialize(node.prelude).strip()
            # after scoping, html/body/:root all became exactly `.post-content`
            is_root = any(s.strip() == ".post-content" for s in sel.split(","))
            decls = _fix_decls(tinycss2.serialize(node.content or []),
                               is_root=is_root, strip_fonts=True,
                               is_frame=_is_frame_selector(sel))
            if sel and decls:
                out.append(sel + "{" + decls + "}")
        elif t == "at-rule":
            kw = (node.lower_at_keyword or "")
            if kw == "media":
                media = tinycss2.serialize(node.prelude).strip()
                if "print" in media.lower():
                    continue
                inner = _renorm_rules(tinycss2.parse_rule_list(
                    node.content or [], skip_comments=True, skip_whitespace=True))
                if inner:
                    out.append("@media " + media + "{" + "\n".join(inner) + "}")
            elif kw in ("keyframes", "-webkit-keyframes"):
                out.append("@" + node.at_keyword + " "
                           + tinycss2.serialize(node.prelude).strip()
                           + "{" + tinycss2.serialize(node.content or []) + "}")
    return out


def normalize_scoped_doc_css(css: str) -> str:
    """Bring an already-scoped `doc_css` to CHANNEL parity, so a MANUAL KMS upload
    (post_form Attach-HTML, which scopes client-side but keeps the document's own
    print typography, desk background and fixed-width sheet frame) renders exactly
    like a channel-ingested brief REGARDLESS of category: KMS screen typography wins
    (fonts stripped), the root desk background is dropped, the paper drop-shadow is
    removed and the print sheet fills the column — while the document keeps its
    colours, borders, inner backgrounds and vertical rhythm. Idempotent. Reuses the
    same `_fix_decls`/`_is_frame_selector` the channel path uses (single source of
    truth). Best-effort: on a parse error the input is returned unchanged."""
    if not (css or "").strip():
        return css or ""
    try:
        rules = tinycss2.parse_stylesheet(css, skip_whitespace=True, skip_comments=True)
        return "\n".join(_renorm_rules(rules))
    except Exception:
        logger.warning("kms: doc_css normalize failed", exc_info=True)
        return css


def _clean_title(raw: str) -> str:
    t = re.sub(r"<[^>]+>", " ", raw or "")
    t = _htmllib.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def _auto_summary(content: str, limit: int = 300) -> str:
    # drop <style>/<script> bodies first — their text survives plain tag-stripping
    text = re.sub(r"<(style|script)\b[^>]*>.*?</\1>", " ", content or "", flags=re.I | re.S)
    text = _htmllib.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def _norm_created_at(date_str: str):
    """Normalize the analyst's date to the KMS 'YYYY-MM-DD HH:MM:SS' form. Date-only
    inputs get the current time attached so same-day posts still order correctly."""
    date_str = (date_str or "").strip()
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%B %d, %Y", "%b %d, %Y"):
        try:
            dt = datetime.strptime(date_str, fmt)
        except ValueError:
            continue
        if fmt in ("%Y-%m-%d", "%B %d, %Y", "%b %d, %Y"):
            now = datetime.now(timezone.utc)
            dt = dt.replace(hour=now.hour, minute=now.minute, second=now.second)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    return None


async def _resolve_image(default_image_id):
    if not default_image_id:
        return None, None
    img = await db.kms_images.find_one({"id": int(default_image_id)})
    if not img:
        return int(default_image_id), None
    keep = ("id", "image_big", "image_default", "image_slider", "image_mid",
            "image_small", "image_mime", "storage")
    return int(default_image_id), {k: img.get(k) for k in keep}


async def _mirror_morning(raw_html: str, title: str, author: str, date_disp: str,
                          kms_slug: str, image_url: str = "") -> None:
    """D1: during the transition, keep morningbrief.<brand> receiving the Morning
    Brief. Stores the ORIGINAL standalone brief HTML (the Brief site renders it as
    a full document), idempotent by `ingest_slug` so re-drops update in place.
    `image_url` = the auto-assigned weekday banner (absolute KMS URL) so the Brief
    site shows the same header image as KMS/News; empty keeps the prior value."""
    try:
        existing = await db.morning_pages.find_one({"ingest_slug": kms_slug})
        fields = {"title": title, "author": author, "date": date_disp, "html": raw_html,
                  "updated_at": datetime.now(timezone.utc).isoformat()}
        # only overwrite the stored image when we actually resolved a banner
        if image_url:
            fields["image"] = image_url
        if existing:
            await db.morning_pages.update_one({"_id": existing["_id"]}, {"$set": fields})
            return
        base, ss, n = kms_slug, kms_slug, 2
        while await db.morning_pages.find_one({"slug": ss}):
            ss, n = f"{base}-{n}", n + 1
        await db.morning_pages.insert_one({
            "id": str(uuid.uuid4()), "slug": ss, "ingest_slug": kms_slug,
            "image": image_url or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by": "kms-ingest", **fields})
    except Exception:
        logger.warning("kms ingest: morning mirror failed for %s", kms_slug, exc_info=True)


def _kms_base_from_settings(s: dict) -> str:
    """Absolute base URL that serves the native KMS /uploads/* — settings.kms_native_base
    else derived from site_url (beta.<brand> -> insights.<brand>). No trailing slash."""
    base = (s.get("kms_native_base") or "").strip()
    if not base:
        site = (s.get("site_url") or "").strip().rstrip("/")
        base = site.replace("://beta.", "://insights.") if "://beta." in site else site
    return base.rstrip("/")


def _post_image_url(post: dict, base: str) -> str:
    """Absolute URL of a KMS post's featured image (big → default), or ""."""
    img = post.get("image") or {}
    path = img.get("image_big") or img.get("image_default")
    return (base + "/" + str(path).lstrip("/")) if (path and base) else ""


async def sync_morning_image(post: dict) -> None:
    """Propagate a KMS post's CURRENT featured image to its Morning Brief mirror row
    (morning_pages), so changing the image in the KMS admin also refreshes the Brief
    site — parity with the news bridge. Best-effort; only the image is touched (the
    mirror keeps the original brief HTML). No-op when the post has no mirror row."""
    try:
        slug = post.get("slug")
        if not slug:
            return
        mp = await db.morning_pages.find_one({"ingest_slug": slug}, {"_id": 1})
        if not mp:
            return
        s = await db.settings.find_one({}, {"kms_native_base": 1, "site_url": 1}) or {}
        url = _post_image_url(post, _kms_base_from_settings(s))
        if url:
            await db.morning_pages.update_one({"_id": mp["_id"]}, {"$set": {"image": url}})
    except Exception:
        logger.warning("kms: morning image sync failed for %s", post.get("id"), exc_info=True)


async def remove_morning(slug: str) -> None:
    """Delete the Morning Brief mirror row (morning_pages) for a KMS post — parity
    with news_bridge.remove_post. Deleting a brief in the KMS must also clear it
    from the Brief site AND the IMS workspace, which BOTH read morning_pages (the
    KMS→morning_pages mirror was previously write-only, so KMS deletes leaked stale
    briefs into the IMS). Keyed by `ingest_slug` (set by _mirror_morning), the same
    key sync_morning_image uses. Best-effort: a failure must never break the KMS
    delete. NOT wired to unpublish — the mirror can only be RE-created by the ingest
    path (which needs the original brief HTML), so removing it on a reversible
    set-draft would be lossy; delete is terminal, so it is safe here."""
    try:
        if not slug:
            return
        await db.morning_pages.delete_many({"ingest_slug": slug})
    except Exception:
        logger.warning("kms: morning mirror remove failed for %s", slug, exc_info=True)


async def sync_morning_from_post(post: dict) -> None:
    """Keep a Morning-Brief KMS post mirrored in morning_pages, so a brief created or
    edited DIRECTLY in the KMS admin (which never runs the ingest's _mirror_morning)
    also shows in the IMS and the Brief site — parity with the ingest path, making the
    KMS the single source. Whether a post is a "brief" is decided by its category
    matching the html_ingest `morning_brief` channel category (rename-safe). Metadata
    (title/author/date/image) is synced on every save; the brief HTML is written only
    when CREATING the mirror, so an ingested brief's original standalone HTML is never
    clobbered by the post's processed body. A post moved OUT of the Morning-Brief
    category has its mirror removed. Best-effort — never breaks a KMS save."""
    try:
        slug = post.get("slug")
        if not slug:
            return
        cfg = await db.kms_config.find_one({"key": "html_ingest"}, {"channels": 1}) or {}
        ch = (cfg.get("channels") or {}).get("morning_brief") or {}
        cat = None
        if ch:
            cat = (await db.kms_categories.find_one({"slug": ch.get("category_slug")}, {"id": 1})
                   or await db.kms_categories.find_one({"id": ch.get("category_id")}, {"id": 1}))
        if not (cat and post.get("category_id") == cat.get("id")):
            # not (or no longer) a Morning Brief → drop any stale mirror, then stop
            await db.morning_pages.delete_many({"ingest_slug": slug})
            return
        from kms import news_bridge
        s = await db.settings.find_one({}, {"kms_native_base": 1, "site_url": 1}) or {}
        image_url = _post_image_url(post, _kms_base_from_settings(s))
        try:
            date_disp = datetime.strptime((post.get("created_at") or "")[:19],
                                          "%Y-%m-%d %H:%M:%S").strftime("%B %d, %Y")
        except ValueError:
            date_disp = datetime.now(timezone.utc).strftime("%B %d, %Y")
        meta = {"title": post.get("title"), "author": await news_bridge._author_name(post),
                "date": date_disp, "updated_at": datetime.now(timezone.utc).isoformat()}
        if image_url:
            meta["image"] = image_url
        existing = await db.morning_pages.find_one({"ingest_slug": slug}, {"_id": 1})
        if existing:
            await db.morning_pages.update_one({"_id": existing["_id"]}, {"$set": meta})
            return
        base, ss, n = slug, slug, 2
        while await db.morning_pages.find_one({"slug": ss}):
            ss, n = f"{base}-{n}", n + 1
        await db.morning_pages.insert_one({
            "id": str(uuid.uuid4()), "slug": ss, "ingest_slug": slug,
            "html": post.get("content") or "", "image": image_url or "",
            "created_at": post.get("created_at") or datetime.now(timezone.utc).isoformat(),
            "uploaded_by": "kms-admin", **meta})
    except Exception:
        logger.warning("kms: morning mirror from post failed for %s", post.get("id"), exc_info=True)


@ingest_router.post("/internal/publish-html")
async def publish_html(request: Request):
    if not await kms_enabled():
        return JSONResponse({"status": "disabled"}, status_code=404)
    cfg = await db.kms_config.find_one({"key": "html_ingest"}) or {}
    want = (cfg.get("sync_key") or "").strip()
    got = (request.headers.get("x-sync-key") or "").strip()
    if not want or not hmac.compare_digest(got, want):
        return JSONResponse({"status": "forbidden"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"status": "bad_request"}, status_code=400)

    channel_key = str(body.get("channel") or "").strip()
    channel = (cfg.get("channels") or {}).get(channel_key)
    if not channel:
        return JSONResponse({"status": "bad_request", "detail": "unknown channel"},
                            status_code=400)
    raw = str(body.get("html") or "")
    if not raw.strip():
        return JSONResponse({"status": "bad_request", "detail": "html required"},
                            status_code=400)

    # category by slug (rename-safe), fall back to the stored id
    cat = (await db.kms_categories.find_one({"slug": channel.get("category_slug")}, {"id": 1})
           or await db.kms_categories.find_one({"id": channel.get("category_id")}, {"id": 1}))
    if not cat:
        return JSONResponse({"status": "error", "detail": "channel category not found"},
                            status_code=400)

    content, doc_title = attach_html(raw, keep_doc_css=not channel.get("strip_doc_css"),
                                     strip_fonts=bool(channel.get("strip_doc_fonts")))
    # Keep the scoped doc CSS in its OWN field (`doc_css`), NOT inside `content`.
    # A later manual save in the KMS admin runs the content through TinyMCE, which
    # strips <style> — so the brief would lose its colours the moment the author
    # touches the post (e.g. to assign an image). Stored apart and re-injected at
    # render (_render_post), the format survives every admin edit.
    doc_css = ""
    _m = re.match(r'\s*<style data-kms-doc="1">\n(.*?)\n</style>\n', content, re.S)
    if _m:
        doc_css = _m.group(1)
        content = content[_m.end():]
    title = _clean_title(str(body.get("title") or "")) or doc_title
    if not title:
        return JSONResponse({"status": "bad_request", "detail": "notitle"}, status_code=400)

    # slug + idempotency (D6): identity of a brief within a channel = `ingest_key`
    # (the pre-uniquified slug from its title). A re-drop with the same ingest_key
    # updates that post in place, keeping its real slug/id; otherwise we create and
    # uniquify the slug so we never clobber ANY pre-existing post. `force` = new copy.
    base_slug = _slugify(str(body.get("slug") or "") or title)
    existing = None
    if not body.get("force"):
        existing = await db.kms_posts.find_one(
            {"ingest_channel": channel_key, "ingest_key": base_slug},
            {"id": 1, "slug": 1, "created_at": 1})
    if existing:
        slug, post_id = existing["slug"], existing["id"]
    else:
        slug, post_id = await _unique_slug(base_slug), None

    tier = channel.get("tier") or "public"
    if tier not in ("public", "registered", "mastermind"):
        tier = "public"
    created_at = (_norm_created_at(str(body.get("date") or ""))
                  or (existing or {}).get("created_at") or _now_str())

    # Auto-banner by weekday: a channel carrying a `weekday_images` map
    # (monday..friday -> kms_images id, seeded by scripts/seed_morning_banners.py)
    # selects its featured image from the PUBLICATION weekday. Weekends have no
    # entry -> no banner. When no weekday map is configured the channel falls back
    # to its static `default_image_id` (brand-generic — other channels unaffected).
    banner_image_ref = channel.get("default_image_id")
    weekday_images = channel.get("weekday_images")
    if isinstance(weekday_images, dict):
        try:
            wd = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S").weekday()
        except ValueError:
            wd = datetime.now(timezone.utc).weekday()
        weekday_name = ("monday", "tuesday", "wednesday", "thursday", "friday",
                        "saturday", "sunday")[wd]
        banner_image_ref = weekday_images.get(weekday_name)  # None on weekends
    image_id, image = await _resolve_image(banner_image_ref)

    doc = {
        "lang_id": 1, "title": title, "slug": slug,
        "summary": _auto_summary(content), "keywords": None, "optional_url": None,
        "show_post_url": 1, "image_description": None,
        "content": content, "doc_css": doc_css,
        "category_id": cat["id"], "image_id": image_id, "image": image, "image_url": None,
        "tier": tier, "need_auth": 1 if tier in ("registered", "mastermind") else 0,
        "visibility": 1, "post_type": "article",
        "status": 1, "is_draft": 0, "is_scheduled": 0, "scheduled_at": None,
        "created_at": created_at, "updated_at": _now_str(), "tags": [],
        "show_right_column": 1,
        # provenance (news Source column + idempotency + reprocessing)
        "ingest_channel": channel_key, "ingest_key": base_slug, "ingested": True,
        "source_html": raw,
        # author stamped from the channel config (parity with admin post_save)
        "author_slug": channel.get("author_slug"),
        "author_username": channel.get("author_username") or channel.get("author_slug"),
        "author_id_membership": channel.get("author_id_membership"),
    }

    if post_id:
        await db.kms_posts.update_one({"id": post_id}, {"$set": doc})
        pid = post_id
    else:
        pid = await _next_id(db.kms_posts)
        doc.update(id=pid, pageviews=0, user_id=None)
        await db.kms_posts.insert_one(doc)

    # feed the news.<brand> mirror in-process, exactly as a manual KMS save does
    saved = await db.kms_posts.find_one({"id": pid})
    try:
        from kms import news_bridge
        await news_bridge.sync_post(saved)
    except Exception:
        logger.warning("kms ingest: news bridge sync failed for %s", pid, exc_info=True)

    if channel.get("mirror_morning"):
        # Resolve the weekday banner to an absolute KMS URL so the Brief mirror
        # shows the same header image as KMS/News. Base = settings.kms_native_base
        # (the domain that actually serves the native /uploads/*), else derived
        # from site_url (beta.<brand> -> insights.<brand>). Same source News uses.
        s = await db.settings.find_one({}, {"kms_native_base": 1, "site_url": 1}) or {}
        banner_url = _post_image_url({"image": image}, _kms_base_from_settings(s))
        await _mirror_morning(raw, title, doc["author_username"] or "",
                              (body.get("date") or created_at), slug, banner_url)

    return JSONResponse({"status": "ok", "id": pid, "slug": slug,
                         "channel": channel_key, "category": cat["id"],
                         "updated": bool(post_id)})


@ingest_router.post("/internal/publish-social-kit")
async def publish_social_kit(request: Request):
    """Social Media Kit from the local inbox publisher, on the KMS host the brief
    already uses (insights.<brand>/internal/publish-social-kit). The old receiver
    lived on morningbrief.<brand>, retired in s108. Same key as /internal/publish-html;
    stored in `morning_social_kits` (read by the IMS), joined to the brief by date."""
    if not await kms_enabled():
        return JSONResponse({"status": "disabled"}, status_code=404)
    cfg = await db.kms_config.find_one({"key": "html_ingest"}) or {}
    want = (cfg.get("sync_key") or "").strip()
    got = (request.headers.get("x-sync-key") or "").strip()
    if not want or not hmac.compare_digest(got, want):
        return JSONResponse({"status": "forbidden"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"status": "bad_request"}, status_code=400)
    content = str(body.get("html") or "")
    if not content.strip():
        return JSONResponse({"status": "bad_request", "detail": "html required"},
                            status_code=400)
    from routes.morning import _date_key, _store_social_kit  # lazy: kms loads before the routes
    date_key = _date_key(body.get("date") or "") or _date_key(body.get("filename") or "")
    if not date_key:
        return JSONResponse({"status": "bad_request", "detail": "could not resolve date"},
                            status_code=400)
    n = await _store_social_kit(content, date_key, str(body.get("filename") or ""),
                                str(body.get("author") or ""))
    return {"status": "ok", "date_key": date_key, "topics": n}
