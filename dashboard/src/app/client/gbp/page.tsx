"use client";

import * as React from "react";
import { useGbpPosts, useGbpRankings } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/card";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { GbpPost, GbpRanking, GbpCompetitor } from "@/types";
import {
  Eye,
  MapPin,
  MousePointerClick,
  PhoneCall,
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Sparkles,
  Star,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Mock data (replace with API call when available) ── */

const MOCK_CONNECTED = true;
const MOCK_LAST_SYNC = "2026-06-09T08:30:00Z";
const MOCK_PLACE_ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

const MOCK_INSIGHTS = {
  searchViews: 3420,
  mapsViews: 1850,
  websiteClicks: 214,
  calls: 47,
  directionRequests: 32,
};

const MOCK_COMPETITORS: GbpCompetitor[] = [
  {
    id: "comp-1",
    org_id: "demo-org-id",
    name: "Smile Dental Clinic",
    category: "dentist",
    city: "Mumbai",
    distance_km: 0.8,
    is_glamai_client: false,
    review_count: 142,
    avg_rating: 4.7,
  },
  {
    id: "comp-2",
    org_id: "demo-org-id",
    name: "Bright Dental Care",
    category: "dentist",
    city: "Mumbai",
    distance_km: 1.2,
    is_glamai_client: false,
    review_count: 89,
    avg_rating: 4.5,
  },
  {
    id: "comp-3",
    org_id: "demo-org-id",
    name: "Perfect Smile",
    category: "dentist",
    city: "Mumbai",
    distance_km: 2.1,
    is_glamai_client: true,
    review_count: 56,
    avg_rating: 4.3,
  },
];

/* ── Helpers ── */

function positionColor(pos?: number) {
  if (!pos) return "text-muted-foreground";
  if (pos <= 3) return "text-success";
  if (pos <= 10) return "text-warning";
  return "text-danger";
}

function TrendArrow({ position }: { position?: number }) {
  if (!position || position === 0) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (position > 0) {
    return <TrendingUp className="h-4 w-4 text-success" />;
  }
  return <TrendingDown className="h-4 w-4 text-danger" />;
}

/* ── Page ── */

export default function ClientGbpPage() {
  const orgId = "demo-org-id";
  const { data: postsData, isLoading: postsLoading } = useGbpPosts(orgId);
  const { data: rankingsData, isLoading: rankingsLoading } =
    useGbpRankings(orgId);

  const posts: GbpPost[] = postsData?.data ?? [];
  const rankings: GbpRanking[] = rankingsData?.data ?? [];
  const isLoading = postsLoading || rankingsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Google Business Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Insights, posts, and local SEO performance
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Now
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "rounded-full p-2",
                  MOCK_CONNECTED ? "bg-success/10" : "bg-danger/10"
                )}
              >
                {MOCK_CONNECTED ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-danger" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {MOCK_CONNECTED
                    ? "Google Business Profile Connected"
                    : "Google Business Profile Disconnected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last synced {formatRelativeTime(MOCK_LAST_SYNC)} &middot;
                  Place ID: {truncate(MOCK_PLACE_ID, 16)}
                </p>
              </div>
            </div>
            <StatusBadge status={MOCK_CONNECTED ? "connected" : "disconnected"} />
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Search Views"
          value={MOCK_INSIGHTS.searchViews.toLocaleString()}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Maps Views"
          value={MOCK_INSIGHTS.mapsViews.toLocaleString()}
          icon={<MapPin className="h-5 w-5" />}
        />
        <StatCard
          label="Website Clicks"
          value={MOCK_INSIGHTS.websiteClicks}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          label="Calls"
          value={MOCK_INSIGHTS.calls}
          icon={<PhoneCall className="h-5 w-5" />}
        />
        <StatCard
          label="Direction Requests"
          value={MOCK_INSIGHTS.directionRequests}
          icon={<Navigation className="h-5 w-5" />}
        />
      </div>

      {/* Recent Posts & Keyword Rankings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Posts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>
              Your Google Business Profile posts and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No posts yet"
                description="AI-generated posts will appear here once you complete onboarding."
              />
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {post.title || truncate(post.content, 60)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                      <StatusBadge status={post.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {post.clicks ?? 0}
                      </span>
                      {post.ai_generated && (
                        <span className="flex items-center gap-1 text-primary">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </span>
                      )}
                      <span>
                        {post.published_at
                          ? formatRelativeTime(post.published_at)
                          : formatRelativeTime(post.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Keyword Rankings</CardTitle>
            <CardDescription>
              Your local search rankings for target keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-8 w-8" />}
                title="No ranking data yet"
                description="Keyword rankings will appear here after your first week."
              />
            ) : (
              <div className="space-y-2">
                {rankings.map((ranking) => (
                  <div
                    key={ranking.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {ranking.keyword}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ranking.search_city} &middot;{" "}
                        {formatRelativeTime(ranking.recorded_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <TrendArrow position={ranking.position} />
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          positionColor(ranking.position)
                        )}
                      >
                        #{ranking.position ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitor Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Competitor Summary</CardTitle>
          <CardDescription>
            Local competitors in your territory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {MOCK_COMPETITORS.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No competitors tracked"
              description="Competitor data will appear here once your territory is set."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_COMPETITORS.map((comp) => (
                <div
                  key={comp.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {comp.name}
                    </p>
                    {comp.is_glamai_client && (
                      <Badge variant="info" className="text-xs shrink-0 ml-2">
                        GlamAI
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {comp.distance_km !== undefined && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {comp.distance_km} km
                      </span>
                    )}
                    {comp.review_count !== undefined && (
                      <span>{comp.review_count} reviews</span>
                    )}
                    {comp.avg_rating !== undefined && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {comp.avg_rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
