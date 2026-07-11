"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import ApiClient from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatCurrency,
  formatRelativeTime,
  getBudgetLabel,
  getScopeLabel,
} from "@/lib/utils";
import type { Lead, WhatsappMessage } from "@/types";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  MessageSquare,
  IndianRupee,
} from "lucide-react";

export default function ClientLeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const { orgId } = useOrgId();

  const { data, isLoading, error } = useSWR(
    orgId && leadId ? ["lead", leadId, orgId] : null,
    () => ApiClient.getLead(leadId, orgId!)
  );

  const lead: (Lead & { conversations?: WhatsappMessage[] }) | undefined =
    data?.data;

  if (!orgId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete onboarding to view lead details.
        </p>
        <Link href="/client/onboarding">
          <Button size="sm">Continue Setup</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Link href="/client/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Leads
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  const score =
    lead.ai_qualification_score !== undefined
      ? Math.round(
          lead.ai_qualification_score <= 1
            ? lead.ai_qualification_score * 100
            : lead.ai_qualification_score
        )
      : undefined;

  const conversations = lead.conversations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/client/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.contact_name}</h1>
          <p className="text-sm text-muted-foreground">
            Added {formatRelativeTime(lead.created_at)}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={lead.status} />
        </div>
      </div>

      {lead.ai_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{lead.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contact & Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.contact_phone}
              </p>
            </div>
            {lead.contact_email && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.contact_email}
                </p>
              </div>
            )}
            {lead.location_area && (
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.location_area}
                </p>
              </div>
            )}
            {lead.budget_range && (
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {getBudgetLabel(lead.budget_range)}
                </p>
              </div>
            )}
            {lead.scope && (
              <div>
                <p className="text-xs text-muted-foreground">Scope</p>
                <p className="text-sm text-foreground">{getScopeLabel(lead.scope)}</p>
              </div>
            )}
            {lead.timeline && (
              <div>
                <p className="text-xs text-muted-foreground">Timeline</p>
                <p className="text-sm text-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lead.timeline}
                </p>
              </div>
            )}
            {lead.won_value_inr && (
              <div>
                <p className="text-xs text-muted-foreground">Won Value</p>
                <p className="text-sm font-medium text-success">
                  {formatCurrency(lead.won_value_inr)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="text-sm text-foreground capitalize">{lead.source}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {score !== undefined && (
              <Badge variant="outline">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Score: {score}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages yet.
            </p>
          ) : (
            <div className="space-y-3">
              {conversations.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{msg.direction}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(msg.sent_at)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{msg.message_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
