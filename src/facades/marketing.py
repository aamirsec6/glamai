"""Marketing facade."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.campaign import CampaignType
from src.services.marketing.campaign_engine import CampaignEngine


class MarketingFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.engine = CampaignEngine(session)

    async def close(self) -> None:
        await self.engine.close()

    async def list_campaigns(self, org_id: str) -> list[dict[str, Any]]:
        from sqlalchemy import select
        from src.models.campaign import MarketingCampaign

        stmt = (
            select(MarketingCampaign)
            .where(MarketingCampaign.org_id == org_id)
            .order_by(MarketingCampaign.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return [c.to_dict() for c in result.scalars().all()]

    async def create_and_launch(
        self,
        org_id: str,
        name: str,
        campaign_type: str,
        offer_text: str | None = None,
    ) -> dict[str, Any]:
        ctype = CampaignType(campaign_type)
        campaign = await self.engine.create_campaign(org_id, name, ctype, offer_text)
        await self.session.flush()
        return await self.engine.launch_campaign(campaign.id)

    async def run_repeat_sale(self, org_id: str) -> dict[str, Any]:
        return await self.engine.auto_repeat_sale_for_org(org_id)
