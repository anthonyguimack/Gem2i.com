"""Travel demo data for the GEM2i Magazine - Travel / Travel Calendar themes (2026-10-20).

Adds a place (city, country, lat/lng) to the KMS demo posts (gem2i_kms_demo) and
two sample month routes. Every write is tagged travel_sample="gem2i_travel_demo",
so --remove takes it all back (places unset, sample routes deleted).

  cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_kms_travel_demo.py          # load / refresh
  cd /opt/beta.gem2i.com && backend/venv/bin/python scripts/gem2i_kms_travel_demo.py --remove # undo
"""
import os
import sys
from datetime import datetime, timezone

from pymongo import MongoClient

TAG = "gem2i_travel_demo"

# demo post title (prefix) -> city, country, lat, lng
PLACES = {
    "Ultra Miami": ("Miami", "Estados Unidos", 25.7617, -80.1918),
    "Green Valley: una noche": ("Balneário Camboriú", "Brasil", -26.9906, -48.6348),
    "Ibiza 2027": ("Ibiza", "España", 38.9067, 1.4206),
    "Entrevista: Marco Carola": ("Ibiza", "España", 38.9530, 1.3730),
    "Eco Festival": ("Ljubljana", "Eslovenia", 46.0569, 14.5058),
    "Oasis Marrakech": ("Marrakech", "Marruecos", 31.6295, -7.9811),
    "Aftermovie: Papaya": ("Novalja", "Croacia", 44.5553, 14.8853),
    "EDC Las Vegas": ("Las Vegas", "Estados Unidos", 36.1716, -115.1391),
    "Echostage": ("Washington", "Estados Unidos", 38.9203, -76.9822),
    "Green Valley, el templo": ("Balneário Camboriú", "Brasil", -26.9800, -48.6200),
}

# month -> title, subtitle, [(title prefix, day, label)]
ROUTES = {
    "2026-10": ("La ruta de octubre", "Del Mediterráneo al norte de África, en orden.",
                [("Ibiza 2027", "03", "Ibiza"), ("Eco Festival", "10", "Ljubljana"),
                 ("Aftermovie: Papaya", "17", "Novalja"), ("Oasis Marrakech", "24", "Marrakech")]),
    "2026-11": ("La ruta de noviembre", "Tres paradas en América.",
                [("Echostage", "07", "Washington"), ("EDC Las Vegas", "14", "Las Vegas"),
                 ("Green Valley, el templo", "21", "Camboriú")]),
}


def find(db, prefix):
    return db.kms_posts.find_one({"sample": "gem2i_kms_demo", "title": {"$regex": "^" + prefix.replace("(", r"\(")}},
                                 {"id": 1})


def remove(db):
    r1 = db.kms_posts.update_many({"travel_sample": TAG}, {"$unset": {"place": "", "travel_sample": ""}})
    r2 = db.kms_travel_routes.delete_many({"sample": TAG})
    print(f"removed: places {r1.modified_count}, routes {r2.deleted_count}")


def main():
    db = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))[os.environ.get("DB_NAME", "gem2i_cms")]
    remove(db)
    if "--remove" in sys.argv:
        return
    n = 0
    for prefix, (city, country, lat, lng) in PLACES.items():
        p = find(db, prefix)
        if p:
            db.kms_posts.update_one({"id": p["id"]}, {"$set": {
                "place": {"city": city, "country": country, "lat": lat, "lng": lng}, "travel_sample": TAG}})
            n += 1
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    for month, (title, sub, stops) in ROUTES.items():
        if db.kms_travel_routes.find_one({"month": month, "sample": {"$ne": TAG}}):
            continue  # never overwrite a route an editor made
        items = []
        for prefix, day, label in stops:
            p = find(db, prefix)
            if p:
                items.append({"post_id": p["id"], "day": day, "label": label, "visible": True})
        db.kms_travel_routes.update_one({"month": month}, {"$set": {
            "month": month, "title": title, "subtitle": sub, "active": True, "stops": items,
            "sample": TAG, "updated_at": now}}, upsert=True)
    db.kms_travel_routes.create_index("month", unique=True)
    print(f"places set on {n} posts; routes {', '.join(ROUTES)}")


if __name__ == "__main__":
    main()
