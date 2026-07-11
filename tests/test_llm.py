"""Tests for local Ollama / unified LLM client."""

from __future__ import annotations

import httpx
import pytest

from src.core.config import get_settings


def test_llm_defaults_to_ollama():
    s = get_settings()
    assert s.llm_provider == "ollama"
    assert s.ollama_base_url == "http://localhost:11434"


@pytest.mark.asyncio
async def test_ollama_health():
    """Skip if Ollama is not running."""
    from src.integrations.llm import LLMClient

    try:
        r = httpx.get(f"{get_settings().ollama_base_url}/api/tags", timeout=2.0)
        r.raise_for_status()
    except httpx.HTTPError:
        pytest.skip("Ollama not running")

    client = LLMClient()
    ok, msg = await client.is_available()
    await client.close()
    assert ok, msg


@pytest.mark.asyncio
async def test_ollama_complete():
    """End-to-end completion against local Ollama."""
    try:
        r = httpx.get(f"{get_settings().ollama_base_url}/api/tags", timeout=2.0)
        r.raise_for_status()
    except httpx.HTTPError:
        pytest.skip("Ollama not running")

    from src.integrations.llm import LLMClient

    client = LLMClient()
    try:
        text = await client.complete(
            "You are a helpful assistant.",
            "Reply with exactly one word: hello",
            max_tokens=20,
        )
        assert "hello" in text.lower()
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_connector_health_with_ollama():
    try:
        r = httpx.get(f"{get_settings().ollama_base_url}/api/tags", timeout=2.0)
        r.raise_for_status()
    except httpx.HTTPError:
        pytest.skip("Ollama not running")

    from src.integrations.anthropic import AnthropicConnector
    from src.integrations.base import ConnectorStatus

    conn = AnthropicConnector()
    try:
        health = await conn.health()
        assert health.status == ConnectorStatus.READY
        assert "ollama" in health.message.lower()
    finally:
        await conn.close()
