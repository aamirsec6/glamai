"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useOrgDetail,
  useLeads,
  useGbpPosts,
  useGbpRankings,
  useOrgDashboard,
  useReports,
  useUserJourney,
} from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { HealthScore } from "@/components/admin/health-score";
import { JourneyTimeline } from "@/components/admin/journey-timeline";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type {
  Org,
  Lead,
  GbpPost,
  GbpRanking,
  GbpCompetitor,
  MonthlyReport,
  OnboardingEvent,
} from "@/types";
import {
  Users,
  TrendingUp,
  IndianRupee,
  Megaphone,
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Pause,
  CreditCard,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  BarChart3,
  Eye,
  MousePointerClick,
  Navigation,
  FileText,
  Download,
  Filter,
  Sparkles,
  Map,
  KeyRound,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// ── Constants ──

const LEAD_STATUSES = ["all", "new", "contacted", "quoted", "won", "lost"] as const;

const ONBOARDING_STEPS = [
  "created",
  "onboarding_started",
  "whatsapp_connected",
  "gbp_linked",
  "territory_claimed",
  "content_generated",
  "campaign_live",
  "onboarding_complete",
];

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "page_view", label: "Page Views" },
  { value: "button_click", label: "Button Clicks" },
  { value: "form_submit", label: "Form Submits" },
  { value: "lead_created", label: "Leads Created" },
  { value: "gbp_post", label: "GBP Posts" },
  { value: "whatsapp_message", label: "WhatsApp Messages" },
  { value: "error", label: "Errors" },
];

// ── Helpers ──

function getOnboardingProgress(status: string): number {
  const idx = ONBOARDING_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / ONBOARDING_STEPS.length) * 100);
}

function getStatusBadgeVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "info" | "outline" {
  switch (status) {
    case "active":
    case "won":
    case "published":
    case "delivered":
    case "healthy":
    case "connected":
    case "ok":
      return "success";
    case "new":
    case "contacted":
    case "draft":
    case "scheduled":
      return "info";
    case "quoted":
    case "negotiation":
    case "generating":
    case "needs_attention":
    case "stale":
      return "warning";
    case "lost":
    case "dropped":
    case "failed":
    case "at_risk":
    case "churned":
    case "disconnected":
      return "danger";
    default:
      return "outline";
  }
}

function convertOrgHealth(detail: {
  health_score?: { score: number; label: string; reasons: string[] };
}): {
  score: number;
  max_score: number;
  label: "healthy" | "needs_attention" | "at_risk";
  reasons: string[];
  factors: { type: string; label: string; detail?: string }[];
  last_login_days_ago: number;
  onboarding_step: string;
  gbp_sync_status: string;
  whatsapp_status: string;
} | null {
  if (!detail?.health_score) return null;
  const hs = detail.health_score;
  const score = hs.score;
  let label: "healthy" | "needs_attention" | "at_risk" = "at_risk";
  if (score >= 80) label = "healthy";
  else if (score >= 50) label = "needs_attention";
  return {
    score,
    max_score: 100,
    label,
    reasons: hs.reasons || [],
    factors: (hs.reasons || []).map((r: string) => ({
      type: score >= 80 ? "positive" : score >= 50 ? "neutral" : "negative",
      label: r,
    })),
    last_login_days_ago: 0,
    onboarding_step: detail.org?.onboarding_status || "unknown",
    gbp_sync_status: detail.org?.gbp_status || "unknown",
    whatsapp_status: detail.org?.whatsapp_verified ? "connected" : "disconnected",
  };
}

// ── Loading Skeletons ──

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72" />
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// ── Stat Card (inline) ──

function MetricCard({
  label,
  value,
  icon,
  change,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  change >= 0 ? "text-success" : "text-danger"
                )}
              >
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(change)}% MoM
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary-50 p-2.5 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── MoM Badge ──

function MomBadge({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        value > 0
          ? "text-success"
          : value < 0
          ? "text-danger"
          : "text-muted-foreground"
      )}
    >
      {value > 0 ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : value < 0 ? (
        <ArrowDownRight className="h-3 w-3" />
      ) : null}
      {value !== 0 ? `${Math.abs(value)}%` : "—"}
      <span className="ml-1 text-muted-foreground font-normal">MoM</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── MAIN PAGE ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = React.useState("overview");
  const [leadStatusFilter, setLeadStatusFilter] = React.useState("all");
  const [expandedLeadId, setExpandedLeadId] = React.useState<string | null>(null);
  const [journeyEventFilter, setJourneyEventFilter] = React.useState("all");

  // ── Data Fetching ──
  const { data: orgDetail, isLoading: orgLoading } = useOrgDetail(id);
  const { data: dashboard, isLoading: dashLoading } = useOrgDashboard(id);
  const {
    data: leadsData,
    isLoading: leadsLoading,
    mutate: mutateLeads,
  } = useLeads({
    org_id: id,
    status: leadStatusFilter === "all" ? undefined : leadStatusFilter,
  });
  const { data: gbpPosts, isLoading: gbpLoading } = useGbpPosts(id);
  const { data: rankings, isLoading: rankingsLoading } = useGbpRankings(id);
  const { data: reports, isLoading: reportsLoading } = useReports(id);
  const { data: journey, isLoading: journeyLoading } = useUserJourney(id);

  const org: Org | undefined = orgDetail?.data?.org;
  const onboardingEvents: OnboardingEvent[] = orgDetail?.data?.onboarding_events || [];
  const healthData = orgDetail?.data
    ? convertOrgHealth(orgDetail.data)
    : null;

  const leads: Lead[] = leadsData?.data || [];
  const posts: GbpPost[] = gbpPosts?.data || [];
  const rankingRows: GbpRanking[] = rankings?.data || [];
  const reportRows: MonthlyReport[] = reports?.data || [];
  const journeySessions = journey?.data || [];

  // Flatten journey events from sessions
  const journeyEvents = React.useMemo(() => {
    const events: (UserJourneyEvent & { session_id?: string })[] = [];
    for (const session of journeySessions) {
      if (session.events) {
        for (const ev of session.events) {
          events.push({ ...ev, session_id: session.session_id });
        }
      }
    }
    return events.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [journeySessions]);

  const filteredJourneyEvents = React.useMemo(() => {
    if (journeyEventFilter === "all") return journeyEvents;
    return journeyEvents.filter((e) => e.event_type === journeyEventFilter);
  }, [journeyEvents, journeyEventFilter]);

  // Computed metrics
  const guarantee = dashboard?.data?.guarantee;
  const leadsStats = dashboard?.data?.leads;

  const conversionRate =
    leadsStats && leadsStats.total > 0
      ? Math.round(
          ((leadsStats.by_status?.won || 0) / leadsStats.total) * 100
        )
      : 0;

  // ── Status Update Handler ──
  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    // Optimistic update
    const { updateLead } = await import("@/lib/api");
    await updateLead(leadId, { status: newStatus } as Partial<Lead>);
    mutateLeads();
  };

  if (orgLoading && !org) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/clients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{org?.name || "Loading..."}</h1>
              <p className="text-xs text-muted-foreground">
                {org?.category?.replace(/_/g, " ")} · {org?.city} ·{" "}
                <span className="capitalize">{org?.plan}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={org?.is_active ? "success" : "danger"}
              className="capitalize"
            >
              {org?.is_active ? "Active" : "Inactive"}
            </Badge>
            {org?.exclusivity === "exclusive" && (
              <Badge variant="info">
                <Sparkles className="h-3 w-3 mr-1" />
                Exclusive
              </Badge>
            )}
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leads">
                Leads
                {leadsStats && (
                  <span className="ml-1.5 rounded-full bg-primary-500/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {leadsStats.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="gbp">
                GBP
                {org?.gbp_place_id ? (
                  <span className="ml-1.5 rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
                    Linked
                  </span>
                ) : (
                  <span className="ml-1.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">
                    Not Linked
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="journey">Journey</TabsTrigger>
              <TabsTrigger value="territory">Territory</TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════ TAB 1: OVERVIEW ═══════════════ */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              {orgLoading ? (
                <OverviewSkeleton />
              ) : (
                <>
                  {/* Row: Health Score + Metrics */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Health Score */}
                    <div>
                      <HealthScore
                        health={healthData as any}
                        isLoading={orgLoading}
                        orgName={org?.name}
                      />
                    </div>

                    {/* Key Metrics */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <MetricCard
                          label="Leads Generated"
                          value={
                            guarantee?.leads_generated ??
                            leadsStats?.total ??
                            0
                          }
                          icon={<Users className="h-5 w-5" />}
                        />
                        <MetricCard
                          label="Conversion Rate"
                          value={`${conversionRate}%`}
                          icon={<TrendingUp className="h-5 w-5" />}
                          change={2}
                        />
                        <MetricCard
                          label="Revenue"
                          value={formatCurrency(
                            org?.billing_amount_inr || 0
                          )}
                          icon={<IndianRupee className="h-5 w-5" />}
                          change={5}
                        />
                        <MetricCard
                          label="MRR"
                          value={formatCurrency(
                            org?.billing_amount_inr || 0
                          )}
                          icon={<IndianRupee className="h-5 w-5" />}
                          change={8}
                        />
                        <MetricCard
                          label="Posts Delivered"
                          value={guarantee?.posts_delivered ?? 0}
                          icon={<Megaphone className="h-5 w-5" />}
                          change={12}
                        />
                        <MetricCard
                          label="Reviews"
                          value={guarantee?.reviews_collected ?? 0}
                          icon={<Star className="h-5 w-5" />}
                          change={-3}
                        />
                      </div>

                      {/* Onboarding Progress */}
                      {org && (
                        <Card>
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">
                                  Onboarding Progress
                                </CardTitle>
                                <Badge variant="outline" className="capitalize">
                                  {org.onboarding_status.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {getOnboardingProgress(org.onboarding_status)}%
                              </span>
                            </div>
                            <Progress
                              value={getOnboardingProgress(
                                org.onboarding_status
                              )}
                              size="md"
                              variant={
                                getOnboardingProgress(org.onboarding_status) >=
                                80
                                  ? "success"
                                  : getOnboardingProgress(
                                      org.onboarding_status
                                    ) >= 50
                                  ? "default"
                                  : "warning"
                              }
                            />
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {ONBOARDING_STEPS.map((step) => {
                                const stepIdx = ONBOARDING_STEPS.indexOf(step);
                                const currentIdx = ONBOARDING_STEPS.indexOf(
                                  org.onboarding_status
                                );
                                const isComplete =
                                  currentIdx >= 0 && stepIdx <= currentIdx;
                                return (
                                  <div
                                    key={step}
                                    className={cn(
                                      "flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-medium border",
                                      isComplete
                                        ? "bg-success/10 text-success border-success/20"
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    {isComplete ? (
                                      <CheckCircle className="h-3 w-3" />
                                    ) : (
                                      <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
                                    )}
                                    {step.replace(/_/g, " ")}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Row: Quick Actions + Contact Info */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                          Common actions for this client
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <Button variant="outline" className="justify-start">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Send Message
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Account
                          </Button>
                          <Button variant="outline" className="justify-start">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Change Plan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Info */}
                    {org && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">
                                {org.email || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">
                                {org.phone ||
                                  org.whatsapp_number ||
                                  "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">
                                {org.address || "—"}
                                {org.city ? `, ${org.city}` : ""}
                                {org.state ? `, ${org.state}` : ""}
                                {org.pincode ? ` - ${org.pincode}` : ""}
                              </span>
                            </div>
                            {org.website && (
                              <div className="flex items-center gap-3 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                <a
                                  href={org.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  {org.website}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground capitalize">
                                {org.category?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════ TAB 2: LEADS ══════════════════ */}
            <TabsContent value="leads" className="mt-6 space-y-6">
              {/* Filter Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground mr-1">
                      <Filter className="h-4 w-4 inline mr-1" />
                      Status:
                    </span>
                    {LEAD_STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={
                          leadStatusFilter === s ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setLeadStatusFilter(s)}
                        className="capitalize"
                      >
                        {s}
                        {s !== "all" && leadsStats?.by_status && (
                          <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                            {leadsStats.by_status[s] || 0}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Leads Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Leads</CardTitle>
                      <CardDescription>
                        {leads.length} lead{leads.length !== 1 ? "s" : ""}{" "}
                        {leadStatusFilter !== "all" && (
                          <span className="capitalize">
                            ({leadStatusFilter})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {leadsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : leads.length === 0 ? (
                    <EmptyState
                      icon={<Users className="h-8 w-8" />}
                      title="No leads found"
                      description="This client hasn't generated any leads yet."
                      action={
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Initiate Outreach
                        </Button>
                      }
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <React.Fragment key={lead.id}>
                            <TableRow
                              className="cursor-pointer"
                              onClick={() =>
                                setExpandedLeadId(
                                  expandedLeadId === lead.id ? null : lead.id
                                )
                              }
                            >
                              <TableCell className="font-medium">
                                {lead.contact_name}
                              </TableCell>
                              <TableCell>{lead.contact_phone}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={getStatusBadgeVariant(lead.status)}
                                >
                                  {lead.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {lead.budget_range
                                  ? `₹${lead.budget_range}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="capitalize">
                                {lead.scope?.replace(/_/g, " ") || "—"}
                              </TableCell>
                              <TableCell className="capitalize">
                                {lead.source}
                              </TableCell>
                              <TableCell>
                                {lead.ai_qualification_score ? (
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      lead.ai_qualification_score >= 70
                                        ? "text-success"
                                        : lead.ai_qualification_score >= 40
                                        ? "text-warning"
                                        : "text-danger"
                                    )}
                                  >
                                    {lead.ai_qualification_score}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                {formatRelativeTime(lead.created_at)}
                              </TableCell>
                              <TableCell>
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 text-muted-foreground transition-transform",
                                    expandedLeadId === lead.id &&
                                      "rotate-180"
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                            {expandedLeadId === lead.id && (
                              <TableRow>
                                <TableCell colSpan={9} className="bg-gray-50 p-4">
                                  <div className="space-y-4">
                                    {/* Lead Details */}
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          Email
                                        </p>
                                        <p className="text-sm font-medium">
                                          {lead.contact_email || "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          Timeline
                                        </p>
                                        <p className="text-sm font-medium capitalize">
                                          {lead.timeline || "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          Property
                                        </p>
                                        <p className="text-sm font-medium">
                                          {lead.property_type || "—"}{" "}
                                          {lead.property_size_sqft
                                            ? `(${lead.property_size_sqft} sqft)`
                                            : ""}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          Location
                                        </p>
                                        <p className="text-sm font-medium">
                                          {lead.location_area || "—"}
                                        </p>
                                      </div>
                                      {lead.won_value_inr && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">
                                            Won Value
                                          </p>
                                          <p className="text-sm font-medium text-success">
                                            {formatCurrencyFull(
                                              lead.won_value_inr
                                            )}
                                          </p>
                                        </div>
                                      )}
                                      {lead.lost_reason && (
                                        <div>
                                          <p className="text-xs text-muted-foreground">
                                            Lost Reason
                                          </p>
                                          <p className="text-sm font-medium text-danger">
                                            {lead.lost_reason}
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          First Contact
                                        </p>
                                        <p className="text-sm font-medium">
                                          {formatDate(lead.first_contact_at)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">
                                          Last Contact
                                        </p>
                                        <p className="text-sm font-medium">
                                          {formatDate(lead.last_contact_at)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* AI Summary */}
                                    {lead.ai_summary && (
                                      <div className="rounded-lg bg-primary-50 border border-primary-500/20 p-3">
                                        <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                                          <Sparkles className="h-3 w-3" />
                                          AI Summary
                                        </p>
                                        <p className="text-sm text-foreground">
                                          {lead.ai_summary}
                                        </p>
                                      </div>
                                    )}

                                    {/* Status Update Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-muted-foreground mr-1">
                                        Update Status:
                                      </span>
                                      {["new", "contacted", "quoted", "won", "lost"].map(
                                        (status) => (
                                          <Button
                                            key={status}
                                            size="sm"
                                            variant={
                                              lead.status === status
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStatusUpdate(
                                                lead.id,
                                                status
                                              );
                                            }}
                                            className="capitalize"
                                          >
                                            {status}
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════ TAB 3: GBP ════════════════════ */}
            <TabsContent value="gbp" className="mt-6 space-y-6">
              {/* GBP Connection Status */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-full p-2",
                          org?.gbp_place_id
                            ? "bg-success/10"
                            : "bg-warning/10"
                        )}
                      >
                        {org?.gbp_place_id ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-warning" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          Google Business Profile
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {org?.gbp_name || org?.name || "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          org?.gbp_place_id ? "success" : "warning"
                        }
                      >
                        {org?.gbp_place_id ? "Connected" : "Not Linked"}
                      </Badge>
                      {org?.gbp_place_id && (
                        <a
                          href={`https://business.google.com/${org.gbp_place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insights Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <MetricCard
                  label="Search Views"
                  value="—"
                  icon={<Eye className="h-5 w-5" />}
                />
                <MetricCard
                  label="Maps Views"
                  value="—"
                  icon={<Map className="h-5 w-5" />}
                />
                <MetricCard
                  label="Clicks"
                  value="—"
                  icon={<MousePointerClick className="h-5 w-5" />}
                />
                <MetricCard
                  label="Calls"
                  value="—"
                  icon={<Phone className="h-5 w-5" />}
                />
                <MetricCard
                  label="Directions"
                  value="—"
                  icon={<Navigation className="h-5 w-5" />}
                />
              </div>

              {/* Recent Posts */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent GBP Posts</CardTitle>
                  <CardDescription>
                    Latest posts published to Google Business Profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {gbpLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <EmptyState
                      icon={<Megaphone className="h-8 w-8" />}
                      title="No posts yet"
                      description="No GBP posts have been published for this client."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Content</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>Published</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posts.slice(0, 10).map((post) => (
                          <TableRow key={post.id}>
                            <TableCell className="max-w-xs truncate">
                              {post.title || post.content}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {post.post_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(post.status)}
                              >
                                {post.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{post.views ?? "—"}</TableCell>
                            <TableCell>{post.clicks ?? "—"}</TableCell>
                            <TableCell>
                              {post.published_at
                                ? formatDate(post.published_at)
                                : post.scheduled_at
                                ? `Scheduled: ${formatDate(post.scheduled_at)}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Rankings</CardTitle>
                  <CardDescription>
                    Local search ranking positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rankingsLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : rankingRows.length === 0 ? (
                    <EmptyState
                      icon={<BarChart3 className="h-8 w-8" />}
                      title="No ranking data"
                      description="No keyword rankings recorded yet."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Trend</TableHead>
                          <TableHead>Recorded</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingRows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              {r.keyword}
                            </TableCell>
                            <TableCell>
                              {r.position ? (
                                <span
                                  className={cn(
                                    "font-semibold",
                                    r.position <= 3
                                      ? "text-success"
                                      : r.position <= 10
                                      ? "text-warning"
                                      : "text-danger"
                                  )}
                                >
                                  #{r.position}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>{r.search_city}</TableCell>
                            <TableCell>
                              <ArrowUpRight className="h-4 w-4 text-success" />
                            </TableCell>
                            <TableCell>
                              {formatDate(r.recorded_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Competitors */}
              <Card>
                <CardHeader>
                  <CardTitle>Competitors</CardTitle>
                  <CardDescription>
                    Nearby businesses in the same category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title="No competitor data"
                    description="Competitor tracking will appear here once available."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══════════════════════════════════════════ TAB 4: REPORTS ═════════════════ */}
            <TabsContent value="reports" className="mt-6 space-y-6">
              {reportsLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-64" />
                  ))}
                </div>
              ) : reportRows.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8" />}
                  title="No reports yet"
                  description="Monthly reports will be generated automatically."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reportRows.map((report, idx) => {
                    const prevReport =
                      idx < reportRows.length - 1 ? reportRows[idx + 1] : null;
                    const leadsChange = prevReport
                      ? Math.round(
                          ((report.leads_total - prevReport.leads_total) /
                            (prevReport.leads_total || 1)) *
                            100
                        )
                      : undefined;
                    const convChange = prevReport
                      ? Math.round(
                          ((report.leads_conversion_rate || 0) -
                            (prevReport.leads_conversion_rate || 0)) *
                            100
                        )
                      : undefined;
                    const revChange = prevReport
                      ? Math.round(
                          ((report.total_estimated_revenue_inr -
                            prevReport.total_estimated_revenue_inr) /
                            (prevReport.total_estimated_revenue_inr || 1)) *
                            100
                        )
                      : undefined;
                    const viewsChange = prevReport
                      ? Math.round(
                          ((report.gbp_total_views -
                            prevReport.gbp_total_views) /
                            (prevReport.gbp_total_views || 1)) *
                            100
                        )
                      : undefined;
                    const reviewsChange = prevReport
                      ? Math.round(
                          ((report.reviews_new - prevReport.reviews_new) /
                            (prevReport.reviews_new || 1)) *
                            100
                        )
                      : undefined;

                    return (
                      <Card key={report.id} className="flex flex-col">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              {report.period}
                            </CardTitle>
                            <Badge
                              variant={
                                report.status === "published"
                                  ? "success"
                                  : "outline"
                              }
                            >
                              {report.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Leads
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {report.leads_total}
                              </p>
                              {leadsChange !== undefined && (
                                <MomBadge value={leadsChange} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Conversion
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {report.leads_conversion_rate ?? 0}%
                              </p>
                              {convChange !== undefined && (
                                <MomBadge value={convChange} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Revenue
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {formatCurrency(
                                  report.total_estimated_revenue_inr
                                )}
                              </p>
                              {revChange !== undefined && (
                                <MomBadge value={revChange} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Views
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {report.gbp_total_views}
                              </p>
                              {viewsChange !== undefined && (
                                <MomBadge value={viewsChange} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Reviews
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {report.reviews_new}
                              </p>
                              {reviewsChange !== undefined && (
                                <MomBadge value={reviewsChange} />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Rating
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {report.avg_rating
                                  ? `${report.avg_rating}★`
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          {report.pdf_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              asChild
                            >
                              <a
                                href={report.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════ TAB 5: JOURNEY ════════════════ */}
            <TabsContent value="journey" className="mt-6 space-y-6">
              {/* Event Type Filter */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Filter:
                    </span>
                    <select
                      value={journeyEventFilter}
                      onChange={(e) => setJourneyEventFilter(e.target.value)}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground">
                      {filteredJourneyEvents.length} event
                      {filteredJourneyEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Session Summary Stats */}
              {journeySessions.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard
                    label="Sessions"
                    value={journeySessions.length}
                    icon={<Users className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Total Events"
                    value={journeyEvents.length}
                    icon={<BarChart3 className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Pages Visited"
                    value={
                      new Set(
                        journeyEvents
                          .filter((e) => e.page)
                          .map((e) => e.page)
                      ).size
                    }
                    icon={<Globe className="h-5 w-5" />}
                  />
                  <MetricCard
                    label="Errors"
                    value={journeyEvents.filter((e) => e.event_type === "error").length}
                    icon={<AlertTriangle className="h-5 w-5" />}
                  />
                </div>
              )}

              {/* Journey Timeline */}
              <JourneyTimeline
                events={filteredJourneyEvents as any}
                isLoading={journeyLoading}
              />
            </TabsContent>

            {/* ═══════════════════════════════════════════ TAB 6: TERRITORY ═══════════════ */}
            <TabsContent value="territory" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Territory Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Territory Details</CardTitle>
                    <CardDescription>
                      Geographic coverage and exclusivity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {org?.latitude && org?.longitude ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              City
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {org.city}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Category
                            </p>
                            <p className="text-sm font-medium text-foreground capitalize">
                              {org.category?.replace(/_/g, " ")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Latitude
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {org.latitude}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Longitude
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {org.longitude}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              org.exclusivity === "exclusive"
                                ? "success"
                                : "outline"
                            }
                          >
                            {org.exclusivity === "exclusive" ? (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Exclusive
                              </>
                            ) : (
                              "Standard"
                            )}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        icon={<Map className="h-8 w-8" />}
                        title="No territory assigned"
                        description="This client doesn't have a territory claim yet."
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Keywords</CardTitle>
                    <CardDescription>
                      SEO keywords for this territory
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rankingRows.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(rankingRows.map((r) => r.keyword))].map(
                          (keyword) => (
                            <Badge
                              key={keyword}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              {keyword}
                            </Badge>
                          )
                        )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<KeyRound className="h-8 w-8" />}
                        title="No keywords assigned"
                        description="Keywords will appear here once territory is configured."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Conflict Warnings */}
              <Card>
                <CardHeader>
                  <CardTitle>Conflict Warnings</CardTitle>
                  <CardDescription>
                    Territory overlap and exclusivity alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 rounded-lg bg-success/10 border border-success/20 p-4">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-success">
                        No conflicts detected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This territory has no overlapping claims.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Territory Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
                    <div className="text-center">
                      <Map className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Map visualization
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {org?.latitude && org?.longitude
                          ? `${org.latitude}, ${org.longitude}`
                          : "No coordinates available"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modify Territory Button */}
              <div className="flex justify-end">
                <Button>
                  <Map className="h-4 w-4 mr-2" />
                  Modify Territory
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
