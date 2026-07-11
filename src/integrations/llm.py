"""Unified LLM client — Anthropic cloud or Ollama local."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
import structlog

from src.core.config import get_settings

logger = structlog.get_logger(__name__)

LLMProvider = Literal["anthropic", "ollama"]


class LLMClient:
    """Route completions to Anthropic or a local Ollama instance."""

    def __init__(self) -> None:
        settings = get_settings()
        self.provider: LLMProvider = settings.llm_provider
        self.max_tokens = settings.anthropic_max_tokens
        self.temperature = settings.anthropic_temperature

        self.anthropic_api_key = settings.anthropic_api_key
        self.anthropic_model = settings.anthropic_model
        self._anthropic = None
        if self.anthropic_api_key:
            import anthropic

            self._anthropic = anthropic.AsyncAnthropic(api_key=self.anthropic_api_key)

        self.ollama_base_url = settings.ollama_base_url.rstrip("/")
        self.ollama_model = settings.ollama_model
        self._http: httpx.AsyncClient | None = None

    def _effective_provider(self) -> LLMProvider:
        if self.provider == "anthropic" and self._anthropic:
            return "anthropic"
        return "ollama"

    async def _get_http(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=120.0)
        return self._http

    async def close(self) -> None:
        if self._http:
            await self._http.aclose()
            self._http = None

    async def is_available(self) -> tuple[bool, str]:
        provider = self._effective_provider()
        if provider == "anthropic":
            return True, f"anthropic:{self.anthropic_model}"
        try:
            http = await self._get_http()
            r = await http.get(f"{self.ollama_base_url}/api/tags")
            r.raise_for_status()
            return True, f"ollama:{self.ollama_model}"
        except Exception as e:
            return False, f"ollama unreachable at {self.ollama_base_url}: {e}"

    async def complete(
        self,
        system: str,
        user: str,
        max_tokens: int | None = None,
    ) -> str:
        provider = self._effective_provider()
        tokens = max_tokens or self.max_tokens

        if provider == "anthropic":
            if not self._anthropic:
                raise RuntimeError("Anthropic not configured")
            response = await self._anthropic.messages.create(
                model=self.anthropic_model,
                max_tokens=tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return response.content[0].text.strip()

        return await self._ollama_complete(system, user, tokens)

    async def _ollama_complete(self, system: str, user: str, max_tokens: int) -> str:
        http = await self._get_http()
        payload: dict[str, Any] = {
            "model": self.ollama_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": self.temperature,
            },
        }
        try:
            r = await http.post(f"{self.ollama_base_url}/api/chat", json=payload)
            r.raise_for_status()
            content = r.json().get("message", {}).get("content", "")
            if content:
                return content.strip()
        except httpx.HTTPError as e:
            logger.warning("ollama_chat_failed", error=str(e))

        r = await http.post(
            f"{self.ollama_base_url}/api/generate",
            json={
                "model": self.ollama_model,
                "prompt": f"System: {system}\n\nUser: {user}\n\nAssistant:",
                "stream": False,
                "options": {"num_predict": max_tokens, "temperature": self.temperature},
            },
        )
        r.raise_for_status()
        return r.json().get("response", "").strip()


def parse_json_response(text: str) -> dict[str, Any]:
    """Extract JSON from model output (handles markdown fences)."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("\n```", 1)[0]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"raw": text}
