"""GBP Post Generator — AI-powered Google Business Profile post writing.

Generates optimized GBP posts for interior designers targeting
specific keywords and local search terms.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import structlog

from src.integrations.anthropic import AnthropicConnector
from src.core.config import get_settings
from src.models.gbp import GbpPost, GbpPostType
from src.models.org import Org
from src.services.verticals import get_vertical

logger = structlog.get_logger(__name__)

# Backward-compatible alias
INTERIOR_DESIGN_KEYWORDS = get_vertical("interior_design").keyword_bank
POST_TEMPLATES = get_vertical("interior_design").post_templates


class GbpPostGenerator:
    """AI-powered GBP post generator.

    Creates optimized Google Business Profile posts that:
    - Target specific keywords
    - Follow GBP best practices
    - Are engaging and professional
    - Include relevant hashtags
    """

    def __init__(self, api_key: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.anthropic_api_key
        self._llm = AnthropicConnector()

    async def generate_post(
        self,
        org: Org,
        post_type: str = "portfolio_showcase",
        target_keyword: str | None = None,
        custom_context: str | None = None,
    ) -> dict[str, Any]:
        """Generate a GBP post for an interior design business.

        Args:
            org: The organization (interior design business)
            post_type: Type of post (portfolio_showcase, tip_educational, etc.)
            target_keyword: Primary keyword to target
            custom_context: Any specific context to include

        Returns:
            dict with keys:
                - content: str — the post text
                - title: str — optional title
                - keyword_target: str — the primary keyword
                - hashtags: list[str] — suggested hashtags
        """
        vertical = get_vertical(org.category.value)
        template = vertical.post_templates.get(
            post_type, vertical.post_templates.get("tip_educational", {"description": "", "example": ""})
        )

        system_prompt = vertical.post_system_prompt(org.name, org.city or "Bangalore")

        keyword_instruction = ""
        if target_keyword:
            keyword_instruction = f"\n\nPrimary keyword to include: {target_keyword}"

        context_instruction = ""
        if custom_context:
            context_instruction = f"\n\nAdditional context: {custom_context}"

        user_message = f"""Write a GBP post of type: {post_type}
{template['description']}

Example style: {template['example']}
{keyword_instruction}{context_instruction}

Respond with JSON only."""

        try:
            content = await self._llm.complete(system_prompt, user_message, max_tokens=500)
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                content = content.rsplit("\n```", 1)[0]

            result = json.loads(content)
            result["keyword_target"] = target_keyword or ""
            return result

        except (json.JSONDecodeError, Exception) as e:
            logger.error("post_generation_failed", error=str(e))
            return {
                "content": template["example"],
                "title": "",
                "hashtags": ["InteriorDesign", "Bangalore"],
                "call_to_action": "Contact us",
                "keyword_target": target_keyword or "",
            }

    async def generate_monthly_posts(
        self,
        org: Org,
        month: int,
        year: int,
    ) -> list[dict[str, Any]]:
        """Generate 4 posts for a month (one per week).

        Returns a list of post dicts, each with content, type, and
        suggested publish date.
        """
        post_types = get_vertical(org.category.value).monthly_post_types

        keywords = self._get_keywords_for_org(org)
        posts = []

        for i, post_type in enumerate(post_types):
            keyword = keywords[i % len(keywords)]
            post = await self.generate_post(
                org=org,
                post_type=post_type,
                target_keyword=keyword,
            )
            post["suggested_date"] = self._get_week_date(month, year, i)
            posts.append(post)

        return posts

    def _get_keywords_for_org(self, org: Org) -> list[str]:
        """Get target keywords for an org based on vertical and location."""
        city = org.city or "Bangalore"
        vertical = get_vertical(org.category.value)
        return vertical.keyword_pool(city)[:6]

    @staticmethod
    def _get_week_date(month: int, year: int, week_index: int) -> str:
        """Get a date for a specific week in a month."""
        from calendar import monthcal

        cal = monthcal(year, month)
        # Get the Monday of each week
        week_starts = []
        for week in cal:
            for day in week:
                if day != 0:
                    week_starts.append(day)
                    break

        if week_index < len(week_starts):
            day = week_starts[week_index]
            return f"{year}-{month:02d}-{day:02d}"
        return f"{year}-{month:02d}-01"
