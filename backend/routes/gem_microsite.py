"""GEM2i event microsites — the legacy "Domain or Subdomain" field, on the new stack.

Plan: work-plans-MD/GEM2I_EVENT_MICROSITES_PLAN.md (§1 legacy behaviour, §7 rulings).

An event's ``domain`` (host, e.g. ``eticketgem2i.exclusivesession.com``) gives it its own website,
served by the same React build: the app sees a non-portal host and asks
``GET /api/public/gem/microsite?host=<host>``. Portal visibility stays separate
(``show_portal`` = gem2i, ``show_portal_es`` = Exclusive Session).

Same resolution as the legacy PHP copies (no behaviour change):
* guest-list host → the promoter whose ``url`` is the host; event = that promoter's next active
  guest-list event (fallback: an event whose ``domain`` is the host);
* e-ticket host → the next active event whose ``domain`` is the host; brand = the event's own
  promoter (+ the event's own logo).

Apply for membership (legacy process.php → verify.php → apply_membership_ok.php): the member is
created PENDING (``status: 'pending'``, no ``role_member`` → login refused), sponsor from ``?GEM=``,
``url_reference`` = host, ``cluster_name`` = ``event``; the e-mailed link activates it.
"""
import re
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from models.database import db, hash_password, logger
from routes.gem_catalogs import _serialize, _resolve_lineup
from routes.membership import (get_current_member, insert_member_with_retry, get_next_membership_number,
                               get_aux_prefix)

router = APIRouter()

_HOST_RX = re.compile(r"^[a-z0-9.-]{3,253}$")


def norm_host(host: str) -> str:
    """Lower-case host without scheme, port, path or a leading www."""
    h = (host or "").strip().lower()
    h = re.sub(r"^[a-z]+://", "", h).split("/")[0].split(":")[0]
    return h[4:] if h.startswith("www.") else h


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _promoter_of(ev: dict):
    if not ev:
        return None
    q = []
    if ev.get("promoter_id"):
        q.append({"id": ev["promoter_id"]})
    if ev.get("legacy_promoter_id") not in (None, ""):
        q.append({"legacy_id": ev["legacy_promoter_id"]})
    if not q:
        return None
    return await db.gem_promoters.find_one({"$or": q, "status": {"$ne": "deleted"}}, {"_id": 0})


def _promoter_match(p: dict) -> list:
    out = []
    if p.get("id"):
        out.append({"promoter_id": p["id"]})
    if p.get("legacy_id") not in (None, ""):
        out.append({"legacy_promoter_id": p["legacy_id"]})
    return out


async def _event_payload(ev: dict) -> dict:
    ev = _serialize("gem_events", dict(ev))
    if ev.get("venue_id"):
        v = await db.gem_venues.find_one({"id": ev["venue_id"]}, {"_id": 0})
        ev["venue"] = _serialize("gem_venues", v) if v else None
    ev["lineup_artists"] = await _resolve_lineup(ev.get("lineup") or [])
    return ev


async def resolve_microsite(host: str):
    host = norm_host(host)
    if not _HOST_RX.match(host):
        return None
    active = {"status": "active", "event_date": {"$gte": _today()}}
    promoter = await db.gem_promoters.find_one({"url": host, "status": {"$ne": "deleted"}}, {"_id": 0})
    ev = None
    if promoter and _promoter_match(promoter):
        # Guest-list microsite (legacy index.php): the promoter's next guest-list event.
        ev = await db.gem_events.find_one({**active, "type": "guest_list", "$or": _promoter_match(promoter)},
                                          {"_id": 0}, sort=[("event_date", 1), ("open_time", 1)])
    if not ev:
        # E-ticket microsite (legacy event-info.php): the next event whose domain is this host.
        ev = await db.gem_events.find_one({**active, "domain": host, "type": {"$in": ["eticket", "guest_list"]}},
                                          {"_id": 0}, sort=[("event_date", 1), ("open_time", 1)])
    if not ev:
        return None
    layout = (ev.get("microsite") or {}).get("layout") or ""
    kind = layout if layout in ("guest", "eticket") else ("guest" if ev.get("type") == "guest_list" and promoter else "eticket")
    brand = promoter if kind == "guest" else (await _promoter_of(ev) or promoter)
    # Upcoming events of the same brand (legacy dates.php) — same domain or same promoter.
    or_q = [{"domain": host}] + (_promoter_match(brand) if brand else [])
    upcoming = [_serialize("gem_events", d) async for d in db.gem_events.find(
        {**active, "id": {"$ne": ev["id"]}, "$or": or_q}, {"_id": 0}).sort([("event_date", 1)]).limit(6)]
    mic = ev.get("microsite") or {}
    slides = [s for s in (mic.get("slides") or []) if s.get("visible", True) is not False]
    return {"host": host, "kind": kind, "event": await _event_payload(ev), "promoter": brand,
            "upcoming": upcoming, "slides": slides, "theme": mic.get("theme") or {}}


@router.get("/public/gem/microsite")
async def public_microsite(host: str, request: Request):
    data = await resolve_microsite(host or request.headers.get("host", ""))
    if not data:
        raise HTTPException(status_code=404, detail="No microsite for this host")
    return data


# ---------------------------------------------------------------- apply for membership (PENDING)
@router.post("/public/gem/microsite/apply")
async def microsite_apply(request: Request):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    first, last = (body.get("first_name") or "").strip(), (body.get("last_name") or "").strip()
    if not (email and "@" in email and first and last):
        raise HTTPException(status_code=422, detail="First name, last name and a valid e-mail are required")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must have at least 8 characters")
    if await db.members.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}, {"_id": 1}):
        raise HTTPException(status_code=409, detail="This e-mail is already registered. Log in instead.")
    host = norm_host(body.get("host") or request.headers.get("host", ""))
    sponsor = None
    gem = (body.get("sponsor") or "").strip()
    if gem:
        sponsor = await db.members.find_one({"$or": [{"membership_id": gem}, {"membership_id": f"GEM-{gem}"}],
                                             "cms_roles": "role_member"}, {"_id": 0, "member_id": 1, "membership_number": 1})
    n = await get_next_membership_number()
    token = secrets.token_urlsafe(32)
    member = {
        "member_id": f"member_{uuid.uuid4().hex[:12]}",
        "membership_number": n, "membership_id": f"{await get_aux_prefix()}-{n}",
        "username": email, "email": email, "password_hash": hash_password(password),
        "first_name": first, "last_name": last, "gender": body.get("gender", ""),
        "sponsor_id": (sponsor or {}).get("member_id"), "sponsor_membership_number": (sponsor or {}).get("membership_number"),
        "role": "member", "cms_roles": [],  # no role_member until verified → login refused (legacy estado 2)
        "status": "pending", "account_status": "pending", "registration_source": "microsite", "url_reference": host, "cluster_name": "event",
        "verify_token": token, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await insert_member_with_retry(member)
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    link = f"https://{host}/?verify={token}" if host else ""
    if settings.get("smtp_host") and link:
        try:
            from utils.email_render import render_and_send
            await render_and_send("welcome_register", settings, email, first,
                                  variables={"name": first, "last_name": last, "membership_id": member["membership_id"],
                                             "username": email, "verify_link": link})
        except Exception as e:  # e-mail is best effort; the member stays pending
            logger.warning(f"microsite apply e-mail failed: {e}")
    return {"status": "pending", "membership_id": member["membership_id"]}


@router.post("/public/gem/microsite/verify")
async def microsite_verify(request: Request):
    """E-mail link → the pending member becomes active (legacy apply_membership_ok.php: estado 1)."""
    token = ((await request.json()).get("token") or "").strip()
    if len(token) < 20:
        raise HTTPException(status_code=400, detail="Invalid link")
    m = await db.members.find_one({"verify_token": token, "status": "pending"}, {"_id": 0, "member_id": 1})
    if not m:
        raise HTTPException(status_code=404, detail="This link was already used or has expired")
    from routes.membership import get_default_level_id
    await db.members.update_one({"member_id": m["member_id"]}, {
        "$set": {"status": "active", "account_status": "active", "cms_roles": ["role_member"], "level_id": await get_default_level_id(),
                 "verified_at": datetime.now(timezone.utc).isoformat()},
        "$unset": {"verify_token": ""}})
    return {"status": "active"}


# ---------------------------------------------------------------- My Account on the e-ticket microsite
def _tx_row(t: dict, ev_titles: dict) -> dict:
    return {"id": t.get("id"), "event_id": t.get("event_id"), "event_title": t.get("event_title") or ev_titles.get(t.get("event_id"), ""),
            "event_date": t.get("event_date"), "tier": t.get("tier_label") or t.get("tier") or ("Guest list" if t.get("kind") == "guest_pass" else ""),
            "price": t.get("unit_price") or t.get("price") or t.get("amount"), "quantity": t.get("quantity") or 1,
            "fee": t.get("transaction_fee") or 0, "total": t.get("total") or round(float(t.get("amount") or 0) * int(t.get("quantity") or 1) + float(t.get("transaction_fee") or 0), 2), "currency": t.get("currency"),
            "points": t.get("points_earned") or 0, "status": t.get("status"), "qr": t.get("qr") or {},
            "guests": t.get("guest_additional") or 0, "created_at": t.get("created_at")}


@router.get("/member/gem/microsite/account")
async def microsite_account(member: dict = Depends(get_current_member)):
    """Legacy submenu: Purchased Tickets · Transaction History · Guest List · Tickets Bank."""
    txs = [t async for t in db.gem_transactions.find({"member_id": member["member_id"]}, {"_id": 0}).sort([("created_at", -1)]).limit(500)]
    ids = list({t.get("event_id") for t in txs if t.get("event_id")})
    evs = {e["id"]: e async for e in db.gem_events.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "title": 1, "event_date": 1, "slug": 1})}
    titles = {k: v.get("title", "") for k, v in evs.items()}
    today = _today()
    tickets = [t for t in txs if t.get("kind") == "ticket"]
    rows = lambda lst: [_tx_row(t, titles) for t in lst]
    return {
        "purchased": rows([t for t in tickets if t.get("status") == "completed" and (evs.get(t.get("event_id"), {}).get("event_date") or "") >= today]),
        "history": rows([t for t in tickets if t.get("status") in ("completed", "refunded", "banked")]),
        "guest_lists": rows([t for t in txs if t.get("kind") == "guest_pass" and t.get("status") != "canceled"]),
        "bank": rows([t for t in tickets if t.get("status") == "banked"]),
    }
