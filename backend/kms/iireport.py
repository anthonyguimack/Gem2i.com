"""iiReport house style — the KMS imposes its own design on uploaded iiReport
Series Ranking documents, regardless of the source HTML's own colours.

The analyst uploads the report HTML "as is" (its own blue letter-sheet styling,
an ACapital masthead, a "Page X of 2" running header). This module recognises
that document by its structural signature and, on save/ingest:

  * discards the document's own stylesheet and applies the brand HOUSE_CSS
    (navy table headers, cream/gold accents, KMS typography) into the post's
    separate ``doc_css`` field — TinyMCE-proof, re-injected by the public render;
  * hides the document masthead + running header (content only);
  * appends the report date ("As of <Month D, YYYY>") to the post title when the
    title doesn't already carry a year, mirroring the sample post.

Per-brand: HOUSE_CSS is expressed through local CSS variables whose defaults are
the approved Carlos design. A brand that wants a different palette sets
``settings.iireport_house_css`` (full override) — no code change, and every
other brand keeps the shared default. The design lives ONLY here so every brand
gets it on its next KMS deploy; the styling is data-free (no per-instance seed).
"""
import re

# Approved house style (session 2026-09-18). Scoped under `.post-content`; the
# two brand-sensitive colours (`--ii-band` dark, `--ii-accent` gold) are local
# variables so a brand can retint without touching structure. Defaults = the
# design Carlos approved against iireport-...-june-26-2026-sample.
HOUSE_CSS = (
    ".post-content .sheet{--ii-band:#1B2A4A;--ii-accent:#C9A24B;--ii-accent-ink:#8a6d1f;"
    "--ii-cream:#F6F5F1;--ii-line:#ddd9cf;--ii-ink:#3a3630;--ii-muted:#6a6456}\n"
    "/* KMS content font — never the document's own Arial. */\n"
    ".post-content .sheet,.post-content .sheet *{font-family:var(--font-primary,inherit)}\n"
    "/* No outer card frame, flush-left with the post column (title/author) —\n"
    "   kill the document's own 20px side gutter so nothing looks indented. */\n"
    ".post-content .sheet{max-width:none;margin:0 0 18px;padding:0;background:transparent;color:#1a1a1a}\n"
    ".post-content .sheet.pagebreak{margin-top:18px}\n"
    ".post-content .sheet img{max-width:100%;height:auto}\n"
    ".post-content .sheet>div[style]{padding-left:0!important;padding-right:0!important}\n"
    "/* Drop the document's masthead (ACapital logo band) + 'Page X of 2' header. */\n"
    ".post-content .mast,.post-content .hdr{display:none}\n"
    ".post-content .verdict{background:var(--ii-cream);border-left:4px solid var(--ii-accent);padding:12px 16px;"
    "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}\n"
    ".post-content .verdict .v{color:var(--ii-band);font-weight:700;font-size:16px}\n"
    ".post-content .verdict .sc{color:var(--ii-accent-ink);font-weight:700;font-size:15px}\n"
    ".post-content .style{padding:12px 0 0;color:var(--ii-ink);font-size:16px;line-height:1.65}\n"
    ".post-content .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:12px 0 0}\n"
    ".post-content .block{border:1px solid var(--ii-line);border-radius:4px;overflow:hidden;margin-bottom:12px}\n"
    ".post-content .block h3{margin:0;background:var(--ii-band);color:var(--ii-cream);font-size:14px;padding:8px 12px;font-weight:700}\n"
    ".post-content .block table{width:100%;border-collapse:collapse;font-size:14.5px}\n"
    ".post-content .block td{padding:7px 12px;border-top:1px solid #ede9df}\n"
    ".post-content .block td.r{text-align:right;font-weight:700;white-space:nowrap;color:var(--ii-band)}\n"
    ".post-content .foot{padding:8px 0 0;color:var(--ii-muted);font-size:13.5px;line-height:1.55}\n"
    ".post-content .band{margin:16px 0 0;background:var(--ii-cream);border-left:4px solid var(--ii-accent);"
    "border-radius:0 4px 4px 0;padding:16px 18px}\n"
    ".post-content .band h4{margin:0 0 6px;color:var(--ii-band);font-size:16px}\n"
    ".post-content .band p{margin:0;font-size:16px;line-height:1.65;color:var(--ii-ink)}\n"
    ".post-content .disc{margin:16px 0 18px;color:var(--ii-muted);font-style:italic;font-size:14px;"
    "line-height:1.65;border-top:1px solid var(--ii-line);padding-top:12px}\n"
    ".post-content table.rank{width:100%;border-collapse:collapse;font-size:15px;margin:0}\n"
    ".post-content table.rank th{background:var(--ii-band);color:var(--ii-cream);padding:10px 8px;text-align:left;"
    "font-size:14px;font-weight:600;white-space:nowrap}\n"
    ".post-content table.rank td{padding:10px 8px;border-bottom:1px solid var(--ii-line);vertical-align:top}\n"
    ".post-content table.rank tr.top td{font-weight:700}\n"
    ".post-content table.rank td.n{text-align:right;white-space:nowrap}\n"
    ".post-content .tprow{margin:16px 0 0;border:1px solid var(--ii-line);border-radius:4px;overflow:hidden}\n"
    ".post-content .tprow .navy{background:var(--ii-band);color:var(--ii-cream);padding:10px 16px;display:flex;"
    "justify-content:space-between;font-weight:700;font-size:15.5px}\n"
    ".post-content .tprow .lad{display:flex;gap:18px;flex-wrap:wrap;padding:10px 16px;font-size:15px;background:var(--ii-cream)}\n"
    ".post-content .tprow .lad b{color:var(--ii-accent-ink)}\n"
    ".post-content .tprow p{margin:0;padding:12px 16px;font-size:16px;line-height:1.65;color:var(--ii-ink)}\n"
    "@media(max-width:640px){.post-content .grid{grid-template-columns:1fr}.post-content table.rank{font-size:13px}"
    ".post-content table.rank th,.post-content table.rank td{padding:7px 5px}}\n"
)

# Structural signature: an iiReport carries a `.sheet` document frame AND a
# ranking table `<table class="rank">`. Both must be present (a stray class name
# in an unrelated post never trips it).
_SHEET = re.compile(r'class\s*=\s*"[^"]*\bsheet\b', re.I)
_RANK = re.compile(r'<table[^>]*class\s*=\s*"[^"]*\brank\b', re.I)
# "As of September 4, 2026 market close" -> the report date.
_ASOF = re.compile(
    r'As of\s+('
    r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|'
    r'Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    r'\.?\s+\d{1,2},?\s+\d{4})', re.I)


def is_iireport(content: str) -> bool:
    """True when the HTML is an iiReport Series Ranking document."""
    c = content or ""
    return bool(_SHEET.search(c) and _RANK.search(c))


def report_date(content: str):
    """The 'As of <Month D, YYYY>' date, normalised to 'Month D, YYYY', or None."""
    m = _ASOF.search(content or "")
    if not m:
        return None
    return re.sub(r'\s+', ' ', m.group(1)).replace(' ,', ',').strip()


def ensure_report_date(title: str, content: str) -> str:
    """Append the report date to the title when it carries no year yet
    (`iiReport - … - September 4, 2026`), mirroring the sample post."""
    title = (title or "").strip()
    if re.search(r'\b\d{4}\b', title):          # already dated — leave it
        return title
    d = report_date(content)
    if not d:
        return title
    return (title + " - " + d).strip(" -") if title else ("iiReport - " + d)


_DATA_IMG = re.compile(r'<img\b[^>]*?src\s*=\s*(["\'])data:[^"\']*\1[^>]*>', re.I | re.S)


def strip_heavy(content: str) -> str:
    """Drop base64/data-URI <img> tags — the ACapital masthead logo the document
    embeds inline (~1.5 MB) is hidden by the house style but still ships to every
    reader. Company logos, charts etc. are served from /uploads (URL src), so this
    removes only the heavy inline artwork."""
    return _DATA_IMG.sub("", content or "")


# Inline typography the document carries (e.g. <p style="font-size:10.5px">) beats
# the house stylesheet — the KMS design "no se negocia", so strip it. font-weight
# / font-style survive (not matched); colours (the green/red up/down cues) survive.
_INLINE_TYPO = re.compile(r'(?:^|;)\s*(?:font-size|font-family|font|line-height)\s*:[^;]*', re.I)
_STYLE_ATTR = re.compile(r'style\s*=\s*"([^"]*)"', re.I)


def neutralize_inline_typography(content: str) -> str:
    def repl(m):
        style = _INLINE_TYPO.sub("", m.group(1)).strip(" ;")
        return ('style="%s"' % style) if style else ""
    return _STYLE_ATTR.sub(repl, content or "")


def _hex(c):
    c = (c or "").strip().lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if len(c) != 6:
        return None
    try:
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def _lum(rgb):
    r, g, b = [x / 255 for x in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _darken(rgb, f):
    return tuple(max(0, min(255, int(x * f))) for x in rgb)


def _tohex(rgb):
    return "#%02x%02x%02x" % rgb


_VARS_RULE = re.compile(r"\.post-content \.sheet\{--ii-band:[^}]*\}")
# KMS colour token (Settings → Colors → KMS) → iiReport variable it drives.
_KMS_TO_II = {"band": "band", "accent": "accent", "box_bg": "cream",
              "line": "line", "ink": "ink", "muted": "muted"}


def _vars(settings: dict = None, kms_colors: dict = None) -> dict:
    """The --ii-* values for this brand. Base = the approved defaults; then the
    website palette (`settings.theme_colors.website`): accent = `accent`, band =
    `icon_color` when dark, else the accent darkened (Aurex only defines a light
    accent); then any colour set explicitly in the KMS palette (`kms_colors` =
    kms_settings.general.theme_colors — Settings → Colors → KMS) wins."""
    v = {"band": "#1B2A4A", "accent": "#C9A24B", "accent-ink": "#8a6d1f",
         "cream": "#F6F5F1", "line": "#ddd9cf", "ink": "#3a3630", "muted": "#6a6456"}
    web = ((settings or {}).get("theme_colors") or {}).get("website") or {}
    acc = _hex(web.get("accent"))
    if acc:
        ic = _hex(web.get("icon_color"))
        v["accent"] = _tohex(acc)
        v["band"] = _tohex(ic) if (ic and _lum(ic) < 0.42) else _tohex(_darken(acc, 0.42))
        v["accent-ink"] = _tohex(_darken(acc, 0.62))
    for tok, var in _KMS_TO_II.items():
        rgb = _hex((kms_colors or {}).get(tok))
        if rgb:
            v[var] = _tohex(rgb)
            if tok == "accent":
                v["accent-ink"] = _tohex(_darken(rgb, 0.62))
    # "Report Headers (internal pages)": the report's own header colour — bars,
    # table headers — without touching the KMS masthead (`band`). Wins over band.
    rb = _hex((kms_colors or {}).get("report_band"))
    if rb:
        v["band"] = _tohex(rb)
    return v


def effective_band(settings: dict = None, kms_colors: dict = None) -> str:
    """The header colour reports use today when no `report_band` is set (for the
    CMS field's placeholder, so it shows the real colour, not a theme default)."""
    kc = {k: val for k, val in (kms_colors or {}).items() if k != "report_band"}
    return _vars(settings, kc)["band"]


def _vars_rule(settings: dict = None, kms_colors: dict = None) -> str:
    v = _vars(settings, kms_colors)
    return (".post-content .sheet{" + "".join(f"--ii-{k}:{v[k]};" for k in
            ("band", "accent", "accent-ink", "cream", "line", "ink", "muted")).rstrip(";") + "}")


def house_css(settings: dict = None, kms_colors: dict = None) -> str:
    """The stylesheet the KMS imposes, tinted to THIS brand's identity so each
    site keeps its own colours (Carlos gold+navy, Aurex green, Acapital orange…).
    A full per-instance override in `settings.iireport_house_css` wins; otherwise
    the colours come from `_vars` (website palette, then the KMS palette)."""
    override = ((settings or {}).get("iireport_house_css") or "").strip()
    if override:
        return override
    return _VARS_RULE.sub(_vars_rule(settings, kms_colors), HOUSE_CSS, count=1)


def retint(doc_css: str, settings: dict = None, kms_colors: dict = None) -> str:
    """Render-time recolour of a stored iiReport `doc_css` (the stylesheet is baked
    into each post when it is saved), so a palette change reaches every existing
    report without re-saving them. Non-iiReport CSS and the full override pass
    through untouched."""
    if not doc_css or ((settings or {}).get("iireport_house_css") or "").strip():
        return doc_css
    return _VARS_RULE.sub(_vars_rule(settings, kms_colors), doc_css, count=1)


def apply(content: str, doc_css: str, title: str, settings: dict = None, kms_colors: dict = None):
    """If `content` is an iiReport, return (content, house_doc_css, dated_title);
    otherwise pass everything through unchanged. `content` is expected to already
    have any <style data-kms-doc> lifted out (the caller does that) — here we only
    swap in the house stylesheet and date the title."""
    if not is_iireport(content):
        return content, doc_css, title
    content = neutralize_inline_typography(strip_heavy(content))
    return content, house_css(settings, kms_colors), ensure_report_date(title, content)
