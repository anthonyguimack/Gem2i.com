#!/usr/bin/env python3
"""
Purge ALL seeded test data from carlosartiles_cms.
Run on the server: python3 /opt/carlos-artiles-cms/backend/scripts/purge_carlosartiles.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME   = "carlosartiles_cms"

COLLECTIONS = [
    "hero_slides",
    "about",
    "services",
    "testimonials",
    "portfolios",
    "books",
    "blog_posts",
    "gallery",
    "aurex_section_configs",
    "aurex_section_items",
    "calendar_events",
    "nav_pages",
]

async def purge():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    for col in COLLECTIONS:
        result = await db[col].delete_many({})
        print(f"  deleted {result.deleted_count:>4}  {col}")
    print("\nDone — all seeded test data removed.")
    client.close()

asyncio.run(purge())
