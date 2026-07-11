"""Per-org live pilot health for admin operations."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.analysis import AnalysisEngine
from src.models.gbp import GbpInsights
from src.models.lead import Lead, LeadSource, WhatsappConversation
from src.models.org import OnboardingStatus, Org

DEMO_SLUG = "demo-studio"


def _is_demo_org(org: Org) -> bool:
    slug = (org.slug or "").lower()
    name = (org.name or "").lower()
    return DEMO_SLUG in slug or name.startswith("demo ") or "demo account" in name


def _pilot_tier(
    *,
    is_demo: bool,
    gbp_connected: bool,
    whatsapp_connected: bool,
    has_gbp_data: bool,
    leads_30d: int,
    sync_stale: bool,
) -> str:
    if is_demo:
        return "demo"
    if gbp_connected and whatsapp_connected and has_gbp_data and leads_30d > 0 and not sync_stale:
        return "live"
    if gbp_connected or whatsapp_connected or leads_30d > 0:
        return "partial"
    return "setup"


def _recommended_actions(
    *,
    gbp_connected: bool,
    whatsapp_connected: bool,
    sync_stale: bool,
    has_gbp_data: bool,
    leads_30d: int,
    onboarding_status: OnboardingStatus,
) -> list[str]:
    actions: list[str] = []
    if onboarding_status not in (OnboardingStatus.ACTIVE, OnboardingStatus.ONBOARDING_COMPLETE):
        actions.append("Complete client onboarding")
    if not gbp_connected:
        actions.append("Connect Google Business Profile")
    elif sync_stale or not has_gbp_data:
        actions.append("Run GBP sync for live metrics")
    if not whatsapp_connected:
        actions.append("Connect WhatsApp Business number + webhook")
    elif leads_30d == 0:
        actions.append("Send test WhatsApp message to verify lead capture")
    if gbp_connected and whatsapp_connected and has_gbp_data and leads_30d > 0:
        actions.append("Pilot is live — review insights weekly")
    return actions


class PilotStatusService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.analysis = AnalysisEngine(session)

    async def build_all(self, period_days: int = 30) -> dict[str, Any]:
        now = datetime.utcnow()
        since = now - timedelta(days=period_days)
        sync_stale_cutoff = now - timedelta(days=7)

        orgs = (await self.session.execute(select(Org).order_by(Org.created_at.desc()))).scalars().all()

        rows: list[dict[str, Any]] = []
        summary = {"live": 0, "partial": 0, "setup": 0, "demo": 0, "needs_sync": 0}

        for org in orgs:
            row = await self._build_org_row(org, since, sync_stale_cutoff, period_days)
            rows.append(row)
            tier = row["pilot_status"]
            if tier in summary:
                summary[tier] += 1
            if row["gbp"]["connected"] and row["gbp"]["sync_stale"]:
                summary["needs_sync"] += 1

        return {
            "generated_at": now.isoformat(),
            "period_days": period_days,
            "summary": {
                "total_orgs": len(orgs),
                **summary,
            },
            "orgs": rows,
        }

    async def _build_org_row(
        self,
        org: Org,
        since: datetime,
        sync_stale_cutoff: datetime,
        period_days: int,
    ) -> dict[str, Any]:
        is_demo = _is_demo_org(org)
        gbp_connected = bool(org.gbp_place_id)
        whatsapp_connected = bool(org.whatsapp_number and org.whatsapp_verified)

        leads_30d = (
            await self.session.execute(
                select(func.count())
                .select_from(Lead)
                .where(and_(Lead.org_id == org.id, Lead.created_at >= since))
            )
        ).scalar() or 0

        wa_leads_30d = (
            await self.session.execute(
                select(func.count())
                .select_from(Lead)
                .where(
                    and_(
                        Lead.org_id == org.id,
                        Lead.created_at >= since,
                        Lead.source == LeadSource.WHATSAPP,
                    )
                )
            )
        ).scalar() or 0

        conversations_30d = (
            await self.session.execute(
                select(func.count())
                .select_from(WhatsappConversation)
                .where(
                    and_(
                        WhatsappConversation.org_id == org.id,
                        WhatsappConversation.created_at >= since,
                    )
                )
            )
        ).scalar() or 0

        latest_insights = (
            await self.session.execute(
                select(GbpInsights)
                .where(GbpInsights.org_id == org.id)
                .order_by(GbpInsights.recorded_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        has_gbp_data = latest_insights is not None and latest_insights.total_views > 0
        sync_stale = (
            gbp_connected
            and (
                org.gbp_last_synced_at is None
                or org.gbp_last_synced_at < sync_stale_cutoff
            )
        )

        analytics_score: float | None = None
        try:
            analysis = await self.analysis.analyze(org.id, period_days=period_days)
            analytics_score = analysis.scores.get("overall")
        except ValueError:
            pass

        issues: list[str] = []
        if not gbp_connected:
            issues.append("GBP not connected")
        if gbp_connected and sync_stale:
            issues.append("GBP sync overdue (>7 days)")
        if gbp_connected and not has_gbp_data:
            issues.append("No GBP insights in database")
        if not whatsapp_connected:
            issues.append("WhatsApp not verified")
        if whatsapp_connected and leads_30d == 0:
            issues.append("No leads in last 30 days")
        if conversations_30d == 0 and whatsapp_connected:
            issues.append("No WhatsApp messages stored")

        pilot_status = _pilot_tier(
            is_demo=is_demo,
            gbp_connected=gbp_connected,
            whatsapp_connected=whatsapp_connected,
            has_gbp_data=has_gbp_data,
            leads_30d=leads_30d,
            sync_stale=sync_stale,
        )

        return {
            "org_id": org.id,
            "name": org.name,
            "slug": org.slug,
            "city": org.city,
            "plan": org.plan.value if hasattr(org.plan, "value") else str(org.plan),
            "onboarding_status": org.onboarding_status.value,
            "is_demo": is_demo,
            "pilot_status": pilot_status,
            "gbp": {
                "connected": gbp_connected,
                "place_id": org.gbp_place_id,
                "name": org.gbp_name,
                "last_synced_at": (
                    org.gbp_last_synced_at.isoformat() if org.gbp_last_synced_at else None
                ),
                "sync_stale": sync_stale,
                "total_views": latest_insights.total_views if latest_insights else 0,
                "calls": latest_insights.calls if latest_insights else 0,
                "website_clicks": latest_insights.website_clicks if latest_insights else 0,
            },
            "whatsapp": {
                "connected": whatsapp_connected,
                "number": org.whatsapp_number,
            },
            "activity": {
                "leads_30d": leads_30d,
                "whatsapp_leads_30d": wa_leads_30d,
                "conversations_30d": conversations_30d,
            },
            "analytics": {
                "health_score": analytics_score,
            },
            "issues": issues,
            "recommended_actions": _recommended_actions(
                gbp_connected=gbp_connected,
                whatsapp_connected=whatsapp_connected,
                sync_stale=sync_stale,
                has_gbp_data=has_gbp_data,
                leads_30d=leads_30d,
                onboarding_status=org.onboarding_status,
            ),
        }
