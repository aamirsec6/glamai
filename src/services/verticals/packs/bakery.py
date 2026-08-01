"""Bakery vertical pack."""

from __future__ import annotations

from src.services.verticals._base import format_keywords

CATEGORY = "bakery"
PLACES_TYPES = ["bakery"]
DISPLAY_NAME = "Bakery"

KEYWORD_TEMPLATES = [
    "bakery near me",
    "bakery in {city}",
    "best bakery {city}",
    "birthday cake {city}",
    "custom cake {area}",
    "wedding cake {city}",
    "sourdough bread {city}",
    "pastries {area}",
    "eggless cake {city}",
    "same day cake delivery {area}",
    "artisan bakery {city}",
    "fresh bread {area}",
]

SEO_GAP_TEMPLATES = [
    "bakery near me",
    "birthday cake {city}",
    "custom cake {area}",
    "best bakery {city}",
    "sourdough bread {city}",
]

POST_TEMPLATES = {
    "daily_special": {
        "description": "Today's fresh bake or special item",
        "example": "Fresh out of the oven: sourdough loaves and almond croissants! Visit us today.",
    },
    "festival_cake": {
        "description": "Festival or seasonal cake promotion",
        "example": "Order your Diwali mithai box and custom celebration cakes — pre-book now!",
    },
    "behind_scenes": {
        "description": "Behind the scenes baking",
        "example": "5am start — hand-kneading dough for today's batch. Real ingredients, no shortcuts.",
    },
    "testimonial": {
        "description": "Customer review highlight",
        "example": "Best birthday cake we've ever had! — Happy customer in {area}",
    },
    "offer_promotion": {
        "description": "Limited offer",
        "example": "Weekend offer: 10% off custom cakes for orders placed by Friday!",
    },
    "new_product": {
        "description": "New menu item launch",
        "example": "NEW: Red velvet cupcakes and custom photo cakes now available!",
    },
}

MONTHLY_POST_TYPES = [
    "daily_special",
    "festival_cake",
    "testimonial",
    "behind_scenes",
]

QUALIFICATION_FLOW = {
    "greeting": {"question": None, "next": "occasion", "extract": []},
    "occasion": {
        "question": "What are you looking for? (e.g., birthday cake, wedding cake, daily bread, pastries)",
        "next": "item",
        "extract": ["scope"],
    },
    "item": {
        "question": "Any preferences? (flavor, size, eggless, design theme)",
        "next": "date",
        "extract": ["property_type"],
    },
    "date": {
        "question": "When do you need it? (pickup or delivery date)",
        "next": "location",
        "extract": ["timeline"],
    },
    "location": {
        "question": "Which area are you in? (for delivery or nearest outlet)",
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
        f"a bakery in {city}, India. "
        "Write mouth-watering, local posts (100-250 words) about cakes, bread, and pastries. "
        "Respond in JSON with content, title, hashtags, call_to_action."
    )


def whatsapp_system_prompt(org_name: str, city: str) -> str:
    return (
        f"You are a friendly WhatsApp assistant for {org_name}, a bakery in {city}. "
        "Help customers inquire about cakes, breads, and pastries. "
        "Learn occasion, item preferences, date needed, and delivery area. "
        "Be warm and helpful. One question at a time. Do not process payments in chat."
    )
