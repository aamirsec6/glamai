"use client";

import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useOrgs } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2, Mail, Phone } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Org } from "@/types";

export default function AdminClientsPage() {
  const { data, isLoading } = useOrgs({ page_size: 100 });
  const orgs: Org[] = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <AdminHeader
        title="Clients"
        subtitle={`${orgs.length} tenant${orgs.length === 1 ? "" : "s"} on the platform`}
      />
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No clients yet"
            description="Organizations appear here after client onboarding signup."
          />
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <Link key={org.id} href={`/admin/clients/${org.id}`}>
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {org.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {org.city} · {org.category?.replace(/_/g, " ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {org.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {org.email}
                          </span>
                        )}
                        {org.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {org.phone}
                          </span>
                        )}
                        {org.created_at && (
                          <span>
                            Joined {formatRelativeTime(org.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="outline" className="capitalize">
                        {org.plan}
                      </Badge>
                      <Badge
                        variant={
                          org.onboarding_status === "active" ? "success" : "warning"
                        }
                        className="capitalize"
                      >
                        {org.onboarding_status?.replace(/_/g, " ")}
                      </Badge>
                      {org.gbp_place_id && (
                        <Badge variant="info">GBP linked</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
