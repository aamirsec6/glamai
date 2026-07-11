"""Advanced business insight model outputs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FunnelStage:
    stage: str
    count: int
    conversion_from_previous_pct: float | None = None


@dataclass
class LeadFunnelInsights:
    stages: list[FunnelStage] = field(default_factory=list)
    overall_win_rate_pct: float = 0.0
    avg_days_to_close: float | None = None
    pipeline_value_inr: int = 0
    qualified_leads: int = 0
    source_attribution: dict[str, dict[str, Any]] = field(default_factory=dict)
    drop_off_stage: str | None = None
    health_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "stages": [
                {
                    "stage": s.stage,
                    "count": s.count,
                    "conversion_from_previous_pct": s.conversion_from_previous_pct,
                }
                for s in self.stages
            ],
            "overall_win_rate_pct": self.overall_win_rate_pct,
            "avg_days_to_close": self.avg_days_to_close,
            "pipeline_value_inr": self.pipeline_value_inr,
            "qualified_leads": self.qualified_leads,
            "source_attribution": self.source_attribution,
            "drop_off_stage": self.drop_off_stage,
            "health_score": self.health_score,
        }


@dataclass
class GbpPerformanceInsights:
    engagement_rate_pct: float = 0.0
    call_rate_pct: float = 0.0
    click_through_rate_pct: float = 0.0
    maps_share_pct: float = 0.0
    views_trend_pct: float | None = None
    actions_trend_pct: float | None = None
    review_velocity: float | None = None
    content_cadence_score: float = 0.0
    health_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "engagement_rate_pct": self.engagement_rate_pct,
            "call_rate_pct": self.call_rate_pct,
            "click_through_rate_pct": self.click_through_rate_pct,
            "maps_share_pct": self.maps_share_pct,
            "views_trend_pct": self.views_trend_pct,
            "actions_trend_pct": self.actions_trend_pct,
            "review_velocity": self.review_velocity,
            "content_cadence_score": self.content_cadence_score,
            "health_score": self.health_score,
        }


@dataclass
class CompetitiveInsights:
    your_rating: float | None = None
    competitor_avg_rating: float | None = None
    rating_gap: float | None = None
    your_reviews: int | None = None
    competitor_avg_reviews: float | None = None
    review_gap: float | None = None
    keywords_top3: int = 0
    keywords_top10: int = 0
    keywords_weak: int = 0
    competitive_position: str = "unknown"
    health_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "your_rating": self.your_rating,
            "competitor_avg_rating": self.competitor_avg_rating,
            "rating_gap": self.rating_gap,
            "your_reviews": self.your_reviews,
            "competitor_avg_reviews": self.competitor_avg_reviews,
            "review_gap": self.review_gap,
            "keywords_top3": self.keywords_top3,
            "keywords_top10": self.keywords_top10,
            "keywords_weak": self.keywords_weak,
            "competitive_position": self.competitive_position,
            "health_score": self.health_score,
        }


@dataclass
class ForecastInsights:
    projected_leads_next_30d: int = 0
    projected_revenue_inr: int = 0
    projected_gbp_views: int = 0
    confidence: str = "low"
    win_rate_assumption_pct: float = 0.0
    growth_rate_pct: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "projected_leads_next_30d": self.projected_leads_next_30d,
            "projected_revenue_inr": self.projected_revenue_inr,
            "projected_gbp_views": self.projected_gbp_views,
            "confidence": self.confidence,
            "win_rate_assumption_pct": self.win_rate_assumption_pct,
            "growth_rate_pct": self.growth_rate_pct,
        }


@dataclass
class SeoHealthInsights:
    visibility_index: float = 0.0
    keywords_tracked: int = 0
    avg_position: float | None = None
    ranking_momentum: str = "stable"
    keyword_gaps: list[str] = field(default_factory=list)
    health_score: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "visibility_index": self.visibility_index,
            "keywords_tracked": self.keywords_tracked,
            "avg_position": self.avg_position,
            "ranking_momentum": self.ranking_momentum,
            "keyword_gaps": self.keyword_gaps,
            "health_score": self.health_score,
        }


@dataclass
class BusinessOpportunity:
    id: str
    title: str
    category: str
    impact_score: int
    effort: str
    expected_lift: str
    rationale: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "impact_score": self.impact_score,
            "effort": self.effort,
            "expected_lift": self.expected_lift,
            "rationale": self.rationale,
        }


@dataclass
class AdvancedBusinessInsights:
    org_id: str
    org_name: str
    period_days: int
    business_health_score: float = 0.0
    lead_funnel: LeadFunnelInsights = field(default_factory=LeadFunnelInsights)
    gbp_performance: GbpPerformanceInsights = field(default_factory=GbpPerformanceInsights)
    competitive: CompetitiveInsights = field(default_factory=CompetitiveInsights)
    forecast: ForecastInsights = field(default_factory=ForecastInsights)
    seo_health: SeoHealthInsights = field(default_factory=SeoHealthInsights)
    opportunities: list[BusinessOpportunity] = field(default_factory=list)
    executive_summary: list[str] = field(default_factory=list)
    ai_narrative: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "org_id": self.org_id,
            "org_name": self.org_name,
            "period_days": self.period_days,
            "business_health_score": self.business_health_score,
            "lead_funnel": self.lead_funnel.to_dict(),
            "gbp_performance": self.gbp_performance.to_dict(),
            "competitive": self.competitive.to_dict(),
            "forecast": self.forecast.to_dict(),
            "seo_health": self.seo_health.to_dict(),
            "opportunities": [o.to_dict() for o in self.opportunities],
            "executive_summary": self.executive_summary,
            "ai_narrative": self.ai_narrative,
        }
