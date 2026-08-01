"use client";

import * as React from "react";
import ApiClient, { useAnalyticsSnapshot, useGbpPosts } from "@/lib/api";
import type { GbpPost } from "@/types";
import { useOrgId } from "@/lib/org-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PostImage } from "@/components/post-image";
import { ClientPageHeader } from "@/components/client/page-header";
import {
  Sparkles,
  BarChart3,
  FileText,
  Loader2,
  RefreshCw,
  MessageSquare,
  UserCircle,
  ImageIcon,
} from "lucide-react";

type AnalysisData = {
  scores?: {
    overall?: number;
    lead_generation?: number;
    gbp_visibility?: number;
    content_cadence?: number;
  };
  recommendations?: string[];
  anomalies?: string[];
  narrative?: string;
  guarantee_progress?: {
    leads_generated?: number;
    leads_target?: number;
    posts_delivered?: number;
    posts_target?: number;
  };
};

type AgentRunResult = {
  summary?: {
    posts_created?: number;
    posts_scheduled?: number;
    reviews_replied?: number;
    profile_optimized?: boolean;
    analysis_score?: number;
  };
  analysis?: AnalysisData;
  posts?: {
    posts_created?: number;
    posts_scheduled?: number;
    drafts?: Array<{
      content?: string;
      title?: string;
      keyword_target?: string;
      image_url?: string;
    }>;
  };
  profile?: {
    status?: string;
    profile?: {
      optimized_description?: string;
      optimization_score?: number;
    };
  };
  reviews?: {
    replied?: number;
    processed?: number;
  };
  errors?: string[];
};

type ImagePostResult = {
  title?: string;
  content?: string;
  image_url?: string;
  keyword_target?: string;
};

export default function ClientAiPage() {
  const { orgId, setOrgId } = useOrgId();
  const { data: analyticsData, mutate: refreshAnalytics, isLoading } = useAnalyticsSnapshot(
    orgId || "",
  );
  const { data: postsData, mutate: refreshPosts } = useGbpPosts(orgId || "");
  const [running, setRunning] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<AgentRunResult | null>(null);
  const [imagePost, setImagePost] = React.useState<ImagePostResult | null>(null);
  const [generatingImage, setGeneratingImage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const analytics = analyticsData?.data as AnalysisData | undefined;

  const handleSeedDemo = async () => {
    setSeeding(true);
    setError(null);
    try {
      const result = await ApiClient.seedDemoAccount(true);
      setOrgId(result.org_id);
      await refreshAnalytics();
      await refreshPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo account");
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerateImagePost = async () => {
    if (!orgId) return;
    setGeneratingImage(true);
    setError(null);
    try {
      const res = await ApiClient.generateImagePost(orgId, {
        post_type: "portfolio_showcase",
      });
      setImagePost(res.data.post ?? null);
      await refreshPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image post generation failed");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleRunAgents = async () => {
    if (!orgId) {
      await handleSeedDemo();
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await ApiClient.runContentAgents(orgId, {
        include_analysis: true,
        generate_posts: true,
        post_count: 4,
        optimize_profile: true,
        auto_reply_reviews: true,
        schedule_posts: true,
      });
      setLastRun(res.data as AgentRunResult);
      await refreshAnalytics();
      await refreshPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent run failed");
    } finally {
      setRunning(false);
    }
  };

  if (!orgId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-primary" />
        <ClientPageHeader
          title="AI Content"
          description="Load the demo account to run autonomous marketing agents — posts, profile, reviews, and analysis."
          className="border-0 pb-0"
        />
        <Button onClick={handleSeedDemo} disabled={seeding} className="min-h-11">
          {seeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading demo…
            </>
          ) : (
            "Load Demo Account"
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const summary = lastRun?.summary;

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="AI Content"
        description="Create GBP posts, optimize your profile, reply to reviews, and analyze performance."
        actions={
          <>
            <Button variant="outline" onClick={() => refreshAnalytics()} disabled={isLoading} className="min-h-11">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateImagePost}
              disabled={generatingImage || running}
              className="min-h-11"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating image…
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image Post
                </>
              )}
            </Button>
            <Button onClick={handleRunAgents} disabled={running || generatingImage} className="min-h-11">
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running agents…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run All Agents
                </>
              )}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AgentStat label="Posts created" value={summary.posts_created ?? 0} />
          <AgentStat label="Scheduled" value={summary.posts_scheduled ?? 0} />
          <AgentStat label="Reviews replied" value={summary.reviews_replied ?? 0} />
          <AgentStat
            label="Profile"
            value={summary.profile_optimized ? "Optimized" : "—"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <ScoreCard label="Overall" value={analytics?.scores?.overall} />
            <ScoreCard label="Leads" value={analytics?.scores?.lead_generation} />
            <ScoreCard label="GBP Visibility" value={analytics?.scores?.gbp_visibility} />
            <ScoreCard label="Content" value={analytics?.scores?.content_cadence} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Image Post
            </CardTitle>
            <CardDescription>AI-generated marketing image with GBP caption</CardDescription>
          </CardHeader>
          <CardContent>
            {imagePost?.image_url ? (
              <div className="grid gap-4 md:grid-cols-2">
                <PostImage
                  src={imagePost.image_url}
                  alt={imagePost.title || "Generated marketing image"}
                  className="aspect-square w-full rounded-lg border border-border"
                />
                <div className="space-y-3">
                  {imagePost.title && (
                    <p className="text-lg font-semibold text-foreground">{imagePost.title}</p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{imagePost.content}</p>
                  {imagePost.keyword_target && (
                    <Badge variant="outline">{imagePost.keyword_target}</Badge>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<ImageIcon className="h-8 w-8" />}
                title="No image post yet"
                description='Click "Image Post" to generate a visual GBP post with an AI-written caption.'
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analysis Agent
            </CardTitle>
            <CardDescription>Scores, recommendations, and AI narrative</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.narrative || lastRun?.analysis?.narrative ? (
              <p className="text-sm leading-relaxed text-foreground">
                {lastRun?.analysis?.narrative || analytics?.narrative}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run agents to generate an AI-written business summary.
              </p>
            )}
            {analytics?.recommendations && analytics.recommendations.length > 0 && (
              <ul className="space-y-2">
                {analytics.recommendations.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Content Agent
            </CardTitle>
            <CardDescription>AI-drafted GBP posts from your latest run</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastRun?.posts?.drafts && lastRun.posts.drafts.length > 0 ? (
              lastRun.posts.drafts.map((draft, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                  {"image_url" in draft && draft.image_url && (
                    <PostImage
                      src={draft.image_url as string}
                      className="mb-3 aspect-video w-full rounded-md"
                    />
                  )}
                  {draft.title && (
                    <p className="mb-1 text-sm font-semibold text-foreground">{draft.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {draft.content}
                  </p>
                  {draft.keyword_target && (
                    <Badge variant="outline" className="mt-2">
                      {draft.keyword_target}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No new drafts yet"
                description="Click Run All Agents to create and schedule GBP posts."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              Profile Agent
            </CardTitle>
            <CardDescription>Optimized Google Business Profile description</CardDescription>
          </CardHeader>
          <CardContent>
            {lastRun?.profile?.profile?.optimized_description ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {lastRun.profile.profile.optimized_description}
                </p>
                {lastRun.profile.profile.optimization_score != null && (
                  <Badge variant="outline">
                    Score: {lastRun.profile.profile.optimization_score}/100
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run agents to generate an SEO-optimized profile description.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Review Agent
            </CardTitle>
            <CardDescription>Auto-replies to pending Google reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {lastRun?.reviews ? (
              <p className="text-sm text-foreground">
                Replied to{" "}
                <span className="font-semibold">{lastRun.reviews.replied ?? 0}</span> of{" "}
                {lastRun.reviews.processed ?? 0} pending reviews.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run agents to auto-reply to reviews with AI-generated responses.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(postsData?.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All GBP Posts</CardTitle>
            <CardDescription>{postsData?.data?.length} posts in your library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {postsData?.data?.slice(0, 8).map((post: GbpPost) => (
              <div
                key={post.id}
                className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0"
              >
                {post.image_url && (
                  <PostImage
                    src={post.image_url}
                    className="h-14 w-14 shrink-0 rounded-md"
                    imgClassName="rounded-md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {post.title || "Untitled post"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {post.full_content || post.content}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {post.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold text-foreground">
          {value !== undefined ? Math.round(value) : "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function AgentStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
