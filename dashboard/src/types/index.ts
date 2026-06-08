// ── Core Types for GlamAI Dashboard ──

export interface Org {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  plan: "free" | "starter" | "growth" | "enterprise";
  exclusivity: "standard" | "exclusive";
  onboarding_status: string;
  is_active: boolean;
  billing_amount_inr: number;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  gbp_place_id: string | null;
  guarantee_leads_generated: number;
  guarantee_gbp_posts_delivered: number;
  guarantee_reviews_collected: number;
  created_at: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  address?: string;
  state?: string;
  pincode?: string;
  website?: string | null;
  gbp_name?: string | null;
  gbp_status?: string | null;
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
  guarantee_start_date?: string | null;
  notes?: string | null;
}

export interface Lead {
  id: string;
  org_id: string;
  source: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  status: string;
  scope: string;
  budget_range: string;
  timeline?: string;
  location_area?: string;
  property_type?: string;
  property_size_sqft?: number;
  ai_summary?: string;
  ai_qualification_score?: number;
  won_value_inr?: number;
  lost_reason?: string;
  assigned_to?: string;
  created_at: string;
  first_contact_at: string;
  last_contact_at: string;
}

export interface WhatsappMessage {
  id: string;
  org_id: string;
  lead_id: string;
  direction: "inbound" | "outbound";
  sender: "lead" | "ai" | "designer" | "system";
  message_text: string;
  message_type: string;
  ai_intent?: string;
  delivered: boolean;
  read: boolean;
  sent_at: string;
}

export interface GbpPost {
  id: string;
  org_id: string;
  title?: string;
  content: string;
  post_type: string;
  status: string;
  keyword_target?: string;
  scheduled_at?: string;
  published_at?: string;
  views?: number;
  clicks?: number;
  ai_generated: boolean;
  created_at: string;
}

export interface GbpRanking {
  id: string;
  org_id: string;
  keyword: string;
  position?: number;
  search_city: string;
  recorded_at: string;
}

export interface GbpCompetitor {
  id: string;
  org_id: string;
  name: string;
  category: string;
  city: string;
  distance_km?: number;
  is_glamai_client: boolean;
  review_count?: number;
  avg_rating?: number;
}

export interface Territory {
  id: string;
  org_id: string;
  city: string;
  category: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  is_exclusive: boolean;
  status: string;
}

export interface MonthlyReport {
  id: string;
  org_id: string;
  period: string;
  leads_total: number;
  leads_won: number;
  leads_conversion_rate?: number;
  total_estimated_revenue_inr: number;
  gbp_total_views: number;
  gbp_calls: number;
  reviews_new: number;
  avg_rating?: number;
  status: string;
  pdf_url?: string;
}

export interface NotificationLog {
  id: string;
  org_id: string;
  lead_id?: string;
  channel: string;
  notification_type: string;
  recipient: string;
  sent: boolean;
  delivered: boolean;
  sent_at?: string;
}

export interface OnboardingEvent {
  id: string;
  org_id: string;
  event_type: string;
  event_data?: string;
  created_at: string;
}

// ── Admin Dashboard Types ──

export interface AdminDashboard {
  orgs: {
    total: number;
    active: number;
    onboarding_complete: number;
    by_plan: Record<string, number>;
    by_category: Record<string, number>;
    by_city: Record<string, number>;
  };
  leads: {
    total: number;
    last_30d: number;
    won: number;
    lost: number;
    conversion_rate: number;
    by_source: Record<string, number>;
  };
  revenue: {
    total_mrr_inr: number;
    total_revenue_inr: number;
    avg_revenue_per_client: number;
  };
  onboarding_funnel: Record<string, number>;
  territories: {
    active: number;
    by_city: Record<string, number>;
  };
}

export interface FunnelStep {
  step: string;
  count: number;
  conversion_from_previous: number;
}

export interface OrgHealth {
  score: number;
  max_score: number;
  label: "healthy" | "needs_attention" | "at_risk";
  reasons: string[];
}

// ── User Journey Tracking ──

export interface UserJourneyEvent {
  id: string;
  org_id: string;
  session_id: string;
  event_type: "page_view" | "click" | "form_submit" | "api_call" | "error" | "onboarding_step" | "gbp_action" | "whatsapp_action" | "report_view";
  page?: string;
  element?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserJourneySession {
  session_id: string;
  org_id: string;
  org_name: string;
  started_at: string;
  last_activity_at: string;
  events: UserJourneyEvent[];
  total_events: number;
  pages_visited: string[];
  errors_count: number;
  completed_actions: string[];
}

// ── Workflow Insights ──

export interface DropOffPoint {
  step: string;
  drop_off_count: number;
  drop_off_rate: number;
  common_reasons: string[];
  affected_orgs: string[];
}

export interface WorkflowBottleneck {
  workflow: string;
  avg_time_minutes: number;
  p90_time_minutes: number;
  failure_rate: number;
  affected_orgs: number;
  recommendation: string;
}

export interface ClientNeed {
  org_id: string;
  org_name: string;
  issue_type: "stuck_onboarding" | "low_engagement" | "error_prone" | "territory_conflict" | "guarantee_at_risk" | "churn_risk";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  days_since_last_activity: number;
}

export interface WorkflowInsight {
  drop_offs: DropOffPoint[];
  bottlenecks: WorkflowBottleneck[];
  clients_needing_help: ClientNeed[];
  overall_onboarding_rate: number;
  avg_time_to_active_hours: number;
  total_active_sessions_24h: number;
}
