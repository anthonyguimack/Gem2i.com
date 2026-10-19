"""gem2i Phase-2 catalogs (GEM2I_MIGRATION_PLAN §5 — A4/A5/A6/A7/A10, B4).

Public:
  GET /api/public/gem/artists            ?roster=gem|djmag|resident &continent&country&genre&q&page&limit
  GET /api/public/gem/artists/{slug}
  GET /api/public/gem/venues             ?continent&country&state&q&page&limit
  GET /api/public/gem/venues/{slug}      (incl. upcoming events)
  GET /api/public/gem/festivals[/{slug}]
  GET /api/public/gem/conferences[/{slug}]
  GET /api/public/gem/events             ?scope=current|past &country&q&date&page&limit
  GET /api/public/gem/events/{slug}
  GET /api/public/gem/clients
  GET /api/public/gem/genres             (autocomplete)
  GET /api/public/gem/artist-names       ?q= (autocomplete)

Member (identity from JWT ONLY — never a client-posted membership id):
  POST   /api/member/gem/follow          {kind, target_id, flag}
  GET    /api/member/gem/my-follows      ?kind=

Admin (require_admin):
  GET/POST /api/admin/gem/{catalog} · PUT/DELETE /api/admin/gem/{catalog}/{id}
  catalogs: artists venues venue-types festivals conferences clients events

Visibility rules (verified against real legacy data — reference/
GEM2I_LEGACY_SCHEMA_PHASE2.md): public rows require status=='active'; events
additionally require private==False and show_portal==True; past events are
capped to a recency window (D7: the 2017-era backlog stays out of the public
UI; admin sees everything). Rosters: rank 1..100 in the matching listorder.
Dates are ISO strings (lexicographic compare is safe).
"""
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from models.database import db, require_admin
from routes.membership import get_current_member

router = APIRouter()

PAST_WINDOW_DAYS = 365  # D7 — "recent" past events stay public for a year

LEGACY_UPLOADS = "/api/uploads/gem2i/legacy"

CATALOGS = {
    "artists": "gem_artists",
    "venues": "gem_venues",
    "venue-types": "gem_venue_types",
    "festivals": "gem_festivals",
    "conferences": "gem_conferences",
    "clients": "gem_clients",
    "events": "gem_events",
}

FOLLOW_KINDS = {"event", "artist", "venue"}


# ---------------------------------------------------------------- helpers
def _now_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _past_cutoff() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=PAST_WINDOW_DAYS)).strftime("%Y-%m-%d")


def _img(folder: str, filename):
    if not filename:
        return None
    if isinstance(filename, str) and filename.startswith("/"):
        return filename  # CMS-uploaded path (/api/uploads/...) — not a legacy filename
    return f"{LEGACY_UPLOADS}/{folder}/{filename}"


def _artist_images(doc):
    im = doc.get("images") or {}
    return {
        "small": _img("djs_images", im.get("small")),
        "big": _img("djs_images/big", im.get("big")),
        "detail": _img("djs_images/detail", im.get("detail")),
        "logo": _img("djs_images", im.get("logo")),
        "logo_off": _img("djs_images", im.get("logo_off")),
    }


def _venue_images(doc):
    im = doc.get("images") or {}
    return {
        "view": _img("venues_view", im.get("view")),
        "logo": _img("venues_logos", im.get("logo")),
        "logo_off": _img("venues_logos", im.get("logo_off")),
    }


def _festival_images(doc):
    im = doc.get("images") or {}
    return {
        "flyer": _img("images_festivals/images", im.get("flyer")),
        "view": _img("images_festivals/photo", im.get("view")),
        "generic": _img("images_festivals/genericimage", im.get("generic")),
        "logo": _img("images_festivals/logos", im.get("logo")),
        "logo_off": _img("images_festivals/logos", im.get("logo_off")),
    }


def _conference_images(doc):
    im = doc.get("images") or {}
    return {
        "flyer": _img("images_conferences/images", im.get("flyer")),
        "logo": _img("images_conferences/logos", im.get("logo")),
        "logo_off": _img("images_conferences/logos", im.get("logo_off")),
    }


def _event_images(doc):
    im = doc.get("images") or {}
    return {
        "flyer": _img("events_images", im.get("flyer")),
        "logo": _img("events_logo", im.get("logo")),
    }


IMAGE_RESOLVERS = {
    "gem_artists": _artist_images,
    "gem_venues": _venue_images,
    "gem_festivals": _festival_images,
    "gem_conferences": _conference_images,
    "gem_events": _event_images,
}


def _serialize(coll: str, doc: dict) -> dict:
    doc.pop("_id", None)
    resolver = IMAGE_RESOLVERS.get(coll)
    if resolver:
        doc["image_urls"] = resolver(doc)
    if coll == "gem_clients":
        doc["image_urls"] = {"on": _img("images_clients_home", doc.get("image_on")),
                             "off": _img("images_clients_home", doc.get("image_off"))}
    return doc


async def _paginate(coll: str, query: dict, sort, page: int, limit: int):
    limit = max(1, min(limit, 100))
    page = max(1, page)
    total = await db[coll].count_documents(query)
    cursor = db[coll].find(query, {"_id": 0}).sort(sort).skip((page - 1) * limit).limit(limit)
    items = [_serialize(coll, d) async for d in cursor]
    return {"items": items, "total": total, "page": page,
            "pages": max(1, (total + limit - 1) // limit)}


def _slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", (text or "").strip().lower()).strip("-")
    return text or "item"


async def _unique_slug(coll: str, base: str, exclude_id: str | None = None) -> str:
    slug, n = base, 1
    while True:
        q = {"slug": slug}
        if exclude_id:
            q["id"] = {"$ne": exclude_id}
        if not await db[coll].find_one(q, {"_id": 1}):
            return slug
        n += 1
        slug = f"{base}-{n}"


# ================================================================ PUBLIC
def _rx(text: str) -> dict:
    """Case-insensitive 'contains' match for the legacy free-text filters."""
    return {"$regex": re.escape(text.strip()), "$options": "i"}


@router.get("/public/gem/artists")
async def public_artists(roster: str = None, continent: str = None, country: str = None,
                         genre: str = None, q: str = None, position: int = None,
                         state: str = None, city: str = None, page: int = 1, limit: int = 24):
    query = {"status": "active"}
    sort = [("name", 1)]
    if roster in ("gem", "djmag", "resident"):
        field = f"rosters.{roster}_rank"
        query[field] = {"$ne": None}
        sort = [(field, 1)]
        if position:
            query[field] = position
    if continent:
        query["continent"] = continent
    if country:
        query["country"] = _rx(country)
    if genre:
        query["genres"] = _rx(genre)
    if state:
        query["state"] = state
    if city:
        query["city"] = _rx(city)
    if q:
        query["$or"] = [{"name": {"$regex": re.escape(q), "$options": "i"}},
                        {"full_name": {"$regex": re.escape(q), "$options": "i"}}]
    return await _paginate("gem_artists", query, sort, page, limit)


@router.get("/public/gem/artists/{slug}")
async def public_artist_detail(slug: str):
    doc = await db.gem_artists.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Artist not found")
    return _serialize("gem_artists", doc)


@router.get("/public/gem/venues")
async def public_venues(continent: str = None, country: str = None, state: str = None,
                        city: str = None, position: int = None, q: str = None,
                        page: int = 1, limit: int = 24):
    query = {"status": "active"}
    if continent:
        query["continent"] = continent
    if country:
        query["country"] = _rx(country)
    if state:
        query["state"] = state
    if city:
        query["$or"] = [{"city": _rx(city)}, {"state": _rx(city)}]
    if position:
        query["order"] = position
    if q:
        query["name"] = _rx(q)
    return await _paginate("gem_venues", query, [("order", 1), ("name", 1)], page, limit)


@router.get("/public/gem/venues-top")
async def public_top_venues(limit: int = 8):
    """Top venues strip: venues marked Featured in the CMS; until any is marked,
    the first ones by listing order. Photo-less rows are skipped (legacy showed
    test venues without photos here)."""
    limit = max(1, min(limit, 24))
    base = {"status": "active", "images.view": {"$nin": [None, ""]}}
    sort = [("order", 1), ("name", 1)]
    query = {**base, "featured": True}
    if not await db.gem_venues.count_documents(query):
        query = {**base, "order": {"$gte": 1}}
    cursor = db.gem_venues.find(query, {"_id": 0}).sort(sort).limit(limit)
    return {"items": [_serialize("gem_venues", d) async for d in cursor]}


@router.get("/public/gem/venues/{slug}")
async def public_venue_detail(slug: str):
    doc = await db.gem_venues.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Venue not found")
    doc = _serialize("gem_venues", doc)
    # Upcoming public events at this venue (same visibility gate as listings).
    upcoming = db.gem_events.find(
        {"venue_id": doc["id"], "status": "active", "private": False, "show_portal": True,
         "event_date": {"$gte": _now_date()}},
        {"_id": 0}).sort([("event_date", 1)]).limit(12)
    doc["upcoming_events"] = [_serialize("gem_events", e) async for e in upcoming]
    return doc


@router.get("/public/gem/festivals")
async def public_festivals(page: int = 1, limit: int = 24, q: str = None, scope: str = None,
                           country: str = None, city: str = None, continent: str = None,
                           date: str = None, state: str = None,
                           date_from: str = None, date_to: str = None):
    query = {"status": "active"}
    sort = [("event_date", -1)]
    if scope == "upcoming":
        query["event_date"] = {"$gte": _now_date()}
        sort = [("event_date", 1)]
    elif scope == "past":
        query["event_date"] = {"$lt": _now_date()}
    if date:
        query["event_date"] = {"$gte": date}
        sort = [("event_date", 1)]
    if date_from or date_to:
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        query["event_date"] = rng
        sort = [("event_date", 1)]
    if q:
        query["title"] = _rx(q)
    if country:
        query["country"] = _rx(country)
    if city:
        query["$or"] = [{"city": _rx(city)}, {"state": _rx(city)}]
    if continent:
        query["continent"] = continent
    if state:
        query["state"] = state
    result = await _paginate("gem_festivals", query, sort, page, limit)
    # Cards show the first lineup names — one artist query per page.
    ids = list({i for f in result["items"] for i in (f.get("lineup") or [])[:3]})
    names = {a["id"]: a["name"] async for a in db.gem_artists.find(
        {"id": {"$in": ids}, "status": "active"}, {"_id": 0, "id": 1, "name": 1})}
    for f in result["items"]:
        f["lineup_names"] = [names[i] for i in (f.get("lineup") or [])[:3] if i in names]
    return result


@router.get("/public/gem/festivals-meta")
async def public_festivals_meta():
    """Whether the Upcoming/Past switch is worth showing."""
    return {"upcoming": await db.gem_festivals.count_documents(
        {"status": "active", "event_date": {"$gte": _now_date()}})}


@router.get("/public/gem/festivals/{slug}")
async def public_festival_detail(slug: str):
    doc = await db.gem_festivals.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Festival not found")
    doc = _serialize("gem_festivals", doc)
    doc["lineup_artists"] = await _resolve_lineup(doc.get("lineup") or [])
    return doc


@router.get("/public/gem/conferences")
async def public_conferences(page: int = 1, limit: int = 24):
    return await _paginate("gem_conferences", {"status": "active"}, [("event_date", -1)], page, limit)


@router.get("/public/gem/conferences/{slug}")
async def public_conference_detail(slug: str):
    doc = await db.gem_conferences.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conference not found")
    return _serialize("gem_conferences", doc)


@router.get("/public/gem/events")
async def public_events(scope: str = "current", country: str = None, q: str = None,
                        date: str = None, city: str = None, state: str = None,
                        date_from: str = None, date_to: str = None,
                        page: int = 1, limit: int = 24):
    query = {"status": "active", "private": False, "show_portal": True}
    if scope == "past":
        query["event_date"] = {"$lt": _now_date(), "$gte": _past_cutoff()}
        sort = [("event_date", -1)]
    else:
        query["event_date"] = {"$gte": _now_date()}
        sort = [("event_date", 1)]
    if date:
        query["event_date"] = date
    if date_from or date_to:
        # Calendar range (CA-2): replaces the current/past window.
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to
        query["event_date"] = rng
        sort = [("event_date", 1)]
    if q:
        query["title"] = {"$regex": re.escape(q), "$options": "i"}
    if country or city or state:
        # Country/city live on the venue (legacy search behavior) — restrict by
        # venue ids BEFORE pagination so totals stay correct.
        vq = {}
        if country:
            vq["country"] = _rx(country)
        if state:
            vq["state"] = state
        if city:
            vq["$or"] = [{"city": _rx(city)}, {"state": _rx(city)}]
        ids = [v["id"] async for v in db.gem_venues.find(vq, {"_id": 0, "id": 1})]
        query["venue_id"] = {"$in": ids}
    result = await _paginate("gem_events", query, sort, page, limit)
    # Card rendering needs the venue name/city — resolve in one query per page.
    venue_ids = [e.get("venue_id") for e in result["items"] if e.get("venue_id")]
    vmap = {v["id"]: v async for v in db.gem_venues.find(
        {"id": {"$in": venue_ids}}, {"_id": 0, "id": 1, "name": 1, "city": 1, "state": 1, "country": 1, "slug": 1})}
    for e in result["items"]:
        e["venue"] = vmap.get(e.get("venue_id"))
    return result


@router.get("/public/gem/catalog-dates")
async def public_catalog_dates(catalog: str = "events", month: str = ""):
    """Days of one month (YYYY-MM) that have public items → calendar dots."""
    if not re.fullmatch(r"\d{4}-\d{2}", month or ""):
        return {"days": {}}
    coll = "gem_festivals" if catalog == "festivals" else "gem_events"
    query = {"status": "active", "event_date": {"$regex": "^" + month}}
    if coll == "gem_events":
        query.update({"private": False, "show_portal": True})
    days = {}
    async for d in db[coll].find(query, {"_id": 0, "event_date": 1}):
        k = str(d.get("event_date"))[:10]
        days[k] = days.get(k, 0) + 1
    return {"days": days}


@router.get("/public/gem/hero-events")
async def public_hero_events():
    """Events the CMS pinned to hero slides (Events manager → "Show in these
    hero slides"). Same public gate as the listing; past events drop out."""
    query = {"status": "active", "private": False, "show_portal": True,
             "event_date": {"$gte": _now_date()}, "hero_slide_ids.0": {"$exists": True}}
    cursor = db.gem_events.find(query, {"_id": 0}).sort([("event_date", 1)]).limit(50)
    items = [_serialize("gem_events", e) async for e in cursor]
    venue_ids = [e.get("venue_id") for e in items if e.get("venue_id")]
    vmap = {v["id"]: v async for v in db.gem_venues.find(
        {"id": {"$in": venue_ids}}, {"_id": 0, "id": 1, "name": 1, "city": 1, "state": 1, "country": 1, "slug": 1})}
    for e in items:
        e["venue"] = vmap.get(e.get("venue_id"))
    return {"items": items}


@router.get("/public/gem/events/{slug}")
async def public_event_detail(slug: str):
    doc = await db.gem_events.find_one(
        {"slug": slug, "status": "active", "private": False, "show_portal": True}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    doc = _serialize("gem_events", doc)
    if doc.get("venue_id"):
        v = await db.gem_venues.find_one({"id": doc["venue_id"]}, {"_id": 0})
        doc["venue"] = _serialize("gem_venues", v) if v else None
    doc["lineup_artists"] = await _resolve_lineup(doc.get("lineup") or [])
    return doc


async def _resolve_lineup(artist_ids: list) -> list:
    if not artist_ids:
        return []
    docs = {a["id"]: a async for a in db.gem_artists.find(
        {"id": {"$in": artist_ids}, "status": "active"},
        {"_id": 0, "id": 1, "name": 1, "slug": 1, "images": 1, "country": 1})}
    return [_serialize("gem_artists", docs[i]) for i in artist_ids if i in docs]


@router.get("/public/gem/clients")
async def public_clients():
    cursor = db.gem_clients.find({"publish": "1", "status": {"$ne": "deleted"}},
                                 {"_id": 0}).sort([("order", 1)])
    return {"items": [_serialize("gem_clients", d) async for d in cursor]}


@router.get("/public/gem/genres")
async def public_genres():
    return {"items": sorted(await db.gem_artists.distinct("genres", {"status": "active"}))}


@router.get("/public/gem/artist-names")
async def public_artist_names(q: str = "", roster: str = None):
    query = {"status": "active"}
    if roster in ("gem", "djmag", "resident"):
        query[f"rosters.{roster}_rank"] = {"$ne": None}
    if q:
        query["name"] = {"$regex": "^" + re.escape(q), "$options": "i"}
    cursor = db.gem_artists.find(query, {"_id": 0, "name": 1}).sort([("name", 1)]).limit(30)
    return {"items": [d["name"] async for d in cursor]}


@router.get("/public/gem/venue-countries")
async def public_venue_countries():
    """Country filter options for the events page (legacy parity: the search
    autocompleted countries; events resolve country via their venue)."""
    items = await db.gem_venues.distinct("country", {"status": "active", "country": {"$nin": [None, ""]}})
    return {"items": sorted(items)}


_PLACE_COLL = {"events": "gem_venues", "venues": "gem_venues",
               "artists": "gem_artists", "festivals": "gem_festivals"}


@router.get("/public/gem/places")
async def public_places(catalog: str = "venues", country: str = None, state: str = None,
                        q: str = None):
    """Nested country → state → city options for the catalog search: the full
    geo tables (countries / states / cities, loaded from the legacy world list)
    plus any place the catalog rows use that the geo tables lack. Cities are a
    type-ahead (`q`, max 50) — the US alone has 20k+."""
    coll = _PLACE_COLL.get(catalog, "gem_venues")
    clean = lambda xs: sorted({x.strip() for x in xs if isinstance(x, str) and x.strip()}, key=str.lower)
    countries = clean([c["name"] async for c in db.countries.find({}, {"_id": 0, "name": 1})]
                      + await db[coll].distinct("country", {"status": "active"}))
    states, cities = [], []
    if country:
        cdoc = await db.countries.find_one({"name": country}, {"_id": 0, "id": 1})
        sdocs = [s async for s in db.states.find({"country_id": cdoc["id"]}, {"_id": 0, "id": 1, "name": 1})] if cdoc else []
        states = clean([s["name"] for s in sdocs]
                       + await db[coll].distinct("state", {"status": "active", "country": country}))
        sids = [s["id"] for s in sdocs if not state or s["name"] == state]
        cq = {"state_id": {"$in": sids}}
        if q:
            cq["name"] = {"$regex": "^" + re.escape(q.strip()), "$options": "i"}
        found = [c["name"] async for c in db.cities.find(cq, {"_id": 0, "name": 1}).sort("name", 1).limit(50)] if sids else []
        rq = {"status": "active", "country": country}
        if state:
            rq["state"] = state
        used = [c for c in await db[coll].distinct("city", rq) if isinstance(c, str)
                and (not q or c.lower().startswith(q.strip().lower()))]
        cities = clean(found + used)[:50]
    return {"countries": countries, "states": states, "cities": cities}


@router.get("/public/gem/continents")
async def public_continents():
    """Continent tabs — union across the public catalogs, in legacy display order."""
    order = ["Europe", "North America", "South America", "Africa", "Oceania", "Asia"]
    present = set(await db.gem_artists.distinct("continent", {"status": "active"}))
    present |= set(await db.gem_venues.distinct("continent", {"status": "active"}))
    return {"items": [c for c in order if c in present]}


# ================================================================ MEMBER
@router.post("/member/gem/follow")
async def member_follow(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    kind, target_id = body.get("kind"), body.get("target_id")
    flag = bool(body.get("flag", True))
    if kind not in FOLLOW_KINDS or not target_id:
        raise HTTPException(status_code=422, detail="kind (event|artist|venue) and target_id required")
    coll = {"event": "gem_events", "artist": "gem_artists", "venue": "gem_venues"}[kind]
    if not await db[coll].find_one({"id": target_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail=f"{kind} not found")
    member_id = member["member_id"]  # identity from JWT ONLY
    key = {"member_id": member_id, "kind": kind, "target_id": target_id}
    if flag:
        await db.gem_follows.update_one(key, {"$setOnInsert": {
            **key, "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    else:
        await db.gem_follows.delete_one(key)
    return {"following": flag}


@router.get("/member/gem/my-follows")
async def member_my_follows(kind: str = None, member: dict = Depends(get_current_member)):
    query = {"member_id": member["member_id"]}
    if kind in FOLLOW_KINDS:
        query["kind"] = kind
    cursor = db.gem_follows.find(query, {"_id": 0, "kind": 1, "target_id": 1})
    return {"items": [d async for d in cursor]}


# ================================================================ ADMIN
def _coll_or_404(catalog: str) -> str:
    coll = CATALOGS.get(catalog)
    if not coll:
        raise HTTPException(status_code=404, detail=f"Unknown catalog '{catalog}'")
    return coll


@router.get("/admin/gem/{catalog}")
async def admin_list(catalog: str, q: str = None, status: str = None, ids: str = None,
                     page: int = 1, limit: int = 50, user: dict = Depends(require_admin)):
    coll = _coll_or_404(catalog)
    query = {}
    if status:
        query["status"] = status
    if ids:  # comma-separated id lookup — resolves picker selections to names
        query["id"] = {"$in": [i for i in ids.split(",") if i]}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"title": rx}, {"slug": rx}]
    sort = [("event_date", -1)] if coll in ("gem_events", "gem_festivals", "gem_conferences") \
        else [("name", 1), ("title", 1)]
    return await _paginate(coll, query, sort, page, limit)


@router.post("/admin/gem/{catalog}")
async def admin_create(catalog: str, request: Request, user: dict = Depends(require_admin)):
    coll = _coll_or_404(catalog)
    body = await request.json()
    body.pop("_id", None)
    body["id"] = str(uuid.uuid4())
    body.setdefault("status", "active")
    title = body.get("name") or body.get("title") or ""
    if coll not in ("gem_venue_types", "gem_clients"):
        body["slug"] = await _unique_slug(coll, _slugify(body.get("slug") or title))
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    await db[coll].insert_one(dict(body))
    return {"id": body["id"], "slug": body.get("slug")}


@router.put("/admin/gem/{catalog}/{item_id}")
async def admin_update(catalog: str, item_id: str, request: Request,
                       user: dict = Depends(require_admin)):
    coll = _coll_or_404(catalog)
    body = await request.json()
    for k in ("_id", "id", "legacy_id", "created_at"):
        body.pop(k, None)
    if body.get("slug"):
        body["slug"] = await _unique_slug(coll, _slugify(body["slug"]), exclude_id=item_id)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db[coll].update_one({"id": item_id}, {"$set": body})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "updated"}


@router.delete("/admin/gem/{catalog}/{item_id}")
async def admin_delete(catalog: str, item_id: str, user: dict = Depends(require_admin)):
    """Soft delete (status='deleted') — keeps ETL provenance; hides everywhere
    (public filters on status=='active'; admin list can filter deleted)."""
    coll = _coll_or_404(catalog)
    res = await db[coll].update_one({"id": item_id}, {"$set": {
        "status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "deleted"}
