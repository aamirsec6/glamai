"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import * as React from "react";
import ApiClient, {
  useGbpPosts,
  useGbpRankings,
  useGbpConnection,
  useGbpInsights,
  useGbpCompetitors,
  useIntegrationHealth,
} from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { PostImage } from "@/components/post-image";

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

export default function ClientGbpPage() {
  const { orgId } = useOrgId();
  const [syncing, setSyncing] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const { data: postsData, isLoading: postsLoading, mutate: mutatePosts } = useGbpPosts(orgId || "");
  const { data: rankingsData, isLoading: rankingsLoading } =
    useGbpRankings(orgId || "");
  const { data: connectionData, mutate: mutateConnection } = useGbpConnection(orgId || "");
  const { data: insightsData, mutate: mutateInsights } = useGbpInsights(orgId || "");
  const { data: healthData } = useIntegrationHealth(orgId || "");
  const { data: competitorsData, mutate: mutateCompetitors } = useGbpCompetitors(orgId || "");

  const connectorHealth: { provider: string; status: string; message?: string }[] =
    healthData?.data ?? [];
  const healthColor = (status: string) => {
    if (status === "connected" || status === "ready") return "bg-success/10 text-success border-success/20";
    if (status === "configured") return "bg-warning/10 text-warning border-warning/20";
    if (status === "skipped") return "bg-muted text-muted-foreground";
    return "bg-danger/10 text-danger border-danger/20";
  };

  const handleSync = async () => {
    if (!orgId) return;
    setSyncing(true);
    try {
      await ApiClient.syncGbp(orgId);
      setTimeout(() => {
        mutateConnection();
        mutateInsights();
        mutateCompetitors();
        mutatePosts();
      }, 3000);
    } finally {
      setSyncing(false);
    }
  };

  const handleGeneratePosts = async () => {
    if (!orgId) return;
    setGenerating(true);
    try {
      await ApiClient.generateGbpPosts(orgId);
      setTimeout(() => mutatePosts(), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleConnect = () => {
    if (!orgId) return;
    window.location.href = ApiClient.getGbpOAuthUrl(orgId);
  };

  const connected = connectionData?.data?.connected ?? false;
  const lastSync = connectionData?.data?.last_synced_at;
  const placeId = connectionData?.data?.place_id;
  const insights = insightsData?.data;
  const competitors: GbpCompetitor[] = competitorsData?.data ?? [];
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
        <div className="flex gap-2">
          {!connected && orgId && (
            <Button size="sm" onClick={handleConnect}>
              Connect Google
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePosts}
            disabled={!orgId || generating}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? "Generating…" : "Generate Posts"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!orgId || syncing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "rounded-full p-2",
                  connected ? "bg-success/10" : "bg-danger/10"
                )}
              >
                {connected ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-danger" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {connected
                    ? "Google Business Profile Connected"
                    : "Google Business Profile Disconnected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastSync ? `Last synced ${formatRelativeTime(lastSync)}` : "Not synced yet"}
                  {placeId ? ` · Place ID: ${truncate(placeId, 16)}` : ""}
                </p>
              </div>
            </div>
            <StatusBadge status={connected ? "connected" : "disconnected"} />
          </div>
        </CardContent>
      </Card>

      {/* Connector health */}
      {connectorHealth.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Data connectors</p>
            <div className="flex flex-wrap gap-2">
              {connectorHealth.map((c) => (
                <Badge
                  key={c.provider}
                  variant="outline"
                  className={cn("text-xs capitalize", healthColor(c.status))}
                  title={c.message}
                >
                  {c.provider.replace("_", " ")} · {c.status}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Search Views"
          value={(insights?.search_views ?? 0).toLocaleString()}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Maps Views"
          value={(insights?.maps_views ?? 0).toLocaleString()}
          icon={<MapPin className="h-5 w-5" />}
        />
        <StatCard
          label="Website Clicks"
          value={insights?.website_clicks ?? 0}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          label="Calls"
          value={insights?.calls ?? 0}
          icon={<PhoneCall className="h-5 w-5" />}
        />
        <StatCard
          label="Direction Requests"
          value={insights?.direction_requests ?? 0}
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
                    {post.image_url && (
                      <PostImage
                        src={post.image_url}
                        className="mb-3 aspect-video w-full rounded-md"
                      />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {post.title || truncate(post.content, 60)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {post.full_content || post.content}
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
                          : post.created_at
                            ? formatRelativeTime(post.created_at)
                            : "—"}
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
          {competitors.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No competitors tracked"
              description="Competitor data will appear here once your territory is set."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {competitors.map((comp) => (
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
