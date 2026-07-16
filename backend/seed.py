import uuid
import secrets
from datetime import datetime, timezone
import logging
from models.database import db, hash_password, ADMIN_EMAIL, ADMIN_PASSWORD

logger = logging.getLogger(__name__)


def _resolve_admin_password():
    """Bootstrap admin password for a FRESH install only. Uses ADMIN_PASSWORD from the
    environment if set; otherwise generates a strong random one and logs it once so the
    operator can retrieve it and change it after first login. Never a known default."""
    if ADMIN_PASSWORD:
        return ADMIN_PASSWORD
    pw = secrets.token_urlsafe(18)
    logger.warning(
        "ADMIN_PASSWORD not set — generated a random bootstrap admin password for %s. "
        "Save it now and change it after first login: %s",
        ADMIN_EMAIL, pw,
    )
    return pw


async def seed_data():
    # ─── Admin idempotency & duplicate cleanup ───────────────────────────────
    # Historically the seed used `find_one({"email": ADMIN_EMAIL})` to decide
    # whether to insert a new admin.  That meant if `ADMIN_EMAIL` in `.env`
    # was changed between restarts (or differed from the email of a previously
    # seeded admin), the lookup missed the existing admin and a *second* admin
    # was inserted on every restart.  We now check by `role: "admin"` so the
    # seed is idempotent regardless of the email value, and we collapse any
    # accidental duplicates in one place.
    admin_query_email = (ADMIN_EMAIL or "").strip().lower()
    existing_admins = await db.members.find({"role": "admin"}, {"_id": 0}).to_list(100)
    if len(existing_admins) > 1:
        # Multiple admins are legitimate (platform owner + operator accounts).
        # The role-based existence check below already keeps this seed
        # idempotent, so extra admins must never be auto-deleted here — the old
        # collapse destroyed a real second admin on every restart (CA-1,
        # 2026-07-10). We only pick which admin the seed treats as its
        # reference account: env-email match first, otherwise the oldest.
        keeper = next((a for a in existing_admins if (a.get("email", "").lower() == admin_query_email)), None)
        if keeper is None:
            keeper = sorted(existing_admins, key=lambda a: a.get("created_at", ""))[0]
        existing_admins = [keeper]
    admin_member = existing_admins[0] if existing_admins else None
    if admin_member is None:
        # Fall back to the legacy email-based lookup so a normal-role member
        # whose email matches ADMIN_EMAIL gets promoted instead of duplicated.
        admin_member = await db.members.find_one({"email": admin_query_email})
    if admin_member:
        # Always operate on the actual admin's email (not the env value), in
        # case the env was changed mid-flight and points at a different account.
        admin_email_in_db = admin_member.get("email", "")
        # Ensure admin has the right role and fields
        if admin_member.get("role") != "admin":
            await db.members.update_one({"email": admin_email_in_db}, {"$set": {"role": "admin"}})
        # Ensure is_mentor and portfolio_development fields exist
        if "is_mentor" not in admin_member:
            await db.members.update_one({"email": admin_email_in_db}, {"$set": {"is_mentor": False, "portfolio_development": False}})
        settings = await db.settings.find_one({}, {"_id": 0})
        if settings and "social_links" not in settings:
            await db.settings.update_one({}, {"$set": {
                "social_links": [
                    {"id": str(uuid.uuid4()), "platform": "Facebook", "url": "https://facebook.com", "icon": "facebook"},
                    {"id": str(uuid.uuid4()), "platform": "Twitter", "url": "https://twitter.com", "icon": "twitter"},
                    {"id": str(uuid.uuid4()), "platform": "Instagram", "url": "https://instagram.com", "icon": "instagram"},
                    {"id": str(uuid.uuid4()), "platform": "LinkedIn", "url": "https://linkedin.com", "icon": "linkedin"},
                ],
                "blog_api_url": "https://carlosartiles.com/api.php",
                "colors": {
                    "primary": "#1a2332", "accent": "#0D9488",
                    "button_bg": "#1a2332", "button_text": "#FFFFFF",
                    "link_color": "#0D9488", "tab_active_bg": "#1a2332",
                    "tab_active_text": "#FFFFFF", "tab_inactive_bg": "#FFFFFF",
                    "tab_inactive_text": "#64748B", "icon_color": "#0D9488",
                    "heading_color": "#1a2332", "body_text": "#475569",
                    "footer_bg": "#1a2332", "footer_text": "#FFFFFF"
                },
                "email_from": "", "name_from": "", "email_to": "",
                "name_to": "", "email_cc": "",
            }})
        settings_check = await db.settings.find_one({}, {"_id": 0})
        if settings_check and "section_order" not in settings_check:
            await db.settings.update_one({}, {"$set": {"section_order": ["hero", "about", "services", "news", "blog", "reading_list", "map", "portfolio", "gallery", "testimonials", "contact"]}})
        if settings_check and "aux_prefix" not in settings_check:
            await db.settings.update_one({}, {"$set": {
                "aux_prefix": "AUX",
                "membership_login_bg": "",
                "membership_default_avatar": "",
                "welcome_email_template": "",
                "platform_domain": "legacy.com",
            }})
        # Seed sectors/industries/companies if missing
        sectors_count = await db.sectors.count_documents({})
        if sectors_count == 0:
            sectors_data = [
                {"id": "sect_tech", "name": "Technology"},
                {"id": "sect_health", "name": "Healthcare"},
                {"id": "sect_finance", "name": "Financial Services"},
                {"id": "sect_energy", "name": "Energy"},
                {"id": "sect_consumer", "name": "Consumer Discretionary"},
                {"id": "sect_comm", "name": "Communication Services"},
            ]
            industries_data = [
                {"id": "ind_software", "name": "Software", "sector_id": "sect_tech"},
                {"id": "ind_semi", "name": "Semiconductors", "sector_id": "sect_tech"},
                {"id": "ind_hardware", "name": "Hardware", "sector_id": "sect_tech"},
                {"id": "ind_pharma", "name": "Pharmaceuticals", "sector_id": "sect_health"},
                {"id": "ind_biotech", "name": "Biotechnology", "sector_id": "sect_health"},
                {"id": "ind_bank", "name": "Banking", "sector_id": "sect_finance"},
                {"id": "ind_fintech", "name": "Financial Technology", "sector_id": "sect_finance"},
                {"id": "ind_oil", "name": "Oil & Gas", "sector_id": "sect_energy"},
                {"id": "ind_renewable", "name": "Renewable Energy", "sector_id": "sect_energy"},
                {"id": "ind_auto", "name": "Automobile", "sector_id": "sect_consumer"},
                {"id": "ind_retail", "name": "Retail", "sector_id": "sect_consumer"},
                {"id": "ind_media", "name": "Interactive Media", "sector_id": "sect_comm"},
                {"id": "ind_telecom", "name": "Telecom", "sector_id": "sect_comm"},
            ]
            companies_data = [
                {"id": "comp_aapl", "symbol": "AAPL", "name": "Apple Inc.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_hardware", "price": 227.48},
                {"id": "comp_msft", "symbol": "MSFT", "name": "Microsoft Corp.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_software", "price": 454.27},
                {"id": "comp_nvda", "symbol": "NVDA", "name": "NVIDIA Corp.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_semi", "price": 131.29},
                {"id": "comp_meta", "symbol": "META", "name": "Meta Platforms", "security": "Class A Common Stock", "sector_id": "sect_tech", "industry_id": "ind_media", "price": 585.25},
                {"id": "comp_goog", "symbol": "GOOGL", "name": "Alphabet Inc.", "security": "Class A Common Stock", "sector_id": "sect_comm", "industry_id": "ind_media", "price": 161.12},
                {"id": "comp_amzn", "symbol": "AMZN", "name": "Amazon.com Inc.", "security": "Common Stock", "sector_id": "sect_consumer", "industry_id": "ind_retail", "price": 188.99},
                {"id": "comp_tsla", "symbol": "TSLA", "name": "Tesla Inc.", "security": "Common Stock", "sector_id": "sect_consumer", "industry_id": "ind_auto", "price": 271.19},
                {"id": "comp_jpm", "symbol": "JPM", "name": "JPMorgan Chase", "security": "Common Stock", "sector_id": "sect_finance", "industry_id": "ind_bank", "price": 256.73},
                {"id": "comp_v", "symbol": "V", "name": "Visa Inc.", "security": "Class A Common Stock", "sector_id": "sect_finance", "industry_id": "ind_fintech", "price": 343.61},
                {"id": "comp_jnj", "symbol": "JNJ", "name": "Johnson & Johnson", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_pharma", "price": 153.44},
                {"id": "comp_pfe", "symbol": "PFE", "name": "Pfizer Inc.", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_pharma", "price": 25.12},
                {"id": "comp_mrna", "symbol": "MRNA", "name": "Moderna Inc.", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_biotech", "price": 33.50},
                {"id": "comp_xom", "symbol": "XOM", "name": "Exxon Mobil", "security": "Common Stock", "sector_id": "sect_energy", "industry_id": "ind_oil", "price": 108.52},
                {"id": "comp_enph", "symbol": "ENPH", "name": "Enphase Energy", "security": "Common Stock", "sector_id": "sect_energy", "industry_id": "ind_renewable", "price": 61.78},
                {"id": "comp_sq", "symbol": "SQ", "name": "Block Inc.", "security": "Common Stock", "sector_id": "sect_finance", "industry_id": "ind_fintech", "price": 72.45},
            ]
            await db.sectors.insert_many(sectors_data)
            await db.industries.insert_many(industries_data)
            await db.companies.insert_many(companies_data)
            logger.info("Seeded sectors/industries/companies")
        # Seed countries/states/cities if missing
        countries_count = await db.countries.count_documents({})
        if countries_count == 0:
            countries = [
                {"id": "us", "name": "United States", "code": "US"},
                {"id": "mx", "name": "Mexico", "code": "MX"},
                {"id": "ca", "name": "Canada", "code": "CA"},
                {"id": "es", "name": "Spain", "code": "ES"},
                {"id": "co", "name": "Colombia", "code": "CO"},
            ]
            states = [
                {"id": "us_ca", "name": "California", "country_id": "us"},
                {"id": "us_ny", "name": "New York", "country_id": "us"},
                {"id": "us_tx", "name": "Texas", "country_id": "us"},
                {"id": "us_fl", "name": "Florida", "country_id": "us"},
                {"id": "us_il", "name": "Illinois", "country_id": "us"},
                {"id": "mx_cdmx", "name": "Ciudad de Mexico", "country_id": "mx"},
                {"id": "mx_jal", "name": "Jalisco", "country_id": "mx"},
                {"id": "mx_nl", "name": "Nuevo Leon", "country_id": "mx"},
                {"id": "ca_on", "name": "Ontario", "country_id": "ca"},
                {"id": "ca_qc", "name": "Quebec", "country_id": "ca"},
                {"id": "ca_bc", "name": "British Columbia", "country_id": "ca"},
                {"id": "es_md", "name": "Madrid", "country_id": "es"},
                {"id": "es_ct", "name": "Catalonia", "country_id": "es"},
                {"id": "co_bog", "name": "Bogota D.C.", "country_id": "co"},
                {"id": "co_ant", "name": "Antioquia", "country_id": "co"},
            ]
            cities = [
                {"id": "us_ca_la", "name": "Los Angeles", "state_id": "us_ca"},
                {"id": "us_ca_sf", "name": "San Francisco", "state_id": "us_ca"},
                {"id": "us_ca_sd", "name": "San Diego", "state_id": "us_ca"},
                {"id": "us_ny_nyc", "name": "New York City", "state_id": "us_ny"},
                {"id": "us_ny_buf", "name": "Buffalo", "state_id": "us_ny"},
                {"id": "us_tx_hou", "name": "Houston", "state_id": "us_tx"},
                {"id": "us_tx_dal", "name": "Dallas", "state_id": "us_tx"},
                {"id": "us_tx_aus", "name": "Austin", "state_id": "us_tx"},
                {"id": "us_fl_mia", "name": "Miami", "state_id": "us_fl"},
                {"id": "us_fl_orl", "name": "Orlando", "state_id": "us_fl"},
                {"id": "us_il_chi", "name": "Chicago", "state_id": "us_il"},
                {"id": "mx_cdmx_c", "name": "Mexico City", "state_id": "mx_cdmx"},
                {"id": "mx_jal_gdl", "name": "Guadalajara", "state_id": "mx_jal"},
                {"id": "mx_nl_mty", "name": "Monterrey", "state_id": "mx_nl"},
                {"id": "ca_on_tor", "name": "Toronto", "state_id": "ca_on"},
                {"id": "ca_qc_mtl", "name": "Montreal", "state_id": "ca_qc"},
                {"id": "ca_bc_van", "name": "Vancouver", "state_id": "ca_bc"},
                {"id": "es_md_mad", "name": "Madrid", "state_id": "es_md"},
                {"id": "es_ct_bcn", "name": "Barcelona", "state_id": "es_ct"},
                {"id": "co_bog_bog", "name": "Bogota", "state_id": "co_bog"},
                {"id": "co_ant_med", "name": "Medellin", "state_id": "co_ant"},
            ]
            await db.countries.insert_many(countries)
            await db.states.insert_many(states)
            await db.cities.insert_many(cities)
            logger.info("Seeded countries/states/cities")
        # Seed member levels if missing
        levels_count = await db.member_levels.count_documents({})
        if levels_count == 0:
            levels = [
                {"id": "level_1", "name": "Level 1", "permissions": ["membership-profile", "my-sponsor"], "order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "level_2", "name": "Level 2", "permissions": ["membership-profile", "my-sponsor", "mentorship-profile"], "order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "level_3", "name": "Level 3", "permissions": ["membership-profile", "my-sponsor", "mentorship-profile", "invite-code"], "order": 3, "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "level_4", "name": "Level 4", "permissions": ["membership-profile", "my-sponsor", "mentorship-profile", "invite-code", "portfolios"], "order": 4, "created_at": datetime.now(timezone.utc).isoformat()},
            ]
            await db.member_levels.insert_many(levels)
            logger.info("Seeded member levels")
        nav_pages_count = await db.nav_pages.count_documents({})
        if nav_pages_count == 0:
            await db.nav_pages.insert_many([
                {"id": str(uuid.uuid4()), "title": "Terms of Service", "url": "/terms", "show_in_header": False, "show_in_footer": True, "open_in_new_tab": False, "login_required": False, "order": 1, "banner_image": "", "summary": "Our terms and conditions", "content": "", "page_type": "terms", "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": str(uuid.uuid4()), "title": "Privacy Policy", "url": "/privacy", "show_in_header": False, "show_in_footer": True, "open_in_new_tab": False, "login_required": False, "order": 2, "banner_image": "", "summary": "Our privacy policy", "content": "", "page_type": "privacy", "created_at": datetime.now(timezone.utc).isoformat()},
            ])
        book_migration_data = {
            "Good to Great": {"synopsis": "A landmark study revealing what it takes to transform a good company into one that produces sustained great results.", "who_is_it_for": "Business leaders, managers, and entrepreneurs seeking to understand what separates great companies from good ones.", "about_author": "Jim Collins is a student and teacher of what makes great companies tick, and a Socratic advisor to leaders in the business and social sectors."},
            "The Lean Startup": {"synopsis": "Eric Ries presents a scientific approach to creating and managing successful startups in an age when companies need to innovate more than ever.", "who_is_it_for": "Startup founders, product managers, and anyone building something new under conditions of extreme uncertainty.", "about_author": "Eric Ries is an entrepreneur and author. He is the creator of the Lean Startup methodology."},
            "Thinking, Fast and Slow": {"synopsis": "Nobel laureate Daniel Kahneman takes us on a tour of the mind explaining the two systems that drive the way we think and how they shape our decisions.", "who_is_it_for": "Decision-makers, psychologists, economists, and anyone curious about how the mind works.", "about_author": "Daniel Kahneman is a psychologist and economist notable for his work on the psychology of judgment and decision-making."},
        }
        for title, fields in book_migration_data.items():
            book = await db.books.find_one({"title": title, "synopsis": {"$exists": False}})
            if book:
                await db.books.update_one({"title": title}, {"$set": fields})
        return
    # Migrate admin from users collection if present
    old_admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if old_admin:
        logger.info("Migrating admin to members collection...")
        admin_member_id = f"member_{uuid.uuid4().hex[:12]}"
        await db.members.insert_one({
            "member_id": admin_member_id,
            "membership_number": 0,
            "membership_id": "ADMIN",
            "username": "admin",
            "email": ADMIN_EMAIL,
            "password_hash": old_admin.get("password_hash") or hash_password(_resolve_admin_password()),
            "first_name": old_admin.get("first_name", "Admin"),
            "last_name": old_admin.get("last_name", ""),
            "gender": "", "phone": old_admin.get("phone", ""),
            "date_of_birth": "",
            "address": "", "country": "", "state": "", "zip_code": "",
            "google_account": "",
            "avatar": old_admin.get("picture", ""),
            "summary": "", "biography": "",
            "social_links": [],
            "sponsor_id": None, "sponsor_membership_number": None,
            "mentor_id": None, "mentor_membership_number": None,
            "is_mentor": False,
            "portfolio_development": False,
            "role": "admin",
            "created_at": old_admin.get("created_at", datetime.now(timezone.utc).isoformat())
        })
        return
    logger.info("Seeding initial data...")
    # Belt-and-brace: even if upstream branches don't return early, never
    # insert a second admin if one already exists in the collection.
    if await db.members.find_one({"role": "admin"}):
        logger.info("Admin already present — skipping admin insert.")
    else:
        admin_member_id = f"member_{uuid.uuid4().hex[:12]}"
        await db.members.insert_one({
        "member_id": admin_member_id,
        "membership_number": 0,
        "membership_id": "ADMIN",
        "username": "admin",
        "email": ADMIN_EMAIL,
        "password_hash": hash_password(_resolve_admin_password()),
        "first_name": "Admin", "last_name": "",
        "gender": "", "phone": "",
        "date_of_birth": "",
        "address": "", "country": "", "state": "", "zip_code": "",
        "google_account": "",
        "avatar": "",
        "summary": "", "biography": "",
        "social_links": [],
        "sponsor_id": None, "sponsor_membership_number": None,
        "mentor_id": None, "mentor_membership_number": None,
        "is_mentor": False,
        "portfolio_development": False,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.settings.insert_one({
        "id": "main", "brand_name": "Legacy", "tagline": "Strategic Business Consulting",
        "logo_url": "", "favicon_url": "",
        "logo_on_1": "", "logo_on_2": "", "logo_off": "", "favicon": "",
        "footer_description": "Strategic consulting for businesses seeking sustainable growth and lasting impact.",
        "footer_copyright": "Legacy Consulting - All rights reserved.",
        "meta_title": "Legacy - Strategic Business Consulting",
        "meta_description": "Innovative solutions tailored for your success",
        "primary_color": "#1a2332", "accent_color": "#0D9488",
        "smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": "",
        "email_from": "", "name_from": "", "email_to": "", "name_to": "", "email_cc": "",
        "admin_email": ADMIN_EMAIL,
        "blog_api_url": "https://carlosartiles.com/api.php",
        "social_links": [
            {"id": str(uuid.uuid4()), "platform": "Facebook", "url": "https://facebook.com", "icon": "facebook"},
            {"id": str(uuid.uuid4()), "platform": "Twitter", "url": "https://twitter.com", "icon": "twitter"},
            {"id": str(uuid.uuid4()), "platform": "Instagram", "url": "https://instagram.com", "icon": "instagram"},
            {"id": str(uuid.uuid4()), "platform": "LinkedIn", "url": "https://linkedin.com", "icon": "linkedin"},
        ],
        "colors": {
            "primary": "#1a2332", "accent": "#0D9488",
            "button_bg": "#1a2332", "button_text": "#FFFFFF",
            "link_color": "#0D9488", "tab_active_bg": "#1a2332",
            "tab_active_text": "#FFFFFF", "tab_inactive_bg": "#FFFFFF",
            "tab_inactive_text": "#64748B", "icon_color": "#0D9488",
            "heading_color": "#1a2332", "body_text": "#475569",
            "footer_bg": "#1a2332", "footer_text": "#FFFFFF"
        },
        "sections": {
            "hero": {"enabled": True, "title": "Hero"},
            "about": {"enabled": True, "title": "About Us"},
            "services": {"enabled": True, "title": "Services"},
            "news": {"enabled": True, "title": "News"},
            "blog": {"enabled": True, "title": "Blog"},
            "reading_list": {"enabled": True, "title": "Reading List"},
            "map": {"enabled": True, "title": "Travel Map"},
            "map_global": {"enabled": True, "title": "Global Business Presence"},
            "map_conferences": {"enabled": False, "title": "Conferences"},
            "map_recommended": {"enabled": False, "title": "Recommended Sites"},
            "portfolio": {"enabled": True, "title": "Portfolio"},
            "gallery": {"enabled": True, "title": "Gallery"},
            "testimonials": {"enabled": True, "title": "Testimonials"},
            "contact": {"enabled": True, "title": "Contact"}
        },
        "section_order": ["hero", "about", "services", "news", "blog", "reading_list", "map", "map_global", "map_conferences", "map_recommended", "portfolio", "gallery", "testimonials", "contact"],
        "page_access": {
            "news": "public", "reading_list": "public", "gallery": "public",
            "map": "public", "terms": "public", "privacy": "public"
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.hero.insert_one({
        "id": "main", "subtitle": "WELCOME TO LEGACY CONSULTING",
        "title": "Innovative Solutions\nTailored for Your Success",
        "description": "We deliver strategic insights and personalized solutions to help businesses thrive in competitive markets. Our expert consultants guide you every step of the way.",
        "button_text": "Get Started", "button_link": "#contact",
        "background_image": "https://images.unsplash.com/photo-1650784854430-3ab0c30afdf3?crop=entropy&cs=srgb&fm=jpg&q=85",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.about.insert_one({
        "id": "main", "label": "ABOUT LEGACY",
        "title": "Smart and effective business agency.",
        "description": "We believe in the power of collaboration and personalized solutions. By understanding our clients' unique needs and goals, we tailor our approach to deliver strategic insights and creative solutions that drive lasting results.",
        "phone": "+1 (555) 123-4567", "signature_name": "Jonathan Pierce",
        "signature_title": "Founder & CEO",
        "image": "https://images.pexels.com/photos/7433919/pexels-photo-7433919.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "stats": [{"label": "Business Progress", "value": "90%"}],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.services.insert_many([
        {"id": str(uuid.uuid4()), "title": "Business Strategy", "description": "Smart, scalable business solutions tailored to help companies streamline operations.", "icon": "briefcase", "price": 299.00, "currency": "usd", "type": "service", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Growth Consulting", "description": "We identify untapped markets and customer segments to drive business growth.", "icon": "trending-up", "price": 499.00, "currency": "usd", "type": "service", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Financial Planning", "description": "Tailored financial planning to help businesses manage budgets and reduce risk.", "icon": "bar-chart-3", "price": 399.00, "currency": "usd", "type": "service", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Digital Transformation", "description": "Comprehensive digital strategy to modernize your business operations.", "icon": "monitor", "price": 599.00, "currency": "usd", "type": "product", "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.blog_posts.insert_many([
        {"id": str(uuid.uuid4()), "title": "The Future of Business Consulting", "slug": "future-of-business-consulting", "summary": "Discover how modern consulting firms are adapting to digital transformation and AI-driven strategies.", "content": "<h2>The Evolution of Consulting</h2><p>The consulting industry is undergoing a fundamental shift driven by AI and data analytics.</p>", "category": "Business", "author": "Jonathan Pierce", "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", "published": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "5 Strategies for Market Expansion", "slug": "5-strategies-market-expansion", "summary": "Learn proven approaches to expand your market reach and capture new customer segments.", "content": "<h2>Expanding Your Market</h2><p>Market expansion is critical for sustainable growth.</p>", "category": "Marketing", "author": "Sarah Mitchell", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", "published": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Building Resilient Organizations", "slug": "building-resilient-organizations", "summary": "Explore the key principles behind organizational resilience.", "content": "<h2>Organizational Resilience</h2><p>Resilience is a critical competitive advantage.</p>", "category": "Leadership", "author": "Michael Chen", "image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800", "published": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.books.insert_many([
        {"id": str(uuid.uuid4()), "title": "Good to Great", "author": "Jim Collins", "description": "Why some companies make the leap and others don't.", "synopsis": "A landmark study revealing what it takes to transform a good company into one that produces sustained great results.", "who_is_it_for": "Business leaders, managers, and entrepreneurs.", "about_author": "Jim Collins is a student and teacher of what makes great companies tick.", "image": "https://images.unsplash.com/photo-1543320996-542b8a0e022c?crop=entropy&cs=srgb&fm=jpg&q=85", "amazon_link": "https://amazon.com", "other_links": [{"name": "Barnes & Noble", "url": "https://barnesandnoble.com"}], "featured": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "The Lean Startup", "author": "Eric Ries", "description": "A revolutionary approach to business.", "synopsis": "Eric Ries presents a scientific approach to creating and managing successful startups.", "who_is_it_for": "Startup founders and product managers.", "about_author": "Eric Ries is an entrepreneur and creator of the Lean Startup methodology.", "image": "https://images.unsplash.com/photo-1695634621295-8f83685a35bb?crop=entropy&cs=srgb&fm=jpg&q=85", "amazon_link": "https://amazon.com", "other_links": [], "featured": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Thinking, Fast and Slow", "author": "Daniel Kahneman", "description": "A groundbreaking tour of the mind.", "synopsis": "Nobel laureate Daniel Kahneman explains the two systems that drive the way we think.", "who_is_it_for": "Decision-makers and anyone curious about how the mind works.", "about_author": "Daniel Kahneman is a psychologist notable for his work on judgment and decision-making.", "image": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800", "amazon_link": "https://amazon.com", "other_links": [], "featured": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    map_id = str(uuid.uuid4())
    await db.maps.insert_one({
        "id": map_id, "title": "Global Business Presence", "slug": "global-business-presence",
        "description": "<p>Our consulting practice spans across major business hubs worldwide.</p>",
        "cover_image": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800",
        "tags": ["global", "consulting"], "published": True, "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.map_locations.insert_many([
        {"id": str(uuid.uuid4()), "name": "New York Office", "lat": 40.7128, "lng": -74.0060, "description": "Flagship office in Manhattan", "map_type": "global_business", "link": "", "open_in_new_tab": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "London Hub", "lat": 51.5074, "lng": -0.1278, "description": "European headquarters", "map_type": "global_business", "link": "", "open_in_new_tab": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Tokyo Center", "lat": 35.6762, "lng": 139.6503, "description": "Asia-Pacific operations", "map_type": "global_business", "link": "", "open_in_new_tab": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Dubai Office", "lat": 25.2048, "lng": 55.2708, "description": "Middle East regional office", "map_type": "global_business", "link": "", "open_in_new_tab": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sydney Branch", "lat": -33.8688, "lng": 151.2093, "description": "Oceania operations", "map_type": "global_business", "link": "", "open_in_new_tab": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.gallery.insert_many([
        {"id": str(uuid.uuid4()), "title": "Strategic Planning Session", "summary": "Annual strategy meeting", "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", "category": "professional", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Team Building Workshop", "summary": "Collaborative team event", "image": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800", "category": "professional", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Client Presentation", "summary": "Quarterly results delivery", "image": "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800", "category": "professional", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Office Celebration", "summary": "Year-end celebration", "image": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800", "category": "personal", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Weekend Retreat", "summary": "Mountain retreat", "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", "category": "personal", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Networking Event", "summary": "Industry networking", "image": "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=800", "category": "professional", "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.portfolio.insert_many([
        {"id": str(uuid.uuid4()), "title": "Startup Solution", "description": "Complete business transformation", "image": "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=800", "tags": ["marketing", "strategy"], "link": "", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Marketing Growth", "description": "200% growth campaign", "image": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", "tags": ["business", "solution"], "link": "", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Company Skills", "description": "Enterprise training program", "image": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", "tags": ["solution"], "link": "", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Business Growth Plan", "description": "Strategic growth roadmap", "image": "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800", "tags": ["business"], "link": "", "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.testimonials.insert_many([
        {"id": str(uuid.uuid4()), "name": "David Richardson", "title": "CEO, TechVentures Inc.", "content": "Legacy Consulting transformed our business strategy with 150% revenue growth.", "image": "https://images.unsplash.com/photo-1755519024827-fd05075a7200?crop=entropy&cs=srgb&fm=jpg&q=85", "rating": 5, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Amanda Foster", "title": "COO, GlobalReach Ltd.", "content": "Working with Legacy was a game-changer for our strategic planning.", "image": "https://images.pexels.com/photos/29852895/pexels-photo-29852895.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "rating": 5, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Robert Kim", "title": "Director, InnovateCo", "content": "They helped us navigate complex regulatory challenges. Highly recommended.", "image": "https://images.pexels.com/photos/30004360/pexels-photo-30004360.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "rating": 5, "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.pages.insert_many([
        {"page_type": "terms", "title": "Terms of Service", "content": "<h2>Terms of Service</h2><p>Welcome to Legacy Consulting.</p>", "banner_image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800", "created_at": datetime.now(timezone.utc).isoformat()},
        {"page_type": "privacy", "title": "Privacy Policy", "content": "<h2>Privacy Policy</h2><p>We take your privacy seriously.</p>", "banner_image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800", "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.nav_pages.insert_many([
        {"id": str(uuid.uuid4()), "title": "Terms of Service", "url": "/terms", "show_in_header": False, "show_in_footer": True, "open_in_new_tab": False, "login_required": False, "order": 1, "banner_image": "", "summary": "Our terms and conditions", "content": "", "page_type": "terms", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Privacy Policy", "url": "/privacy", "show_in_header": False, "show_in_footer": True, "open_in_new_tab": False, "login_required": False, "order": 2, "banner_image": "", "summary": "Our privacy policy", "content": "", "page_type": "privacy", "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.users.insert_one({
        "user_id": f"user_{uuid.uuid4().hex[:12]}", "email": "user@example.com",
        "name": "John Doe", "first_name": "John", "last_name": "Doe",
        "password_hash": hash_password("User123!"), "role": "user",
        "picture": "", "phone": "+1 555-0100",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    # Seed sectors, industries, companies
    sectors_data = [
        {"id": "sect_tech", "name": "Technology"},
        {"id": "sect_health", "name": "Healthcare"},
        {"id": "sect_finance", "name": "Financial Services"},
        {"id": "sect_energy", "name": "Energy"},
        {"id": "sect_consumer", "name": "Consumer Discretionary"},
        {"id": "sect_comm", "name": "Communication Services"},
    ]
    industries_data = [
        {"id": "ind_software", "name": "Software", "sector_id": "sect_tech"},
        {"id": "ind_semi", "name": "Semiconductors", "sector_id": "sect_tech"},
        {"id": "ind_hardware", "name": "Hardware", "sector_id": "sect_tech"},
        {"id": "ind_pharma", "name": "Pharmaceuticals", "sector_id": "sect_health"},
        {"id": "ind_biotech", "name": "Biotechnology", "sector_id": "sect_health"},
        {"id": "ind_bank", "name": "Banking", "sector_id": "sect_finance"},
        {"id": "ind_fintech", "name": "Financial Technology", "sector_id": "sect_finance"},
        {"id": "ind_oil", "name": "Oil & Gas", "sector_id": "sect_energy"},
        {"id": "ind_renewable", "name": "Renewable Energy", "sector_id": "sect_energy"},
        {"id": "ind_auto", "name": "Automobile", "sector_id": "sect_consumer"},
        {"id": "ind_retail", "name": "Retail", "sector_id": "sect_consumer"},
        {"id": "ind_media", "name": "Interactive Media", "sector_id": "sect_comm"},
        {"id": "ind_telecom", "name": "Telecom", "sector_id": "sect_comm"},
    ]
    companies_data = [
        {"id": "comp_aapl", "symbol": "AAPL", "name": "Apple Inc.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_hardware", "price": 227.48},
        {"id": "comp_msft", "symbol": "MSFT", "name": "Microsoft Corp.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_software", "price": 454.27},
        {"id": "comp_nvda", "symbol": "NVDA", "name": "NVIDIA Corp.", "security": "Common Stock", "sector_id": "sect_tech", "industry_id": "ind_semi", "price": 131.29},
        {"id": "comp_meta", "symbol": "META", "name": "Meta Platforms", "security": "Class A Common Stock", "sector_id": "sect_tech", "industry_id": "ind_media", "price": 585.25},
        {"id": "comp_goog", "symbol": "GOOGL", "name": "Alphabet Inc.", "security": "Class A Common Stock", "sector_id": "sect_comm", "industry_id": "ind_media", "price": 161.12},
        {"id": "comp_amzn", "symbol": "AMZN", "name": "Amazon.com Inc.", "security": "Common Stock", "sector_id": "sect_consumer", "industry_id": "ind_retail", "price": 188.99},
        {"id": "comp_tsla", "symbol": "TSLA", "name": "Tesla Inc.", "security": "Common Stock", "sector_id": "sect_consumer", "industry_id": "ind_auto", "price": 271.19},
        {"id": "comp_jpm", "symbol": "JPM", "name": "JPMorgan Chase", "security": "Common Stock", "sector_id": "sect_finance", "industry_id": "ind_bank", "price": 256.73},
        {"id": "comp_v", "symbol": "V", "name": "Visa Inc.", "security": "Class A Common Stock", "sector_id": "sect_finance", "industry_id": "ind_fintech", "price": 343.61},
        {"id": "comp_jnj", "symbol": "JNJ", "name": "Johnson & Johnson", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_pharma", "price": 153.44},
        {"id": "comp_pfe", "symbol": "PFE", "name": "Pfizer Inc.", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_pharma", "price": 25.12},
        {"id": "comp_mrna", "symbol": "MRNA", "name": "Moderna Inc.", "security": "Common Stock", "sector_id": "sect_health", "industry_id": "ind_biotech", "price": 33.50},
        {"id": "comp_xom", "symbol": "XOM", "name": "Exxon Mobil", "security": "Common Stock", "sector_id": "sect_energy", "industry_id": "ind_oil", "price": 108.52},
        {"id": "comp_enph", "symbol": "ENPH", "name": "Enphase Energy", "security": "Common Stock", "sector_id": "sect_energy", "industry_id": "ind_renewable", "price": 61.78},
        {"id": "comp_sq", "symbol": "SQ", "name": "Block Inc.", "security": "Common Stock", "sector_id": "sect_finance", "industry_id": "ind_fintech", "price": 72.45},
    ]
    await db.sectors.insert_many(sectors_data)
    await db.industries.insert_many(industries_data)
    await db.companies.insert_many(companies_data)
    logger.info("Seed data created successfully!")
