"""Review engine — sync, AI reply, and WhatsApp review requests."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.connectors.base import ConnectorResource
from src.connectors.registry import ConnectorRegistry
from src.engine.ingest import IngestEngine
from src.models.lead import Lead, LeadStatus
from src.models.notification import NotificationChannel, NotificationLog, NotificationType
from src.models.org import Org
from src.models.review import GbpReview, ReviewReplyStatus, ReviewRequest
from src.services.ai.review_responder import ReviewResponder
from src.services.whatsapp.templates import get_review_request_message

logger = structlog.get_logger(__name__)

RATING_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


class ReviewEngine:
    """Orchestrates GBP review sync, AI replies, and review requests."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)
        self.ingest = IngestEngine(session)
        self.responder = ReviewResponder()
        self.settings = get_settings()

    async def close(self) -> None:
        await self.registry.close()
        await self.responder.close()

    async def sync_reviews(self, org_id: str) -> dict[str, Any]:
        gbp = self.registry.gbp()
        try:
            pull = await gbp.pull(org_id, ConnectorResource.REVIEWS)
            return await self.ingest.ingest_pull(pull)
        finally:
            await gbp.close()

    async def auto_reply_pending(self, org_id: str, limit: int = 10) -> dict[str, Any]:
        if not self.settings.feature_review_engine:
            return {"status": "feature_disabled"}

        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        stmt = (
            select(GbpReview)
            .where(
                GbpReview.org_id == org_id,
                GbpReview.reply_status == ReviewReplyStatus.PENDING,
            )
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        reviews = list(result.scalars().all())

        gbp = self.registry.gbp()
        replied = 0
        try:
            for review in reviews:
                reply_text = await self.responder.generate_reply(
                    org,
                    review.star_rating,
                    review.comment,
                    review.reviewer_name,
                )
                push = await gbp.push(
                    org_id,
                    ConnectorResource.REVIEW_REPLY,
                    {
                        "review_name": review.google_review_id,
                        "reply_text": reply_text,
                    },
                )
                if push.ok:
                    review.reply_text = reply_text
                    review.reply_status = ReviewReplyStatus.REPLIED
                    review.ai_generated = True
                    review.replied_at = datetime.utcnow()
                    review.updated_at = datetime.utcnow()
                    replied += 1
                else:
                    review.reply_status = ReviewReplyStatus.FAILED
                self.session.add(review)
        finally:
            await gbp.close()

        await self.session.flush()
        return {"status": "ok", "replied": replied, "processed": len(reviews)}

    async def send_review_request(self, org_id: str, lead_id: str) -> dict[str, Any]:
        if not self.settings.feature_review_engine:
            return {"status": "feature_disabled"}

        org = await self.session.get(Org, org_id)
        lead = await self.session.get(Lead, lead_id)
        if not org or not lead:
            return {"status": "not_found"}

        if lead.status != LeadStatus.WON:
            return {"status": "lead_not_won"}

        review_link = f"https://search.google.com/local/writereview?placeid={org.gbp_place_id}" if org.gbp_place_id else None
        message = get_review_request_message(org.name, lead.contact_name, review_link)

        wa = self.registry.whatsapp()
        push_ok = False
        push_error: str | None = None
        try:
            push = await wa.push(
                org_id,
                ConnectorResource.MESSAGE,
                {"to_phone": lead.contact_phone, "message": message},
            )
            push_ok = push.ok
            push_error = push.error
        finally:
            await wa.close()

        req = ReviewRequest(
            org_id=org_id,
            lead_id=lead_id,
            phone=lead.contact_phone,
            message_body=message,
            gbp_review_link=review_link,
            sent=push_ok,
            sent_at=datetime.utcnow() if push_ok else None,
        )
        self.session.add(req)
        if push_ok:
            self.session.add(
                NotificationLog(
                    org_id=org_id,
                    lead_id=lead_id,
                    channel=NotificationChannel.WHATSAPP,
                    notification_type=NotificationType.REVIEW_REQUEST,
                    recipient=lead.contact_phone,
                    body=message,
                    sent=True,
                    sent_at=datetime.utcnow(),
                )
            )
        await self.session.flush()
        return {"status": "ok" if push_ok else "error", "error": push_error}
