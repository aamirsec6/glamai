"""Review engine facade."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.review import GbpReview, ReviewRequest
from src.services.reviews.engine import ReviewEngine


class ReviewsFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.engine = ReviewEngine(session)

    async def close(self) -> None:
        await self.engine.close()

    async def list_reviews(self, org_id: str) -> list[dict[str, Any]]:
        stmt = (
            select(GbpReview)
            .where(GbpReview.org_id == org_id)
            .order_by(GbpReview.review_created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [r.to_dict() for r in result.scalars().all()]

    async def sync(self, org_id: str) -> dict[str, Any]:
        return await self.engine.sync_reviews(org_id)

    async def auto_reply(self, org_id: str) -> dict[str, Any]:
        return await self.engine.auto_reply_pending(org_id)

    async def request_review(self, org_id: str, lead_id: str) -> dict[str, Any]:
        return await self.engine.send_review_request(org_id, lead_id)

    async def list_review_requests(self, org_id: str) -> list[dict[str, Any]]:
        stmt = (
            select(ReviewRequest)
            .where(ReviewRequest.org_id == org_id)
            .order_by(ReviewRequest.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [r.to_dict() for r in result.scalars().all()]
