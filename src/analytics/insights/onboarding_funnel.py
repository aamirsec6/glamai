"""Blinkit-style onboarding funnel analytics for the admin portal."""

from __future__ import annotations

import json
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.journey import UserJourneyEvent
from src.models.lead import Lead
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org
from src.models.territory import Territory, TerritoryStatus

STAGE_ORDER = [
    "signup",
    "gbp_connected",
    "whatsapp_connected",
    "territory_set",
    "onboarding_complete",
    "first_lead",
    "active",
]

STATUS_RANK = {
    OnboardingStatus.CREATED: 0,
    OnboardingStatus.GBP_CONNECTED: 1,
    OnboardingStatus.WHATSAPP_CONNECTED: 2,
    OnboardingStatus.TERRITORY_SET: 3,
    OnboardingStatus.ONBOARDING_COMPLETE: 4,
    OnboardingStatus.ACTIVE: 5,
    OnboardingStatus.PAUSED: 4,
    OnboardingStatus.CHURNED: -1,
}

STAGE_RANK = {key: idx for idx, key in enumerate(STAGE_ORDER)}

STAGE_CATALOG: list[dict[str, Any]] = [
    {
        "key": "signup",
        "label": "Account Created",
        "funnel_layer": "Acquisition",
        "user_journey_steps": [
            "Discovers GlamAI via marketing site / referral",
            "Views pricing and product pages",
            "Starts client onboarding signup",
            "Submits business profile (name, city, category)",
        ],
        "friction_points": [
            "Unclear value proposition on landing page",
            "Too many form fields before first win",
            "Category / city selection confusion",
            "No immediate confirmation of next steps",
        ],
        "metrics_tracked": [
            "Total signups",
            "Signup-to-GBP conversion",
            "Median time to first integration",
        ],
        "root_causes": [
            "Marketing traffic not qualified for local services",
            "Signup form abandonment on mobile",
            "Missing trust signals (case studies, guarantees)",
            "Competitor comparison without differentiation",
        ],
        "recommended_actions": [
            "Shorten signup to essentials; defer territory details",
            "Show post-signup checklist immediately after account creation",
            "Trigger welcome WhatsApp within 5 minutes of signup",
        ],
    },
    {
        "key": "gbp_connected",
        "label": "GBP Connected",
        "funnel_layer": "Integration",
        "user_journey_steps": [
            "Opens GBP connect step in onboarding",
            "Redirects to Google OAuth consent",
            "Selects business location",
            "Returns to GlamAI with profile linked",
        ],
        "friction_points": [
            "Google OAuth timeout or permission denied",
            "Wrong Google account selected",
            "Business not verified on Google",
            "Multiple locations — unclear which to pick",
        ],
        "metrics_tracked": [
            "GBP connect initiation rate",
            "OAuth success rate",
            "GBP sync success rate",
            "Median time in GBP step",
        ],
        "root_causes": [
            "Google API approval pending for tenant",
            "OAuth callback errors / expired state",
            "User cancels mid-flow",
            "GBP listing not claimed on Google",
        ],
        "recommended_actions": [
            "Add retry + clearer error copy on OAuth failure",
            "Pre-flight check: is GBP claimed before OAuth?",
            "Auto-run first sync after connect and surface results",
        ],
    },
    {
        "key": "whatsapp_connected",
        "label": "WhatsApp Connected",
        "funnel_layer": "Integration",
        "user_journey_steps": [
            "Enters WhatsApp Business number",
            "Verifies number via OTP / webhook",
            "Configures 360dialog / Meta connection",
            "Sends test message to confirm lead capture",
        ],
        "friction_points": [
            "OTP not received",
            "Number already linked elsewhere",
            "Webhook not configured",
            "Test message fails silently",
        ],
        "metrics_tracked": [
            "WhatsApp verification success rate",
            "Time to first inbound message",
            "Webhook delivery success",
        ],
        "root_causes": [
            "Invalid or personal WhatsApp number used",
            "360dialog API key missing / expired",
            "Webhook URL not reachable in dev",
            "User skips verification step",
        ],
        "recommended_actions": [
            "Add OTP resend and support fallback",
            "Show webhook health status in onboarding UI",
            "Provide one-click test lead simulation",
        ],
    },
    {
        "key": "territory_set",
        "label": "Territory Set",
        "funnel_layer": "Setup",
        "user_journey_steps": [
            "Views territory map / exclusivity options",
            "Sets service radius or claims niche",
            "Resolves conflicts if territory taken",
            "Confirms territory and plan tier",
        ],
        "friction_points": [
            "Territory conflict with existing client",
            "Pincode / address not serviceable",
            "Exclusivity pricing surprise",
            "Map UX confusing on mobile",
        ],
        "metrics_tracked": [
            "Territory claim success rate",
            "Conflict rate",
            "Time to territory confirmation",
        ],
        "root_causes": [
            "Overlapping exclusivity in dense cities",
            "User unsure about radius vs keyword niche",
            "Skipped because optional in UI",
            "Plan upgrade required but not shown early",
        ],
        "recommended_actions": [
            "Show conflict alternatives before submission",
            "Default to standard (non-exclusive) with upgrade path",
            "Highlight guarantee tied to territory setup",
        ],
    },
    {
        "key": "onboarding_complete",
        "label": "Onboarding Complete",
        "funnel_layer": "Activation",
        "user_journey_steps": [
            "Reviews onboarding checklist",
            "Confirms plan and billing",
            "Launches first GBP post / content agent",
            "Marks onboarding as complete",
        ],
        "friction_points": [
            "Incomplete prior steps blocking progress",
            "Billing / plan selection friction",
            "No visible quick win after setup",
            "Dashboard empty — feels broken",
        ],
        "metrics_tracked": [
            "Onboarding completion rate",
            "Time from signup to complete",
            "Steps skipped before completion",
        ],
        "root_causes": [
            "Stuck on GBP or WhatsApp from earlier steps",
            "Low motivation after technical setup",
            "No first lead yet — value not proven",
            "Content agents not run automatically",
        ],
        "recommended_actions": [
            "Auto-run content agents on onboarding complete",
            "Send completion summary via WhatsApp",
            "Schedule first monthly report date visibly",
        ],
    },
    {
        "key": "first_lead",
        "label": "First Lead Captured",
        "funnel_layer": "Value delivery",
        "user_journey_steps": [
            "Prospect finds business on Google / WhatsApp link",
            "Sends first WhatsApp inquiry",
            "AI qualifies lead and logs in CRM",
            "Designer receives notification",
        ],
        "friction_points": [
            "GBP not ranking — no inbound traffic",
            "WhatsApp link not on GBP / website",
            "AI response too slow or generic",
            "Lead not visible in dashboard",
        ],
        "metrics_tracked": [
            "Days to first lead",
            "WhatsApp vs other source split",
            "First-lead qualification score",
        ],
        "root_causes": [
            "GBP profile thin — low local visibility",
            "No posts / reviews driving discovery",
            "WhatsApp number not published on GBP",
            "Webhook down — messages not stored",
        ],
        "recommended_actions": [
            "Publish WhatsApp click-to-chat on GBP",
            "Run GBP sync + insights review weekly",
            "Send test lead and verify end-to-end flow",
        ],
    },
    {
        "key": "active",
        "label": "Active Client",
        "funnel_layer": "Retention",
        "user_journey_steps": [
            "Receives recurring leads via WhatsApp",
            "GBP posts published on schedule",
            "Monthly value report delivered",
            "Uses insights dashboard regularly",
        ],
        "friction_points": [
            "Lead volume drops after first week",
            "Reports not opened",
            "Churn risk after guarantee period",
            "Low engagement with insights",
        ],
        "metrics_tracked": [
            "30-day lead volume",
            "GBP views / calls trend",
            "Report open rate",
            "Client health score",
        ],
        "root_causes": [
            "Seasonal demand dip in category",
            "Competitor outranking on key terms",
            "WhatsApp AI mis-qualifying leads",
            "No proactive account management",
        ],
        "recommended_actions": [
            "Flag at-risk clients in admin pilot view",
            "Refresh GBP content monthly",
            "Review conversation quality for AI tuning",
        ],
    },
]


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    if len(values) == 1:
        return values[0]
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (pct / 100)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


@dataclass
class OrgStageTimestamps:
    org_id: str
    timestamps: dict[str, datetime]


class OnboardingFunnelEngine:
    """Compute stage metrics, drop-offs, dwell times, and insights."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze(self, period_days: int = 90) -> dict[str, Any]:
        now = datetime.utcnow()
        since = now - timedelta(days=period_days)
        stuck_cutoff = now - timedelta(days=3)

        orgs = (await self.session.execute(select(Org).order_by(Org.created_at.asc()))).scalars().all()
        org_ids = [o.id for o in orgs]

        events = (
            await self.session.execute(
                select(OnboardingEvent).where(OnboardingEvent.created_at >= since)
            )
        ).scalars().all()

        journey_errors = (
            await self.session.execute(
                select(UserJourneyEvent).where(
                    and_(
                        UserJourneyEvent.created_at >= since,
                        UserJourneyEvent.event_type == "error",
                    )
                )
            )
        ).scalars().all()

        lead_counts = dict(
            (await self.session.execute(
                select(Lead.org_id, func.count())
                .where(Lead.created_at >= since)
                .group_by(Lead.org_id)
            )).all()
        )

        territory_orgs = set(
            (await self.session.execute(
                select(Territory.org_id).where(Territory.status == TerritoryStatus.ACTIVE)
            )).scalars().all()
        )

        org_map = {o.id: o for o in orgs}
        timelines = self._build_timelines(orgs, events, lead_counts, territory_orgs)

        stages_out: list[dict[str, Any]] = []
        prev_reached = len(orgs)

        for catalog in STAGE_CATALOG:
            key = catalog["key"]
            reached_ids = self._orgs_at_stage(key, orgs, timelines, lead_counts, territory_orgs)
            reached = len(reached_ids)
            conversion = round(reached / prev_reached * 100, 1) if prev_reached > 0 else 100.0
            dropped = max(prev_reached - reached, 0)
            drop_rate = round(dropped / prev_reached * 100, 1) if prev_reached > 0 else 0.0

            dwell_hours = self._stage_dwell_hours(key, timelines, org_map)
            stuck = self._stuck_at_stage(
                key, orgs, timelines, lead_counts, territory_orgs, stuck_cutoff, now
            )
            dropped_orgs = self._dropped_orgs(
                key, orgs, timelines, lead_counts, territory_orgs
            )

            stage_errors = self._errors_for_stage(key, journey_errors)
            observed_friction = self._observed_friction(
                key, stage_errors, dropped_orgs, org_map
            )

            stages_out.append({
                **catalog,
                "orgs_reached": reached,
                "conversion_from_previous_pct": conversion,
                "drop_off_count": dropped,
                "drop_off_rate_pct": drop_rate,
                "avg_time_in_stage_hours": round(statistics.mean(dwell_hours), 1) if dwell_hours else None,
                "median_time_in_stage_hours": round(statistics.median(dwell_hours), 1) if dwell_hours else None,
                "p90_time_in_stage_hours": round(_percentile(dwell_hours, 90) or 0, 1) if dwell_hours else None,
                "stuck_orgs": stuck[:10],
                "stuck_count": len(stuck),
                "dropped_orgs": dropped_orgs[:8],
                "observed_friction": observed_friction,
                "insights": self._stage_insights(
                    key, reached, drop_rate, len(stuck), catalog
                ),
            })
            prev_reached = reached

        summary = self._build_summary(orgs, stages_out, timelines, now)
        root_cause_items = self._root_cause_analysis(stages_out, summary)

        return {
            "generated_at": now.isoformat(),
            "period_days": period_days,
            "summary": summary,
            "stages": stages_out,
            "funnel_steps": [
                {
                    "step": s["key"],
                    "count": s["orgs_reached"],
                    "conversion_from_previous": s["conversion_from_previous_pct"],
                }
                for s in stages_out
            ],
            "root_cause_analysis": root_cause_items,
        }

    def _build_timelines(
        self,
        orgs: list[Org],
        events: list[OnboardingEvent],
        lead_counts: dict[str, int],
        territory_orgs: set[str],
    ) -> dict[str, OrgStageTimestamps]:
        by_org: dict[str, dict[str, datetime]] = {}
        for org in orgs:
            by_org[org.id] = {"signup": org.created_at or datetime.utcnow()}

        for event in events:
            if event.event_type in STAGE_RANK:
                existing = by_org.get(event.org_id, {})
                if event.event_type not in existing:
                    by_org.setdefault(event.org_id, {})[event.event_type] = event.created_at
                else:
                    by_org[event.org_id][event.event_type] = min(
                        by_org[event.org_id][event.event_type],
                        event.created_at,
                    )

        for org in orgs:
            ts = by_org.setdefault(org.id, {"signup": org.created_at or datetime.utcnow()})
            if org.gbp_place_id and "gbp_connected" not in ts:
                ts["gbp_connected"] = org.gbp_last_synced_at or org.updated_at or org.created_at
            if org.whatsapp_verified and org.whatsapp_number and "whatsapp_connected" not in ts:
                ts["whatsapp_connected"] = org.whatsapp_connected_at or org.updated_at
            if org.id in territory_orgs and "territory_set" not in ts:
                ts["territory_set"] = org.updated_at or org.created_at
            if org.onboarding_status in (
                OnboardingStatus.ONBOARDING_COMPLETE,
                OnboardingStatus.ACTIVE,
            ) and "onboarding_complete" not in ts:
                ts["onboarding_complete"] = org.onboarding_completed_at or org.updated_at
            if lead_counts.get(org.id, 0) > 0 and "first_lead" not in ts:
                ts["first_lead"] = org.updated_at or org.created_at
            if org.onboarding_status == OnboardingStatus.ACTIVE and "active" not in ts:
                ts["active"] = org.onboarding_completed_at or org.updated_at

        return {oid: OrgStageTimestamps(org_id=oid, timestamps=ts) for oid, ts in by_org.items()}

    def _orgs_at_stage(
        self,
        stage: str,
        orgs: list[Org],
        timelines: dict[str, OrgStageTimestamps],
        lead_counts: dict[str, int],
        territory_orgs: set[str],
    ) -> list[str]:
        reached: list[str] = []
        for org in orgs:
            if self._org_reached_stage(org, stage, timelines, lead_counts, territory_orgs):
                reached.append(org.id)
        return reached

    def _org_reached_stage(
        self,
        org: Org,
        stage: str,
        timelines: dict[str, OrgStageTimestamps],
        lead_counts: dict[str, int],
        territory_orgs: set[str],
    ) -> bool:
        tl = timelines.get(org.id)
        if tl and stage in tl.timestamps:
            return True
        rank = STAGE_RANK.get(stage, 0)
        status_rank = STATUS_RANK.get(org.onboarding_status, -1)
        if status_rank >= rank:
            return True
        if stage == "gbp_connected" and org.gbp_place_id:
            return True
        if stage == "whatsapp_connected" and org.whatsapp_verified and org.whatsapp_number:
            return True
        if stage == "territory_set" and org.id in territory_orgs:
            return True
        if stage == "first_lead" and lead_counts.get(org.id, 0) > 0:
            return True
        if stage == "signup":
            return True
        return False

    def _stage_dwell_hours(
        self,
        stage: str,
        timelines: dict[str, OrgStageTimestamps],
        org_map: dict[str, Org],
    ) -> list[float]:
        idx = STAGE_RANK.get(stage, 0)
        prev_key = STAGE_ORDER[idx - 1] if idx > 0 else None
        durations: list[float] = []
        for org_id, tl in timelines.items():
            if stage not in tl.timestamps:
                continue
            end = tl.timestamps[stage]
            if prev_key and prev_key in tl.timestamps:
                start = tl.timestamps[prev_key]
            else:
                org = org_map.get(org_id)
                start = org.created_at if org and org.created_at else end
            delta = (end - start).total_seconds() / 3600
            if delta >= 0:
                durations.append(delta)
        return durations

    def _stuck_at_stage(
        self,
        stage: str,
        orgs: list[Org],
        timelines: dict[str, OrgStageTimestamps],
        lead_counts: dict[str, int],
        territory_orgs: set[str],
        stuck_cutoff: datetime,
        now: datetime,
    ) -> list[dict[str, Any]]:
        idx = STAGE_RANK.get(stage, 0)
        next_stage = STAGE_ORDER[idx + 1] if idx + 1 < len(STAGE_ORDER) else None
        if not next_stage:
            return []

        stuck: list[dict[str, Any]] = []
        for org in orgs:
            if org.onboarding_status in (OnboardingStatus.CHURNED, OnboardingStatus.PAUSED):
                continue
            reached_current = self._org_reached_stage(
                org, stage, timelines, lead_counts, territory_orgs
            )
            reached_next = (
                self._org_reached_stage(org, next_stage, timelines, lead_counts, territory_orgs)
                if next_stage
                else True
            )
            if not reached_current or reached_next:
                continue

            tl = timelines.get(org.id)
            last_at = tl.timestamps.get(stage) if tl else org.created_at
            if not last_at or last_at > stuck_cutoff:
                continue

            days_stuck = (now - last_at).days
            stuck.append({
                "org_id": org.id,
                "org_name": org.name,
                "city": org.city,
                "plan": org.plan.value if hasattr(org.plan, "value") else str(org.plan),
                "current_status": org.onboarding_status.value,
                "days_stuck": days_stuck,
                "stage": stage,
            })

        stuck.sort(key=lambda x: x["days_stuck"], reverse=True)
        return stuck

    def _dropped_orgs(
        self,
        stage: str,
        orgs: list[Org],
        timelines: dict[str, OrgStageTimestamps],
        lead_counts: dict[str, int],
        territory_orgs: set[str],
    ) -> list[dict[str, Any]]:
        idx = STAGE_RANK.get(stage, 0)
        if idx == 0:
            return []
        prev_stage = STAGE_ORDER[idx - 1]
        dropped: list[dict[str, Any]] = []
        for org in orgs:
            reached_prev = self._org_reached_stage(
                org, prev_stage, timelines, lead_counts, territory_orgs
            )
            reached_curr = self._org_reached_stage(
                org, stage, timelines, lead_counts, territory_orgs
            )
            if reached_prev and not reached_curr:
                dropped.append({
                    "org_id": org.id,
                    "org_name": org.name,
                    "city": org.city,
                    "status": org.onboarding_status.value,
                })
        return dropped

    def _errors_for_stage(
        self, stage: str, journey_errors: list[UserJourneyEvent]
    ) -> list[UserJourneyEvent]:
        matched: list[UserJourneyEvent] = []
        for err in journey_errors:
            meta: dict[str, Any] = {}
            if err.metadata_json:
                try:
                    meta = json.loads(err.metadata_json)
                except json.JSONDecodeError:
                    meta = {}
            page = (err.page or "").lower()
            step = str(meta.get("step", "")).lower()
            if stage in page or stage in step or stage.replace("_", "") in page.replace("_", ""):
                matched.append(err)
        return matched

    def _observed_friction(
        self,
        stage: str,
        stage_errors: list[UserJourneyEvent],
        dropped_orgs: list[dict[str, Any]],
        org_map: dict[str, Org],
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        if stage_errors:
            by_desc: dict[str, int] = {}
            for err in stage_errors:
                label = err.description or err.page or "Unknown error"
                by_desc[label] = by_desc.get(label, 0) + 1
            for desc, count in sorted(by_desc.items(), key=lambda x: -x[1])[:5]:
                items.append({"type": "journey_error", "label": desc, "count": count})

        if dropped_orgs:
            items.append({
                "type": "drop_off",
                "label": f"{len(dropped_orgs)} org(s) dropped before {stage.replace('_', ' ')}",
                "count": len(dropped_orgs),
            })

        for dropped in dropped_orgs[:3]:
            org = org_map.get(dropped["org_id"])
            if org and not org.gbp_place_id and stage == "gbp_connected":
                items.append({
                    "type": "integration_gap",
                    "label": f"{org.name}: GBP not linked",
                    "count": 1,
                })
            if org and not org.whatsapp_verified and stage == "whatsapp_connected":
                items.append({
                    "type": "integration_gap",
                    "label": f"{org.name}: WhatsApp not verified",
                    "count": 1,
                })
        return items[:6]

    def _stage_insights(
        self,
        stage: str,
        reached: int,
        drop_rate: float,
        stuck_count: int,
        catalog: dict[str, Any],
    ) -> list[str]:
        insights: list[str] = []
        if drop_rate >= 40:
            insights.append(
                f"High drop-off ({drop_rate}%) at {catalog['label']} — prioritize fixes this week."
            )
        elif drop_rate >= 20:
            insights.append(
                f"Moderate drop-off ({drop_rate}%) at {catalog['label']} — review friction points."
            )
        if stuck_count > 0:
            insights.append(f"{stuck_count} client(s) stuck at {catalog['label']} for 3+ days.")
        if reached == 0:
            insights.append(f"No clients have reached {catalog['label']} in this period.")
        if not insights:
            insights.append(catalog["recommended_actions"][0])
        return insights[:3]

    def _build_summary(
        self,
        orgs: list[Org],
        stages: list[dict[str, Any]],
        timelines: dict[str, OrgStageTimestamps],
        now: datetime,
    ) -> dict[str, Any]:
        total = len(orgs)
        signup = stages[0]["orgs_reached"] if stages else total
        active = stages[-1]["orgs_reached"] if stages else 0
        complete_idx = STAGE_RANK.get("onboarding_complete", 4)
        completed = stages[complete_idx]["orgs_reached"] if len(stages) > complete_idx else 0

        completion_hours: list[float] = []
        for tl in timelines.values():
            if "onboarding_complete" in tl.timestamps and "signup" in tl.timestamps:
                h = (tl.timestamps["onboarding_complete"] - tl.timestamps["signup"]).total_seconds() / 3600
                if h >= 0:
                    completion_hours.append(h)

        stuck_total = sum(s["stuck_count"] for s in stages)
        worst_stage = max(stages, key=lambda s: s["drop_off_rate_pct"]) if stages else None

        return {
            "total_orgs": total,
            "signups": signup,
            "onboarding_completed": completed,
            "active_clients": active,
            "completion_rate_pct": round(completed / signup * 100, 1) if signup else 0,
            "activation_rate_pct": round(active / signup * 100, 1) if signup else 0,
            "avg_time_to_complete_hours": round(statistics.mean(completion_hours), 1) if completion_hours else None,
            "median_time_to_complete_hours": round(statistics.median(completion_hours), 1) if completion_hours else None,
            "p90_time_to_complete_hours": round(_percentile(completion_hours, 90) or 0, 1) if completion_hours else None,
            "stuck_clients_total": stuck_total,
            "worst_drop_off_stage": worst_stage["key"] if worst_stage else None,
            "worst_drop_off_rate_pct": worst_stage["drop_off_rate_pct"] if worst_stage else 0,
        }

    def _root_cause_analysis(
        self, stages: list[dict[str, Any]], summary: dict[str, Any]
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        worst_key = summary.get("worst_drop_off_stage")
        if worst_key:
            stage = next((s for s in stages if s["key"] == worst_key), None)
            if stage:
                items.append({
                    "problem": f"Drop-off at {stage['label']}",
                    "metric": f"{stage['drop_off_rate_pct']}% drop-off rate",
                    "since": "Current period",
                    "segment": "All clients",
                    "business_impact": f"{stage['drop_off_count']} clients not progressing",
                    "hypotheses": stage["root_causes"][:4],
                    "recommended_fix": stage["recommended_actions"][0],
                })

        for stage in stages:
            if stage["stuck_count"] > 0:
                items.append({
                    "problem": f"Clients stuck at {stage['label']}",
                    "metric": f"{stage['stuck_count']} stuck 3+ days",
                    "since": "Ongoing",
                    "segment": ", ".join(o["city"] or "?" for o in stage["stuck_orgs"][:3]),
                    "business_impact": "Delayed time-to-value and lower guarantee delivery",
                    "hypotheses": stage["friction_points"][:3],
                    "recommended_fix": stage["recommended_actions"][0],
                })

        if not items:
            items.append({
                "problem": "Funnel healthy — monitor leading indicators",
                "metric": f"{summary.get('completion_rate_pct', 0)}% completion rate",
                "since": "Current period",
                "segment": "All clients",
                "business_impact": "Maintain weekly GBP sync and lead capture checks",
                "hypotheses": ["Seasonal variance", "New signup quality", "Integration failures"],
                "recommended_fix": "Review Live Pilots weekly for early warnings",
            })
        return items[:6]
