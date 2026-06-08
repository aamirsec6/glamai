"""AI Lead Qualification Engine.

This is the core AI component of GlamAI. It processes inbound WhatsApp
messages from leads and:

1. Classifies the intent (inquiry, booking, followup, spam)
2. Extracts key entities (budget, timeline, scope, location)
3. Determines the next qualifying question to ask
4. Generates a human-readable summary for the designer
5. Scores the lead qualification (0.0 to 1.0)

The qualification flow is designed to be conversational — not an
interrogation. Max 4-5 questions, asked one at a time.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import anthropic
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.config import get_settings
from src.models.lead import (
    BudgetRange,
    Lead,
    LeadScope,
    LeadStatus,
    MessageDirection,
    MessageSender,
    WhatsappConversation,
)
from src.models.org import Org

logger = structlog.get_logger(__name__)

# ── Qualification State Machine ──────────────────────────────

QUALIFICATION_FLOW = {
    "greeting": {
        "question": None,  # No question, just acknowledge
        "next": "scope",
        "extract": [],
    },
    "scope": {
        "question": "What type of space is this for? (e.g., full home, kitchen, office, bedroom)",
        "next": "size",
        "extract": ["scope"],
    },
    "size": {
        "question": "What's the approximate size? (e.g., 2BHK, 1200 sqft, 3-bedroom apartment)",
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
    "complete": {
        "question": None,
        "next": None,
        "extract": [],
    },
}


class LeadQualifier:
    """AI-powered lead qualification engine.

    Uses Claude Haiku for cost-effective, fast qualification.
    The flow is designed to extract key information through
    natural conversation — not a form.
    """

    def __init__(self, api_key: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.anthropic_api_key
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

    async def process_message(
        self,
        message_text: str,
        lead: Lead,
        org: Org,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Process an inbound message and determine the AI response.

        This is the main entry point. It:
        1. Analyzes the message with AI
        2. Updates lead data with extracted info
        3. Determines the next qualifying question
        4. Generates the AI reply
        5. Returns the response + metadata

        Returns:
            dict with keys:
                - reply: str — message to send back to lead
                - intent: str — classified intent
                - lead_updated: bool — whether lead data changed
                - qualification_complete: bool — whether all fields extracted
                - notify_designer: bool — whether to alert the designer
        """
        # Get conversation history for context
        history = await self._get_conversation_history(lead.id, db)

        # Analyze the message with AI
        analysis = await self._analyze_message(
            message_text=message_text,
            lead=lead,
            history=history,
        )

        # Update lead with extracted data
        lead_updated = self._update_lead_from_analysis(lead, analysis)

        # Determine qualification state
        qualification_state = self._get_qualification_state(lead)

        # Generate AI reply
        reply = await self._generate_reply(
            message_text=message_text,
            lead=lead,
            analysis=analysis,
            qualification_state=qualification_state,
            org=org,
        )

        # Update lead summary
        if lead_updated or not lead.ai_summary:
            lead.ai_summary = await self._generate_lead_summary(lead)

        # Update qualification score
        lead.ai_qualification_score = self._calculate_qualification_score(lead)

        # Update timestamps
        lead.last_contact_at = datetime.utcnow()
        db.add(lead)

        # Determine if designer should be notified
        notify_designer = (
            lead.status == LeadStatus.NEW
            and lead.ai_qualification_score is not None
            and lead.ai_qualification_score >= 0.5
        )

        return {
            "reply": reply,
            "intent": analysis.get("intent", "unknown"),
            "lead_updated": lead_updated,
            "qualification_complete": qualification_state == "complete",
            "notify_designer": notify_designer,
            "qualification_score": lead.ai_qualification_score,
        }

    async def _analyze_message(
        self,
        message_text: str,
        lead: Lead,
        history: list[dict],
    ) -> dict[str, Any]:
        """Use AI to analyze the inbound message and extract entities.

        Uses Claude Haiku for speed and cost efficiency.
        """
        system_prompt = """You are an AI assistant for an interior design business in India.
Your job is to analyze WhatsApp messages from potential customers and extract key information.

Extract the following entities from the message:
- intent: inquiry | booking | followup | question | spam | other
- scope: full_home | office | kitchen | bedroom | living_room | bathroom | commercial | renovation | unknown
- property_type: 1BHK | 2BHK | 3BHK | 4BHK | Villa | Penthouse | Office | Shop | unknown
- property_size_sqft: number or null
- budget_range: under_3l | 3l_5l | 5l_10l | 10l_20l | 20l_50l | above_50l | unknown
- timeline: text description (e.g., "3 months", "before Diwali", "ASAP")
- location_area: area/neighborhood name
- sentiment: positive | neutral | negative
- is_spam: boolean

Also determine:
- should_ask_next_question: boolean (whether to continue qualification)
- next_question_key: which question to ask next (scope, size, budget, timeline, location)

Respond in JSON format only. No other text."""

        # Build context from lead data
        lead_context = f"""
Current lead data:
- Scope: {lead.scope.value if lead.scope else 'unknown'}
- Budget: {lead.budget_range.value if lead.budget_range else 'unknown'}
- Timeline: {lead.timeline or 'unknown'}
- Location: {lead.location_area or 'unknown'}
- Property: {lead.property_type or 'unknown'}
"""

        # Build conversation history (last 6 messages)
        history_text = ""
        for msg in history[-6:]:
            direction = "Lead" if msg["direction"] == "inbound" else "AI"
            history_text += f"{direction}: {msg['text']}\n"

        user_message = f"""Analyze this WhatsApp message from a potential interior design customer:

{lead_context}

Recent conversation:
{history_text}

New message: "{message_text}"

Respond with JSON only."""

        try:
            response = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=500,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            # Parse JSON from response
            content = response.content[0].text.strip()
            # Handle potential markdown code blocks
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                content = content.rsplit("\n```", 1)[0]

            analysis = json.loads(content)
            return analysis

        except (json.JSONDecodeError, Exception) as e:
            logger.error("ai_analysis_failed", error=str(e), message=message_text[:100])
            return {
                "intent": "inquiry",
                "scope": "unknown",
                "budget_range": "unknown",
                "should_ask_next_question": True,
                "next_question_key": self._determine_next_question(lead),
            }

    def _update_lead_from_analysis(
        self,
        lead: Lead,
        analysis: dict[str, Any],
    ) -> bool:
        """Update lead model with extracted AI data. Returns True if updated."""
        updated = False

        # Update scope
        scope_str = analysis.get("scope", "unknown")
        if scope_str != "unknown" and lead.scope == LeadScope.UNKNOWN:
            try:
                lead.scope = LeadScope(scope_str)
                updated = True
            except ValueError:
                pass

        # Update budget
        budget_str = analysis.get("budget_range", "unknown")
        if budget_str != "unknown" and lead.budget_range == BudgetRange.UNKNOWN:
            try:
                lead.budget_range = BudgetRange(budget_str)
                updated = True
            except ValueError:
                pass

        # Update timeline
        timeline = analysis.get("timeline")
        if timeline and not lead.timeline:
            lead.timeline = timeline
            updated = True

        # Update location
        location = analysis.get("location_area")
        if location and not lead.location_area:
            lead.location_area = location
            updated = True

        # Update property type
        prop_type = analysis.get("property_type")
        if prop_type and prop_type != "unknown" and not lead.property_type:
            lead.property_type = prop_type
            updated = True

        # Update property size
        prop_size = analysis.get("property_size_sqft")
        if prop_size and not lead.property_size_sqft:
            try:
                lead.property_size_sqft = int(prop_size)
                updated = True
            except (ValueError, TypeError):
                pass

        # Store extracted data
        lead.ai_extracted_data = json.dumps(analysis)

        # Update status from NEW to CONTACTED
        if lead.status == LeadStatus.NEW and updated:
            lead.status = LeadStatus.CONTACTED
            lead.status_changed_at = datetime.utcnow()

        return updated

    def _get_qualification_state(self, lead: Lead) -> str:
        """Determine the current qualification state of a lead."""
        if lead.scope == LeadScope.UNKNOWN:
            return "scope"
        if not lead.property_type:
            return "size"
        if lead.budget_range == BudgetRange.UNKNOWN:
            return "budget"
        if not lead.timeline:
            return "timeline"
        if not lead.location_area:
            return "location"
        return "complete"

    def _determine_next_question(self, lead: Lead) -> str:
        """Determine which question to ask next based on lead state."""
        state = self._get_qualification_state(lead)
        return state

    async def _generate_reply(
        self,
        message_text: str,
        lead: Lead,
        analysis: dict[str, Any],
        qualification_state: str,
        org: Org,
    ) -> str:
        """Generate the AI's reply to the lead.

        The reply should:
        - Acknowledge what the lead said
        - Ask the next qualifying question (if not complete)
        - Be conversational, not robotic
        - Be concise (WhatsApp style)
        """
        # If qualification is complete, send a warm closing message
        if qualification_state == "complete":
            return (
                f"Thanks for sharing all the details! 🙏\n\n"
                f"Our designer will review your requirements and call you "
                f"within 2 hours. If you have any reference photos or ideas, "
                f"feel free to share them here!\n\n"
                f"— {org.name}"
            )

        # Get the next question from the flow
        flow_state = QUALIFICATION_FLOW.get(qualification_state, {})
        next_question = flow_state.get("question")

        if not next_question:
            return (
                f"Thanks for the info! Our designer will reach out to you shortly. 🙏"
            )

        # For the first message, add a greeting
        if self._get_qualification_state(lead) == "scope" and lead.scope == LeadScope.UNKNOWN:
            return (
                f"Hi! Thanks for reaching out to {org.name}! 😊\n\n"
                f"We'd love to help with your project. {next_question}"
            )

        return next_question

    async def _generate_lead_summary(self, lead: Lead) -> str:
        """Generate a human-readable summary of the lead for the designer."""
        parts = []

        if lead.scope and lead.scope != LeadScope.UNKNOWN:
            parts.append(f"Scope: {lead.scope.value.replace('_', ' ').title()}")

        if lead.property_type:
            parts.append(f"Property: {lead.property_type}")

        if lead.budget_range and lead.budget_range != BudgetRange.UNKNOWN:
            budget_map = {
                BudgetRange.UNDER_3L: "Under ₹3L",
                BudgetRange.FROM_3L_5L: "₹3-5L",
                BudgetRange.FROM_5L_10L: "₹5-10L",
                BudgetRange.FROM_10L_20L: "₹10-20L",
                BudgetRange.FROM_20L_50L: "₹20-50L",
                BudgetRange.ABOVE_50L: "₹50L+",
            }
            parts.append(f"Budget: {budget_map.get(lead.budget_range, 'Unknown')}")

        if lead.timeline:
            parts.append(f"Timeline: {lead.timeline}")

        if lead.location_area:
            parts.append(f"Location: {lead.location_area}")

        return " | ".join(parts) if parts else "New lead — qualification in progress"

    def _calculate_qualification_score(self, lead: Lead) -> float:
        """Calculate a 0.0 to 1.0 qualification score.

        Based on how many key fields are filled:
        - scope: 20%
        - budget_range: 30%
        - timeline: 20%
        - location_area: 15%
        - property_type: 15%
        """
        score = 0.0

        if lead.scope != LeadScope.UNKNOWN:
            score += 0.20
        if lead.budget_range != BudgetRange.UNKNOWN:
            score += 0.30
        if lead.timeline:
            score += 0.20
        if lead.location_area:
            score += 0.15
        if lead.property_type:
            score += 0.15

        return round(score, 2)

    async def _get_conversation_history(
        self,
        lead_id: str,
        db: AsyncSession,
    ) -> list[dict[str, str]]:
        """Get recent conversation history for context."""
        stmt = (
            select(WhatsappConversation)
            .where(WhatsappConversation.lead_id == lead_id)
            .order_by(WhatsappConversation.sent_at.desc())
            .limit(10)
        )
        result = await db.execute(stmt)
        conversations = result.scalars().all()

        history = []
        for conv in reversed(conversations):
            history.append({
                "direction": conv.direction.value,
                "text": conv.message_text or "",
                "sender": conv.sender.value,
            })

        return history
