"""Download and serve GBP post images locally."""

from __future__ import annotations

import structlog
from pathlib import Path

import httpx

from src.core.config import get_settings
from src.services.gbp.image_post_generator import STOCK_IMAGE_URLS

logger = structlog.get_logger(__name__)


class PostImageStore:
    """Persist remote post images so the dashboard can load them reliably."""

    def __init__(self):
        self.settings = get_settings()
        self.base_dir = Path(self.settings.storage_local_path) / "posts"

    def public_url(self, org_id: str, post_id: str) -> str:
        base = self.settings.app_base_url.rstrip("/")
        return f"{base}/media/posts/{org_id}/{post_id}.jpg"

    def local_path(self, org_id: str, post_id: str) -> Path:
        return self.base_dir / org_id / f"{post_id}.jpg"

    async def persist(
        self,
        source_url: str,
        org_id: str,
        post_id: str,
        *,
        post_type: str = "portfolio_showcase",
    ) -> str:
        """Download image to local storage; return public URL."""
        dest = self.local_path(org_id, post_id)
        dest.parent.mkdir(parents=True, exist_ok=True)

        urls_to_try = [source_url]
        stock = STOCK_IMAGE_URLS.get(post_type, STOCK_IMAGE_URLS["portfolio_showcase"])
        if stock not in urls_to_try:
            urls_to_try.append(stock)

        for url in urls_to_try:
            if not url:
                continue
            try:
                async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    if not response.content or len(response.content) < 500:
                        continue
                    dest.write_bytes(response.content)
                    logger.info("post_image_saved", org_id=org_id, post_id=post_id, bytes=len(response.content))
                    return self.public_url(org_id, post_id)
            except Exception as e:
                logger.warning("post_image_download_failed", url=url[:120], error=str(e))

        # Last resort: keep stock URL (Unsplash works in most browsers)
        return stock
