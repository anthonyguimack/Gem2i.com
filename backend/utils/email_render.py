"""Render an email template + branding wrapper, then send via SMTP."""
import re
import logging
from html import escape
from models.database import db, send_email_smtp
from models.email_templates import (
    EMAIL_TEMPLATES,
    DEFAULT_EMAIL_BRANDING,
    EMAIL_FONT_OPTIONS,
    get_template_definition,
    get_font_config,
)

logger = logging.getLogger(__name__)

_VAR_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def resolve_i18n(value, lang: str = "en") -> str:
    """Some Settings values (brand_name, tagline, …) are stored as i18n
    dicts: ``{"en": "Aurex Network", "es": "…"}``. Anywhere those values
    flow into an email, we have to flatten them down to a plain string —
    `html.escape` and Jinja-style substitution will choke on a dict.

    Returns ``""`` for ``None``/empty, the dict's `lang` value (with sane
    fallbacks), or the value cast to ``str`` for everything else.
    """
    if value is None or value == "":
        return ""
    if isinstance(value, dict):
        if lang in value and value[lang]:
            return str(value[lang])
        if "en" in value and value["en"]:
            return str(value["en"])
        # First non-empty value, regardless of locale.
        for v in value.values():
            if v:
                return str(v)
        return ""
    return str(value)


def _substitute(text: str, variables: dict) -> str:
    """Replace `{{key}}` placeholders.  Unknown placeholders are left as-is
    so the operator can spot typos in the editor (rather than silently
    rendering empty strings).  Dict values (i18n) are auto-flattened."""
    if not text:
        return ""
    def _r(match):
        k = match.group(1)
        v = variables.get(k)
        if v is None:
            return match.group(0)
        return resolve_i18n(v)
    return _VAR_RE.sub(_r, text)


async def ensure_templates_seeded():
    """Insert any template that's defined in code but missing from the DB.
    Idempotent — safe to call on every backend startup."""
    existing_keys = {t["key"] for t in await db.email_templates.find({}, {"_id": 0, "key": 1}).to_list(100)}
    for t in EMAIL_TEMPLATES:
        if t["key"] in existing_keys:
            continue
        await db.email_templates.insert_one({
            "key": t["key"],
            "subject": t["default_subject"],
            "body": t["default_body"],
            "enabled": True,
        })
    # Ensure a branding doc exists.
    if not await db.email_branding.find_one({"id": "main"}):
        await db.email_branding.insert_one({"id": "main", **DEFAULT_EMAIL_BRANDING})


async def get_template(key: str) -> dict:
    """Return the saved (DB) template for `key`, falling back to the in-code
    defaults if the DB row isn't present yet."""
    saved = await db.email_templates.find_one({"key": key}, {"_id": 0})
    definition = get_template_definition(key)
    if not definition:
        # Allow rendering of arbitrary keys (defensive — shouldn't happen).
        return {
            "key": key,
            "subject": (saved or {}).get("subject", ""),
            "body": (saved or {}).get("body", ""),
            "enabled": (saved or {}).get("enabled", True),
        }
    return {
        "key": key,
        "subject": (saved or {}).get("subject") or definition["default_subject"],
        "body":    (saved or {}).get("body")    or definition["default_body"],
        "enabled": True if saved is None else saved.get("enabled", True),
    }


async def get_branding() -> dict:
    doc = await db.email_branding.find_one({"id": "main"}, {"_id": 0}) or {}
    out = {**DEFAULT_EMAIL_BRANDING, **doc}
    out.pop("id", None)
    return out


def _wrap_with_branding(body_html: str, branding: dict, variables: dict, platform_name: str) -> str:
    """Wrap the rendered template body with the configured branding shell.

    Stays deliberately email-client-friendly: table-based, inline styles, no
    flexbox.  Buttons inside the body that use class="btn" automatically pick
    up the configured button color.  The font choice is applied via an
    inline @import of the Google Font (clients that block remote CSS will
    fall through to the system fallback in the stack)."""
    # Defensive: strip i18n dicts down to plain strings so html.escape never
    # sees a dict (callers should already have flattened these, but the wrapper
    # is the last line of defence).
    platform_name = resolve_i18n(platform_name) or "Legacy"
    primary = branding.get("primary_color") or DEFAULT_EMAIL_BRANDING["primary_color"]
    btn_bg = branding.get("button_color") or DEFAULT_EMAIL_BRANDING["button_color"]
    btn_fg = branding.get("button_text_color") or DEFAULT_EMAIL_BRANDING["button_text_color"]
    logo_url = branding.get("logo_url") or ""
    font = get_font_config(branding.get("font_family"))
    font_stack = font["stack"]
    google_fonts_param = font["google"]
    footer_text = _substitute(branding.get("footer_text") or "", {**variables, "platform_name": platform_name})
    social = branding.get("social_links") or []

    # Apply button styling to any anchor tagged with class="btn".
    btn_style = (f"display:inline-block;padding:12px 28px;background:{btn_bg};color:{btn_fg};"
                 f"text-decoration:none;border-radius:8px;font-weight:600;font-family:{font_stack};")
    body_html = re.sub(
        r'<a([^>]*?)class="btn"([^>]*)>',
        lambda m: f'<a{m.group(1)}style="{btn_style}"{m.group(2)}>',
        body_html,
    )

    # Headings that don't already declare a font-family inherit the chosen one.
    body_html = re.sub(
        r'<(h[1-6])([^>]*)>',
        lambda m: (f'<{m.group(1)}{m.group(2)} style="font-family:{font_stack};">'
                   if 'font-family' not in (m.group(2) or '')
                   else f'<{m.group(1)}{m.group(2)}>'),
        body_html,
    )

    logo_html = (
        f'<img src="{escape(logo_url)}" alt="{escape(platform_name)}" '
        f'style="max-height:48px;display:block;margin:0 auto 8px;" />'
        if logo_url else
        f'<div style="font-size:22px;font-weight:700;color:#ffffff;font-family:{font_stack};">{escape(platform_name)}</div>'
    )

    socials_html = ""
    if social:
        items = []
        for s in social:
            url = (s.get("url") or "").strip()
            label = (s.get("platform") or s.get("icon") or "").strip()
            if url and label:
                items.append(f'<a href="{escape(url)}" style="color:#9ca3af;text-decoration:none;margin:0 8px;font-size:13px;">{escape(label)}</a>')
        if items:
            socials_html = f'<div style="margin-top:8px;">{" ".join(items)}</div>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family={google_fonts_param}&display=swap');
  body, table, td, p, h1, h2, h3, h4, h5, h6, a, span, div {{ font-family: {font_stack}; }}
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:{font_stack};color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);font-family:{font_stack};">
        <tr><td style="background:{primary};padding:24px;text-align:center;">{logo_html}</td></tr>
        <tr><td style="padding:32px 32px 24px;font-size:15px;line-height:1.6;color:#111827;font-family:{font_stack};">
          {body_html}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280;font-family:{font_stack};">
          {escape(footer_text)}
          {socials_html}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


async def render_email(key: str, variables: dict, platform_name: str | None = None) -> dict:
    """Return `{subject, html}` for `key` after substituting variables and
    applying the branding wrapper.  Pure function — does NOT send.

    `platform_name` and `site_url` are auto-derived from CMS Settings →
    General if the caller doesn't pass them explicitly, so every template
    can reference `{{platform_name}}` / `{{site_url}}` without each call
    site having to thread those through.  i18n dicts are flattened.

    Resolution priority for `platform_name` and `site_url`:
      1. Caller-supplied value (explicit kwarg or non-empty in `variables`)
      2. CMS Settings → General (`brand_name`, `site_url`)
      3. Sensible fallback (`"Legacy"` / origin from request)
    Sample defaults in template registries lose to the real CMS values
    so previews never lie."""
    template = await get_template(key)
    branding = await get_branding()
    settings = await db.settings.find_one({}, {"_id": 0}) or {}

    full_vars = {**variables}

    # ── platform_name ──
    cms_brand = resolve_i18n(settings.get("brand_name"))
    explicit_brand = resolve_i18n(platform_name)
    full_vars["platform_name"] = (
        explicit_brand
        or cms_brand
        or resolve_i18n(full_vars.get("platform_name"))
        or "Legacy"
    )

    # ── site_url ──
    cms_site_url = (settings.get("site_url") or "").rstrip("/")
    if not full_vars.get("site_url"):
        full_vars["site_url"] = cms_site_url or ""
    if cms_site_url:  # CMS value wins over sample defaults
        full_vars["site_url"] = cms_site_url

    # Sample variables in the template registry use `https://example.com/...`
    # placeholder URLs so the editor preview is readable even before the
    # operator configures Site URL.  When Site URL *is* configured, swap
    # those placeholders out so the preview / test-send shows the real
    # destination rather than a broken example.com link.
    if cms_site_url:
        for k, v in list(full_vars.items()):
            if isinstance(v, str) and v.startswith("https://example.com"):
                full_vars[k] = cms_site_url + v[len("https://example.com"):]

    # Flatten any other dict values (defensive — operator-supplied vars).
    for k, v in list(full_vars.items()):
        if isinstance(v, dict):
            full_vars[k] = resolve_i18n(v)

    subject = _substitute(template["subject"], full_vars)
    body_inner = _substitute(template["body"], full_vars)
    html = _wrap_with_branding(body_inner, branding, full_vars, full_vars["platform_name"])
    return {"subject": subject, "html": html, "enabled": template.get("enabled", True)}


def _looks_like_html(s: str) -> bool:
    """Heuristic: does the composed body already contain HTML markup?"""
    return bool(s) and "<" in s and ">" in s


def _plain_to_html(s: str) -> str:
    """Turn a plain-text compose (textarea) into safe HTML: escape, keep blank
    lines as paragraphs and single newlines as <br>."""
    esc = escape(s or "").strip()
    if not esc:
        return ""
    paras = re.split(r"\n\s*\n", esc)
    return "".join(
        f'<p style="margin:0 0 1em;">{p.strip().replace(chr(10), "<br>")}</p>'
        for p in paras if p.strip()
    )


async def render_user_html(body_html: str, platform_name: str | None = None) -> str:
    """Wrap a USER-composed mailbox message in the configured email-branding shell
    (logo header, brand colors, footer/socials) so external recipients get a
    formatted email instead of raw/plain text. Used by the multi-user Mail module.

    Plain-text composes are converted to HTML first; bodies that already contain
    markup are wrapped as-is. Returns the full branded HTML document."""
    branding = await get_branding()
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    name = resolve_i18n(platform_name) or resolve_i18n(settings.get("brand_name")) or "Legacy"
    inner = body_html or ""
    if not _looks_like_html(inner):
        inner = _plain_to_html(inner)
    variables = {"platform_name": name, "site_url": (settings.get("site_url") or "").rstrip("/")}
    return _wrap_with_branding(inner, branding, variables, name)


async def render_and_send(
    key: str,
    settings: dict,
    to_email: str,
    to_name: str,
    variables: dict,
    cc_list: list | None = None,
    from_email: str = "",
    from_name: str = "",
):
    """Render the named template and dispatch via SMTP.

    Errors are logged (not raised) so callers can mirror the previous
    "best-effort" behaviour of the inline `send_email_smtp` calls.
    """
    if not settings or not settings.get("smtp_host"):
        return  # SMTP unconfigured → nothing to do (mirrors prior behaviour).
    platform_name = settings.get("brand_name", "Legacy")
    try:
        rendered = await render_email(key, variables, platform_name=platform_name)
        if not rendered["enabled"]:
            logger.info(f"Email template '{key}' is disabled — skipping send.")
            return
        await send_email_smtp(
            settings, to_email, to_name, rendered["subject"], rendered["html"],
            from_email=from_email, from_name=from_name, cc_list=cc_list,
        )
    except Exception as e:
        logger.warning(f"Failed to send email '{key}' to {to_email}: {e}")
