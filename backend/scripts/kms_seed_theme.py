"""Seed a brand's KMS theme tokens (kms_settings.general.theme_colors/theme_fonts)
with its Market Insight Notes palette — KMS_MODERNA_SPEC.md §1.

Run ON THE BRAND'S BOX (uses the backend .env / local Mongo):
    venv/bin/python scripts/kms_seed_theme.py --brand carlos [--db carlosartiles_cms] [--force]

Idempotent: existing configured tokens are kept unless --force. Deliberately NOT
run at deploy time — the tokens feed BOTH themes, so seeding the editorial palette
recolors Magazine too; seed when (or just before) Moderna is activated (plan D5).
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

PALETTES = {
    "carlos": {
        "colors": {"band": "#1B2A4A", "heading": "#1B2A4A", "accent": "#C9A24B",
                   "kicker": "#C9A24B", "box_bg": "#F6F5F1", "ink": "#1f2530",
                   "muted": "#6a6456", "line": "#ddd9cf", "row_alt": "#f6f5f1",
                   "negative": "#9e3b2f", "positive": "#1f6b48"},
        "fonts": {"heading_font": "Georgia, 'Times New Roman', serif",
                  "body_font": "Georgia, 'Times New Roman', serif",
                  "heading_weight": "400"},
    },
    "aurex": {
        "colors": {"band": "#11151C", "heading": "#11151C", "accent": "#85DB67",
                   "kicker": "#5BA63F", "box_bg": "#F2F5F0", "ink": "#1c2128",
                   "muted": "#6a6f68", "line": "#d9ddd6", "row_alt": "#f2f5f0",
                   "negative": "#b23b2c", "positive": "#2f8f50"},
        "fonts": {"heading_font": "Helvetica, Arial, sans-serif",
                  "body_font": "Helvetica, Arial, sans-serif",
                  "heading_weight": "800"},
    },
    "acapital": {
        "colors": {"band": "#285090", "heading": "#1f2d44", "accent": "#c0902f",
                   "kicker": "#1021a1", "box_bg": "#fbf3e4", "ink": "#2b2b2b",
                   "muted": "#5c6066", "line": "#d7dadf", "row_alt": "#f2f3f5",
                   "negative": "#b4392b", "positive": "#1f7a4d"},
        "fonts": {"heading_font": "Arial, Helvetica, sans-serif",
                  "body_font": "Arial, Helvetica, sans-serif",
                  "heading_weight": "700"},
    },
}


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True, choices=sorted(PALETTES))
    ap.add_argument("--db", default=None, help="override DB name (default: backend .env)")
    ap.add_argument("--force", action="store_true",
                    help="overwrite tokens that are already configured")
    args = ap.parse_args()

    if args.db:
        os.environ["DB_NAME"] = args.db
    from models.database import db  # reads .env

    doc = await db.kms_settings.find_one({"key": "kms"}) or {}
    gs = doc.get("general") or {}
    have_colors = gs.get("theme_colors") or {}
    have_fonts = gs.get("theme_fonts") or {}
    pal = PALETTES[args.brand]
    updates = {}
    for k, v in pal["colors"].items():
        if args.force or not have_colors.get(k):
            updates[f"general.theme_colors.{k}"] = v
    for k, v in pal["fonts"].items():
        if args.force or not have_fonts.get(k):
            updates[f"general.theme_fonts.{k}"] = v
    if not updates:
        print(f"{args.brand}: all tokens already configured — nothing to do "
              "(use --force to overwrite)")
        return
    await db.kms_settings.update_one({"key": "kms"}, {"$set": updates}, upsert=False)
    print(f"{args.brand}: seeded {len(updates)} token(s):")
    for k in sorted(updates):
        print(f"  {k} = {updates[k]}")
    print("NOTE: settings cache refreshes within 30s (or Admin -> Clear Cache Now).")


if __name__ == "__main__":
    asyncio.run(main())
