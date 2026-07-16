"""Populate countries, states/subdivisions, and cities with real-world data."""
import asyncio, uuid
import pycountry
import geonamescache
from models.database import db

gc = geonamescache.GeonamesCache()

async def populate_geo():
    # Check if already populated with real data
    count = await db.countries.count_documents({})
    if count > 200:
        print(f"Already have {count} countries, skipping geo population.")
        return

    # Clear test data
    await db.countries.delete_many({})
    await db.states.delete_many({})
    await db.cities.delete_many({})

    # 1. Insert countries
    country_map = {}  # alpha2 -> doc id
    countries_docs = []
    for c in sorted(pycountry.countries, key=lambda x: x.name):
        doc_id = str(uuid.uuid4())
        country_map[c.alpha_2] = doc_id
        countries_docs.append({
            "id": doc_id,
            "name": c.name,
            "code": c.alpha_2,
            "alpha3": getattr(c, 'alpha_3', ''),
        })
    if countries_docs:
        await db.countries.insert_many(countries_docs)
    print(f"Inserted {len(countries_docs)} countries")

    # 2. Insert states/subdivisions
    state_map = {}  # subdivision code -> doc id
    states_docs = []
    for s in sorted(pycountry.subdivisions, key=lambda x: x.name):
        cc = s.country_code
        if cc not in country_map:
            continue
        doc_id = str(uuid.uuid4())
        state_map[s.code] = doc_id
        states_docs.append({
            "id": doc_id,
            "name": s.name,
            "code": s.code,
            "country_id": country_map[cc],
            "country_code": cc,
        })
    # Batch insert
    if states_docs:
        for i in range(0, len(states_docs), 500):
            await db.states.insert_many(states_docs[i:i+500])
    print(f"Inserted {len(states_docs)} states/subdivisions")

    # 3. Insert cities (from geonamescache - ~32k cities with population > 15000)
    gc_cities = gc.get_cities()
    cities_docs = []
    # Build a lookup for admin1code -> state doc id
    # geonamescache uses countrycode + admin1code
    admin1_lookup = {}
    for s_doc in states_docs:
        # pycountry subdivision code format: "CC-XX"
        admin1_lookup[(s_doc["country_code"], s_doc["code"].split("-", 1)[-1] if "-" in s_doc["code"] else "")] = s_doc["id"]

    for gid, city in gc_cities.items():
        cc = city.get("countrycode", "")
        admin1 = city.get("admin1code", "")
        if cc not in country_map:
            continue
        state_id = admin1_lookup.get((cc, admin1), "")
        # If no state match, try to find by country alone
        cities_docs.append({
            "id": str(uuid.uuid4()),
            "name": city["name"],
            "country_id": country_map[cc],
            "country_code": cc,
            "state_id": state_id,
            "admin1code": admin1,
            "latitude": city.get("latitude", 0),
            "longitude": city.get("longitude", 0),
            "population": city.get("population", 0),
        })

    if cities_docs:
        for i in range(0, len(cities_docs), 1000):
            await db.cities.insert_many(cities_docs[i:i+1000])
    print(f"Inserted {len(cities_docs)} cities")

    # Create indexes
    await db.countries.create_index("name")
    await db.states.create_index([("country_id", 1), ("name", 1)])
    await db.cities.create_index([("state_id", 1), ("name", 1)])
    await db.cities.create_index([("country_id", 1), ("name", 1)])
    print("Created indexes")

if __name__ == "__main__":
    asyncio.run(populate_geo())
