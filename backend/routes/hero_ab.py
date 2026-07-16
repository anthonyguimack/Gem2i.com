"""Hero CTA A/B testing — impression + click tracking and analytics.

Event model (`hero_cta_events` collection):
  { id, slide_id, button_index (0-based), variant ('A'|'B'),
    event_type ('impression'|'click'), visitor_id, ts }

Analytics endpoint aggregates per slide × button × variant → {impressions,
clicks, conversion_rate} so the admin can compare button-copy variants.
"""
from datetime import datetime, timezone
import os
import uuid
from fastapi import APIRouter, Request, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from routes.membership import require_admin

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


@router.post("/public/hero-cta-event")
async def record_event(body: dict, request: Request):
    """Body: { slide_id, button_index, variant, event_type, visitor_id }."""
    slide_id = body.get("slide_id")
    event_type = body.get("event_type")
    variant = body.get("variant", "A")
    if not slide_id or event_type not in ("impression", "click"):
        raise HTTPException(status_code=400, detail="slide_id + event_type required")
    if variant not in ("A", "B"):
        variant = "A"
    doc = {
        "id": str(uuid.uuid4()),
        "slide_id": slide_id,
        "button_index": int(body.get("button_index") or 0),
        "variant": variant,
        "event_type": event_type,
        "visitor_id": (body.get("visitor_id") or "")[:64],
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await db.hero_cta_events.insert_one(dict(doc))
    doc.pop("_id", None)
    return {"ok": True}


@router.get("/admin/hero-ab/analytics")
async def ab_analytics(user=Depends(require_admin)):
    """Aggregate hero_cta_events by slide × button × variant.

    Returns:
      [{ slide_id, slide_title, button_index, button_label,
         variant_a: { impressions, clicks, rate, text },
         variant_b: { impressions, clicks, rate, text },
         uplift_pct }]
    """
    # Pull all ab-enabled slides to know which (slide, button) pairs to include
    slides = await db.hero_slides.find({"ab_testing_enabled": True}, {"_id": 0}).to_list(200)
    if not slides:
        return {"rows": [], "totals": {"impressions": 0, "clicks": 0}}

    # Aggregate counts
    pipeline = [
        {"$group": {
            "_id": {"slide_id": "$slide_id", "button_index": "$button_index", "variant": "$variant", "event_type": "$event_type"},
            "count": {"$sum": 1},
        }},
    ]
    raw = await db.hero_cta_events.aggregate(pipeline).to_list(5000)
    # Build lookup: counts[(slide_id, btn, variant, event)] = count
    counts: dict = {}
    for r in raw:
        k = (r["_id"]["slide_id"], int(r["_id"].get("button_index") or 0), r["_id"]["variant"], r["_id"]["event_type"])
        counts[k] = r["count"]

    def _strip(html: str | None) -> str:
        if not html:
            return ""
        import re
        return re.sub(r"<[^>]*>", "", html).strip()[:80]

    rows: list = []
    total_imp = 0
    total_clk = 0
    for s in slides:
        sid = s.get("id")
        title = _strip(s.get("title")) or "(untitled slide)"
        for btn_idx in (0, 1, 2):
            suffix = "" if btn_idx == 0 else f"_{btn_idx + 1}"
            text_a = s.get(f"button{suffix}_text")
            text_b = s.get(f"button{suffix}_text_variant_b")
            # Only show buttons that actually define a B variant
            if not text_a or not text_b:
                continue
            imp_a = counts.get((sid, btn_idx, "A", "impression"), 0)
            clk_a = counts.get((sid, btn_idx, "A", "click"), 0)
            imp_b = counts.get((sid, btn_idx, "B", "impression"), 0)
            clk_b = counts.get((sid, btn_idx, "B", "click"), 0)
            rate_a = (clk_a / imp_a * 100) if imp_a else 0
            rate_b = (clk_b / imp_b * 100) if imp_b else 0
            uplift = ((rate_b - rate_a) / rate_a * 100) if rate_a else (100 if rate_b else 0)
            total_imp += imp_a + imp_b
            total_clk += clk_a + clk_b
            rows.append({
                "slide_id": sid,
                "slide_title": title,
                "button_index": btn_idx,
                "button_label": f"Button {btn_idx + 1}",
                "variant_a": {"text": text_a, "impressions": imp_a, "clicks": clk_a, "rate": round(rate_a, 2)},
                "variant_b": {"text": text_b, "impressions": imp_b, "clicks": clk_b, "rate": round(rate_b, 2)},
                "uplift_pct": round(uplift, 1),
            })
    return {
        "rows": rows,
        "totals": {
            "impressions": total_imp,
            "clicks": total_clk,
            "rate": round(total_clk / total_imp * 100, 2) if total_imp else 0,
        },
    }
