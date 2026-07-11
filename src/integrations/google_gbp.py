"""Google Business Profile connector."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.integrations.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)
from src.models.org import Org
from src.services.gbp.client import GbpClient
from src.services.gbp.token_manager import GbpTokenManager

logger = structlog.get_logger(__name__)


def location_resource(org: Org) -> str | None:
    if not org.gbp_place_id:
        return None
    if "/" in org.gbp_place_id:
        return org.gbp_place_id
    return f"locations/{org.gbp_place_id}"


class GoogleGbpConnector:
    provider = ConnectorProvider.GOOGLE_GBP

    def __init__(self, session: AsyncSession):
        self.session = session
        settings = get_settings()
        self.token_mgr = GbpTokenManager(session)
        self.client = self.token_mgr.client
        self.settings = settings

    async def close(self) -> None:
        await self.token_mgr.close()

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        if not self.settings.google_client_id or not self.settings.google_client_secret:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message="GOOGLE_CLIENT_ID/SECRET missing",
            )
        if not org_id:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.CONFIGURED,
                message="Platform credentials configured",
            )
        org = await self.session.get(Org, org_id)
        if not org or not org.gbp_place_id:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message="GBP not connected for org",
            )
        token = await self.token_mgr.get_valid_access_token(org_id)
        if not token:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.ERROR,
                message="OAuth token missing or expired",
            )
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.CONNECTED,
            message=f"Connected: {org.gbp_name or org.gbp_place_id}",
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return PullResult(self.provider, resource, org_id, False, error="org_not_found")

        access = await self.token_mgr.get_valid_access_token(org_id)
        loc = location_resource(org)
        if not access or not loc:
            return PullResult(self.provider, resource, org_id, False, error="not_connected")

        days = int(opts.get("days", 30))
        try:
            if resource == ConnectorResource.INSIGHTS:
                raw = await self.client.get_insights(access, loc, days=days)
                reviews_data: list[dict] = []
                try:
                    reviews_data = await self.client.list_reviews(access, loc)
                except Exception as e:
                    logger.warning("gbp_reviews_pull_skipped", org_id=org_id, error=str(e))
                period_end = datetime.utcnow()
                period_start = period_end - timedelta(days=days)
                return PullResult(
                    self.provider,
                    resource,
                    org_id,
                    True,
                    data={
                        "raw_insights": raw,
                        "reviews": reviews_data,
                        "period_start": period_start.isoformat(),
                        "period_end": period_end.isoformat(),
                    },
                )

            if resource == ConnectorResource.REVIEWS:
                reviews = await self.client.list_reviews(access, loc)
                return PullResult(
                    self.provider, resource, org_id, True, data={"reviews": reviews}
                )

            if resource == ConnectorResource.LOCATIONS:
                locations = await self.client.list_locations(access)
                return PullResult(
                    self.provider, resource, org_id, True, data={"locations": locations}
                )

            if resource == ConnectorResource.POSTS:
                posts = await self.client.list_posts(access, loc)
                return PullResult(
                    self.provider, resource, org_id, True, data={"posts": posts}
                )

            return PullResult(
                self.provider, resource, org_id, False, error=f"unsupported_resource:{resource}"
            )
        except Exception as e:
            logger.error("gbp_pull_failed", org_id=org_id, resource=resource, error=str(e))
            return PullResult(self.provider, resource, org_id, False, error=str(e))

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult:
        org = await self.session.get(Org, org_id)
        if not org:
            return PushResult(self.provider, resource, org_id, False, error="org_not_found")

        access = await self.token_mgr.get_valid_access_token(org_id)
        loc = location_resource(org)
        if not access or not loc:
            return PushResult(self.provider, resource, org_id, False, error="not_connected")

        try:
            if resource == ConnectorResource.POST:
                result = await self.client.create_post(
                    access_token=access,
                    location_name=loc,
                    content=payload.get("content", ""),
                    call_to_action=payload.get("call_to_action"),
                    media_url=payload.get("media_url"),
                )
                return PushResult(
                    self.provider,
                    resource,
                    org_id,
                    True,
                    data={"google_post_id": result.get("name", ""), "raw": result},
                )

            if resource == ConnectorResource.REVIEW_REPLY:
                review_name = payload.get("review_name", "")
                reply_text = payload.get("reply_text", "")
                result = await self.client.reply_to_review(access, review_name, reply_text)
                return PushResult(
                    self.provider, resource, org_id, True, data={"raw": result}
                )

            if resource == ConnectorResource.PROFILE:
                description = payload.get("description", "")
                result = await self.client.update_location(access, loc, description)
                return PushResult(
                    self.provider, resource, org_id, True, data={"raw": result}
                )

            return PushResult(
                self.provider, resource, org_id, False, error=f"unsupported_push:{resource}"
            )
        except Exception as e:
            logger.error("gbp_push_failed", org_id=org_id, error=str(e))
            return PushResult(self.provider, resource, org_id, False, error=str(e))
