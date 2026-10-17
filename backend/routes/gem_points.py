"""gem2i reward points — B3 (purchase) + B5 (share → referral), legacy rules.

Rules ported verbatim from the legacy PHP (Plesk backup):
  * paypal_ipn.php      — paid ticket: buyer += event `purchase_for_self`
                          (flat per transaction, not per quantity); if the
                          purchase came through a member's invite link, that
                          inviter += `friend_purchased_via_invite`.
  * points-invite-event.php — member shares/invites to an event:
                          sharer += `invite_to_purchase_share`.
  * ajax-event-add-gues-list.php — guest-list join stores the event's
                          `yourself_points` ON the pass (no history row).
The other configured values (each_additional, purchase_for_a_friend,
add_friend, invite_friends, list_registration, list_check_in) were never
awarded by the legacy code, so they are not awarded here either.

Differences from legacy (safety, D-GEM-2026-06):
  * every award has a unique `dedupe_key` → a webhook retry never double-pays;
  * share points: at most once per member per event per day (legacy paid on
    every click — farmable);
  * self-referral is ignored.

History rows land in gem_points_history next to the migrated legacy rows
(same shape, `source:'gem2i'`, `legacy` absent).

Member: GET  /api/member/gem/points                  total + recent history
        POST /api/member/gem/events/{event_id}/share  award share points
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from models.database import db, logger
from routes.membership import get_current_member

router = APIRouter()


async def ensure_points_indexes():
    await db.gem_points_history.create_index("dedupe_key", unique=True, sparse=True)
    await db.gem_points_history.create_index([("member_id", 1), ("created_at", 1)])


def event_points(ev: dict, key: str) -> int:
    legacy = ((ev or {}).get("points") or {}).get("legacy_eticket") or {}
    try:
        return max(0, int(legacy.get(key) or 0))
    except (TypeError, ValueError):
        return 0


async def award(member_id: str, points: int, description: str, dedupe_key: str,
                event_id: str | None = None, transaction_id: str | None = None) -> bool:
    """Insert one history row; False if zero points or already awarded."""
    if not member_id or points <= 0:
        return False
    try:
        await db.gem_points_history.insert_one({
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "description": description,
            "points": points,
            "event_id": event_id,
            "transaction_id": transaction_id,
            "source": "gem2i",
            "dedupe_key": dedupe_key,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return True
    except DuplicateKeyError:
        return False


async def award_ticket_points(tx: dict, ev: dict):
    """Called once from ticket completion. Never raises."""
    try:
        await award(tx.get("member_id"), event_points(ev, "purchase_for_self"),
                    "Purchase for self", f"purchase:{tx['id']}", tx.get("event_id"), tx["id"])
        ref = tx.get("referrer_member_id")
        if ref and ref != tx.get("member_id"):
            await award(ref, event_points(ev, "friend_purchased_via_invite"),
                        "Friend Purchased via Invite", f"referral:{tx['id']}", tx.get("event_id"), tx["id"])
    except Exception as e:  # points must never break a paid checkout
        logger.warning(f"gem points award failed for tx {tx.get('id')}: {e}")


async def resolve_referrer(ref: str | None, buyer_id: str) -> str | None:
    """`ref` = inviter's membership_id from the share link (?ref=GEM-n)."""
    ref = (ref or "").strip()
    if not ref:
        return None
    m = await db.members.find_one({"membership_id": ref}, {"_id": 0, "member_id": 1})
    if not m or m["member_id"] == buyer_id:
        return None
    return m["member_id"]


@router.get("/member/gem/points")
async def my_points(member: dict = Depends(get_current_member)):
    mid = member["member_id"]
    agg = await db.gem_points_history.aggregate([
        {"$match": {"member_id": mid}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}},
    ]).to_list(1)
    rows = await db.gem_points_history.find(
        {"member_id": mid}, {"_id": 0, "dedupe_key": 0}).sort("created_at", -1).to_list(100)
    return {"total": agg[0]["total"] if agg else 0, "history": rows}


@router.post("/member/gem/events/{event_id}/share")
async def share_event(event_id: str, member: dict = Depends(get_current_member)):
    from routes.gem_passes import _public_event_or_404
    ev = await _public_event_or_404(event_id)
    mid = member["member_id"]
    day = datetime.now(timezone.utc).date().isoformat()
    pts = event_points(ev, "invite_to_purchase_share")
    awarded = await award(mid, pts, "Invite to Purchase / Share",
                          f"share:{mid}:{event_id}:{day}", event_id)
    return {"awarded": pts if awarded else 0,
            "ref": member.get("membership_id") or ""}
