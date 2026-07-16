"""Lightweight in-memory sliding-window rate limiter.

Single-process container → no Redis needed.  If we ever scale horizontally
this should move to Redis or a Mongo TTL collection, but for now an
asyncio-protected dict is plenty.
"""
from collections import defaultdict, deque
from time import monotonic
from asyncio import Lock
from fastapi import HTTPException, Request

_buckets: dict[str, deque] = defaultdict(deque)
_lock = Lock()


def _client_ip(request: Request) -> str:
    # Honour X-Forwarded-For when behind ingress; fall back to the socket peer.
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(request: Request, *, key: str, max_requests: int, window_seconds: int):
    """Raise 429 if the caller has exceeded `max_requests` within `window_seconds`.

    The bucket key is `"{key}:{ip}"` so different endpoints don't share counters.
    """
    bucket_key = f"{key}:{_client_ip(request)}"
    now = monotonic()
    cutoff = now - window_seconds
    async with _lock:
        bucket = _buckets[bucket_key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_requests:
            retry_in = max(1, int(bucket[0] + window_seconds - now))
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Try again in {retry_in} seconds.",
                headers={"Retry-After": str(retry_in)},
            )
        bucket.append(now)


async def public_form_guard(request: Request, body: dict, *, key: str, max_requests: int = 5, window_seconds: int = 60, with_captcha: bool = True):
    """One-stop hardening helper for anonymous public forms.

    Runs the IP rate limiter (default: 5 req/min) AND the CMS-managed
    captcha verifier (no-op when captcha is disabled in Settings).  Each
    public POST handler should call this once at the very top, before
    doing any DB work or sending any email.  `key` namespaces the rate-
    limit bucket so endpoints don't share counters."""
    await enforce_rate_limit(request, key=key, max_requests=max_requests, window_seconds=window_seconds)
    if with_captcha:
        # Imported here to avoid a circular import at module load time.
        from utils.captcha import require_captcha
        await require_captcha(request, body or {})
