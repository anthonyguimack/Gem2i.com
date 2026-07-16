"""
KMS ETL — migrate a brand's Varient MySQL KMS into kms_* Mongo collections.

Runs ON the brand box (MySQL over the local unix socket, auth_socket `ubuntu`
user — same access news.py's live-sync uses). Idempotent: re-running replaces
the kms_* collections wholesale (the PHP KMS stays the source of truth until
cutover, so a re-run == fresh delta ETL).

Usage (on the box):
    cd /opt/beta.<brand>/backend
    venv/bin/python scripts/kms_migrate.py \
        --mysql-db db_insights_production \
        --uploads-src /opt/insights.carlosartiles.com/uploads \
        [--dry-run]

Reads MONGO_URL/DB_NAME from backend/.env (same as server.py).
"""
import argparse
import os
import re
import shutil
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


# ------------------------------------------------- minimal PHP unserialize
def php_unserialize(data):
    """Decode the small subset Varient uses (arrays/strings/ints/bools/null)."""
    if data is None:
        return None
    if isinstance(data, bytes):
        data = data.decode("utf-8", "replace")

    def parse(s, i):
        t = s[i]
        if t == "N":  # N;
            return None, i + 2
        if t in "ib":  # i:123; b:1;
            j = s.index(";", i)
            v = s[i + 2 : j]
            return (bool(int(v)) if t == "b" else int(v)), j + 1
        if t == "d":
            j = s.index(";", i)
            return float(s[i + 2 : j]), j + 1
        if t == "s":  # s:LEN:"...";
            j = s.index(":", i + 2)
            ln = int(s[i + 2 : j])
            # byte-length aware: PHP lengths are bytes
            raw = s.encode("utf-8")
            # find start of string content in bytes
            prefix = s[: j + 2].encode("utf-8")
            start_b = len(prefix)
            content = raw[start_b : start_b + ln].decode("utf-8", "replace")
            rest = raw[start_b + ln :].decode("utf-8", "replace")
            # rest starts with ";
            consumed = len(s) - len(rest) + 2
            return content, consumed
        if t == "a":  # a:N:{...}
            j = s.index(":", i + 2)
            n = int(s[i + 2 : j])
            i = j + 2  # skip :{
            out = {}
            for _ in range(n):
                k, i = parse(s, i)
                v, i = parse(s, i)
                out[k] = v
            return out, i + 1  # skip }
        raise ValueError(f"unsupported token {t!r} at {i}")

    try:
        val, _ = parse(data, 0)
        return val
    except Exception:
        return None


def norm(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat(sep=" ")
    if isinstance(v, bytes):
        return v.decode("utf-8", "replace")
    return v


def rows_to_docs(rows):
    return [{k: norm(v) for k, v in r.items()} for r in rows]


# ---------------------------------------------------------------- main
TABLES_1TO1 = [
    # table                  -> collection
    ("categories", "kms_categories"),
    ("tags", "kms_tags"),
    ("post_tags", "kms_post_tags"),
    ("images", "kms_images"),
    ("post_selections", "kms_selections"),
    ("pages", "kms_pages"),
    ("widgets", "kms_widgets"),
    ("gallery", "kms_gallery"),
    ("gallery_albums", "kms_gallery_albums"),
    ("gallery_categories", "kms_gallery_categories"),
    ("contacts", "kms_contacts"),
    ("languages", "kms_languages"),
    ("language_translations", "kms_translations"),
    ("fonts", "kms_fonts"),
    ("themes", "kms_themes"),
    ("polls", "kms_polls"),
    ("poll_votes", "kms_poll_votes"),
    ("reactions", "kms_reactions"),
    ("comments", "kms_comments"),
    ("subscribers", "kms_subscribers"),
    ("rss_feeds", "kms_rss_feeds"),
    ("ad_spaces", "kms_ad_spaces"),
    ("followers", "kms_followers"),
    ("reading_lists", "kms_reading_lists"),
    ("files", "kms_files"),
    ("videos", "kms_videos"),
    ("audios", "kms_audios"),
    ("post_files", "kms_post_files"),
    ("post_images", "kms_post_images"),
    ("post_audios", "kms_post_audios"),
    ("post_gallery_items", "kms_post_gallery_items"),
    ("post_item_images", "kms_post_item_images"),
    ("post_list_items", "kms_post_list_items"),
    ("post_poll_votes", "kms_post_poll_votes"),
    ("post_pageviews_month", "kms_pageviews_month"),
    ("quiz_questions", "kms_quiz_questions"),
    ("quiz_answers", "kms_quiz_answers"),
    ("quiz_results", "kms_quiz_results"),
    ("payouts", "kms_payouts"),
    ("roles", "kms_roles"),
    ("users", "kms_users_legacy"),  # reference only — auth uses `members`
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mysql-db", required=True)
    ap.add_argument("--uploads-src", required=True)
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
    report = []

    def fetch(table):
        with my.cursor() as c:
            c.execute(f"SELECT * FROM `{table}`")
            return c.fetchall()

    def load(coll_name, docs):
        report.append(f"{coll_name:<26} {len(docs)}")
        if args.dry_run:
            return
        db[coll_name].drop()
        if docs:
            db[coll_name].insert_many(docs)

    # --- 1:1 tables
    for table, coll in TABLES_1TO1:
        docs = rows_to_docs(fetch(table))
        if table == "roles":
            for d in docs:
                d["name_decoded"] = php_unserialize(d.get("name"))
        load(coll, docs)

    # --- posts (+embedded tags, image, author)
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
                {"id": t["id"], "tag": t.get("tag"), "slug": t.get("tag_slug") or t.get("slug")}
            )
    for p in posts:
        p["tags"] = tags_by_post.get(p["id"], [])
        img = images.get(p.get("image_id"))
        p["image"] = (
            {k: img.get(k) for k in ("id", "image_big", "image_default", "image_slider", "image_mid", "image_small", "image_mime", "storage")}
            if img
            else None
        )
        u = users.get(p.get("user_id"))
        p["author_username"] = u.get("username") if u else None
        p["author_slug"] = u.get("slug") if u else None
        p["author_id_membership"] = u.get("id_membership") if u else None
    load("kms_posts", posts)

    # --- settings (merge general_settings + per-lang settings rows)
    gs_rows = rows_to_docs(fetch("general_settings"))
    gs = gs_rows[0] if gs_rows else {}
    gs["routes_decoded"] = php_unserialize(gs.get("routes")) or {}
    settings_rows = rows_to_docs(fetch("settings"))
    for s in settings_rows:
        s["social_decoded"] = php_unserialize(s.get("social_media_data"))
    doc = {
        "key": "kms",
        "general": gs,
        "by_lang": {str(s.get("lang_id", 1)): s for s in settings_rows},
        "migrated_at": datetime.utcnow().isoformat(),
        "source_db": args.mysql_db,
    }
    report.append(f"{'kms_settings':<26} 1")
    if not args.dry_run:
        db["kms_settings"].drop()
        db["kms_settings"].insert_one(doc)

    # --- indexes
    if not args.dry_run:
        db.kms_posts.create_index([("slug", 1), ("lang_id", 1)])
        db.kms_posts.create_index([("category_id", 1), ("status", 1)])
        db.kms_posts.create_index([("created_at", -1)])
        db.kms_categories.create_index([("slug", 1)])
        db.kms_pages.create_index([("slug", 1)])
        db.kms_translations.create_index([("lang_id", 1), ("label", 1)])
        db.kms_selections.create_index([("selection_type", 1)])

    # --- uploads copy (into backend/uploads/kms — deploy never touches uploads/)
    dst = BACKEND_DIR / "uploads" / "kms"
    if not args.dry_run:
        dst.mkdir(parents=True, exist_ok=True)
        src = Path(args.uploads_src)
        for child in src.iterdir():
            target = dst / child.name
            if child.is_dir():
                shutil.copytree(child, target, dirs_exist_ok=True)
            else:
                shutil.copy2(child, target)
    report.append(f"uploads copied -> {dst}")

    # --- user mapping report (KMS users vs members)
    members = {
        (m.get("email") or "").lower(): m
        for m in db.members.find({}, {"email": 1, "membership_number": 1, "first_name": 1, "last_name": 1})
    }
    unmatched = []
    for u in users.values():
        email = (u.get("email") or "").strip("'").lower()
        by_num = u.get("id_membership") or 0
        found = email in members or any(m.get("membership_number") == by_num for m in members.values() if by_num)
        if not found:
            unmatched.append(f"  KMS user #{u['id']} {u.get('username')} <{email}> id_membership={by_num}")

    print("=== KMS ETL report ===")
    print("\n".join(report))
    print(f"members in Mongo: {len(members)}; KMS users: {len(users)}; UNMATCHED (manual decision): {len(unmatched)}")
    for line in unmatched:
        print(line)
    print("dry-run — nothing written" if args.dry_run else "DONE")


if __name__ == "__main__":
    main()
