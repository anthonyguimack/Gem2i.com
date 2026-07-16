#!/usr/bin/env python3
"""
Phase 2 of SOCIAL_LINKS_KMS_SYNC_PLAN — enter Carlos's social list (§6, verbatim
from Anthony 2026-07-11) into CMS Settings → Social Links.

Default mode = MERGE (Anthony, session 50): start from Carlos's §6 list, but never
lose a network already configured live. Any existing row with a real URL is kept —
if its network is in §6 it's promoted to ACTIVE with the live URL (e.g. Instagram),
and networks not in §6 at all (e.g. LinkedIn, X) are appended as active. Active rows
are ordered first. Use --replace to write §6 verbatim instead (drops live extras).

Networks given only as an email, or "needs configuration", stay INACTIVE with an
empty URL (D5 — no guessing). Rows are normalized like the admin save route.

Run on the box:
    /opt/beta.carlosartiles.com/backend/venv/bin/python scripts/seed_social_links_carlos.py
(add --dry-run to preview, --replace for verbatim §6).
"""
import argparse
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "carlosartiles_cms"

# (catalog key, URL, active). URL "" + active False = placeholder pending config (D5).
CARLOS_LIST = [
    ("youtube",    "https://www.youtube.com/@carlosartiles",     True),
    ("tiktok",     "https://www.tiktok.com/@carlos.m.artiles",   True),
    ("github",     "https://github.com/carlosartiles",           True),
    ("vimeo",      "https://vimeo.com/carlosartiles",            True),
    ("soundcloud", "https://soundcloud.com/carlosartiles",       True),
    ("buzzfeed",   "https://www.buzzfeed.com/carlosartiles",     True),
    ("substack",   "https://substack.com/@carlosartiles",        True),   # stray "k" typo fixed
    ("reddit",     "https://www.reddit.com/user/carlosartiles/", True),   # share-capable + active
    ("patreon",    "", False),   # given as email — inactive until a profile URL (D5)
    ("spotify",    "", False),   # given as email — inactive until a profile URL (D5)
    ("slack",      "", False),   # no public URL — inactive (D5)
    ("cashme",     "", False),   # needs to be set up
    ("venmo",      "", False),   # needs to be set up
    ("shopify",    "", False),   # needs to be set up
    ("facebook",   "", False),   # need to configure (share-capable once set + active)
    ("instagram",  "", False),   # need to configure
    ("threads",    "", False),   # missing configuration (share-capable once set + active)
    ("bluesky",    "", False),   # missing configuration (share-capable once set + active)
    ("paypal",     "", False),   # need to configure
    ("stripe",     "", False),   # missing configuration
]


def build_base_rows():
    from utils.social_catalog import get as catalog_get
    rows = []
    for key, url, active in CARLOS_LIST:
        entry = catalog_get(key)
        if not entry:
            raise SystemExit(f"Unknown catalog key: {key}")
        rows.append({
            "id": f"seed-{key}", "key": key, "platform": entry["label"],
            "icon": entry["icon"], "url": url, "active": active,
        })
    return rows


def merge_live(base_rows, current_rows):
    """Fold existing live rows into the §6 base without losing anything."""
    from utils.social_catalog import get as catalog_get, resolve_key
    by_key = {r["key"]: r for r in base_rows}
    order = [r["key"] for r in base_rows]
    for cur in current_rows or []:
        if not isinstance(cur, dict):
            continue
        url = (cur.get("url") or "").strip()
        if not url:
            continue  # nothing to preserve
        k = resolve_key(platform=cur.get("platform", ""), icon=cur.get("icon", ""),
                        key=cur.get("key", ""))
        if not k:
            # genuine custom row — keep verbatim as an active display-only link
            cid = "custom-" + (cur.get("platform") or "link").strip().lower().replace(" ", "-")
            if cid not in by_key:
                by_key[cid] = {"id": cur.get("id") or cid, "key": "",
                               "platform": cur.get("platform") or "Link",
                               "icon": cur.get("icon") or "website", "url": url, "active": True}
                order.append(cid)
            continue
        entry = catalog_get(k)
        if k in by_key:
            by_key[k]["url"] = url        # live URL wins over a §6 placeholder
            by_key[k]["active"] = True    # a real URL means it's live → active
        else:
            by_key[k] = {"id": f"seed-{k}", "key": k, "platform": entry["label"],
                         "icon": entry["icon"], "url": url, "active": True}
            order.append(k)
    rows = [by_key[k] for k in order]
    rows.sort(key=lambda r: not r["active"])  # active first, stable
    return rows


async def main(dry_run: bool, replace: bool):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    base = build_base_rows()
    if replace:
        rows, mode = base, "REPLACE (§6 verbatim)"
    else:
        s = await db.settings.find_one({}) or {}
        rows = merge_live(base, s.get("social_links") or [])
        mode = "MERGE (§6 + live rows preserved)"
    active = [r for r in rows if r["active"]]
    print(f"Mode: {mode}")
    print(f"Prepared {len(rows)} social rows ({len(active)} active, {len(rows) - len(active)} inactive placeholders):")
    for r in rows:
        print(f"  [{'x' if r['active'] else ' '}] {r['platform']:<11} {r['url'] or '(no URL — placeholder)'}")
    if dry_run:
        print("\n--dry-run: nothing written.")
        return
    await db.settings.update_one({}, {"$set": {"social_links": rows}}, upsert=True)
    print(f"\nWrote settings.social_links to {DB_NAME}. Changes propagate to the KMS within 30s.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="preview without writing")
    ap.add_argument("--replace", action="store_true", help="write §6 verbatim (drops live extras)")
    args = ap.parse_args()
    asyncio.run(main(args.dry_run, args.replace))
