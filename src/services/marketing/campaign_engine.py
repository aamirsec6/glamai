"""WhatsApp marketing campaign engine — repeat sales, offers, reminders."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.integrations.registry import ConnectorRegistry
from src.integrations.base import ConnectorResource
from src.models.campaign import (
    CampaignRecipient,
    CampaignStatus,
    CampaignType,
    MarketingCampaign,
    RecipientStatus,
)
from src.models.lead import Lead, LeadStatus
from src.models.notification import NotificationChannel, NotificationLog, NotificationType
from src.models.org import Org
from src.services.whatsapp.templates import (
    get_offer_message,
    get_repeat_sale_message,
    get_stale_lead_reminder_message,
)

logger = structlog.get_logger(__name__)


class CampaignEngine:
    """Build audiences and send outbound WhatsApp marketing messages."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)
        self.settings = get_settings()

    async def close(self) -> None:
        await self.registry.close()

    async def create_campaign(
        self,
        org_id: str,
        name: str,
        campaign_type: CampaignType,
        offer_text: str | None = None,
    ) -> MarketingCampaign:
        campaign = MarketingCampaign(
            org_id=org_id,
            name=name,
            campaign_type=campaign_type,
            offer_text=offer_text,
            status=CampaignStatus.DRAFT,
        )
        self.session.add(campaign)
        await self.session.flush()
        return campaign

    async def build_audience(
        self,
        campaign: MarketingCampaign,
    ) -> list[Lead]:
        org_id = campaign.org_id
        leads: list[Lead] = []

        if campaign.campaign_type == CampaignType.REPEAT_SALE:
            days = self.settings.campaign_repeat_sale_days
            cutoff = datetime.utcnow() - timedelta(days=days)
            stmt = select(Lead).where(
                and_(
                    Lead.org_id == org_id,
                    Lead.status == LeadStatus.WON,
                    Lead.updated_at <= cutoff,
                )
            )
            result = await self.session.execute(stmt)
            leads = list(result.scalars().all())

        elif campaign.campaign_type == CampaignType.STALE_LEAD:
            days = self.settings.campaign_stale_lead_days
            cutoff = datetime.utcnow() - timedelta(days=days)
            stmt = select(Lead).where(
                and_(
                    Lead.org_id == org_id,
                    Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUOTED]),
                    Lead.last_contact_at <= cutoff,
                )
            )
            result = await self.session.execute(stmt)
            leads = list(result.scalars().all())

        elif campaign.campaign_type == CampaignType.OFFER:
            stmt = select(Lead).where(
                and_(
                    Lead.org_id == org_id,
                    Lead.status.in_([LeadStatus.CONTACTED, LeadStatus.QUOTED, LeadStatus.WON]),
                )
            )
            result = await self.session.execute(stmt)
            leads = list(result.scalars().all())

        return leads

    def _message_for_lead(
        self,
        org: Org,
        campaign: MarketingCampaign,
        lead: Lead,
    ) -> str:
        if campaign.campaign_type == CampaignType.REPEAT_SALE:
            return get_repeat_sale_message(org.name, lead.contact_name)
        if campaign.campaign_type == CampaignType.STALE_LEAD:
            return get_stale_lead_reminder_message(org.name, lead.contact_name)
        return get_offer_message(
            org.name,
            lead.contact_name,
            campaign.offer_text or "a special offer on our services",
        )

    async def launch_campaign(self, campaign_id: str) -> dict[str, Any]:
        if not self.settings.feature_reengagement:
            return {"status": "feature_disabled"}

        campaign = await self.session.get(MarketingCampaign, campaign_id)
        if not campaign:
            return {"status": "not_found"}

        org = await self.session.get(Org, campaign.org_id)
        if not org:
            return {"status": "org_not_found"}

        leads = await self.build_audience(campaign)
        campaign.status = CampaignStatus.RUNNING
        campaign.started_at = datetime.utcnow()
        campaign.total_recipients = len(leads)
        self.session.add(campaign)

        wa = self.registry.whatsapp()
        sent = 0
        for lead in leads:
            message = self._message_for_lead(org, campaign, lead)
            recipient = CampaignRecipient(
                campaign_id=campaign.id,
                org_id=org.id,
                lead_id=lead.id,
                phone=lead.contact_phone,
                message_body=message,
            )

            try:
                push = await wa.push(
                    org.id,
                    ConnectorResource.MESSAGE,
                    {"to_phone": lead.contact_phone, "message": message},
                )
                if push.ok:
                    recipient.status = RecipientStatus.SENT
                    recipient.sent_at = datetime.utcnow()
                    sent += 1
                    notif_type = NotificationType.REPEAT_SALE_OFFER
                    if campaign.campaign_type == CampaignType.STALE_LEAD:
                        notif_type = NotificationType.CAMPAIGN_MESSAGE
                    elif campaign.campaign_type == CampaignType.OFFER:
                        notif_type = NotificationType.CAMPAIGN_MESSAGE

                    self.session.add(
                        NotificationLog(
                            org_id=org.id,
                            lead_id=lead.id,
                            channel=NotificationChannel.WHATSAPP,
                            notification_type=notif_type,
                            recipient=lead.contact_phone,
                            body=message,
                            sent=True,
                            sent_at=datetime.utcnow(),
                        )
                    )
                else:
                    recipient.status = RecipientStatus.FAILED
                    recipient.error = push.error
            except Exception as e:
                recipient.status = RecipientStatus.FAILED
                recipient.error = str(e)

            self.session.add(recipient)

        campaign.sent_count = sent
        campaign.status = CampaignStatus.COMPLETED
        campaign.completed_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        self.session.add(campaign)
        await self.session.flush()
        await wa.close()

        logger.info(
            "campaign_launched",
            campaign_id=campaign_id,
            sent=sent,
            total=len(leads),
        )
        return {"status": "ok", "sent": sent, "total": len(leads)}

    async def auto_repeat_sale_for_org(self, org_id: str) -> dict[str, Any]:
        """Create and launch a repeat-sale campaign for won leads."""
        campaign = await self.create_campaign(
            org_id=org_id,
            name=f"Repeat sale — {datetime.utcnow().strftime('%Y-%m-%d')}",
            campaign_type=CampaignType.REPEAT_SALE,
        )
        await self.session.flush()
        return await self.launch_campaign(campaign.id)
