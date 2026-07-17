from fastapi import APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, BackgroundTasks
from models.database import db, verify_password, create_jwt_token, hash_password, send_email_smtp, get_current_user, require_admin, logger, UPLOAD_DIR
from utils.kms_sync import sync_member_to_kms, push_password_to_kms, push_status_to_kms
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import aiofiles
import qrcode
import io
import base64

router = APIRouter()


def _display_status(member: dict) -> str:
    """Account status with a safe default for legacy rows: explicit value wins; else
    news-sourced members read as 'pre_registered', everyone else as 'active'."""
    s = (member or {}).get("account_status")
    if s in ("active", "deactivated", "pre_registered"):
        return s
    return "pre_registered" if (member or {}).get("registration_source") == "auxnews" else "active"

# ---- Helpers ----

async def get_next_membership_number():
    """Get the next sequential membership number."""
    last = await db.members.find_one({}, {"membership_number": 1}, sort=[("membership_number", -1)])
    return (last["membership_number"] + 1) if last else 1

async def get_aux_prefix():
    """Get the AUX prefix from settings."""
    settings = await db.settings.find_one({}, {"_id": 0, "aux_prefix": 1})
    return (settings or {}).get("aux_prefix", "AUX")

async def format_membership_id(number):
    prefix = await get_aux_prefix()
    return f"{prefix}-{number}"

async def get_current_member(request: Request) -> dict:
    """Authenticate member from JWT token. Accepts any role (member or admin).

    My Account gate: rejects members whose `cms_roles` no longer contains
    `role_member` so an admin can revoke access by removing the role and the
    very next request fails with 403 (the SPA redirects out)."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    import jwt as pyjwt
    from models.database import JWT_SECRET
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        member = await db.members.find_one({"member_id": payload["user_id"]}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=401, detail="Member not found")
        if member.get("role") != "admin":
            mroles = member.get("cms_roles") or []
            if "role_member" not in mroles:
                raise HTTPException(status_code=403, detail="My Account access has been revoked")
        return member
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---- Member Auth ----

@router.post("/member/login")
async def member_login(request: Request, response: Response):
    body = await request.json()
    username = body.get("username", "").strip()
    password = body.get("password", "")
    # Migrated legacy emails are stored lowercased; legacy MySQL matched them
    # case-insensitively, so accept any casing the member types (D2 parity).
    member = await db.members.find_one(
        {"$or": [{"username": username}, {"email": username},
                 {"username": username.lower()}, {"email": username.lower()}]}, {"_id": 0})
    if not member or not verify_password(password, member.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # My Account gate — admins always pass; everyone else must hold role_member.
    # An admin removing role_member from a member instantly revokes My Account.
    # Deactivated members are blocked at every entry point.
    if member.get("account_status") == "deactivated":
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    # My Account gate — admins always pass; everyone else must hold role_member.
    # An admin removing role_member from a member instantly revokes My Account.
    if member.get("role") != "admin":
        mroles = member.get("cms_roles") or []
        if "role_member" not in mroles:
            raise HTTPException(status_code=403, detail="My Account access has been revoked")
    now_iso = datetime.now(timezone.utc).isoformat()
    # Track login for analytics + the cross-portal login history (member_logins).
    await db.members.update_one({"member_id": member["member_id"]}, {"$set": {"last_login": now_iso}})
    await db.member_logins.insert_one({"member_id": member["member_id"],
                                       "membership_number": member.get("membership_number"),
                                       "source": "gem2i", "logged_at": now_iso})
    # MMS usage hook (Phase 3): daily-login points/streaks — the event_key
    # makes one login event per member per UTC day, however often they log in.
    from utils.mms_events import emit_soon
    emit_soon(db, {
        "type": "login",
        "membership_number": member.get("membership_number"),
        "payload": {"source": "main"},
        "event_key": f"login:{member['member_id']}:{now_iso[:10]}",
    })
    token = create_jwt_token(member["member_id"], member["email"], "member")
    return {"token": token, "member": {k: v for k, v in member.items() if k != "password_hash"}}

@router.get("/member/me")
async def member_me(member: dict = Depends(get_current_member)):
    result = {k: v for k, v in member.items() if k != "password_hash"}
    mt_id = member.get("member_type_id")
    if mt_id:
        mt = await db.member_types.find_one({"id": mt_id}, {"_id": 0})
        if mt:
            result["_member_type"] = {
                "name": mt.get("name", ""),
                "allowed_pages": mt.get("allowed_pages", []),
                "permissions": {k: mt.get(k, False) for k in (
                    "corporate", "is_mentor", "portfolio_development", "application_reviewer",
                    "opportunities_development", "opportunities_reviewer", "project_development",
                    "project_reviewer", "project_management", "content_operator",
                )}
            }
    return result

# ---- Invite Codes ----

@router.post("/member/invite-codes/generate")
async def generate_invite_codes(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    count = min(int(body.get("count", 1)), 50)
    prefix = await get_aux_prefix()
    mn = member["membership_number"]
    codes = []
    for _ in range(count):
        short = secrets.token_hex(3)
        code = f"{prefix}-{mn}-{short}"
        doc = {
            "id": str(uuid.uuid4()), "code": code,
            "owner_member_id": member["member_id"],
            "owner_membership_number": mn,
            "owner_membership_id": f"{prefix}-{mn}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used_at": None, "used_by_membership_id": None,
            "used_by_membership_number": None,
            "invitee_first_name": "", "invitee_last_name": "",
            "invitee_email": "", "invitee_phone": "",
            "invitee_gender": "",
            "status": "available"
        }
        await db.invite_codes.insert_one(doc)
        codes.append({k: v for k, v in doc.items() if k != "_id"})
    return codes

@router.get("/member/invite-codes")
async def list_invite_codes(member: dict = Depends(get_current_member)):
    codes = await db.invite_codes.find({"owner_member_id": member["member_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return codes

@router.post("/member/invite-codes/{code_id}/send")
async def send_invite_code(code_id: str, request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    code_doc = await db.invite_codes.find_one({"id": code_id, "owner_member_id": member["member_id"]}, {"_id": 0})
    if not code_doc:
        raise HTTPException(status_code=404, detail="Code not found")
    if code_doc["status"] != "available":
        raise HTTPException(status_code=400, detail="Code already used")
    update = {
        "invitee_first_name": body.get("first_name", ""),
        "invitee_last_name": body.get("last_name", ""),
        "invitee_email": body.get("email", ""),
        "invitee_phone": body.get("phone", ""),
        "invitee_gender": body.get("gender", ""),
    }
    await db.invite_codes.update_one({"id": code_id}, {"$set": update})
    # Try to send email
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings and settings.get("smtp_host") and body.get("email"):
        try:
            # Email links MUST use the canonical Site URL (CMS Settings →
            # General).  We never fall back to the request Origin here
            # because the Origin can be any ingress/cluster preview host —
            # those URLs in emails break the moment the preview URL
            # rotates.  If Site URL isn't set, skip the email send entirely
            # (the invite code itself is still created and shown in the UI).
            from utils.runtime_config import get_site_url
            base = await get_site_url("")  # strict: no Origin fallback
            if not base:
                logger.warning("Skipping invite email: Site URL not configured in CMS → Settings → General.")
            else:
                reg_url = f"{base}/my-account/register?code={code_doc['code']}"
                from utils.email_render import render_and_send
                await render_and_send(
                    "invite_code", settings, body["email"], body.get("first_name", ""),
                    variables={
                        "name": body.get("first_name", ""),
                        "inviter_name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip(),
                        "code": code_doc["code"],
                        "register_link": reg_url,
                    },
                )
        except Exception as e:
            logger.warning(f"Failed to send invite email: {e}")
    return {"message": "Invitation sent", "code": {**code_doc, **update}}

# ---- Public: Validate & Register ----

@router.get("/member/validate-code/{code}")
async def validate_invite_code(code: str):
    doc = await db.invite_codes.find_one({"code": code, "status": "available"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Invalid or used invite code")
    prefix = await get_aux_prefix()
    return {"valid": True, "code": code, "sponsor_membership_id": doc["owner_membership_id"]}

async def upgrade_pre_registered(existing: dict, *, password_hash: str,
                                 first_name: str = "", last_name: str = "",
                                 profile: dict | None = None,
                                 sponsor_id=None, sponsor_membership_number=None,
                                 via: str = "register") -> dict:
    """KMS_CONTENT_TIERS_PLAN Phase 4 (D-2026-63): an applicant whose email
    already exists as a pre_registered subscriber is UPGRADED in place —
    membership number, sponsor, signatures and view history are kept — instead
    of being rejected as a duplicate. The subscriber's original sponsor wins;
    the invite's owner only fills an empty sponsor slot."""
    now = datetime.now(timezone.utc).isoformat()
    upd = {"password_hash": password_hash, "account_status": "active",
           "upgraded_at": now, "upgraded_via": via, "updated_at": now}
    if first_name:
        upd["first_name"] = first_name
    if last_name:
        upd["last_name"] = last_name
    for k, v in (profile or {}).items():
        if v not in (None, ""):
            upd[k] = v
    if not existing.get("sponsor_id") and sponsor_id:
        upd["sponsor_id"] = sponsor_id
        upd["sponsor_membership_number"] = sponsor_membership_number
    await db.members.update_one({"member_id": existing["member_id"]}, {"$set": upd})
    return await db.members.find_one({"member_id": existing["member_id"]}, {"_id": 0})


@router.post("/member/register")
async def register_member(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    from utils.rate_limit import public_form_guard
    await public_form_guard(request, body, key="member_register")
    code_str = body.get("invite_code", "").strip()
    sponsor_number = body.get("sponsor_membership_number")  # QR-based
    sponsor_doc = None
    code_doc = None

    if code_str:
        # Invite code registration
        code_doc = await db.invite_codes.find_one({"code": code_str, "status": "available"}, {"_id": 0})
        if not code_doc:
            raise HTTPException(status_code=400, detail="Invalid or used invite code")
    elif sponsor_number is not None:
        # QR/sponsor-based registration (no invite code needed)
        sponsor_doc = await db.members.find_one({"membership_number": int(sponsor_number)}, {"_id": 0, "password_hash": 0})
        if not sponsor_doc:
            raise HTTPException(status_code=400, detail="Invalid sponsor")
    else:
        raise HTTPException(status_code=400, detail="An invite code or sponsor link is required")

    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = await db.members.find_one({"email": email})
    if existing and (existing.get("account_status") or "active") != "pre_registered":
        raise HTTPException(status_code=400, detail="Email already registered")
    password = body.get("password", "")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    confirm = body.get("confirm_password", "")
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if existing:  # pre_registered subscriber applying — upgrade bridge (Phase 4)
        upgraded = await upgrade_pre_registered(
            existing, password_hash=hash_password(password),
            first_name=body.get("first_name", "").strip(),
            last_name=body.get("last_name", "").strip(),
            profile={k: body.get(k, "") for k in
                     ("gender", "phone", "date_of_birth", "address",
                      "country", "state", "city", "zip_code")},
            sponsor_id=(code_doc or {}).get("owner_member_id")
                or (sponsor_doc or {}).get("member_id"),
            sponsor_membership_number=(code_doc or {}).get("owner_membership_number")
                or (sponsor_doc or {}).get("membership_number"),
            via="register")
        if code_doc:
            await db.invite_codes.update_one({"id": code_doc["id"]}, {"$set": {
                "status": "used",
                "used_at": datetime.now(timezone.utc).isoformat(),
                "used_by_membership_id": upgraded["membership_id"],
                "used_by_membership_number": upgraded["membership_number"],
                "invitee_first_name": upgraded.get("first_name", ""),
                "invitee_last_name": upgraded.get("last_name", ""),
                "invitee_email": email,
                "invitee_gender": body.get("gender", code_doc.get("invitee_gender", "")),
            }})
        _reg_settings = await db.settings.find_one({}, {"_id": 0}) or {}
        background_tasks.add_task(sync_member_to_kms, _reg_settings, upgraded, password)
        if _reg_settings.get("smtp_host"):
            try:
                from utils.email_render import render_and_send
                await render_and_send(
                    "welcome_register", _reg_settings, email,
                    upgraded.get("first_name", ""),
                    variables={"name": upgraded.get("first_name", ""),
                               "last_name": upgraded.get("last_name", ""),
                               "membership_id": upgraded["membership_id"],
                               "username": upgraded.get("username", email)})
            except Exception as e:
                logger.warning(f"Failed to send welcome email: {e}")
        return {"message": "Registration successful",
                "membership_id": upgraded["membership_id"],
                "username": upgraded.get("username", email),
                "token": create_jwt_token(upgraded["member_id"], email, "member"),
                "member": {k: v for k, v in upgraded.items() if k != "password_hash"}}

    membership_number = await get_next_membership_number()
    prefix = await get_aux_prefix()
    membership_id = f"{prefix}-{membership_number}"
    member_id = f"member_{uuid.uuid4().hex[:12]}"
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    username = email
    default_level = await db.member_levels.find_one({}, {"_id": 0, "id": 1}, sort=[("order", 1)])
    default_level_id = default_level["id"] if default_level else None

    # Determine sponsor info
    if code_doc:
        s_id = code_doc["owner_member_id"]
        s_num = code_doc["owner_membership_number"]
    else:
        s_id = sponsor_doc["member_id"]
        s_num = sponsor_doc["membership_number"]

    new_member = {
        "member_id": member_id,
        "membership_number": membership_number,
        "membership_id": membership_id,
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "first_name": first_name, "last_name": last_name,
        "gender": body.get("gender", ""),
        "phone": body.get("phone", ""),
        "date_of_birth": body.get("date_of_birth", ""),
        "address": body.get("address", ""), "country": body.get("country", ""),
        "state": body.get("state", ""), "city": body.get("city", ""),
        "zip_code": body.get("zip_code", ""),
        "google_account": "",
        "avatar": body.get("avatar", ""),
        "summary": "", "biography": "",
        "social_links": [],
        "sponsor_id": s_id,
        "sponsor_membership_number": s_num,
        "mentor_id": None, "mentor_membership_number": None,
        "role": "member",
        "cms_roles": ["role_member"],
        "is_mentor": False,
        "portfolio_development": False,
        "level_id": default_level_id,
        "http_access": body.get("http_access", ""),
        "passport_id": "", "zelle": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.members.insert_one(new_member)
    # Sync to KMS — fire-and-forget, does not block the registration response
    _reg_settings = await db.settings.find_one({}, {"_id": 0}) or {}
    background_tasks.add_task(sync_member_to_kms, _reg_settings, new_member, password)
    # MMS referral hook (Phase 2b) — fire-and-forget; the MMS resolves the
    # affiliate from ?via (mms_via cookie / body) else the sponsor tree.
    from utils.mms_events import emit_mms_event
    background_tasks.add_task(emit_mms_event, db, {
        "type": "referral_signup",
        "membership_number": membership_number,
        "payload": {
            "via": (request.cookies.get("mms_via") or body.get("via") or "").strip(),
            "via_first": (request.cookies.get("mms_via_first") or "").strip(),
            "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else ""),
            "source": "register",
        },
        "event_key": f"signup:{member_id}",
    })
    # Mark invite code as used (only if invite code was used)
    if code_doc:
        await db.invite_codes.update_one({"id": code_doc["id"]}, {"$set": {
        "status": "used",
        "used_at": datetime.now(timezone.utc).isoformat(),
        "used_by_membership_id": membership_id,
        "used_by_membership_number": membership_number,
        "invitee_first_name": first_name or code_doc.get("invitee_first_name", ""),
        "invitee_last_name": last_name or code_doc.get("invitee_last_name", ""),
        "invitee_email": email,
        "invitee_gender": body.get("gender", code_doc.get("invitee_gender", "")),
    }})
    # Send welcome email
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings and settings.get("smtp_host"):
        try:
            from utils.email_render import render_and_send
            await render_and_send(
                "welcome_register", settings, email, first_name,
                variables={
                    "name": first_name,
                    "last_name": last_name,
                    "membership_id": membership_id,
                    "username": username,
                },
            )
        except Exception as e:
            logger.warning(f"Failed to send welcome email: {e}")
    return {
        "message": "Registration successful",
        "membership_id": membership_id,
        "username": username,
        "token": create_jwt_token(member_id, email, "member"),
        "member": {k: v for k, v in new_member.items() if k not in ("password_hash", "_id")}
    }

# ---- My Sponsor ----

@router.get("/member/my-sponsor")
async def get_my_sponsor(member: dict = Depends(get_current_member)):
    if not member.get("sponsor_id"):
        return None
    sponsor = await db.members.find_one({"member_id": member["sponsor_id"]}, {"_id": 0, "password_hash": 0})
    return sponsor

# ---- Mentorship Profile ----

@router.get("/member/my-mentor")
async def get_my_mentor(member: dict = Depends(get_current_member)):
    if not member.get("mentor_id"):
        return None
    mentor = await db.members.find_one({"member_id": member["mentor_id"]}, {"_id": 0, "password_hash": 0})
    return mentor

# ---- My Community (Hierarchical Tree) ----

@router.get("/member/my-community")
async def get_my_community(member: dict = Depends(get_current_member)):
    async def build_tree(member_id, depth=0):
        if depth > 10:
            return []
        children = await db.members.find({"sponsor_id": member_id}, {"_id": 0, "password_hash": 0}).to_list(500)
        result = []
        for child in children:
            subtree = await build_tree(child["member_id"], depth + 1)
            result.append({
                "member_id": child["member_id"],
                "membership_id": child["membership_id"],
                "membership_number": child["membership_number"],
                "first_name": child["first_name"],
                "last_name": child["last_name"],
                "avatar": child.get("avatar", ""),
                "email": child.get("email", ""),
                "phone": child.get("phone", ""),
                "gender": child.get("gender", ""),
                "date_of_birth": child.get("date_of_birth", ""),
                "country": child.get("country", ""),
                "state": child.get("state", ""),
                "city": child.get("city", ""),
                "zip_code": child.get("zip_code", ""),
                "children": subtree
            })
        return result
    tree = await build_tree(member["member_id"])
    total_invites = await db.invite_codes.count_documents({"owner_member_id": member["member_id"]})
    used_invites = await db.invite_codes.count_documents({"owner_member_id": member["member_id"], "status": "used"})
    return {"tree": tree, "total_invites": total_invites, "used_invites": used_invites}

# ---- Update Biography ----

@router.put("/member/biography")
async def update_biography(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    now = datetime.now(timezone.utc).isoformat()
    # Log biography field changes
    for field in ("summary", "biography"):
        old_val = member.get(field, "")
        new_val = body.get(field, "")
        if str(old_val or "") != str(new_val or ""):
            action = "updated" if old_val else "added"
            await db.profile_activities.insert_one({
                "id": str(uuid.uuid4()),
                "member_id": member["member_id"],
                "field": field,
                "action": action,
                "old_value": "",
                "new_value": "(content updated)",
                "timestamp": now,
            })
    await db.members.update_one({"member_id": member["member_id"]}, {"$set": {
        "summary": body.get("summary", ""),
        "biography": body.get("biography", ""),
        "cover_image": body.get("cover_image", ""),
        "updated_at": now
    }})
    return {"message": "Biography updated"}

@router.get("/member/profile-activities")
async def get_profile_activities(member: dict = Depends(get_current_member)):
    activities = await db.profile_activities.find(
        {"member_id": member["member_id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    return activities

# ---- Update Profile ----

@router.put("/member/profile")
async def update_profile(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    allowed = ("first_name", "last_name", "phone", "date_of_birth", "address", "country", "state", "city", "zip_code", "google_account", "gender", "social_links", "avatar", "email", "passport_id")
    update = {k: body[k] for k in allowed if k in body}
    # Sync username with email if email changed
    if "email" in update:
        new_email = update["email"].strip().lower()
        # Check if new email is already used by another member
        existing = await db.members.find_one({"email": new_email, "member_id": {"$ne": member["member_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another member")
        update["email"] = new_email
        update["username"] = new_email
    now = datetime.now(timezone.utc).isoformat()
    update["updated_at"] = now
    # Log individual field changes as profile activities
    skip_activity = ("social_links", "avatar", "updated_at")
    for field in allowed:
        if field in body and field not in skip_activity:
            old_val = member.get(field, "")
            new_val = body[field]
            if str(old_val or "") != str(new_val or ""):
                action = "updated" if old_val else "added"
                await db.profile_activities.insert_one({
                    "id": str(uuid.uuid4()),
                    "member_id": member["member_id"],
                    "field": field,
                    "action": action,
                    "old_value": str(old_val) if old_val else "",
                    "new_value": str(new_val),
                    "timestamp": now,
                })
    await db.members.update_one({"member_id": member["member_id"]}, {"$set": update})
    updated = await db.members.find_one({"member_id": member["member_id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ---- Member File Upload ----

@router.post("/member/upload")
async def member_upload_file(file: UploadFile = File(...), member: dict = Depends(get_current_member)):
    """Upload endpoint accessible to any authenticated member."""
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, GIF, WebP, SVG) allowed")
    max_size = 10 * 1024 * 1024
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    total = 0
    async with aiofiles.open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 64):
            total += len(chunk)
            if total > max_size:
                await f.close()
                filepath.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large (max 10MB)")
            await f.write(chunk)
    return {"url": f"/api/uploads/{filename}", "filename": filename}


@router.post("/member/upload-file")
async def member_upload_document(file: UploadFile = File(...), member: dict = Depends(get_current_member)):
    """Upload endpoint for member documents (PDF, PPT, DOC, images, etc.)."""
    allowed_mimes = {
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/zip", "application/x-zip-compressed",
    }
    # Some browsers (and proxies) send `application/octet-stream` or a generic
    # mime for docx/xlsx/pptx — fall back to checking the extension.
    allowed_exts = {"pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv",
                    "jpg", "jpeg", "png", "gif", "webp", "zip"}
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "").lower()
    if file.content_type not in allowed_mimes and ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type or ext or 'unknown'}")
    max_size = 25 * 1024 * 1024
    if not ext:
        ext = "bin"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    total = 0
    async with aiofiles.open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 64):
            total += len(chunk)
            if total > max_size:
                await f.close()
                filepath.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large (max 25MB)")
            await f.write(chunk)
    return {"url": f"/api/uploads/{filename}", "filename": filename, "original_name": file.filename, "size": total, "content_type": file.content_type}


# ---- Portfolios ----

@router.get("/member/portfolios")
async def list_portfolios(member: dict = Depends(get_current_member)):
    own = await db.portfolios.find({"owner_member_id": member["member_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # Shared portfolios: active only, either shared_mode=all or member is in shared_with
    shared = await db.portfolios.find({
        "owner_member_id": {"$ne": member["member_id"]},
        "status": "active",
        "$or": [
            {"shared_mode": "all"},
            {"shared_with": member["member_id"]},
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"own": own, "shared": shared}

@router.post("/member/portfolios")
async def create_portfolio(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    portfolio = {
        "id": str(uuid.uuid4()),
        "owner_member_id": member["member_id"],
        "owner_membership_id": member["membership_id"],
        "owner_name": f"{member['first_name']} {member['last_name']}",
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "cover_image": body.get("cover_image", ""),
        "as_of_date": body.get("as_of_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "cash_balance": float(body.get("cash_balance", 0)),
        "holdings": body.get("holdings", []),
        "activities": body.get("activities", []),
        "status": body.get("status", "active"),
        "shared_mode": body.get("shared_mode", "all"),
        "shared_with": body.get("shared_with", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolios.insert_one(portfolio)
    return {k: v for k, v in portfolio.items() if k != "_id"}

@router.get("/member/portfolios/{portfolio_id}")
async def get_portfolio(portfolio_id: str, member: dict = Depends(get_current_member)):
    p = await db.portfolios.find_one({"id": portfolio_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    # Owner can always view
    if p["owner_member_id"] == member["member_id"]:
        return p
    # Shared: must be active and either shared_mode=all or member in shared_with
    if p.get("status") == "active" and (p.get("shared_mode") == "all" or member["member_id"] in p.get("shared_with", [])):
        return p
    raise HTTPException(status_code=403, detail="Access denied")

@router.put("/member/portfolios/{portfolio_id}")
async def update_portfolio(portfolio_id: str, request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    p = await db.portfolios.find_one({"id": portfolio_id, "owner_member_id": member["member_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or not owner")
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.portfolios.update_one({"id": portfolio_id}, {"$set": body})
    return await db.portfolios.find_one({"id": portfolio_id}, {"_id": 0})

@router.delete("/member/portfolios/{portfolio_id}")
async def delete_portfolio(portfolio_id: str, member: dict = Depends(get_current_member)):
    p = await db.portfolios.find_one({"id": portfolio_id, "owner_member_id": member["member_id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or not owner")
    await db.portfolios.delete_one({"id": portfolio_id})
    return {"message": "Deleted"}

# ---- Admin: Manage Members ----

@router.get("/admin/members")
async def admin_list_members(user: dict = Depends(require_admin)):
    members = await db.members.find({}, {"_id": 0, "password_hash": 0}).sort("membership_number", 1).to_list(10000)
    # Single source of truth for "is_mentor": derive from the linked member_type.
    # The is_mentor field stored on the member doc is legacy and can drift after
    # a member's type changes — re-derive it here so the Members table always
    # reflects the current type assignment.
    types = await db.member_types.find({}, {"_id": 0, "id": 1, "is_mentor": 1}).to_list(1000)
    type_mentor = {t.get("id"): bool(t.get("is_mentor")) for t in types}
    for m in members:
        mt_id = m.get("member_type_id")
        m["is_mentor"] = type_mentor.get(mt_id, False) if mt_id else False
    return members

@router.post("/admin/members")
async def admin_create_member(request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    existing = await db.members.find_one({"email": email})
    if existing and (existing.get("account_status") or "active") != "pre_registered":
        raise HTTPException(status_code=400, detail="Email already registered")
    if existing:  # admin activates a pre_registered subscriber (Phase 4)
        upgraded = await upgrade_pre_registered(
            existing, password_hash=hash_password(body.get("password", "changeme123")),
            first_name=body.get("first_name", "").strip(),
            last_name=body.get("last_name", "").strip(),
            profile={k: body.get(k) for k in
                     ("gender", "phone", "date_of_birth", "address", "country",
                      "state", "city", "zip_code", "level_id", "member_type_id")},
            sponsor_id=body.get("sponsor_id"),
            sponsor_membership_number=body.get("sponsor_membership_number"),
            via="admin")
        _adm_settings = await db.settings.find_one({}, {"_id": 0}) or {}
        background_tasks.add_task(sync_member_to_kms, _adm_settings, upgraded,
                                  body.get("password", "changeme123"))
        return {k: v for k, v in upgraded.items() if k != "password_hash"}
    membership_number = await get_next_membership_number()
    prefix = await get_aux_prefix()
    membership_id = f"{prefix}-{membership_number}"
    member_id = f"member_{uuid.uuid4().hex[:12]}"
    first_name = body.get("first_name", "").strip()
    last_name = body.get("last_name", "").strip()
    username = email  # username and email are the same
    password = body.get("password", "changeme123")

    # Default to the lowest-order member level (e.g. "Free") so admin-created
    # accounts inherit the same baseline restrictions as members who register
    # via /membership-enrollment or /my-account/register. Without this fallback
    # an empty level_id makes MyAccountLayout unable to filter the sidebar and
    # the new member ends up seeing every section.
    level_id = body.get("level_id")
    if not level_id:
        lowest = await db.member_levels.find_one(
            {}, {"_id": 0, "id": 1}, sort=[("order", 1)]
        )
        level_id = lowest["id"] if lowest else None
    new_member = {
        "member_id": member_id,
        "membership_number": membership_number,
        "membership_id": membership_id,
        "username": username, "email": email,
        "password_hash": hash_password(password),
        "first_name": first_name, "last_name": last_name,
        "gender": body.get("gender", ""),
        "phone": body.get("phone", ""),
        "date_of_birth": body.get("date_of_birth", ""),
        "address": body.get("address", ""), "country": body.get("country", ""),
        "state": body.get("state", ""), "city": body.get("city", ""), "zip_code": body.get("zip_code", ""),
        "google_account": body.get("google_account", ""),
        "avatar": body.get("avatar", ""),
        "summary": "", "biography": "",
        "social_links": body.get("social_links", []),
        "sponsor_id": body.get("sponsor_id", None),
        "sponsor_membership_number": body.get("sponsor_membership_number", None),
        "mentor_id": body.get("mentor_id", None),
        "mentor_membership_number": body.get("mentor_membership_number", None),
        "is_mentor": body.get("is_mentor", False),
        "portfolio_development": body.get("portfolio_development", False),
        "level_id": level_id,
        "role": "member",
        "cms_roles": ["role_member"],
        # New membership fields
        "membership_ranking": body.get("membership_ranking", ""),
        "membership_status": body.get("membership_status", "Free"),
        "active_date": body.get("active_date", ""),
        "expiration_date": body.get("expiration_date", ""),
        "membership_fee": body.get("membership_fee", ""),
        "member_type_id": body.get("member_type_id", ""),
        "corporate": body.get("corporate", False),
        "application_reviewer": body.get("application_reviewer", False),
        "opportunities_development": body.get("opportunities_development", False),
        "opportunities_reviewer": body.get("opportunities_reviewer", False),
        "project_development": body.get("project_development", False),
        "project_reviewer": body.get("project_reviewer", False),
        "project_management": body.get("project_management", False),
        "content_operator": body.get("content_operator", False),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.members.insert_one(new_member)
    # Sync to KMS — fire-and-forget
    _adm_settings = await db.settings.find_one({}, {"_id": 0}) or {}
    background_tasks.add_task(sync_member_to_kms, _adm_settings, new_member, password)
    return {k: v for k, v in new_member.items() if k not in ("password_hash", "_id")}

@router.put("/admin/members/{member_id}")
async def admin_update_member(member_id: str, request: Request, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None)
    body.pop("password_hash", None)
    _plain_password = None
    if "password" in body and body["password"]:
        _plain_password = body.pop("password")
        body["password_hash"] = hash_password(_plain_password)
    else:
        body.pop("password", None)
    if "email" in body:
        body["username"] = body["email"]
    # Resolve mentor_id from mentor_membership_number
    if "mentor_membership_number" in body:
        mn = body["mentor_membership_number"]
        if mn:
            mentor = await db.members.find_one({"membership_number": int(mn)}, {"member_id": 1, "_id": 0})
            body["mentor_id"] = mentor["member_id"] if mentor else None
        else:
            body["mentor_id"] = None
    # Resolve sponsor_id from sponsor_membership_number
    if "sponsor_membership_number" in body:
        sn = body["sponsor_membership_number"]
        if sn:
            sponsor = await db.members.find_one({"membership_number": int(sn)}, {"member_id": 1, "_id": 0})
            body["sponsor_id"] = sponsor["member_id"] if sponsor else None
        else:
            body["sponsor_id"] = None
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    _prev_status = None
    if "account_status" in body:
        _prev = await db.members.find_one({"member_id": member_id},
                                          {"_id": 0, "account_status": 1})
        _prev_status = (_prev or {}).get("account_status")
    await db.members.update_one({"member_id": member_id}, {"$set": body})
    # Member Points (D-2026-57): a KMS-share referral becoming active pays the
    # sponsor's activation bonus. Idempotency key = once ever per member, even
    # if the status later flip-flops. This is the single pre_registered→active
    # choke point today; the future self-serve bridge must route through it too.
    if body.get("account_status") == "active" and _prev_status == "pre_registered":
        _act = await db.members.find_one(
            {"member_id": member_id},
            {"_id": 0, "sponsor_membership_number": 1, "registration_source": 1})
        if (_act and _act.get("sponsor_membership_number") is not None
                and _act.get("registration_source") == "kms_share"):
            from utils import points as member_points
            await member_points.award(
                db, action="referral_activation",
                membership_number=_act["sponsor_membership_number"],
                ref={"referred_member_id": member_id},
                key=f"activation:{member_id}")
    if _plain_password:
        updated = await db.members.find_one({"member_id": member_id}, {"_id": 0, "email": 1})
        if updated:
            _upd_settings = await db.settings.find_one({}, {"_id": 0}) or {}
            background_tasks.add_task(push_password_to_kms, _upd_settings, updated["email"], _plain_password)
    # Propagate account_status to the KMS so deactivation blocks KMS login too.
    if "account_status" in body:
        _st = await db.members.find_one({"member_id": member_id}, {"_id": 0, "email": 1})
        if _st and _st.get("email"):
            _st_settings = await db.settings.find_one({}, {"_id": 0}) or {}
            background_tasks.add_task(push_status_to_kms, _st_settings, _st["email"], body["account_status"])
    return await db.members.find_one({"member_id": member_id}, {"_id": 0, "password_hash": 0})

@router.delete("/admin/members/{member_id}")
async def admin_delete_member(member_id: str, user: dict = Depends(require_admin)):
    await db.members.delete_one({"member_id": member_id})
    await db.invite_codes.delete_many({"owner_member_id": member_id})
    return {"message": "Member deleted"}

@router.get("/admin/members/{member_id}")
async def admin_get_member(member_id: str, user: dict = Depends(require_admin)):
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@router.get("/admin/members/{member_id}/signatures")
async def admin_member_signatures(member_id: str, user: dict = Depends(require_admin)):
    """Full disclaimer-acceptance / signing history for a member (news subscribe gate).
    One row per acceptance — newest first. Matched by member_id OR the member's email."""
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    ors = [{"member_id": member_id}]
    if member.get("email"):
        ors.append({"email": member["email"]})
    signatures = await db.signatures.find({"$or": ors}, {"_id": 0}).sort("signed_at", -1).to_list(1000)
    return {
        "member": {
            "member_id": member.get("member_id"),
            "membership_id": member.get("membership_id"),
            "membership_number": member.get("membership_number"),
            "first_name": member.get("first_name"),
            "last_name": member.get("last_name"),
            "email": member.get("email"),
            "account_status": _display_status(member),
        },
        "signatures": signatures,
    }


@router.get("/admin/members/{member_id}/logins")
async def admin_member_logins(member_id: str, user: dict = Depends(require_admin)):
    """Cross-portal login / access history for a member (main, frontend, news, KMS).
    One row per login event — newest first."""
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    logins = await db.member_logins.find({"member_id": member_id}, {"_id": 0}).sort("logged_at", -1).to_list(2000)
    return {
        "member": {
            "member_id": member.get("member_id"),
            "membership_id": member.get("membership_id"),
            "membership_number": member.get("membership_number"),
            "first_name": member.get("first_name"),
            "last_name": member.get("last_name"),
            "email": member.get("email"),
            "account_status": _display_status(member),
        },
        "logins": logins,
    }

# Admin: Mentor management
@router.put("/admin/members/{member_id}/mentor")
async def admin_assign_mentor(member_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    mentor_member_id = body.get("mentor_id")
    mentor_membership_number = body.get("mentor_membership_number")
    await db.members.update_one({"member_id": member_id}, {"$set": {
        "mentor_id": mentor_member_id,
        "mentor_membership_number": mentor_membership_number,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"message": "Mentor assigned"}


@router.get("/admin/mentors")
async def admin_get_mentors(user: dict = Depends(require_admin)):
    """Get members whose member_type has is_mentor=true."""
    mentor_types = await db.member_types.find({"is_mentor": True}, {"_id": 0, "id": 1}).to_list(100)
    mentor_type_ids = [t["id"] for t in mentor_types]
    if not mentor_type_ids:
        return []
    members = await db.members.find(
        {"member_type_id": {"$in": mentor_type_ids}},
        {"_id": 0, "password_hash": 0}
    ).sort("membership_number", 1).to_list(10000)
    return members


@router.get("/member/available-mentors")
async def member_get_available_mentors(member: dict = Depends(get_current_member)):
    """Get available mentors for My Account mentor selection."""
    mentor_types = await db.member_types.find({"is_mentor": True}, {"_id": 0, "id": 1}).to_list(100)
    mentor_type_ids = [t["id"] for t in mentor_types]
    if not mentor_type_ids:
        return []
    members = await db.members.find(
        {"member_type_id": {"$in": mentor_type_ids}, "member_id": {"$ne": member["member_id"]}},
        {"_id": 0, "member_id": 1, "membership_number": 1, "membership_id": 1, "first_name": 1, "last_name": 1, "avatar": 1, "email": 1, "phone": 1, "address": 1, "country": 1, "state": 1, "city": 1, "zip_code": 1, "date_of_birth": 1}
    ).sort("membership_number", 1).to_list(10000)
    return members


# ---- Sectors / Industries / Companies ----

@router.get("/member/sectors")
async def list_sectors():
    return await db.sectors.find({}, {"_id": 0}).sort("name", 1).to_list(500)

@router.get("/member/industries")
async def list_industries(sector_id: str = None):
    query = {"sector_id": sector_id} if sector_id else {}
    return await db.industries.find(query, {"_id": 0}).sort("name", 1).to_list(500)

@router.get("/member/companies")
async def list_companies(industry_id: str = None):
    query = {"industry_id": industry_id} if industry_id else {}
    return await db.companies.find(query, {"_id": 0}).sort("symbol", 1).to_list(500)

@router.get("/member/members-list")
async def members_list_for_sharing(member: dict = Depends(get_current_member)):
    """List members for portfolio sharing select."""
    members = await db.members.find(
        {"member_id": {"$ne": member["member_id"]}, "role": {"$ne": "admin"}},
        {"_id": 0, "member_id": 1, "membership_id": 1, "first_name": 1, "last_name": 1}
    ).sort("membership_number", 1).to_list(10000)
    return members


# ---- Countries / States / Cities ----

@router.get("/geo/countries")
async def list_countries():
    return await db.countries.find({}, {"_id": 0}).sort("name", 1).to_list(500)

@router.get("/geo/states")
async def list_states(country_id: str = None):
    query = {"country_id": country_id} if country_id else {}
    return await db.states.find(query, {"_id": 0}).sort("name", 1).to_list(5000)

@router.get("/geo/cities")
async def list_cities(state_id: str = None):
    query = {"state_id": state_id} if state_id else {}
    return await db.cities.find(query, {"_id": 0}).sort("name", 1).to_list(10000)

# ---- Admin Geo Management ----

@router.post("/admin/geo/countries")
async def admin_create_country(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    doc = {"id": str(uuid.uuid4()), "name": body.get("name", ""), "code": body.get("code", ""), "alpha3": body.get("alpha3", "")}
    await db.countries.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/admin/geo/countries/{cid}")
async def admin_update_country(cid: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None); body.pop("id", None)
    await db.countries.update_one({"id": cid}, {"$set": body})
    return await db.countries.find_one({"id": cid}, {"_id": 0})

@router.delete("/admin/geo/countries/{cid}")
async def admin_delete_country(cid: str, user: dict = Depends(require_admin)):
    await db.countries.delete_one({"id": cid})
    await db.states.delete_many({"country_id": cid})
    await db.cities.delete_many({"country_id": cid})
    return {"success": True}

@router.post("/admin/geo/states")
async def admin_create_state(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    doc = {"id": str(uuid.uuid4()), "name": body.get("name", ""), "code": body.get("code", ""), "country_id": body.get("country_id", ""), "country_code": body.get("country_code", "")}
    await db.states.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/admin/geo/states/{sid}")
async def admin_update_state(sid: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None); body.pop("id", None)
    await db.states.update_one({"id": sid}, {"$set": body})
    return await db.states.find_one({"id": sid}, {"_id": 0})

@router.delete("/admin/geo/states/{sid}")
async def admin_delete_state(sid: str, user: dict = Depends(require_admin)):
    await db.states.delete_one({"id": sid})
    await db.cities.delete_many({"state_id": sid})
    return {"success": True}

@router.post("/admin/geo/cities")
async def admin_create_city(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    doc = {"id": str(uuid.uuid4()), "name": body.get("name", ""), "state_id": body.get("state_id", ""), "country_id": body.get("country_id", ""), "country_code": body.get("country_code", "")}
    await db.cities.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/admin/geo/cities/{city_id}")
async def admin_update_city(city_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None); body.pop("id", None)
    await db.cities.update_one({"id": city_id}, {"$set": body})
    return await db.cities.find_one({"id": city_id}, {"_id": 0})

@router.delete("/admin/geo/cities/{city_id}")
async def admin_delete_city(city_id: str, user: dict = Depends(require_admin)):
    await db.cities.delete_one({"id": city_id})
    return {"success": True}

# ---- Member Levels ----

@router.get("/admin/member-levels")
async def admin_list_levels(user: dict = Depends(require_admin)):
    return await db.member_levels.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.post("/admin/member-levels")
async def admin_create_level(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    level = {
        "id": str(uuid.uuid4()),
        "name": body.get("name", ""),
        "permissions": body.get("permissions", []),
        "quick_link_permissions": body.get("quick_link_permissions", []),
        "order": body.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.member_levels.insert_one(level)
    return {k: v for k, v in level.items() if k != "_id"}

@router.put("/admin/member-levels/{level_id}")
async def admin_update_level(level_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.member_levels.update_one({"id": level_id}, {"$set": body})
    return await db.member_levels.find_one({"id": level_id}, {"_id": 0})

@router.delete("/admin/member-levels/{level_id}")
async def admin_delete_level(level_id: str, user: dict = Depends(require_admin)):
    await db.member_levels.delete_one({"id": level_id})
    return {"message": "Level deleted"}

@router.get("/member/my-level")
async def get_my_level(member: dict = Depends(get_current_member)):
    level_id = member.get("level_id")
    if not level_id:
        return None
    level = await db.member_levels.find_one({"id": level_id}, {"_id": 0})
    return level


# ---- Change Password ----

@router.put("/member/change-password")
async def member_change_password(request: Request, background_tasks: BackgroundTasks, member: dict = Depends(get_current_member)):
    body = await request.json()
    new_password = body.get("new_password", "")
    confirm = body.get("confirm_password", "")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if new_password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    await db.members.update_one(
        {"member_id": member["member_id"]},
        {"$set": {"password_hash": hash_password(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    _pw_settings = await db.settings.find_one({}, {"_id": 0}) or {}
    background_tasks.add_task(push_password_to_kms, _pw_settings, member["email"], new_password)
    return {"message": "Password changed successfully"}


# ---- Membership Settings (Admin) ----

@router.get("/admin/membership-settings")
async def get_membership_settings(user: dict = Depends(require_admin)):
    doc = await db.membership_settings.find_one({}, {"_id": 0})
    return doc or {"mandatory_fields": []}

@router.put("/admin/membership-settings")
async def update_membership_settings(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    update = {"mandatory_fields": body.get("mandatory_fields", []), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.membership_settings.update_one({}, {"$set": update}, upsert=True)
    return await db.membership_settings.find_one({}, {"_id": 0})

@router.get("/public/membership-settings")
async def get_public_membership_settings():
    doc = await db.membership_settings.find_one({}, {"_id": 0})
    return doc or {"mandatory_fields": []}


# ---- Ebank ----

EBANK_FIELDS = [
    "investment_amount", "additional_capital", "investment_goal",
    "monthly_savings", "deposit_date", "target_date",
    "credit_limit", "credit_debt", "risk_level", "finance_involvement",
    "investment_safety", "financial_independence_age",
    "rate_of_return", "investment_duration", "own_business", "projects",
]

@router.get("/member/ebank")
async def get_my_ebank(member: dict = Depends(get_current_member)):
    doc = await db.ebank.find_one({"member_id": member["member_id"]}, {"_id": 0})
    return doc or {"member_id": member["member_id"]}

@router.put("/member/ebank")
async def update_my_ebank(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    mid = member["member_id"]
    existing = await db.ebank.find_one({"member_id": mid}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()

    update = {k: body[k] for k in EBANK_FIELDS if k in body}
    update["member_id"] = mid
    update["updated_at"] = now

    # Log individual field changes as activities
    for field in EBANK_FIELDS:
        if field in body:
            old_val = existing.get(field, "") if existing else ""
            new_val = body[field]
            if str(old_val) != str(new_val):
                action = "updated" if old_val else "added"
                await db.ebank_activities.insert_one({
                    "id": str(uuid.uuid4()),
                    "member_id": mid,
                    "field": field,
                    "action": action,
                    "old_value": str(old_val) if old_val else "",
                    "new_value": str(new_val),
                    "timestamp": now,
                })

    await db.ebank.update_one({"member_id": mid}, {"$set": update}, upsert=True)
    return await db.ebank.find_one({"member_id": mid}, {"_id": 0})

@router.get("/member/ebank/activities")
async def get_my_ebank_activities(member: dict = Depends(get_current_member)):
    activities = await db.ebank_activities.find(
        {"member_id": member["member_id"]}, {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    return activities

@router.get("/admin/members/{member_id}/ebank")
async def admin_get_member_ebank(member_id: str, user: dict = Depends(require_admin)):
    doc = await db.ebank.find_one({"member_id": member_id}, {"_id": 0})
    return doc or {"member_id": member_id}


# ---- QR / Business Card ----

@router.post("/member/generate-qr")
async def generate_member_qr(request: Request, member: dict = Depends(get_current_member)):
    """Generate QR code for sponsor-based registration.

    The encoded URL MUST be the canonical Site URL configured in CMS →
    Settings → General. We never fall back to the request Origin or to
    the frontend-supplied `base_url` — those values are typically the
    a local dev host or a cluster ingress, which would bake an
    impermanent URL into the QR code printed on business cards / shared
    by sponsors.  If Site URL isn't set the endpoint returns 400 so the
    operator gets an immediate, actionable error.
    """
    from utils.runtime_config import get_site_url
    base_url = await get_site_url("")  # strict: ignore Origin / base_url
    if not base_url:
        raise HTTPException(
            status_code=400,
            detail="Site URL is not configured. Open CMS → Settings → General and set the Site URL (e.g. https://yourdomain.com) before generating QR codes.",
        )
    reg_url = f"{base_url}/my-account/register?sponsor={member['membership_number']}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(reg_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.read()).decode()
    qr_data_url = f"data:image/png;base64,{qr_b64}"
    # Store QR in member document
    await db.members.update_one(
        {"member_id": member["member_id"]},
        {"$set": {"qr_code": qr_data_url, "qr_url": reg_url, "qr_generated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"qr_code": qr_data_url, "qr_url": reg_url}

@router.post("/admin/members/{member_id}/generate-qr")
async def admin_generate_member_qr(member_id: str, request: Request, user: dict = Depends(require_admin)):
    """Admin generates QR for a member.  Strict Site URL — same reasoning
    as the member-side endpoint."""
    from utils.runtime_config import get_site_url
    base_url = await get_site_url("")  # strict
    if not base_url:
        raise HTTPException(
            status_code=400,
            detail="Site URL is not configured. Open CMS → Settings → General and set the Site URL before generating QR codes.",
        )
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    reg_url = f"{base_url}/my-account/register?sponsor={member['membership_number']}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(reg_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.read()).decode()
    qr_data_url = f"data:image/png;base64,{qr_b64}"
    await db.members.update_one(
        {"member_id": member_id},
        {"$set": {"qr_code": qr_data_url, "qr_url": reg_url, "qr_generated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"qr_code": qr_data_url, "qr_url": reg_url}

@router.get("/public/via/{code}")
async def public_via(code: str):
    """Referred-visitor personalization (MMS plan §3.4 pop-ups/banners): the
    landing banner resolves 'who invited you' from an aux code. First name +
    last initial only — no other member data leaves."""
    tail = (code or "").strip().rsplit("-", 1)[-1]
    if not tail.isdigit():
        raise HTTPException(status_code=404, detail="Unknown code")
    m = await db.members.find_one({"membership_number": int(tail)},
                                  {"first_name": 1, "last_name": 1, "account_status": 1})
    if not m or m.get("account_status") == "deactivated":
        raise HTTPException(status_code=404, detail="Unknown code")
    first = (m.get("first_name") or "").strip()
    last = (m.get("last_name") or "").strip()
    name = f"{first} {last[0]}." if first and last else (first or "A member")
    return {"name": name}


@router.get("/member/validate-sponsor/{membership_number}")
async def validate_sponsor(membership_number: int):
    """Validate a sponsor by membership number for QR-based registration."""
    member = await db.members.find_one({"membership_number": membership_number}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    return {"valid": True, "sponsor_membership_id": member.get("membership_id", ""), "sponsor_name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip()}


# ---- My Account Quick Links ----

@router.get("/public/myaccount-links")
async def get_myaccount_links(request: Request):
    """Public: return active quick links for My Account header.

    Links flagged `pms_role_required` (the AUX Projects / PMS quick link) are
    served ONLY to admins and members holding the Operator or Contributor
    platform role — plain Members never receive them in the payload
    (server-side authority; PMS_ROLES_POINTS_PLAN Phase 1)."""
    links = await db.myaccount_links.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    member = None
    member_resolved = False

    async def _member():
        nonlocal member, member_resolved
        if not member_resolved:
            member_resolved = True
            try:
                member = await get_current_member(request)
            except HTTPException:
                member = None
        return member

    if any(l.get("pms_role_required") for l in links):
        from utils.pms_roles import pms_role_for
        if pms_role_for(await _member()) is None:
            links = [l for l in links if not l.get("pms_role_required")]
    # LMS quick link — same server-side authority pattern (LMS_MIGRATION_PLAN Phase 0):
    # only admins / role_lms_manager / role_lms_instructor receive it.
    if any(l.get("lms_role_required") for l in links):
        from utils.lms_roles import lms_role_for
        if lms_role_for(await _member()) is None:
            links = [l for l in links if not l.get("lms_role_required")]
    # MMS quick link — same pattern (MMS_MARKETING_MANAGEMENT_PLAN Phase 0):
    # only admins / role_mms_manager receive it during dev.
    if any(l.get("mms_role_required") for l in links):
        from utils.mms_roles import mms_role_for
        if mms_role_for(await _member()) is None:
            links = [l for l in links if not l.get("mms_role_required")]
    return links


@router.get("/admin/myaccount-links")
async def admin_list_myaccount_links(user: dict = Depends(require_admin)):
    links = await db.myaccount_links.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return links


@router.post("/admin/myaccount-links")
async def admin_create_myaccount_link(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["id"] = str(uuid.uuid4())
    body.setdefault("active", True)
    body.setdefault("new_tab", False)
    body.setdefault("url", "#")
    body.setdefault("label", "New Link")
    max_order = await db.myaccount_links.find_one({}, sort=[("order", -1)])
    body["order"] = (max_order["order"] + 1) if max_order else 1
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.myaccount_links.insert_one(body)
    return await db.myaccount_links.find_one({"id": body["id"]}, {"_id": 0})


@router.put("/admin/myaccount-links/{link_id}")
async def admin_update_myaccount_link(link_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.myaccount_links.update_one({"id": link_id}, {"$set": body})
    return await db.myaccount_links.find_one({"id": link_id}, {"_id": 0})


@router.delete("/admin/myaccount-links/{link_id}")
async def admin_delete_myaccount_link(link_id: str, user: dict = Depends(require_admin)):
    await db.myaccount_links.delete_one({"id": link_id})
    return {"success": True}


@router.put("/admin/myaccount-links-reorder")
async def admin_reorder_myaccount_links(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    ordered_ids = body.get("ordered_ids", [])
    for idx, lid in enumerate(ordered_ids):
        await db.myaccount_links.update_one({"id": lid}, {"$set": {"order": idx + 1}})
    return {"success": True}


# ---- My Account Navigation (ordering + visibility of built-in sidebar items) ----

# Built-in nav catalog — the IDs MUST match the ids used in MyAccountLayout.js/ALL_NAV_ITEMS
MYACCOUNT_NAV_CATALOG = [
    {"id": "membership-profile",  "label": "Membership Profile"},
    {"id": "mentorship-profile",  "label": "Mentorship Profile"},
    {"id": "my-sponsor",          "label": "My Sponsor"},
    {"id": "ebank",               "label": "My Ebank"},
    {"id": "invite-code",         "label": "Invite Code"},
    {"id": "my-community",        "label": "My Community"},
    {"id": "portfolios",          "label": "Portfolios"},
    {"id": "global-calendar",     "label": "AUX Calendar"},
    {"id": "mentorship-calendar", "label": "My Calendar"},
    {"id": "earnings",            "label": "Earnings"},
    {"id": "bundles",             "label": "Session Bundles"},
    {"id": "my-bookings",         "label": "My Reservations"},
    {"id": "calendar-sync",       "label": "Calendar Sync"},
]


async def seed_myaccount_nav():
    """Seed ordered nav rows once, and backfill any new built-in items added later."""
    existing = await db.myaccount_nav.find({}, {"_id": 0}).to_list(100)
    existing_ids = {e.get("id") for e in existing}
    next_order = (max([e.get("order", 0) for e in existing]) + 1) if existing else 1
    for item in MYACCOUNT_NAV_CATALOG:
        if item["id"] in existing_ids:
            continue
        await db.myaccount_nav.insert_one({
            "id": item["id"],
            "label": item["label"],
            "order": next_order,
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        next_order += 1


@router.get("/public/myaccount-nav")
async def get_myaccount_nav():
    """Public: ordered list of My Account nav items (includes hidden rows so frontend can honour visibility)."""
    await seed_myaccount_nav()
    items = await db.myaccount_nav.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items


@router.get("/admin/myaccount-nav")
async def admin_list_myaccount_nav(user: dict = Depends(require_admin)):
    await seed_myaccount_nav()
    items = await db.myaccount_nav.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items


@router.put("/admin/myaccount-nav/{item_id}")
async def admin_update_myaccount_nav(item_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    update = {}
    if "visible" in body:
        update["visible"] = bool(body["visible"])
    if "label" in body and isinstance(body["label"], str) and body["label"].strip():
        update["label"] = body["label"].strip()
    if not update:
        raise HTTPException(status_code=400, detail="No editable fields supplied")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.myaccount_nav.update_one({"id": item_id}, {"$set": update})
    return await db.myaccount_nav.find_one({"id": item_id}, {"_id": 0})


@router.put("/admin/myaccount-nav-reorder")
async def admin_reorder_myaccount_nav(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    ordered_ids = body.get("ordered_ids", [])
    for idx, nid in enumerate(ordered_ids):
        await db.myaccount_nav.update_one({"id": nid}, {"$set": {"order": idx + 1}})
    return {"success": True}
