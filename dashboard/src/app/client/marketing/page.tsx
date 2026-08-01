"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, MapPin, Sparkles, Bot } from "lucide-react";
import { ClientPageHeader } from "@/components/client/page-header";
import { MARKETING_HUB_ITEMS } from "@/lib/client-nav";

const ICONS = {
  "/client/growth": TrendingUp,
  "/client/gbp": MapPin,
  "/client/insights": Sparkles,
  "/client/ai": Bot,
} as const;

export default function MarketingHubPage() {
  return (
    <div className="space-y-8">
      <ClientPageHeader
        title="Marketing"
        description="Everything that grows your visibility — rankings, Google Profile, insights, and AI content."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {MARKETING_HUB_ITEMS.map((item) => {
          const Icon = ICONS[item.href as keyof typeof ICONS];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[8rem] flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-border hover:bg-muted/40 hover:shadow-md"
            >
              <div className={`mb-4 inline-flex w-fit rounded-xl border p-3 ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{item.label}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground transition-all group-hover:gap-2">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-6">
        <h3 className="font-medium text-foreground">Not sure where to start?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Check <strong>Rankings & SEO</strong> for your weekly scorecard, or <strong>Google Profile</strong> to sync views and posts.
        </p>
      </div>
    </div>
  );
}
