"""Shared lead-capture / subscribe engine for the News feed AND Morning Brief.

Both products are the same funnel: an anonymous visitor arriving from a social
share hits a gated page, accepts the disclaimer + leaves name/email, and becomes a
**pre_registered** member placed under a sponsor — building the referral tree. They
then share their own `/aux-<N>` link and the next subscriber lands under them.

The ONLY differences between the two callers:
  • News    → sponsor comes from the `aux-<N>` in the URL (an author or a prior
              subscriber); direct access has no sponsor. `source="auxnews"`.
  • Morning → briefs have no code-bearing author, so direct visitors default to a
              fixed root sponsor (AUX-1). `source="morningbrief"`, default_sponsor=1.

This module is the single source of truth for the anti-bot token, the signature /
login history writes, and pre-registered member creation. `news.py` delegates its
`_make_form_token`/`_valid_form_token`/`_record_signature`/`_record_login` here.
"""
import hashlib
import hmac
import secrets
import time
import uuid
from datetime import datetime, timezone

from models.database import JWT_SECRET, db, hash_password


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def client_ip(request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")) or ""


# ── subscriber identity cookie (KMS_CONTENT_TIERS_PLAN R5) ──────────────────────
SUBSCRIBER_COOKIE = "user_email"
SUBSCRIBER_COOKIE_DAYS = 90


def parent_domain(settings: dict) -> str:
    """`.carlosartiles.com`-style shared-cookie domain derived from site_url, so
    one subscription is recognized on the site, News, Brief and the KMS alike."""
    host = ((settings or {}).get("site_url") or "").split("//")[-1] \
        .split("/")[0].split(":")[0].strip().lower()
    parts = [p for p in host.split(".") if p]
    return "." + ".".join(parts[-2:]) if len(parts) >= 2 else ""


def set_subscriber_cookie(resp, email: str, settings: dict) -> None:
    """90-day subscriber cookie on the parent domain (NOT httponly — the News/
    Brief gate scripts read it client-side)."""
    kw = {"max_age": 60 * 60 * 24 * SUBSCRIBER_COOKIE_DAYS,
          "samesite": "lax", "secure": True}
    dom = parent_domain(settings)
    if dom:
        kw["domain"] = dom
    resp.set_cookie(SUBSCRIBER_COOKIE, email, **kw)


# ── anti-bot: signed form token (replaces the visible CAPTCHA on subscribe) ──────
def make_form_token() -> str:
    """Signed `ts.sig` embedded in the subscribe form → lets the server enforce a
    min fill-time + expiry and verify integrity without server-side session state."""
    ts = str(int(time.time()))
    sig = hmac.new(JWT_SECRET.encode(), ts.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{ts}.{sig}"


def valid_form_token(tok: str, min_secs: int = 2, max_secs: int = 7200) -> bool:
    """True when the token is intact, not stale, and not submitted impossibly fast."""
    try:
        ts_s, sig = (tok or "").split(".", 1)
        good = hmac.new(JWT_SECRET.encode(), ts_s.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(sig, good):
            return False
        return min_secs <= (time.time() - int(ts_s)) <= max_secs
    except Exception:
        return False


# ── history writes ──────────────────────────────────────────────────────────────
async def record_signature(request, member: dict, first_name: str, last_name: str,
                           email: str, author: str, aux_id) -> None:
    """Append ONE signing event to `signatures` every time the disclaimer is accepted
    (new OR returning). `members` is created once; `signatures` grows on every accept."""
    await db.signatures.insert_one({
        "id": f"sig_{uuid.uuid4().hex[:12]}",
        "member_id": member.get("member_id"),
        "membership_number": member.get("membership_number"),
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "author": author,
        "aux_id": aux_id,
        "disclaimer_accepted": True,
        "ip": client_ip(request),
        "signed_at": _now(),
    })


async def record_login(request, member: dict, source: str, author: str = "") -> None:
    """Append one login / access event to `member_logins` (cross-portal history;
    sources: main|frontend|news|kms|morning)."""
    await db.member_logins.insert_one({
        "member_id": member.get("member_id"),
        "membership_number": member.get("membership_number"),
        "source": source,
        "author": author,
        "ip": client_ip(request),
        "logged_at": _now(),
    })


# ── the funnel ──────────────────────────────────────────────────────────────────
async def process_subscribe(request, background_tasks, body: dict, *,
                            source: str, login_source: str,
                            default_sponsor_number=None) -> dict:
    """Full subscribe flow shared by News + Morning Brief. Returns a JSON-able dict;
    an optional ``code`` key carries the HTTP status the caller should apply.

    source            – stored as `registration_source` ('auxnews' | 'morningbrief')
    login_source      – `member_logins.source` ('news' | 'morning')
    default_sponsor_number – used when the URL carried no `aux-<N>` (Morning ⇒ 1;
                             News ⇒ None = no sponsor).
    """
    from utils.rate_limit import enforce_rate_limit
    await enforce_rate_limit(request, key=f"{login_source}_subscribe", max_requests=8, window_seconds=60)

    first_name = (body.get("first_name") or "").strip()
    last_name = (body.get("last_name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    author = (body.get("author") or "").strip()
    try:
        aux_id = int(body.get("aux_id")) if body.get("aux_id") not in (None, "", "null") else None
    except (TypeError, ValueError):
        aux_id = None

    if not first_name or not last_name or "@" not in email:
        return {"status": "error", "message": "Please provide name and a valid email.", "code": 400}

    # ── Anti-bot (replaces the visible CAPTCHA) ──────────────────────────────────
    # 1) Honeypot: hidden field real users never fill → silently fake-ok.
    if (body.get("website") or "").strip():
        return {"status": "ok", "message": "Subscription successful", "id_membership": 0}
    # 2) Signed form token: integrity + min fill-time + expiry.
    token = body.get("form_token") or ""
    if not valid_form_token(token):
        return {"status": "error",
                "message": "Your session expired — please reopen the form and try again.", "code": 400}
    # 3) Acceptance == proof-of-interaction (checkbox change handler set it to the token).
    if body.get("accepted") != token:
        return {"status": "error",
                "message": "Please read and accept the Disclaimer and Terms to continue.", "code": 400}

    # Already a member → don't create another; just log this new signing/login event.
    existing = await db.members.find_one({"email": email}, {"_id": 0})
    if existing:
        first_name = existing.get("first_name") or first_name
        last_name = existing.get("last_name") or last_name
        await db.news_subscriptions.update_one(
            {"email": email},
            {"$set": {"email": email, "author": author, "source": source,
                      "last_seen_at": _now()},
             "$setOnInsert": {"first_name": first_name, "last_name": last_name,
                              "member_id": existing.get("member_id"),
                              "membership_number": existing.get("membership_number"),
                              "created_at": _now()}},
            upsert=True,
        )
        await record_signature(request, existing, first_name, last_name, email, author, aux_id)
        if existing.get("account_status") != "deactivated":
            await record_login(request, existing, login_source, author)
        return {"status": "ok", "message": "You are already subscribed",
                "id_membership": existing.get("membership_number")}

    # Resolve sponsor by membership_number: the aux-N in the URL, else the caller's
    # default root (Morning ⇒ AUX-1; News ⇒ none).
    from routes.membership import get_aux_prefix, get_next_membership_number
    effective_aux = aux_id if aux_id is not None else default_sponsor_number
    sponsor = None
    if effective_aux is not None:
        sponsor = await db.members.find_one({"membership_number": effective_aux}, {"_id": 0})

    membership_number = await get_next_membership_number()
    prefix = await get_aux_prefix()
    membership_id = f"{prefix}-{membership_number}"
    member_id = f"member_{uuid.uuid4().hex[:12]}"
    default_level = await db.member_levels.find_one({}, {"_id": 0, "id": 1}, sort=[("order", 1)])

    new_member = {
        "member_id": member_id,
        "membership_number": membership_number,
        "membership_id": membership_id,
        "username": email,
        "email": email,
        "password_hash": hash_password(secrets.token_urlsafe(16)),  # set later via reset/incode
        "first_name": first_name,
        "last_name": last_name,
        "level_id": default_level["id"] if default_level else None,
        "member_type_id": None,
        "sponsor_id": sponsor.get("member_id") if sponsor else None,
        "sponsor_membership_number": sponsor.get("membership_number") if sponsor else None,
        "avatar": "", "biography": "", "social_links": {},
        "status": "active", "role": "member", "cms_roles": ["role_member"],
        "account_status": "pre_registered",  # no usable password yet; incode → active later
        "registration_source": source,
        "news_author": author,
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.members.insert_one(new_member)

    await db.news_subscriptions.insert_one({
        "member_id": member_id, "membership_number": membership_number,
        "email": email, "first_name": first_name, "last_name": last_name,
        "author": author, "source": source,
        "sponsor_membership_number": new_member["sponsor_membership_number"],
        "created_at": _now(),
    })
    await record_signature(request, new_member, first_name, last_name, email, author, aux_id)

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    try:
        from utils.kms_sync import sync_member_to_kms
        background_tasks.add_task(sync_member_to_kms, settings, new_member, "")
    except Exception:
        pass

    return {"status": "ok", "message": "Subscription successful", "id_membership": membership_number}
