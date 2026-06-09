"use client";

import * as React from "react";
import { useLeads } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatRelativeTime, getBudgetLabel, getScopeLabel, cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { Users, Search, Phone, Mail, IndianRupee, Clock, MapPin, ChevronDown, ChevronUp, Sparkles, CheckCircle2, XCircle, FileText, MessageSquare } from "lucide-react";

const FILTERS = ["all", "new", "contacted", "quoted", "won", "lost"] as const;
type Filter = (typeof FILTERS)[number];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function scoreVariant(s: number | undefined) {
  if (s === undefined) return "outline" as const;
  return s >= 70 ? "success" as const : s >= 40 ? "warning" as const : "danger" as const;
}

function LeadRow({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = React.useState(false);
  const [status, setStatus] = React.useState(lead.status);
  const score = lead.ai_qualification_score;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Row */}
      <div className="flex cursor-pointer items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(lead.contact_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{lead.contact_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />{lead.contact_phone}
            </p>
          </div>
        </div>
        <div className="hidden sm:block w-24"><StatusBadge status={status} /></div>
        <p className="hidden md:block text-sm text-foreground w-24 truncate">
          {lead.budget_range ? getBudgetLabel(lead.budget_range) : "—"}
        </p>
        <p className="hidden lg:block text-sm text-foreground w-24 truncate">
          {lead.scope ? getScopeLabel(lead.scope) : "—"}
        </p>
        <div className="hidden md:block w-20">
          {score !== undefined
            ? <Badge variant={scoreVariant(score)} className="text-xs"><Sparkles className="mr-1 h-3 w-3" />{score}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>}
        </div>
        <span className="hidden lg:block text-xs text-muted-foreground w-24 truncate">
          {formatRelativeTime(lead.created_at)}
        </span>
        <div className="w-6 shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2 bg-muted/10">
        {lead.budget_range && <Badge variant="outline" className="text-xs"><IndianRupee className="mr-1 h-3 w-3" />{getBudgetLabel(lead.budget_range)}</Badge>}
        {lead.scope && <Badge variant="outline" className="text-xs">{getScopeLabel(lead.scope)}</Badge>}
        {lead.timeline && <Badge variant="outline" className="text-xs"><Clock className="mr-1 h-3 w-3" />{lead.timeline}</Badge>}
        {lead.location_area && <Badge variant="outline" className="text-xs"><MapPin className="mr-1 h-3 w-3" />{lead.location_area}</Badge>}
        {score !== undefined && <Badge variant={scoreVariant(score)} className="text-xs"><Sparkles className="mr-1 h-3 w-3" />AI: {score}</Badge>}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {lead.ai_summary && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-primary" /><p className="text-sm font-medium text-primary">AI Summary</p></div>
              <p className="text-sm text-muted-foreground">{lead.ai_summary}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lead.contact_email && <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm text-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{lead.contact_email}</p></div>}
            {lead.property_type && <div><p className="text-xs text-muted-foreground">Property</p><p className="text-sm text-foreground">{lead.property_type}</p></div>}
            {lead.property_size_sqft && <div><p className="text-xs text-muted-foreground">Size</p><p className="text-sm text-foreground">{lead.property_size_sqft.toLocaleString()} sqft</p></div>}
            {lead.won_value_inr && <div><p className="text-xs text-muted-foreground">Won Value</p><p className="text-sm font-medium text-success">{formatCurrency(lead.won_value_inr)}</p></div>}
            {lead.lost_reason && <div><p className="text-xs text-muted-foreground">Lost Reason</p><p className="text-sm text-danger">{lead.lost_reason}</p></div>}
            <div><p className="text-xs text-muted-foreground">Source</p><p className="text-sm text-foreground capitalize">{lead.source}</p></div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Conversation History</p></div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center"><p className="text-sm text-muted-foreground">Conversation history will be loaded from the API</p></div>
          </div>
          {status !== "won" && status !== "lost" && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {status === "new" && <Button size="sm" variant="outline" onClick={() => setStatus("contacted")}><Phone className="mr-1.5 h-3.5 w-3.5" />Mark Contacted</Button>}
                {(status === "new" || status === "contacted") && <Button size="sm" variant="outline" onClick={() => setStatus("quoted")}><FileText className="mr-1.5 h-3.5 w-3.5" />Mark Quoted</Button>}
                {status !== "new" && <Button size="sm" variant="outline" onClick={() => setStatus("won")} className="border-success/30 text-success hover:bg-success/10"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark Won</Button>}
                <Button size="sm" variant="outline" onClick={() => setStatus("lost")} className="border-danger/30 text-danger hover:bg-danger/10"><XCircle className="mr-1.5 h-3.5 w-3.5" />Mark Lost</Button>
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientLeadsPage() {
  const orgId = "demo-org-id";
  const [statusFilter, setStatusFilter] = React.useState<Filter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data, isLoading } = useLeads({
    org_id: orgId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const leads: Lead[] = data?.data ?? [];
  const filtered = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.contact_name.toLowerCase().includes(q) || l.contact_phone.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage and track your incoming leads</p>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                statusFilter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent>
          <EmptyState icon={<Users className="h-10 w-10" />} title="No leads yet"
            description={searchQuery ? "No leads match your search. Try a different query." : "You don't have any leads yet. Complete onboarding to start receiving leads."} />
        </CardContent></Card>
      ) : (
        <div className="space-y-3">{filtered.map((lead) => <LeadRow key={lead.id} lead={lead} />)}</div>
      )}
    </div>
  );
}
