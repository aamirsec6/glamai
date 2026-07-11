"""GBP image post generator — AI caption + marketing image."""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote

import structlog

from src.integrations.anthropic import AnthropicConnector
from src.models.org import Org
from src.services.gbp.optimizer import GbpPostGenerator, POST_TEMPLATES

logger = structlog.get_logger(__name__)

# Curated fallbacks when remote image generation is unavailable
STOCK_IMAGE_URLS: dict[str, str] = {
    "portfolio_showcase": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1080&h=1080&fit=crop",
    "tip_educational": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1080&h=1080&fit=crop",
    "testimonial": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1080&h=1080&fit=crop",
    "seasonal": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&h=1080&fit=crop",
    "behind_scenes": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1080&h=1080&fit=crop",
    "offer_promotion": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1080&h=1080&fit=crop",
}


def build_image_url(image_prompt: str, post_type: str = "portfolio_showcase") -> str:
    """Build a square marketing image URL from a text prompt."""
    prompt = (image_prompt or "").strip()
    if not prompt:
        return STOCK_IMAGE_URLS.get(post_type, STOCK_IMAGE_URLS["portfolio_showcase"])
    encoded = quote(prompt[:500])
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        "?width=1080&height=1080&nologo=true&enhance=true"
    )


class ImagePostGenerator:
    """Generate GBP image posts with AI-written captions and visuals."""

    def __init__(self):
        self._llm = AnthropicConnector()
        self._text = GbpPostGenerator()

    async def generate_image_post(
        self,
        org: Org,
        post_type: str = "portfolio_showcase",
        target_keyword: str | None = None,
        custom_context: str | None = None,
    ) -> dict[str, Any]:
        """Return caption, title, image_url, and metadata for a GBP image post."""
        template = POST_TEMPLATES.get(post_type, POST_TEMPLATES["portfolio_showcase"])
        keyword = target_keyword or self._text._get_keywords_for_org(org)[0]

        system_prompt = f"""You create Google Business Profile image posts for {org.name}, an interior design business in {org.city}, India.

Return JSON only with:
- content: engaging caption (120-250 words), emojis ok, 3-5 hashtags at end
- title: short headline (max 60 chars)
- image_prompt: detailed prompt for an AI image generator (modern Indian home interior, photorealistic, no text in image)
- hashtags: array of 3-5 tags without #
- call_to_action: one of BOOK, CALL, LEARN_MORE

Target keyword: {keyword}"""

        user_message = f"""Post type: {post_type}
Brief: {template['description']}
Style reference: {template['example'][:200]}
{f'Extra context: {custom_context}' if custom_context else ''}

Respond with JSON only."""

        try:
            raw = await self._llm.complete(system_prompt, user_message, max_tokens=700)
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("\n```", 1)[0]
            data = json.loads(raw)
        except (json.JSONDecodeError, Exception) as e:
            logger.warning("image_post_llm_fallback", error=str(e))
            text_post = await self._text.generate_post(org, post_type, keyword, custom_context)
            data = {
                **text_post,
                "image_prompt": (
                    f"Luxury modern living room interior design in {org.city}, "
                    "warm lighting, contemporary Indian home, photorealistic"
                ),
            }

        image_prompt = data.get("image_prompt", "")
        image_url = build_image_url(image_prompt, post_type)

        return {
            "title": data.get("title", ""),
            "content": data.get("content", ""),
            "image_url": image_url,
            "image_prompt": image_prompt,
            "post_type": "photo",
            "keyword_target": keyword,
            "call_to_action": data.get("call_to_action", "BOOK"),
            "hashtags": data.get("hashtags", []),
        }
