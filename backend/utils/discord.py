"""Shared Discord webhook helpers for the News + Morning Brief share buttons.

All configuration lives in the per-brand ``settings`` document and is managed from
CMS → Settings → **Webhook**. Secrets (the webhook URLs) never leave the server:
they are stripped from the public settings endpoint and masked in the admin one.

Config keys (all optional, sensible fallbacks):
  • ``discord_enabled``            – global on/off (absent ⇒ enabled, back-compat)
  • ``discord_embed_color``        – hex override for the embed stripe (blank ⇒ brand accent)
  • ``discord_username``           – sender name override (blank ⇒ the brand name)
  • ``discord_avatar_url``         – per-message avatar (blank ⇒ the webhook's own)
  • ``morning_discord_webhook``    – Morning Brief share target
  • ``news_discord_webhook``       – News post-detail share target
  • ``news_discord_webhook_news``  – News listing/dashboard share target
"""
import logging

import httpx

logger = logging.getLogger(__name__)

_FALLBACK_COLOR = 16711680  # legacy red — only if nothing else resolves


def hex_to_int(value):
    """'#0D9488' / '0D9488' / '#abc' → Discord decimal color int, or None."""
    if not value or not isinstance(value, str):
        return None
    v = value.strip().lstrip("#")
    if len(v) == 3:  # shorthand → expand
        v = "".join(c * 2 for c in v)
    if len(v) != 6:
        return None
    try:
        return int(v, 16)
    except ValueError:
        return None


def brand_accent_int(settings):
    """Default embed color = the site's brand Accent (Settings → Colors → Website)."""
    website = ((settings or {}).get("theme_colors") or {}).get("website") or {}
    return hex_to_int(website.get("accent")) or _FALLBACK_COLOR


def embed_color(settings):
    """Admin override wins; otherwise the brand accent; otherwise legacy red."""
    override = hex_to_int((settings or {}).get("discord_embed_color"))
    return override if override is not None else brand_accent_int(settings)


def sharing_enabled(settings):
    """Global kill-switch. Absent ⇒ enabled (so existing brands keep working)."""
    return (settings or {}).get("discord_enabled", True) is not False


def resolve_webhook(settings, kind):
    """kind: 'morning' | 'news' | 'news_listing' → the configured URL (or '').

    Falls back morning→news and news_listing→news, preserving prior behaviour."""
    s = settings or {}
    if kind == "morning":
        return (s.get("morning_discord_webhook") or s.get("news_discord_webhook") or "").strip()
    if kind == "news_listing":
        return (s.get("news_discord_webhook_news") or s.get("news_discord_webhook") or "").strip()
    return (s.get("news_discord_webhook") or "").strip()


def build_embed(settings, title="", description="", url="", image=""):
    """Build a Discord embed defensively — Discord 400s the whole payload if
    ``url`` or ``image.url`` is present but empty/invalid, so only include fields
    that actually have an http(s) value."""
    embed = {"color": embed_color(settings)}
    if (title or "").strip():
        embed["title"] = title.strip()[:256]
    if (description or "").strip():
        embed["description"] = description.strip()[:4000]
    u = (url or "").strip()
    if u.startswith("http"):
        embed["url"] = u
    img = (image or "").strip()
    if img.startswith("http"):
        embed["image"] = {"url": img}
    return embed


def build_payload(settings, default_username, embed):
    """Wrap an embed with the sender name/avatar overrides."""
    s = settings or {}
    payload = {
        "username": (s.get("discord_username") or "").strip() or default_username or "Notification",
        "embeds": [embed],
    }
    avatar = (s.get("discord_avatar_url") or "").strip()
    if avatar.startswith("http"):
        payload["avatar_url"] = avatar
    return payload


async def send(webhook, payload):
    """POST to a Discord webhook. Returns {'status': 'ok'|'failed', ...}."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(webhook, json=payload)
        if r.status_code < 300:
            return {"status": "ok"}
        logger.warning("discord webhook rejected: HTTP %s — %s", r.status_code, (r.text or "")[:300])
        return {"status": "failed", "message": f"Discord HTTP {r.status_code}"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("discord webhook failed: %s", exc)
        return {"status": "failed", "message": "send failed"}
