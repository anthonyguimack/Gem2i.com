"""
Opportunities migration ETL — legacy acapitalgroup "Opportunity Development" -> Mongo.

Two data sets:

  * The 11-type catalog (Phase 0) — seeded verbatim, insert-only.
  * The real opportunities + sub-entities + assets (Phase 4, D2) — parsed from
    the acapital_production.sql dump; images / PFS / file attachments / type
    icons are NOT in any local download, so the LOAD step fetches them over
    HTTP from the live legacy site and re-hosts them under the AUX uploads dir.

NO geo import: the platform already ships a populated geo module
(`countries`/`states`/`cities`, uuid ids, served by membership.py /api/geo/*);
opportunities store those uuid ids. Legacy integer geo ids are resolved to
NAMES in the transform (from the dump's geo tables) and matched to platform
uuid ids in the load (country by ISO code, then state/city by name).

Modes
-----
  1) SEED TYPES (no dump needed):
       venv/bin/python scripts/opportunities_migrate.py --seed-types \
           --mongo mongodb://localhost:27017 --db carlosartiles_cms

  2) TRANSFORM (local, Anthony's machine — offline; no network, no mongo):
       python opportunities_migrate.py --sql acapital_production.sql \
           --out opportunities_bundle.json
     Emits {opportunity_types, opportunities, type_icons}. Junk/empty/deleted
     rows are excluded. Assets are left as legacy filenames for the loader.

  3) LOAD (carlos box — needs mongo + outbound HTTP to acapitalgroup.com):
       venv/bin/python scripts/opportunities_migrate.py --load bundle.json \
           [--asset-base https://acapitalgroup.com/my-account] [--dry-run]
     Resolves author/geo/team, fetches + re-hosts every asset, and upserts
     each opportunity by legacy_id (idempotent — re-runnable).

Mapping notes (verified against the dump + live server 2026-07-12):
  * status char: 1=published 2=pending_review 4=draft 7=archived D=deleted(skip)
  * author (id_member_create) -> platform member #1 (CA-1); legacy acapital
    member ids do not exist on carlos. Documented deviation for the walk-through.
  * our_team.id_membership -> platform member by membership_number (portable:
    resolves on acapital at rollout, drops on the carlos dev DB).
  * Files sub-entity attachments are stored in the legacy `opportunities_ppt`
    folder (the add handler reuses UploadOpportunitiesPpt).

Tracker: work-plans-MD/OPPORTUNITIES_MIGRATION_PLAN.md (D1-D10 ruled 2026-07-11).
"""
import argparse
import json
import os
import re
import sys
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from companies_migrate import parse_table  # shared dump parser (char-level)

UPLOAD_PREFIX = "/api/uploads/opportunities/"
TIMER_HOURS = (6, 12, 24, 36, 72)
SOCIAL_KEYS = ("facebook", "twitter", "linkedin", "google", "instagram")

# Legacy asset folders on the live site, relative to --asset-base.
IMG_DIR = "images_opportunities"          # image1..image5
PFS_DIR = "opportunities_pfs"             # master PFS doc
FILE_DIR = "opportunities_ppt"            # Files sub-entity attachments
ICON_DIR = "images_opportunities_default"  # per-type default icons

# type_id -> live default-icon basename (icon-<name>.png). Autos (11) has none.
TYPE_ICON = {
    1: "Event", 2: "Project", 3: "Production", 4: "Promotion", 5: "Artist",
    6: "Travel", 7: "Loan", 8: "Factoring", 9: "RealState", 10: "Others",
}

_SCRIPT_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _clean(v):
    return (v or "").strip()


def _clean_rich(html):
    return _SCRIPT_RE.sub("", (html or "").strip())


def _num(v):
    v = _clean(v)
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _date(v):
    """Legacy date -> 'YYYY-MM-DD' or None ('0000-00-00'/'' -> None)."""
    v = _clean(v)
    return None if (not v or v.startswith("0000-00-00")) else v[:10]


def _dt_iso(v):
    """Legacy datetime/date -> ISO8601 UTC string, or None."""
    v = _clean(v)
    if not v or v.startswith("0000-00-00"):
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(v, fmt).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return None


def _slugify(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "opportunity"


# ------------------------------------------------------------- type catalog
# Verbatim live data (dump `oportunities_type`, tracker §2.4).
TYPE_CATALOG = [
    (1, "Event"), (2, "Project Inc"), (3, "Productions Inc"),
    (4, "Promotion Inc"), (5, "Artist Inc"), (6, "Travel Inc"),
    (7, "Loan Inc"), (8, "Factoring Inc"), (9, "Real Estate Inc"),
    (10, "Others"), (11, "Autos"),
]


def build_types_from_catalog():
    now = _now()
    return [{
        "id": f"otype_{tid:04d}", "type_id": tid, "legacy_id": tid,
        "name": name, "default_image": None, "status": "active",
        "created_at": now, "updated_at": now,
    } for tid, name in TYPE_CATALOG]


# --------------------------------------------------------- opportunity transform
STATUS_MAP = {"1": "published", "2": "pending_review", "4": "draft", "7": "archived"}


def _geo_index(sql):
    countries = {r["id_country"]: r for r in parse_table(sql, "countries")}
    states = {r["id_state"]: r for r in parse_table(sql, "states")}
    cities = {r["id_city"]: r for r in parse_table(sql, "cities")}
    return countries, states, cities


def _sub_rows_by_opp(sql, table):
    out = {}
    for r in parse_table(sql, table):
        out.setdefault(r.get("id_opportunity"), []).append(r)
    return out


def _row(**kw):
    now = kw.pop("_created", None) or _now()
    mod = kw.pop("_modified", None) or now
    return {"id": f"row_{uuid.uuid4().hex[:10]}", **kw,
            "created_at": now, "modified_at": mod}


def _timer_hours(raw):
    m = re.search(r"\d+", raw or "")
    if not m:
        return None
    h = int(m.group())
    return h if h in TIMER_HOURS else None


def _funding_ends(show_mode, timer_hours, funding_end, published_at):
    if show_mode == "timer" and timer_hours and published_at:
        base = datetime.fromisoformat(published_at)
        return (base + timedelta(hours=timer_hours)).isoformat()
    return f"{funding_end}T23:59:59+00:00" if funding_end else None


def transform_opportunities(sql):
    countries, states, cities = _geo_index(sql)
    backers = _sub_rows_by_opp(sql, "oportunities_backers")
    services = _sub_rows_by_opp(sql, "oportunities_services")
    pledges = _sub_rows_by_opp(sql, "pledges")
    updates = _sub_rows_by_opp(sql, "oportunities_updates")
    files = _sub_rows_by_opp(sql, "oportunities_files")
    topics = _sub_rows_by_opp(sql, "oportunities_frequently_topic")
    questions = _sub_rows_by_opp(sql, "oportunities_frequently_questions")
    team = _sub_rows_by_opp(sql, "oportunities_our_team")

    docs, skipped = [], []
    for r in parse_table(sql, "oportunities"):
        oid = r.get("id_opportunity")
        name = _clean(r.get("name"))
        status = _clean(r.get("status"))
        has_content = (any(_clean(r.get(k)) for k in
                           ("image", "image2", "image3", "image4", "image5"))
                       or _clean(r.get("summary")) or _clean(r.get("description")))
        # Junk-row exclusion (plan §8): empty adds, deleted, and content-less test rows.
        if not name or r.get("id_member_create") in ("0", "", None) \
                or status in ("D", "") or not has_content:
            skipped.append((oid, name or "(empty)", status))
            continue

        aux_status = STATUS_MAP.get(status, "draft")
        show_mode = "timer" if _clean(r.get("opportunity_time")) else "all"
        timer_hours = _timer_hours(r.get("opportunity_time")) if show_mode == "timer" else None
        dates = {
            "launch": _date(r.get("launched_approved_date")),
            "funding_end": _date(r.get("funding_end_date")),
            "project": _date(r.get("project_date")),
            "reporting": _date(r.get("reporting_date")),
            "distribution": _date(r.get("distribution_date")),
        }
        published_at = funding_ends_at = None
        if aux_status == "published":
            published_at = (_dt_iso(r.get("launched_approved_date"))
                            or _dt_iso(r.get("create_date")) or _now())
            funding_ends_at = _funding_ends(show_mode, timer_hours,
                                            dates["funding_end"], published_at)

        # geo -> names (resolved to uuid ids at load)
        c = countries.get(_clean(r.get("country")), {})
        s = states.get(_clean(r.get("state")), {})
        ci = cities.get(_clean(r.get("city")), {})
        geo_hint = {
            "country_code": _clean(c.get("country")).upper() or None,
            "country_name": _clean(c.get("description")) or None,
            "state_name": _clean(s.get("state")) or None,
            "city_name": _clean(ci.get("city")) or None,
        }

        img_src = [_clean(r.get(k)) or None for k in
                   ("image", "image2", "image3", "image4", "image5")]

        doc = {
            "id": f"opp_{uuid.uuid4().hex[:12]}",
            "legacy_id": int(oid),
            "slug": _slugify(name),
            "type_id": int(r.get("id_type")) if _clean(r.get("id_type")) else None,
            "name": name,
            "country_id": None, "state_id": None, "city_id": None,
            "dates": dates,
            "total_amount": _num(r.get("total_amount")),
            "minimum_investment_amount": _num(r.get("minimum_investment_amount")),
            "summary": _clean_rich(r.get("summary")),
            "description": _clean_rich(r.get("description")),
            "images": [None] * 5,
            "video_url": _clean(r.get("video")) or None,
            "pfs_url": None,
            "contact_email": _clean(r.get("contact_email")) or None,
            "socials": {k: _clean(r.get(k)) or None for k in SOCIAL_KEYS},
            "show_mode": show_mode, "timer_hours": timer_hours,
            "status": aux_status, "bypass_approval": False,
            "published_at": published_at, "funding_ends_at": funding_ends_at,
            "files": _files_rows(files.get(oid, [])),
            "backers": _priced_rows(backers.get(oid, []), stock=True),
            "services": _priced_rows(services.get(oid, []), stock=True),
            "benefits": _pledge_rows(pledges.get(oid, [])),
            "updates": _update_rows(updates.get(oid, [])),
            "faq": _faq_tree(topics.get(oid, []), questions.get(oid, [])),
            "team": _team_rows(team.get(oid, [])),
            "reviews": [],
            "created_at": _dt_iso(r.get("create_date")) or _now(),
            "modified_at": _dt_iso(r.get("modify_date"))
                           or _dt_iso(r.get("create_date")) or _now(),
            # loader-only sidecars (stripped before insert)
            "_geo_hint": geo_hint,
            "_img_src": img_src,
            "_pfs_src": _clean(r.get("pfs")) or None,
        }
        docs.append(doc)
    return docs, skipped


def _priced_rows(rows, stock=False):
    out = []
    for r in rows:
        title = _clean(r.get("title"))
        if not title:
            continue
        row = {"title": title, "price": _num(r.get("price")),
               "description": _clean_rich(r.get("description"))}
        if stock:
            row["stock"] = _num(r.get("stock"))
        out.append(_row(_created=_dt_iso(r.get("create_date")),
                        _modified=_dt_iso(r.get("modify_date")), **row))
    return out


def _pledge_rows(rows):
    out = []
    for r in rows:
        title = _clean(r.get("pledge"))
        if not title:
            continue
        out.append(_row(_created=_dt_iso(r.get("create_date")),
                        _modified=_dt_iso(r.get("modify_date")),
                        title=title, price=_num(r.get("price")),
                        description=_clean_rich(r.get("description"))))
    return out


def _update_rows(rows):
    out = []
    for r in rows:
        title = _clean(r.get("title"))
        if not title:
            continue
        out.append(_row(_created=_dt_iso(r.get("create_date")),
                        _modified=_dt_iso(r.get("modify_date")),
                        title=title, description=_clean_rich(r.get("description"))))
    return out


def _files_rows(rows):
    out = []
    for r in rows:
        title = _clean(r.get("title_file"))
        src = _clean(r.get("file"))
        if not title and not src:
            continue
        perm = "Yes" if _clean(r.get("permission")).lower().startswith("y") else "No"
        members = "All" if _clean(r.get("members")).lower().startswith("all") \
            else "Only_Fund_it"
        out.append(_row(title=title, url=None, permission=perm, members=members,
                        _src=src or None))
    return out


def _faq_tree(topic_rows, question_rows):
    faq, by_topic = [], {}
    for t in topic_rows:
        tid = _clean(t.get("id_topic"))
        topic = _clean(t.get("topic"))
        if not topic:
            continue
        node = {"topic_id": f"faqt_{uuid.uuid4().hex[:10]}", "topic": topic,
                "questions": []}
        by_topic[tid] = node
        faq.append(node)
    for q in question_rows:
        title = _clean(q.get("title"))
        node = by_topic.get(_clean(q.get("id_topic")))
        if not title or node is None:  # orphan/empty questions (legacy junk) dropped
            continue
        node["questions"].append({
            "id": f"faqq_{uuid.uuid4().hex[:10]}", "title": title,
            "description": _clean_rich(q.get("description")),
            "created_at": _dt_iso(q.get("create_date")) or _now(),
            "modified_at": _dt_iso(q.get("modify_date")) or _now(),
        })
    # drop topics that ended up with no real questions
    return [t for t in faq if t["questions"]]


def _team_rows(rows):
    out, seen = [], set()
    for r in rows:
        mnum = _clean(r.get("id_membership"))
        if not mnum or mnum in seen:
            continue
        seen.add(mnum)
        out.append({"member_id": None, "role": _clean(r.get("role")),
                    "_legacy_mnum": mnum})
    return out


# ------------------------------------------------------------------- load
def _mongo_db(mongo_url, db_name):
    from pymongo import MongoClient
    return MongoClient(mongo_url)[db_name]


def upsert_types(db, types):
    inserted = 0
    for doc in types:
        if not db.opportunity_types.find_one({"type_id": doc["type_id"]}):
            db.opportunity_types.insert_one(doc)
            inserted += 1
    db.opportunity_types.create_index("type_id", unique=True)
    print(f"opportunity_types: {inserted} inserted, "
          f"{db.opportunity_types.count_documents({})} total")


def _fetch(url, timeout=30, tries=3):
    import urllib.request
    import urllib.error
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AUX-Importer/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            last = e
        except Exception as e:  # noqa: BLE001 - network flakiness, retry
            last = e
    if last:
        print(f"    ! fetch failed {url}: {last}")
    return None


def _rehost(uploads_dir, url, dry_run):
    """Fetch a legacy asset and save it under uploads/opportunities/ with a
    uuid name; return the public UPLOAD_PREFIX url (None if missing)."""
    if dry_run:
        data = b"" if _head_ok(url) else None
        if data is None:
            return None
        ext = url.rsplit(".", 1)[-1].lower()
        return f"{UPLOAD_PREFIX}<uuid>.{ext}  (dry-run, source ok: {url})"
    data = _fetch(url)
    if not data:
        return None
    ext = url.rsplit(".", 1)[-1].lower()
    name = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(uploads_dir, exist_ok=True)
    with open(os.path.join(uploads_dir, name), "wb") as f:
        f.write(data)
    return UPLOAD_PREFIX + name


def _head_ok(url):
    import urllib.request
    import urllib.error
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": "AUX-Importer/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except Exception:  # noqa: BLE001
        return False


def _resolve_geo(db, hint):
    cid = sid = ci = None
    code = (hint.get("country_code") or "").upper()
    name = hint.get("country_name")
    country = None
    if code:
        country = db.countries.find_one({"code": code})
    if not country and name:
        country = db.countries.find_one(
            {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if country:
        cid = country["id"]
        if hint.get("state_name"):
            state = db.states.find_one(
                {"country_id": cid,
                 "name": {"$regex": f"^{re.escape(hint['state_name'])}$",
                          "$options": "i"}})
            if state:
                sid = state["id"]
                if hint.get("city_name"):
                    city = db.cities.find_one(
                        {"state_id": sid,
                         "name": {"$regex": f"^{re.escape(hint['city_name'])}$",
                                  "$options": "i"}})
                    if city:
                        ci = city["id"]
    return cid, sid, ci


def _unique_slug(db, base, legacy_id):
    slug, n = base, 2
    while True:
        hit = db.opportunities.find_one({"slug": slug, "legacy_id": {"$ne": legacy_id}},
                                        {"_id": 1})
        if not hit:
            return slug
        slug, n = f"{base}-{n}", n + 1


def load_opportunities(db, docs, asset_base, uploads_dir, dry_run):
    author = (db.members.find_one({"membership_number": 1})
              or db.members.find_one({"role": "admin"}))
    if not author:
        print("FATAL: no author member (#1 / admin) found on this DB")
        sys.exit(1)
    author_id = author["member_id"]
    print(f"author -> {author_id} ({author.get('first_name')} {author.get('last_name')})")

    img_base = f"{asset_base}/{IMG_DIR}"
    pfs_base = f"{asset_base}/{PFS_DIR}"
    file_base = f"{asset_base}/{FILE_DIR}"
    n_assets = 0

    for doc in docs:
        doc = dict(doc)
        legacy_id = doc["legacy_id"]
        geo_hint = doc.pop("_geo_hint", {})
        img_src = doc.pop("_img_src", [None] * 5)
        pfs_src = doc.pop("_pfs_src", None)

        doc["created_by"] = author_id
        doc["slug"] = _unique_slug(db, doc["slug"], legacy_id)
        doc["country_id"], doc["state_id"], doc["city_id"] = _resolve_geo(db, geo_hint)

        images = [None] * 5
        for i, fn in enumerate(img_src):
            if fn:
                url = _rehost(uploads_dir, f"{img_base}/{fn}", dry_run)
                images[i] = url
                n_assets += bool(url)
        doc["images"] = images
        if pfs_src:
            doc["pfs_url"] = _rehost(uploads_dir, f"{pfs_base}/{pfs_src}", dry_run)
            n_assets += bool(doc["pfs_url"])

        for f in doc.get("files", []):
            src = f.pop("_src", None)
            if src:
                f["url"] = _rehost(uploads_dir, f"{file_base}/{src}", dry_run)
                n_assets += bool(f["url"])

        resolved_team, dropped = [], 0
        for t in doc.get("team", []):
            mnum = t.pop("_legacy_mnum", None)
            m = db.members.find_one({"membership_number": int(mnum)}) if mnum \
                and mnum.isdigit() else None
            if m:
                resolved_team.append({"member_id": m["member_id"], "role": t["role"]})
            else:
                dropped += 1
        doc["team"] = resolved_team

        summary = (f"legacy #{legacy_id} -> {doc['status']:<14} "
                   f"imgs={sum(1 for x in images if x)} pfs={'Y' if doc['pfs_url'] else '-'} "
                   f"files={len(doc.get('files', []))} backers={len(doc.get('backers', []))} "
                   f"benefits={len(doc.get('benefits', []))} updates={len(doc.get('updates', []))} "
                   f"faq={sum(len(t['questions']) for t in doc.get('faq', []))}q "
                   f"team={len(resolved_team)}(+{dropped} dropped) "
                   f"geo={'/'.join(x for x in (doc['country_id'], doc['state_id'], doc['city_id']) if x) or '-'}")
        print(f"  {doc['slug']:<42} {summary}")

        if not dry_run:
            db.opportunities.delete_many({"legacy_id": legacy_id})
            db.opportunities.insert_one(doc)

    print(f"\n{'DRY-RUN — ' if dry_run else ''}{len(docs)} opportunities, "
          f"{n_assets} assets {'verified' if dry_run else 're-hosted'}")


def load_type_icons(db, type_icons, asset_base, uploads_dir, dry_run):
    icon_base = f"{asset_base}/{ICON_DIR}"
    n = 0
    for type_id_str, basename in (type_icons or {}).items():
        url = _rehost(uploads_dir, f"{icon_base}/icon-{basename}.png", dry_run)
        if url:
            n += 1
            if not dry_run:
                db.opportunity_types.update_one(
                    {"type_id": int(type_id_str)},
                    {"$set": {"default_image": url, "updated_at": _now()}})
    print(f"type icons: {n} {'verified' if dry_run else 're-hosted + set'}")


# ------------------------------------------------------------- entrypoint
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql", help="path to acapital_production.sql (transform mode)")
    ap.add_argument("--out", default="opportunities_bundle.json")
    ap.add_argument("--load", help="path to a transform bundle (load mode)")
    ap.add_argument("--seed-types", action="store_true",
                    help="seed the 11-type catalog directly (no dump needed)")
    ap.add_argument("--asset-base", default="https://acapitalgroup.com/my-account",
                    help="live legacy base holding the opportunity asset folders")
    ap.add_argument("--uploads-dir", default=str(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                     "uploads", "opportunities")))
    ap.add_argument("--dry-run", action="store_true",
                    help="load mode: resolve + verify assets, write nothing")
    ap.add_argument("--mongo", default="mongodb://localhost:27017")
    ap.add_argument("--db", default="carlosartiles_cms")
    args = ap.parse_args()

    if args.seed_types:
        upsert_types(_mongo_db(args.mongo, args.db), build_types_from_catalog())
        return

    if args.load:
        with open(args.load, encoding="utf-8") as f:
            bundle = json.load(f)
        db = _mongo_db(args.mongo, args.db)
        if bundle.get("opportunity_types"):
            upsert_types(db, bundle["opportunity_types"])
        if bundle.get("opportunities"):
            load_opportunities(db, bundle["opportunities"], args.asset_base,
                               args.uploads_dir, args.dry_run)
        load_type_icons(db, bundle.get("type_icons"), args.asset_base,
                        args.uploads_dir, args.dry_run)
        return

    if not args.sql:
        ap.error("provide --sql (transform), --load (load) or --seed-types")

    with open(args.sql, encoding="utf-8", errors="replace") as f:
        sql_text = f.read()

    types = build_types_from_catalog()
    opportunities, skipped = transform_opportunities(sql_text)
    bundle = {
        "opportunity_types": types,
        "opportunities": opportunities,
        "type_icons": {str(k): v for k, v in TYPE_ICON.items()},
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=1)
    print(f"types: {len(types)}  opportunities: {len(opportunities)}  "
          f"skipped: {len(skipped)} -> {args.out}")
    for oid, name, st in skipped:
        print(f"  skip #{oid} status={st!r} {name[:40]}")


if __name__ == "__main__":
    main()
