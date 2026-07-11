"""Tests for image post generation."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.gbp.image_post_generator import build_image_url, STOCK_IMAGE_URLS
from src.services.media.post_images import PostImageStore


def test_build_image_url_from_prompt():
    url = build_image_url("modern living room interior bangalore", "portfolio_showcase")
    assert "pollinations.ai" in url
    assert "modern" in url.lower()


def test_build_image_url_fallback_without_prompt():
    url = build_image_url("", "seasonal")
    assert url == STOCK_IMAGE_URLS["seasonal"]


@pytest.mark.asyncio
async def test_post_image_store_persist(tmp_path):
    store = PostImageStore()
    store.base_dir = tmp_path / "posts"
    store.settings.app_base_url = "http://localhost:8000"

    fake_response = MagicMock()
    fake_response.content = b"\xff\xd8\xff" + b"x" * 600
    fake_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=fake_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("src.services.media.post_images.httpx.AsyncClient", return_value=mock_client):
        url = await store.persist("https://example.com/img.jpg", "org-1", "post-1")

    assert url == "http://localhost:8000/media/posts/org-1/post-1.jpg"
    assert (tmp_path / "posts" / "org-1" / "post-1.jpg").exists()
