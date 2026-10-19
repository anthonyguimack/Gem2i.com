"""KMS → news.<brand> in-process bridge (Phase 5).

Replaces the MySQL CRC live-sync once a brand cuts over: on publish/edit/
unpublish/delete the KMS upserts/removes the post in the SAME `news_posts`
mirror news.py already renders — doc shape identical to news.py's
`_news_doc_from_row`, so the news feed, subscribe funnel, Discord share and
statistics need zero changes.

DORMANT unless `settings.kms_native_news_enabled` (set at Phase-6 cutover,
when the old PHP stops being the source of truth). All calls are best-effort:
a bridge failure must never break a KMS save.
"""
import logging
from datetime import datetime, timezone

from kms import core
from kms.core import db

logger = logging.getLogger(__name__)


async def _enabled() -> bool:
    s = await db.settings.find_one({}, {"kms_native_news_enabled": 1, "site_url": 1}) or {}
    return bool(s.get("kms_native_news_enabled"))


async def _base() -> str:
    s = await db.settings.find_one({}, {"kms_native_base": 1, "site_url": 1}) or {}
    base = (s.get("kms_native_base") or "").strip()
    if not base:
        site = (s.get("site_url") or "").strip().rstrip("/")
        # beta.<brand>.com -> insights.<brand>.com (cutover default)
        base = site.replace("://beta.", "://insights.") if "://beta." in site else site
    return base.rstrip("/") + "/"


def _published(post: dict) -> bool:
    # Only PUBLIC-tier posts reach the open news domain (ANALYST_HTML_KMS_PIPELINE
    # D9 / D-2026-63 R8: registered + mastermind stay hidden, never teased). A tier
    # change on edit calls sync_post again → the row is added or removed accordingly.
    return (post.get("status") == 1 and post.get("visibility") == 1
            and post.get("is_scheduled") != 1
            and (post.get("tier") or "public") == "public")


async def _author_name(post: dict) -> str:
    """Friendly byline for News: the member's real name, falling back to the KMS
    username (which is slug-like, e.g. 'carlos.artiles')."""
    mid = post.get("author_id_membership")
    if mid is not None:
        m = await db.members.find_one({"membership_number": mid},
                                      {"first_name": 1, "last_name": 1})
        if m:
            nm = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
            if nm:
                return nm
    return post.get("author_username") or ""


async def _source_channel(post: dict):
    """News "Source" label for a post — resolved from its subcategory via the
    html_ingest channel map, so BOTH ingested drops AND posts saved by hand under
    those subcategories carry the label (D7). Any other category → None ("—")."""
    cat_id = post.get("category_id")
    if not cat_id:
        return None
    cat = await db.kms_categories.find_one({"id": cat_id}, {"slug": 1})
    if not cat:
        return None
    cfg = await db.kms_config.find_one({"key": "html_ingest"}, {"channels": 1}) or {}
    for ch in (cfg.get("channels") or {}).values():
        if ch.get("category_slug") == cat.get("slug"):
            return ch.get("label")
    return None


async def sync_post(post: dict) -> None:
    """Upsert (published) or remove (anything else) the news mirror row."""
    try:
        if not await _enabled():
            return
        if not _published(post):
            await db.news_posts.delete_many({"kms_id": post["id"]})
            return
        img = post.get("image") or {}
        image_path = (img.get("image_default") or img.get("image_big") or "").strip()
        base = await _base()
        doc = {
            "kms_id": post["id"], "origin": "kms_native",
            "source_channel": await _source_channel(post),
            "author_slug": post.get("author_slug"),
            "author_name": await _author_name(post),
            "author_membership": post.get("author_id_membership"),
            "slug": post.get("slug"), "title": post.get("title"),
            "summary": post.get("summary"), "content": post.get("content"),
            "image_path": image_path,
            "image_url": (base + image_path.lstrip("/")) if image_path
                         else (post.get("image_url") or ""),
            "status": 1, "visibility": 1, "need_auth": post.get("need_auth") or 0,
            "created_at": post.get("created_at"), "updated_at": post.get("updated_at"),
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.news_posts.replace_one({"kms_id": doc["kms_id"]}, doc, upsert=True)
    except Exception:
        logger.warning("kms news bridge sync failed for post %s", post.get("id"),
                       exc_info=True)


async def remove_post(post_id: int) -> None:
    try:
        if await _enabled():
            await db.news_posts.delete_many({"kms_id": post_id})
    except Exception:
        logger.warning("kms news bridge remove failed for %s", post_id, exc_info=True)
