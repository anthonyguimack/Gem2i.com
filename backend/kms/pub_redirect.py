"""KMS publication → canonical-domain redirect (KMS_PUBLICATION_SUBSCRIBE_REDIRECT_PLAN).

After a visitor subscribes on a KMS publication page, hand them off to the
publication's own domain carrying the article + their NEW ``aux-<id>`` referral
code, so their subsequent social shares grow *their* branch of the author's
community tree (the id in the URL then becomes the sharer, not the author).

Routing (Carlos D3):
  • Morning Brief category (+ subcats) → morningbrief.<brand>/<slug>/aux-<N>
  • Market Insights (+ subcats) AND everything else
                                → news.<brand>/<author_slug>/<slug>/aux-<N>

Target domains come from ``kms_config {key:"pub_redirect"}`` (brief_base /
news_base); if unset they are derived from ``settings.site_url``
(beta.<brand> → news.<brand> / morningbrief.<brand>). A Morning Brief post with
no matching ``morning_pages`` slug returns None (→ the caller keeps the reader on
KMS instead of sending them to a 404). News targets are safe because news_posts
is the KMS mirror, so <author_slug>/<slug> always resolve.
"""
from kms.core import db
from utils.referral import ref_seg


async def _channel_cat_ids():
    """(brief_cat_id, mi_cat_id) resolved from the html_ingest channel map — the
    same source news_bridge uses for the Source label, so hand-filed posts under
    those categories route correctly too."""
    cfg = await db.kms_config.find_one({"key": "html_ingest"}, {"channels": 1}) or {}
    channels = cfg.get("channels") or {}

    async def _cat(chan_key: str):
        slug = ((channels.get(chan_key) or {}).get("category_slug") or "").strip()
        if not slug:
            return None
        c = await db.kms_categories.find_one({"slug": slug}, {"id": 1})
        return c.get("id") if c else None

    return await _cat("morning_brief"), await _cat("weekly_market_update")


async def _in_tree(post: dict, root_cat_id) -> bool:
    """True when the post's category IS root_cat_id or a direct subcategory of it."""
    if not root_cat_id:
        return False
    cid = post.get("category_id")
    if not cid:
        return False
    if cid == root_cat_id:
        return True
    cat = await db.kms_categories.find_one({"id": cid}, {"parent_id": 1})
    return bool(cat and cat.get("parent_id") == root_cat_id)


def _derive_bases(site_url: str):
    """beta.<brand>.com → (https://morningbrief.<brand>.com, https://news.<brand>.com)."""
    host = (site_url or "").split("//")[-1].split("/")[0].split(":")[0].strip().lower()
    parts = [p for p in host.split(".") if p]
    if parts and parts[0] in ("beta", "www", "insights", "insights2"):
        parts = parts[1:]
    base = ".".join(parts)
    if not base:
        return "", ""
    return f"https://morningbrief.{base}", f"https://news.{base}"


async def _bases():
    """(brief_base, news_base) — config override wins, else derived from site_url."""
    cfg = await db.kms_config.find_one(
        {"key": "pub_redirect"}, {"brief_base": 1, "news_base": 1}) or {}
    brief = (cfg.get("brief_base") or "").strip().rstrip("/")
    news = (cfg.get("news_base") or "").strip().rstrip("/")
    if not brief or not news:
        s = await db.settings.find_one({}, {"site_url": 1}) or {}
        d_brief, d_news = _derive_bases(s.get("site_url") or "")
        brief = brief or d_brief
        news = news or d_news
    return brief, news


def author_sponsor(post: dict):
    """The article author's membership_number = the default sponsor root (D2).
    Overridden upstream by an incoming ?ref / share aux-N (the sharer)."""
    return (post or {}).get("author_id_membership")


async def redirect_url(post: dict, member_number) -> str | None:
    """External URL to hand the just-subscribed reader to, or None → stay on KMS.

    member_number = the reader's OWN (new or existing) membership number, which
    becomes the ``aux-<N>`` in the target URL so their shares extend their branch.
    """
    if not post or member_number in (None, 0, "", "0"):
        return None
    try:
        aux = int(member_number)
    except (TypeError, ValueError):
        return None
    slug = (post.get("slug") or "").strip()
    if not slug:
        return None
    brief_base, news_base = await _bases()
    brief_cat, _mi_cat = await _channel_cat_ids()
    # Referral segment carries the brand's own prefix (Carlos /ca-<N>, Aurex /aux-<N>,
    # Acapital /acg-<N>) — not a hardcoded 'aux' for every brand.
    s = await db.settings.find_one({}, {"aux_prefix": 1}) or {}
    seg = ref_seg(s.get("aux_prefix"), aux)

    # Morning Brief tree → brief domain, but only if the brief exists there.
    if await _in_tree(post, brief_cat):
        if not brief_base:
            return None
        if not await db.morning_pages.find_one({"slug": slug}, {"_id": 1}):
            return None  # no matching brief page → keep reader on KMS
        return f"{brief_base}/{slug}{seg}"

    # Market Insights + everything else → news domain (mirror guarantees the slug).
    if not news_base:
        return None
    author_slug = (post.get("author_slug") or "").strip()
    if not author_slug:
        return None
    return f"{news_base}/{author_slug}/{slug}{seg}"
