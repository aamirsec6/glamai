"""Tests for content agents orchestrator."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.agents.content_orchestrator import ContentAgentsOrchestrator


@pytest.mark.asyncio
async def test_orchestrator_org_not_found():
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)

    orchestrator = ContentAgentsOrchestrator(session)
    result = await orchestrator.run("missing-org")

    assert result.errors == ["org_not_found"]
    assert result.org_name == ""


@pytest.mark.asyncio
async def test_orchestrator_runs_all_agents():
    org = MagicMock()
    org.id = "org-1"
    org.name = "Test Studio"
    org.city = "Bangalore"
    org.category.value = "interior_design"
    org.guarantee_gbp_posts_delivered = 0

    session = AsyncMock()
    session.get = AsyncMock(return_value=org)
    session.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))
    session.add = MagicMock()
    session.flush = AsyncMock()

    with (
        patch.object(
            ContentAgentsOrchestrator,
            "_generate_posts",
            new=AsyncMock(return_value={"posts_created": 2, "posts_scheduled": 2, "drafts": []}),
        ),
        patch.object(
            ContentAgentsOrchestrator,
            "_optimize_profile",
            new=AsyncMock(return_value={"status": "ok", "profile": {"optimization_score": 80}}),
        ),
        patch.object(
            ContentAgentsOrchestrator,
            "_auto_reply_reviews",
            new=AsyncMock(return_value={"status": "ok", "replied": 1, "processed": 1}),
        ),
        patch.object(
            ContentAgentsOrchestrator,
            "_run_analysis",
            new=AsyncMock(return_value={"scores": {"overall": 72}, "narrative": "Good progress."}),
        ),
    ):
        orchestrator = ContentAgentsOrchestrator(session)
        result = await orchestrator.run("org-1")

    data = result.to_dict()
    assert data["summary"]["posts_created"] == 2
    assert data["summary"]["reviews_replied"] == 1
    assert data["summary"]["profile_optimized"] is True
    assert data["summary"]["analysis_score"] == 72
    assert not data["errors"]
