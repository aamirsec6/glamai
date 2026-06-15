"""GBP facade — single entry for connect, sync, publish, generate."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.connectors.base import ConnectorResource
from src.connectors.registry import ConnectorRegistry
from src.engine.ingest import IngestEngine
from src.models.gbp import GbpPost
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org
from src.services.gbp.optimizer import GbpPostGenerator
from src.services.gbp.profile_optimizer import GbpProfileOptimizer
from src.services.gbp.token_manager import GbpTokenManager

logger = structlog.get_logger(__name__)


class GbpFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)
        self.ingest = IngestEngine(session)

    async def close(self) -> None:
        await self.registry.close()

    async def connect_oauth(self, org_id: str, code: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        token_mgr = GbpTokenManager(self.session)
        try:
            token_data = await token_mgr.client.exchange_code(code)
            await token_mgr.store_tokens(
                org_id=org.id,
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                expires_in=token_data.get("expires_in"),
            )
            access = await token_mgr.get_valid_access_token(org.id)
            if access:
                gbp = self.registry.gbp()
                loc_result = await gbp.pull(org_id, ConnectorResource.LOCATIONS)
                await gbp.close()
                if loc_result.ok and loc_result.data.get("locations"):
                    loc = loc_result.data["locations"][0]
                    org.gbp_place_id = loc.get("name", "")
                    org.gbp_name = loc.get("title") or loc.get("locationName")
                    org.gbp_status = "CONNECTED"

            org.onboarding_status = OnboardingStatus.GBP_CONNECTED
            org.gbp_last_synced_at = datetime.utcnow()
            org.updated_at = datetime.utcnow()
            self.session.add(org)
            self.session.add(
                OnboardingEvent(
                    org_id=org.id,
                    event_type="gbp_connected",
                    event_data=json.dumps({"place_id": org.gbp_place_id}),
                )
            )
            await self.session.flush()
            return {"status": "ok", "place_id": org.gbp_place_id}
        finally:
            await token_mgr.close()

    async def sync(
        self,
        org_id: str,
        resources: list[str] | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        resources = resources or ["insights", "competitors", "reviews"]
        results: dict[str, Any] = {"org_id": org_id}

        gbp = self.registry.gbp()
        places = self.registry.places()
        try:
            if "insights" in resources:
                pull = await gbp.pull(org_id, ConnectorResource.INSIGHTS, days=days)
                results["insights"] = await self.ingest.ingest_pull(pull)

            if "reviews" in resources:
                pull = await gbp.pull(org_id, ConnectorResource.REVIEWS)
                results["reviews"] = await self.ingest.ingest_pull(pull)

            if "competitors" in resources:
                pull = await places.pull(org_id, ConnectorResource.COMPETITORS)
                results["competitors"] = await self.ingest.ingest_pull(pull)
        finally:
            await gbp.close()
            await places.close()

        return results

    async def sync_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.sync_profile(org_id)
        finally:
            await optimizer.close()

    async def optimize_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.optimize_profile(org_id)
        finally:
            await optimizer.close()

    async def apply_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.apply_optimization(org_id)
        finally:
            await optimizer.close()

    async def publish_post(self, post_id: str) -> dict[str, Any]:
        post = await self.session.get(GbpPost, post_id)
        if not post:
            return {"status": "post_not_found"}

        gbp = self.registry.gbp()
        try:
            push = await gbp.push(
                post.org_id,
                ConnectorResource.POST,
                {
                    "content": post.content,
                    "call_to_action": post.call_to_action,
                    "media_url": post.image_url,
                },
            )
            return await self.ingest.ingest_push_post(post.org_id, post_id, push)
        finally:
            await gbp.close()

    async def generate_drafts(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        generator = GbpPostGenerator()
        now = datetime.utcnow()
        posts_data = await generator.generate_monthly_posts(
            org=org, month=now.month, year=now.year
        )
        return await self.ingest.ingest_generated_posts(org_id, posts_data)
