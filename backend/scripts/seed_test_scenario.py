"""
Reset and seed the CMS to a known testing scenario.

Performs HARD destructive operations:
  • Deletes all members except admin@consultant.com, AUX-1, AUX-2, AUX-3
  • Deletes all non-system cms_roles (keeps role_admin + role_member)
  • Deletes all member_levels
  • Recreates 4 CMS roles + 4 levels + 10 sample members + Testing Manual doc

Idempotent — running it twice produces the same final state. Existing
records are matched by stable IDs / emails so subsequent runs don't
duplicate.

Run from /app/backend:
    python -m scripts.seed_test_scenario
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Allow running as a script: `python scripts/seed_test_scenario.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt

load_dotenv()

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

NOW = lambda: datetime.now(timezone.utc).isoformat()  # noqa: E731


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


# ---------- Roles (id stable so re-runs are idempotent) ----------
NEW_ROLES = [
    {
        "id": "role_cms_manager",
        "name": "CMS Manager",
        "description": "Full CMS access except Security and Backup.",
        "full_access": False,
        "is_system": False,
        "permissions": [
            "dashboard", "analytics",
            "hero", "hero_ab", "about", "services", "blog", "books", "maps",
            "gallery", "gallery_albums", "portfolio", "testimonials", "pages",
            "landing_hero", "landing_content", "landing_subscribers", "landing_contacts",
            "enrollment_fields",
            "calendar_global", "calendar_mentorship", "calendar_mentor_slot_templates",
            "calendar_blocked_dates", "calendar_bundles", "calendar_coupons", "payouts",
            "quick_links", "myaccount_nav",
            "members", "member_levels", "member_types", "membership_settings",
            "contacts", "contact_settings", "purchases", "section_order",
            "aurex_sections", "seo", "geo", "documentation", "settings",
        ],
    },
    {
        "id": "role_content_editor",
        "name": "Content Editor",
        "description": "Edits landing pages, Aurex sections, Portfolio and SEO.",
        "full_access": False,
        "is_system": False,
        "permissions": [
            "dashboard",
            "landing_hero", "landing_content", "landing_subscribers", "landing_contacts",
            "aurex_sections", "portfolio", "seo",
        ],
    },
    {
        "id": "role_support",
        "name": "Support",
        "description": "Customer support: read members, contacts and purchases.",
        "full_access": False,
        "is_system": False,
        "permissions": [
            "dashboard", "members", "contacts", "contact_settings", "purchases",
        ],
    },
    {
        "id": "role_mentor_coordinator",
        "name": "Mentor Coordinator",
        "description": "Manages everything inside the Calendar group.",
        "full_access": False,
        "is_system": False,
        "permissions": [
            "dashboard",
            "calendar_global", "calendar_mentorship", "calendar_mentor_slot_templates",
            "calendar_blocked_dates", "calendar_bundles", "calendar_coupons", "payouts",
        ],
    },
]


# ---------- Member Levels (id stable) ----------
NEW_LEVELS = [
    {
        "id": "level_free",
        "name": "Free",
        "order": 1,
        "permissions": ["membership-profile"],
        "quick_link_permissions": [],
    },
    {
        "id": "level_standard",
        "name": "Standard",
        "order": 2,
        "permissions": [
            "membership-profile", "my-sponsor", "my-community", "portfolios",
            "global-calendar", "calendar-sync",
        ],
        "quick_link_permissions": [],
    },
    {
        "id": "level_premium",
        "name": "Premium",
        "order": 3,
        "permissions": [
            "membership-profile", "mentorship-profile", "my-sponsor", "ebank",
            "invite-code", "my-community", "portfolios", "global-calendar",
            "bundles", "my-bookings", "calendar-sync",
        ],
        "quick_link_permissions": [],
    },
    {
        "id": "level_mentor",
        "name": "Mentor",
        "order": 4,
        "permissions": [
            "membership-profile", "mentorship-profile", "my-sponsor", "ebank",
            "invite-code", "my-community", "portfolios", "global-calendar",
            "mentorship-calendar", "earnings", "bundles", "my-bookings",
            "calendar-sync",
        ],
        "quick_link_permissions": [],
    },
]


# ---------- Sample Members (10) ----------
# Sponsor will be resolved at seed time from membership_id.
# member_type (Mentors vs Corporate) controls is_mentor through the type table.
SAMPLE_MEMBERS = [
    {"i": 1, "first": "Sample",  "last": "Member 1",  "sponsor": "AUX-1",   "level": "level_standard", "type_name": "Corporate", "cms_roles": []},
    {"i": 2, "first": "Sample",  "last": "Member 2",  "sponsor": "AUX-2",   "level": "level_free",     "type_name": "Corporate", "cms_roles": []},
    {"i": 3, "first": "Sample",  "last": "Member 3",  "sponsor": "AUX-3",   "level": "level_premium",  "type_name": "Corporate", "cms_roles": []},
    {"i": 4, "first": "Sample",  "last": "Member 4",  "sponsor": "samplemember1", "level": "level_standard", "type_name": "Corporate", "cms_roles": []},
    {"i": 5, "first": "Sample",  "last": "Member 5",  "sponsor": "samplemember1", "level": "level_mentor",   "type_name": "Mentors",   "cms_roles": []},
    {"i": 6, "first": "Sample",  "last": "Member 6",  "sponsor": "samplemember1", "level": "level_premium",  "type_name": "Mentors",   "cms_roles": []},
    {"i": 7, "first": "Sample",  "last": "Member 7",  "sponsor": "samplemember1", "level": "level_free",     "type_name": "Corporate", "cms_roles": ["role_content_editor"]},
    {"i": 8, "first": "Sample",  "last": "Member 8",  "sponsor": "samplemember1", "level": "level_premium",  "type_name": "Corporate", "cms_roles": ["role_support"]},
    {"i": 9, "first": "Sample",  "last": "Member 9",  "sponsor": "samplemember1", "level": "level_standard", "type_name": "Corporate", "cms_roles": ["role_mentor_coordinator"]},
    {"i": 10, "first": "Sample", "last": "Member 10", "sponsor": "samplemember1", "level": "level_premium",  "type_name": "Mentors",   "cms_roles": ["role_cms_manager"]},
]


KEEP_EMAILS = {
    "admin@consultant.com",
    "carlos@example.com",       # AUX-1
    "john@example.com",         # AUX-2
    "anthonytest@gmail.com",    # AUX-3
}


# Stable membership IDs / numbers for re-runs (samplemember1 → AUX-101, etc.)
SAMPLE_NUMBER_OFFSET = 100


def email_for(i: int) -> str:
    return f"samplemember{i}@gmail.com"


def username_for(i: int) -> str:
    return f"samplemember{i}"


async def reset_collections():
    print("\n=== Wiping non-system records ===")
    # Members: hard-delete everyone except whitelisted emails.
    res = await db.members.delete_many({"email": {"$nin": list(KEEP_EMAILS)}})
    print(f"  deleted {res.deleted_count} member docs")

    # cms_roles: keep system roles (role_admin, role_member); wipe rest.
    res = await db.cms_roles.delete_many({"is_system": {"$ne": True}})
    print(f"  deleted {res.deleted_count} non-system cms_roles")

    # member_levels: wipe ALL.
    res = await db.member_levels.delete_many({})
    print(f"  deleted {res.deleted_count} member_levels")

    # Strip cms_roles from kept members (they may still reference deleted roles).
    await db.members.update_many({}, {"$set": {"cms_roles": ["role_member"]}})
    await db.members.update_one(
        {"email": "admin@consultant.com"},
        {"$set": {"cms_roles": ["role_admin"]}},
    )
    print("  reset cms_roles on kept members (admin → role_admin, others → role_member)")


async def seed_roles():
    print("\n=== Seeding roles ===")
    for role in NEW_ROLES:
        doc = {**role, "created_at": NOW(), "updated_at": NOW()}
        await db.cms_roles.update_one({"id": role["id"]}, {"$set": doc}, upsert=True)
        print(f"  {role['id']}: {role['name']}  ({len(role['permissions'])} sections)")


async def seed_levels():
    print("\n=== Seeding member levels ===")
    for level in NEW_LEVELS:
        doc = {**level, "created_at": NOW(), "updated_at": NOW()}
        await db.member_levels.update_one({"id": level["id"]}, {"$set": doc}, upsert=True)
        print(f"  {level['id']}: {level['name']}  (order={level['order']}, "
              f"{len(level['permissions'])} my-account sections)")


async def get_type_id(name: str):
    t = await db.member_types.find_one({"name": name}, {"_id": 0, "id": 1})
    return t["id"] if t else None


async def seed_sample_members():
    print("\n=== Seeding sample members ===")
    type_corp = await get_type_id("Corporate")
    type_mentor = await get_type_id("Mentors")
    print(f"  Corporate type_id = {type_corp}")
    print(f"  Mentors   type_id = {type_mentor}")

    # Sponsor lookup: AUX-1/2/3 are existing; samplememberN created in this loop.
    # Build lookup on the fly so referenced sponsors must already exist.
    aux_lookup = {}
    async for m in db.members.find({}, {"_id": 0, "membership_id": 1, "member_id": 1, "username": 1, "membership_number": 1}):
        if m.get("membership_id"):
            aux_lookup[m["membership_id"]] = m
        if m.get("username"):
            aux_lookup[m["username"]] = m

    pw = hash_pw("123456789")

    for spec in SAMPLE_MEMBERS:
        i = spec["i"]
        email = email_for(i)
        username = username_for(i)
        # Idempotent: if a previous run created this member, fetch its existing IDs.
        existing = await db.members.find_one({"email": email}, {"_id": 0})
        if existing:
            member_id = existing["member_id"]
            membership_number = existing["membership_number"]
            membership_id = existing["membership_id"]
        else:
            member_id = f"member_{uuid.uuid4().hex[:12]}"
            membership_number = SAMPLE_NUMBER_OFFSET + i  # AUX-101..AUX-110
            membership_id = f"AUX-{membership_number}"

        # Resolve sponsor
        sp_key = spec["sponsor"]
        sp = aux_lookup.get(sp_key)
        sponsor_id = sp["member_id"] if sp else None
        sponsor_membership_number = sp["membership_number"] if sp else None

        type_id = type_mentor if spec["type_name"] == "Mentors" else type_corp

        doc = {
            "member_id": member_id,
            "membership_number": membership_number,
            "membership_id": membership_id,
            "username": username,
            "email": email,
            "password_hash": pw,
            "first_name": spec["first"],
            "last_name": spec["last"],
            "gender": "",
            "phone": "",
            "date_of_birth": "",
            "address": "", "country": "", "state": "", "city": "", "zip_code": "",
            "google_account": "",
            "avatar": "",
            "summary": "", "biography": "",
            "social_links": [],
            "sponsor_id": sponsor_id,
            "sponsor_membership_number": sponsor_membership_number,
            "mentor_id": None,
            "mentor_membership_number": None,
            "is_mentor": spec["type_name"] == "Mentors",  # mirrors derived value
            "portfolio_development": False,
            "level_id": spec["level"],
            "role": "member",
            "cms_roles": ["role_member"] + spec["cms_roles"],
            "membership_ranking": "",
            "membership_status": "Active",
            "active_date": "", "expiration_date": "", "membership_fee": "",
            "member_type_id": type_id,
            "corporate": spec["type_name"] == "Corporate",
            "application_reviewer": False,
            "opportunities_development": False,
            "opportunities_reviewer": False,
            "project_development": False,
            "project_reviewer": False,
            "project_management": False,
            "content_operator": False,
            "created_at": NOW(),
        }

        await db.members.update_one(
            {"email": email},
            {"$set": doc},
            upsert=True,
        )
        # Refresh lookup so later samplemembers can sponsor newer ones.
        aux_lookup[username] = {"member_id": member_id, "membership_number": membership_number}
        aux_lookup[membership_id] = {"member_id": member_id, "membership_number": membership_number}

        print(f"  {membership_id} {spec['first']} {spec['last']:14s}  "
              f"type={spec['type_name']:9s} level={spec['level']:14s} "
              f"sponsor={sp_key:14s} cms_roles={spec['cms_roles']}")


async def get_summary():
    """Return data for the testing manual doc."""
    sample_rows = []
    for spec in SAMPLE_MEMBERS:
        m = await db.members.find_one({"email": email_for(spec["i"])}, {"_id": 0})
        sponsor = await db.members.find_one(
            {"member_id": m.get("sponsor_id")},
            {"_id": 0, "membership_id": 1, "first_name": 1, "last_name": 1},
        ) if m.get("sponsor_id") else None
        sample_rows.append({
            "membership_id": m["membership_id"],
            "name": f"{m['first_name']} {m['last_name']}",
            "email": m["email"],
            "username": m["username"],
            "password": "123456789",
            "level": spec["level"],
            "member_type": spec["type_name"],
            "is_mentor": spec["type_name"] == "Mentors",
            "cms_roles": [r for r in m["cms_roles"] if r != "role_member"],
            "sponsor": (
                f"{sponsor['membership_id']} ({sponsor['first_name']} {sponsor['last_name']})"
                if sponsor else "—"
            ),
        })
    return sample_rows


async def main():
    await reset_collections()
    await seed_roles()
    await seed_levels()
    await seed_sample_members()

    print("\n=== Final summary ===")
    rows = await get_summary()
    for r in rows:
        roles_str = ",".join(r["cms_roles"]) or "—"
        print(f"  {r['membership_id']:8s}  {r['name']:18s}  {r['email']:30s}  "
              f"lvl={r['level']:14s}  mentor={r['is_mentor']!s:5}  "
              f"sponsor={r['sponsor']}  cms={roles_str}")
    total_members = await db.members.count_documents({})
    total_roles = await db.cms_roles.count_documents({})
    total_levels = await db.member_levels.count_documents({})
    print(f"\n  members: {total_members}    cms_roles: {total_roles}    levels: {total_levels}")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
