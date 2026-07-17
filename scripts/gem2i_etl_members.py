"""gem2i Phase-3 member-merge ETL — STAGE 1 (transform, D2 silent bcrypt).

Reads the restored legacy MySQL (`gem2ica_production` -> local db `gem2i_etl_src`)
and writes to `reference/local-only/etl_out/` (gitignored):

  gem_member_types.jsonl   the 5 legacy member types -> CMS `member_types` docs
  gem_members.jsonl        legacy `members` (+`members_membership`) -> CMS `members`

D2 (D-2026-58): each legacy plaintext password is bcrypt-hashed HERE, in memory —
the plaintext never leaves the restored DB into any file. Members without a
password (FB-only logins; FB login is dropped) get password_hash null and
recover via the standard forgot-password flow.

Legacy semantics (verified against the live dump + events_user_login_ok.php):
  * estado '1'  -> account_status 'active' (the ONLY value the legacy main-site
    login accepted); '0'/'2' -> 'deactivated' (they could not log in — parity).
  * formal_name_id_confirmation 'ok' -> formal_name_confirmed true (B7 gate).
  * members_membership.id_member_type -> member_type_id (deterministic id).
  * id_sponsor kept as sponsor_legacy_id; Stage 2 resolves the chain.

Run LOCALLY (XAMPP MariaDB running, dump restored — see GEM2I_LEGACY_SCHEMA_PHASE2.md):
    python scripts/gem2i_etl_members.py

Deterministic ids (uuid5) -> re-running is stable -> Stage-2 upserts are idempotent.
"""
import json
import uuid
from datetime import date, datetime
from pathlib import Path

import bcrypt
import pymysql

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "reference" / "local-only" / "etl_out"

# Same namespace as the catalog ETL (fixed — changing it shifts every id).
GEM2I_NS = uuid.UUID("6d2a1f5e-0e3b-5c4a-9b7d-0a1a12000000")


def det_uuid(collection: str, legacy_id) -> uuid.UUID:
    return uuid.uuid5(GEM2I_NS, f"{collection}:{legacy_id}")


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def jdefault(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    raise TypeError(f"not serializable: {type(o)}")


def write_ndjson(name, docs):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False, default=jdefault) + "\n")
    print(f"  {name:18s} {len(docs):5d} docs -> {path.relative_to(ROOT)}")
    return docs


GENDER = {"M": "male", "F": "female"}


def etl_member_types(cur):
    cur.execute("SELECT * FROM member_type")
    return [{
        "id": str(det_uuid("member_types", r["id_member_type"])),
        "legacy_id": r["id_member_type"],
        "name": clean(r["member_type"]) or f"Type {r['id_member_type']}",
        "order": r["id_member_type"],
        "status": "active" if r["estado"] == "1" else "inactive",
    } for r in cur.fetchall()]


def etl_members(cur, type_ids):
    cur.execute("SELECT id_membership, id_member_type, corporate FROM members_membership")
    membership = {r["id_membership"]: r for r in cur.fetchall()}

    cur.execute("SELECT * FROM members")
    rows = cur.fetchall()
    docs, hashed = [], 0
    for r in rows:
        lid = r["id_membership"]
        email = (clean(r["email"]) or "").lower()
        if not email:
            # 1 legacy row has no email — unreachable account, skip (recorded in the run log).
            print(f"  ! skipping id_membership={lid} (no email)")
            continue

        pwd = clean(r["password"])
        password_hash = None
        if pwd:
            password_hash = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            hashed += 1

        mm = membership.get(lid) or {}
        mt = mm.get("id_member_type")
        socials = {k: clean(r.get(k)) for k in
                   ("facebook", "twitter", "linkedin", "instagram", "google", "skype_id")
                   if clean(r.get(k))}

        docs.append({
            "legacy_id": lid,
            "member_id": f"member_{det_uuid('members', lid).hex[:12]}",
            "email": email,
            "username": email,
            "password_hash": password_hash,          # null => forgot-password only
            "first_name": clean(r["first_name"]) or "",
            "last_name": clean(r["last_name"]) or "",
            "gender": GENDER.get((r.get("sexo") or "").upper(), ""),
            "phone": clean(r["phone_number"]) or "",
            "date_of_birth": clean(r["birthday"]) or "",
            "address": clean(r["street_address"]) or "",
            "country": clean(r["country"]) or "",
            "state": clean(r["state"]) or "",
            "city": clean(r["city"]) or "",
            "zip_code": clean(r["zip_code"]) or "",
            "biography": clean(r["biography"]) or "",
            "language": (clean(r["language"]) or "en").lower(),
            "formal_name_id": clean(r["formal_name_id"]) or "",
            "formal_name_confirmed": (clean(r["formal_name_id_confirmation"]) or "").lower() == "ok",
            "member_type_id": type_ids.get(mt) if mt is not None else None,
            "corporate": (mm.get("corporate") == "1"),
            "sponsor_legacy_id": r.get("id_sponsor"),
            "gem_socials": socials or None,
            "legacy_photo": clean(r.get("picture_photo")),
            "account_status": "active" if r["estado"] == "1" else "deactivated",
            "role": "member",
            "cms_roles": ["role_member"],
            "registration_source": "gem2i_legacy",
            "created_at": r["date_create"],
            "last_login": r["last_session"],
        })
    print(f"  passwords bcrypt-hashed: {hashed} / {len(docs)} "
          f"(rest = no legacy password -> forgot-password recovery)")
    return docs


def main():
    conn = pymysql.connect(host="127.0.0.1", user="root", password="", database="gem2i_etl_src",
                           charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    with conn.cursor() as cur:
        print("extracting:")
        types = etl_member_types(cur)
        write_ndjson("gem_member_types", types)
        type_ids = {t["legacy_id"]: t["id"] for t in types}
        write_ndjson("gem_members", etl_members(cur, type_ids))
    conn.close()
    print(f"\nStage 1 complete -> {OUT_DIR.relative_to(ROOT)}")
    print("Next: scp the .jsonl + scripts/gem2i_load_members.py to the box and run Stage 2.")


if __name__ == "__main__":
    main()
