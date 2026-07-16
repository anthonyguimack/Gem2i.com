from fastapi import APIRouter, HTTPException, Request, Depends
from models.database import db, get_current_user, logger
from utils.runtime_config import get_stripe_api_key, get_webhook_url
from utils.stripe_helpers import StripeHelper
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.post("/checkout")
async def create_checkout(request: Request):
    body = await request.json()
    service_id = body.get("service_id", "")
    origin_url = body.get("origin_url", "")
    if not service_id or not origin_url:
        raise HTTPException(status_code=400, detail="service_id and origin_url required")
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    price = float(service.get("price", 0))
    if price <= 0:
        raise HTTPException(status_code=400, detail="Invalid price")
    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured. Set the API key in CMS → Settings → Stripe.")
    success_url = f"{origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/"
    metadata = {"service_id": service_id, "service_name": service.get("title", "")}
    try:
        user = await get_current_user(request)
        metadata["user_id"] = user.get("user_id", "")
        metadata["user_email"] = user.get("email", "")
    except Exception:
        pass
    helper = StripeHelper(api_key)
    session = await helper.create_checkout_session(
        amount=price,
        currency=service.get("currency", "usd"),
        product_name=service.get("title", "Service"),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    tx = {"id": str(uuid.uuid4()), "session_id": session.session_id, "service_id": service_id,
          "service_name": service.get("title", ""), "amount": price, "currency": service.get("currency", "usd"),
          "status": "initiated", "payment_status": "pending", "metadata": metadata,
          "created_at": datetime.now(timezone.utc).isoformat()}
    await db.payment_transactions.insert_one(tx)
    return {"url": session.url, "session_id": session.session_id}

@router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    api_key = await get_stripe_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    helper = StripeHelper(api_key)
    status = await helper.get_checkout_status(session_id)
    update_data = {"status": status.status, "payment_status": status.payment_status}
    if status.payment_status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_data})
    return {"status": status.status, "payment_status": status.payment_status, "amount_total": status.amount_total, "currency": status.currency}

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    api_key = await get_stripe_api_key()
    if not api_key:
        logger.warning("Stripe webhook received but no API key configured")
        return {"status": "error", "detail": "Stripe not configured"}
    helper = StripeHelper(api_key)
    try:
        event = await helper.handle_webhook(body, request.headers.get("Stripe-Signature"))
        if event.payment_status == "paid":
            await db.payment_transactions.update_one({"session_id": event.session_id},
                {"$set": {"status": "complete", "payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}
