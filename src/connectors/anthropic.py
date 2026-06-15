"""Anthropic Claude connector for AI operations."""

from __future__ import annotations

import json
from typing import Any

import anthropic
import structlog

from src.config import get_settings
from src.connectors.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)

logger = structlog.get_logger(__name__)


class AnthropicConnector:
    provider = ConnectorProvider.ANTHROPIC

    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.anthropic_api_key
        self.model = settings.anthropic_model
        self.max_tokens = settings.anthropic_max_tokens
        self._client: anthropic.AsyncAnthropic | None = None
        if self.api_key:
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)

    async def close(self) -> None:
        return None

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        if not self.api_key:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message="ANTHROPIC_API_KEY missing",
            )
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.READY,
            message=f"Model {self.model} configured",
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
        if not self._client:
            return PullResult(
                self.provider, resource, org_id, False, error="anthropic_not_configured"
            )

        try:
            if resource == ConnectorResource.QUALIFY_LEAD:
                return await self._qualify_lead(org_id, **opts)
            if resource == ConnectorResource.GENERATE_POSTS:
                return await self._generate_posts(org_id, **opts)
            if resource == ConnectorResource.GENERATE_REVIEW_REPLY:
                return await self._generate_review_reply(org_id, **opts)
            if resource == ConnectorResource.OPTIMIZE_PROFILE:
                return await self._optimize_profile(org_id, **opts)
            if resource == ConnectorResource.REPORT_NARRATIVE:
                return await self._report_narrative(org_id, **opts)
            return PullResult(
                self.provider, resource, org_id, False, error=f"unsupported_resource:{resource}"
            )
        except Exception as e:
            logger.error("anthropic_pull_failed", org_id=org_id, resource=resource, error=str(e))
            return PullResult(self.provider, resource, org_id, False, error=str(e))

    async def _qualify_lead(self, org_id: str, **opts: Any) -> PullResult:
        system = opts.get("system_prompt", "You are a lead qualification assistant.")
        user = opts.get("user_message", "")
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = response.content[0].text.strip()
        parsed: dict[str, Any] = {"raw": text}
        try:
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("\n```", 1)[0]
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed["reply"] = text
        return PullResult(
            self.provider,
            ConnectorResource.QUALIFY_LEAD,
            org_id,
            True,
            data=parsed,
        )

    async def _generate_posts(self, org_id: str, **opts: Any) -> PullResult:
        system = opts.get("system_prompt", "You are a GBP post writer.")
        user = opts.get("user_message", "")
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=opts.get("max_tokens", 800),
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = response.content[0].text.strip()
        posts: list[dict] = []
        try:
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("\n```", 1)[0]
            parsed = json.loads(text)
            if isinstance(parsed, list):
                posts = parsed
            else:
                posts = [parsed]
        except json.JSONDecodeError:
            posts = [{"content": text, "title": None}]
        return PullResult(
            self.provider,
            ConnectorResource.GENERATE_POSTS,
            org_id,
            True,
            data={"posts": posts},
        )

    async def _generate_review_reply(self, org_id: str, **opts: Any) -> PullResult:
        system = opts.get("system_prompt", "Write a GBP review reply.")
        user = opts.get("user_message", "")
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=400,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = response.content[0].text.strip()
        parsed: dict[str, Any] = {"raw": text}
        try:
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("\n```", 1)[0]
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed["reply"] = text
        return PullResult(
            self.provider,
            ConnectorResource.GENERATE_REVIEW_REPLY,
            org_id,
            True,
            data=parsed,
        )

    async def _optimize_profile(self, org_id: str, **opts: Any) -> PullResult:
        system = opts.get("system_prompt", "Optimize GBP profile content.")
        user = opts.get("user_message", "")
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=opts.get("max_tokens", 1200),
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = response.content[0].text.strip()
        parsed: dict[str, Any] = {"raw": text}
        try:
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("\n```", 1)[0]
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed["optimized_description"] = text
        return PullResult(
            self.provider,
            ConnectorResource.OPTIMIZE_PROFILE,
            org_id,
            True,
            data=parsed,
        )

    async def _report_narrative(self, org_id: str, **opts: Any) -> PullResult:
        snapshot = opts.get("snapshot", {})
        system = (
            "Write a concise 2-3 paragraph monthly marketing summary for a local business owner in India."
        )
        user = f"Metrics snapshot JSON:\n{json.dumps(snapshot, default=str)}"
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=600,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        narrative = response.content[0].text.strip()
        return PullResult(
            self.provider,
            ConnectorResource.REPORT_NARRATIVE,
            org_id,
            True,
            data={"narrative": narrative},
        )

    async def push(
        self,
        org_id: str,
        resource: ConnectorResource,
        payload: dict[str, Any],
    ) -> PushResult:
        return PushResult(
            self.provider, resource, org_id, False, error="anthropic_connector_is_read_only"
        )

    async def complete(self, system: str, user: str, max_tokens: int | None = None) -> str:
        """Low-level completion helper for facades."""
        if not self._client:
            raise RuntimeError("Anthropic not configured")
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text.strip()
