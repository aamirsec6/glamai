"""Pre-approved WhatsApp message templates.

Templates must be registered and approved by WhatsApp/Meta before use.
Each template has a name, language, and variable placeholders.

For MVP, we need these templates:
1. New lead notification (to designer)
2. Lead follow-up
3. Monthly report delivery
4. Onboarding welcome
"""

from __future__ import annotations


def get_lead_notification_message(
    lead_name: str,
    lead_phone: str,
    summary: str,
    budget: str,
    location: str,
) -> str:
    """Generate new lead notification message for the designer.

    This is sent to the interior designer's phone when a new
    qualified lead comes in via WhatsApp.
    """
    return (
        f"🆕 *New Lead!*\n\n"
        f"👤 {lead_name}\n"
        f"📱 {lead_phone}\n"
        f"📍 {location}\n"
        f"💰 Budget: {budget}\n\n"
        f"📝 Summary:\n{summary}\n\n"
        f"Reply to this message to update lead status."
    )


def get_lead_welcome_message(
    business_name: str,
) -> str:
    """Welcome message sent to leads who first message the business."""
    return (
        f"Hi! Thanks for contacting *{business_name}*! 🏠\n\n"
        f"We're excited to help you with your interior design project.\n\n"
        f"A few quick questions to help us understand your needs:\n\n"
        f"1. What type of space is this for? (home/office/kitchen/etc.)\n"
        f"2. What's the approximate size? (e.g., 3BHK, 1200 sqft)\n"
        f"3. What's your budget range?\n"
        f"4. When are you looking to start?\n\n"
        f"Feel free to share any reference photos or ideas!"
    )


def get_lead_followup_message(
    business_name: str,
) -> str:
    """Follow-up message for leads who haven't responded."""
    return (
        f"Hi! Just checking in from *{business_name}* 👋\n\n"
        f"We'd love to help with your project. "
        f"When would be a good time for a quick call?\n\n"
        f"Or simply reply with your preferred time and we'll reach out!"
    )


def get_report_delivery_message(
    business_name: str,
    month: str,
    year: int,
) -> str:
    """Monthly report delivery notification."""
    return (
        f"📊 *Your {month} {year} Marketing Report is here!*\n\n"
        f"Check out how your business performed this month.\n\n"
        f"Full report attached as PDF. "
        f"Questions? Just reply to this message!"
    )


def get_onboarding_welcome_message(
    business_name: str,
) -> str:
    """Welcome message for newly onboarded clients."""
    return (
        f"Welcome to *GlamAI*! 🎉\n\n"
        f"We've just started optimizing your Google Business Profile "
        f"and setting up your WhatsApp lead capture.\n\n"
        f"Here's what happens next:\n"
        f"1️⃣ Your GBP will be optimized within 48 hours\n"
        f"2️⃣ WhatsApp AI will start qualifying leads for you\n"
        f"3️⃣ First monthly report arrives at month-end\n\n"
        f"Questions? Reply anytime!"
    )


# ── Template definitions for WhatsApp Business API ───────────
# These need to be registered in Meta Business Manager

TEMPLATE_DEFINITIONS = [
    {
        "name": "new_lead_notification",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "🆕 New Lead from GlamAI!\n\nName: {{1}}\nPhone: {{2}}\nLocation: {{3}}\nBudget: {{4}}\n\nSummary: {{5}}\n\nReply to update status.",
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {"type": "QUICK_REPLY", "text": "✅ Contacted"},
                    {"type": "QUICK_REPLY", "text": "📋 Quoted"},
                    {"type": "QUICK_REPLY", "text": "🎉 Won"},
                ],
            },
        ],
    },
    {
        "name": "monthly_report_delivery",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "📊 Your {{1}} {{2}} Marketing Report is ready!\n\nCheck the attached PDF for your monthly performance summary.\n\nQuestions? Reply to this message!",
            },
        ],
    },
    {
        "name": "onboarding_welcome",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Welcome to GlamAI! 🎉\n\nWe're setting up your Google Business Profile optimization and WhatsApp lead capture.\n\nHere's what to expect:\n1️⃣ GBP optimized within 48 hours\n2️⃣ WhatsApp AI starts qualifying leads\n3️⃣ First report at month-end\n\nReply anytime for help!",
            },
        ],
    },
    {
        "name": "lead_welcome",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hi! Thanks for contacting {{1}}! 🏠\n\nWe'd love to help with your project. Could you share:\n1. What space is this for?\n2. Approximate size?\n3. Budget range?\n4. When you'd like to start?\n\nFeel free to share reference photos too!",
            },
        ],
    },
]
