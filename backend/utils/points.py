"""Member Points engine — KMS_MEMBER_POINTS_PLAN Phase 3 (D-2026-57).

One shared engine for every point-earning event (KMS views/comments/shares,
referral signup/activation, milestone bonuses, manual admin adjusts).
Mirrors the utils/leadcapture.py precedent: callers pass the motor db handle.

Design invariants:
- points_ledger is the append-only source of truth; every award carries a
  unique idempotency_key so replays/races can never double-credit.
- members.points_balance is a cached $inc'd rollup (scripts/points_recompute.py
  repairs/verifies it from the ledger).
- The whole system is dormant unless rewards_config {key:"member_points"}
  has enabled:true — award() is then a no-op (event collections like
  kms_post_views still fill upstream, by design: history predates points).
- KMS `mid` = str(members._id) (members carry NO `id` field); the platform's
  canonical key is `member_id`. Ledger rows carry BOTH.
"""
import logging
import time
import uuid
from datetime import datetime, timezone

from bson import ObjectId

logger = logging.getLogger(__name__)

CONFIG_KEY = "member_points"

DEFAULT_ACTIONS = {
    "view": 1,
    "comment": 5,
    "share": 10,
    # per-product contributor-share values (PMS_ROLES_POINTS_PLAN Phase 6);
    # a per-item `share_points` on the content doc still overrides these
    "share_kms": 10,
    "share_news": 10,
    "share_brief": 10,
    "referral_signup": 25,
    "referral_activation": 100,
}
DEFAULT_ANTI_ABUSE = {
    "max_pointed_views_per_day": 50,
    "max_pointed_comments_per_day": 20,
    "max_pointed_comments_per_post": 1,
    "max_pointed_shares_per_day": 10,
}

_cfg_cache: dict = {"at": 0.0, "doc": None}
_indexes_ready = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_indexes(db):
    global _indexes_ready
    if _indexes_ready:
        return
    try:
        await db.points_ledger.create_index("idempotency_key", unique=True)
        await db.points_ledger.create_index([("mid", 1), ("action", 1), ("created_at", -1)])
        await db.member_rewards.create_index(
            [("mid", 1), ("milestone_id", 1)], unique=True)
        _indexes_ready = True
    except Exception:
        logger.warning("points index creation failed", exc_info=True)


async def config(db) -> dict:
    """rewards_config merged over defaults; 30s per-worker cache (KMS convention)."""
    if time.time() - _cfg_cache["at"] < 30 and _cfg_cache["doc"] is not None:
        return _cfg_cache["doc"]
    doc = await db.rewards_config.find_one({"key": CONFIG_KEY}) or {}
    cfg = {
        "enabled": bool(doc.get("enabled")),
        "actions": {**DEFAULT_ACTIONS, **(doc.get("actions") or {})},
        "anti_abuse": {**DEFAULT_ANTI_ABUSE, **(doc.get("anti_abuse") or {})},
        "milestones": doc.get("milestones") or [],
    }
    _cfg_cache["at"] = time.time()
    _cfg_cache["doc"] = cfg
    return cfg


def bust_config_cache():
    _cfg_cache["at"] = 0.0
    _cfg_cache["doc"] = None


async def _resolve_member(db, mid: str | None, membership_number=None):
    member = None
    if mid:
        try:
            member = await db.members.find_one({"_id": ObjectId(mid)})
        except Exception:
            member = None
        if not member:
            member = await db.members.find_one({"member_id": mid})
    if not member and membership_number is not None:
        member = await db.members.find_one({"membership_number": membership_number})
    return member


def _mid_of(member: dict) -> str:
    return str(member.get("_id"))


async def _day_count(db, mid: str, action: str) -> int:
    day_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00")
    return await db.points_ledger.count_documents(
        {"mid": mid, "action": action, "created_at": {"$gte": day_start}})


async def _insert_ledger(db, member: dict, action: str, points: int,
                         ref: dict | None, key: str) -> bool:
    """Insert one ledger row + $inc the cached balance. False on idempotency dup."""
    mid = _mid_of(member)
    try:
        await db.points_ledger.insert_one({
            "id": uuid.uuid4().hex,
            "member_id": member.get("member_id") or mid,
            "mid": mid,
            "membership_number": member.get("membership_number"),
            "action": action, "points": int(points),
            "source": "kms", "ref": ref or {},
            "idempotency_key": key,
            "created_at": _now_iso()})
    except Exception as exc:  # DuplicateKeyError → already credited
        if "duplicate key" in str(exc).lower() or "E11000" in str(exc):
            return False
        raise
    await db.members.update_one(
        {"_id": member["_id"]},
        {"$inc": {"points_balance": int(points)},
         "$set": {"points_updated_at": _now_iso()}})
    return True


async def award(db, *, action: str, mid: str | None = None,
                membership_number=None, ref: dict | None = None,
                key: str, points: int | None = None) -> bool:
    """Credit one action. Returns True if points landed (False = disabled /
    zero-value / capped / duplicate / member not found). Never raises to the
    caller's request path — log-and-swallow.

    ⚠ SUPERSEDED BY THE MMS (MMS plan D2, executed Phase 3 2026-07-15): every
    call now FORWARDS to the MMS event bus as a `kms_<action>` event — the MMS
    earning rules decide amounts/caps there. The legacy engine below only runs
    if rewards_config {key:"member_points"}.enabled is true, which must stay
    FALSE (never enable both ledgers — the drift the D2 ruling exists to
    prevent). The caller's idempotency `key` becomes the MMS event_key, so
    send-level dedup is preserved 1:1."""
    try:
        from utils.mms_events import emit_soon
        subject = None
        if (ref or {}).get("post_id") is not None:
            subject = f"post:{ref['post_id']}"
        emit_soon(db, {
            "type": f"kms_{action}",
            "source": "kms",
            "mid": mid or None,
            "membership_number": membership_number,
            "subject": subject,
            "payload": dict(ref or {}),
            "event_key": f"kms:{key}",
        })
    except Exception:
        logger.warning("mms forward failed (action=%s)", action, exc_info=True)
    try:
        cfg = await config(db)
        if not cfg["enabled"]:
            return False
        pts = points if points is not None else int(cfg["actions"].get(action, 0))
        if pts == 0 and action != "manual_adjust":
            return False
        member = await _resolve_member(db, mid, membership_number)
        if not member:
            return False
        await _ensure_indexes(db)
        m = _mid_of(member)
        aa = cfg["anti_abuse"]
        daily_cap = aa.get(f"max_pointed_{action}s_per_day")
        if daily_cap and await _day_count(db, m, action) >= int(daily_cap):
            return False
        if action == "comment" and (ref or {}).get("post_id") is not None:
            per_post = int(aa.get("max_pointed_comments_per_post") or 0)
            if per_post and await db.points_ledger.count_documents(
                    {"mid": m, "action": "comment",
                     "ref.post_id": ref["post_id"]}) >= per_post:
                return False
        if not await _insert_ledger(db, member, action, pts, ref, key):
            return False
        await check_milestones(db, member, cfg)
        return True
    except Exception:
        logger.warning("points award failed (action=%s key=%s)", action, key,
                       exc_info=True)
        return False


async def _metric_value(db, member: dict, metric: str) -> int:
    mid = _mid_of(member)
    if metric == "views":
        return await db.kms_post_views.count_documents({"member_id": mid})
    if metric == "points_total":
        fresh = await db.members.find_one({"_id": member["_id"]},
                                          {"points_balance": 1})
        return int((fresh or {}).get("points_balance") or 0)
    if metric in ("comments", "shares"):
        return await db.points_ledger.count_documents(
            {"mid": mid, "action": metric.rstrip("s")})
    if metric == "referrals_activated":
        return await db.points_ledger.count_documents(
            {"mid": mid, "action": "referral_activation"})
    return 0


async def check_milestones(db, member: dict, cfg: dict | None = None):
    """Grant every active milestone whose threshold the member has crossed.
    Each fires once per member (unique mid+milestone_id). Points milestones
    append a milestone_bonus ledger row; badges $addToSet members.badges;
    gifts/invitations queue as pending_fulfillment for the admin."""
    try:
        cfg = cfg or await config(db)
        if not cfg["enabled"] or not cfg["milestones"]:
            return
        await _ensure_indexes(db)
        mid = _mid_of(member)
        for ms in cfg["milestones"]:
            if not ms.get("active", True) or not ms.get("id"):
                continue
            metric = ms.get("metric") or ""
            threshold = int(ms.get("threshold") or 0)
            if threshold <= 0:
                continue
            if await db.member_rewards.find_one(
                    {"mid": mid, "milestone_id": ms["id"]}, {"_id": 1}):
                continue
            if await _metric_value(db, member, metric) < threshold:
                continue
            rtype = ms.get("reward_type") or "points"
            grant = {
                "id": uuid.uuid4().hex,
                "member_id": member.get("member_id") or mid, "mid": mid,
                "membership_number": member.get("membership_number"),
                "milestone_id": ms["id"], "metric": metric,
                "threshold": threshold, "reward_type": rtype,
                "reward_value": ms.get("reward_value"),
                "title": ms.get("title"),
                "granted_at": _now_iso(),
                "status": "granted" if rtype in ("points", "badge")
                          else "pending_fulfillment",
                "fulfilled_at": None, "fulfilled_by": None}
            try:
                await db.member_rewards.insert_one(grant)
            except Exception:
                continue  # unique-index race: someone else granted it
            if rtype == "points":
                try:
                    bonus = int(ms.get("reward_value") or 0)
                except (TypeError, ValueError):
                    bonus = 0
                if bonus:
                    await _insert_ledger(db, member, "milestone_bonus", bonus,
                                         {"milestone_id": ms["id"]},
                                         f"milestone:{mid}:{ms['id']}")
            elif rtype == "badge" and ms.get("reward_value"):
                await db.members.update_one(
                    {"_id": member["_id"]},
                    {"$addToSet": {"badges": ms["reward_value"]}})
            title = ms.get("title")
            if isinstance(title, dict):
                title = title.get("en") or title.get("es") or ""
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "member_id": member.get("member_id") or mid,
                "type": "points_milestone",
                "title": "Reward earned!",
                "message": (f"You reached {threshold} {metric.replace('_', ' ')}"
                            f"{' — ' + str(title) if title else ''}"),
                "link": "/my-account", "read": False,
                "created_at": _now_iso()})
    except Exception:
        logger.warning("milestone check failed", exc_info=True)
