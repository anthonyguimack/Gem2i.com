"""gem2i Phase-2 catalog ETL — STAGE 1 (transform).

Reads the restored legacy MySQL/MariaDB (`gem2ica_production` → local db
`gem2i_etl_src`) and writes one newline-delimited JSON file per Mongo
collection into `reference/local-only/etl_out/` (gitignored). NO Mongo writes
happen here — Stage 2 (`gem2i_load_catalogs.py`) loads the JSON on the box.

Covers the Phase-2 catalogs ONLY: gem_artists, gem_venues (+gem_venue_types),
gem_festivals, gem_conferences, gem_clients, gem_events (catalog subset),
gem_follows. Purchase/tier/economics/guest-list/QR tables are Phase 4/5.

Run LOCALLY (needs the dump restored — see reference/GEM2I_LEGACY_SCHEMA_PHASE2.md §4):
    pip install pymysql
    python scripts/gem2i_etl_catalogs.py \
        --host 127.0.0.1 --user root --password "" --db gem2i_etl_src

Deterministic ids (uuid5) → re-running is stable → Stage-2 upserts are idempotent.
Column names + enum values are verified in reference/GEM2I_LEGACY_SCHEMA_PHASE2.md.

Note on cursors: each extractor does `cur.execute(<table scan>); rows = cur.fetchall()`
FIRST (materializing the whole result into a Python list), then loops over that list.
The per-row genre/lineup/gallery sub-queries reuse the same cursor safely because the
outer result is already in memory — no second cursor needed.
"""
import argparse
import json
import re
import uuid
from datetime import date, datetime
from pathlib import Path

import pymysql

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "reference" / "local-only" / "etl_out"

# Stable namespace for uuid5 ids (fixed — changing it shifts every id).
GEM2I_NS = uuid.UUID("6d2a1f5e-0e3b-5c4a-9b7d-0a1a12000000")

STATUS_MAP = {"A": "active", "I": "inactive", "D": "deleted", "": "inactive", None: "inactive"}


# ---------------------------------------------------------------- helpers
def det_id(collection: str, legacy_id) -> str:
    return str(uuid.uuid5(GEM2I_NS, f"{collection}:{legacy_id}"))


def slugify(text: str) -> str:
    text = (text or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "item"


def dedupe_slugs(rows):
    """Guarantee unique slugs within a collection; append -{legacy_id} on collision."""
    seen = set()
    for r in rows:
        if r["slug"] in seen:
            r["slug"] = f"{r['slug']}-{r['legacy_id']}"
        seen.add(r["slug"])
    return rows


def clean(v):
    """Empty string / whitespace → None so we don't store noise."""
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def jdefault(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    raise TypeError(f"not serializable: {type(o)}")


def socials(row, keys):
    return {k: clean(row.get(k)) for k in keys if clean(row.get(k))}


def write_ndjson(name, docs):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False, default=jdefault) + "\n")
    print(f"  {name:20s} {len(docs):5d} docs -> {path.relative_to(ROOT)}")
    return docs


# ---------------------------------------------------------------- lookups
def load_lookups(cur):
    cur.execute("SELECT id_country, country, id_continent FROM countries2")
    countries = {r["id_country"]: r for r in cur.fetchall()}
    cur.execute("SELECT id_continent, continent, order_continent FROM continents")
    continents = {r["id_continent"]: r for r in cur.fetchall()}
    cur.execute("SELECT id_state, state FROM states")
    states = {r["id_state"]: r["state"] for r in cur.fetchall()}
    cur.execute("SELECT id_music, music FROM music_genre")
    genres = {r["id_music"]: clean(r["music"]) for r in cur.fetchall()}
    return countries, continents, states, genres


def geo(row, countries, continents, states):
    c = countries.get(row.get("country"))
    country_name = clean(c["country"]) if c else None
    continent_name = None
    if c:
        cont = continents.get(c["id_continent"])
        continent_name = clean(cont["continent"]) if cont else None
    return {
        "country": country_name,
        "state": clean(states.get(row.get("id_state"))),
        "city": clean(row.get("city")),
        "continent": continent_name,
        "legacy_country_id": row.get("country"),
        "legacy_state_id": row.get("id_state"),
    }


def genre_list(cur, table, id_col, legacy_id, genres):
    cur.execute(f"SELECT id_music FROM {table} WHERE {id_col}=%s", (legacy_id,))
    return [genres[r["id_music"]] for r in cur.fetchall() if genres.get(r["id_music"])]


def lineup(cur, table, id_col, legacy_id):
    cur.execute(f"SELECT id_dj FROM {table} WHERE {id_col}=%s", (legacy_id,))
    return [r["id_dj"] for r in cur.fetchall()]


# ---------------------------------------------------------------- extractors
def etl_artists(cur, countries, continents, states, genres):
    cur.execute("SELECT * FROM djs")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_dj"]

        def rank(col):
            v = r.get(col) or 0
            return v if 1 <= v <= 100 else None

        docs.append({
            "id": det_id("gem_artists", lid), "legacy_id": lid,
            "name": clean(r["dj"]), "full_name": clean(r["full_name"]),
            "slug": slugify(r["dj"] or r["full_name"] or f"artist-{lid}"),
            "bio": clean(r["biography"]), "summary": clean(r["summary"]),
            **geo(r, countries, continents, states),
            "genres": genre_list(cur, "djs_music_genre", "id_dj", lid, genres),
            "rosters": {"gem_rank": rank("listorder_gem2i"),
                        "djmag_rank": rank("listorder_djmag"),
                        "resident_rank": rank("listorder_residentadvisor")},
            "gem2i_client": (clean(r["gem2i_client"]) or "").upper() == "YES",
            "images": {"small": clean(r["image"]), "big": clean(r["image_big"]),
                       "detail": clean(r["image_detail"]), "logo": clean(r["logo"]),
                       "logo_off": clean(r["logo_off"]), "favicon": clean(r["favicon_img"])},
            "socials": socials(r, ["facebook", "twitter", "youtube", "instagram", "soundcloud",
                                   "mixcloud", "itunes", "pinterest", "website", "google"]),
            "video": clean(r["video"]),
            "status": STATUS_MAP.get(r["status"], "inactive"),
        })
    return dedupe_slugs(docs)


def etl_venue_types(cur):
    cur.execute("SELECT * FROM venues_type")
    return [{"id": det_id("gem_venue_types", r["id_venue_type"]),
             "legacy_id": r["id_venue_type"], "name": clean(r["type"]),
             "status": STATUS_MAP.get(r["status"], "inactive")} for r in cur.fetchall()]


def etl_venues(cur, countries, continents, states, genres, vtypes):
    tname = {t["legacy_id"]: t["name"] for t in vtypes}
    cur.execute("SELECT * FROM venues")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_venue"]
        docs.append({
            "id": det_id("gem_venues", lid), "legacy_id": lid,
            "name": clean(r["venue"]), "slug": slugify(r["venue"] or f"venue-{lid}"),
            "type": tname.get(r["id_venue_type"]), "legacy_type_id": r["id_venue_type"],
            "description": clean(r["description"]), "summary": clean(r["summary"]),
            "address": clean(r["address"]),
            **geo(r, countries, continents, states),
            "genres": genre_list(cur, "venues_music_genre", "id_venue", lid, genres),
            "capacity": clean(r["capacity"]),
            "images": {"logo": clean(r["logo"]), "logo_off": clean(r["logo_off"]),
                       "view": clean(r["venue_view"]), "facebook_logo": clean(r["logo_facebook"])},
            "socials": socials(r, ["website", "facebook", "twitter", "youtube"]),
            "map": clean(r["map"]), "video": clean(r["video"]),
            "featured": (r.get("featured") == "A") or (r.get("mejor") == "A"),
            "order": r.get("listorder_venue") or 0,
            "status": STATUS_MAP.get(r["status"], "inactive"),
        })
    return dedupe_slugs(docs)


def etl_festivals(cur, countries, continents, states):
    cur.execute("SELECT * FROM festivals")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_festival"]
        docs.append({
            "id": det_id("gem_festivals", lid), "legacy_id": lid,
            "title": clean(r["title"]), "slug": slugify(r["title"] or f"festival-{lid}"),
            "event_date": r["event_date"], "range_dates": clean(r["range_dates"]),
            "open_time": r["open_time"], "end_time": r["end_time"],
            "description": clean(r["description"]), "artists_schedule": clean(r["artists_schedule"]),
            "address": clean(r["address"]),
            **geo(r, countries, continents, states),
            "images": {"flyer": clean(r["image"]), "view": clean(r["festival_view"]),
                       "generic": clean(r["generic_image"]), "logo": clean(r["logo"]),
                       "logo_off": clean(r["logo_off"])},
            "socials": socials(r, ["facebook", "twitter", "instagram", "youtube",
                                   "soundcloud", "mixcloud", "website"]),
            "lineup_legacy_ids": lineup(cur, "festivals_djs", "id_festival", lid),
            "video": clean(r["video"]), "map": clean(r["map"]),
            "status": STATUS_MAP.get(r["status"], "inactive"),
        })
    return dedupe_slugs(docs)


def etl_conferences(cur, countries, continents, states):
    cur.execute("SELECT * FROM conferences")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_conference"]
        docs.append({
            "id": det_id("gem_conferences", lid), "legacy_id": lid,
            "title": clean(r["title"]), "slug": slugify(r["title"] or f"conference-{lid}"),
            "event_date": r["event_date"], "range_dates": clean(r["range_dates"]),
            "description": clean(r["description"]), "schedule": clean(r["conferences_schedule"]),
            "address": clean(r["address"]),
            **geo(r, countries, continents, states),
            "images": {"flyer": clean(r["image"]), "logo": clean(r["logo"]),
                       "logo_off": clean(r["logo_off"])},
            "socials": socials(r, ["website"]),
            "video": clean(r["video"]),
            "status": STATUS_MAP.get(r["status"], "inactive"),
        })
    return dedupe_slugs(docs)


def etl_clients(cur):
    cur.execute("SELECT * FROM clients")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_clients"]
        mode = {"1": "video", "2": "gallery"}.get(r["video_or_gallery_photos"], "link")
        cur.execute("SELECT title_detail, photo_detail FROM clients_details WHERE id_clients=%s", (lid,))
        gallery = [{"title": clean(d["title_detail"]), "photo": clean(d["photo_detail"])}
                   for d in cur.fetchall()]
        docs.append({
            "id": det_id("gem_clients", lid), "legacy_id": lid,
            "title": clean(r["title"]), "url": clean(r["url"]),
            "description": clean(r["description"]), "mode": mode,
            "image_on": clean(r["image_on"]), "image_off": clean(r["image_off"]),
            "video": clean(r["clients_video"]), "gallery": gallery,
            "publish": clean(r["publish"]), "order": lid,
        })
    return docs


def etl_events(cur):
    """Catalog subset — descriptive fields only. Tiers/benefits/points = Phase 4/5."""
    cur.execute("SELECT * FROM events")
    rows = cur.fetchall()
    docs = []
    for r in rows:
        lid = r["id_event"]
        etype = {1: "epass", 2: "eticket", 3: "guest_list", 4: "info"}.get(r["id_event_type"])
        docs.append({
            "id": det_id("gem_events", lid), "legacy_id": lid,
            "title": clean(r["event"]), "slug": f"{slugify(r['event'] or 'event')}-{lid}",
            "type": etype, "legacy_event_type_id": r["id_event_type"],
            "description": clean(r["description"]), "summary": clean(r["summary"]),
            "concept": clean(r["concept"]), "artists_schedule": clean(r["artists_schedule"]),
            "images": {"flyer": clean(r["image"]), "logo": clean(r["logo"])},
            "venue_legacy_id": r["id_venue"],
            "lineup_legacy_ids": lineup(cur, "events_djs", "id_event", lid),
            "event_date": r["event_date"], "open_time": r["open_time"], "end_time": r["end_time"],
            "socials": socials(r, ["facebook", "twitter", "youtube", "instagram",
                                   "soundcloud", "mixcloud", "pinterest", "google"]),
            "external_ticket_system": clean(r["external_ticket_system"]),
            "private": (r.get("private") == "Y"),
            "show_portal": (clean(r.get("gem2i_show_portal")) or "").lower() == "yes",
            "share_enabled": r.get("event_share") in ("1", "Y"),
            "legacy_promoter_id": r.get("id_promoter"),
            "status": STATUS_MAP.get(r["status"], "inactive"),
        })
    return docs


def etl_follows(cur):
    docs = []
    for table, kind, tcol in [("members_follow_events", "event", "id_event"),
                              ("members_follow_djs", "artist", "id_dj"),
                              ("members_follow_venues", "venue", "id_venue")]:
        cur.execute(f"SELECT id_membership, {tcol}, date_create FROM {table}")
        for r in cur.fetchall():
            docs.append({
                "id": det_id("gem_follows", f"{kind}:{r['id_membership']}:{r[tcol]}"),
                "member_legacy_id": r["id_membership"], "kind": kind,
                "target_legacy_id": r[tcol], "created_at": r["date_create"],
            })
    return docs


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=3306)
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="")
    ap.add_argument("--db", default="gem2i_etl_src")
    args = ap.parse_args()

    conn = pymysql.connect(host=args.host, port=args.port, user=args.user,
                           password=args.password, database=args.db,
                           charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    with conn.cursor() as cur:
        countries, continents, states, genres = load_lookups(cur)
        print(f"lookups: {len(countries)} countries, {len(continents)} continents, "
              f"{len(states)} states, {len(genres)} genres\nextracting:")
        write_ndjson("gem_artists", etl_artists(cur, countries, continents, states, genres))
        vtypes = write_ndjson("gem_venue_types", etl_venue_types(cur))
        write_ndjson("gem_venues", etl_venues(cur, countries, continents, states, genres, vtypes))
        write_ndjson("gem_festivals", etl_festivals(cur, countries, continents, states))
        write_ndjson("gem_conferences", etl_conferences(cur, countries, continents, states))
        write_ndjson("gem_clients", etl_clients(cur))
        write_ndjson("gem_events", etl_events(cur))
        write_ndjson("gem_follows", etl_follows(cur))
    conn.close()
    print(f"\nStage 1 complete -> {OUT_DIR.relative_to(ROOT)}")
    print("Next: upload the .jsonl files + run scripts/gem2i_load_catalogs.py ON THE BOX.")


if __name__ == "__main__":
    main()
