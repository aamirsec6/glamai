"""Tests for vertical-aware WhatsApp lead agent (bakery flow)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models.lead import LeadScope, LeadStatus
from src.services.ai.lead_qualifier import LeadQualifier


def _bakery_org():
    org = MagicMock()
    org.name = "Sweet Crust Bakery"
    org.city = "Bangalore"
    org.category.value = "bakery"
    return org


def _new_lead():
    lead = MagicMock()
    lead.id = "lead-1"
    lead.scope = LeadScope.UNKNOWN
    lead.budget_range = MagicMock()
    lead.budget_range.__eq__ = lambda self, other: False
    lead.property_type = None
    lead.property_size_sqft = None
    lead.timeline = None
    lead.location_area = None
    lead.status = LeadStatus.NEW
    lead.ai_summary = None
    lead.ai_qualification_score = None
    lead.ai_extracted_data = None
    return lead


@pytest.mark.asyncio
async def test_bakery_qualification_state_starts_at_occasion():
    qualifier = LeadQualifier(api_key="")
    lead = _new_lead()
    org = _bakery_org()

    state = qualifier._get_qualification_state(lead, org)
    assert state == "occasion"


@pytest.mark.asyncio
async def test_bakery_scripted_reply_without_llm():
    qualifier = LeadQualifier(api_key="")
    lead = _new_lead()
    org = _bakery_org()

    with patch.object(qualifier, "_get_conversation_history", new=AsyncMock(return_value=[])):
        with patch.object(
            qualifier,
            "_analyze_message",
            new=AsyncMock(return_value={"intent": "inquiry", "scope": "unknown"}),
        ):
            result = await qualifier.process_message(
                "Hi, I need a birthday cake",
                lead,
                org,
                AsyncMock(),
            )

    assert result["intent"] == "inquiry"
    assert "Sweet Crust Bakery" in result["reply"]
    assert result["qualification_state"] == "occasion"


@pytest.mark.asyncio
async def test_bakery_llm_reply_when_configured():
    qualifier = LeadQualifier(api_key="test-key")
    lead = _new_lead()
    org = _bakery_org()

    with (
        patch.object(qualifier, "_get_conversation_history", new=AsyncMock(return_value=[])),
        patch.object(
            qualifier,
            "_analyze_message",
            new=AsyncMock(return_value={"intent": "inquiry", "scope": "unknown"}),
        ),
        patch.object(qualifier._llm, "complete", new=AsyncMock(return_value="Sounds great! What date do you need it?")),
    ):
        result = await qualifier.process_message("Need eggless cake", lead, org, AsyncMock())

    assert "date" in result["reply"].lower() or "Sounds great" in result["reply"]
