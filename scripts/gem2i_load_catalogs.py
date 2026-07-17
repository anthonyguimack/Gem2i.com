"""gem2i Phase-2 catalog ETL — STAGE 2 (load).

Reads the newline-delimited JSON produced by Stage 1 (`gem2i_etl_catalogs.py`)
and UPSERTS it into the box Mongo (`gem2i_cms`), then ensures indexes.
Idempotent: every doc carries a deterministic `id` + a `legacy_id`, and we
upsert on `legacy_id`, so re-running never duplicates and re-applies edits.

Run ON THE BOX with the backend venv, from the deploy dir:
    cd /opt/beta.gem2i.com
    backend/venv/bin/python scripts/gem2i_load_catalogs.py --in scripts/etl_out

`--in` points at the directory holding the .jsonl files (scp them there first;
one-shot scripts + their data are NOT part of the smart deploy — DEPLOYMENT.md).

Reference resolution happens here (Stage-1 JSON stores only legacy ids):
  * gem_venues / gem_artists legacy_id -> new `id`  (built first)
  * gem_events.venue_legacy_id      -> `venue_id`
  * gem_events/gem_festivals lineup_legacy_ids -> `lineup` [artist id]
  * gem_follows.target_legacy_id    -> `target_id` (by kind)
  * gem_follows.member_legacy_id    -> `member_id` if a migrated member carries
    that legacy id (Phase-3 merge); otherwise left pending (kept as legacy id).
"""
import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING as ASC

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
if not MONGO_URL or not DB_NAME:
    sys.exit("MONGO_URL / DB_NAME not found in backend/.env — run from the deploy dir on the box.")

COLLECTIONS = ["gem_venue_types", "gem_artists", "gem_venues", "gem_festivals",
               "gem_conferences", "gem_clients", "gem_events", "gem_follows"]


def read_jsonl(in_dir: Path, name: str):
    path = in_dir / f"{name}.jsonl"
    if not path.exists():
        print(f"  (skip {name}: {path} not found)")
        return []
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def upsert_all(coll, docs, key="legacy_id"):
    for d in docs:
        coll.update_one({key: d[key]}, {"$set": d}, upsert=True)
    return len(docs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_dir", default=str(ROOT / "scripts" / "etl_out"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    in_dir = Path(args.in_dir)

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    data = {name: read_jsonl(in_dir, name) for name in COLLECTIONS}

    # --- reference maps (legacy_id -> new id) -------------------------------
    artist_map = {d["legacy_id"]: d["id"] for d in data["gem_artists"]}
    venue_map = {d["legacy_id"]: d["id"] for d in data["gem_venues"]}
    target_maps = {"artist": artist_map, "venue": venue_map,
                   "event": {d["legacy_id"]: d["id"] for d in data["gem_events"]}}

    # migrated members that carry a legacy id (Phase-3 merge sets `legacy_id`)
    member_map = {m["legacy_id"]: m.get("id") or str(m["_id"])
                  for m in db.members.find({"legacy_id": {"$exists": True}}, {"legacy_id": 1, "id": 1})}

    # --- resolve references in-place ---------------------------------------
    for d in data["gem_events"]:
        d["venue_id"] = venue_map.get(d.get("venue_legacy_id"))
        d["lineup"] = [artist_map[i] for i in d.get("lineup_legacy_ids", []) if i in artist_map]
    for d in data["gem_festivals"]:
        d["lineup"] = [artist_map[i] for i in d.get("lineup_legacy_ids", []) if i in artist_map]
    for d in data["gem_follows"]:
        d["target_id"] = target_maps.get(d["kind"], {}).get(d.get("target_legacy_id"))
        d["member_id"] = member_map.get(d.get("member_legacy_id"))  # None until Phase-3

    if args.dry_run:
        for name in COLLECTIONS:
            print(f"  {name:18s} would upsert {len(data[name])}")
        unresolved = sum(1 for d in data["gem_follows"] if not d["member_id"])
        print(f"  follows without a migrated member yet: {unresolved} (expected pre-Phase-3)")
        client.close()
        return

    # --- upsert -------------------------------------------------------------
    print("upserting:")
    for name in COLLECTIONS:
        # gem_follows has no scalar legacy_id (composite source key baked into
        # its deterministic `id`) — upsert those on `id` instead.
        n = upsert_all(db[name], data[name], key="id" if name == "gem_follows" else "legacy_id")
        print(f"  {name:18s} {n}")

    # --- indexes ------------------------------------------------------------
    db.gem_artists.create_index([("slug", ASC)], unique=True)
    db.gem_artists.create_index([("status", ASC)])
    db.gem_venues.create_index([("slug", ASC)], unique=True)
    db.gem_venues.create_index([("status", ASC)])
    db.gem_festivals.create_index([("slug", ASC)], unique=True)
    db.gem_conferences.create_index([("slug", ASC)], unique=True)
    db.gem_events.create_index([("slug", ASC)], unique=True)
    db.gem_events.create_index([("type", ASC), ("status", ASC), ("event_date", ASC)])
    db.gem_follows.create_index([("member_id", ASC), ("kind", ASC), ("target_id", ASC)], unique=True,
                                partialFilterExpression={"member_id": {"$type": "string"}})
    for name in COLLECTIONS:
        if name == "gem_follows":
            db[name].create_index([("id", ASC)], unique=True)
        else:
            db[name].create_index([("legacy_id", ASC)], unique=True)
    print("indexes ensured.")

    client.close()
    print("Stage 2 complete.")


if __name__ == "__main__":
    main()
