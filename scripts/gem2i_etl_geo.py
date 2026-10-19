"""Stage 1 (local): legacy gem2ica countries/states/cities → geo JSONL.

Reads the MySQL dump (countries2 251 · states ~1.2k · cities ~61k) and writes
scripts/out/geo_{countries,states,cities}.jsonl for gem2i_load_geo.py.
IDs follow the CMS-core geo convention: country = ISO2 lower ("us"),
state = "<iso>_s<legacy_id>", city = "<state_id>_c<legacy_id>"; the loader
keeps any existing doc with the same name (so "us_ca" etc. survive).

  python -I scripts/gem2i_etl_geo.py <path-to-gem2ica_production.sql>
"""
import json
import os
import re
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def tuples(sql: str, table: str):
    """Yield value tuples from every INSERT INTO `table` VALUES (...),(...);"""
    for m in re.finditer(r"INSERT INTO `%s` VALUES (.*?);\n" % re.escape(table), sql, re.S):
        body, i, n = m.group(1), 0, len(m.group(1))
        while i < n:
            if body[i] != "(":
                i += 1
                continue
            i += 1
            row, cur, quoted = [], "", False
            while i < n:
                ch = body[i]
                if quoted:
                    if ch == "\\" and i + 1 < n:
                        cur += {"n": "\n", "r": "", "t": "\t", "0": ""}.get(body[i + 1], body[i + 1])
                        i += 2
                        continue
                    if ch == "'":
                        quoted = False
                    else:
                        cur += ch
                elif ch == "'":
                    quoted = True
                elif ch == ",":
                    row.append(cur); cur = ""
                elif ch == ")":
                    row.append(cur); i += 1
                    break
                else:
                    cur += ch
                i += 1
            yield [None if v == "NULL" else v.strip() if isinstance(v, str) else v for v in row]


def fix(text):
    """Repair UTF-8 bytes that were stored through a latin1 table."""
    if not text:
        return text
    try:
        return text.encode("latin1").decode("utf8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def main(path):
    with open(path, encoding="utf8", errors="replace") as fh:
        sql = fh.read()
    os.makedirs(OUT, exist_ok=True)
    countries, states, n_cities = {}, {}, 0
    with open(os.path.join(OUT, "geo_countries.jsonl"), "w", encoding="utf8") as f:
        # countries2 is the table states.id_country points at (catalog ETL uses it too).
        for cid, iso, name, _cont in tuples(sql, "countries2"):
            if not iso or not name:
                continue
            countries[cid] = iso.lower()
            f.write(json.dumps({"id": iso.lower(), "name": fix(name), "code": iso.upper(), "legacy_id": int(cid)}, ensure_ascii=False) + "\n")
    with open(os.path.join(OUT, "geo_states.jsonl"), "w", encoding="utf8") as f:
        for sid, cid, name in tuples(sql, "states"):
            if cid not in countries or not name:
                continue
            states[sid] = f"{countries[cid]}_s{sid}"
            f.write(json.dumps({"id": states[sid], "name": fix(name), "country_id": countries[cid], "legacy_id": int(sid)}, ensure_ascii=False) + "\n")
    seen = set()
    with open(os.path.join(OUT, "geo_cities.jsonl"), "w", encoding="utf8") as f:
        for cid, sid, name in tuples(sql, "cities"):
            name = fix(name)
            if sid not in states or not name or (sid, name.lower()) in seen:
                continue
            seen.add((sid, name.lower()))
            f.write(json.dumps({"id": f"{states[sid]}_c{cid}", "name": name, "state_id": states[sid], "legacy_id": int(cid)}, ensure_ascii=False) + "\n")
            n_cities += 1
    print(f"countries {len(countries)} / states {len(states)} / cities {n_cities} -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
