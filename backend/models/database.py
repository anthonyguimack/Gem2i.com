from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import jwt as pyjwt
import bcrypt
import secrets
import string
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from fastapi import HTTPException, Request
import logging

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# H2: fail closed. A missing or known-default JWT secret means anyone could forge
# admin tokens — refuse to start until a strong secret is configured in .env.
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or JWT_SECRET == 'legacy_jwt_secret':
    raise RuntimeError(
        "JWT_SECRET is not set (or uses the insecure legacy default). "
        "Set a strong, random JWT_SECRET in the backend .env before starting."
    )
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@consultant.com')
# C1: no hardcoded password default. A fresh install with ADMIN_PASSWORD unset gets a
# randomly generated bootstrap password (see seed.py), never a known value like 'Admin123!'.
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    # hashed may be empty/None for migrated legacy members that never had a
    # password (FB-only logins, D2) — those must fail auth cleanly, not 500.
    if not password or not hashed:
        return False
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False

def create_jwt_token(user_id: str, email: str, role: str = "member") -> str:
    payload = {"user_id": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7),
               "iat": datetime.now(timezone.utc)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

def generate_reset_token():
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(48))

async def get_current_user(request: Request) -> dict:
    """Unified auth: checks members collection (which now holds all users including admin)."""
    token = request.cookies.get("session_token")
    if token:
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
            member = await db.members.find_one({"member_id": session["user_id"]}, {"_id": 0})
            if member:
                return member
        else:
            # Cookie holds a direct-login JWT (not an OAuth session ID).
            # Decode it so browser-navigated requests (no Authorization header) work.
            try:
                payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                member = await db.members.find_one({"member_id": payload["user_id"]}, {"_id": 0})
                if member:
                    return member
            except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
                pass
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at and expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=401, detail="Session expired")
            member = await db.members.find_one({"member_id": session["user_id"]}, {"_id": 0})
            if member:
                return member
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            member = await db.members.find_one({"member_id": payload["user_id"]}, {"_id": 0})
            if member:
                return member
        except pyjwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except pyjwt.InvalidTokenError:
            pass
    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(request: Request) -> dict:
    """Permission-aware admin gate.

    Accepts the caller if EITHER:
      1. `role == "admin"` (legacy + seeded bootstrap admin), OR
      2. The caller holds a CMS role whose `permissions[]` includes the section
         that owns this URL (per `cms_sections.get_section_for_path`).

    This keeps every existing `Depends(require_admin)` decorator unchanged while
    enabling delegated operator access per the Roles & Permissions system.
    Sections marked `admin_only` in the registry (currently only the Roles
    editor itself) reject anyone whose `role` is not `admin` — even if they
    somehow hold the key in their permissions list.
    """
    from models.cms_sections import get_section_for_path
    user = await get_current_user(request)
    if user.get("role") == "admin":
        return user
    section_key, admin_only = get_section_for_path(request.url.path)
    if admin_only:
        raise HTTPException(status_code=403, detail="Admin access required")
    if section_key is None:
        # Unmapped admin route — default to admin-only (fail-closed).
        raise HTTPException(status_code=403, detail="Admin access required")
    perms = await get_user_permissions(user)
    if section_key in perms:
        return user
    raise HTTPException(status_code=403, detail=f"Access denied to section: {section_key}")


async def require_super_admin(request: Request) -> dict:
    """Strict admin gate — rejects operators regardless of their permissions.
    Use for self-protective endpoints (role CRUD, etc.)."""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_any_cms_access(request: Request) -> dict:
    """Shared-infrastructure gate — accepts anyone with ≥1 CMS permission.
    Used for endpoints that every CMS section needs (uploads, lookups, etc.)
    where per-section enforcement doesn't make sense because the same
    endpoint is called from many operator-permitted screens."""
    user = await get_current_user(request)
    if user.get("role") == "admin":
        return user
    perms = await get_user_permissions(user)
    if not perms:
        raise HTTPException(status_code=403, detail="CMS access required")
    return user


async def require_my_account_access(request: Request) -> dict:
    """My Account gate — the caller must hold the `role_member` CMS role.
    Admins are also allowed through so a superuser can always inspect the
    member area.  If an admin revokes `role_member` from a member, that
    member loses My Account access (login and every subsequent request)."""
    user = await get_current_user(request)
    if user.get("role") == "admin":
        return user
    roles = user.get("cms_roles") or []
    if "role_member" not in roles:
        raise HTTPException(status_code=403, detail="My Account access has been revoked")
    return user


async def get_user_permissions(user: dict) -> set:
    """Union of CMS section keys this user has access to.

    • `role == "admin"` → every key (short-circuits full scan).
    • Otherwise looks up each role in `user.cms_roles` and merges their
      `permissions[]`; a role flagged `full_access: True` grants every
      assignable section.
    Returns a `set[str]`.
    """
    from models.cms_sections import ALL_SECTION_KEYS, ASSIGNABLE_SECTION_KEYS
    if user.get("role") == "admin":
        return set(ALL_SECTION_KEYS)
    role_ids = user.get("cms_roles") or []
    if not role_ids:
        return set()
    roles = await db.cms_roles.find({"id": {"$in": role_ids}}, {"_id": 0}).to_list(100)
    perms = set()
    for r in roles:
        if r.get("full_access"):
            return set(ASSIGNABLE_SECTION_KEYS)
        perms.update(r.get("permissions") or [])
    # Never leak admin-only keys through a permission grant.
    perms.discard("roles_permissions")
    return perms

async def send_email_smtp(settings: dict, to_email: str, to_name: str, subject: str, html_body: str, from_email: str = "", from_name: str = "", cc_list: list = None):
    smtp_host = settings.get("smtp_host", "")
    smtp_port = settings.get("smtp_port", 587)
    smtp_user = settings.get("smtp_user", "")
    smtp_pass = settings.get("smtp_password", "")
    if not smtp_host or not smtp_user:
        raise HTTPException(status_code=400, detail="SMTP not configured")
    actual_from = from_email or settings.get("email_from", smtp_user)
    actual_from_name = from_name or settings.get("name_from", "Legacy")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{actual_from_name} <{actual_from}>"
    msg["To"] = f"{to_name} <{to_email}>"
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)
    msg.attach(MIMEText(html_body, "html"))
    all_recipients = [to_email]
    if cc_list:
        all_recipients.extend(cc_list)
    await aiosmtplib.send(msg, hostname=smtp_host, port=smtp_port, username=smtp_user, password=smtp_pass, start_tls=True, recipients=all_recipients)
