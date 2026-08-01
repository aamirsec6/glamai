import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  FileText,
  Settings,
  Bot,
} from "lucide-react";

export type ClientNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type ClientNavSection = {
  title: string;
  items: ClientNavItem[];
};

/** Simplified nav — Marketing hub groups Growth, GBP, Insights, and AI Studio */
export const CLIENT_NAV: ClientNavSection[] = [
  {
    title: "Menu",
    items: [
      { href: "/client", label: "Home", icon: LayoutDashboard, description: "Your business at a glance" },
      { href: "/client/agents", label: "Agents", icon: Bot, description: "Scout, Sage, Spark & the cast" },
      { href: "/client/leads", label: "Leads", icon: Users, description: "Incoming inquiries" },
      { href: "/client/marketing", label: "Marketing", icon: Megaphone, description: "Rankings, Google Profile & AI" },
      { href: "/client/reports", label: "Reports", icon: FileText, description: "Monthly performance" },
      { href: "/client/settings", label: "Settings", icon: Settings, description: "Plan & connections" },
    ],
  },
];

export const MARKETING_HUB_ITEMS = [
  {
    href: "/client/growth",
    label: "Rankings & SEO",
    description: "Path to Top 3 scorecard and weekly actions",
    color: "bg-info/10 text-info border-info/20",
  },
  {
    href: "/client/gbp",
    label: "Google Profile",
    description: "Posts, insights, and review QR code",
    color: "bg-success/10 text-success border-success/20",
  },
  {
    href: "/client/insights",
    label: "Business Insights",
    description: "Funnel, forecast, and competitor analysis",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  {
    href: "/client/ai",
    label: "AI Content",
    description: "Generate posts and auto-reply to reviews",
    color: "bg-warning/10 text-foreground border-warning/20",
  },
] as const;

/** Primary destinations for the mobile bottom tab bar */
export const MOBILE_TAB_HREFS = [
  "/client",
  "/client/leads",
  "/client/marketing",
  "/client/agents",
] as const;

export const MARKETING_CHILD_PATHS = [
  "/client/growth",
  "/client/gbp",
  "/client/insights",
  "/client/ai",
] as const;

export function isClientNavActive(pathname: string, href: string): boolean {
  if (href === "/client") return pathname === "/client";
  if (href === "/client/marketing") {
    return (
      pathname === href ||
      pathname.startsWith(href + "/") ||
      MARKETING_CHILD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export const CLIENT_PAGE_META: Record<string, { title: string; description: string }> = {
  "/client": {
    title: "Home",
    description: "Leads, visibility, and what to do next — in one place.",
  },
  "/client/agents": {
    title: "Agents",
    description: "Command center for Scout, Sage, Spark, Maya, Ruby, and Cleo.",
  },
  "/client/leads": {
    title: "Leads",
    description: "Track and update every inquiry from WhatsApp and Google.",
  },
  "/client/marketing": {
    title: "Marketing",
    description: "Rankings, Google Profile, insights, and AI content tools.",
  },
  "/client/gbp": {
    title: "Google Profile",
    description: "Posts, rankings, and competitor data from your GBP.",
  },
  "/client/growth": {
    title: "Rankings & SEO",
    description: "Path to Top 3 scorecard and weekly SEO actions.",
  },
  "/client/insights": {
    title: "Insights",
    description: "Funnel, forecast, and competitive analysis from live data.",
  },
  "/client/ai": {
    title: "AI Content",
    description: "Run agents for posts, profile, and reviews.",
  },
  "/client/reports": {
    title: "Reports",
    description: "Monthly value reports delivered to your inbox.",
  },
  "/client/settings": {
    title: "Settings",
    description: "Plan, notifications, territory, and connected accounts.",
  },
  "/client/onboarding": {
    title: "Setup",
    description: "Connect GBP, WhatsApp, and claim your territory.",
  },
};

export function getClientPageMeta(pathname: string) {
  if (CLIENT_PAGE_META[pathname]) return CLIENT_PAGE_META[pathname];
  for (const [path, meta] of Object.entries(CLIENT_PAGE_META)) {
    if (path !== "/client" && pathname.startsWith(path)) return meta;
  }
  return { title: "Qimma", description: "" };
}
