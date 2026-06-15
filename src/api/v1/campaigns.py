"""Marketing campaigns API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import assert_tenant_access
from src.config import get_settings
from src.database import get_db
from src.facades.marketing import MarketingFacade

router = APIRouter(prefix="/v1/campaigns", tags=["Marketing Campaigns"])


class CreateCampaignBody(BaseModel):
    org_id: str
    name: str
    campaign_type: str  # repeat_sale | offer | stale_lead | reminder
    offer_text: str | None = None
    launch: bool = True


@router.get("/")
async def list_campaigns(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    assert_tenant_access(org_id, None, None)
    if not get_settings().feature_reengagement:
        raise HTTPException(status_code=403, detail="Marketing agent not enabled")

    facade = MarketingFacade(db)
    try:
        data = await facade.list_campaigns(org_id)
    finally:
        await facade.close()
    return {"data": data}


@router.post("/")
async def create_campaign(
    body: CreateCampaignBody,
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_reengagement:
        raise HTTPException(status_code=403, detail="Marketing agent not enabled")

    facade = MarketingFacade(db)
    try:
        if body.launch:
            result = await facade.create_and_launch(
                body.org_id, body.name, body.campaign_type, body.offer_text
            )
        else:
            from src.models.campaign import CampaignType
            from src.services.marketing.campaign_engine import CampaignEngine

            engine = CampaignEngine(db)
            campaign = await engine.create_campaign(
                body.org_id, body.name, CampaignType(body.campaign_type), body.offer_text
            )
            await db.commit()
            result = {"status": "ok", "campaign": campaign.to_dict()}
    finally:
        await facade.close()

    if body.launch:
        await db.commit()
    return {"data": result}


@router.post("/repeat-sale")
async def trigger_repeat_sale(
    org_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not get_settings().feature_reengagement:
        raise HTTPException(status_code=403, detail="Marketing agent not enabled")

    facade = MarketingFacade(db)
    try:
        result = await facade.run_repeat_sale(org_id)
    finally:
        await facade.close()
    await db.commit()
    return {"data": result}
