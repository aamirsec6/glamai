"use client";

import * as React from "react";
import ApiClient, { useGbpCompetitors, useGbpRankings, useSeoScorecard } from "@/lib/api";
import type { SeoScorecard } from "@/lib/api/seo";
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
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientPageHeader } from "@/components/client/page-header";
import { AlertBanner } from "@/components/client/alert-banner";
import { OrgEmptyState } from "@/components/client/org-empty-state";
import { Loader2, RefreshCw, TrendingUp, MapPin, Target } from "lucide-react";

export default function ClientGrowthPage() {
  const { orgId } = useOrgId();
  const { data: scorecardData, mutate: refreshScorecard, isLoading } = useSeoScorecard(orgId || "");
  const { data: rankingsData, mutate: refreshRankings } = useGbpRankings(orgId || "");
  const { data: competitorsData, mutate: refreshCompetitors } = useGbpCompetitors(orgId || "");
  const [running, setRunning] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<Record<string, unknown> | null>(null);
  const [banner, setBanner] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const scorecard = scorecardData?.data as SeoScorecard | undefined;
  const summary = scorecard?.summary;
  const lastSummary = (lastRun?.summary as Record<string, unknown> | undefined) ?? null;

  React.useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiClient.getLastGrowthRun(orgId);
        if (!cancelled && res.data) setLastRun(res.data);
      } catch {
        /* optional cache */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const handleRefresh = async () => {
    await Promise.all([refreshScorecard(), refreshRankings(), refreshCompetitors()]);
  };

  const handleRunGrowth = async () => {
    if (!orgId) return;
    setRunning(true);
    setBanner(null);
    try {
      const res = await ApiClient.runGrowthAgents(orgId);
      setLastRun(res.data);
      const s = (res.data?.summary as Record<string, number> | undefined) ?? {};
      setBanner({
        type: "success",
        text: `Pipeline complete — Scout, Sage, Spark & Ruby ran. Posts: ${s.posts_created ?? 0}, Top‑3 keywords: ${s.in_top3 ?? 0}, Review asks: ${s.review_requests_sent ?? 0}.`,
      });
      await handleRefresh();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : "Growth agent run failed" });
    } finally {
      setRunning(false);
    }
  };

  if (!orgId) {
    return (
      <div className="py-8">
        <OrgEmptyState
          title="Growth agents"
          description="Load a business account to track rankings and run SEO automation."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Growth"
        description="Track your Path to Top 3 on Google Maps and run weekly SEO automation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleRunGrowth} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Run growth agents
                </>
              )}
            </Button>
          </div>
        }
      />

      {banner && (
        <AlertBanner variant={banner.type} message={banner.text} onDismiss={() => setBanner(null)} />
      )}

      {lastSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last growth pipeline</CardTitle>
            <CardDescription>
              Geo → SEO → Content → Review requests (saved after each run)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Keywords</p>
              <p className="font-semibold">{String(lastSummary.keywords_assigned ?? "—")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">In top 3</p>
              <p className="font-semibold">{String(lastSummary.in_top3 ?? "—")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Posts created</p>
              <p className="font-semibold">{String(lastSummary.posts_created ?? "—")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Review requests</p>
              <p className="font-semibold">{String(lastSummary.review_requests_sent ?? "—")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {scorecard?.tracking_status === "not_configured" && (
        <AlertBanner
          variant="warning"
          message="Automated rank tracking needs SERPAPI_KEY on the server. You can still run growth agents and add rankings manually from the GBP page."
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Keywords tracked" value={summary?.keywords_tracked ?? 0} icon={<Target className="h-5 w-5" />} />
            <StatCard label="In top 3" value={summary?.in_top3 ?? 0} icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard
              label="Avg position"
              value={summary?.avg_position != null ? `#${summary.avg_position}` : "—"}
              icon={<MapPin className="h-5 w-5" />}
            />
            <StatCard label="Progress" value={`${summary?.progress_pct ?? 0}%`} icon={<TrendingUp className="h-5 w-5" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Path to Top 3
            </CardTitle>
            <CardDescription>
              Weekly scorecard — we guarantee optimization effort, not specific rankings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scorecard?.keywords && scorecard.keywords.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Keyword</th>
                      <th className="px-4 py-3 font-medium">Position</th>
                      <th className="px-4 py-3 font-medium">Change</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.keywords.map((row) => (
                      <tr key={row.keyword} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-foreground">{row.keyword}</td>
                        <td className="px-4 py-3">{row.position != null ? `#${row.position}` : "20+"}</td>
                        <td className="px-4 py-3">
                          {row.delta != null ? (
                            <span className={row.delta > 0 ? "text-success" : row.delta < 0 ? "text-destructive" : ""}>
                              {row.delta > 0 ? `+${row.delta}` : row.delta}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.in_top3 ? "default" : "outline"}>
                            {row.in_top3 ? "Top 3" : "Pushing"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Target className="h-8 w-8" />}
                title="No ranking data yet"
                description="Click Run growth agents to assign keywords and start tracking."
                action={
                  <Button size="sm" onClick={handleRunGrowth} disabled={running}>
                    Run growth agents
                  </Button>
                }
              />
            )}

            {scorecard?.recommended_actions && scorecard.recommended_actions.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground">This week&apos;s SEO actions</p>
                <ul className="space-y-2">
                  {scorecard.recommended_actions.slice(0, 5).map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>
                        <Badge variant="outline" className="mr-2 capitalize">
                          {action.type?.replace(/_/g, " ")}
                        </Badge>
                        {action.reason}
                        {action.keyword && (
                          <span className="text-muted-foreground"> — {action.keyword}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Local competitors
            </CardTitle>
            <CardDescription>Businesses near you on Google Maps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(competitorsData?.data?.length ?? 0) > 0 ? (
              competitorsData?.data?.slice(0, 5).map(
                (c: { id: string; name: string; avg_rating?: number; review_count?: number }) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.avg_rating != null ? `★ ${c.avg_rating}` : "—"}
                      {c.review_count != null ? ` · ${c.review_count} reviews` : ""}
                    </span>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-muted-foreground">Run growth agents to sync nearby competitors.</p>
            )}
            {lastRun?.geo && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Keywords assigned:{" "}
                {(
                  (lastRun.geo as { geo_brief?: { keywords_assigned?: string[] } }).geo_brief
                    ?.keywords_assigned ?? []
                ).join(", ") || "—"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rank history</CardTitle>
            <CardDescription>Most recent tracked positions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(rankingsData?.data?.length ?? 0) > 0 ? (
              rankingsData?.data?.slice(0, 8).map(
                (r: { id: string; keyword: string; position?: number; source?: string }) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                    <span>{r.keyword}</span>
                    <span className="text-muted-foreground">
                      {r.position != null ? `#${r.position}` : "—"}
                      {r.source ? ` · ${r.source}` : ""}
                    </span>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-muted-foreground">No ranking history yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
