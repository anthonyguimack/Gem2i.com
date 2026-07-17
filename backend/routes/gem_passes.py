"""gem2i Phase-4 — guest list, waiting list, QR e-passes (plan A8, §5 member actions).

Member (identity from JWT ONLY — never a client-posted membership id):
  GET    /api/member/gem/my-event-status/{event_id}   one call feeds the widget
  POST   /api/member/gem/guest-list                    {event_id, additional_guests}
  DELETE /api/member/gem/guest-list/{event_id}         cancel own pass
  POST   /api/member/gem/waiting-list                  {event_id} (only when full)
  DELETE /api/member/gem/waiting-list/{event_id}

Admin (require_admin — section `gem_transactions`):
  GET /api/admin/gem/transactions        ?event_id&status&kind&q&page&limit
  PUT /api/admin/gem/transactions/{id}   {status: completed|canceled}
  GET /api/admin/gem/waiting-list/{event_id}

Design (plan §4 + §8):
  * Consumed stock = ARITHMETIC-ON-READ over gem_transactions (1 + guest_additional
    per non-canceled pass) — replaces the legacy "virtual stock" double-write.
  * Issue is insert-then-verify: after inserting our pass we re-count; if the event
    oversold in the race window we delete our own row and report full. No lock needed.
  * QR pass = python `qrcode` PNG under uploads/gem2i/passes/ (served by the existing
    /api/uploads mount; no FTP like legacy). Pass email via the CMS template pipeline.
  * Benefits are per member-type (event.guest_list.benefits[].member_type_id →
    CMS member_types.id). If the event defines benefits, an unlisted member type is
    not eligible (legacy parity). Time-window fields are carried and displayed;
    door-time enforcement is check-in machinery (out of Phase-4 scope).
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from models.database import db, require_admin
from routes.membership import get_current_member

router = APIRouter()

UPLOADS_ROOT = Path(__file__).parent.parent / "uploads"
PASS_DIR = UPLOADS_ROOT / "gem2i" / "passes"
PASS_URL = "/api/uploads/gem2i/passes"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def ensure_pass_indexes():
    await db.gem_transactions.create_index([("event_id", 1), ("kind", 1), ("status", 1)])
    await db.gem_transactions.create_index([("member_id", 1)])
    await db.gem_waiting_list.create_index([("event_id", 1), ("member_id", 1)], unique=True)


# ---------------------------------------------------------------- helpers
async def _public_event_or_404(event_id: str) -> dict:
    ev = await db.gem_events.find_one(
        {"id": event_id, "status": "active", "private": False, "show_portal": True}, {"_id": 0})
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev


def _gl_config(ev: dict) -> dict:
    gl = ev.get("guest_list") or {}
    if ev.get("type") != "guest_list" or not gl or not gl.get("stock"):
        raise HTTPException(status_code=422, detail="This event has no guest list")
    return gl


def _benefit_for(gl: dict, member: dict):
    """The member-type benefit row, or None. When the event defines benefits,
    an unlisted member type is NOT eligible (legacy per-type gating)."""
    benefits = gl.get("benefits") or []
    if not benefits:
        return {}, True  # no per-type config → everyone eligible, no extras
    mt = member.get("member_type_id") or ""
    for b in benefits:
        if b.get("member_type_id") == mt:
            return b, True
    return None, False


async def _consumed(event_id: str) -> int:
    """People count (pass holder + additional guests) over non-canceled passes."""
    agg = db.gem_transactions.aggregate([
        {"$match": {"event_id": event_id, "kind": "guest_pass", "status": {"$ne": "canceled"}}},
        {"$group": {"_id": None,
                    "n": {"$sum": {"$add": [1, {"$ifNull": ["$guest_additional", 0]}]}}}},
    ])
    rows = await agg.to_list(1)
    return rows[0]["n"] if rows else 0


async def _my_pass(event_id: str, member_id: str):
    return await db.gem_transactions.find_one(
        {"event_id": event_id, "member_id": member_id, "kind": "guest_pass",
         "status": {"$ne": "canceled"}}, {"_id": 0})


def _member_display(member: dict) -> tuple[str, str]:
    name = (member.get("name")
            or f"{member.get('first_name', '')} {member.get('last_name', '')}".strip()
            or member.get("email", ""))
    return name, member.get("email", "")


def _make_qr(code: str) -> str:
    """Write the QR PNG and return its public URL. The QR encodes the pass code;
    check-in tooling (future phase) looks the code up in gem_transactions."""
    import qrcode
    PASS_DIR.mkdir(parents=True, exist_ok=True)
    img = qrcode.make(f"GEM2I-PASS:{code}")
    path = PASS_DIR / f"{code}.png"
    img.save(path)
    return f"{PASS_URL}/{code}.png"


async def _send_pass_email(to_email: str, to_name: str, ev: dict, tx: dict):
    """Best-effort pass email (mirrors the platform's SMTP behavior: silently
    skipped while SMTP is unconfigured; capture in DB is the source of truth)."""
    from utils.email_render import render_and_send
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    site = (settings.get("site_url") or "").rstrip("/")
    qr_url = tx.get("qr", {}).get("image_url") or ""
    await render_and_send(
        "gem_guest_pass", settings, to_email, to_name,
        variables={
            "name": to_name,
            "event_title": ev.get("title", ""),
            "event_date": ev.get("event_date", ""),
            "pass_code": tx.get("qr", {}).get("code", ""),
            "additional_guests": str(tx.get("guest_additional", 0)),
            "qr_image_url": f"{site}{qr_url}" if qr_url.startswith("/") else qr_url,
            "event_url": f"{site}/events/{ev.get('slug', '')}",
        },
    )


# ================================================================ MEMBER
@router.get("/member/gem/my-event-status/{event_id}")
async def my_event_status(event_id: str, member: dict = Depends(get_current_member)):
    ev = await _public_event_or_404(event_id)
    member_id = member["member_id"]
    out = {
        "following": bool(await db.gem_follows.find_one(
            {"member_id": member_id, "kind": "event", "target_id": event_id}, {"_id": 1})),
        "pass": None, "waiting": False, "guest_list": None, "benefit": None, "eligible": False,
    }
    gl = ev.get("guest_list") or {}
    if ev.get("type") == "guest_list" and gl.get("stock"):
        stock = int(gl.get("stock") or 0)
        used = await _consumed(event_id)
        benefit, eligible = _benefit_for(gl, member)
        out["guest_list"] = {
            "stock": stock,
            "available": max(0, stock - used),
            "additional_enabled": bool(gl.get("additional_enabled")),
            "ranges": gl.get("ranges") or [],
        }
        out["benefit"] = benefit or None
        out["eligible"] = eligible
        out["pass"] = await _my_pass(event_id, member_id)
        out["waiting"] = bool(await db.gem_waiting_list.find_one(
            {"event_id": event_id, "member_id": member_id}, {"_id": 1}))
    return out


@router.post("/member/gem/guest-list")
async def join_guest_list(request: Request, background: BackgroundTasks,
                          member: dict = Depends(get_current_member)):
    body = await request.json()
    event_id = body.get("event_id")
    additional = int(body.get("additional_guests") or 0)
    if not event_id:
        raise HTTPException(status_code=422, detail="event_id required")

    ev = await _public_event_or_404(event_id)
    if (ev.get("event_date") or "") < _today():
        raise HTTPException(status_code=422, detail="This event already happened")
    gl = _gl_config(ev)

    benefit, eligible = _benefit_for(gl, member)
    if not eligible:
        raise HTTPException(status_code=403, detail="Your membership type is not eligible for this guest list")

    if additional:
        ranges = [int(r) for r in (gl.get("ranges") or []) if str(r).isdigit()]
        if not gl.get("additional_enabled") or not ranges:
            raise HTTPException(status_code=422, detail="Additional guests are not available for this event")
        if additional not in ranges:
            raise HTTPException(status_code=422, detail="Invalid number of additional guests")

    member_id = member["member_id"]
    if await _my_pass(event_id, member_id):
        raise HTTPException(status_code=409, detail="You already have a pass for this event")

    stock = int(gl.get("stock") or 0)
    people = 1 + additional
    if await _consumed(event_id) + people > stock:
        raise HTTPException(status_code=409, detail="guest_list_full")

    name, email = _member_display(member)
    code = uuid.uuid4().hex
    tx = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "member_id": member_id,          # identity from JWT ONLY
        "member_name": name,
        "member_email": email,
        "kind": "guest_pass",
        "status": "completed",
        "guest_additional": additional,
        "benefit": {k: benefit.get(k) for k in
                    ("member_type_id", "open_until", "free_until", "additional_until")
                    if benefit and benefit.get(k)} or None,
        "qr": {"code": code, "image_url": _make_qr(code)},
        "created_at": _now_iso(),
    }
    await db.gem_transactions.insert_one(dict(tx))

    # Insert-then-verify: if a concurrent join oversold the list, roll ours back.
    if await _consumed(event_id) > stock:
        await db.gem_transactions.delete_one({"id": tx["id"]})
        raise HTTPException(status_code=409, detail="guest_list_full")

    await db.gem_waiting_list.delete_one({"event_id": event_id, "member_id": member_id})
    if email:
        background.add_task(_send_pass_email, email, name, ev, tx)
    return {"pass": tx}


@router.delete("/member/gem/guest-list/{event_id}")
async def cancel_guest_pass(event_id: str, member: dict = Depends(get_current_member)):
    res = await db.gem_transactions.update_one(
        {"event_id": event_id, "member_id": member["member_id"], "kind": "guest_pass",
         "status": {"$ne": "canceled"}},
        {"$set": {"status": "canceled", "canceled_at": _now_iso(), "canceled_by": "member"}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active pass for this event")
    return {"message": "canceled"}  # stock frees up automatically (arithmetic-on-read)


@router.post("/member/gem/waiting-list")
async def join_waiting_list(request: Request, member: dict = Depends(get_current_member)):
    body = await request.json()
    event_id = body.get("event_id")
    if not event_id:
        raise HTTPException(status_code=422, detail="event_id required")
    ev = await _public_event_or_404(event_id)
    if (ev.get("event_date") or "") < _today():
        raise HTTPException(status_code=422, detail="This event already happened")
    gl = _gl_config(ev)
    member_id = member["member_id"]
    if await _my_pass(event_id, member_id):
        raise HTTPException(status_code=409, detail="You already have a pass for this event")
    if await _consumed(event_id) < int(gl.get("stock") or 0):
        raise HTTPException(status_code=409, detail="Guest list is not full — join it directly")
    key = {"event_id": event_id, "member_id": member_id}
    await db.gem_waiting_list.update_one(key, {"$setOnInsert": {
        **key, "id": str(uuid.uuid4()), "created_at": _now_iso()}}, upsert=True)
    return {"waiting": True}


@router.delete("/member/gem/waiting-list/{event_id}")
async def leave_waiting_list(event_id: str, member: dict = Depends(get_current_member)):
    await db.gem_waiting_list.delete_one(
        {"event_id": event_id, "member_id": member["member_id"]})
    return {"waiting": False}


# ================================================================ ADMIN
@router.get("/admin/gem/transactions")
async def admin_transactions(event_id: str = None, status: str = None, kind: str = None,
                             q: str = None, page: int = 1, limit: int = 50,
                             user: dict = Depends(require_admin)):
    query = {}
    if event_id:
        query["event_id"] = event_id
    if status:
        query["status"] = status
    if kind:
        query["kind"] = kind
    if q:
        import re as _re
        rx = {"$regex": _re.escape(q), "$options": "i"}
        query["$or"] = [{"member_name": rx}, {"member_email": rx}, {"qr.code": rx}]
    limit = max(1, min(limit, 100))
    page = max(1, page)
    total = await db.gem_transactions.count_documents(query)
    cursor = db.gem_transactions.find(query, {"_id": 0}) \
        .sort([("created_at", -1)]).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(limit)
    # Resolve event titles for the list rows (one query per page).
    ev_ids = list({t.get("event_id") for t in items if t.get("event_id")})
    evs = {e["id"]: e async for e in db.gem_events.find(
        {"id": {"$in": ev_ids}}, {"_id": 0, "id": 1, "title": 1, "slug": 1, "event_date": 1})}
    for t in items:
        t["event"] = evs.get(t.get("event_id"))
    return {"items": items, "total": total, "page": page,
            "pages": max(1, (total + limit - 1) // limit)}


@router.put("/admin/gem/transactions/{tx_id}")
async def admin_update_transaction(tx_id: str, request: Request,
                                   user: dict = Depends(require_admin)):
    body = await request.json()
    status = body.get("status")
    if status not in ("completed", "canceled", "pending"):
        raise HTTPException(status_code=422, detail="status must be completed|canceled|pending")
    patch = {"status": status, "updated_at": _now_iso()}
    if status == "canceled":
        patch["canceled_at"] = _now_iso()
        patch["canceled_by"] = "admin"
    res = await db.gem_transactions.update_one({"id": tx_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "updated"}


@router.get("/admin/gem/waiting-list/{event_id}")
async def admin_waiting_list(event_id: str, user: dict = Depends(require_admin)):
    rows = await db.gem_waiting_list.find(
        {"event_id": event_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(1000)
    ids = [r["member_id"] for r in rows]
    members = {m["member_id"]: m async for m in db.members.find(
        {"member_id": {"$in": ids}},
        {"_id": 0, "member_id": 1, "name": 1, "first_name": 1, "last_name": 1, "email": 1})}
    for r in rows:
        m = members.get(r["member_id"]) or {}
        r["member_name"] = (m.get("name")
                            or f"{m.get('first_name', '')} {m.get('last_name', '')}".strip())
        r["member_email"] = m.get("email")
    return {"items": rows, "total": len(rows)}
