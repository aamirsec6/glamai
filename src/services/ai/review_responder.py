"""AI-generated SEO-rich replies to Google reviews."""

from __future__ import annotations

import json
from typing import Any

import structlog

from src.connectors.base import ConnectorResource
from src.connectors.anthropic import AnthropicConnector
from src.models.org import Org

logger = structlog.get_logger(__name__)


class ReviewResponder:
    """Generate on-brand, SEO-optimized GBP review replies."""

    def __init__(self) -> None:
        self.ai = AnthropicConnector()

    async def generate_reply(
        self,
        org: Org,
        star_rating: int,
        comment: str | None,
        reviewer_name: str | None = None,
    ) -> str:
        name = reviewer_name or "there"
        system = (
            f"You write short, warm Google Business Profile review replies for "
            f"{org.name}, a {org.category.value.replace('_', ' ')} business in {org.city}, India. "
            "Replies must be SEO-friendly (mention business type and city naturally), "
            "under 350 characters, professional, and never offer discounts unless asked. "
            "Return JSON only: {\"reply\": \"...\"}"
        )
        user = (
            f"Reviewer: {name}\n"
            f"Rating: {star_rating}/5\n"
            f"Comment: {comment or '(no comment)'}\n\n"
            "Write an appropriate reply."
        )

        try:
            pull = await self.ai.pull(
                org.id,
                ConnectorResource.GENERATE_REVIEW_REPLY,
                system_prompt=system,
                user_message=user,
            )
            if pull.ok:
                reply = pull.data.get("reply") or pull.data.get("raw", "")
                if isinstance(reply, str) and reply.startswith("{"):
                    reply = json.loads(reply).get("reply", reply)
                return str(reply).strip()[:500]
        except Exception as e:
            logger.warning("review_ai_fallback", org_id=org.id, error=str(e))

        if star_rating >= 4:
            return (
                f"Thank you so much, {name}! We're thrilled you chose {org.name}. "
                f"Your feedback means a lot to our team in {org.city}."
            )
        return (
            f"Thank you for your feedback, {name}. We're sorry we didn't meet expectations. "
            f"Please reach out to {org.name} directly — we'd love to make this right."
        )

    async def close(self) -> None:
        await self.ai.close()
