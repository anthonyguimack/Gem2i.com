"""
CMS Section Registry — single source of truth for the Roles & Permissions system.

Every admin-manageable area of the CMS is registered here with:
  • `key`        — stable identifier stored in roles.permissions[] and used to
                   look up a user's access at runtime.
  • `label`      — human label shown in the Roles editor checkbox matrix.
  • `group`      — matches the sidebar dividers so the UI can render grouped
                   checkboxes with a "select all children" toggle.
  • `url_prefix` — backend URL prefix(es) this section covers. The middleware
                   maps an incoming `/api/admin/...` request to the section key
                   by finding the LONGEST matching prefix (so `/api/admin/hero-ab`
                   resolves to `hero_ab` before `/api/admin/hero` resolves to `hero`).
  • `frontend_path` — the admin SPA route (for the sidebar + CmsSectionGuard).
  • `admin_only` — when True, the section is reserved for accounts with
                   `role: "admin"` and cannot be granted to operators
                   (currently only the Roles & Permissions editor itself).

When adding a new CMS page, register it here FIRST. No other file needs to know
about the full catalog.
"""

CMS_GROUPS = [
    {"key": "main",          "label": "Main"},
    {"key": "content",       "label": "Content"},
    {"key": "gem2i",         "label": "GEM2i Catalogs"},
    {"key": "landing",       "label": "Landing Page"},
    {"key": "myaccount",     "label": "My Account"},
    {"key": "membership",    "label": "Membership"},
    {"key": "system",        "label": "System"},
    {"key": "security",      "label": "Security"},
]

CMS_SECTIONS = [
    # Main
    {"key": "dashboard",      "label": "Dashboard",     "group": "main",    "frontend_path": "/admin",           "url_prefix": ["/api/admin/stats"]},
    {"key": "analytics",      "label": "Analytics",     "group": "main",    "frontend_path": "/admin/analytics", "url_prefix": ["/api/admin/analytics"]},

    # Content
    {"key": "hero",           "label": "Hero",          "group": "content", "frontend_path": "/admin/hero",          "url_prefix": ["/api/admin/hero-slides", "/api/admin/hero"]},
    {"key": "hero_ab",        "label": "Hero A/B",      "group": "content", "frontend_path": "/admin/hero-ab",       "url_prefix": ["/api/admin/hero-ab"]},
    {"key": "about",          "label": "About Us",      "group": "content", "frontend_path": "/admin/about",         "url_prefix": ["/api/admin/about"]},
    {"key": "services",       "label": "Services",      "group": "content", "frontend_path": "/admin/services",      "url_prefix": ["/api/admin/services"]},
    {"key": "blog",           "label": "Blog",          "group": "content", "frontend_path": "/admin/blog",          "url_prefix": ["/api/admin/blog", "/api/admin/blog-categories"]},
    {"key": "books",          "label": "Reading List",  "group": "content", "frontend_path": "/admin/books",         "url_prefix": ["/api/admin/books"]},
    {"key": "maps",           "label": "Maps",          "group": "content", "frontend_path": "/admin/maps",          "url_prefix": ["/api/admin/maps", "/api/admin/map-locations"]},
    {"key": "gallery",        "label": "Gallery",       "group": "content", "frontend_path": "/admin/gallery",       "url_prefix": ["/api/admin/gallery", "/api/admin/gallery-categories"]},
    {"key": "gallery_albums", "label": "Gallery Albums","group": "content", "frontend_path": "/admin/gallery-albums","url_prefix": ["/api/admin/gallery-albums"]},
    {"key": "portfolio",      "label": "Portfolio",     "group": "content", "frontend_path": "/admin/portfolio",     "url_prefix": ["/api/admin/portfolio"]},
    {"key": "testimonials",   "label": "Testimonials",  "group": "content", "frontend_path": "/admin/testimonials",  "url_prefix": ["/api/admin/testimonials"]},
    {"key": "pages",          "label": "Pages",         "group": "content", "frontend_path": "/admin/pages",         "url_prefix": ["/api/admin/pages"]},

    # GEM2i catalogs (routes/gem_catalogs.py admin CRUD + gem_content.py)
    {"key": "gem_events",      "label": "Events",       "group": "gem2i", "frontend_path": "/admin/gem-events",      "url_prefix": ["/api/admin/gem/events"]},
    {"key": "gem_artists",     "label": "Artists",      "group": "gem2i", "frontend_path": "/admin/gem-artists",     "url_prefix": ["/api/admin/gem/artists"]},
    {"key": "gem_venues",      "label": "Venues",       "group": "gem2i", "frontend_path": "/admin/gem-venues",      "url_prefix": ["/api/admin/gem/venues", "/api/admin/gem/venue-types"]},
    {"key": "gem_festivals",   "label": "Festivals",    "group": "gem2i", "frontend_path": "/admin/gem-festivals",   "url_prefix": ["/api/admin/gem/festivals"]},
    {"key": "gem_conferences", "label": "Conferences",  "group": "gem2i", "frontend_path": "/admin/gem-conferences", "url_prefix": ["/api/admin/gem/conferences"]},
    {"key": "gem_clients",     "label": "Clients",      "group": "gem2i", "frontend_path": "/admin/gem-clients",     "url_prefix": ["/api/admin/gem/clients"]},
    {"key": "gem_content",     "label": "Site Content", "group": "gem2i", "frontend_path": "/admin",                 "url_prefix": ["/api/admin/gem/gem-content"]},

    # Landing Page
    {"key": "landing_hero",        "label": "Hero (Landing)",         "group": "landing", "frontend_path": "/admin/landing-hero",        "url_prefix": ["/api/admin/landing-hero"]},
    {"key": "landing_content",     "label": "Content (Landing)",      "group": "landing", "frontend_path": "/admin/landing-content",     "url_prefix": ["/api/admin/landing-content"]},
    {"key": "landing_subscribers", "label": "Subscribers (Landing)",  "group": "landing", "frontend_path": "/admin/landing-subscribers", "url_prefix": ["/api/admin/landing-subscribers"]},
    {"key": "landing_contacts",    "label": "Contacts (Landing)",     "group": "landing", "frontend_path": "/admin/landing-contacts",    "url_prefix": ["/api/admin/landing-contacts"]},

    # My Account
    {"key": "quick_links",      "label": "Quick Links",           "group": "myaccount", "frontend_path": "/admin/quick-links",       "url_prefix": ["/api/admin/quick-links"]},
    {"key": "myaccount_nav",    "label": "My Account Navigation", "group": "myaccount", "frontend_path": "/admin/myaccount-nav",     "url_prefix": ["/api/admin/myaccount-nav"]},

    # Membership
    {"key": "members",             "label": "Members",             "group": "membership", "frontend_path": "/admin/members",             "url_prefix": ["/api/admin/members"]},
    {"key": "member_levels",       "label": "Member Levels",       "group": "membership", "frontend_path": "/admin/member-levels",       "url_prefix": ["/api/admin/member-levels"]},
    {"key": "member_types",        "label": "Member Types",        "group": "membership", "frontend_path": "/admin/member-types",        "url_prefix": ["/api/admin/member-types"]},
    {"key": "membership_settings", "label": "Membership Settings", "group": "membership", "frontend_path": "/admin/membership-settings", "url_prefix": ["/api/admin/membership-settings", "/api/admin/membership"]},

    # System
    {"key": "contacts",         "label": "Contacts",              "group": "system", "frontend_path": "/admin/contacts",         "url_prefix": ["/api/admin/contacts"]},
    {"key": "contact_settings", "label": "Contact Section",       "group": "system", "frontend_path": "/admin/contact-settings", "url_prefix": ["/api/admin/contact-settings"]},
    {"key": "purchases",        "label": "Purchases",             "group": "system", "frontend_path": "/admin/purchases",        "url_prefix": ["/api/admin/purchases"]},
    {"key": "section_order",    "label": "Page Builder",          "group": "system", "frontend_path": "/admin/section-order",    "url_prefix": ["/api/admin/section-order", "/api/admin/section-configs", "/api/admin/sections"]},
    {"key": "seo",              "label": "SEO",                   "group": "system", "frontend_path": "/admin/seo",              "url_prefix": ["/api/admin/seo"]},
    {"key": "geo",              "label": "Countries, States, Cities", "group": "system", "frontend_path": "/admin/geo",          "url_prefix": ["/api/admin/geo"]},
    {"key": "backup",           "label": "Backup",                "group": "system", "frontend_path": "/admin/backup",           "url_prefix": ["/api/admin/backup", "/api/admin/restore"]},
    {"key": "settings",         "label": "Settings",              "group": "system", "frontend_path": "/admin/settings",         "url_prefix": ["/api/admin/settings", "/api/admin/theme", "/api/admin/upload"]},
    {"key": "email_management", "label": "Email Management",      "group": "system", "frontend_path": "/admin/email-management", "url_prefix": ["/api/admin/email-templates", "/api/admin/email-branding"]},

    # Security (admin-only, cannot be delegated)
    {"key": "roles_permissions", "label": "Roles & Permissions",  "group": "security", "frontend_path": "/admin/roles", "url_prefix": ["/api/admin/cms-roles", "/api/admin/cms-sections"], "admin_only": True},
]

ALL_SECTION_KEYS = [s["key"] for s in CMS_SECTIONS]
ASSIGNABLE_SECTION_KEYS = [s["key"] for s in CMS_SECTIONS if not s.get("admin_only")]

# Build prefix→section lookup (longest prefix wins via sort)
_PREFIX_INDEX = []
for s in CMS_SECTIONS:
    for p in s["url_prefix"]:
        _PREFIX_INDEX.append((p, s["key"], s.get("admin_only", False)))
_PREFIX_INDEX.sort(key=lambda x: -len(x[0]))


def get_section_for_path(path: str):
    """Return (section_key, admin_only) for a request path, or (None, False) if no match.
    Longest prefix wins so that e.g. `/api/admin/hero-ab/xxx` maps to `hero_ab`
    rather than the shorter `hero` prefix."""
    for prefix, key, admin_only in _PREFIX_INDEX:
        if path.startswith(prefix):
            return key, admin_only
    return None, False


# Default system roles seeded on first boot.
SYSTEM_ROLES = [
    {
        "id": "role_admin",
        "name": "Administrator",
        "description": "Full access to the entire system (CMS, My Account, Website).",
        "permissions": [],          # empty because full_access=True short-circuits the check
        "full_access": True,
        "is_system": True,
    },
    {
        "id": "role_member",
        "name": "Member",
        "description": "Default role for everyone logging in via My Account. No CMS access.",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
    {
        "id": "role_pms_operator",
        "name": "Operator",
        "description": "Access to the AUX Projects (PMS) tool for administrative duty tasks (includes Contributor rights).",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
    {
        "id": "role_pms_contributor",
        "name": "Contributor",
        "description": "Access to the AUX Projects (PMS) tool for content-sharing tasks.",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
    {
        "id": "role_lms_instructor",
        "name": "Instructor",
        "description": "Access to the LMS (Learning Management System) as a course instructor (marketplace, own courses).",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
    {
        "id": "role_lms_manager",
        "name": "LMS Manager",
        "description": "Access to the LMS (Learning Management System) back-office without platform admin rights.",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
    {
        "id": "role_mms_manager",
        "name": "MMS Manager",
        "description": "Access to the MMS (Marketing Management System) back-office without platform admin rights.",
        "permissions": [],
        "full_access": False,
        "is_system": True,
    },
]
