"""Recompute/verify members.points_balance from the points_ledger (source of truth).

On-box usage (carlos):
  venv/bin/python scripts/points_recompute.py --check          # report drift only
  venv/bin/python scripts/points_recompute.py                  # repair balances

Idempotent. Members with no ledger rows and no balance field are left untouched;
a stale balance with zero ledger rows is reset to 0.
"""
import argparse
import os
from datetime import datetime, timezone

from bson import ObjectId
from pymongo import MongoClient


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mongo", default=os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    ap.add_argument("--db", default=os.environ.get("DB_NAME", "carlosartiles_cms"))
    ap.add_argument("--check", action="store_true", help="report drift, change nothing")
    args = ap.parse_args()

    db = MongoClient(args.mongo)[args.db]
    sums = {r["_id"]: int(r["total"]) for r in db.points_ledger.aggregate(
        [{"$group": {"_id": "$mid", "total": {"$sum": "$points"}}}])}

    drift = fixed = 0
    # every member with ledger rows OR a cached balance is in scope
    scope_ids = set(sums)
    for m in db.members.find({"points_balance": {"$exists": True}}, {"_id": 1}):
        scope_ids.add(str(m["_id"]))

    for mid in sorted(scope_ids):
        try:
            member = db.members.find_one({"_id": ObjectId(mid)}, {"points_balance": 1, "email": 1})
        except Exception:
            member = None
        if not member:
            print(f"  ORPHAN ledger mid={mid} total={sums.get(mid, 0)} (no member doc)")
            continue
        want = sums.get(mid, 0)
        have = int(member.get("points_balance") or 0)
        if want != have:
            drift += 1
            print(f"  DRIFT {member.get('email')} mid={mid}: cached={have} ledger={want}")
            if not args.check:
                db.members.update_one(
                    {"_id": member["_id"]},
                    {"$set": {"points_balance": want,
                              "points_updated_at": datetime.now(timezone.utc).isoformat()}})
                fixed += 1

    print(f"members in scope: {len(scope_ids)}, drift: {drift}, "
          f"{'fixed: ' + str(fixed) if not args.check else 'check-only'}")


if __name__ == "__main__":
    main()
