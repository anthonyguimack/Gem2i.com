"""KMS author peer review (s150, KMS_AUTHOR_PEER_REVIEW_PLAN).

Authors never publish on their own. A finished post goes to «In review»; the
OTHER authors approve / decline it; with N approvals (CMS → Settings →
`kms_author_approvals_required`, default 2) it is published automatically, and
once N can no longer be reached it is declined. The author is told either way
(CMS bell + email). The admin's vote is DECISIVE (approve = publish now,
decline = declined now) and the admin alone approves edits to an already
published author post (stored apart in `review.pending_edit`, the live version
stays up until then).

Post doc field:
    review: {state: in_review|approved|declined, required, submitted_at,
             decided_at, decided_by, votes: [{m, name, vote, comment, at}],
             pending_edit: {...doc fields...} | absent, edit_submitted_at}
`m` = membership_number (the KMS session's stable member key).
"""
import logging
from datetime import datetime, timezone

from fastapi import Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from kms import core
from kms.admin import _admin_gate, _now_str, _render_admin, admin_router
from kms.core import db

logger = logging.getLogger(__name__)
DEFAULT_REQUIRED = 2


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def approvals_required() -> int:
    s = await db.settings.find_one({}, {"_id": 0, "kms_author_approvals_required": 1}) or {}
    try:
        return max(1, int(s.get("kms_author_approvals_required") or DEFAULT_REQUIRED))
    except (TypeError, ValueError):
        return DEFAULT_REQUIRED


async def _authors() -> list:
    """Active authors (admins excluded — the admin decides, it is not a peer)."""
    from kms.admin_site import _author_only_query
    q = {**(await _author_only_query()), "role": {"$ne": "admin"},
         "cms_roles": {"$ne": "role_admin"}, "account_status": {"$ne": "inactive"}}
    return [m async for m in db.members.find(
        q, {"_id": 0, "member_id": 1, "membership_number": 1, "first_name": 1,
            "last_name": 1, "email": 1})]


async def reviewers_for(post: dict) -> list:
    """Every active author EXCEPT the one who wrote the post (P1)."""
    own = post.get("author_id_membership")
    return [m for m in await _authors() if m.get("membership_number") != own]


def _counts(review: dict) -> tuple:
    votes = review.get("votes") or []
    return (sum(1 for v in votes if v.get("vote") == "approve"),
            sum(1 for v in votes if v.get("vote") == "decline"))


def new_review(required: int) -> dict:
    return {"state": "in_review", "required": required, "submitted_at": _iso(), "votes": []}


# ── notifications ────────────────────────────────────────────────────────────
async def _member_by_number(n):
    return await db.members.find_one({"membership_number": n},
                                     {"_id": 0, "member_id": 1, "email": 1, "first_name": 1})


async def _bell(member_id: str, title: str, message: str, link: str = "") -> None:
    import uuid
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "member_id": member_id, "type": "kms_review",
        "title": title, "message": message, "link": link, "read": False, "created_at": _iso()})


async def _email(key: str, member: dict, variables: dict) -> None:
    try:
        from utils.email_render import render_and_send
        settings = await db.settings.find_one({}, {"_id": 0}) or {}
        await render_and_send(key, settings, member.get("email") or "", member.get("first_name") or "Author",
                              {"name": member.get("first_name") or "", **variables})
    except Exception:  # best effort — a mail failure never blocks the decision
        logger.warning("kms review email %s failed", key, exc_info=True)


def _base_url(request: Request) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    return f"{proto}://{host}" if host else ""


async def _notify_author(request: Request, post: dict, approved: bool, comments: str = "") -> None:
    author = await _member_by_number(post.get("author_id_membership"))
    if not author:
        return
    base = _base_url(request)
    title = post.get("title") or "Your post"
    if approved:
        link = f"{base}/{post.get('slug')}"
        await _bell(author["member_id"], "Your post was published",
                    f"«{title}» was approved and is now live in the KMS: {link}", link)
        await _email("kms_post_approved", author, {"post_title": title, "post_link": link})
    else:
        link = f"{base}/admin/edit-post/{post.get('id')}"
        await _bell(author["member_id"], "Your post was not approved",
                    f"«{title}» did not get the approvals needed. {comments}".strip(), link)
        await _email("kms_post_declined", author,
                     {"post_title": title, "post_link": link, "comments": comments or "—"})


async def notify_reviewers(request: Request, post: dict) -> None:
    """P4: tell the other authors a post is waiting (bell only)."""
    link = f"{_base_url(request)}/admin/review-queue"
    for m in await reviewers_for(post):
        await _bell(m["member_id"], "New post to review",
                    f"«{post.get('title')}» is waiting for your review: {link}", link)


def _comments(review: dict) -> str:
    parts = [f"{v.get('name')}: {v.get('comment')}" for v in (review.get("votes") or [])
             if v.get("vote") == "decline" and (v.get("comment") or "").strip()]
    return " · ".join(parts)


# ── decisions ────────────────────────────────────────────────────────────────
async def _publish(request: Request, post: dict, by: str) -> None:
    upd = {"status": 1, "is_draft": 0, "is_scheduled": 0, "scheduled_at": None,
           "updated_at": _now_str(), "review.state": "approved",
           "review.decided_at": _iso(), "review.decided_by": by}
    await db.kms_posts.update_one({"id": post["id"]}, {"$set": upd})
    saved = await db.kms_posts.find_one({"id": post["id"]})
    from kms import news_bridge
    await news_bridge.sync_post(saved)
    await _notify_author(request, saved, approved=True)


async def _decline(request: Request, post: dict, by: str) -> None:
    await db.kms_posts.update_one({"id": post["id"]}, {"$set": {
        "status": 0, "is_draft": 1, "is_scheduled": 0, "updated_at": _now_str(),
        "review.state": "declined", "review.decided_at": _iso(), "review.decided_by": by}})
    saved = await db.kms_posts.find_one({"id": post["id"]})
    await _notify_author(request, saved, approved=False, comments=_comments(saved.get("review") or {}))


async def evaluate(request: Request, post_id: int) -> str:
    """Peer rule (P1): publish at N approvals; decline once N is unreachable."""
    post = await db.kms_posts.find_one({"id": post_id})
    rv = (post or {}).get("review") or {}
    if rv.get("state") != "in_review":
        return rv.get("state") or ""
    need = int(rv.get("required") or DEFAULT_REQUIRED)
    approve, decline = _counts(rv)
    eligible = len(await reviewers_for(post))
    if approve >= need:
        await _publish(request, post, "authors")
        return "approved"
    pending = max(0, eligible - approve - decline)
    if approve + pending < need and approve + decline > 0:
        await _decline(request, post, "authors")
        return "declined"
    return "in_review"


async def admin_approve(request: Request, post: dict) -> None:
    """The admin's approval is decisive (P3). For a published post with a pending
    edit it applies the edit; otherwise it publishes the post now."""
    rv = post.get("review") or {}
    if rv.get("pending_edit"):
        edit = dict(rv["pending_edit"])
        edit.update(updated_at=_now_str())
        await db.kms_posts.update_one({"id": post["id"]}, {
            "$set": {**edit, "review.state": "approved", "review.decided_at": _iso(),
                     "review.decided_by": "admin"},
            "$unset": {"review.pending_edit": "", "review.edit_submitted_at": ""}})
        saved = await db.kms_posts.find_one({"id": post["id"]})
        from kms import news_bridge
        await news_bridge.sync_post(saved)
        author = await _member_by_number(post.get("author_id_membership"))
        if author:
            await _bell(author["member_id"], "Your edit was approved",
                        f"The changes to «{saved.get('title')}» are now live.")
        return
    if rv:
        await _publish(request, post, "admin")
    else:  # admin's own / legacy pending post — plain publish, as before
        await db.kms_posts.update_one({"id": post["id"]}, {"$set": {"status": 1, "is_draft": 0}})
        from kms import news_bridge
        await news_bridge.sync_post(await db.kms_posts.find_one({"id": post["id"]}))


# ── routes ───────────────────────────────────────────────────────────────────
@admin_router.get("/admin/review-queue", response_class=HTMLResponse)
async def review_queue(request: Request):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    me = user.get("m")
    filt = {"$or": [{"review.state": "in_review"}, {"review.pending_edit": {"$exists": True}}]}
    if not user.get("a"):
        # authors: OTHER authors' posts in review that I have NOT voted on yet
        # (voted ones move to «Reviewed by me»); edits are admin-only.
        filt = {"review.state": "in_review", "author_id_membership": {"$ne": me},
                "review.votes.m": {"$ne": me}}
    posts = [p async for p in db.kms_posts.find(filt).sort("review.submitted_at", 1).limit(200)]
    return await _render_admin(request, user, "review_queue.html", active="review-queue",
                               title="Review Queue", rows=await _rows(posts, me), cats=await _cats(),
                               mode="queue")


async def _cats():
    return await core.categories((await core.default_lang()).get("id", 1))


async def _rows(posts: list, me) -> list:
    rows = []
    for p in posts:
        rv = p.get("review") or {}
        a, d = _counts(rv)
        mine = next((v for v in reversed(rv.get("votes") or []) if v.get("m") == me), None)
        rows.append({"p": p, "approve": a, "decline": d, "required": rv.get("required") or DEFAULT_REQUIRED,
                     "eligible": len(await reviewers_for(p)), "my_vote": (mine or {}).get("vote"),
                     "my_comment": (mine or {}).get("comment"), "my_at": (mine or {}).get("at"),
                     "state": rv.get("state"),
                     "edit": bool(rv.get("pending_edit")) and rv.get("state") != "in_review"})
    return rows


@admin_router.get("/admin/reviewed-by-me", response_class=HTMLResponse)
async def reviewed_by_me(request: Request):
    """Posts I already voted on — my vote, progress and current outcome. While a
    post is still in review the vote can be changed from here."""
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    me = user.get("m")
    posts = [p async for p in db.kms_posts.find({"review.votes.m": me}).sort("review.submitted_at", -1).limit(300)]
    return await _render_admin(request, user, "review_queue.html", active="reviewed-by-me",
                               title="Reviewed by me", rows=await _rows(posts, me), cats=await _cats(),
                               mode="mine")


@admin_router.post("/admin/review-vote")
async def review_vote(request: Request, post_id: int = Form(...), vote: str = Form(...),
                      comment: str = Form("")):
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    nxt = (await request.form()).get("next") or ""
    back = RedirectResponse("/admin/reviewed-by-me" if nxt == "mine" else "/admin/review-queue", status_code=303)
    if vote not in ("approve", "decline"):
        return back
    post = await db.kms_posts.find_one({"id": post_id})
    if not post:
        return back
    rv = post.get("review") or {}
    if user.get("a"):  # decisive (P2/P3)
        if vote == "approve":
            if rv:
                await db.kms_posts.update_one({"id": post_id}, {"$push": {"review.votes": {
                    "m": user.get("m"), "name": user.get("u"), "vote": "approve",
                    "comment": (comment or "").strip()[:2000], "at": _iso(), "admin": True}}})
                post = await db.kms_posts.find_one({"id": post_id})
            await admin_approve(request, post)
        elif rv.get("pending_edit") and rv.get("state") != "in_review":
            await db.kms_posts.update_one({"id": post_id}, {"$unset": {
                "review.pending_edit": "", "review.edit_submitted_at": ""}})
            author = await _member_by_number(post.get("author_id_membership"))
            if author:
                await _bell(author["member_id"], "Your edit was not approved",
                            f"The changes to «{post.get('title')}» were not approved. {comment}".strip())
        elif rv:
            await db.kms_posts.update_one({"id": post_id}, {"$push": {"review.votes": {
                "m": user.get("m"), "name": user.get("u"), "vote": "decline",
                "comment": (comment or "").strip()[:2000], "at": _iso(), "admin": True}}})
            await _decline(request, await db.kms_posts.find_one({"id": post_id}), "admin")
        return back
    # author vote — never on their own post, only while in review (P1 / rule 3)
    if rv.get("state") != "in_review" or post.get("author_id_membership") == user.get("m"):
        return back
    if vote == "decline" and not (comment or "").strip():
        return RedirectResponse("/admin/review-queue?err=comment", status_code=303)
    votes = [v for v in rv.get("votes") or [] if v.get("m") != user.get("m")]
    votes.append({"m": user.get("m"), "name": user.get("u"), "vote": vote,
                  "comment": (comment or "").strip()[:2000], "at": _iso()})
    await db.kms_posts.update_one({"id": post_id}, {"$set": {"review.votes": votes}})
    await evaluate(request, post_id)
    return back


@admin_router.get("/admin/review-preview/{post_id}", response_class=HTMLResponse)
async def review_preview(request: Request, post_id: int):
    """Read-only render for reviewers; for the admin, a pending edit shows the
    NEW version (what would go live)."""
    user, r = await _admin_gate(request)
    if r is not None:
        return r
    post = await db.kms_posts.find_one({"id": post_id})
    rv = (post or {}).get("review") or {}
    allowed = post and (user.get("a") or (rv.get("state") == "in_review"
                                          and post.get("author_id_membership") != user.get("m")))
    if not allowed:
        return RedirectResponse("/admin/review-queue", status_code=303)
    if user.get("a") and rv.get("pending_edit"):
        post = {**post, **rv["pending_edit"]}
    from kms.public import _render_post
    return await _render_post(request, post, preview=True)
