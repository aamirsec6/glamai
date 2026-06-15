"""Pre-approved WhatsApp message templates for dental clinics."""

from __future__ import annotations


def get_lead_notification_message(
    lead_name: str,
    lead_phone: str,
    summary: str,
    budget: str,
    location: str,
) -> str:
    return (
        f"🆕 *New Lead!*\n\n"
        f"👤 {lead_name}\n"
        f"📱 {lead_phone}\n"
        f"📍 {location}\n"
        f"💰 Budget: {budget}\n\n"
        f"📝 Summary:\n{summary}\n\n"
        f"Reply to this message to update lead status."
    )


def get_lead_welcome_message(business_name: str) -> str:
    return (
        f"Hi! Thanks for contacting *{business_name}*! 🦷\n\n"
        f"We're here to help with your dental needs.\n\n"
        f"A few quick questions:\n"
        f"1. What dental service are you looking for?\n"
        f"2. Any specific concern or pain?\n"
        f"3. Preferred area?\n"
        f"4. When would you like to visit?"
    )


def get_lead_followup_message(business_name: str) -> str:
    return (
        f"Hi! Just checking in from *{business_name}* 👋\n\n"
        f"We'd love to help with your dental needs. "
        f"When would be a good time for a quick call?"
    )


def get_report_delivery_message(business_name: str, month: str, year: int) -> str:
    return (
        f"📊 *Your {month} {year} Marketing Report is here!*\n\n"
        f"Check out how {business_name} performed this month.\n\n"
        f"Full report attached as PDF. Questions? Just reply!"
    )


def get_onboarding_welcome_message(business_name: str) -> str:
    return (
        f"Welcome to *GlamAI*! 🎉\n\n"
        f"We've started optimizing *{business_name}* on Google and WhatsApp.\n\n"
        f"1️⃣ GBP optimized within 48 hours\n"
        f"2️⃣ WhatsApp AI qualifies leads 24/7\n"
        f"3️⃣ First report at month-end"
    )


def get_repeat_sale_message(business_name: str, customer_name: str) -> str:
    return (
        f"Hi {customer_name}! 👋\n\n"
        f"It's been a while since your last visit to *{business_name}*.\n\n"
        f"We have new dental packages and seasonal offers — "
        f"would you like a free consultation?\n\n"
        f"Reply YES and we'll call you back."
    )


def get_offer_message(business_name: str, customer_name: str, offer_text: str) -> str:
    return (
        f"Hi {customer_name}! 🎉\n\n"
        f"*{business_name}* has {offer_text}.\n\n"
        f"Limited slots available this month. Reply INTERESTED to book."
    )


def get_stale_lead_reminder_message(business_name: str, customer_name: str) -> str:
    return (
        f"Hi {customer_name}! 👋\n\n"
        f"You reached out to *{business_name}* recently. "
        f"We're still here to help with your dental needs.\n\n"
        f"Reply with a good time to call, or share any updates."
    )


def get_review_request_message(
    business_name: str,
    customer_name: str,
    review_link: str | None = None,
) -> str:
    link_line = f"\n\nLeave a review here: {review_link}" if review_link else ""
    return (
        f"Hi {customer_name}! ⭐\n\n"
        f"Thank you for choosing *{business_name}*! "
        f"We hope you had a great experience.\n\n"
        f"A quick Google review helps other patients find us."
        f"{link_line}\n\n"
        f"It only takes 30 seconds — we really appreciate it!"
    )


TEMPLATE_DEFINITIONS = [
    {
        "name": "new_lead_notification",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "🆕 New Lead from GlamAI!\n\nName: {{1}}\nPhone: {{2}}\nLocation: {{3}}\nBudget: {{4}}\n\nSummary: {{5}}",
            },
        ],
    },
    {
        "name": "review_request",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hi {{1}}! Thank you for choosing {{2}}. Could you leave us a quick Google review? {{3}}",
            },
        ],
    },
    {
        "name": "repeat_sale_offer",
        "language": "en",
        "category": "MARKETING",
        "components": [
            {
                "type": "BODY",
                "text": "Hi {{1}}! {{2}} has a special offer for returning patients. Reply YES to learn more.",
            },
        ],
    },
]
