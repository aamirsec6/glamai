"""Default vertical pack for categories without a dedicated pack."""

from __future__ import annotations

from src.services.verticals._base import format_keywords

PLACES_TYPES = ["establishment"]
DISPLAY_NAME = "Local Business"

KEYWORD_TEMPLATES = [
    "{category} in {city}",
    "best {category} {city}",
    "{category} near me",
    "{category} {area}",
]

SEO_GAP_TEMPLATES = [
    "{category} in {city}",
    "best {category} {city}",
]

POST_TEMPLATES = {
    "tip_educational": {
        "description": "Helpful tip for customers",
        "example": "Tip from our team — visit us today!",
    },
    "testimonial": {
        "description": "Customer testimonial",
        "example": "Great service — happy customer!",
    },
    "offer_promotion": {
        "description": "Special offer",
        "example": "Limited time offer — contact us today!",
    },
    "seasonal": {
        "description": "Seasonal message",
        "example": "Celebrate the season with us!",
    },
}

MONTHLY_POST_TYPES = ["tip_educational", "testimonial", "offer_promotion", "seasonal"]

QUALIFICATION_FLOW = {
    "greeting": {"question": None, "next": "need", "extract": []},
    "need": {
        "question": "How can we help you today?",
        "next": "timeline",
        "extract": ["scope"],
    },
    "timeline": {
        "question": "When do you need this?",
        "next": "location",
        "extract": ["timeline"],
    },
    "location": {
        "question": "Which area are you in?",
        "next": "complete",
        "extract": ["location_area"],
    },
    "complete": {"question": None, "next": None, "extract": []},
}


def keyword_pool(city: str, area: str | None = None, category: str = "business") -> list[str]:
    cat = category.replace("_", " ")
    templates = [t.replace("{category}", cat) for t in KEYWORD_TEMPLATES]
    return format_keywords(templates, city, area)


def seo_gap_templates(city: str, category: str = "business") -> list[str]:
    cat = category.replace("_", " ")
    templates = [t.replace("{category}", cat) for t in SEO_GAP_TEMPLATES]
    return format_keywords(templates, city)


def post_system_prompt(org_name: str, city: str, category: str = "local business") -> str:
    return (
        f"You are a Google Business Profile post writer for {org_name}, "
        f"a {category.replace('_', ' ')} in {city}, India. "
        "Write engaging local posts. Respond in JSON with content, title, hashtags, call_to_action."
    )


def whatsapp_system_prompt(org_name: str, city: str, category: str = "local business") -> str:
    return (
        f"You are a friendly WhatsApp assistant for {org_name} ({category.replace('_', ' ')}) in {city}. "
        "Qualify leads naturally. One question at a time."
    )
