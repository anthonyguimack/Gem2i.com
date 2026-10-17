"""gem2i member calendar, iCal feed and notifications (My Account 2.0).

Ported in spirit from AUX-1.0 (calendar_events / ical / notifications), but
built on gem2i's own data: the calendar IS `gem_events` (no separate admin
calendar collection) and "my events" are the member's live passes/tickets in
`gem_transactions`.

  GET  /api/member/gem/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD   events in range + my status
  GET  /api/member/gem/calendar/ical-url                         personal subscription URL
  POST /api/member/gem/calendar/ical-url/rotate                  new token (old URL stops working)
  GET  /api/public/gem/calendar/{token}.ics                      the member's passes/tickets (RFC 5545)
  GET  /api/member/notifications                                 latest 50
  GET  /api/member/notifications/unread-count
  PUT  /api/member/notifications/{id}/read
  PUT  /api/member/notifications/read-all

Notification text is stored as {en, es} so the SPA renders it with useT().
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import Response
from models.database import db, logger
from routes.membership import get_current_member
from datetime import datetime, timezone
import re
import secrets
import uuid

router = APIRouter()

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_LIVE_TX = {"kind": {"$in": ["guest_pass", "ticket"]}, "status": {"$nin": ["canceled", "pending", "initiated"]}}
_EVENT_FIELDS = {"_id": 0, "id": 1, "slug": 1, "title": 1, "event_date": 1, "open_time": 1,
                 "end_time": 1, "venue_id": 1, "images": 1, "type": 1, "external_ticket_system": 1}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ================================================================ NOTIFICATIONS
async def notify(member_id: str, kind: str, title: dict, message: dict, link: str = ""):
    """Best-effort: a notification must never break the action that raised it."""
    if not member_id:
        return
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "member_id": member_id, "type": kind,
            "title": title, "message": message, "link": link,
            "read": False, "created_at": _now_iso(),
        })
    except Exception as e:
        logger.warning(f"notify({kind}) failed: {e}")


async def notify_waitlist_spot_open(ev: dict):
    """A pass was canceled on a full guest list: tell everyone waiting."""
    title_txt = ev.get("title", "")
    link = f"/events/{ev.get('slug', '')}"
    async for w in db.gem_waiting_list.find({"event_id": ev.get("id")}, {"_id": 0, "member_id": 1}):
        await notify(w["member_id"], "spot_available",
                     {"en": "A spot opened up", "es": "Se liberó un lugar"},
                     {"en": f'A guest-list spot opened for "{title_txt}". Join before it fills up again.',
                      "es": f'Se liberó un lugar en la lista de invitados de "{title_txt}". Únete antes de que se llene.'},
                     link)


@router.get("/member/notifications")
async def member_notifications(member: dict = Depends(get_current_member)):
    return await db.notifications.find(
        {"member_id": member["member_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@router.get("/member/notifications/unread-count")
async def member_unread_count(member: dict = Depends(get_current_member)):
    return {"count": await db.notifications.count_documents(
        {"member_id": member["member_id"], "read": False})}


@router.put("/member/notifications/read-all")
async def member_mark_all_read(member: dict = Depends(get_current_member)):
    await db.notifications.update_many(
        {"member_id": member["member_id"], "read": False}, {"$set": {"read": True}})
    return {"success": True}


@router.put("/member/notifications/{notif_id}/read")
async def member_mark_read(notif_id: str, member: dict = Depends(get_current_member)):
    await db.notifications.update_one(
        {"id": notif_id, "member_id": member["member_id"]}, {"$set": {"read": True}})
    return {"success": True}


# ================================================================ CALENDAR
async def _my_tx_by_event(member_id: str, event_ids=None) -> dict:
    q = {"member_id": member_id, **_LIVE_TX}
    if event_ids is not None:
        q["event_id"] = {"$in": list(event_ids)}
    out = {}
    async for t in db.gem_transactions.find(q, {"_id": 0, "event_id": 1, "kind": 1, "status": 1,
                                                 "qr": 1, "tier": 1}):
        out.setdefault(t["event_id"], []).append(t)
    return out


@router.get("/member/gem/calendar")
async def member_calendar(start: str = Query(...), end: str = Query(...),
                          mine: bool = False, member: dict = Depends(get_current_member)):
    if not (_DATE.match(start) and _DATE.match(end)) or end < start:
        raise HTTPException(status_code=422, detail="start/end must be YYYY-MM-DD, end >= start")
    q = {"status": "active", "private": False, "show_portal": True,
         "event_date": {"$gte": start, "$lte": end}}
    if mine:
        mine_map = await _my_tx_by_event(member["member_id"])
        q["id"] = {"$in": list(mine_map.keys())}
    events = await db.gem_events.find(q, _EVENT_FIELDS).sort("event_date", 1).to_list(1000)
    mine_map = await _my_tx_by_event(member["member_id"], [e["id"] for e in events])
    following = {f["target_id"] async for f in db.gem_follows.find(
        {"member_id": member["member_id"], "kind": "event"}, {"_id": 0, "target_id": 1})}
    venue_ids = {e.get("venue_id") for e in events if e.get("venue_id")}
    venues = {v["id"]: v async for v in db.gem_venues.find(
        {"id": {"$in": list(venue_ids)}}, {"_id": 0, "id": 1, "name": 1, "city": 1, "country": 1})}
    from routes.gem_catalogs import _event_images
    for e in events:
        e["image_urls"] = _event_images(e)
        e.pop("images", None)
        v = venues.get(e.get("venue_id"))
        e["venue"] = {"name": v.get("name"), "city": v.get("city"), "country": v.get("country")} if v else None
        txs = mine_map.get(e["id"], [])
        e["my_pass"] = any(t["kind"] == "guest_pass" for t in txs)
        e["my_ticket"] = any(t["kind"] == "ticket" for t in txs)
        e["following"] = e["id"] in following
    return events


# ================================================================ iCal
def _ics_escape(text) -> str:
    if isinstance(text, dict):
        text = text.get("en") or next((v for v in text.values() if v), "")
    text = re.sub(r"<[^>]*>", " ", str(text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")


def _fold(line: str) -> str:
    if len(line) <= 75:
        return line
    return "\r\n ".join(line[i:i + 74] for i in range(0, len(line), 74))


def _ics_dt(value: str, fallback_date: str, fallback_time: str) -> str:
    """Floating local time (no TZID): each calendar app shows it as the venue's
    local wall-clock time, which is how gem2i stores open/end times."""
    v = (value or "").replace("Z", "")
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})", v)
    if m:
        return "".join(m.groups()[:3]) + "T" + "".join(m.groups()[3:]) + "00"
    return fallback_date.replace("-", "") + "T" + fallback_time


async def _ensure_ical_token(member_id: str, rotate: bool = False) -> str:
    m = await db.members.find_one({"member_id": member_id}, {"_id": 0, "ical_token": 1}) or {}
    if m.get("ical_token") and not rotate:
        return m["ical_token"]
    token = secrets.token_urlsafe(24)
    await db.members.update_one({"member_id": member_id}, {"$set": {"ical_token": token}})
    return token


async def _ical_url(request: Request, token: str) -> str:
    settings = await db.settings.find_one({}, {"_id": 0, "site_url": 1}) or {}
    base = (settings.get("site_url") or str(request.base_url)).rstrip("/")
    return f"{base}/api/public/gem/calendar/{token}.ics"


@router.get("/member/gem/calendar/ical-url")
async def member_ical_url(request: Request, member: dict = Depends(get_current_member)):
    return {"url": await _ical_url(request, await _ensure_ical_token(member["member_id"]))}


@router.post("/member/gem/calendar/ical-url/rotate")
async def member_ical_rotate(request: Request, member: dict = Depends(get_current_member)):
    return {"url": await _ical_url(request, await _ensure_ical_token(member["member_id"], rotate=True))}


@router.get("/public/gem/calendar/{token}.ics")
async def public_ical_feed(token: str):
    if not token or len(token) < 16:
        raise HTTPException(status_code=404, detail="Not found")
    member = await db.members.find_one({"ical_token": token}, {"_id": 0, "member_id": 1, "account_status": 1})
    if not member or (member.get("account_status") or "active") == "deactivated":
        raise HTTPException(status_code=404, detail="Not found")
    settings = await db.settings.find_one({}, {"_id": 0, "site_url": 1, "brand_name": 1}) or {}
    site = (settings.get("site_url") or "").rstrip("/")
    brand = _ics_escape(settings.get("brand_name") or "GEM2i")
    mine = await _my_tx_by_event(member["member_id"])
    events = await db.gem_events.find({"id": {"$in": list(mine.keys())}, "status": "active"},
                                      _EVENT_FIELDS).to_list(1000)
    venue_ids = {e.get("venue_id") for e in events if e.get("venue_id")}
    venues = {v["id"]: v async for v in db.gem_venues.find(
        {"id": {"$in": list(venue_ids)}}, {"_id": 0, "id": 1, "name": 1, "address": 1, "city": 1, "country": 1})}
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", f"PRODID:-//{brand}//My events//EN",
             "CALSCALE:GREGORIAN", "METHOD:PUBLISH", f"X-WR-CALNAME:{brand} — My events"]
    for e in events:
        d = e.get("event_date") or ""
        if not _DATE.match(d):
            continue
        kinds = {t["kind"] for t in mine.get(e["id"], [])}
        label = "Ticket" if "ticket" in kinds else "Guest list"
        v = venues.get(e.get("venue_id")) or {}
        loc = ", ".join(x for x in (_ics_escape(v.get("name")), _ics_escape(v.get("address")),
                                    _ics_escape(v.get("city")), _ics_escape(v.get("country"))) if x)
        ev_lines = ["BEGIN:VEVENT", f"UID:gem-event-{e['id']}@gem2i", f"DTSTAMP:{stamp}",
                    f"DTSTART:{_ics_dt(e.get('open_time'), d, '200000')}",
                    f"DTEND:{_ics_dt(e.get('end_time'), d, '235900')}",
                    f"SUMMARY:{_ics_escape(e.get('title'))} ({label})"]
        if loc:
            ev_lines.append(f"LOCATION:{loc}")
        if site and e.get("slug"):
            ev_lines.append(f"URL:{site}/events/{e['slug']}")
        ev_lines.append("END:VEVENT")
        lines.extend(_fold(x) for x in ev_lines)
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar; charset=utf-8",
                    headers={"Cache-Control": "no-store"})


async def ensure_calendar_indexes():
    await db.notifications.create_index([("member_id", 1), ("created_at", -1)])
    await db.members.create_index("ical_token", sparse=True)
