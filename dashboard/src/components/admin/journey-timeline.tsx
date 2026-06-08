"use client";

import * as React from "react";
import type { UserJourneyEvent } from "@/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MousePointerClick,
  FileText,
  Globe,
  Zap,
  AlertCircle,
  MessageSquare,
  Megaphone,
  BarChart3,
} from "lucide-react";

interface JourneyTimelineProps {
  events?: UserJourneyEvent[];
  isLoading?: boolean;
}

const eventTypeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  page_view: { icon: Globe, color: "text-info-500", bg: "bg-info-50" },
  button_click: {
    icon: MousePointerClick,
    color: "text-primary-500",
    bg: "bg-primary-50",
  },
  form_submit: {
    icon: FileText,
    color: "text-success-500",
    bg: "bg-success-50",
  },
  api_call: { icon: Zap, color: "text-accent-500", bg: "bg-accent-50" },
  error: { icon: AlertCircle, color: "text-danger-500", bg: "bg-danger-50" },
  lead_created: {
    icon: MessageSquare,
    color: "text-success-500",
    bg: "bg-success-50",
  },
  gbp_post: {
    icon: Megaphone,
    color: "text-info-500",
    bg: "bg-info-50",
  },
  whatsapp_message: {
    icon: MessageSquare,
    color: "text-success-500",
    bg: "bg-success-50",
  },
};

function groupBySession(events: UserJourneyEvent[]): Map<string, UserJourneyEvent[]> {
  const groups = new Map<string, UserJourneyEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.session_id) || [];
    existing.push(event);
    groups.set(event.session_id, existing);
  }
  return groups;
}

export function JourneyTimeline({ events, isLoading }: JourneyTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="No journey data"
            description="This client hasn't generated any tracked events yet."
          />
        </CardContent>
      </Card>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Journey Timeline</CardTitle>
        <p className="text-sm text-muted">
          Last {events.length} tracked events
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {sorted.map((event) => {
              const config = eventTypeConfig[event.event_type] || {
                icon: Zap,
                color: "text-gray-500",
                bg: "bg-gray-50",
              };
              const Icon = config.icon;

              return (
                <div
                  key={event.id}
                  className="relative flex items-start gap-4 pl-2"
                >
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 rounded-badge bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text truncate">
                        {event.description}
                      </p>
                      <span className="shrink-0 text-xs text-muted">
                        {formatRelativeTime(event.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                      <span className="capitalize">
                        {event.event_type.replace("_", " ")}
                      </span>
                      {event.page && (
                        <>
                          <span>•</span>
                          <span>{event.page}</span>
                        </>
                      )}
                    </div>
                    {event.metadata &&
                      Object.keys(event.metadata).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(event.metadata)
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded-badge bg-white px-1.5 py-0.5 text-[10px] text-muted border border-gray-200"
                              >
                                {key}: {String(value).slice(0, 20)}
                              </span>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
