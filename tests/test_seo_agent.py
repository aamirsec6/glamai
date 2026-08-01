"""Tests for SEO agent orchestrator and scorecard."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.agents.seo_orchestrator import SeoAgentOrchestrator
from src.services.seo.path_to_top3 import PathToTop3Scorecard


@pytest.mark.asyncio
async def test_seo_orchestrator_org_not_found():
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)

    orchestrator = SeoAgentOrchestrator(session)
    result = await orchestrator.run("missing-org")

    assert result.errors == ["org_not_found"]


@pytest.mark.asyncio
async def test_seo_orchestrator_builds_scorecard():
    org = MagicMock()
    org.id = "org-1"
    org.name = "Test Bakery"
    org.city = "Bangalore"
    org.latitude = 12.97
    org.longitude = 77.59
    org.category.value = "bakery"

    session = AsyncMock()
    session.get = AsyncMock(return_value=org)
    session.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    )
    session.add = MagicMock()
    session.flush = AsyncMock()

    rankings = [
        {"keyword": "bakery near me", "position": 5, "in_top3": False},
        {"keyword": "birthday cake Bangalore", "position": 2, "in_top3": True},
    ]
    actions = [{"type": "targeted_post", "keyword": "bakery near me", "reason": "gap"}]

    orchestrator = SeoAgentOrchestrator(session)
    orchestrator.keyword_planner = MagicMock()
    orchestrator.keyword_planner.get_tracked_keywords = AsyncMock(return_value=["bakery near me"])
    orchestrator.keyword_planner.get_priority_keywords = AsyncMock(return_value=["bakery near me"])
    orchestrator.rank_tracker = MagicMock()
    orchestrator.rank_tracker.track_org = AsyncMock(return_value={"status": "ok", "rankings": rankings})
    orchestrator.seo_health = MagicMock()
    orchestrator.seo_health.analyze = AsyncMock(return_value=MagicMock(to_dict=MagicMock(return_value={})))
    orchestrator.competitive = MagicMock()
    orchestrator.competitive.analyze = AsyncMock(return_value=MagicMock(to_dict=MagicMock(return_value={})))
    orchestrator.action_planner = MagicMock()
    orchestrator.action_planner.plan = MagicMock(return_value=actions)
    orchestrator.scorecard_builder = MagicMock()
    orchestrator.scorecard_builder.build = AsyncMock(return_value={"summary": {"in_top3": 1}})

    result = await orchestrator.run("org-1", execute_actions=False)

    assert result.scorecard["summary"]["in_top3"] == 1
    assert len(result.actions_planned) == 1


@pytest.mark.asyncio
async def test_path_to_top3_scorecard():
    org = MagicMock()
    org.name = "Bakery Co"

    session = AsyncMock()
    session.get = AsyncMock(return_value=org)
    session.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    )

    builder = PathToTop3Scorecard(session)
    scorecard = await builder.build(
        "org-1",
        [{"keyword": "bakery near me", "position": 4}],
        [{"type": "targeted_post", "keyword": "bakery near me"}],
        tracking_status="ok",
    )

    assert scorecard["summary"]["keywords_tracked"] == 1
    assert scorecard["path_to_top3"]["effort_guarantee"] is True
    assert scorecard["path_to_top3"]["rank_guarantee"] is False
