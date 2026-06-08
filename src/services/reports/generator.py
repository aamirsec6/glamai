"""Monthly Value Report Generator.

Generates PDF reports showing a client's marketing performance
for a given month. Delivered via WhatsApp.
"""

from __future__ import annotations

import io
import json
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.gbp import GbpPost, GbpRanking
from src.models.lead import Lead, LeadSource, LeadStatus
from src.models.org import Org
from src.models.report import MonthlyReport, ReportStatus

logger = structlog.get_logger(__name__)


class ReportGenerator:
    """Generates monthly value reports for clients.

    Report sections:
    1. Summary (one-line overview)
    2. Lead Generation (total, sources, conversion)
    3. Google Business Profile (views, actions, posts)
    4. Ranking Progress (keyword positions)
    5. Reviews (new reviews, rating change)
    6. Estimated Revenue (from converted leads)
    7. Month-over-Month Comparison
    8. AI Narrative (written summary)
    """

    async def generate_report(
        self,
        org: Org,
        month: int,
        year: int,
        db: AsyncSession,
    ) -> MonthlyReport:
        """Generate a monthly report for an org.

        Args:
            org: The client organization
            month: Report month (1-12)
            year: Report year

        Returns:
            MonthlyReport with all fields populated
        """
        # Calculate period
        period_start = datetime(year, month, 1)
        if month == 12:
            period_end = datetime(year + 1, 1, 1)
        else:
            period_end = datetime(year, month + 1, 1)

        logger.info(
            "generating_report",
            org_id=org.id,
            period=f"{month}/{year}",
        )

        # ── Lead Metrics ──────────────────────────────────────
        lead_metrics = await self._calculate_lead_metrics(
            org.id, period_start, period_end, db
        )

        # ── GBP Metrics ───────────────────────────────────────
        gbp_metrics = await self._calculate_gbp_metrics(
            org.id, period_start, period_end, db
        )

        # ── Ranking Metrics ───────────────────────────────────
        ranking_metrics = await self._calculate_ranking_metrics(
            org.id, period_start, period_end, db
        )

        # ── Month-over-Month ─────────────────────────────────
        mom_metrics = await self._calculate_mom_comparison(
            org.id, month, year, lead_metrics, gbp_metrics, db
        )

        # ── Build Report ─────────────────────────────────────
        report = MonthlyReport(
            org_id=org.id,
            report_month=month,
            report_year=year,
            period_start=period_start,
            period_end=period_end,
            # Lead data
            leads_total=lead_metrics["total"],
            leads_from_whatsapp=lead_metrics["from_whatsapp"],
            leads_from_gbp=lead_metrics["from_gbp"],
            leads_from_other=lead_metrics["from_other"],
            leads_won=lead_metrics["won"],
            leads_lost=lead_metrics["lost"],
            leads_conversion_rate=lead_metrics["conversion_rate"],
            total_estimated_revenue_paise=lead_metrics["revenue_paise"],
            avg_project_value_paise=lead_metrics["avg_project_value_paise"],
            # GBP data
            gbp_search_views=gbp_metrics["search_views"],
            gbp_maps_views=gbp_metrics["maps_views"],
            gbp_total_views=gbp_metrics["total_views"],
            gbp_website_clicks=gbp_metrics["website_clicks"],
            gbp_calls=gbp_metrics["calls"],
            gbp_direction_requests=gbp_metrics["direction_requests"],
            gbp_posts_published=gbp_metrics["posts_published"],
            # Ranking data
            avg_keyword_position=ranking_metrics["avg_position"],
            best_keyword_position=ranking_metrics["best_position"],
            keywords_tracked=ranking_metrics["tracked"],
            keywords_improved=ranking_metrics["improved"],
            keywords_declined=ranking_metrics["declined"],
            # MoM data
            leads_mom_change_pct=mom_metrics["leads_change"],
            views_mom_change_pct=mom_metrics["views_change"],
            revenue_mom_change_pct=mom_metrics["revenue_change"],
            # Status
            status=ReportStatus.GENERATED,
            generated_at=datetime.utcnow(),
        )

        db.add(report)
        await db.flush()

        return report

    async def _calculate_lead_metrics(
        self,
        org_id: str,
        start: datetime,
        end: datetime,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Calculate lead metrics for a period."""
        stmt = select(Lead).where(
            and_(
                Lead.org_id == org_id,
                Lead.created_at >= start,
                Lead.created_at < end,
            )
        )
        result = await db.execute(stmt)
        leads = result.scalars().all()

        total = len(leads)
        from_whatsapp = sum(1 for l in leads if l.source == LeadSource.WHATSAPP)
        from_gbp = sum(
            1 for l in leads
            if l.source in (LeadSource.GBP, LeadSource.GBP_CALL, LeadSource.GBP_DIRECTIONS)
        )
        from_other = total - from_whatsapp - from_gbp

        won_leads = [l for l in leads if l.status == LeadStatus.WON]
        lost_leads = [l for l in leads if l.status == LeadStatus.LOST]

        conversion_rate = (len(won_leads) / total * 100) if total > 0 else None

        revenue_paise = sum(
            l.won_value_paise or 0 for l in won_leads
        )
        avg_project_value = (
            revenue_paise // len(won_leads) if won_leads else None
        )

        return {
            "total": total,
            "from_whatsapp": from_whatsapp,
            "from_gbp": from_gbp,
            "from_other": from_other,
            "won": len(won_leads),
            "lost": len(lost_leads),
            "conversion_rate": round(conversion_rate, 1) if conversion_rate else None,
            "revenue_paise": revenue_paise,
            "avg_project_value_paise": avg_project_value,
        }

    async def _calculate_gbp_metrics(
        self,
        org_id: str,
        start: datetime,
        end: datetime,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Calculate GBP metrics for a period."""
        # Posts published
        post_stmt = select(func.count(GbpPost.id)).where(
            and_(
                GbpPost.org_id == org_id,
                GbpPost.status == "published",
                GbpPost.published_at >= start,
                GbpPost.published_at < end,
            )
        )
        post_result = await db.execute(post_stmt)
        posts_published = post_result.scalar() or 0

        # Note: GBP views/calls/directions come from the GBP Insights API
        # which is synced separately. For now, we return placeholder values
        # that will be populated by the sync job.
        return {
            "search_views": 0,
            "maps_views": 0,
            "total_views": 0,
            "website_clicks": 0,
            "calls": 0,
            "direction_requests": 0,
            "posts_published": posts_published,
        }

    async def _calculate_ranking_metrics(
        self,
        org_id: str,
        start: datetime,
        end: datetime,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Calculate keyword ranking metrics for a period."""
        stmt = select(GbpRanking).where(
            and_(
                GbpRanking.org_id == org_id,
                GbpRanking.recorded_at >= start,
                GbpRanking.recorded_at < end,
            )
        )
        result = await db.execute(stmt)
        rankings = result.scalars().all()

        if not rankings:
            return {
                "avg_position": None,
                "best_position": None,
                "tracked": 0,
                "improved": 0,
                "declined": 0,
            }

        positions = [r.position for r in rankings if r.position is not None]

        return {
            "avg_position": round(sum(positions) / len(positions), 1) if positions else None,
            "best_position": min(positions) if positions else None,
            "tracked": len(rankings),
            "improved": sum(1 for r in rankings if r.position and r.position <= 3),
            "declined": sum(1 for r in rankings if r.position and r.position > 10),
        }

    async def _calculate_mom_comparison(
        self,
        org_id: str,
        month: int,
        year: int,
        current_leads: dict,
        current_gbp: dict,
        db: AsyncSession,
    ) -> dict[str, float | None]:
        """Calculate month-over-month changes."""
        # Previous month
        if month == 1:
            prev_month = 12
            prev_year = year - 1
        else:
            prev_month = month - 1
            prev_year = year

        prev_start = datetime(prev_year, prev_month, 1)
        if prev_month == 12:
            prev_end = datetime(prev_year + 1, 1, 1)
        else:
            prev_end = datetime(prev_year, prev_month + 1, 1)

        prev_metrics = await self._calculate_lead_metrics(
            org_id, prev_start, prev_end, db
        )
        prev_gbp = await self._calculate_gbp_metrics(
            org_id, prev_start, prev_end, db
        )

        def _pct_change(current: int, previous: int) -> float | None:
            if previous == 0:
                return None
            return round((current - previous) / previous * 100, 1)

        return {
            "leads_change": _pct_change(
                current_leads["total"], prev_metrics["total"]
            ),
            "views_change": _pct_change(
                current_gbp["total_views"], prev_gbp["total_views"]
            ),
            "revenue_change": _pct_change(
                current_leads["revenue_paise"], prev_metrics["revenue_paise"]
            ),
        }
