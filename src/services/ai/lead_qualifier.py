"""AI Lead Qualification Engine — vertical-aware conversational WhatsApp agent."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.core.config import get_settings
from src.integrations.anthropic import AnthropicConnector
from src.models.lead import (
    BudgetRange,
    Lead,
    LeadScope,
    LeadStatus,
    WhatsappConversation,
)
from src.models.org import Org
from src.services.verticals import get_vertical
from src.services.verticals.packs import interior_design

logger = structlog.get_logger(__name__)

# Backward compatibility for interior design tests/imports
QUALIFICATION_FLOW = interior_design.QUALIFICATION_FLOW

_ANALYSIS_JSON_SUFFIX = """
Extract entities relevant to the business (intent, scope, property_type, budget_range,
timeline, location_area, sentiment, is_spam). Use "unknown" when not present.

Respond in JSON only with keys:
intent, scope, property_type, property_size_sqft, budget_range, timeline,
location_area, sentiment, is_spam, should_ask_next_question, next_question_key
"""


class LeadQualifier:
    """Vertical-aware lead qualification engine with LLM replies."""

    def __init__(self, api_key: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.anthropic_api_key
        self.settings = settings
        self._llm = AnthropicConnector()

    async def process_message(
        self,
        message_text: str,
        lead: Lead,
        org: Org,
        db: AsyncSession,
    ) -> dict[str, Any]:
        history = await self._get_conversation_history(lead.id, db)

        analysis = await self._analyze_message(
            message_text=message_text,
            lead=lead,
            org=org,
            history=history,
        )

        lead_updated = self._update_lead_from_analysis(lead, analysis)
        qualification_state = self._get_qualification_state(lead, org)

        reply = await self._generate_reply(
            message_text=message_text,
            lead=lead,
            analysis=analysis,
            qualification_state=qualification_state,
            org=org,
            history=history,
        )

        if lead_updated or not lead.ai_summary:
            lead.ai_summary = await self._generate_lead_summary(lead, org)

        lead.ai_qualification_score = self._calculate_qualification_score(lead, org)
        lead.last_contact_at = datetime.utcnow()
        db.add(lead)

        notify_designer = (
            lead.status == LeadStatus.NEW
            and lead.ai_qualification_score is not None
            and lead.ai_qualification_score >= 0.5
        )

        return {
            "reply": reply,
            "intent": analysis.get("intent", "unknown"),
            "extracted_entities": analysis,
            "lead_updated": lead_updated,
            "qualification_complete": qualification_state == "complete",
            "notify_designer": notify_designer,
            "qualification_score": lead.ai_qualification_score,
            "qualification_state": qualification_state,
        }

    async def _analyze_message(
        self,
        message_text: str,
        lead: Lead,
        org: Org,
        history: list[dict],
    ) -> dict[str, Any]:
        vertical = get_vertical(org.category.value)
        system_prompt = (
            vertical.whatsapp_system_prompt(org.name, org.city or "Bangalore")
            + _ANALYSIS_JSON_SUFFIX
        )

        lead_context = f"""
Current lead data:
- Scope: {lead.scope.value if lead.scope else 'unknown'}
- Budget: {lead.budget_range.value if lead.budget_range else 'unknown'}
- Timeline: {lead.timeline or 'unknown'}
- Location: {lead.location_area or 'unknown'}
- Property/Item: {lead.property_type or 'unknown'}
"""

        history_text = ""
        for msg in history[-10:]:
            direction = "Lead" if msg["direction"] == "inbound" else "AI"
            history_text += f"{direction}: {msg['text']}\n"

        user_message = f"""{lead_context}

Recent conversation:
{history_text}

New message: "{message_text}"

Respond with JSON only."""

        if not self.api_key:
            return self._fallback_analysis(lead, org)

        try:
            content = await self._llm.complete(system_prompt, user_message, max_tokens=500)
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                content = content.rsplit("\n```", 1)[0]
            return json.loads(content)
        except (json.JSONDecodeError, Exception) as e:
            logger.error("ai_analysis_failed", error=str(e), message=message_text[:100])
            return self._fallback_analysis(lead, org)

    def _fallback_analysis(self, lead: Lead, org: Org) -> dict[str, Any]:
        return {
            "intent": "inquiry",
            "scope": "unknown",
            "budget_range": "unknown",
            "should_ask_next_question": True,
            "next_question_key": self._get_qualification_state(lead, org),
        }

    def _update_lead_from_analysis(
        self,
        lead: Lead,
        analysis: dict[str, Any],
    ) -> bool:
        updated = False

        scope_str = analysis.get("scope", "unknown")
        if scope_str != "unknown" and lead.scope == LeadScope.UNKNOWN:
            try:
                lead.scope = LeadScope(scope_str)
                updated = True
            except ValueError:
                pass

        budget_str = analysis.get("budget_range", "unknown")
        if budget_str != "unknown" and lead.budget_range == BudgetRange.UNKNOWN:
            try:
                lead.budget_range = BudgetRange(budget_str)
                updated = True
            except ValueError:
                pass

        timeline = analysis.get("timeline")
        if timeline and not lead.timeline:
            lead.timeline = timeline
            updated = True

        location = analysis.get("location_area")
        if location and not lead.location_area:
            lead.location_area = location
            updated = True

        prop_type = analysis.get("property_type")
        if prop_type and prop_type != "unknown" and not lead.property_type:
            lead.property_type = str(prop_type)
            updated = True

        prop_size = analysis.get("property_size_sqft")
        if prop_size and not lead.property_size_sqft:
            try:
                lead.property_size_sqft = int(prop_size)
                updated = True
            except (ValueError, TypeError):
                pass

        lead.ai_extracted_data = analysis

        if lead.status == LeadStatus.NEW and updated:
            lead.status = LeadStatus.CONTACTED
            lead.status_changed_at = datetime.utcnow()

        return updated

    def _get_qualification_state(self, lead: Lead, org: Org) -> str:
        vertical = get_vertical(org.category.value)
        flow = vertical.qualification_flow
        current = flow.get("greeting", {}).get("next")
        while current and current != "complete":
            state_cfg = flow.get(current, {})
            if not self._state_fields_satisfied(lead, state_cfg.get("extract", [])):
                return current
            current = state_cfg.get("next")
        return "complete"

    def _state_fields_satisfied(self, lead: Lead, fields: list[str]) -> bool:
        for field in fields:
            if field == "scope" and lead.scope == LeadScope.UNKNOWN:
                return False
            if field == "property_type" and not lead.property_type:
                return False
            if field == "property_size_sqft" and not lead.property_size_sqft:
                return False
            if field == "budget_range" and lead.budget_range == BudgetRange.UNKNOWN:
                return False
            if field == "timeline" and not lead.timeline:
                return False
            if field == "location_area" and not lead.location_area:
                return False
        return True

    def _determine_next_question(self, lead: Lead, org: Org) -> str:
        return self._get_qualification_state(lead, org)

    async def _generate_reply(
        self,
        message_text: str,
        lead: Lead,
        analysis: dict[str, Any],
        qualification_state: str,
        org: Org,
        history: list[dict],
    ) -> str:
        vertical = get_vertical(org.category.value)
        flow = vertical.qualification_flow

        if qualification_state == "complete":
            return (
                f"Thanks for sharing all the details! 🙏\n\n"
                f"Our team will review your request and call you within 2 hours. "
                f"Feel free to share any reference photos here!\n\n"
                f"— {org.name}"
            )

        next_question = flow.get(qualification_state, {}).get("question")
        if not next_question:
            return f"Thanks for the info! Our team will reach out shortly. 🙏"

        if self.api_key:
            try:
                system = vertical.whatsapp_system_prompt(org.name, org.city or "Bangalore")
                history_text = ""
                for msg in history[-10:]:
                    role = "Customer" if msg["direction"] == "inbound" else "Assistant"
                    history_text += f"{role}: {msg['text']}\n"
                user_msg = (
                    f"Conversation so far:\n{history_text}\n"
                    f"Customer just said: \"{message_text}\"\n\n"
                    f"Reply in WhatsApp style (short, warm). "
                    f"If needed, ask: {next_question}"
                )
                reply = await self._llm.complete(system, user_msg, max_tokens=300)
                if reply and reply.strip():
                    return reply.strip()
            except Exception as e:
                logger.warning("llm_reply_failed", error=str(e))

        first_state = flow.get("greeting", {}).get("next")
        if qualification_state == first_state and not self._state_fields_satisfied(
            lead, flow.get(first_state, {}).get("extract", [])
        ):
            return (
                f"Hi! Thanks for reaching out to {org.name}! 😊\n\n"
                f"{next_question}"
            )

        return next_question

    async def _generate_lead_summary(self, lead: Lead, org: Org) -> str:
        parts = []
        vertical = get_vertical(org.category.value)

        if lead.scope and lead.scope != LeadScope.UNKNOWN:
            label = "Occasion" if org.category.value == "bakery" else "Scope"
            parts.append(f"{label}: {lead.scope.value.replace('_', ' ').title()}")

        if lead.property_type:
            label = "Item" if org.category.value == "bakery" else "Property"
            parts.append(f"{label}: {lead.property_type}")

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
            parts.append(f"Date/Timeline: {lead.timeline}")

        if lead.location_area:
            parts.append(f"Area: {lead.location_area}")

        if not parts:
            return f"New {vertical.display_name.lower()} lead — qualification in progress"
        return " | ".join(parts)

    def _calculate_qualification_score(self, lead: Lead, org: Org) -> float:
        vertical = get_vertical(org.category.value)
        flow = vertical.qualification_flow
        states = []
        current = flow.get("greeting", {}).get("next")
        while current and current != "complete":
            states.append(current)
            current = flow.get(current, {}).get("next")

        if not states:
            return 0.0

        filled = sum(
            1 for state in states
            if self._state_fields_satisfied(lead, flow.get(state, {}).get("extract", []))
        )
        return round(filled / len(states), 2)

    async def _get_conversation_history(
        self,
        lead_id: str,
        db: AsyncSession,
    ) -> list[dict[str, str]]:
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


# Alias for plan naming
VerticalLeadAgent = LeadQualifier
