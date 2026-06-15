"""Tests for marketing, review, and profile agents."""

from __future__ import annotations

import pytest

from src.models.campaign import CampaignType, MarketingCampaign
from src.services.ai.review_responder import ReviewResponder
from src.services.whatsapp.templates import (
    get_offer_message,
    get_repeat_sale_message,
    get_review_request_message,
)


def test_marketing_message_templates():
    msg = get_repeat_sale_message("Studio X", "Aamir")
    assert "Studio X" in msg
    assert "Aamir" in msg

    offer = get_offer_message("Studio X", "Aamir", "20% off modular kitchen")
    assert "20% off" in offer

    review = get_review_request_message("Studio X", "Aamir", "https://g.page/review")
    assert "Google review" in review


@pytest.mark.asyncio
async def test_review_responder_fallback():
    from src.models.org import BusinessCategory, Org

    org = Org(
        name="Test Studio",
        email="t@test.com",
        phone="9999999999",
        address="Bangalore",
        city="Bangalore",
        category=BusinessCategory.INTERIOR_DESIGN,
    )
    org.id = "org-test"

    responder = ReviewResponder()
    reply = await responder.generate_reply(org, 5, "Great work!", "Raj")
    assert len(reply) > 10
    assert "Test Studio" in reply or "Thank" in reply
    await responder.close()


def test_campaign_type_values():
    assert CampaignType.REPEAT_SALE.value == "repeat_sale"
    assert CampaignType.STALE_LEAD.value == "stale_lead"


def test_feature_flags_enabled_by_default():
    from src.config import get_settings

    s = get_settings()
    assert s.feature_review_engine is True
    assert s.feature_reengagement is True
    assert s.feature_content_generator is True
