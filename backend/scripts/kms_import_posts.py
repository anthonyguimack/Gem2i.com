"""
KMS ADDITIVE POST IMPORT — copy ONLY the posts from a brand's legacy Varient
MySQL KMS into the native `kms_posts` Mongo collection, WITHOUT categories.

Unlike scripts/kms_migrate.py (the full ETL, which DROPS every kms_* collection
and is RETIRED for carlos), this script is strictly additive:
  * it never drops or empties anything;
  * it touches ONLY `kms_posts`, inserting the legacy posts as NEW documents;
  * every imported post lands with category_id = None (uncategorised) so the
    administrator assigns category/subcategory by hand afterwards;
  * imported posts land as DRAFTS (status 0, is_draft True) — invisible to the
    public KMS and the News mirror until the admin publishes them;
  * legacy ids are renumbered (they collide with the reseeded native ids) — the
    original id is kept as `legacy_id`, and `imported_from_php: true` marks the
    row so a re-run is idempotent (prior imports are removed then re-inserted).

Runs ON the brand box (MySQL over the local unix socket, auth_socket `ubuntu`
user — same access the ETL and news live-sync use). Reads MONGO_URL/DB_NAME
from backend/.env (same as server.py).

Usage (on the box):
    cd /opt/beta.<brand>/backend
    venv/bin/python scripts/kms_import_posts.py --mysql-db db_insights_production [--dry-run]
"""
import argparse
import os
import sys
from datetime import datetime, date
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pymysql  # noqa: E402
from pymongo import MongoClient  # noqa: E402


# ---------------------------------------------------------------- env
def load_env():
    env = {}
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def norm(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat(sep=" ")
    if isinstance(v, bytes):
        return v.decode("utf-8", "replace")
    return v


def rows_to_docs(rows):
    return [{k: norm(v) for k, v in r.items()} for r in rows]


def uniq_slug(base, used):
    s = (base or "post").strip() or "post"
    if s not in used:
        used.add(s)
        return s
    i = 2
    while f"{s}-{i}" in used:
        i += 1
    s2 = f"{s}-{i}"
    used.add(s2)
    return s2


IMAGE_KEYS = ("id", "image_big", "image_default", "image_slider",
              "image_mid", "image_small", "image_mime", "storage")

# columns carried straight through from the legacy row
PASS_THROUGH = (
    "lang_id", "title", "title_hash", "keywords", "summary", "content",
    "image_id", "optional_url", "need_auth", "visibility", "show_right_column",
    "post_type", "video_path", "video_storage", "image_url", "video_url",
    "video_embed_code", "user_id", "feed_id", "post_url", "show_post_url",
    "image_description", "show_item_numbers", "is_poll_public",
    "link_list_style", "recipe_info", "post_data", "created_at", "updated_at",
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mysql-db", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    env = load_env()
    mongo = MongoClient(env.get("MONGO_URL", "mongodb://localhost:27017"))
    db = mongo[env.get("DB_NAME")]
    my = pymysql.connect(
        unix_socket="/var/run/mysqld/mysqld.sock",
        user="ubuntu",
        database=args.mysql_db,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    def fetch(table):
        with my.cursor() as c:
            c.execute(f"SELECT * FROM `{table}`")
            return c.fetchall()

    # --- source rows + join maps (same joins as the full ETL)
    posts = rows_to_docs(fetch("posts"))
    tags = {t["id"]: t for t in rows_to_docs(fetch("tags"))}
    post_tags = rows_to_docs(fetch("post_tags"))
    images = {i["id"]: i for i in rows_to_docs(fetch("images"))}
    users = {u["id"]: u for u in rows_to_docs(fetch("users"))}

    tags_by_post = {}
    for pt in post_tags:
        t = tags.get(pt.get("tag_id"))
        if t:
            tags_by_post.setdefault(pt.get("post_id"), []).append(
                {"id": t["id"], "tag": t.get("tag"),
                 "slug": t.get("tag_slug") or t.get("slug")}
            )

    # --- idempotency: drop any prior import from THIS script, then recompute
    prior = db.kms_posts.count_documents({"imported_from_php": True})
    if not args.dry_run and prior:
        db.kms_posts.delete_many({"imported_from_php": True})

    # base id = max native id AFTER removing prior imports; slugs = what remains
    existing = list(db.kms_posts.find({}, {"id": 1, "slug": 1}))
    next_id = (max([e.get("id", 0) or 0 for e in existing], default=0)) + 1
    used_slugs = {e.get("slug") for e in existing if e.get("slug")}

    now = datetime.utcnow().isoformat()
    docs = []
    report = []
    posts.sort(key=lambda p: p.get("id") or 0)
    for p in posts:
        legacy_id = p.get("id")
        doc = {k: p.get(k) for k in PASS_THROUGH}
        doc["id"] = next_id
        next_id += 1
        doc["slug"] = uniq_slug(p.get("slug"), used_slugs)

        # --- STRIP category / subcategory (admin assigns manually)
        doc["category_id"] = None

        # --- land as DRAFT, invisible to public KMS + News mirror.
        # NOTE: these MUST be ints (0/1), not Python bools — the native admin
        # writes int flags and the /admin/drafts list filters {is_draft: 1};
        # a BSON boolean `true` will not match an int-1 query (different type).
        doc["status"] = 0
        doc["is_draft"] = 1
        doc["is_scheduled"] = 0
        doc["scheduled_at"] = None
        doc["slider_order"] = 0
        doc["featured_order"] = 0
        doc["tier"] = None            # admin picks a tier when publishing
        doc["comment_count"] = 0
        doc["pageviews"] = 0
        doc["dummy_views"] = 0
        doc["share_points"] = None

        # --- embedded tags / image / author (native display shape)
        doc["tags"] = tags_by_post.get(legacy_id, [])
        img = images.get(p.get("image_id"))
        doc["image"] = {k: img.get(k) for k in IMAGE_KEYS} if img else None
        u = users.get(p.get("user_id"))
        doc["author_username"] = u.get("username") if u else None
        doc["author_slug"] = u.get("slug") if u else None
        doc["author_id_membership"] = u.get("id_membership") if u else None

        # drop a broken legacy folder-only image_url (renders as a broken img)
        iu = (doc.get("image_url") or "").rstrip("/")
        if iu.endswith("uploads/images"):
            doc["image_url"] = None

        # keep the raw legacy HTML for reference + re-processing if ever wanted
        doc["source_html"] = p.get("content")

        # provenance / idempotency markers
        doc["imported_from_php"] = True
        doc["legacy_id"] = legacy_id
        doc["imported_at"] = now

        docs.append(doc)
        report.append(
            f"  legacy #{legacy_id:<3} -> id {doc['id']:<3} "
            f"[{'img' if doc['image'] else '---'}] {str(doc['title'])[:52]}"
        )

    print("=== KMS additive post import ===")
    print(f"source db      : {args.mysql_db}")
    print(f"legacy posts   : {len(posts)}")
    print(f"prior imports  : {prior} (removed before re-insert)"
          if prior else "prior imports  : 0")
    print(f"native id start: {docs[0]['id'] if docs else '-'}")
    print(f"category_id    : None (stripped)   status: 0 (draft)")
    print("\n".join(report))

    if args.dry_run:
        print("\nDRY RUN — nothing written.")
        return

    if docs:
        db.kms_posts.insert_many(docs)
    total = db.kms_posts.count_documents({})
    imported = db.kms_posts.count_documents({"imported_from_php": True})
    print(f"\nDONE — inserted {len(docs)} draft posts.")
    print(f"kms_posts now: {total} total ({imported} imported-from-php, "
          f"all category_id=None, status=0).")


if __name__ == "__main__":
    main()
