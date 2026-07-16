"""gem2i Phase-1 rebrand + page seed (GEM2I_MIGRATION_PLAN Phase 1).

Run ON THE BOX with the backend venv:
    cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_phase1_seed.py

What it does (idempotent):
  1. settings  — brand identity: brand_name/tagline, active_theme='gem2i',
     dark entertainment `theme_colors.website` palette (colors lifted from the
     live legacy site: page #04080C, accent #3287B7), footer copy, EN/ES,
     Facebook social link, contact panel copy. Colors/copy are $set (rebrand
     is authoritative) but only fields this script owns are touched.
  2. nav_pages — the legacy nav graph (Home, About Us, Events, Festivals,
     Artists, Venues, Travels, Services, Partners + footer Privacy/Terms +
     Media/Works). $setOnInsert only: never clobbers operator edits.

Homepage section copy is NOT here — it lives in gem_config {key:'content'}
and is seeded by the backend at startup (routes/gem_content.py).
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
if not MONGO_URL or not DB_NAME:
    sys.exit("MONGO_URL / DB_NAME not found in backend/.env — run from the deploy dir on the box.")

TAGLINE = {"en": "Global Entertainment Management & Marketing Integration",
           "es": "Gestión Global de Entretenimiento e Integración de Marketing"}

# Dark entertainment palette — keys per frontend WEBSITE_COLORS (themeColors.js).
GEM2I_WEBSITE_COLORS = {
    "primary": "#04080C",
    "accent": "#3287B7",
    "heading_color": "#FFFFFF",
    "body_text": "#9AA6B2",
    "navbar_bg": "rgba(4,8,12,0.92)",
    "button_bg": "#3287B7",
    "button_text": "#FFFFFF",
    "button_hover_bg": "#4DA3D4",
    "button_hover_text": "#04080C",
    "link_color": "#5FB2E0",
    "tab_active_bg": "#3287B7",
    "tab_active_text": "#FFFFFF",
    "icon_color": "#5FB2E0",
    "page_bg": "#04080C",
    "section_bg": "#0A121A",
    "card_bg": "#0D1721",
    "card_border": "rgba(255,255,255,0.08)",
    "footer_bg": "#030609",
    "footer_text": "#A7B3BF",
}

SETTINGS_UPDATE = {
    "brand_name": "GEM2i",
    "tagline": TAGLINE,
    "active_theme": "gem2i",
    "theme_colors.website": GEM2I_WEBSITE_COLORS,
    "default_language": "en",
    "languages": ["en", "es"],
    "meta_title": "GEM2i — Global Entertainment Management & Marketing Integration",
    "meta_description": "Full service marketing, media and business integration for the entertainment industry: events, festivals, artists and venues across 17+ global markets.",
    "footer_description": {
        "en": "GEM2i is the leading full service marketing, media and business integration company focusing exclusively on the entertainment and service industry.",
        "es": "GEM2i es la empresa líder de servicios integrales de marketing, medios e integración de negocios enfocada exclusivamente en la industria del entretenimiento y los servicios.",
    },
    "footer_copyright": {
        "en": "2017 - 2026 © Gem2i. ALL Rights Reserved.",
        "es": "2017 - 2026 © Gem2i. Todos los derechos reservados.",
    },
    "contact_settings": {
        "title": {"en": "Contact Us", "es": "Contáctanos"},
        "subtitle": {"en": "GEM2i", "es": "GEM2i"},
        "description": {"en": "Send us a message and our team will get back to you.",
                        "es": "Envíanos un mensaje y nuestro equipo te responderá."},
        "name_placeholder": {"en": "Your name", "es": "Tu nombre"},
        "email_placeholder": {"en": "Your email", "es": "Tu correo"},
        "message_placeholder": {"en": "Your message", "es": "Tu mensaje"},
        "submit_text": {"en": "Send Message", "es": "Enviar Mensaje"},
    },
}

FACEBOOK_LINK = {"id": "gem2i-facebook", "platform": "Facebook", "key": "facebook",
                 "icon": "facebook", "url": "https://www.facebook.com/Gem2i", "active": True}

PENDING = ("<p>Content migration in progress — the original page copy is entered "
           "via the CMS (Pages) or arrives with the Phase-2 data ETL.</p>")
COMING_PHASE2 = ("<p>This catalog goes live in Phase 2 of the rebuild "
                 "(events / festivals / artists / venues data migration).</p>")

# Legacy nav graph. Gating per GEM2I_MIGRATION_PLAN §2: listings are public;
# About/Travels/Services/Partners/Privacy/Terms require login (legacy parity).
NAV_PAGES = [
    {"title": "Home",      "url": "/",          "order": 1,  "header": True,  "footer": False, "login": False, "content": ""},
    {"title": "About Us",  "url": "/about",     "order": 2,  "header": True,  "footer": True,  "login": True,  "content": PENDING},
    {"title": "Events",    "url": "/events",    "order": 3,  "header": True,  "footer": True,  "login": False, "content": COMING_PHASE2},
    {"title": "Festivals", "url": "/festivals", "order": 4,  "header": True,  "footer": True,  "login": False, "content": COMING_PHASE2},
    {"title": "Artists",   "url": "/artists",   "order": 5,  "header": True,  "footer": True,  "login": False, "content": COMING_PHASE2},
    {"title": "Venues",    "url": "/venues",    "order": 6,  "header": True,  "footer": True,  "login": False, "content": COMING_PHASE2},
    {"title": "Travels",   "url": "/travels",   "order": 7,  "header": True,  "footer": False, "login": True,  "content": PENDING},
    {"title": "Services",  "url": "/services",  "order": 8,  "header": True,  "footer": True,  "login": True,  "content": PENDING},
    {"title": "Partners",  "url": "/partners",  "order": 9,  "header": True,  "footer": False, "login": True,  "content": "<p>Coming soon.</p>"},
    {"title": "Media",     "url": "/media",     "order": 10, "header": False, "footer": True,  "login": False, "content": PENDING},
    {"title": "Works",     "url": "/works",     "order": 11, "header": False, "footer": False, "login": False, "content": PENDING},
    {"title": "Privacy Policy",   "url": "/privacy", "order": 12, "header": False, "footer": True, "login": True, "content": PENDING},
    {"title": "Terms of Service", "url": "/terms",   "order": 13, "header": False, "footer": True, "login": True, "content": PENDING},
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    res = await db.settings.update_one({}, {"$set": SETTINGS_UPDATE})
    print(f"settings: matched={res.matched_count} modified={res.modified_count}")

    # Social links: ensure the gem2i Facebook entry exists exactly once and no
    # foreign seeded demo links survive the rebrand.
    s = await db.settings.find_one({}, {"social_links": 1}) or {}
    links = [l for l in (s.get("social_links") or []) if "gem2i" in (l.get("url") or "").lower()]
    if not any(l.get("id") == FACEBOOK_LINK["id"] for l in links):
        links.append(FACEBOOK_LINK)
    await db.settings.update_one({}, {"$set": {"social_links": links}})
    print(f"social_links: {len(links)} gem2i link(s)")

    created = 0
    for p in NAV_PAGES:
        doc = {
            "id": str(uuid.uuid4()),
            "title": p["title"],
            "url": p["url"],
            "order": p["order"],
            "show_in_header": p["header"],
            "show_in_footer": p["footer"],
            "login_required": p["login"],
            "open_in_new_tab": False,
            "category": "all",
            "content": p["content"],
            "summary": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        r = await db.nav_pages.update_one({"url": p["url"]}, {"$setOnInsert": doc}, upsert=True)
        if r.upserted_id:
            created += 1
    print(f"nav_pages: {created} created, {len(NAV_PAGES) - created} already present")

    client.close()
    print("gem2i Phase-1 seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
