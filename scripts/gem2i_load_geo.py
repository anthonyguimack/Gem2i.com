"""Stage 2 (box): geo JSONL → countries / states / cities (CMS-core geo).

Idempotent. A row whose name already exists (same country / same state) keeps
the existing doc and id — members and catalogs that reference "us", "us_ca"…
keep working; only the missing ones are inserted.

  cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_load_geo.py scripts/out
"""
import json
import os
import sys

from pymongo import MongoClient, InsertOne


def rows(folder, name):
    with open(os.path.join(folder, f"geo_{name}.jsonl"), encoding="utf8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def main(folder):
    db = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))[os.environ.get("DB_NAME", "gem2i_cms")]
    key = lambda s: (s or "").strip().lower()

    # countries — by name, else by ISO id
    have = {key(c["name"]): c["id"] for c in db.countries.find({}, {"_id": 0, "id": 1, "name": 1})}
    ids = set(have.values())
    cmap, ops = {}, []
    for c in rows(folder, "countries"):
        if key(c["name"]) in have:
            cmap[c["id"]] = have[key(c["name"])]
        elif c["id"] in ids:
            cmap[c["id"]] = c["id"]
        else:
            cmap[c["id"]] = c["id"]; ids.add(c["id"]); ops.append(InsertOne({**c, "source": "gem2i_legacy"}))
    if ops: db.countries.bulk_write(ops)
    print("countries +", len(ops))

    # states — by (country, name)
    have = {(s["country_id"], key(s["name"])): s["id"] for s in db.states.find({}, {"_id": 0, "id": 1, "name": 1, "country_id": 1})}
    smap, ops = {}, []
    for s in rows(folder, "states"):
        cid = cmap.get(s["country_id"], s["country_id"])
        k = (cid, key(s["name"]))
        if k in have:
            smap[s["id"]] = have[k]
        else:
            smap[s["id"]] = s["id"]; have[k] = s["id"]
            ops.append(InsertOne({**s, "country_id": cid, "source": "gem2i_legacy"}))
    if ops: db.states.bulk_write(ops)
    print("states +", len(ops))

    # cities — by (state, name)
    have = {(c["state_id"], key(c["name"])) for c in db.cities.find({}, {"_id": 0, "name": 1, "state_id": 1})}
    ops = []
    for c in rows(folder, "cities"):
        sid = smap.get(c["state_id"], c["state_id"])
        if (sid, key(c["name"])) in have:
            continue
        have.add((sid, key(c["name"])))
        ops.append(InsertOne({**c, "state_id": sid, "source": "gem2i_legacy"}))
        if len(ops) >= 5000:
            db.cities.bulk_write(ops); print("cities + 5000"); ops = []
    if ops: db.cities.bulk_write(ops)
    print("cities + rest", len(ops))

    for coll, fields in (("countries", ["name"]), ("states", ["country_id", "name"]), ("cities", ["state_id", "name"])):
        db[coll].create_index([(f, 1) for f in fields])
    print("totals:", db.countries.count_documents({}), db.states.count_documents({}), db.cities.count_documents({}))


if __name__ == "__main__":
    main(sys.argv[1])
