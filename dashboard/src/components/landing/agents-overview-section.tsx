import Link from "next/link";
import { BarChart3, Bot, MapPinned, Megaphone } from "lucide-react";

const AGENTS = [
  {
    icon: MapPinned,
    color: "text-blue-600 bg-blue-50",
    title: "Google Business Profile Agent",
    tagline: "Bring New Potential Customers",
    points: [
      "Finds the best SEO keywords for your business",
      "Rewrites SEO-optimised GBP content and services",
      "Auto-publishes SEO-powered GBP posts every month",
      "Crafts SEO-rich replies to all Google reviews",
    ],
  },
  {
    icon: Bot,
    color: "text-emerald-600 bg-emerald-50",
    title: "WhatsApp Chat Agent",
    tagline: "Realtime Customer Interaction · 24/7",
    points: [
      "Exclusively trained for your business",
      "Knows your offerings, pricing and testimonials",
      "Qualifies leads in 5 natural questions",
      "Remembers every customer's conversation history",
    ],
  },
  {
    icon: Megaphone,
    color: "text-amber-600 bg-amber-50",
    title: "WhatsApp Marketing Agent",
    tagline: "Repeat Sales & Review Growth",
    points: [
      "Creates offers and messaging for returning customers",
      "Targets won leads for repeat purchase campaigns",
      "Sends Google review requests after every project",
      "Runs daily stale-lead reminder campaigns",
    ],
  },
  {
    icon: BarChart3,
    color: "text-violet-600 bg-violet-50",
    title: "Growth Intelligence Agent",
    tagline: "Monthly Proof & Performance Tracking",
    points: [
      "Captures leads, customer and sales data",
      "Delivers monthly value reports by the 5th",
      "Tracks guarantee fulfillment automatically",
      "Shared intelligence across all AI agents",
    ],
  },
];

export function AgentsOverviewSection() {
  return (
    <section id="agents" className="landing-section scroll-mt-20 bg-white">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Team of AI Agents that work for your Business Growth
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Four specialised agents plus one shared intelligence layer — like
            hiring a full marketing team, without the overhead.
          </p>
          <Link href="/sign-up" className="landing-btn-primary mt-8">
            Book Free Demo
          </Link>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {AGENTS.map((agent) => (
            <article key={agent.title} className="landing-card p-8 transition-shadow hover:shadow-md">
              <div className={`mb-5 inline-flex rounded-xl p-3 ${agent.color}`}>
                <agent.icon className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                {agent.tagline}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{agent.title}</h3>
              <ul className="mt-6 space-y-3">
                {agent.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
