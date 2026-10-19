"""KMS public interaction routes — Phase 4a: comments, poll votes, newsletter.

Registered before the public catch-alls (kms/__init__.py). The whole site is
login-gated, so comment/vote authors always come from the kms_session — never
from client-supplied identity fields.
"""
import logging
import re
import uuid

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from kms import core
from kms.core import db, current_user, kms_enabled
from utils import points as member_points

logger = logging.getLogger(__name__)
interact_router = APIRouter()

EMAIL_RX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
QUIZ_PASS_PCT = 80   # article quiz earns points only from this score up (= LMS quiz_passed)


async def _next_id(coll) -> int:
    doc = await coll.find_one(sort=[("id", -1)])
    return int(doc["id"]) + 1 if doc and doc.get("id") is not None else 1


def _back(request: Request, fallback: str = "/") -> RedirectResponse:
    ref = request.headers.get("referer") or fallback
    return RedirectResponse(ref, status_code=303)


async def _post_visible_to(request: Request, post_id: int) -> bool:
    """Tier check for post-scoped writes (R8): acting on a post you can't see
    is treated as acting on a post that doesn't exist."""
    viewer = await core.resolve_viewer(request)
    post = await db.kms_posts.find_one({"id": post_id}, {"tier": 1})
    return bool(post) and core.post_visible(post, (viewer or {}).get("tier") or "public")


# ── comments ─────────────────────────────────────────────────────────────────
@interact_router.post("/comment-add")
async def comment_add(request: Request, post_id: int = Form(...),
                      comment: str = Form(""), parent_id: int = Form(0),
                      slug: str = Form("")):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    if not await _post_visible_to(request, post_id):
        return HTMLResponse("Not found", status_code=404)
    s = await core.kms_settings()
    gs = s.get("general") or {}
    if gs.get("comment_system") != 1:
        return _back(request)
    comment = comment.strip()[:5000]
    if not comment:
        return _back(request, f"/{slug}" if slug else "/")
    post = await db.kms_posts.find_one({"id": post_id}, {"slug": 1})
    if not post:
        return _back(request)
    status = 0 if gs.get("comment_approval_system") == 1 else 1
    cid = await _next_id(db.kms_comments)
    await db.kms_comments.insert_one({
        "id": cid,
        "parent_id": parent_id or 0, "post_id": post_id,
        "user_id": user.get("mid"), "email": user.get("e"),
        "name": user.get("u"), "comment": comment,
        "ip_address": (request.client.host if request.client else "") or "",
        "like_count": 0, "status": status, "created_at": core_now()})
    if status == 1:   # auto-approved → point now; moderated comments point at approval (D3)
        await member_points.award(
            db, action="comment", mid=user.get("mid"),
            membership_number=user.get("m"),
            ref={"post_id": post_id, "comment_id": cid}, key=f"comment:{cid}")
    suffix = "#comments" if status == 1 else "?cp=1#comments"
    return RedirectResponse(f"/{post.get('slug')}{suffix}", status_code=303)


def core_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


# ── share tracking (Member Points Phase 4) ───────────────────────────────────
SHARE_NETWORKS = {"facebook", "x", "linkedin", "whatsapp", "pinterest"}
_share_index_ready = False


@interact_router.post("/share-track")
async def share_track(request: Request, post_id: int = Form(...),
                      network: str = Form("")):
    """Fired by the post-page share buttons (fetch keepalive) on click.
    One kms_share_events doc per (member, post, network) — pointed once;
    repeats only grow share_count. Honest caveat: we count the button click,
    the network's own final post step is invisible (industry standard)."""
    global _share_index_ready
    if not await kms_enabled():
        return JSONResponse({"ok": False}, status_code=404)
    user = current_user(request)
    if not user or not user.get("mid"):
        return JSONResponse({"ok": False}, status_code=401)
    network = (network or "").strip().lower()
    if network not in SHARE_NETWORKS:
        return JSONResponse({"ok": False}, status_code=400)
    if not await _post_visible_to(request, post_id):
        return JSONResponse({"ok": False}, status_code=404)
    post = await db.kms_posts.find_one({"id": post_id}, {"id": 1})
    if not post:
        return JSONResponse({"ok": False}, status_code=404)
    if not _share_index_ready:
        try:
            await db.kms_share_events.create_index(
                [("member_id", 1), ("post_id", 1), ("network", 1)], unique=True)
            _share_index_ready = True
        except Exception:
            logger.warning("share index creation failed", exc_info=True)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    res = await db.kms_share_events.update_one(
        {"member_id": user["mid"], "post_id": post_id, "network": network},
        {"$setOnInsert": {"id": uuid.uuid4().hex,
                          "membership_number": user.get("m") or 0,
                          "first_shared_at": now, "counted": True},
         "$set": {"last_shared_at": now},
         "$inc": {"share_count": 1}},
        upsert=True)
    if res.upserted_id is not None:
        await member_points.award(
            db, action="share", mid=user["mid"], membership_number=user.get("m"),
            ref={"post_id": post_id, "network": network},
            key=f"share:{user['mid']}:{post_id}:{network}")
    return JSONResponse({"ok": True})


# ── poll vote ────────────────────────────────────────────────────────────────
@interact_router.post("/poll-vote")
async def poll_vote(request: Request, poll_id: int = Form(...), vote: str = Form("")):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    poll = await db.kms_polls.find_one({"id": poll_id, "status": 1})
    if not poll or not re.fullmatch(r"option([1-9]|10)", vote) or not poll.get(vote):
        return _back(request)
    already = await db.kms_poll_votes.find_one(
        {"poll_id": poll_id, "user_id": user.get("mid")})
    if not already:
        await db.kms_poll_votes.insert_one({
            "id": await _next_id(db.kms_poll_votes),
            "poll_id": poll_id, "user_id": user.get("mid"), "vote": vote})
    return _back(request)


# ── quiz submit: server-side grading (Phase 4c-2) ────────────────────────────
@interact_router.post("/quiz-submit")
async def quiz_submit(request: Request):
    if not await kms_enabled():
        return JSONResponse({"ok": False}, status_code=404)
    user = current_user(request)
    if not user:
        return JSONResponse({"ok": False, "error": "login"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False}, status_code=400)
    post = await db.kms_posts.find_one({"id": int(body.get("post_id") or 0)})
    if not post or post.get("post_type") not in ("trivia_quiz", "personality_quiz"):
        return JSONResponse({"ok": False}, status_code=404)
    quiz = (post.get("post_data") or {}).get("quiz") or {}
    questions = quiz.get("questions") or []
    results = quiz.get("results") or []
    answers = body.get("answers") or {}
    if not isinstance(answers, dict):
        return JSONResponse({"ok": False}, status_code=400)

    def picked(qi):
        try:
            return int(answers.get(str(qi), -1))
        except (TypeError, ValueError):
            return -1

    if post["post_type"] == "trivia_quiz":
        per_q, correct_count = [], 0
        for qi, q in enumerate(questions):
            correct_idx = next((ai for ai, a in enumerate(q.get("answers") or [])
                                if a.get("correct") == 1), -1)
            got = picked(qi) == correct_idx
            correct_count += 1 if got else 0
            per_q.append({"correct_index": correct_idx, "was_correct": got})
        outcome = next((rr for rr in results
                        if rr.get("min_correct", 0) <= correct_count <= rr.get("max_correct", 0)),
                       None)
        return JSONResponse({"ok": True, "mode": "trivia",
                             "correct_count": correct_count, "total": len(questions),
                             "per_question": per_q,
                             "result": ({"title": outcome.get("title"),
                                         "description": outcome.get("description")}
                                        if outcome else None)})
    # personality: tally each chosen answer's assigned result index
    tally = {}
    for qi, q in enumerate(questions):
        ans = (q.get("answers") or [])
        pi = picked(qi)
        if 0 <= pi < len(ans) and ans[pi].get("result") is not None:
            tally[ans[pi]["result"]] = tally.get(ans[pi]["result"], 0) + 1
    if not tally or not results:
        return JSONResponse({"ok": True, "mode": "personality", "result": None})
    top = max(sorted(tally), key=lambda k: tally[k])
    outcome = results[top] if 0 <= top < len(results) else None
    return JSONResponse({"ok": True, "mode": "personality",
                         "result": ({"title": outcome.get("title"),
                                     "description": outcome.get("description")}
                                    if outcome else None)})


# ── article reading-comprehension quiz attempt (Stage 2) ─────────────────────
@interact_router.post("/quiz-attempt")
async def quiz_attempt(request: Request):
    """Records a completed article quiz and emits the `quiz` points action.
    Server-grades from the stored answer key (never trusts the client score),
    stores every attempt in kms_quiz_attempts, and awards points ONCE per
    (member, post) via the idempotency key — the MMS earning rules decide the
    amount (see utils/points.award). Member-only."""
    if not await kms_enabled():
        return JSONResponse({"ok": False}, status_code=404)
    user = current_user(request)
    if not user or not user.get("mid"):
        return JSONResponse({"ok": False, "error": "login"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False}, status_code=400)
    try:
        post_id = int(body.get("post_id") or 0)
    except (TypeError, ValueError):
        return JSONResponse({"ok": False}, status_code=400)
    quiz = await db.kms_post_quizzes.find_one({"post_id": post_id, "active": {"$ne": 0}})
    if not quiz or not quiz.get("questions"):
        return JSONResponse({"ok": False}, status_code=404)
    if not await _post_visible_to(request, post_id):
        return JSONResponse({"ok": False}, status_code=404)
    answers = body.get("answers") or {}
    if not isinstance(answers, dict):
        return JSONResponse({"ok": False}, status_code=400)

    questions = quiz["questions"]
    score = 0
    norm_answers = {}   # {str(qi): picked index} — kept for question-level analytics
    for qi, q in enumerate(questions):
        try:
            picked = int(answers.get(str(qi), -1))
        except (TypeError, ValueError):
            picked = -1
        norm_answers[str(qi)] = picked
        if picked == int(q.get("correct", -2)):
            score += 1
    total = len(questions)

    prior = await db.kms_quiz_attempts.find_one(
        {"member_id": user["mid"], "post_id": post_id}, {"_id": 1})
    first_attempt = prior is None
    await db.kms_quiz_attempts.insert_one({
        "id": await _next_id(db.kms_quiz_attempts),
        "member_id": user["mid"], "membership_number": user.get("m") or 0,
        "post_id": post_id, "slug": quiz.get("slug"),
        "score": score, "total": total, "answers": norm_answers,
        "first_attempt": first_attempt, "created_at": core_now()})

    # Points: once per (member, post), and only for a PASSING attempt (s144: a 0/10
    # attempt used to earn the same as 10/10). Same pass mark as the LMS quiz_passed
    # rule; a failed attempt earns nothing and the member can retry — the key is
    # only spent by the first pass. MMS earning rules set the amount.
    passed = total > 0 and score * 100 >= QUIZ_PASS_PCT * total
    if passed:
        await member_points.award(
            db, action="quiz", mid=user["mid"], membership_number=user.get("m"),
            ref={"post_id": post_id, "score": score, "total": total},
            key=f"quiz:{user['mid']}:{post_id}")

    return JSONResponse({"ok": True, "score": score, "total": total,
                         "first_attempt": first_attempt, "passed": passed})


# ── poll post votes (Phase 4c-2) ─────────────────────────────────────────────
async def poll_post_aggregates(post: dict, user_mid) -> dict:
    """Per-question counts + the caller's own votes for a poll post."""
    counts, mine = {}, {}
    async for v in db.kms_post_poll_votes.find({"post_id": post["id"]}):
        key = f'{v.get("question_index")}:{v.get("answer_index")}'
        counts[key] = counts.get(key, 0) + 1
        if user_mid and v.get("user_id") == user_mid:
            mine[str(v.get("question_index"))] = v.get("answer_index")
    return {"counts": counts, "mine": mine}


@interact_router.post("/post-poll-vote")
async def post_poll_vote(request: Request):
    if not await kms_enabled():
        return JSONResponse({"ok": False}, status_code=404)
    user = current_user(request)
    if not user:
        return JSONResponse({"ok": False, "error": "login"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False}, status_code=400)
    post = await db.kms_posts.find_one({"id": int(body.get("post_id") or 0)})
    if not post or post.get("post_type") != "poll":
        return JSONResponse({"ok": False}, status_code=404)
    questions = ((post.get("post_data") or {}).get("quiz") or {}).get("questions") or []
    try:
        qi, ai = int(body.get("question")), int(body.get("answer"))
    except (TypeError, ValueError):
        return JSONResponse({"ok": False}, status_code=400)
    if not (0 <= qi < len(questions)) or \
            not (0 <= ai < len(questions[qi].get("answers") or [])):
        return JSONResponse({"ok": False}, status_code=400)
    q = {"post_id": post["id"], "question_index": qi, "user_id": user.get("mid")}
    if not await db.kms_post_poll_votes.find_one(q):  # one vote per question
        await db.kms_post_poll_votes.insert_one(
            {"id": await _next_id(db.kms_post_poll_votes), **q, "answer_index": ai})
    agg = await poll_post_aggregates(post, user.get("mid"))
    return JSONResponse({"ok": True, **agg})


# ── KMS-native replication receiver (Phase 5) ────────────────────────────────
@interact_router.post("/internal/kms-native-replicate")
async def kms_native_replicate(request: Request):
    """Hub→target post replication, Mongo→Mongo. Guarded by the sync key in
    kms_config {key:"replication"}.sync_key (NOT settings — leak-proof by
    construction, D-2026-48). Idempotent by slug; bundled image files are
    written to the same relative paths so post HTML renders 1:1."""
    if not await kms_enabled():
        return JSONResponse({"status": "disabled"}, status_code=404)
    cfg = await db.kms_config.find_one({"key": "replication"}) or {}
    want = (cfg.get("sync_key") or "").strip()
    got = (request.headers.get("x-sync-key") or "").strip()
    if not want or got != want:
        return JSONResponse({"status": "forbidden"}, status_code=403)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"status": "bad_request"}, status_code=400)
    post = body.get("post") or {}
    slug = (post.get("slug") or "").strip()
    if not slug or not post.get("title"):
        return JSONResponse({"status": "bad_request"}, status_code=400)
    # write bundled image files (path-traversal-guarded)
    import base64
    from pathlib import Path as _P
    from kms.core import UPLOADS_DIR
    for rel, b64 in (body.get("files") or {}).items():
        try:
            target = (UPLOADS_DIR / _P(rel).relative_to("uploads")).resolve()
            if not str(target).startswith(str(UPLOADS_DIR.resolve())):
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(base64.b64decode(b64))
        except Exception:
            logger.warning("kms replicate: file write failed for %s", rel, exc_info=True)
    existing = await db.kms_posts.find_one({"slug": slug})
    post.pop("_id", None)
    post["id"] = existing["id"] if existing else await _next_id(db.kms_posts)
    post["updated_at"] = core_now()
    await db.kms_posts.replace_one({"slug": slug}, post, upsert=True)
    from kms import news_bridge
    await news_bridge.sync_post(post)
    return JSONResponse({"status": "ok", "id": post["id"]})


# ── reading list (Phase 4b) ──────────────────────────────────────────────────
@interact_router.post("/reading-list-toggle")
async def reading_list_toggle(request: Request, post_id: int = Form(...)):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    q = {"post_id": post_id, "user_id": user.get("mid")}
    if await db.kms_reading_lists.find_one(q):
        await db.kms_reading_lists.delete_many(q)
    elif await _post_visible_to(request, post_id):
        await db.kms_reading_lists.insert_one(
            {"id": await _next_id(db.kms_reading_lists), **q, "created_at": core_now()})
    return _back(request)


@interact_router.get("/reading-list")
async def reading_list(request: Request):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    from kms.public import _listing, _paginate  # no cycle: public doesn't import interact
    viewer = await core.resolve_viewer(request)
    core.set_viewer_tier((viewer or {}).get("tier") or "public")
    ids = [rl["post_id"] async for rl in
           db.kms_reading_lists.find({"user_id": user.get("mid")}).sort("id", -1)]
    posts_by_id = {p["id"]: p async for p in db.kms_posts.find(
        {**core.public_post_filter(), "id": {"$in": ids}})}
    posts = [posts_by_id[i] for i in ids if i in posts_by_id]
    pager = await _paginate(request, len(posts), 10)
    return await _listing(request, title="Reading List",
                          posts=posts[pager["offset"]:pager["offset"] + 10], pager=pager)


# ── My points (s144) ─────────────────────────────────────────────────────────
def _points_limits(a: dict) -> str:
    """Plain-language limits of one MMS action, same wording as the LMS page."""
    out = []
    if a.get("points_per"):
        out.append("per purchase")
    elif a.get("once_per_subject"):
        out.append("once per post")
    caps = a.get("caps") or {}
    if caps.get("per_day"):
        out.append(f"up to {caps['per_day']} a day")
    if caps.get("total"):
        out.append(f"up to {caps['total']} in total")
    return " · ".join(out)


def _points_date(iso: str) -> str:
    from datetime import datetime
    try:
        d = datetime.fromisoformat(iso)
        return f"{d.day} {d:%b %Y}"
    except (TypeError, ValueError):
        return ""


@interact_router.get("/my-points")
async def my_points(request: Request):
    """The member's KMS slice of the points program (MMS_POINTS_HUB_PLAN, s144):
    what each KMS action is worth, how often they did it, their latest KMS points.
    The whole picture across products lives in My Account → Points & Rewards
    (D-2026-144) — this page links there. Read-only; the MMS owns rules + ledger."""
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    from utils.mms_events import product_points
    data, failed = {}, False
    try:
        data = await product_points(db, "kms", user.get("mid") or None)
    except Exception:
        logger.warning("kms my-points: MMS read failed", exc_info=True)
        failed = True
    me = data.get("me") or {}
    actions = [{**a, "limits": _points_limits(a), "times": (me.get("counts") or {}).get(a.get("trigger"), 0)}
               for a in data.get("actions") or []]
    names = {a.get("trigger"): a.get("name") for a in actions}
    recent = [{"name": r.get("rule_name") or names.get(r.get("event_type")) or r.get("event_type"),
               "date": _points_date(r.get("created_at")),
               "amount": round(float(r.get("amount") or 0))}
              for r in me.get("recent") or []]
    site = ((await db.settings.find_one({}, {"_id": 0, "site_url": 1})) or {}).get("site_url") or ""
    html = await core.render(
        request, "my_points.html", title="My points",
        failed=failed or bool(data.get("unavailable")), has_member=bool(user.get("mid")),
        me={"points": me.get("points", 0), "xp": me.get("xp", 0), "balance": me.get("balance", 0),
            "reads": (me.get("counts") or {}).get("kms_view", 0)},
        actions=actions, recent=recent,
        hub_url=f"{site.rstrip('/')}/my-account/points" if site else "")
    return HTMLResponse(html)


# ── comment likes (Phase 4b) ─────────────────────────────────────────────────
@interact_router.post("/comment-like")
async def comment_like(request: Request, comment_id: int = Form(...)):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    q = {"comment_id": comment_id, "user_id": user.get("mid")}
    if not await db.kms_comment_likes.find_one(q):
        if await db.kms_comments.find_one({"id": comment_id}, {"_id": 1}):
            await db.kms_comment_likes.insert_one(q)
            await db.kms_comments.update_one({"id": comment_id},
                                             {"$inc": {"like_count": 1}})
    return _back(request)


# ── follow author (Phase 4b) ─────────────────────────────────────────────────
@interact_router.post("/follow-user-post")
async def follow_user(request: Request, slug: str = Form(...)):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    user = current_user(request)
    if not user:
        return core.login_redirect()
    # clean-room note: keyed by author slug + member id (no KMS user ids anymore)
    q = {"following_slug": slug, "follower_id": user.get("mid")}
    if await db.kms_followers.find_one(q):
        await db.kms_followers.delete_many(q)
    else:
        await db.kms_followers.insert_one({"id": await _next_id(db.kms_followers), **q})
    return _back(request, f"/profile/{slug}")


# ── newsletter ───────────────────────────────────────────────────────────────
@interact_router.post("/add-newsletter-post")
async def add_newsletter(request: Request, email: str = Form("")):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    email = email.strip().lower()
    if EMAIL_RX.fullmatch(email) and not await db.kms_subscribers.find_one({"email": email}):
        await db.kms_subscribers.insert_one({
            "id": await _next_id(db.kms_subscribers), "email": email,
            "token": uuid.uuid4().hex, "created_at": core_now()})
    return _back(request)


@interact_router.get("/unsubscribe")
async def unsubscribe(request: Request, token: str = ""):
    if not await kms_enabled():
        return HTMLResponse("Not found", status_code=404)
    ok = False
    if token:
        res = await db.kms_subscribers.delete_one({"token": token})
        ok = res.deleted_count > 0
    html = await core.render(
        request, "page.html", title="Unsubscribe",
        page={"title": "Unsubscribe", "title_active": 1, "breadcrumb_active": 0,
              "page_content": ("<p>You have been unsubscribed from the newsletter.</p>"
                               if ok else "<p>Invalid or already-used unsubscribe link.</p>")})
    return HTMLResponse(html)
