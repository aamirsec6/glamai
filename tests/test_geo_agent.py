"""Tests for geo / local agent."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.agents.geo_orchestrator import GeoLocalAgentOrchestrator
from src.services.geo.local_agent import GeoBrief, GeoLocalService


@pytest.mark.asyncio
async def test_geo_orchestrator_org_not_found():
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)

    orchestrator = GeoLocalAgentOrchestrator(session)
    result = await orchestrator.run("missing")

    assert result.errors == ["org_not_found"]


@pytest.mark.asyncio
async def test_geo_service_assigns_keywords_from_vertical():
    org = MagicMock()
    org.id = "org-1"
    org.city = "Bangalore"
    org.category.value = "bakery"
    org.latitude = None
    org.longitude = None
    org.address = "123 Main St"

    session = AsyncMock()
    session.get = AsyncMock(return_value=org)
    session.execute = AsyncMock(
        return_value=MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
            scalar_one_or_none=MagicMock(return_value=None),
        )
    )
    session.add = MagicMock()
    session.flush = AsyncMock()

    service = GeoLocalService(session)

    with (
        patch.object(service, "_ensure_coordinates", new=AsyncMock()),
        patch.object(service, "_sync_competitors", new=AsyncMock()),
        patch.object(service, "_ensure_territory", new=AsyncMock(return_value=None)),
        patch.object(service, "_load_opportunities", new=AsyncMock()),
    ):
        brief = GeoBrief("org-1", "Bangalore", "bakery")
        await service._assign_keyword_niches(org, brief)

    assert len(brief.keywords_assigned) >= 4
    assert any("cake" in kw.lower() or "bakery" in kw.lower() for kw in brief.keywords_assigned)
