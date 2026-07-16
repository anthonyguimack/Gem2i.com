# Carve Anthony's three published brand briefs into merge shells:
# content regions -> {{PLACEHOLDER}}s, chrome (CSS + base64 logos + mastheads +
# disclaimers) kept as literal bytes for exact brand fidelity.
import json
import re
import sys

SRC = r"D:\AcapitalGroup_Activos_Assets\Morning-Brief-Generate"
FILES = {
    "carlos": "CarlosArtiles_Morning_Brief_2026-07-02.html",
    "aurex": "Aurex_Morning_Brief_2026-07-02.html",
    "acapital": "ACapital_Morning_Brief_2026-07-02.html",
}

def carve(html: str, brand: str) -> str:
    n0 = len(html)
    # 1. content fields (carve BEFORE date replacement — kicker/deck contain dates)
    html, c1 = re.subn(r'(<div class="kicker">).*?(</div>)', r'\g<1>{{KICKER}}\g<2>', html, count=1, flags=re.S)
    html, c2 = re.subn(r'(<h1 class="title">).*?(</h1>)', r'\g<1>{{TITLE}}\g<2>', html, count=1, flags=re.S)
    html, c3 = re.subn(r'(<div class="standfirst">).*?(</div>)', r'\g<1>{{STANDFIRST}}\g<2>', html, count=1, flags=re.S)
    html, c4 = re.subn(r'(<div class="deck">).*?(</div>)', r'\g<1>{{DECK}}\g<2>', html, count=1, flags=re.S)
    # 2. body region: everything between the deck and the disclaimer box
    html, c5 = re.subn(r'(<div class="deck">\{\{DECK\}\}</div>).*?(<div class="disclaimer-box")',
                       '\\g<1>\n\n{{BODY}}\n\n\\g<2>', html, count=1, flags=re.S)
    # 3. dates + compile time in the remaining chrome (title tag, masthead meta)
    html = html.replace("Thursday, July 2, 2026", "{{DATE_LONG}}")
    html = html.replace("July 2, 2026", "{{DATE_LONG}}")
    html = re.sub(r"~\d{1,2}:\d{2}\s*[AP]M\s*ET", "{{TIME}}", html)

    checks = {
        "kicker": c1 == 1, "title": c2 == 1, "standfirst": c3 == 1,
        "deck": c4 == 1, "body": c5 == 1,
        "body_once": html.count("{{BODY}}") == 1,
        "date_ph": "{{DATE_LONG}}" in html,
        "no_july2": "July 2" not in html,
        "logo_intact": "data:image" in html,
        "doctype": html.lstrip().lower().startswith("<!doctype"),
    }
    bad = [k for k, v in checks.items() if not v]
    if bad:
        raise SystemExit(f"{brand}: carve checks FAILED: {bad}")
    print(f"{brand}: OK  {n0} -> {len(html)} chars  (checks all pass)")
    return html

shells = {}
for brand, fname in FILES.items():
    with open(f"{SRC}\\{fname}", encoding="utf-8") as f:
        shells[brand] = carve(f.read(), brand)

out = sys.argv[1]
with open(out, "w", encoding="utf-8") as f:
    json.dump({"key": "brand_templates", **shells}, f)
print("written:", out)
