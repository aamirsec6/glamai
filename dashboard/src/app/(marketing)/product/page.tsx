import Link from "next/link";
import {
  BarChart3,
  Bot,
  Layers,
  MapPin,
  MessageCircle,
  Star,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { SITE } from "@/lib/marketing-content";

const AGENTS = [
  {
    id: "gbp",
    icon: MapPin,
    tag: "GBP Agent",
    title: "Google Business Profile",
    desc: "AI writes SEO-rich posts with image captions, optimizes your profile, tracks keyword rankings, and monitors local competitors.",
    features: ["4 posts/month", "Image + caption generation", "Profile optimization", "Competitor benchmarks"],
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    tag: "WhatsApp AI",
    title: "Lead Qualification",
    desc: "Every inbound WhatsApp message gets an instant, human-quality reply. Budget, scope, and timeline are extracted automatically.",
    features: ["<30s response time", "AI qualification score", "Hot-lead alerts", "Conversation history"],
  },
  {
    id: "reviews",
    icon: Star,
    tag: "Review Engine",
    title: "Reviews & Reputation",
    desc: "Request reviews after project wins. AI drafts warm, on-brand replies to every Google review.",
    features: ["Auto-reply to reviews", "Review request flows", "Rating trend tracking", "Reputation insights"],
  },
  {
    id: "insights",
    icon: BarChart3,
    tag: "Insights",
    title: "Business Intelligence",
    desc: "Funnel analysis, revenue forecast, SEO health, and prioritized opportunities — not just charts, but actions.",
    features: ["Lead funnel model", "30-day forecast", "Competitive benchmark", "Churn risk (admin)"],
  },
];

export default function ProductPage() {
  return (
    <>
      <PageHero
        eyebrow="Product"
        title="Your AI marketing team — always on, always improving"
        description="GlamAI deploys specialized agents for local discovery, lead qualification, reputation, and analytics. You focus on delivery; we handle growth."
        cta={{ label: "Book a Demo", href: SITE.demoUrl }}
      />

      <section className="mkt-section">
        <div className="mkt-container space-y-20">
          {AGENTS.map((agent, i) => (
            <div
              key={agent.id}
              id={agent.id}
              className="scroll-mt-28 grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className="mkt-badge">
                  <Bot className="h-3.5 w-3.5" />
                  {agent.tag}
                </div>
                <h2 className="mkt-heading mt-4 text-3xl">{agent.title}</h2>
                <p className="mkt-body mt-4 text-lg">{agent.desc}</p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {agent.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#c9a962]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={`mkt-card flex h-64 items-center justify-center ${i % 2 === 1 ? "lg:order-1" : ""}`}
              >
                <agent.icon className="h-20 w-20 text-[#c9a962]/70" strokeWidth={1.25} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container text-center">
          <Layers className="mx-auto h-12 w-12 text-[#d4af37]" />
          <h2 className="mkt-heading mt-4 text-2xl">Full-funnel, one platform</h2>
          <p className="mkt-body mx-auto mt-3 max-w-xl">
            From Maps discovery to WhatsApp qualification to monthly reporting — no juggling five tools.
          </p>
          <Link href="/how-it-works" className="mkt-btn-primary mt-8 inline-flex">
            See how it works
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
