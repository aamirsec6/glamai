import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function formatRelativeTime(date: string | Date): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

export function getHealthBg(score: number): string {
  if (score >= 80) return "bg-success/10 border-success/20";
  if (score >= 50) return "bg-warning/10 border-warning/20";
  return "bg-danger/10 border-danger/20";
}

export function getHealthLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs Attention";
  return "At Risk";
}

export function getPlanColor(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "bg-primary-100 text-primary-700 border-primary-200";
    case "growth":
      return "bg-accent-100 text-accent-700 border-accent-200";
    case "starter":
      return "bg-info/10 text-info border-info/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
    case "won":
    case "published":
    case "healthy":
      return "bg-success/10 text-success border-success/20";
    case "new":
    case "contacted":
    case "draft":
    case "scheduled":
      return "bg-info/10 text-info border-info/20";
    case "quoted":
    case "negotiation":
    case "generating":
      return "bg-accent-100 text-accent-700 border-accent-200";
    case "lost":
    case "dropped":
    case "failed":
    case "at_risk":
    case "churned":
      return "bg-danger/10 text-danger border-danger/20";
    case "paused":
    case "needs_attention":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    interior_design: "Interior Design",
    dentist: "Dentist",
    salon: "Salon",
    gym: "Gym",
    architect: "Architect",
    photographer: "Photographer",
    restaurant: "Restaurant",
    other: "Other",
  };
  return labels[category] || category;
}

export function getBudgetLabel(budget: string): string {
  const labels: Record<string, string> = {
    under_3l: "Under ₹3L",
    "3l_5l": "₹3-5L",
    "5l_10l": "₹5-10L",
    "10l_20l": "₹10-20L",
    "20l_50l": "₹20-50L",
    above_50l: "₹50L+",
    unknown: "Unknown",
  };
  return labels[budget] || budget;
}

export function getScopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    full_home: "Full Home",
    office: "Office",
    kitchen: "Kitchen",
    bedroom: "Bedroom",
    living_room: "Living Room",
    bathroom: "Bathroom",
    commercial: "Commercial",
    renovation: "Renovation",
    unknown: "Unknown",
  };
  return labels[scope] || scope;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
