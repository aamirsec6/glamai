import type { FunnelStep } from "@/types";

export type JourneyStageMetric = {
  key: string;
  label: string;
  funnel_layer: string;
  user_journey_steps: string[];
  friction_points: string[];
  metrics_tracked: string[];
  root_causes: string[];
  recommended_actions: string[];
  orgs_reached: number;
  conversion_from_previous_pct: number;
  drop_off_count: number;
  drop_off_rate_pct: number;
  avg_time_in_stage_hours: number | null;
  median_time_in_stage_hours: number | null;
  p90_time_in_stage_hours: number | null;
  stuck_count: number;
  stuck_orgs: Array<{
    org_id: string;
    org_name: string;
    city: string | null;
    plan: string;
    current_status: string;
    days_stuck: number;
    stage: string;
  }>;
  dropped_orgs: Array<{
    org_id: string;
    org_name: string;
    city: string | null;
    status: string;
  }>;
  observed_friction: Array<{ type: string; label: string; count: number }>;
  insights: string[];
};

export type JourneyAnalyticsPayload = {
  generated_at: string;
  period_days: number;
  summary: {
    total_orgs: number;
    signups: number;
    onboarding_completed: number;
    active_clients: number;
    completion_rate_pct: number;
    activation_rate_pct: number;
    avg_time_to_complete_hours: number | null;
    median_time_to_complete_hours: number | null;
    p90_time_to_complete_hours: number | null;
    stuck_clients_total: number;
    worst_drop_off_stage: string | null;
    worst_drop_off_rate_pct: number;
  };
  stages: JourneyStageMetric[];
  funnel_steps: FunnelStep[];
  root_cause_analysis: Array<{
    problem: string;
    metric: string;
    since: string;
    segment: string;
    business_impact: string;
    hypotheses: string[];
    recommended_fix: string;
  }>;
};

export type PilotOrgStatus = {
  org_id: string;
  name: string;
  slug: string;
  city: string | null;
  plan: string;
  onboarding_status: string;
  is_demo: boolean;
  pilot_status: "live" | "partial" | "setup" | "demo";
  gbp: {
    connected: boolean;
    place_id: string | null;
    name: string | null;
    last_synced_at: string | null;
    sync_stale: boolean;
    total_views: number;
    calls: number;
    website_clicks: number;
  };
  whatsapp: {
    connected: boolean;
    number: string | null;
  };
  activity: {
    leads_30d: number;
    whatsapp_leads_30d: number;
    conversations_30d: number;
  };
  analytics: {
    health_score: number | null;
  };
  issues: string[];
  recommended_actions: string[];
};

export type PilotStatusPayload = {
  generated_at: string;
  period_days: number;
  summary: {
    total_orgs: number;
    live: number;
    partial: number;
    setup: number;
    demo: number;
    needs_sync: number;
  };
  orgs: PilotOrgStatus[];
};
