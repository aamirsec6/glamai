"""Tenant analysis from stored data (no external API calls)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import GbpCompetitor, GbpInsights, GbpPost, GbpPostStatus, GbpRanking
from src.models.lead import Lead, LeadStatus
from src.models.org import Org
from src.models.territory import Territory, TerritoryStatus

logger = structlog.get_logger(__name__)


@dataclass
class TenantSnapshot:
    org_id: str
    org_name: str
    period_days: int = 30
    leads_total: int = 0
    leads_by_status: dict[str, int] = field(default_factory=dict)
    leads_won_value_inr: int = 0
    gbp_search_views: int = 0
    gbp_maps_views: int = 0
    gbp_total_views: int = 0
    gbp_website_clicks: int = 0
    gbp_calls: int = 0
    gbp_direction_requests: int = 0
    gbp_review_count: int | None = None
    gbp_avg_rating: float | None = None
    posts_published: int = 0
    posts_draft: int = 0
    posts_scheduled: int = 0
    competitor_count: int = 0
    rankings_tracked: int = 0
    territory_active: bool = False
    gbp_connected: bool = False
    last_synced_at: str | None = None


@dataclass
class TenantAnalysis:
    snapshot: TenantSnapshot
    scores: dict[str, float] = field(default_factory=dict)
    trends: dict[str, Any] = field(default_factory=dict)
    anomalies: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    guarantee_progress: dict[str, Any] = field(default_factory=dict)
    narrative: str | None = None


class AnalysisEngine:
    """Reads DB only — builds tenant intelligence."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def build_snapshot(self, org_id: str, period_days: int = 30) -> TenantSnapshot:
        org = await self.session.get(Org, org_id)
        if not org:
            raise ValueError("org_not_found")

        since = datetime.utcnow() - timedelta(days=period_days)
        snap = TenantSnapshot(
            org_id=org_id,
            org_name=org.name,
            period_days=period_days,
            gbp_connected=bool(org.gbp_place_id),
            last_synced_at=(
                org.gbp_last_synced_at.isoformat() if org.gbp_last_synced_at else None
            ),
        )

        # Leads
        lead_stmt = select(Lead).where(
            and_(Lead.org_id == org_id, Lead.created_at >= since)
        )
        leads = (await self.session.execute(lead_stmt)).scalars().all()
        snap.leads_total = len(leads)
        for lead in leads:
            status = lead.status.value if hasattr(lead.status, "value") else str(lead.status)
            snap.leads_by_status[status] = snap.leads_by_status.get(status, 0) + 1
            if lead.status == LeadStatus.WON and lead.won_value_paise:
                snap.leads_won_value_inr += lead.won_value_paise // 100

        # Latest insights
        ins_stmt = (
            select(GbpInsights)
            .where(GbpInsights.org_id == org_id)
            .order_by(GbpInsights.recorded_at.desc())
            .limit(1)
        )
        insights = (await self.session.execute(ins_stmt)).scalar_one_or_none()
        if insights:
            snap.gbp_search_views = insights.search_views
            snap.gbp_maps_views = insights.maps_views
            snap.gbp_total_views = insights.total_views
            snap.gbp_website_clicks = insights.website_clicks
            snap.gbp_calls = insights.calls
            snap.gbp_direction_requests = insights.direction_requests
            snap.gbp_review_count = insights.review_count
            snap.gbp_avg_rating = insights.avg_rating

        # Posts
        for status, attr in [
            (GbpPostStatus.PUBLISHED, "posts_published"),
            (GbpPostStatus.DRAFT, "posts_draft"),
            (GbpPostStatus.SCHEDULED, "posts_scheduled"),
        ]:
            cnt_stmt = select(func.count()).select_from(GbpPost).where(
                and_(GbpPost.org_id == org_id, GbpPost.status == status)
            )
            setattr(snap, attr, (await self.session.execute(cnt_stmt)).scalar() or 0)

        # Competitors
        comp_stmt = select(func.count()).select_from(GbpCompetitor).where(
            GbpCompetitor.org_id == org_id
        )
        snap.competitor_count = (await self.session.execute(comp_stmt)).scalar() or 0

        # Rankings
        rank_stmt = select(func.count()).select_from(GbpRanking).where(
            GbpRanking.org_id == org_id
        )
        snap.rankings_tracked = (await self.session.execute(rank_stmt)).scalar() or 0

        # Territory
        terr_stmt = select(Territory).where(
            and_(Territory.org_id == org_id, Territory.status == TerritoryStatus.ACTIVE)
        )
        snap.territory_active = (
            await self.session.execute(terr_stmt)
        ).scalar_one_or_none() is not None

        return snap

    async def analyze(self, org_id: str, period_days: int = 30) -> TenantAnalysis:
        org = await self.session.get(Org, org_id)
        if not org:
            raise ValueError("org_not_found")

        snapshot = await self.build_snapshot(org_id, period_days)
        analysis = TenantAnalysis(snapshot=snapshot)

        # Scores 0-100
        lead_score = min(100, snapshot.leads_total * 10)
        gbp_score = min(100, snapshot.gbp_total_views / 10) if snapshot.gbp_total_views else 0
        post_score = min(100, snapshot.posts_published * 20)
        analysis.scores = {
            "lead_generation": round(lead_score, 1),
            "gbp_visibility": round(gbp_score, 1),
            "content_cadence": round(post_score, 1),
            "overall": round((lead_score + gbp_score + post_score) / 3, 1),
        }

        # Trends — compare two latest insight periods
        ins_stmt = (
            select(GbpInsights)
            .where(GbpInsights.org_id == org_id)
            .order_by(GbpInsights.recorded_at.desc())
            .limit(2)
        )
        recent_insights = (await self.session.execute(ins_stmt)).scalars().all()
        if len(recent_insights) >= 2:
            curr, prev = recent_insights[0], recent_insights[1]
            if prev.total_views:
                delta_pct = ((curr.total_views - prev.total_views) / prev.total_views) * 100
                analysis.trends["views_change_pct"] = round(delta_pct, 1)

        # Anomalies
        if snapshot.gbp_connected and not snapshot.last_synced_at:
            analysis.anomalies.append("GBP connected but never synced")
        if snapshot.gbp_connected:
            stale = org.gbp_last_synced_at and (
                datetime.utcnow() - org.gbp_last_synced_at > timedelta(days=3)
            )
            if stale:
                analysis.anomalies.append("GBP data stale (>3 days since sync)")
        if snapshot.posts_draft > 0 and snapshot.posts_published == 0:
            analysis.anomalies.append("Draft posts exist but none published yet")
        if snapshot.gbp_total_views == 0 and snapshot.gbp_connected:
            analysis.anomalies.append("Zero GBP views in latest sync")

        # Recommendations
        if not snapshot.gbp_connected:
            analysis.recommendations.append("Connect Google Business Profile via onboarding")
        if snapshot.posts_draft >= 2:
            analysis.recommendations.append("Publish or schedule draft GBP posts")
        if snapshot.competitor_count == 0 and org.latitude:
            analysis.recommendations.append("Run competitor sync to benchmark local market")
        if snapshot.leads_total == 0:
            analysis.recommendations.append("Drive inbound leads via GBP and local SEO")

        from src.core.config import get_settings
        from src.models.org import PlanTier

        settings = get_settings()
        leads_target = {
            PlanTier.STARTER: settings.guarantee_leads_target_starter,
            PlanTier.GROWTH: settings.guarantee_leads_target_growth,
            PlanTier.ENTERPRISE: settings.guarantee_leads_target_enterprise,
        }.get(org.plan, settings.guarantee_leads_target_growth)

        analysis.guarantee_progress = {
            "leads_generated": snapshot.leads_total,
            "leads_target": leads_target,
            "posts_delivered": org.guarantee_gbp_posts_delivered,
            "posts_target": settings.guarantee_gbp_posts_per_month,
        }

        logger.info("tenant_analyzed", org_id=org_id, overall=analysis.scores.get("overall"))
        return analysis
