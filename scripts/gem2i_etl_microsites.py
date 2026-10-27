"""gem2i event-microsites ETL delta (plan: work-plans-MD/GEM2I_EVENT_MICROSITES_PLAN.md §M0).

Two stages, same culture as gem2i_etl_catalogs.py / gem2i_load_catalogs.py:

STAGE 1 (transform, LOCAL, reads the restored legacy dump — no Mongo writes):
    python scripts/gem2i_etl_microsites.py transform --host 127.0.0.1 --user root --password "" --db gem2i_etl_src
  → reference/local-only/etl_out/gem_promoters.jsonl + gem_events_microsite.jsonl (gitignored)

STAGE 2 (load, ON THE BOX, idempotent upserts by deterministic id):
    python scripts/gem2i_etl_microsites.py load --mongo mongodb://localhost:27017 --mongo-db gem2i_cms [--overwrite-edited]
  → upserts gem_promoters; $set on gem_events only the microsite fields
    (domain, show_portal_es, promoter_id, images.logo, microsite.slides). Events edited in the
    CMS (updated_at set) are skipped unless --overwrite-edited.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gem2i_etl_catalogs import OUT_DIR, STATUS_MAP, clean, det_id, socials, write_ndjson  # noqa: E402

SOCIAL_KEYS = ["facebook", "twitter", "google", "instagram", "youtube", "pinterest", "soundcloud", "mixcloud"]


def norm_host(h):
    h = (clean(h) or "").lower()
    for p in ("https://", "http://"):
        if h.startswith(p):
            h = h[len(p):]
    h = h.split("/")[0].split(":")[0]
    return (h[4:] if h.startswith("www.") else h) or None


def transform(args):
    import pymysql
    conn = pymysql.connect(host=args.host, user=args.user, password=args.password, database=args.db,
                           charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor)
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM promoters")
        promoters = []
        for r in cur.fetchall():
            lid = r["id_promoter"]
            promoters.append({
                "id": det_id("gem_promoters", lid), "legacy_id": lid,
                "name": clean(r.get("promoter")), "url": norm_host(r.get("url")),
                "language": (clean(r.get("language")) or "en").lower()[:2],
                "email_contact_us": clean(r.get("email_contact_us")), "description": clean(r.get("description")),
                "images": {"logo": clean(r.get("logo")), "logo_off": clean(r.get("logo_off"))},
                "socials": socials(r, SOCIAL_KEYS), "twitter_widget_id": clean(r.get("twitter_widget_id")),
                "legacy_country_id": r.get("country"), "legacy_state_id": r.get("id_state"), "legacy_city_id": r.get("id_city"),
                "status": STATUS_MAP.get(r.get("status"), "inactive"),
            })
        write_ndjson("gem_promoters", promoters)

        cur.execute("SELECT * FROM events_content_slide")
        slides = {}
        for s in cur.fetchall():
            if s.get("status") not in ("A", None):
                continue
            slides.setdefault(s["id_event"], []).append({
                "id": det_id("gem_event_slides", s["id_content_slide"]), "title": clean(s.get("title")),
                "text_button": clean(s.get("text_button")), "url": clean(s.get("url")),
                "description": clean(s.get("description")), "image": clean(s.get("image")),
                "visible": str(s.get("publish") or "1") in ("1", "Y"),
            })

        cur.execute("SELECT * FROM events")
        patches = []
        for r in cur.fetchall():
            lid = r["id_event"]
            patches.append({
                "id": det_id("gem_events", lid), "legacy_id": lid,
                "domain": norm_host(r.get("domain")),
                "show_portal_es": (clean(r.get("exclusivesession_show_portal")) or "").lower() == "yes",
                "promoter_id": det_id("gem_promoters", r["id_promoter"]) if r.get("id_promoter") else None,
                "logo": clean(r.get("logo")),
                "slides": slides.get(lid, []),
            })
        write_ndjson("gem_events_microsite", patches)
    conn.close()


def _read(name):
    path = OUT_DIR / f"{name}.jsonl"
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load(args):
    from pymongo import MongoClient, UpdateOne
    db = MongoClient(args.mongo)[args.mongo_db]
    ops = [UpdateOne({"id": p["id"]}, {"$set": p}, upsert=True) for p in _read("gem_promoters")]
    if ops:
        r = db.gem_promoters.bulk_write(ops)
        print(f"gem_promoters: upserted {r.upserted_count}, modified {r.modified_count}")
    db.gem_promoters.create_index("url")
    db.gem_events.create_index("domain")
    done = skipped = 0
    for p in _read("gem_events_microsite"):
        q = {"id": p["id"]}
        if not args.overwrite_edited:
            q["updated_at"] = {"$exists": False}
        s = {"show_portal_es": p["show_portal_es"], "promoter_id": p["promoter_id"], "microsite.slides": p["slides"]}
        if p["domain"]:
            s["domain"] = p["domain"]
        if p["logo"]:
            s["images.logo"] = p["logo"]
        res = db.gem_events.update_one(q, {"$set": s})
        done += res.modified_count
        skipped += 0 if res.matched_count else 1
    print(f"gem_events microsite fields: modified {done}, skipped/not found {skipped}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("transform")
    t.add_argument("--host", default="127.0.0.1")
    t.add_argument("--user", default="root")
    t.add_argument("--password", default="")
    t.add_argument("--db", default="gem2i_etl_src")
    lo = sub.add_parser("load")
    lo.add_argument("--mongo", default="mongodb://localhost:27017")
    lo.add_argument("--mongo-db", default="gem2i_cms")
    lo.add_argument("--overwrite-edited", action="store_true")
    args = ap.parse_args()
    transform(args) if args.cmd == "transform" else load(args)


if __name__ == "__main__":
    main()
