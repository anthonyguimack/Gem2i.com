"""Admin-only CRUD for CMS roles + member role assignment.

All endpoints here require `role: "admin"` (strict) — these routes manage the
permission system itself and cannot be delegated to operators (answered 3b in
the project spec).
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from models.database import db, require_super_admin
from models.cms_sections import (
    CMS_SECTIONS, CMS_GROUPS, ASSIGNABLE_SECTION_KEYS, SYSTEM_ROLES,
)
from datetime import datetime, timezone
import uuid

router = APIRouter()


@router.get("/admin/cms-sections")
async def list_cms_sections(user: dict = Depends(require_super_admin)):
    """Returns the registry (sections + groups) so the Roles editor can render
    the checkbox matrix without hard-coding the list on the frontend."""
    return {
        "sections": [s for s in CMS_SECTIONS if not s.get("admin_only")],
        "groups": CMS_GROUPS,
    }


@router.get("/admin/cms-roles")
async def list_cms_roles(user: dict = Depends(require_super_admin)):
    roles = await db.cms_roles.find({}, {"_id": 0}).sort("is_system", -1).to_list(500)
    # Attach member_count for convenience in the UI
    for r in roles:
        r["member_count"] = await db.members.count_documents({"cms_roles": r["id"]})
    return roles


@router.post("/admin/cms-roles")
async def create_cms_role(request: Request, user: dict = Depends(require_super_admin)):
    body = await request.json()
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    # Validate permissions against the registry
    perms = [p for p in (body.get("permissions") or []) if p in ASSIGNABLE_SECTION_KEYS]
    doc = {
        "id": f"role_{uuid.uuid4().hex[:12]}",
        "name": name,
        "description": body.get("description") or "",
        "permissions": perms,
        "full_access": bool(body.get("full_access", False)),
        "is_system": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cms_roles.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/admin/cms-roles/{role_id}")
async def update_cms_role(role_id: str, request: Request, user: dict = Depends(require_super_admin)):
    existing = await db.cms_roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    body = await request.json()
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "name" in body and body["name"]:
        update["name"] = body["name"].strip()
    if "description" in body:
        update["description"] = body["description"] or ""
    if "permissions" in body:
        update["permissions"] = [p for p in (body["permissions"] or []) if p in ASSIGNABLE_SECTION_KEYS]
    # Only non-system roles can toggle full_access; the seeded Administrator
    # role stays full_access=True and the Member role stays False.
    if not existing.get("is_system") and "full_access" in body:
        update["full_access"] = bool(body["full_access"])
    await db.cms_roles.update_one({"id": role_id}, {"$set": update})
    return await db.cms_roles.find_one({"id": role_id}, {"_id": 0})


@router.delete("/admin/cms-roles/{role_id}")
async def delete_cms_role(role_id: str, user: dict = Depends(require_super_admin)):
    existing = await db.cms_roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    if existing.get("is_system"):
        raise HTTPException(status_code=400, detail="System roles cannot be deleted")
    # Detach from any members that currently hold it.
    await db.members.update_many({"cms_roles": role_id}, {"$pull": {"cms_roles": role_id}})
    await db.cms_roles.delete_one({"id": role_id})
    return {"ok": True}


@router.put("/admin/members/{member_id}/cms-roles")
async def assign_member_cms_roles(member_id: str, request: Request, user: dict = Depends(require_super_admin)):
    body = await request.json()
    role_ids = list(dict.fromkeys(body.get("cms_roles") or []))  # dedupe, preserve order
    # Validate every requested role exists
    if role_ids:
        found = await db.cms_roles.find({"id": {"$in": role_ids}}, {"_id": 0, "id": 1}).to_list(100)
        valid_ids = {r["id"] for r in found}
        role_ids = [r for r in role_ids if r in valid_ids]
    await db.members.update_one({"member_id": member_id}, {"$set": {"cms_roles": role_ids}})
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


async def seed_system_roles():
    """Idempotent seed — creates Administrator + Member roles on first boot and
    back-fills the `cms_roles` array on every existing member so legacy accounts
    continue to work seamlessly (admins get full access, everyone else gets the
    Member role).  Called from the FastAPI startup event."""
    for role in SYSTEM_ROLES:
        existing = await db.cms_roles.find_one({"id": role["id"]}, {"_id": 0})
        if not existing:
            doc = {**role, "created_at": datetime.now(timezone.utc).isoformat(),
                   "updated_at": datetime.now(timezone.utc).isoformat()}
            await db.cms_roles.insert_one(doc)
    # Back-fill legacy members that never had `cms_roles` set
    await db.members.update_many(
        {"role": "admin", "cms_roles": {"$exists": False}},
        {"$set": {"cms_roles": ["role_admin"]}},
    )
    await db.members.update_many(
        {"role": {"$ne": "admin"}, "cms_roles": {"$exists": False}},
        {"$set": {"cms_roles": ["role_member"]}},
    )
    # Default is_mentor=False for legacy member records that lack the field
    # (the new "Mentor" column in MembersManager renders YES/-).
    await db.members.update_many(
        {"is_mentor": {"$exists": False}},
        {"$set": {"is_mentor": False}},
    )
