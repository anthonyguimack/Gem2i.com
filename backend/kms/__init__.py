"""KMS (insights.<brand>.com) — clean-room rebuild of the Varient news/magazine KMS
on the AUX stack (FastAPI + Jinja2 + Mongo kms_* collections).

Mounted on the brand backend at prefix /insights; the insights2/insights vhost maps
`location / -> proxy_pass http://127.0.0.1:<port>/insights/`, so all user-facing
paths are ROOT-RELATIVE (news.py / morning.py convention).

DORMANT unless `settings.kms_native_enabled` is true in the brand's Mongo settings
(the proven dormant-flag isolation pattern — ships everywhere, active per brand).

Data lives in kms_* collections (see scripts/kms_migrate.py). Auth is unified:
members log in with their My Account credentials (`members` collection); the old
Varient SSO round-trip + member/password/status sync stack is retired per brand
at cutover. Roles: CMS admin -> KMS Super Admin, `role_author` -> Author,
everyone else -> Member (read access; the whole reading surface is login-gated,
matching the live install's custom mod).
"""
from fastapi import APIRouter

from kms.admin import admin_router
from kms import admin_site  # noqa: F401 — Phase-3/4 screens register on admin_router
from kms import review  # noqa: F401 — s150 author peer review routes register on admin_router
from kms.interact import interact_router
from kms.ingest import ingest_router
from kms.public import page_router as _public_router

# Admin/interact/ingest routes MUST register before the public catch-alls
# (/{slug}, /{a}/{b}) or Starlette would route /admin/* and /internal/* into the
# slug handlers.
page_router = APIRouter()
page_router.include_router(admin_router)
page_router.include_router(interact_router)
page_router.include_router(ingest_router)
page_router.include_router(_public_router)
