"""Tests for growth pipeline handoffs and orchestrator wiring."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.agents.handoff import GrowthHandoff
from src.services.agents.growth_orchestrator import GrowthOrchestrator


def test_growth_handoff_merges_targeted_post_keywords():
    handoff = GrowthHandoff(
        priority_keywords=["salon bangalore", "hair spa indiranagar"],
        seo_actions=[
            {"type": "targeted_post", "keyword": "hair spa indiranagar"},
            {"type": "profile_refresh"},
            {"type": "targeted_post", "keyword": "bridal makeup bangalore"},
        ],
    )
    keys = handoff.targeted_post_keywords()
    assert keys[0] == "hair spa indiranagar"
    assert "bridal makeup bangalore" in keys
    assert "salon bangalore" in keys
    assert handoff.needs_profile_refresh() is True


def test_growth_handoff_no_profile_when_posts_only():
    handoff = GrowthHandoff(
        seo_actions=[{"type": "targeted_post", "keyword": "dentist koramangala"}],
    )
    assert handoff.needs_profile_refresh() is False


@pytest.mark.asyncio
async def test_growth_orchestrator_instantiates_content_and_passes_keywords():
    """Regression: content stage used unbound `content` before this fix."""
    org = MagicMock()
    org.id = "org-1"
    org.name = "Studio Test"

    session = AsyncMock()
    session.get = AsyncMock(return_value=org)

    geo_result = MagicMock()
    geo_result.to_dict.return_value = {
        "geo_brief": {
            "keywords_assigned": ["kw1", "kw2"],
            "priority_keywords": ["kw1", "kw2"],
        },
        "errors": [],
    }
    geo_result.errors = []

    seo_result = MagicMock()
    seo_result.to_dict.return_value = {
        "actions_planned": [{"type": "targeted_post", "keyword": "kw1"}],
        "rankings": {"status": "ok", "rankings": []},
        "scorecard": {"summary": {"in_top3": 0}},
        "errors": [],
    }
    seo_result.errors = []
    seo_result.actions_planned = [{"type": "targeted_post", "keyword": "kw1"}]
    seo_result.rankings = {"status": "ok", "rankings": []}
    seo_result.scorecard = {"summary": {"in_top3": 0}}

    content_result = MagicMock()
    content_result.to_dict.return_value = {
        "summary": {"posts_created": 2, "reviews_replied": 1},
        "errors": [],
    }
    content_result.errors = []

    content_instance = AsyncMock()
    content_instance.run = AsyncMock(return_value=content_result)
    content_instance.send_pending_review_requests = AsyncMock(
        return_value={"status": "ok", "requests_sent": 0}
    )

    with (
        patch("src.services.agents.growth_orchestrator.get_settings") as settings_p,
        patch("src.services.agents.growth_orchestrator.GeoLocalAgentOrchestrator") as geo_cls,
        patch("src.services.agents.growth_orchestrator.SeoAgentOrchestrator") as seo_cls,
        patch("src.services.agents.growth_orchestrator.ContentAgentsOrchestrator") as content_cls,
        patch("src.services.agents.growth_orchestrator.KeywordPlanner") as planner_cls,
        patch("src.services.agents.growth_orchestrator.save_growth_run", new_callable=AsyncMock),
    ):
        settings = MagicMock()
        settings.feature_geo_agent = True
        settings.feature_seo_agent = True
        settings.feature_content_generator = True
        settings.feature_review_engine = True
        settings_p.return_value = settings

        geo_cls.return_value.run = AsyncMock(return_value=geo_result)
        seo_cls.return_value.run = AsyncMock(return_value=seo_result)
        content_cls.return_value = content_instance
        planner_cls.return_value.get_priority_keywords = AsyncMock(return_value=["kw1", "kw2"])

        orchestrator = GrowthOrchestrator(session)
        result = await orchestrator.run("org-1", content_post_count=2)

    assert result.errors == []
    assert result.content["summary"]["posts_created"] == 2
    assert "kw1" in result.handoff["priority_keywords"]

    # SEO must defer posts to Content inside Growth
    seo_cls.return_value.run.assert_awaited()
    call_kwargs = seo_cls.return_value.run.await_args.kwargs
    assert call_kwargs.get("execute_posts") is False

    content_instance.run.assert_awaited()
    content_kwargs = content_instance.run.await_args.kwargs
    assert "kw1" in (content_kwargs.get("priority_keywords") or [])
