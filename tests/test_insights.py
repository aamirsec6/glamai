"""Tests for advanced insight models."""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.analytics.insights.lead_funnel import LeadFunnelModel
from src.analytics.insights.opportunities import OpportunityScoringModel
from src.analytics.insights.types import (
    CompetitiveInsights,
    ForecastInsights,
    GbpPerformanceInsights,
    LeadFunnelInsights,
    SeoHealthInsights,
)
from src.models.lead import BudgetRange, Lead, LeadScope, LeadSource, LeadStatus


def _make_lead(status: LeadStatus, source: LeadSource = LeadSource.WHATSAPP) -> Lead:
    now = datetime.utcnow()
    return Lead(
        id="lead-1",
        org_id="org-1",
        source=source,
        contact_name="Test",
        contact_phone="919999999999",
        status=status,
        scope=LeadScope.FULL_HOME,
        budget_range=BudgetRange.FROM_5L_10L,
        ai_qualification_score=0.8,
        created_at=now - timedelta(days=5),
        status_changed_at=now,
    )


@pytest.mark.asyncio
async def test_lead_funnel_model_computes_win_rate():
    session = AsyncMock()
    leads = [
        _make_lead(LeadStatus.NEW),
        _make_lead(LeadStatus.CONTACTED),
        _make_lead(LeadStatus.WON),
        _make_lead(LeadStatus.LOST),
    ]
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = leads
    session.execute = AsyncMock(return_value=result_mock)

    funnel = await LeadFunnelModel(session).analyze("org-1", 30)

    assert funnel.overall_win_rate_pct == 50.0
    assert funnel.pipeline_value_inr > 0
    assert len(funnel.stages) == 5


def test_opportunity_scoring_prioritizes_high_impact():
    funnel = LeadFunnelInsights(
        drop_off_stage="negotiation",
        overall_win_rate_pct=12,
        qualified_leads=3,
        source_attribution={"whatsapp": {"total": 5, "won": 2, "win_rate_pct": 40}},
    )
    gbp = GbpPerformanceInsights(content_cadence_score=40, engagement_rate_pct=2)
    competitive = CompetitiveInsights(review_gap=-15, competitive_position="behind")
    forecast = ForecastInsights(growth_rate_pct=-20)
    seo = SeoHealthInsights(keyword_gaps=["modular kitchen Bangalore"])

    opps = OpportunityScoringModel().score(
        funnel=funnel,
        gbp=gbp,
        competitive=competitive,
        forecast=forecast,
        seo=seo,
    )

    assert len(opps) >= 3
    assert opps[0].impact_score >= opps[-1].impact_score
    titles = {o.id for o in opps}
    assert "reverse-lead-decline" in titles or "competitive-catch-up" in titles
