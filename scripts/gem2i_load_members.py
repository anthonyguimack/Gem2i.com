"""gem2i Phase-3 member-merge ETL — STAGE 2 (load, idempotent).

Loads `gem_member_types.jsonl` + `gem_members.jsonl` (Stage 1,
gem2i_etl_members.py) into the box Mongo and finishes the D2 merge:

  * member_types: $setOnInsert by legacy_id (admin edits survive re-runs).
  * members NEW: inserted with a fresh sequential membership_number +
    "{prefix}-{n}" membership_id (prefix = settings.aux_prefix) and the full
    CMS member shape.
  * members ALREADY MIGRATED (same legacy_id): profile fields refreshed;
    password_hash / account_status / roles / ids NEVER overwritten (a member
    who reset their password since keeps the new one).
  * members PRE-EXISTING by email (e.g. the product admin): left intact —
    only tagged with legacy_id + gem supplement fields (formal name,
    member type, sponsor). Auth fields untouched.
  * Sponsor chains resolved legacy id -> new member_id in a second pass.
  * gem_config {key:'ecommissions'} levels set to the verified legacy
    percentages [30,20,15,10,5,2] (system_ecommissions, dump 2026-07-07).

Run ON THE BOX from the deploy dir:
    cd /opt/beta.gem2i.com
    backend/venv/bin/python scripts/gem2i_load_members.py --in scripts/etl_out [--dry-run]

After this, re-run gem2i_load_catalogs.py so gem_follows.member_id resolves.
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

LEGACY_ECOMMISSIONS = [30, 20, 15, 10, 5, 2]

# Fields refreshed on every run for already-migrated members. Everything NOT
# here (password_hash, account_status, role, cms_roles, member_id,
# membership_number/id, username) is written once at insert and never again.
PROFILE_FIELDS = [
    "email", "first_name", "last_name", "gender", "phone", "date_of_birth",
    "address", "country", "state", "city", "zip_code", "biography", "language",
    "member_type_id", "corporate", "sponsor_legacy_id", "gem_socials", "legacy_photo",
]
# Supplement-only fields for members that already existed by email (admin):
SUPPLEMENT_FIELDS = ["formal_name_id", "formal_name_confirmed", "member_type_id",
                     "corporate", "sponsor_legacy_id", "gem_socials", "legacy_photo"]


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

    types = read_jsonl(in_dir, "gem_member_types")
    members = read_jsonl(in_dir, "gem_members")

    settings = db.settings.find_one({}) or {}
    prefix = settings.get("aux_prefix", "GEM")

    if args.dry_run:
        have_legacy = {m["legacy_id"] for m in
                       db.members.find({"legacy_id": {"$exists": True}}, {"legacy_id": 1})}
        by_email = {m["email"] for m in db.members.find({}, {"email": 1}) if m.get("email")}
        news = [m for m in members if m["legacy_id"] not in have_legacy and m["email"] not in by_email]
        merges = [m for m in members if m["legacy_id"] not in have_legacy and m["email"] in by_email]
        print(f"member_types: {len(types)} | members: {len(members)} "
              f"-> new {len(news)}, email-merge {len(merges)}, "
              f"already migrated {len(members) - len(news) - len(merges)}")
        print(f"active in file: {sum(1 for m in members if m['account_status'] == 'active')}, "
              f"with password_hash: {sum(1 for m in members if m['password_hash'])}")
        client.close()
        return

    # --- member types -------------------------------------------------------
    for t in types:
        db.member_types.update_one({"legacy_id": t["legacy_id"]}, {"$setOnInsert": t}, upsert=True)
    print(f"member_types ensured: {len(types)}")

    # --- members ------------------------------------------------------------
    last = db.members.find_one({}, {"membership_number": 1}, sort=[("membership_number", -1)])
    next_num = ((last or {}).get("membership_number") or 0) + 1

    inserted = refreshed = supplemented = untouched = 0
    for m in members:
        existing = db.members.find_one({"legacy_id": m["legacy_id"]},
                                       {"member_id": 1, "registration_source": 1})
        by_email = None if existing else db.members.find_one({"email": m["email"]}, {"member_id": 1})
        if existing is not None:
            if existing.get("registration_source") == "gem2i_legacy":
                db.members.update_one({"member_id": existing["member_id"]},
                                      {"$set": {k: m[k] for k in PROFILE_FIELDS}})
                refreshed += 1
            else:
                untouched += 1  # email-merged account (e.g. admin): auth AND profile stay theirs
        elif by_email is not None:
            # pre-existing account (e.g. the product admin) — tag, never touch auth/profile
            db.members.update_one(
                {"member_id": by_email["member_id"]},
                {"$set": {"legacy_id": m["legacy_id"],
                          **{k: m[k] for k in SUPPLEMENT_FIELDS}}})
            supplemented += 1
        else:
            doc = dict(m)
            doc["membership_number"] = next_num
            doc["membership_id"] = f"{prefix}-{next_num}"
            next_num += 1
            # CMS member-shape defaults (mirrors the registration insert)
            doc.setdefault("avatar", "")
            doc.setdefault("summary", "")
            doc.setdefault("social_links", [])
            doc.setdefault("sponsor_id", None)
            doc.setdefault("sponsor_membership_number", None)
            doc.setdefault("mentor_id", None)
            doc.setdefault("mentor_membership_number", None)
            doc.setdefault("is_mentor", False)
            db.members.insert_one(doc)
            inserted += 1
    print(f"members: inserted {inserted}, refreshed {refreshed}, "
          f"email-merged {supplemented}, merged-untouched {untouched}")

    # --- sponsor chain resolution ------------------------------------------
    id_map = {m["legacy_id"]: m for m in
              db.members.find({"legacy_id": {"$exists": True}},
                              {"legacy_id": 1, "member_id": 1, "membership_number": 1})}
    resolved = 0
    for m in db.members.find({"sponsor_legacy_id": {"$ne": None}, "legacy_id": {"$exists": True}},
                             {"member_id": 1, "sponsor_legacy_id": 1, "sponsor_id": 1}):
        s = id_map.get(m["sponsor_legacy_id"])
        if s and s["member_id"] != m["member_id"] and not m.get("sponsor_id"):
            db.members.update_one({"member_id": m["member_id"]},
                                  {"$set": {"sponsor_id": s["member_id"],
                                            "sponsor_membership_number": s.get("membership_number")}})
            resolved += 1
    print(f"sponsor chains resolved: {resolved}")

    # --- legacy ecommissions percentages ------------------------------------
    db.gem_config.update_one({"key": "ecommissions"},
                             {"$set": {"levels": LEGACY_ECOMMISSIONS}}, upsert=True)
    print(f"gem_config ecommissions levels -> {LEGACY_ECOMMISSIONS}")

    # --- indexes ------------------------------------------------------------
    db.members.create_index([("legacy_id", ASC)], unique=True, sparse=True)
    db.members.create_index([("email", ASC)])
    print("indexes ensured.")

    client.close()
    print("Stage 2 complete. Now re-run gem2i_load_catalogs.py to resolve gem_follows.member_id.")


if __name__ == "__main__":
    main()
