"""Tests for campaign engine — audience building and campaign lifecycle."""

from __future__ import annotations

import pytest
from datetime import datetime, timedelta

from src.models.campaign import CampaignType, CampaignStatus, MarketingCampaign
from src.models.lead import Lead, LeadSource, LeadStatus


def test_campaign_type_values():
    """All campaign types should have correct string values."""
    assert CampaignType.REPEAT_SALE.value == "repeat_sale"
    assert CampaignType.OFFER.value == "offer"
    assert CampaignType.REMINDER.value == "reminder"
    assert CampaignType.REVIEW_REQUEST.value == "review_request"
    assert CampaignType.STALE_LEAD.value == "stale_lead"


def test_campaign_status_values():
    """All campaign statuses should have correct string values."""
    assert CampaignStatus.DRAFT.value == "draft"
    assert CampaignStatus.SCHEDULED.value == "scheduled"
    assert CampaignStatus.RUNNING.value == "running"
    assert CampaignStatus.COMPLETED.value == "completed"
    assert CampaignStatus.CANCELLED.value == "cancelled"


@pytest.mark.asyncio
async def test_create_campaign(db: AsyncSession):
    """CampaignEngine should create a campaign in DRAFT status."""
    from src.services.marketing.campaign_engine import CampaignEngine

    engine = CampaignEngine(db)
    try:
        campaign = await engine.create_campaign(
            org_id="test-org-1",
            name="Test Campaign",
            campaign_type=CampaignType.REPEAT_SALE,
        )
        assert campaign.org_id == "test-org-1"
        assert campaign.name == "Test Campaign"
        assert campaign.campaign_type == CampaignType.REPEAT_SALE
        assert campaign.status == CampaignStatus.DRAFT
        assert campaign.total_recipients == 0
    finally:
        await engine.close()


@pytest.mark.asyncio
async def test_create_campaign_with_offer(db: AsyncSession):
    """CampaignEngine should create an offer campaign with offer text."""
    from src.services.marketing.campaign_engine import CampaignEngine

    engine = CampaignEngine(db)
    try:
        campaign = await engine.create_campaign(
            org_id="test-org-1",
            name="Festive Offer",
            campaign_type=CampaignType.OFFER,
            offer_text="20% off on all services",
        )
        assert campaign.offer_text == "20% off on all services"
        assert campaign.campaign_type == CampaignType.OFFER
    finally:
        await engine.close()


@pytest.mark.asyncio
async def test_build_audience_repeat_sale(db: AsyncSession):
    """Audience builder should find won leads past the repeat-sale threshold."""
    from src.services.marketing.campaign_engine import CampaignEngine
    from src.config import get_settings

    engine = CampaignEngine(db)
    settings = get_settings()

    try:
        # Create a won lead that's old enough for repeat-sale
        old_lead = Lead(
            org_id="test-org-1",
            source=LeadSource.WHATSAPP,
            contact_name="Old Patient",
            contact_phone="9999999999",
            status=LeadStatus.WON,
            updated_at=datetime.utcnow() - timedelta(days=settings.campaign_repeat_sale_days + 1),
        )
        db.add(old_lead)
        await db.flush()

        campaign = await engine.create_campaign(
            org_id="test-org-1",
            name="Repeat Sale Test",
            campaign_type=CampaignType.REPEAT_SALE,
        )
        await db.flush()

        leads = await engine.build_audience(campaign)
        assert len(leads) >= 1
        assert any(l.contact_phone == "9999999999" for l in leads)
    finally:
        await engine.close()


@pytest.mark.asyncio
async def test_build_audience_stale_lead(db: AsyncSession):
    """Audience builder should find leads that haven't been contacted recently."""
    from src.services.marketing.campaign_engine import CampaignEngine
    from src.config import get_settings

    engine = CampaignEngine(db)
    settings = get_settings()

    try:
        stale_lead = Lead(
            org_id="test-org-1",
            source=LeadSource.WHATSAPP,
            contact_name="Stale Lead",
            contact_phone="8888888888",
            status=LeadStatus.CONTACTED,
            last_contact_at=datetime.utcnow() - timedelta(days=settings.campaign_stale_lead_days + 1),
        )
        db.add(stale_lead)
        await db.flush()

        campaign = await engine.create_campaign(
            org_id="test-org-1",
            name="Stale Lead Test",
            campaign_type=CampaignType.STALE_LEAD,
        )
        await db.flush()

        leads = await engine.build_audience(campaign)
        assert len(leads) >= 1
        assert any(l.contact_phone == "8888888888" for l in leads)
    finally:
        await engine.close()


@pytest.mark.asyncio
async def test_build_audience_excludes_won_for_stale(db: AsyncSession):
    """Stale lead audience should NOT include already-won leads."""
    from src.services.marketing.campaign_engine import CampaignEngine

    engine = CampaignEngine(db)

    try:
        won_lead = Lead(
            org_id="test-org-1",
            source=LeadSource.WHATSAPP,
            contact_name="Won Lead",
            contact_phone="7777777777",
            status=LeadStatus.WON,
            last_contact_at=datetime.utcnow() - timedelta(days=30),
        )
        db.add(won_lead)
        await db.flush()

        campaign = await engine.create_campaign(
            org_id="test-org-1",
            name="Stale Lead Filter Test",
            campaign_type=CampaignType.STALE_LEAD,
        )
        await db.flush()

        leads = await engine.build_audience(campaign)
        assert not any(l.contact_phone == "7777777777" for l in leads)
    finally:
        await engine.close()
