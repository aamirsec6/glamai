"use client";

import * as React from "react";
import { useOrgs, useAdminDashboard } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/card";
import { cn, getCategoryLabel, formatRelativeTime } from "@/lib/utils";
import {
  Map,
  Shield,
  AlertTriangle,
  MapPin,
  Globe,
  Tag,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import type { Org } from "@/types";

// ── Helpers ──

function getExclusivityBadge(exclusivity: string) {
  if (exclusivity === "exclusive") {
    return (
      <Badge variant="info">
        <Shield className="mr-1 h-3 w-3" />
        Exclusive
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Globe className="mr-1 h-3 w-3" />
      Standard
    </Badge>
  );
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "expired":
    case "conflict":
      return "danger";
    default:
      return "outline";
  }
}

// ── Generate territory-like data from orgs ──
interface TerritoryRow {
  clientId: string;
  clientName: string;
  city: string;
  category: string;
  radius: string;
  exclusivity: string;
  keywords: string[];
  status: string;
  created: string | null;
}

function buildTerritoryRows(orgs: Org[]): TerritoryRow[] {
  return orgs.map((org) => {
    const keywords: string[] = [];
    if (org.category) keywords.push(getCategoryLabel(org.category));
    if (org.city) keywords.push(org.city);
    if (org.plan && org.plan !== "free") keywords.push(`${org.plan} plan`);

    return {
      clientId: org.id,
      clientName: org.name,
      city: org.city || "—",
      category: org.category || "—",
      radius: `${Math.floor(Math.random() * 15 + 5)}km`, // placeholder
      exclusivity: org.exclusivity || "standard",
      keywords,
      status: org.is_active ? "active" : "pending",
      created: org.created_at,
    };
  });
}

// ── Conflict detection (simulated from org data) ──
interface Conflict {
  id: string;
  clientA: string;
  clientB: string;
  city: string;
  category: string;
  severity: "high" | "medium";
  description: string;
}

function detectConflicts(orgs: Org[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const exclusive = orgs.filter((o) => o.exclusivity === "exclusive");

  for (let i = 0; i < exclusive.length; i++) {
    for (let j = i + 1; j < exclusive.length; j++) {
      const a = exclusive[i];
      const b = exclusive[j];
      if (a.city === b.city && a.category === b.category) {
        conflicts.push({
          id: `${a.id}-${b.id}`,
          clientA: a.name,
          clientB: b.name,
          city: a.city || "",
          category: a.category || "",
          severity: "high",
          description: `Both "${a.name}" and "${b.name}" have exclusive claims in ${a.city} for ${getCategoryLabel(a.category || "")}`,
        });
      }
    }
  }

  return conflicts;
}

// ── Keyword Niche Map ──
interface KeywordNiche {
  keyword: string;
  clients: string[];
  totalClients: number;
}

function buildKeywordNiches(orgs: Org[]): KeywordNiche[] {
  const map = new Map<string, string[]>();

  orgs.forEach((org) => {
    const label = getCategoryLabel(org.category || "");
    if (label && label !== "—") {
      const existing = map.get(label) || [];
      existing.push(org.name);
      map.set(label, existing);
    }
    if (org.city) {
      const cityKey = `${org.city}`;
      const existing = map.get(cityKey) || [];
      existing.push(org.name);
      map.set(cityKey, existing);
    }
  });

  return Array.from(map.entries())
    .map(([keyword, clients]) => ({
      keyword,
      clients,
      totalClients: clients.length,
    }))
    .sort((a, b) => b.totalClients - a.totalClients)
    .slice(0, 12);
}

// ── Main Page ──

export default function TerritoriesPage() {
  const { data: orgsData, isLoading: orgsLoading } = useOrgs();
  const { data: dashData, isLoading: dashLoading } = useAdminDashboard();

  const orgs: Org[] = orgsData?.data || [];
  const dash = dashData?.data;
  const isLoading = orgsLoading || dashLoading;

  // ── Derived data ──
  const territoryRows = buildTerritoryRows(orgs);
  const conflicts = detectConflicts(orgs);
  const keywordNiches = buildKeywordNiches(orgs);

  const totalTerritories = orgs.length;
  const exclusiveCount = orgs.filter((o) => o.exclusivity === "exclusive").length;
  const conflictCount = conflicts.length;
  const citiesCovered = new Set(orgs.map((o) => o.city).filter(Boolean)).size;

  // ── Loading state ──
  if (isLoading && !orgsData && !dashData) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <div className="mt-6">
            <Skeleton className="h-80" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AdminHeader
          title="Territories"
          subtitle="Manage client territories and exclusivity"
        />

        <div className="p-6 space-y-6">
          {/* ── Row 1: Stat Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Territories"
              value={totalTerritories}
              icon={<Map className="h-5 w-5" />}
            />
            <StatCard
              label="Exclusive Territories"
              value={exclusiveCount}
              icon={<Shield className="h-5 w-5" />}
            />
            <StatCard
              label="Conflicts"
              value={conflictCount}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              label="Cities Covered"
              value={citiesCovered}
              icon={<Globe className="h-5 w-5" />}
            />
          </div>

          {/* ── Row 2: Conflict Warnings + Map Placeholder ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Conflict Warnings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                  Conflict Warnings
                </CardTitle>
                <CardDescription>
                  Overlapping exclusive territory claims that need resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : conflicts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-10 w-10 text-success mb-3" />
                    <p className="text-sm font-medium text-foreground">No conflicts detected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All territory claims are currently non-overlapping.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className={cn(
                          "rounded-lg border p-3",
                          conflict.severity === "high"
                            ? "border-danger/30 bg-danger/5"
                            : "border-warning/30 bg-warning/5"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={cn(
                              "h-4 w-4 mt-0.5 shrink-0",
                              conflict.severity === "high" ? "text-danger" : "text-warning"
                            )}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {conflict.clientA} ↔ {conflict.clientB}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {conflict.description}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant={conflict.severity === "high" ? "danger" : "warning"} className="capitalize">
                                {conflict.severity} severity
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {getCategoryLabel(conflict.category)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Territory Map
                </CardTitle>
                <CardDescription>Visual overview of all claimed territories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-muted/30">
                  <div className="rounded-full bg-primary/10 p-4 mb-3">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Map View — Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
                    Interactive territory visualization with conflict overlays and keyword heatmaps.
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span>Standard</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-info" />
                      <span>Exclusive</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-danger" />
                      <span>Conflict</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Territory List Table ── */}
          <Card>
            <CardHeader>
              <CardTitle>All Territories</CardTitle>
              <CardDescription>
                Complete list of client territory claims and their parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : territoryRows.length === 0 ? (
                <EmptyState
                  icon={<Map className="h-8 w-8" />}
                  title="No territories found"
                  description="Territories will appear here once clients claim their areas."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Radius</TableHead>
                      <TableHead>Exclusivity</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {territoryRows.map((row) => (
                      <TableRow key={row.clientId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {row.clientName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <span className="truncate max-w-[140px]">{row.clientName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {row.city}
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryLabel(row.category)}</TableCell>
                        <TableCell className="text-muted-foreground">{row.radius}</TableCell>
                        <TableCell>{getExclusivityBadge(row.exclusivity)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.keywords.slice(0, 3).map((kw) => (
                              <Badge key={kw} variant="outline" className="text-[10px]">
                                <Tag className="mr-0.5 h-2.5 w-2.5" />
                                {kw}
                              </Badge>
                            ))}
                            {row.keywords.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{row.keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(row.status)}
                            className="capitalize"
                          >
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* ── Row 4: Keyword Niche Map ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Keyword Niche Map
              </CardTitle>
              <CardDescription>
                Which keywords and niches are assigned to which clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-32" />
                  ))}
                </div>
              ) : keywordNiches.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  No keyword niche data available yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {keywordNiches.map((niche) => (
                    <div
                      key={niche.keyword}
                      className="rounded-lg border border-border p-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">
                          {niche.keyword}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {niche.totalClients} client{niche.totalClients !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {niche.clients.slice(0, 4).map((client) => (
                          <div
                            key={client}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                            <span className="truncate">{client}</span>
                          </div>
                        ))}
                        {niche.clients.length > 4 && (
                          <p className="text-[10px] text-muted-foreground pl-3">
                            +{niche.clients.length - 4} more
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
