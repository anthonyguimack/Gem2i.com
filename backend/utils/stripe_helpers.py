"""stripe_helpers.py — Native Stripe SDK wrapper.

Drop-in replacement for `emergentintegrations.payments.stripe.checkout`.
Uses the official `stripe` library (already in requirements.txt) via
asyncio.to_thread so it works inside FastAPI async handlers.

Public interface mirrors the old StripeCheckout / CheckoutSessionRequest:

    from utils.stripe_helpers import StripeHelper

    helper = StripeHelper(api_key)
    session = await helper.create_checkout_session(
        amount, currency, product_name, success_url, cancel_url, metadata
    )
    # session.session_id  — Stripe session ID
    # session.url         — redirect URL for the browser

    status = await helper.get_checkout_status(session_id)
    # status.status           — "complete" | "open" | "expired"
    # status.payment_status   — "paid" | "unpaid" | "no_payment_required"
    # status.amount_total     — int, amount in cents (or None)
    # status.currency         — "usd" etc.

    event = await helper.handle_webhook(body_bytes, signature_header)
    # event.session_id      — Stripe session ID from the event
    # event.payment_status  — "paid" | "unpaid" | ...
"""

import asyncio
import json
import stripe
from dataclasses import dataclass
from typing import Optional


@dataclass
class CheckoutSessionResult:
    session_id: str
    url: str


@dataclass
class CheckoutStatusResult:
    status: str
    payment_status: str
    amount_total: Optional[int]
    currency: Optional[str]


@dataclass
class WebhookEventResult:
    session_id: str
    payment_status: str


class StripeHelper:
    """Thin async wrapper around the native stripe SDK."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def create_checkout_session(
        self,
        amount: float,           # in dollars (e.g. 49.99)
        currency: str,           # e.g. "usd"
        product_name: str,       # displayed on the Stripe checkout page
        success_url: str,
        cancel_url: str,
        metadata: dict = None,
    ) -> CheckoutSessionResult:
        """Create a Stripe Checkout Session. Returns session_id and redirect URL."""
        unit_amount = max(1, round(amount * 100))  # cents, minimum 1

        def _create():
            return stripe.checkout.Session.create(
                api_key=self.api_key,
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {"name": product_name or "Payment"},
                        "unit_amount": unit_amount,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata or {},
            )

        session = await asyncio.to_thread(_create)
        return CheckoutSessionResult(session_id=session.id, url=session.url)

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResult:
        """Retrieve the current status of a Checkout Session."""
        def _retrieve():
            return stripe.checkout.Session.retrieve(
                session_id,
                api_key=self.api_key,
            )

        session = await asyncio.to_thread(_retrieve)
        return CheckoutStatusResult(
            status=session.status or "unknown",
            payment_status=session.payment_status or "unpaid",
            amount_total=session.amount_total,
            currency=session.currency,
        )

    async def handle_webhook(self, body: bytes, signature: str = None) -> WebhookEventResult:
        """Parse a Stripe webhook event body and return session info.

        Signature verification is skipped here because no webhook secret is
        stored in the environment. For production hardening, set
        STRIPE_WEBHOOK_SECRET in backend/.env and add verification:
            stripe.Webhook.construct_event(body, signature, secret)
        """
        try:
            event_data = json.loads(body)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(f"Invalid webhook body: {exc}") from exc

        obj = event_data.get("data", {}).get("object", {})
        session_id = obj.get("id", "")
        payment_status = obj.get("payment_status", "unpaid")
        return WebhookEventResult(session_id=session_id, payment_status=payment_status)
