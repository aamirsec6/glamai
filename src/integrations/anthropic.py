"""AI connector — routes to Anthropic or local Ollama via LLMClient."""

from __future__ import annotations

import json
from typing import Any

import structlog

from src.core.config import get_settings
from src.integrations.base import (
    ConnectorHealth,
    ConnectorProvider,
    ConnectorResource,
    ConnectorStatus,
    PullResult,
    PushResult,
)
from src.integrations.llm import LLMClient, parse_json_response

logger = structlog.get_logger(__name__)


class AnthropicConnector:
    provider = ConnectorProvider.ANTHROPIC

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.anthropic_model
        self.max_tokens = settings.anthropic_max_tokens
        self._llm = LLMClient()

    async def close(self) -> None:
        await self._llm.close()

    async def health(self, org_id: str | None = None) -> ConnectorHealth:
        ok, message = await self._llm.is_available()
        if not ok:
            return ConnectorHealth(
                provider=self.provider,
                status=ConnectorStatus.NOT_CONFIGURED,
                message=message,
            )
        return ConnectorHealth(
            provider=self.provider,
            status=ConnectorStatus.READY,
            message=message,
        )

    async def pull(
        self,
        org_id: str,
        resource: ConnectorResource,
        **opts: Any,
    ) -> PullResult:
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
            logger.error("ai_pull_failed", org_id=org_id, resource=resource, error=str(e))
            return PullResult(self.provider, resource, org_id, False, error=str(e))

    async def _qualify_lead(self, org_id: str, **opts: Any) -> PullResult:
        system = opts.get("system_prompt", "You are a lead qualification assistant.")
        user = opts.get("user_message", "")
        text = await self._llm.complete(system, user)
        parsed = parse_json_response(text)
        if "reply" not in parsed and "raw" in parsed:
            parsed["reply"] = parsed["raw"]
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
        text = await self._llm.complete(system, user, max_tokens=opts.get("max_tokens", 800))
        posts: list[dict] = []
        try:
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("\n```", 1)[0]
            parsed = json.loads(cleaned)
            posts = parsed if isinstance(parsed, list) else [parsed]
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
        text = await self._llm.complete(system, user, max_tokens=400)
        parsed = parse_json_response(text)
        if "reply" not in parsed and "raw" in parsed:
            parsed["reply"] = parsed["raw"]
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
        text = await self._llm.complete(system, user, max_tokens=opts.get("max_tokens", 1200))
        parsed = parse_json_response(text)
        if "optimized_description" not in parsed and "raw" in parsed:
            parsed["optimized_description"] = parsed["raw"]
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
        narrative = await self._llm.complete(system, user, max_tokens=600)
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
            self.provider, resource, org_id, False, error="ai_connector_is_read_only"
        )

    async def complete(self, system: str, user: str, max_tokens: int | None = None) -> str:
        """Low-level completion helper for facades."""
        return await self._llm.complete(system, user, max_tokens=max_tokens)
