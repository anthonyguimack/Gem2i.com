"""
Companies migration ETL — legacy acapitalgroup.com "My Companies" -> Mongo.

Two modes:

  1) TRANSFORM (run anywhere, no DB needed) — parse the phpMyAdmin SQL dump,
     extract portfolio_companies / _sector / _industries / _news, build the
     Mongo-shaped docs and write them to a JSON bundle + print a dry-run report:

       python companies_migrate.py --sql acapital_production.sql \
           --images-dir /path/to/images_companies --out companies_data.json

  2) LOAD (run on the carlos box) — upsert the JSON bundle into Mongo.
     Idempotent: keyed on legacy_id, rerun = update in place.

       venv/bin/python scripts/companies_migrate.py --load companies_data.json \
           --mongo mongodb://localhost:27017 --db carlosartiles_cms

Tracker: work-plans-MD/COMPANIES_MIGRATION_PLAN.md (D1-D8 ruled 2026-07-11).
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone

UPLOADS_PREFIX = "/api/uploads/companies/"

# ---------------------------------------------------------------- SQL parsing

def _split_tuples(values_blob):
    """Split the VALUES blob of an INSERT into row tuples (char-level parser,
    newline-agnostic, handles \\' escapes and quoted parens)."""
    rows, depth, in_str, esc, cur = [], 0, False, False, []
    for ch in values_blob:
        if in_str:
            cur.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == "'":
                in_str = False
            continue
        if ch == "'":
            in_str = True
            cur.append(ch)
        elif ch == "(":
            depth += 1
            if depth == 1:
                cur = []
            else:
                cur.append(ch)
        elif ch == ")":
            depth -= 1
            if depth == 0:
                rows.append("".join(cur))
            else:
                cur.append(ch)
        elif depth >= 1:
            cur.append(ch)
    return rows


def _split_fields(row):
    """Split one row tuple into raw field strings (respects quotes).

    Escape sequences are PRESERVED verbatim (backslash included) so that
    _unescape() can map them — stripping the backslash here would turn
    \\r\\n into literal "rn" text."""
    fields, in_str, esc, cur = [], False, False, []
    for ch in row:
        if in_str:
            if esc:
                cur.append(ch)
                esc = False
            elif ch == "\\":
                cur.append(ch)
                esc = True
            elif ch == "'":
                in_str = False
            else:
                cur.append(ch)
            continue
        if ch == "'":
            in_str = True
        elif ch == ",":
            fields.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    fields.append("".join(cur))
    return fields


_MYSQL_ESCAPES = {"n": "\n", "r": "\r", "t": "\t", "0": "\0", "Z": "\x1a"}


def _unescape(raw):
    raw = raw.strip()
    if raw.upper() == "NULL":
        return None
    out, i, n = [], 0, len(raw)
    while i < n:
        ch = raw[i]
        if ch == "\\" and i + 1 < n:
            nxt = raw[i + 1]
            out.append(_MYSQL_ESCAPES.get(nxt, nxt))
            i += 2
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def parse_table(sql_text, table):
    """Return list[dict] for every INSERT INTO `table` (...) VALUES ...; block."""
    docs = []
    pattern = re.compile(
        r"INSERT INTO `" + re.escape(table) + r"`\s*\(([^)]+)\)\s*VALUES\s*(.*?);\s*\n",
        re.S,
    )
    for m in pattern.finditer(sql_text):
        cols = [c.strip().strip("`") for c in m.group(1).split(",")]
        for row in _split_tuples(m.group(2)):
            vals = _split_fields(row)
            if len(vals) != len(cols):
                raise ValueError(
                    f"{table}: field count mismatch ({len(vals)} vs {len(cols)}): {row[:120]}"
                )
            docs.append({c: _unescape(v) for c, v in zip(cols, vals)})
    return docs

# ---------------------------------------------------------------- transforms

def _slugify(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "company"


def _clean_date(v):
    if not v or v.startswith("0000-00-00"):
        return None
    return v[:10]


def _clean(v):
    return (v or "").strip()


def _clean_url(v):
    v = (v or "").strip()
    return v if v and v not in ("#", "http://", "https://") else None


_SCRIPT_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)
_IMGREF_RE = re.compile(
    r"(?:\.\./)+images_companies/|https?://(?:www\.)?acapitalgroup\.com/images_companies/",
    re.I,
)


def _clean_description(html):
    html = (html or "").strip()
    if not html:
        return ""
    html = _SCRIPT_RE.sub("", html)
    html = _IMGREF_RE.sub(UPLOADS_PREFIX, html)
    return html


def _image_path(filename):
    filename = (filename or "").strip()
    return (UPLOADS_PREFIX + filename) if filename else None


def transform(companies_raw, news_raw, sectors_raw, industries_raw, images_dir=None):
    now = datetime.now(timezone.utc).isoformat()
    image_files = set()
    if images_dir and os.path.isdir(images_dir):
        image_files = set(os.listdir(images_dir))

    active = [
        r for r in companies_raw
        if r.get("status") == "A" and (r.get("security") or "").strip() != "Cash"
    ]

    slugs, companies, missing_images = {}, [], []
    for r in sorted(active, key=lambda x: int(x["id_portolio_companies"])):
        legacy_id = int(r["id_portolio_companies"])
        symbol = (r.get("symbol") or "").strip()
        name = (r.get("security") or "").strip()
        base = _slugify(symbol) if symbol else _slugify(name)
        slug, n = base, 2
        while slug in slugs:
            slug, n = f"{base}-{n}", n + 1
        slugs[slug] = legacy_id

        indexes = [s.strip() for s in (r.get("indexs") or "").split(",") if s.strip()]
        socials = {
            k: _clean_url(r.get(k))
            for k in ("facebook", "twitter", "linkedin", "instagram", "youtube")
            if _clean_url(r.get(k))
        }

        for field in ("image_detail", "logo_on", "logo_off"):
            fn = (r.get(field) or "").strip()
            if fn and image_files and fn not in image_files:
                missing_images.append((slug, field, fn))

        companies.append({
            "id": f"comp_{legacy_id:06d}",
            "legacy_id": legacy_id,
            "slug": slug,
            "symbol": symbol,
            "name": name,
            "sector": (r.get("sector") or "").strip(),
            "industry": (r.get("industry") or "").strip(),
            "indexes": indexes,
            "description": _clean_description(r.get("description")),
            "link_sec": _clean_url(r.get("link")),
            "link_company": _clean_url(r.get("link_company")),
            # Company Information extra fields (Phase 5, companies_edit.php parity)
            "ceo": _clean(r.get("ceo")),
            "edgar_cik": _clean(r.get("link_edgar_cik")),
            "investor_url": _clean_url(r.get("investor_link_company")),
            "ipo_date": _clean_date(r.get("ipodate")),
            "address": _clean(r.get("address")),
            "country": _clean(r.get("country")),
            "state": _clean(r.get("state")),
            "city": _clean(r.get("city")),
            "zip": _clean(r.get("zip")),
            "phone": _clean(r.get("phone")),
            "socials": socials,
            "image_detail": _image_path(r.get("image_detail")),
            "logo_on": _image_path(r.get("logo_on")),
            "logo_off": _image_path(r.get("logo_off")),
            "dates": {
                "launched": _clean_date(r.get("launched_approved_date")),
                "funding_end": _clean_date(r.get("funding_end_date")),
                "project": _clean_date(r.get("project_date")),
                "reporting": _clean_date(r.get("reporting_date")),
                "distribution": _clean_date(r.get("distribution_date")),
            },
            "status": "active",
            "order_name": name.lower(),
            "created_at": now,
            "updated_at": now,
        })

    by_legacy = {c["legacy_id"]: c for c in companies}
    # ~95% of legacy news rows carry id_portolio_companies=0 but a valid symbol
    # (invisible on the legacy page, which joined by id only) — recover them.
    by_symbol = {c["symbol"].upper(): c for c in companies if c["symbol"]}
    news = []
    for r in news_raw:
        cid = int(r.get("id_portolio_companies") or 0)
        parent = by_legacy.get(cid) or by_symbol.get((r.get("symbol") or "").strip().upper())
        if not parent:
            continue  # news for inactive/Cash rows dropped with their company
        news.append({
            "id": f"conews_{int(r['id_pc_news']):08d}",
            "legacy_id": int(r["id_pc_news"]),
            "company_id": parent["id"],
            "title": (r.get("title") or "").strip(),
            "url": _clean_url(r.get("url")),
            "site": (r.get("site") or "").strip(),
            "image": _clean_url(r.get("image")),
            "description": (r.get("description") or "").strip(),
            "published_date": None if (r.get("published_date") or "").startswith("0000")
                              else (r.get("published_date") or "")[:19] or None,
            "status": r.get("status") or "A",
            "created_at": now,
        })

    # taxonomy is aggregation-on-read; parsed here only for the validation report
    dump_sectors = {(s.get("sector") or "").strip() for s in sectors_raw if s.get("status") == "A"}
    doc_sectors = {c["sector"] for c in companies if c["sector"]}
    dump_industries = {(i.get("industry") or "").strip() for i in industries_raw}
    doc_industries = {c["industry"] for c in companies if c["industry"]}

    report = {
        "companies_total_rows": len(companies_raw),
        "companies_active": len(companies),
        "companies_skipped": len(companies_raw) - len(active),
        "with_photo": sum(1 for c in companies if c["image_detail"]),
        "with_logo_on": sum(1 for c in companies if c["logo_on"]),
        "with_description": sum(1 for c in companies if c["description"]),
        "with_ceo": sum(1 for c in companies if c["ceo"]),
        "with_city": sum(1 for c in companies if c["city"]),
        "news_total_rows": len(news_raw),
        "news_migrated": len(news),
        "sectors_in_docs_not_in_dump_taxonomy": sorted(doc_sectors - dump_sectors),
        "industries_in_docs_not_in_dump_taxonomy": sorted(doc_industries - dump_industries),
        "missing_image_files": missing_images[:40],
        "missing_image_count": len(missing_images),
        "slug_sample": sorted(slugs)[:10],
    }
    return companies, news, report


def _tax_status(v):
    return "active" if (v or "").strip().upper() == "A" else "inactive"


def build_taxonomy(sectors_raw, industries_raw):
    """Sector -> Industry managed vocabularies (portfolio_companies_sector /
    _industries). Companies still store sector/industry as name strings; these
    collections drive the cascading dropdowns + CRUD."""
    now = datetime.now(timezone.utc).isoformat()
    sectors, sec_by_legacy = [], {}
    for r in sorted(sectors_raw, key=lambda x: int(x["id_sector"])):
        legacy_id = int(r["id_sector"])
        name = _clean(r.get("sector"))
        sec_by_legacy[legacy_id] = name
        sectors.append({
            "id": f"csec_{legacy_id:04d}",
            "legacy_id": legacy_id,
            "name": name,
            "status": _tax_status(r.get("status")),
            "order_name": name.lower(),
            "created_at": now, "updated_at": now,
        })
    industries = []
    for r in sorted(industries_raw, key=lambda x: int(x["id_industry"])):
        legacy_id = int(r["id_industry"])
        sec_legacy = int(r.get("id_sector") or 0)
        name = _clean(r.get("industry"))
        industries.append({
            "id": f"cind_{legacy_id:04d}",
            "legacy_id": legacy_id,
            "sector_legacy_id": sec_legacy,
            "sector_name": sec_by_legacy.get(sec_legacy, ""),
            "name": name,
            "pe": _clean(r.get("pe")) or None,
            "status": _tax_status(r.get("status")),
            "order_name": name.lower(),
            "created_at": now, "updated_at": now,
        })
    return sectors, industries

# ---------------------------------------------------------------- load (box)

def load(bundle_path, mongo_url, db_name):
    from pymongo import MongoClient, ASCENDING, DESCENDING

    with open(bundle_path, encoding="utf-8") as f:
        bundle = json.load(f)
    db = MongoClient(mongo_url)[db_name]

    # NOTE: collection is companies_directory, NOT `companies` — that name is
    # taken by the My Account Portfolios symbol-picker seed (routes/membership.py).
    for c in bundle["companies"]:
        db.companies_directory.update_one(
            {"legacy_id": c["legacy_id"]},
            {"$set": {k: v for k, v in c.items() if k != "created_at"},
             "$setOnInsert": {"created_at": c["created_at"]}},
            upsert=True,
        )
    for n in bundle["company_news"]:
        db.company_news.update_one(
            {"legacy_id": n["legacy_id"]},
            {"$set": {k: v for k, v in n.items() if k != "created_at"},
             "$setOnInsert": {"created_at": n["created_at"]}},
            upsert=True,
        )
    # Taxonomy (Phase 5) — only touch legacy-sourced rows (legacy_id set), so
    # admin-created sectors/industries survive a re-load.
    for s in bundle.get("company_sectors", []):
        db.company_sectors.update_one(
            {"legacy_id": s["legacy_id"]},
            {"$set": {k: v for k, v in s.items() if k != "created_at"},
             "$setOnInsert": {"created_at": s["created_at"]}},
            upsert=True,
        )
    for i in bundle.get("company_industries", []):
        db.company_industries.update_one(
            {"legacy_id": i["legacy_id"]},
            {"$set": {k: v for k, v in i.items() if k != "created_at"},
             "$setOnInsert": {"created_at": i["created_at"]}},
            upsert=True,
        )

    db.companies_directory.create_index("slug", unique=True)
    db.companies_directory.create_index("legacy_id")
    db.companies_directory.create_index([("status", ASCENDING), ("order_name", ASCENDING)])
    db.companies_directory.create_index("sector")
    db.companies_directory.create_index("industry")
    db.company_news.create_index([("company_id", ASCENDING), ("published_date", DESCENDING)])
    db.company_sectors.create_index([("status", ASCENDING), ("order_name", ASCENDING)])
    db.company_industries.create_index([("sector_name", ASCENDING), ("order_name", ASCENDING)])

    print(f"companies_directory: {db.companies_directory.count_documents({})} docs")
    print(f"company_news: {db.company_news.count_documents({})} docs")
    print(f"company_sectors: {db.company_sectors.count_documents({})} docs")
    print(f"company_industries: {db.company_industries.count_documents({})} docs")

# ---------------------------------------------------------------- entrypoint

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql", help="path to acapital_production.sql (transform mode)")
    ap.add_argument("--images-dir", help="local images_companies folder for coverage check")
    ap.add_argument("--out", default="companies_data.json")
    ap.add_argument("--load", help="path to companies_data.json (load mode)")
    ap.add_argument("--mongo", default="mongodb://localhost:27017")
    ap.add_argument("--db", default="carlosartiles_cms")
    args = ap.parse_args()

    if args.load:
        load(args.load, args.mongo, args.db)
        return

    if not args.sql:
        ap.error("provide --sql (transform) or --load (load)")

    with open(args.sql, encoding="utf-8", errors="replace") as f:
        sql_text = f.read()

    companies_raw = parse_table(sql_text, "portfolio_companies")
    sectors_raw = parse_table(sql_text, "portfolio_companies_sector")
    industries_raw = parse_table(sql_text, "portfolio_companies_industries")
    news_raw = parse_table(sql_text, "portfolio_companies_news")

    companies, news, report = transform(
        companies_raw, news_raw, sectors_raw, industries_raw, args.images_dir
    )
    sectors, industries = build_taxonomy(sectors_raw, industries_raw)
    report["sectors_migrated"] = len(sectors)
    report["industries_migrated"] = len(industries)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"companies": companies, "company_news": news,
                   "company_sectors": sectors, "company_industries": industries},
                  f, ensure_ascii=False)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nwrote {args.out} ({os.path.getsize(args.out)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
