"""WhatsApp webhook handler for inbound messages.

Processes incoming WhatsApp messages from leads and routes them
through the AI qualification flow.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.lead import (
    Lead,
    LeadSource,
    LeadStatus,
    MessageDirection,
    MessageSender,
    WhatsappConversation,
)
from src.models.org import OnboardingStatus, Org
from src.services.ai.lead_qualifier import LeadQualifier
from src.services.whatsapp.templates import get_lead_notification_message

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["WhatsApp Webhook"])


class WhatsappWebhookHandler:
    """Handles inbound WhatsApp webhook events.

    Flow:
    1. Webhook receives message from 360dialog
    2. Validate webhook signature (HMAC-SHA256)
    3. Extract message details
    4. Find the org by WhatsApp number
    5. Find or create a lead by phone number
    6. Process through AI qualification flow
    7. Send AI response back to lead
    8. Notify designer of new/updated lead
    """

    def __init__(
        self,
        webhook_secret: str,
        whatsapp_client,  # WhatsappClient
        ai_qualifier: LeadQualifier,
    ):
        self.webhook_secret = webhook_secret
        self.client = whatsapp_client
        self.ai = ai_qualifier

    def validate_signature(
        self,
        body: bytes,
        signature: str | None,
    ) -> bool:
        """Validate webhook signature using HMAC-SHA256."""
        if not signature:
            logger.warning("webhook_missing_signature")
            return False

        expected = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(f"sha256={expected}", signature)

    async def process_webhook(
        self,
        payload: dict[str, Any],
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Process an inbound WhatsApp webhook event.

        This is the main entry point for all WhatsApp webhooks.
        """
        # 360dialog webhook format
        entries = payload.get("entry", [])
        if not entries:
            logger.warning("webhook_no_entries")
            return {"status": "no_entries"}

        results = []

        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                messages = value.get("messages", [])
                statuses = value.get("statuses", [])

                # Process inbound messages
                for message in messages:
                    result = await self._process_inbound_message(message, value, db)
                    results.append(result)

                # Process message statuses (delivered, read)
                for status in statuses:
                    await self._process_message_status(status, db)

        return {"status": "processed", "results": results}

    async def _process_inbound_message(
        self,
        message: dict[str, Any],
        value: dict[str, Any],
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Process a single inbound WhatsApp message."""
        message_id = message.get("id", "")
        from_phone = message.get("from", "")
        message_type = message.get("type", "text")
        timestamp = message.get("timestamp", "")

        # Only process text messages for now
        if message_type != "text":
            logger.info("webhook_skip_non_text", message_type=message_type)
            return {"status": "skipped", "reason": "non_text"}

        message_text = message.get("text", {}).get("body", "")

        # Find the org by the recipient WhatsApp number
        # In 360dialog, the 'to' number is in the metadata
        metadata = value.get("metadata", {})
        to_phone = metadata.get("display_phone_number", "")

        org = await self._find_org_by_whatsapp(to_phone, db)
        if not org:
            logger.warning("webhook_org_not_found", to_phone=to_phone)
            return {"status": "org_not_found"}

        if org.onboarding_status not in (
            OnboardingStatus.ACTIVE,
            OnboardingStatus.ONBOARDING_COMPLETE,
        ):
            logger.warning("webhook_org_not_active", org_id=org.id)
            return {"status": "org_not_active"}

        # Find or create lead
        lead = await self._find_or_create_lead(
            org_id=org.id,
            phone=from_phone,
            db=db,
        )

        # Save the inbound message
        conversation = WhatsappConversation(
            org_id=org.id,
            lead_id=lead.id,
            wa_message_id=message_id,
            direction=MessageDirection.INBOUND,
            sender=MessageSender.LEAD,
            message_text=message_text,
            message_type=message_type,
            sent_at=datetime.utcnow(),
        )
        db.add(conversation)

        # Process through AI qualification flow
        ai_response = await self.ai.process_message(
            message_text=message_text,
            lead=lead,
            org=org,
            db=db,
        )

        # Send AI response back to lead
        if ai_response and ai_response.get("reply"):
            send_result = await self.client.send_text_message(
                to_phone=from_phone,
                message=ai_response["reply"],
            )

            if send_result:
                # Save outbound message
                outbound = WhatsappConversation(
                    org_id=org.id,
                    lead_id=lead.id,
                    wa_message_id=send_result.get("messages", [{}])[0].get("id", ""),
                    direction=MessageDirection.OUTBOUND,
                    sender=MessageSender.AI,
                    message_text=ai_response["reply"],
                    message_type="text",
                    delivered=True,
                    sent_at=datetime.utcnow(),
                )
                db.add(outbound)

        # Notify designer if this is a new lead or significant update
        if ai_response.get("notify_designer"):
            await self._notify_designer(org, lead, ai_response, db)

        await db.commit()

        return {
            "status": "processed",
            "lead_id": lead.id,
            "org_id": org.id,
            "ai_intent": ai_response.get("intent"),
        }

    async def _process_message_status(
        self,
        status: dict[str, Any],
        db: AsyncSession,
    ) -> None:
        """Update message delivery status."""
        message_id = status.get("id", "")
        status_value = status.get("status", "")

        if not message_id:
            return

        from sqlmodel import select

        stmt = select(WhatsappConversation).where(
            WhatsappConversation.wa_message_id == message_id
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()

        if conversation:
            if status_value == "delivered":
                conversation.delivered = True
                conversation.delivered_at = datetime.utcnow()
            elif status_value == "read":
                conversation.read = True
                conversation.read_at = datetime.utcnow()

            db.add(conversation)
            await db.flush()

    async def _find_org_by_whatsapp(
        self,
        whatsapp_number: str,
        db: AsyncSession,
    ) -> Org | None:
        """Find an org by its WhatsApp business number."""
        from sqlmodel import select

        stmt = select(Org).where(
            Org.whatsapp_number == whatsapp_number,
            Org.is_active == True,  # noqa: E712
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def _find_or_create_lead(
        self,
        org_id: str,
        phone: str,
        db: AsyncSession,
    ) -> Lead:
        """Find existing lead or create a new one."""
        from sqlmodel import select

        # Normalize phone
        phone = phone.strip().lstrip("+")

        stmt = select(Lead).where(
            Lead.org_id == org_id,
            Lead.contact_phone == phone,
        ).order_by(Lead.created_at.desc())
        result = await db.execute(stmt)
        lead = result.scalar_one_or_none()

        if lead and lead.status not in (LeadStatus.WON, LeadStatus.LOST, LeadStatus.DROPPED):
            # Existing active lead
            lead.last_contact_at = datetime.utcnow()
            db.add(lead)
            return lead

        # Create new lead
        new_lead = Lead(
            org_id=org_id,
            source=LeadSource.WHATSAPP,
            contact_name=f"Lead {phone[-4:]}",  # Temporary name
            contact_phone=phone,
            status=LeadStatus.NEW,
        )
        db.add(new_lead)
        await db.flush()
        return new_lead

    async def _notify_designer(
        self,
        org: Org,
        lead: Lead,
        ai_response: dict[str, Any],
        db: AsyncSession,
    ) -> None:
        """Send notification to the designer about a new/updated lead."""
        if not lead.ai_summary:
            return

        message = get_lead_notification_message(
            lead_name=lead.contact_name,
            lead_phone=lead.contact_phone,
            summary=lead.ai_summary,
            budget=lead.budget_range.value if lead.budget_range else "unknown",
            location=lead.location_area or "unknown",
        )

        # Send to designer's phone (org's registered phone)
        if org.phone:
            await self.client.send_text_message(
                to_phone=org.phone,
                message=message,
            )


# ── FastAPI Routes ───────────────────────────────────────────

@router.get("/")
async def verify_webhook(request: Request):
    """Webhook verification endpoint.

    WhatsApp/360dialog sends a GET request to verify the webhook.
    We must return the challenge value.
    """
    params = dict(request.query_params)
    challenge = params.get("hub.challenge", "")
    verify_token = params.get("hub.verify_token", "")

    # In production, verify the token against stored value
    settings_verify_token = "glamai-webhook-verify"  # Should come from settings

    if verify_token == settings_verify_token:
        return {"hub.challenge": challenge}

    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_hub_signature_256: str | None = Header(None),
):
    """Receive inbound WhatsApp messages via webhook."""
    body = await request.body()

    # In production: validate signature
    # handler = WhatsappWebhookHandler(...)
    # if not handler.validate_signature(body, x_hub_signature_256):
    #     raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()

    logger.info("webhook_received", payload_keys=list(payload.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).keys()) if payload.get("entry") else "empty")

    return {"status": "received"}
