"""GBP Post Generator — AI-powered Google Business Profile post writing.

Generates optimized GBP posts for interior designers targeting
specific keywords and local search terms.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import anthropic
import structlog

from src.config import get_settings
from src.models.gbp import GbpPost, GbpPostType
from src.models.org import Org

logger = structlog.get_logger(__name__)


# ── Post Templates by Type ───────────────────────────────────

POST_TEMPLATES = {
    "portfolio_showcase": {
        "description": "Showcase a completed project",
        "example": "✨ Just completed this stunning 3BHK transformation in Whitefield!\n\nFrom concept to completion in 45 days. Modern minimalist design with warm wood accents.\n\nThinking about your own space? Let's chat! 🏠\n\n#InteriorDesign #Bangalore #3BHK #ModernInterior",
    },
    "tip_educational": {
        "description": "Share an interior design tip",
        "example": "💡 Design Tip: Use mirrors strategically to make small spaces feel larger!\n\nA well-placed mirror can double the visual depth of a room and reflect natural light beautifully.\n\nSave this for your next project! 📌\n\n#DesignTips #InteriorDesign #SmallSpaces",
    },
    "seasonal": {
        "description": "Seasonal/festival-themed post",
        "example": "🪔 This Diwali, transform your home into a warm, inviting space!\n\nOur top 3 tips:\n1. Layer warm lighting\n2. Add festive textiles\n3. Create a welcoming entrance\n\nBook a consultation today!\n\n#DiwaliDecor #HomeDecor #Bangalore",
    },
    "testimonial": {
        "description": "Client testimonial/review highlight",
        "example": "⭐⭐⭐⭐⭐\n\n\"They understood our vision perfectly and delivered beyond expectations!\"\n— Happy Client, Indiranagar\n\nYour dream home is just a message away! 💬\n\n#ClientLove #InteriorDesign #Bangalore",
    },
    "behind_scenes": {
        "description": "Behind the scenes of a project",
        "example": "🔨 Behind the scenes: Custom carpentry for a modular kitchen in Koramangala!\n\nEvery detail matters. From material selection to final installation.\n\nFollow for more updates! 👀\n\n#ModularKitchen #BehindTheScenes #InteriorDesign",
    },
    "offer_promotion": {
        "description": "Special offer or promotion",
        "example": "🎉 LIMITED OFFER: Free consultation + 3D design for new clients this month!\n\nFirst 10 bookings only. Don't miss out!\n\nDM or call to book your slot! 📞\n\n#InteriorDesign #Bangalore #FreeConsultation",
    },
}

# ── Keyword Banks by Vertical ────────────────────────────────

INTERIOR_DESIGN_KEYWORDS = {
    "primary": [
        "interior designer",
        "interior design",
        "home interior",
        "office interior",
    ],
    "location_based": [
        "interior designer in {area}",
        "best interior designer {city}",
        "interior design company {area}",
    ],
    "service_based": [
        "modular kitchen design",
        "wardrobe design",
        "home renovation",
        "office interior design",
        "3BHK interior",
        "2BHK interior",
    ],
    "long_tail": [
        "affordable interior designer {city}",
        "luxury interior design {area}",
        "modern interior designer",
        "contemporary home design",
    ],
}


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
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

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
        template = POST_TEMPLATES.get(post_type, POST_TEMPLATES["portfolio_showcase"])

        system_prompt = f"""You are a Google Business Profile post writer for an interior design business in India.

Write engaging, professional GBP posts that:
- Are 150-300 words
- Include the target keyword naturally (not stuffed)
- Have a clear call-to-action
- Use 3-5 relevant hashtags
- Are conversational and warm
- Follow GBP best practices

Business details:
- Name: {org.name}
- City: {org.city}
- Category: Interior Design

Respond in JSON format:
{{
    "content": "the post text",
    "title": "optional short title",
    "hashtags": ["tag1", "tag2", "tag3"],
    "call_to_action": "what action to suggest"
}}"""

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
            response = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=500,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            content = response.content[0].text.strip()
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
        post_types = [
            "portfolio_showcase",
            "tip_educational",
            "testimonial",
            "seasonal",
        ]

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
        """Get target keywords for an org based on their location."""
        city = org.city or "Bangalore"
        return [
            f"interior designer in {city}",
            f"best interior designer {city}",
            "modular kitchen design",
            "home interior design",
            "3BHK interior design",
            "office interior design",
        ]

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
