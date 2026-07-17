"""gem2i Phase-4/5 historical-data ETL — STAGE 2 (load, idempotent).

Loads the Stage-1 output (gem2i_etl_history.py) into the box Mongo:

  * gem_events_history  -> $set tiers/guest_list/points/payment/legacy_prices/
                           transaction_fee onto the matching gem_events doc
                           (by legacy_id). Only the keys present are written,
                           so admin edits to OTHER fields survive; re-running
                           re-applies the legacy sub-docs.
  * gem_transactions_hist -> upsert by legacy_id into gem_transactions with
                           event_id / member_id / sponsor ids resolved.
                           Rows are tagged legacy:true (the live checkout path
                           never writes that flag).
  * gem_points_history  -> upsert by id (deterministic) with member_id resolved.
  * gem_points_actions  -> gem_config {key:'points_actions'} (action catalog).

Run ON THE BOX from the deploy dir:
    cd /opt/beta.gem2i.com
    backend/venv/bin/python scripts/gem2i_load_history.py --in scripts/etl_out [--dry-run]
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

SUBDOC_KEYS = ["tiers", "guest_list", "points", "payment", "legacy_prices", "transaction_fee"]


def read_jsonl(in_dir: Path, name: str):
    path = in_dir / f"{name}.jsonl"
    if not path.exists():
        sys.exit(f"missing {path} — scp the Stage-1 output first")
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_dir", default=str(ROOT / "scripts" / "etl_out"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    in_dir = Path(args.in_dir)

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    ev_hist = read_jsonl(in_dir, "gem_events_history")
    txs = read_jsonl(in_dir, "gem_transactions_hist")
    actions = read_jsonl(in_dir, "gem_points_actions")
    points = read_jsonl(in_dir, "gem_points_history")

    event_map = {e["legacy_id"]: e["id"] for e in
                 db.gem_events.find({"legacy_id": {"$exists": True}}, {"legacy_id": 1, "id": 1})}
    member_map = {m["legacy_id"]: m["member_id"] for m in
                  db.members.find({"legacy_id": {"$exists": True}}, {"legacy_id": 1, "member_id": 1})}

    if args.dry_run:
        with_tiers = sum(1 for e in ev_hist if "tiers" in e)
        with_gl = sum(1 for e in ev_hist if "guest_list" in e)
        missing_ev = sum(1 for e in ev_hist if e["legacy_id"] not in event_map)
        tx_no_member = sum(1 for t in txs if t["member_legacy_id"] not in member_map)
        pt_no_member = sum(1 for p in points if p["member_legacy_id"] not in member_map)
        print(f"events with sub-docs: {len(ev_hist)} (tiers {with_tiers}, guest_list {with_gl}; "
              f"{missing_ev} not found in gem_events)")
        print(f"transactions: {len(txs)} ({tx_no_member} without a migrated member)")
        print(f"points history: {len(points)} ({pt_no_member} without a migrated member) | "
              f"actions catalog: {len(actions)}")
        client.close()
        return

    # --- event sub-docs -----------------------------------------------------
    updated = missing = 0
    for e in ev_hist:
        payload = {k: e[k] for k in SUBDOC_KEYS if k in e}
        if not payload:
            continue
        res = db.gem_events.update_one({"legacy_id": e["legacy_id"]}, {"$set": payload})
        if res.matched_count:
            updated += 1
        else:
            missing += 1
    print(f"gem_events sub-docs applied: {updated} (no matching event: {missing})")

    # --- transactions archive ----------------------------------------------
    n = 0
    for t in txs:
        t["event_id"] = event_map.get(t.pop("event_legacy_id"))
        t["member_id"] = member_map.get(t.get("member_legacy_id"))
        db.gem_transactions.update_one({"legacy_id": t["legacy_id"]}, {"$set": t}, upsert=True)
        n += 1
    print(f"gem_transactions archived: {n}")

    # --- points history + action catalog ------------------------------------
    n = 0
    for p in points:
        p["member_id"] = member_map.get(p.get("member_legacy_id"))
        db.gem_points_history.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
        n += 1
    print(f"gem_points_history archived: {n}")
    db.gem_config.update_one({"key": "points_actions"},
                             {"$set": {"actions": actions}}, upsert=True)
    print(f"gem_config points_actions catalog: {len(actions)} actions")

    # --- indexes ------------------------------------------------------------
    db.gem_transactions.create_index([("legacy_id", ASC)], unique=True, sparse=True)
    db.gem_points_history.create_index([("id", ASC)], unique=True)
    db.gem_points_history.create_index([("member_id", ASC), ("created_at", ASC)])
    print("indexes ensured.")

    client.close()
    print("Stage 2 complete.")


if __name__ == "__main__":
    main()
