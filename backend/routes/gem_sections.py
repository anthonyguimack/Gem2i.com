"""Section Manager — ported from AUX-1.0 routes/aurex_sections.py (same API,
same section keys) for the gem2i template. Storage uses gem2i's own
collections (`gem_section_configs` / `gem_section_items`, house rule gem_*).
gem2i adds config-only headers for its catalog sections (gem_*_cfg) and the
Methodology steps (gem_methodology, itemized).

Original notes:
Aurex sections — generic CRUD for the 7 new one-page template sections.

Storage model
─────────────
  `aurex_section_configs`: one doc per section (title, subtitle, CTA, …)
  `aurex_section_items`:   N rows per section (cards / steps / plans / members / logos)
     {
       id: uuid,
       section: 'aurex_audience' | 'aurex_process' | 'aurex_pricing' |
                'aurex_team'     | 'aurex_partners' | 'aurex_clients',
       order: int,
       ...section-specific fields...
     }

The `aurex_events` section is **config-only** — events themselves live in the
existing `calendar_events` collection managed by AUX Calendar in My Account.
This endpoint only stores display preferences (max to show, CTA text, etc.).
"""
from datetime import datetime, timezone
import os
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient

from routes.membership import require_admin

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

# ── Personality-scoping helpers ───────────────────────────────────────────
# pb_personality = None/invalid  →  global doc (no pb_personality field)
# pb_personality = 'business'|'lifestyle'|'personal'  →  PB mini-site doc
_PB_PERSONALITIES = {"business", "lifestyle", "personal"}

def _pb(personality: Optional[str]) -> Optional[str]:
    """Return the validated personality string or None."""
    return personality if personality in _PB_PERSONALITIES else None

def _cfg_filter(section: str, personality: Optional[str]) -> dict:
    f = {"section": section}
    p = _pb(personality)
    f["pb_personality"] = p if p else {"$exists": False}
    return f

def _items_filter(section: str, personality: Optional[str]) -> dict:
    f = {"section": section}
    p = _pb(personality)
    f["pb_personality"] = p if p else {"$exists": False}
    return f

VALID_SECTIONS = {
    "aurex_audience", "aurex_process", "aurex_pricing",
    "aurex_team", "aurex_partners", "aurex_clients", "aurex_events", "aurex_video",
    # Config-only "section header" entries that let the admin edit title/
    # subtitle/CTA for legacy sections rendered by the Aurex mono variants.
    "aurex_services_cfg", "aurex_testimonials_cfg", "aurex_news_cfg",
    "aurex_blog_cfg", "aurex_locations_cfg",
    # Config-only entries for Reading List, Portfolio, and Gallery.
    "aurex_reading_cfg", "aurex_portfolio_cfg", "aurex_gallery_cfg",
    # Config-only header for Model Portfolio (logos come from the latest iiReport).
    "aurex_model_portfolio_cfg",
    # Config-only News Ticker — a single localized, comma-separated phrase list
    # rendered as the scrolling strip atop the Personal Brand hero.
    "news_ticker",
    # gem2i template — catalog section headers (title, subtitle, CTA, how many)
    "gem_events_cfg", "gem_artists_cfg", "gem_venues_cfg", "gem_festivals_cfg",
    "gem_conferences_cfg", "gem_clients_cfg",
    # gem2i template — Methodology steps (itemized, like Our Process)
    "gem_methodology",
    # gem2i inner pages (2026-10-19, port of travels.php / services.php /
    # partners.php): Travels trips, Services cards + Works carousel, Partners header.
    "gem_travels", "gem_services_page", "gem_works", "gem_partners_page",
}
ITEM_SECTIONS = VALID_SECTIONS - {
    "aurex_events", "news_ticker",
    "gem_events_cfg", "gem_artists_cfg", "gem_venues_cfg", "gem_festivals_cfg",
    "gem_conferences_cfg", "gem_clients_cfg",
    "aurex_services_cfg", "aurex_testimonials_cfg", "aurex_news_cfg",
    "aurex_blog_cfg", "aurex_locations_cfg", "aurex_model_portfolio_cfg",
    "gem_partners_page",
}


def _check(section: str):
    if section not in VALID_SECTIONS:
        raise HTTPException(status_code=404, detail=f"Unknown Aurex section: {section}")


# ── Section-level config (title, subtitle, CTA, etc.) ───────────────────

@router.get("/admin/aurex/{section}/config")
async def get_config(
    section: str,
    personality: Optional[str] = Query(None),
    user=Depends(require_admin),
):
    _check(section)
    doc = await db.gem_section_configs.find_one(_cfg_filter(section, personality), {"_id": 0})
    return doc or {"section": section}


@router.put("/admin/aurex/{section}/config")
async def save_config(
    section: str,
    body: dict,
    request: Request,
    personality: Optional[str] = Query(None),
    user=Depends(require_admin),
):
    _check(section)
    body["section"] = section
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    p = _pb(personality)
    if p:
        body["pb_personality"] = p
    filt = _cfg_filter(section, personality)
    await db.gem_section_configs.update_one(filt, {"$set": body}, upsert=True)
    return await db.gem_section_configs.find_one(filt, {"_id": 0})


# ── Items (cards / steps / plans / members / logos) ─────────────────────

@router.get("/admin/aurex/{section}/items")
async def list_items(
    section: str,
    personality: Optional[str] = Query(None),
    user=Depends(require_admin),
):
    if section not in ITEM_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Section {section} has no items")
    return await db.gem_section_items.find(
        _items_filter(section, personality), {"_id": 0}
    ).sort("order", 1).to_list(500)


@router.post("/admin/aurex/{section}/items")
async def create_item(
    section: str,
    body: dict,
    personality: Optional[str] = Query(None),
    user=Depends(require_admin),
):
    if section not in ITEM_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Section {section} has no items")
    # Use the personality-scoped order counter so items don't mix across personalities
    p = _pb(personality)
    order_filter = {"section": section}
    if p:
        order_filter["pb_personality"] = p
    else:
        order_filter["pb_personality"] = {"$exists": False}
    last = await db.gem_section_items.find(order_filter).sort("order", -1).limit(1).to_list(1)
    next_order = (last[0].get("order", 0) + 1) if last else 0
    body.update({
        "id": str(uuid.uuid4()),
        "section": section,
        "order": body.get("order", next_order),
        "visible": body.get("visible", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    if p:
        body["pb_personality"] = p
    await db.gem_section_items.insert_one(dict(body))
    body.pop("_id", None)
    return body


@router.put("/admin/aurex/{section}/items/{item_id}")
async def update_item(section: str, item_id: str, body: dict, user=Depends(require_admin)):
    # No personality param needed: item IDs are globally-unique UUIDs.
    if section not in ITEM_SECTIONS:
        raise HTTPException(status_code=400, detail="Section has no items")
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    body.pop("_id", None)
    body.pop("id", None)
    body.pop("section", None)
    r = await db.gem_section_items.update_one({"id": item_id, "section": section}, {"$set": body})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return await db.gem_section_items.find_one({"id": item_id}, {"_id": 0})


@router.delete("/admin/aurex/{section}/items/{item_id}")
async def delete_item(section: str, item_id: str, user=Depends(require_admin)):
    # No personality param needed: item IDs are globally-unique UUIDs.
    if section not in ITEM_SECTIONS:
        raise HTTPException(status_code=400, detail="Section has no items")
    r = await db.gem_section_items.delete_one({"id": item_id, "section": section})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}


@router.put("/admin/aurex/{section}/reorder")
async def reorder_items(section: str, body: dict, user=Depends(require_admin)):
    """body = { order: [item_id_1, item_id_2, ...] }  — reorders by UUID, no personality needed."""
    if section not in ITEM_SECTIONS:
        raise HTTPException(status_code=400, detail="Section has no items")
    order = body.get("order") or []
    for idx, item_id in enumerate(order):
        await db.gem_section_items.update_one({"id": item_id, "section": section}, {"$set": {"order": idx}})
    return {"order": order}


# ── Public endpoint consumed by the Aurex/PB frontend ────────────────────

@router.get("/public/aurex/{section}")
async def public_section(section: str, personality: Optional[str] = Query(None)):
    _check(section)
    p = _pb(personality)

    # Config: fetch personality-specific doc; fall back to global if not found
    if p:
        config = await db.gem_section_configs.find_one(
            {"section": section, "pb_personality": p}, {"_id": 0}
        )
        if not config:
            config = await db.gem_section_configs.find_one(
                {"section": section, "pb_personality": {"$exists": False}}, {"_id": 0}
            ) or {}
    else:
        config = await db.gem_section_configs.find_one(
            {"section": section, "pb_personality": {"$exists": False}}, {"_id": 0}
        ) or {}

    out = {"config": config}

    if section in ITEM_SECTIONS:
        # Items: personality-specific; fall back to global items if none found
        if p:
            items = await db.gem_section_items.find(
                {"section": section, "pb_personality": p, "visible": {"$ne": False}},
                {"_id": 0},
            ).sort("order", 1).to_list(500)
            if not items:
                items = await db.gem_section_items.find(
                    {"section": section, "pb_personality": {"$exists": False}, "visible": {"$ne": False}},
                    {"_id": 0},
                ).sort("order", 1).to_list(500)
        else:
            items = await db.gem_section_items.find(
                {"section": section, "pb_personality": {"$exists": False}, "visible": {"$ne": False}},
                {"_id": 0},
            ).sort("order", 1).to_list(500)
        out["items"] = items

    elif section == "aurex_events":
        max_items = int(config.get("max_items") or 5)
        only_upcoming = bool(config.get("only_upcoming", True))
        query = {}
        if only_upcoming:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            query["date"] = {"$gte": today}
        query = {"status": "active", "private": False, "show_portal": True}
        if only_upcoming:
            query["event_date"] = {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
        events = await db.gem_events.find(query, {"_id": 0, "id": 1, "slug": 1, "title": 1, "event_date": 1,
                                                  "open_time": 1, "images": 1}).sort("event_date", 1).limit(max_items).to_list(max_items)
        for e in events:
            e["date"] = e.get("event_date")
        out["items"] = events

    return out
