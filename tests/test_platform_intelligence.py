"""Tests for platform cohort and churn models."""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.analytics.insights.platform.churn import ChurnPredictionModel
from src.analytics.insights.platform.cohort import PlatformCohortModel
from src.models.org import BusinessCategory, OnboardingStatus, Org, PlanTier


def _org(
    slug: str,
    *,
    active: bool = True,
    status: OnboardingStatus = OnboardingStatus.ACTIVE,
    created_days_ago: int = 30,
) -> Org:
    now = datetime.utcnow()
    return Org(
        id=f"id-{slug}",
        name=slug,
        slug=slug,
        category=BusinessCategory.INTERIOR_DESIGN,
        email=f"{slug}@test.com",
        phone="919999999999",
        address="addr",
        city="Bangalore",
        state="KA",
        pincode="560038",
        plan=PlanTier.GROWTH,
        billing_amount_paise=499900,
        onboarding_status=status,
        is_active=active,
        gbp_place_id="place-1",
        gbp_last_synced_at=now - timedelta(days=1),
        guarantee_leads_generated=5,
        created_at=now - timedelta(days=created_days_ago),
    )


@pytest.mark.asyncio
async def test_cohort_model_groups_orgs_by_month():
    orgs = [
        _org("a", created_days_ago=10),
        _org("b", created_days_ago=12),
        _org("c", created_days_ago=100),
    ]
    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=orgs)))),
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))),
        ]
    )

    result = await PlatformCohortModel(session).analyze(months=6)

    assert len(result["org_cohorts"]) >= 1
    assert result["org_cohorts"][0]["orgs_signed_up"] >= 1


@pytest.mark.asyncio
async def test_churn_flags_stale_gbp():
    org = _org("stale")
    org.gbp_last_synced_at = datetime.utcnow() - timedelta(days=20)

    session = AsyncMock()
    session.execute = AsyncMock(
        side_effect=[
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[org])))),
            MagicMock(scalar=MagicMock(return_value=0)),
            MagicMock(scalar=MagicMock(return_value=0)),
            MagicMock(scalar=MagicMock(return_value=0)),
        ]
    )

    result = await ChurnPredictionModel(session).analyze()

    assert result["summary"]["total_orgs"] == 1
    assert len(result["at_risk_clients"]) == 1
    assert result["at_risk_clients"][0]["churn_risk_score"] >= 45
