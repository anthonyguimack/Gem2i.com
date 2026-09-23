from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from models.database import db, hash_password, verify_password, create_jwt_token, send_email_smtp, require_admin, logger
from utils.kms_sync import sync_member_to_kms
from datetime import datetime, timezone
import uuid

router = APIRouter()

# ── Default fields seeded on first run ──
DEFAULT_FIELDS = [
    # Step 1
    {'step': 1, 'field_key': 'invite_code', 'label': 'Invite Code', 'field_type': 'text', 'placeholder': '', 'tooltip': 'Enter the invitation code shared with you', 'required': True, 'visible': True, 'order': 1, 'options': [], 'icon': 'gift'},
    {'step': 1, 'field_key': 'email', 'label': 'Email', 'field_type': 'email', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 2, 'options': [], 'icon': 'mail'},
    {'step': 1, 'field_key': 'first_name', 'label': 'Firstname', 'field_type': 'text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 3, 'options': [], 'icon': 'user'},
    {'step': 1, 'field_key': 'last_name', 'label': 'Lastname', 'field_type': 'text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 4, 'options': [], 'icon': 'user'},
    {'step': 1, 'field_key': 'password', 'label': 'Password', 'field_type': 'password', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 5, 'options': [], 'icon': 'lock'},
    {'step': 1, 'field_key': 'confirm_password', 'label': 'Re-Type Password', 'field_type': 'password', 'placeholder': '', 'tooltip': 'Confirm your password', 'required': True, 'visible': True, 'order': 6, 'options': [], 'icon': 'lock'},
    # Step 2
    {'step': 2, 'field_key': 'gender', 'label': 'Gender', 'field_type': 'radio', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 1, 'options': ['Male', 'Female'], 'icon': ''},
    {'step': 2, 'field_key': 'country', 'label': 'Country', 'field_type': 'country', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 2, 'options': [], 'icon': ''},
    {'step': 2, 'field_key': 'state', 'label': 'State', 'field_type': 'state', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 3, 'options': [], 'icon': ''},
    {'step': 2, 'field_key': 'city', 'label': 'City', 'field_type': 'city', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 4, 'options': [], 'icon': ''},
    {'step': 2, 'field_key': 'address', 'label': 'Home Address', 'field_type': 'text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 5, 'options': [], 'icon': 'map-pin'},
    {'step': 2, 'field_key': 'zip_code', 'label': 'ZIP Code', 'field_type': 'text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 6, 'options': [], 'icon': 'hash'},
    {'step': 2, 'field_key': 'phone', 'label': 'Phone Number', 'field_type': 'text', 'placeholder': '', 'tooltip': 'International format', 'required': True, 'visible': True, 'order': 7, 'options': [], 'icon': 'phone'},
    {'step': 2, 'field_key': 'date_of_birth', 'label': 'Date of Birth', 'field_type': 'date', 'placeholder': 'yyyy-mm-dd', 'tooltip': '', 'required': True, 'visible': True, 'order': 8, 'options': [], 'icon': 'calendar'},
    # Step 3
    {'step': 3, 'field_key': 'agree_terms', 'label': 'Terms of Service & Privacy Policy', 'field_type': 'legal_checkbox', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 1, 'options': ["By submitting this application I confirm that the information provided is accurate and I accept the platform's Terms of Service and Privacy Policy. My personal data will be used only to manage my membership."], 'icon': ''},
    {'step': 3, 'field_key': 'signature_first_name', 'label': 'First Name', 'field_type': 'signature_text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 2, 'options': [], 'icon': ''},
    {'step': 3, 'field_key': 'signature_last_name', 'label': 'Last Name', 'field_type': 'signature_text', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 3, 'options': [], 'icon': ''},
    {'step': 3, 'field_key': 'signature_date', 'label': 'Date', 'field_type': 'signature_date', 'placeholder': '', 'tooltip': '', 'required': True, 'visible': True, 'order': 4, 'options': [], 'icon': ''},
    # Step 4
    {'step': 4, 'field_key': 'confirm_message', 'label': 'Confirmation Message', 'field_type': 'richtext', 'placeholder': '', 'tooltip': '', 'required': False, 'visible': True, 'order': 1, 'options': ['<h2 style="text-align:center">Thank you for entering your information</h2><p style="text-align:center">Thank you for entering your information on our membership application form. To finish the subscription process, please click <strong>SUBMIT</strong>.</p>'], 'icon': ''},
]


async def seed_enrollment_fields():
    count = await db.enrollment_fields.count_documents({})
    if count == 0:
        for f in DEFAULT_FIELDS:
            f["id"] = str(uuid.uuid4())
            f["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.enrollment_fields.insert_many(DEFAULT_FIELDS)
        logger.info(f"Seeded {len(DEFAULT_FIELDS)} enrollment fields")
        return
    # Ensure Step 4 confirm_message field exists
    step4 = await db.enrollment_fields.find_one({"field_key": "confirm_message", "step": 4})
    if not step4:
        step4_field = [f for f in DEFAULT_FIELDS if f["field_key"] == "confirm_message"][0]
        step4_field["id"] = str(uuid.uuid4())
        step4_field["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.enrollment_fields.insert_one(step4_field)
        logger.info("Added Step 4 confirm_message field")


# ── Public endpoints ──

@router.get("/public/enrollment-fields")
async def get_enrollment_fields():
    """Return visible fields grouped by step for the public form."""
    fields = await db.enrollment_fields.find({"visible": True}, {"_id": 0}).sort("order", 1).to_list(200)
    return fields


@router.post("/public/enrollment/validate-code")
async def validate_enrollment_code(request: Request):
    body = await request.json()
    code = body.get("code", "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Invite code is required")
    doc = await db.invite_codes.find_one({"code": code, "status": "available"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or already used invite code")
    return {"valid": True, "sponsor_membership_id": doc.get("owner_membership_id", "")}


@router.post("/public/enrollment/check-email")
async def check_enrollment_email(request: Request):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing = await db.members.find_one({"email": email})
    if existing and (existing.get("account_status") or "active") != "pre_registered":
        raise HTTPException(status_code=400, detail="Email already registered")
    # a pre_registered subscriber MAY apply — their member doc is upgraded in
    # place at submit (KMS_CONTENT_TIERS_PLAN Phase 4)
    return {"available": True, "upgrade": bool(existing)}


@router.post("/public/enrollment/submit")
async def submit_enrollment(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    # Rate-limit only — no captcha on the multi-step enrollment form per
    # operator preference (the funnel is long enough that bots rarely make
    # it to step 4 and a captcha here adds friction for serious applicants).
    from utils.rate_limit import enforce_rate_limit
    await enforce_rate_limit(request, key="enrollment_submit", max_requests=5, window_seconds=60)
    form_data = body.get("form_data", {})
    email = form_data.get("email", "").strip().lower()
    password = form_data.get("password", "")
    confirm = form_data.get("confirm_password", "")
    first_name = form_data.get("first_name", "").strip()
    last_name = form_data.get("last_name", "").strip()
    invite_code = form_data.get("invite_code", "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = await db.members.find_one({"email": email})
    if existing and (existing.get("account_status") or "active") != "pre_registered":
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate invite code
    code_doc = None
    if invite_code:
        code_doc = await db.invite_codes.find_one({"code": invite_code, "status": "available"}, {"_id": 0})
        if not code_doc:
            raise HTTPException(status_code=400, detail="Invalid or used invite code")

    if existing:  # pre_registered subscriber applying — upgrade bridge (Phase 4)
        from routes.membership import upgrade_pre_registered
        upgraded = await upgrade_pre_registered(
            existing, password_hash=hash_password(password),
            first_name=first_name, last_name=last_name,
            profile={k: form_data.get(k, "") for k in
                     ("gender", "phone", "date_of_birth", "address",
                      "country", "state", "city", "zip_code")},
            sponsor_id=(code_doc or {}).get("owner_member_id"),
            sponsor_membership_number=(code_doc or {}).get("owner_membership_number"),
            via="enrollment")
        _enr_settings = await db.settings.find_one({}, {"_id": 0}) or {}
        background_tasks.add_task(sync_member_to_kms, _enr_settings, upgraded, password)
        # MMS referral hook (Phase 2b) — fire-and-forget
        from utils.mms_events import emit_mms_event
        background_tasks.add_task(emit_mms_event, db, {
            "type": "referral_signup",
            "membership_number": upgraded.get("membership_number"),
            "payload": {
                "via": (request.cookies.get("mms_via") or "").strip(),
                "via_first": (request.cookies.get("mms_via_first") or "").strip(),
                "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else ""),
                "source": "enrollment_upgrade",
            },
            "event_key": f"signup:{upgraded['member_id']}",
        })
        # Welcome bonus — the NEW member earns for activating (self-reward, distinct
        # from the referral funnel which credits the sponsor). Anthony 2026-08-14.
        background_tasks.add_task(emit_mms_event, db, {
            "type": "welcome_activated",
            "membership_number": upgraded.get("membership_number"),
            "mid": str(upgraded.get("_id")) if upgraded.get("_id") else None,
            "payload": {"source": "enrollment_upgrade"},
            "event_key": f"welcome:{upgraded['member_id']}",
        })
        await db.enrollment_applications.insert_one({
            "id": str(uuid.uuid4()),
            "member_id": upgraded["member_id"],
            "email": email,
            "form_data": {k: v for k, v in form_data.items()
                          if k not in ("password", "confirm_password")},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        if code_doc:
            await db.invite_codes.update_one({"code": invite_code}, {"$set": {
                "status": "used",
                "used_at": datetime.now(timezone.utc).isoformat(),
                "used_by_member_id": upgraded["member_id"],
                "used_by_membership_id": upgraded["membership_id"],
                "used_by_membership_number": upgraded["membership_number"],
                "invitee_first_name": first_name,
                "invitee_last_name": last_name,
                "invitee_email": email,
                "invitee_gender": form_data.get("gender", ""),
            }})
        try:
            settings = await db.settings.find_one({}, {"_id": 0})
            from utils.email_render import render_and_send
            await render_and_send(
                "welcome_enrollment", settings or {}, email, first_name,
                variables={"first_name": first_name, "last_name": last_name,
                           "email": email, "password": password,
                           "membership_id": upgraded["membership_id"]})
        except Exception as e:
            logger.warning(f"Failed to send enrollment email: {e}")
        return {"success": True,
                "token": create_jwt_token(upgraded["member_id"], email, "member"),
                "member": {k: v for k, v in upgraded.items() if k != "password_hash"}}

    # Get membership number
    from routes.membership import get_next_membership_number, get_aux_prefix, insert_member_with_retry
    membership_number = await get_next_membership_number()
    prefix = await get_aux_prefix()
    membership_id = f"{prefix}-{membership_number}"
    member_id = f"member_{uuid.uuid4().hex[:12]}"

    # Get default level (Level 1 = lowest order)
    default_level = await db.member_levels.find_one({}, {"_id": 0, "id": 1}, sort=[("order", 1)])
    default_level_id = default_level["id"] if default_level else None

    # Sponsor info
    sponsor_id = code_doc["owner_member_id"] if code_doc else None
    sponsor_membership_number = code_doc["owner_membership_number"] if code_doc else None

    new_member = {
        "member_id": member_id,
        "membership_number": membership_number,
        "membership_id": membership_id,
        "username": email,
        "email": email,
        "password_hash": hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "gender": form_data.get("gender", ""),
        "phone": form_data.get("phone", ""),
        "date_of_birth": form_data.get("date_of_birth", ""),
        "address": form_data.get("address", ""),
        "country": form_data.get("country", ""),
        "state": form_data.get("state", ""),
        "city": form_data.get("city", ""),
        "zip_code": form_data.get("zip_code", ""),
        "level_id": default_level_id,
        "member_type_id": None,
        "sponsor_id": sponsor_id,
        "sponsor_membership_number": sponsor_membership_number,
        "avatar": "",
        "biography": "",
        "social_links": {},
        "status": "active",
        "role": "member",
        "cms_roles": ["role_member"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "registration_source": "enrollment",
    }
    await insert_member_with_retry(new_member)
    # Sync to KMS — fire-and-forget
    _enr_settings = await db.settings.find_one({}, {"_id": 0}) or {}
    background_tasks.add_task(sync_member_to_kms, _enr_settings, new_member, password)
    # MMS referral hook (Phase 2b) — fire-and-forget
    from utils.mms_events import emit_mms_event
    background_tasks.add_task(emit_mms_event, db, {
        "type": "referral_signup",
        "membership_number": new_member.get("membership_number"),
        "payload": {
            "via": (request.cookies.get("mms_via") or "").strip(),
            "via_first": (request.cookies.get("mms_via_first") or "").strip(),
            "ip": request.headers.get("x-real-ip") or (request.client.host if request.client else ""),
            "source": "enrollment",
        },
        "event_key": f"signup:{new_member['member_id']}",
    })
    # Welcome bonus — the NEW member earns for activating (self-reward). 2026-08-14.
    background_tasks.add_task(emit_mms_event, db, {
        "type": "welcome_activated",
        "membership_number": new_member.get("membership_number"),
        "mid": str(new_member.get("_id")) if new_member.get("_id") else None,
        "payload": {"source": "enrollment"},
        "event_key": f"welcome:{new_member['member_id']}",
    })

    # Save full enrollment application data
    app_doc = {
        "id": str(uuid.uuid4()),
        "member_id": member_id,
        "email": email,
        "form_data": {k: v for k, v in form_data.items() if k not in ("password", "confirm_password")},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.enrollment_applications.insert_one(app_doc)

    # Mark invite code as used (match register flow fields)
    if code_doc:
        await db.invite_codes.update_one(
            {"code": invite_code},
            {"$set": {
                "status": "used",
                "used_at": datetime.now(timezone.utc).isoformat(),
                "used_by_member_id": member_id,
                "used_by_membership_id": membership_id,
                "used_by_membership_number": membership_number,
                "invitee_first_name": first_name,
                "invitee_last_name": last_name,
                "invitee_email": email,
                "invitee_gender": form_data.get("gender", ""),
            }}
        )

    # Send email with credentials
    try:
        settings = await db.settings.find_one({}, {"_id": 0})
        from utils.email_render import render_and_send
        await render_and_send(
            "welcome_enrollment", settings or {}, email, first_name,
            variables={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password": password,
                "membership_id": membership_id,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to send enrollment email: {e}")

    # Create JWT token for auto-login
    token = create_jwt_token(member_id, email, "member")
    # Enrollment auto-logs the member into My Account → count it as a login too.
    from routes.membership import record_login_event
    await record_login_event(new_member)

    # Return full member data (same as register flow)
    member_data = {k: v for k, v in new_member.items() if k not in ("password_hash", "_id")}

    return {
        "success": True,
        "token": token,
        "member": member_data,
    }


# ── Admin endpoints ──

@router.get("/admin/enrollment-fields")
async def admin_list_fields(user: dict = Depends(require_admin)):
    fields = await db.enrollment_fields.find({}, {"_id": 0}).sort([("step", 1), ("order", 1)]).to_list(200)
    return fields


@router.post("/admin/enrollment-fields")
async def admin_create_field(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body["id"] = str(uuid.uuid4())
    body.setdefault("visible", True)
    body.setdefault("required", False)
    body.setdefault("options", [])
    body.setdefault("icon", "")
    body.setdefault("tooltip", "")
    body.setdefault("placeholder", "")
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    # Auto-set order
    max_order = await db.enrollment_fields.find_one({"step": body.get("step", 1)}, sort=[("order", -1)])
    body["order"] = (max_order["order"] + 1) if max_order else 1
    await db.enrollment_fields.insert_one(body)
    return await db.enrollment_fields.find_one({"id": body["id"]}, {"_id": 0})


# NOTE: Reorder route must be defined BEFORE parameterized routes to avoid route conflicts
@router.put("/admin/enrollment-fields/reorder")
async def admin_reorder_fields(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    ordered_ids = body.get("ordered_ids", [])
    for idx, fid in enumerate(ordered_ids):
        await db.enrollment_fields.update_one({"id": fid}, {"$set": {"order": idx + 1}})
    return {"success": True}


@router.get("/admin/enrollment-fields/{field_id}")
async def admin_get_field(field_id: str, user: dict = Depends(require_admin)):
    field = await db.enrollment_fields.find_one({"id": field_id}, {"_id": 0})
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field


@router.put("/admin/enrollment-fields/{field_id}")
async def admin_update_field(field_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    body.pop("id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.enrollment_fields.update_one({"id": field_id}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Field not found")
    return await db.enrollment_fields.find_one({"id": field_id}, {"_id": 0})


@router.delete("/admin/enrollment-fields/{field_id}")
async def admin_delete_field(field_id: str, user: dict = Depends(require_admin)):
    result = await db.enrollment_fields.delete_one({"id": field_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"success": True}


@router.put("/admin/enrollment-fields/{field_id}/visibility")
async def admin_toggle_visibility(field_id: str, request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    visible = body.get("visible", True)
    result = await db.enrollment_fields.update_one({"id": field_id}, {"$set": {"visible": visible}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"success": True, "visible": visible}


@router.get("/admin/enrollment-applications")
async def admin_list_applications(user: dict = Depends(require_admin)):
    apps = await db.enrollment_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return apps


async def build_enrollment_qa(member_id: str) -> dict:
    """Enrollment Q&A for a single member, joining stored form_data against the
    current enrollment_fields catalog so it can render question-by-question. Empty
    list if the member never went through the public enrollment flow (e.g. seeded
    sample members). Reused by the admin modal AND the mentor's mentee view."""
    app = await db.enrollment_applications.find_one(
        {"member_id": member_id}, {"_id": 0}
    )
    fields = await db.enrollment_fields.find(
        {}, {"_id": 0}
    ).sort([("step", 1), ("order", 1)]).to_list(500)

    if not app:
        return {
            "has_application": False,
            "submitted_at": None,
            "answers": [],
        }

    form_data = app.get("form_data") or {}

    def _flatten(val):
        """Coerce any saved form value to a human-readable string.
        Some enrollment fields (checkbox-grids, multi-checkbox, dynamic
        topics) are stored as a {label: bool} dict by the public form;
        rendering that dict directly in React crashes the modal."""
        if val is None:
            return ""
        if isinstance(val, str):
            return val
        if isinstance(val, bool):
            return "Yes" if val else "No"
        if isinstance(val, (int, float)):
            return str(val)
        if isinstance(val, list):
            return ", ".join(_flatten(v) for v in val if v not in (None, "", False))
        if isinstance(val, dict):
            # Two distinct dict shapes appear in enrollment data:
            #   • boolean checkbox grid: {"Terminology": True, "Tools": False, ...}
            #     → join only truthy keys ("Terminology, Tools")
            #   • rating / score grid:   {"Terminology": 4, "Tools": 3, ...}
            #     → render as "Key: value" pairs ("Terminology: 4, Tools: 3, ...")
            #   • mixed / other:        same "Key: value" rendering, skipping
            #     empty / null entries.
            if val and all(isinstance(v, bool) for v in val.values()):
                truthy = [str(k) for k, v in val.items() if v]
                return ", ".join(truthy) if truthy else ""
            pairs = []
            for k, v in val.items():
                if v in (None, "", False):
                    continue
                pairs.append(f"{k}: {_flatten(v)}")
            return ", ".join(pairs)
        return str(val)

    answers = []
    for f in fields:
        key = f.get("field_key")
        if not key or f.get("field_type") in ("richtext", "legal_checkbox"):
            # richtext blocks are static content, not a question.
            # legal_checkbox is captured as a boolean below if user answered it.
            if f.get("field_type") == "legal_checkbox" and key in form_data:
                answers.append({
                    "step": f.get("step"),
                    "field_key": key,
                    "label": f.get("label", key),
                    "field_type": f.get("field_type"),
                    "value": "Accepted" if form_data.get(key) else "Not accepted",
                })
            continue
        if key in form_data:
            answers.append({
                "step": f.get("step"),
                "field_key": key,
                "label": f.get("label", key),
                "field_type": f.get("field_type"),
                "value": _flatten(form_data.get(key)),
            })

    # Append any extra form_data keys that don't match a known field (legacy).
    known = {f.get("field_key") for f in fields}
    for k, v in form_data.items():
        if k in known or k in ("password", "confirm_password"):
            continue
        answers.append({
            "step": None,
            "field_key": k,
            "label": k.replace("_", " ").title(),
            "field_type": "text",
            "value": _flatten(v),
        })

    return {
        "has_application": True,
        "submitted_at": app.get("created_at"),
        "email": app.get("email"),
        "answers": answers,
    }


@router.get("/admin/members/{member_id}/enrollment")
async def admin_member_enrollment(member_id: str, user: dict = Depends(require_admin)):
    return await build_enrollment_qa(member_id)


# ── Step 4 Content Management ──

@router.get("/public/enrollment-content/step4")
async def get_step4_content():
    doc = await db.enrollment_content.find_one({"key": "step4"}, {"_id": 0})
    if not doc:
        return {"title": "Thank you for entering your information", "description": "Thank you for entering your information on our membership application form. To finish the subscription process, please click <strong>SUBMIT</strong>."}
    return {"title": doc.get("title", ""), "description": doc.get("description", "")}


@router.get("/admin/enrollment-content/step4")
async def admin_get_step4_content(user: dict = Depends(require_admin)):
    doc = await db.enrollment_content.find_one({"key": "step4"}, {"_id": 0})
    if not doc:
        return {"title": "Thank you for entering your information", "description": "Thank you for entering your information on our membership application form. To finish the subscription process, please click <strong>SUBMIT</strong>."}
    return {"title": doc.get("title", ""), "description": doc.get("description", "")}


@router.put("/admin/enrollment-content/step4")
async def admin_update_step4_content(request: Request, user: dict = Depends(require_admin)):
    body = await request.json()
    title = body.get("title", "")
    description = body.get("description", "")
    await db.enrollment_content.update_one(
        {"key": "step4"},
        {"$set": {"key": "step4", "title": title, "description": description, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True, "title": title, "description": description}
