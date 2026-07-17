from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI()
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Upload directory & static files
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ── CMS core routers (gem2i keeps ONLY the engine; all brand/product modules
#    from the AUX-1.0 fork were stripped at Phase 0). New gem_* routers get
#    added here as the gem2i product is built (see GEM2I_MIGRATION_PLAN §5).
from routes.auth import router as auth_router
from routes.public import router as public_router
from routes.admin_content import router as admin_content_router
from routes.admin_tools import router as admin_tools_router
from routes.payments import router as payments_router
from routes.membership import router as membership_router
from routes.landing import router as landing_router
from routes.hero_ab import router as hero_ab_router
from routes.roles import router as roles_router, seed_system_roles
from routes.email_templates import router as email_templates_router
from routes.captcha import router as captcha_router
from routes.gem_content import router as gem_content_router, seed_gem_content
from routes.gem_catalogs import router as gem_catalogs_router
from routes.gem_passes import router as gem_passes_router, ensure_pass_indexes
from routes.gem_tickets import router as gem_tickets_router, seed_gem_ecommissions

api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(admin_content_router)
api_router.include_router(admin_tools_router)
api_router.include_router(payments_router)
api_router.include_router(membership_router)
api_router.include_router(landing_router)
api_router.include_router(hero_ab_router)
api_router.include_router(roles_router)
api_router.include_router(email_templates_router)
api_router.include_router(captcha_router)
api_router.include_router(gem_content_router)
api_router.include_router(gem_catalogs_router)
api_router.include_router(gem_passes_router)
api_router.include_router(gem_tickets_router)


@api_router.get("/health")
async def health():
    return {"status": "ok", "product": "gem2i"}


# Import seed data function
from seed import seed_data

@app.on_event("startup")
async def startup():
    await seed_data()
    await seed_system_roles()
    await seed_gem_content()
    await ensure_pass_indexes()
    await seed_gem_ecommissions()
    from utils.email_render import ensure_templates_seeded
    await ensure_templates_seeded()
    try:
        from models.database import db
        await db.sso_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass
    from scheduler import start_scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_db_client():
    from scheduler import stop_scheduler
    stop_scheduler()
    from models.database import client
    client.close()

app.include_router(api_router)
# H1: never default to "*" while credentials are allowed (that would let any site make
# authenticated cross-origin requests). Origins must be explicitly allow-listed via
# CORS_ORIGINS (comma-separated); unset => no cross-origin access.
_cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"], allow_headers=["*"])
