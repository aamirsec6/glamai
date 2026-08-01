import type { AgentCastMember } from "@/lib/marketing-content";
import { AGENT_CAST } from "@/lib/marketing-content";

export type AgentRuntimeStatus = "idle" | "ok" | "attention" | "listening" | "unknown";

export type AgentCommandCard = {
  agent: AgentCastMember;
  status: AgentRuntimeStatus;
  statusLabel: string;
  lastAction: string;
  href: string;
};

type GrowthRun = Record<string, unknown> | null | undefined;

function errorsFor(errors: unknown, prefixes: string[]): boolean {
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (e) => typeof e === "string" && prefixes.some((p) => e.toLowerCase().startsWith(p)),
  );
}

/** Shorten raw SQL / stack traces for banners */
export function formatAgentErrors(errors: unknown, limit = 2): string {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  const short = errors.slice(0, limit).map((e) => {
    const s = String(e);
    const head = s.split("\n")[0] ?? s;
    return head.length > 120 ? `${head.slice(0, 117)}…` : head;
  });
  const more = errors.length > limit ? "…" : "";
  return `${short.join("; ")}${more}`;
}

/** Map last growth run + light context into cast cards for the command center */
export function buildAgentCommandCards(
  lastRun: GrowthRun,
  opts?: {
    leadsTotal?: number;
    gbpConnected?: boolean;
    scorecardInTop3?: number | null;
  },
): AgentCommandCard[] {
  const summary = (lastRun?.summary as Record<string, unknown> | undefined) ?? {};
  const errors = lastRun?.errors;
  const hasRun = !!lastRun;

  const keywords = Number(summary.keywords_assigned ?? 0);
  const inTop3 = Number(
    summary.in_top3 ?? opts?.scorecardInTop3 ?? 0,
  );
  const posts = Number(summary.posts_created ?? 0);
  const replies = Number(summary.reviews_replied ?? 0);
  const reviewAsks = Number(summary.review_requests_sent ?? 0);
  const leads = opts?.leadsTotal ?? 0;

  return AGENT_CAST.map((agent) => {
    switch (agent.id) {
      case "geo": {
        const bad = errorsFor(errors, ["geo", "keywords"]);
        return {
          agent,
          status: bad ? "attention" : hasRun ? "ok" : "idle",
          statusLabel: bad ? "Needs attention" : hasRun ? "Ready" : "Waiting for first run",
          lastAction: hasRun
            ? keywords > 0
              ? `Assigned ${keywords} keyword${keywords === 1 ? "" : "s"}`
              : "Territory / geo brief updated"
            : "Maps territory & competitors",
          href: "/client/growth",
        };
      }
      case "seo": {
        const bad = errorsFor(errors, ["seo"]);
        return {
          agent,
          status: bad ? "attention" : hasRun ? "ok" : "idle",
          statusLabel: bad ? "Needs attention" : hasRun ? "Tracking" : "Waiting for first run",
          lastAction: hasRun
            ? `${inTop3} keyword${inTop3 === 1 ? "" : "s"} in top 3`
            : "Tracks Map Pack rankings",
          href: "/client/growth",
        };
      }
      case "gbp": {
        const bad = errorsFor(errors, ["content", "posts", "profile"]);
        return {
          agent,
          status: bad ? "attention" : hasRun ? "ok" : "idle",
          statusLabel: bad ? "Needs attention" : hasRun ? "Publishing" : "Waiting for first run",
          lastAction: hasRun
            ? posts > 0
              ? `Created ${posts} post${posts === 1 ? "" : "s"}`
              : bad
                ? "Post / profile step failed"
                : "Profile / content pass done"
            : "GBP posts & profile",
          href: "/client/gbp",
        };
      }
      case "lead":
        return {
          agent,
          status: "listening",
          statusLabel: "Listening 24/7",
          lastAction:
            leads > 0
              ? `${leads} lead${leads === 1 ? "" : "s"} this period`
              : "Replies on WhatsApp when messages arrive",
          href: "/client/leads",
        };
      case "reviews": {
        const bad = errorsFor(errors, ["review"]);
        return {
          agent,
          status: bad ? "attention" : hasRun ? "ok" : "idle",
          statusLabel: bad ? "Needs attention" : hasRun ? "On reputation" : "Waiting for first run",
          lastAction: hasRun
            ? `Replied ${replies} · asked ${reviewAsks}`
            : "Review replies & requests",
          href: "/client/gbp",
        };
      }
      case "insights":
      default:
        return {
          agent,
          status: hasRun ? "ok" : "idle",
          statusLabel: hasRun ? "Scorecard ready" : "Waiting for first run",
          lastAction: hasRun
            ? "Pipeline summary saved"
            : "Funnel, forecast & next actions",
          href: "/client/insights",
        };
    }
  });
}
