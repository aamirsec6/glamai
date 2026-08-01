"""Interior design vertical pack."""

from __future__ import annotations

from src.services.verticals._base import format_keywords

CATEGORY = "interior_design"
PLACES_TYPES = ["interior_designer"]
DISPLAY_NAME = "Interior Design"

KEYWORD_TEMPLATES = [
    "interior designer in {city}",
    "best interior designer {city}",
    "interior design company {city}",
    "home interior design {city}",
    "modular kitchen design {city}",
    "wardrobe design {city}",
    "3bhk interior design",
    "2bhk interior design",
    "office interior design {city}",
    "home renovation {city}",
    "luxury interior design {city}",
    "affordable interior designer {city}",
]

SEO_GAP_TEMPLATES = [
    "interior designer in {city}",
    "best interior designer {city}",
    "modular kitchen {city}",
    "home interior design {city}",
    "3BHK interior design",
]

POST_TEMPLATES = {
    "portfolio_showcase": {
        "description": "Showcase a completed project",
        "example": "Just completed this stunning 3BHK transformation! Book a consultation today.",
    },
    "tip_educational": {
        "description": "Share an interior design tip",
        "example": "Design Tip: Use mirrors to make small spaces feel larger.",
    },
    "seasonal": {
        "description": "Seasonal/festival-themed post",
        "example": "This Diwali, transform your home into a warm, inviting space!",
    },
    "testimonial": {
        "description": "Client testimonial highlight",
        "example": "They understood our vision perfectly — Happy Client",
    },
    "behind_scenes": {
        "description": "Behind the scenes of a project",
        "example": "Behind the scenes: Custom carpentry for a modular kitchen.",
    },
    "offer_promotion": {
        "description": "Special offer or promotion",
        "example": "LIMITED OFFER: Free consultation + 3D design for new clients!",
    },
}

MONTHLY_POST_TYPES = [
    "portfolio_showcase",
    "tip_educational",
    "testimonial",
    "seasonal",
]

KEYWORD_BANK = {
    "primary": ["interior designer", "interior design", "home interior", "office interior"],
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

QUALIFICATION_FLOW = {
    "greeting": {"question": None, "next": "scope", "extract": []},
    "scope": {
        "question": "What type of space is this for? (e.g., full home, kitchen, office)",
        "next": "size",
        "extract": ["scope"],
    },
    "size": {
        "question": "What's the approximate size? (e.g., 2BHK, 1200 sqft)",
        "next": "budget",
        "extract": ["property_type", "property_size_sqft"],
    },
    "budget": {
        "question": "What's your approximate budget range?",
        "next": "timeline",
        "extract": ["budget_range"],
    },
    "timeline": {
        "question": "When are you looking to start the project?",
        "next": "location",
        "extract": ["timeline"],
    },
    "location": {
        "question": "Which area is the project in?",
        "next": "complete",
        "extract": ["location_area"],
    },
    "complete": {"question": None, "next": None, "extract": []},
}


def keyword_pool(city: str, area: str | None = None) -> list[str]:
    return format_keywords(KEYWORD_TEMPLATES, city, area)


def seo_gap_templates(city: str) -> list[str]:
    return format_keywords(SEO_GAP_TEMPLATES, city)


def post_system_prompt(org_name: str, city: str) -> str:
    return (
        f"You are a Google Business Profile post writer for {org_name}, "
        f"an interior design business in {city}, India. "
        "Write engaging posts (150-300 words), include target keywords naturally, "
        "and respond in JSON with content, title, hashtags, call_to_action."
    )


def whatsapp_system_prompt(org_name: str, city: str) -> str:
    return (
        f"You are a friendly WhatsApp assistant for {org_name}, "
        f"an interior design studio in {city}. "
        "Qualify leads by learning scope, size, budget, timeline, and location. "
        "Be conversational, warm, and ask one question at a time. Max 4-5 questions total."
    )
