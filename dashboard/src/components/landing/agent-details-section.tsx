import Link from "next/link";
import { Check, MapPinned, MessageCircle, BarChart3 } from "lucide-react";
import { GoogleLogo, WhatsAppLogo } from "@/components/landing/brand-logos";
import { cn } from "@/lib/utils";

const AGENTS = [
  {
    id: "gbp",
    icon: MapPinned,
    brand: GoogleLogo,
    eyebrow: "Google Business Profile Agent",
    title: "AI Agent to Get You More Leads from Google",
    subtitle: "Bring new potential customers from local search",
    points: [
      "Finds the best SEO keywords for your business",
      "Rewrites SEO-optimised GBP content and services",
      "Auto-publishes 4 SEO-powered GBP posts monthly",
      "Crafts SEO-rich replies to all Google reviews",
      "GBP fully optimized within 48 hours",
    ],
    accent: "violet",
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    brand: WhatsAppLogo,
    eyebrow: "WhatsApp Chat Agent",
    title: "Your Personal Assistant Who Chats with Customers",
    subtitle: "Realtime customer interaction · 24/7",
    points: [
      "Responds in under 30 seconds, every time",
      "Exclusively trained for your business & offerings",
      "Qualifies budget, location, timeline in 5 questions",
      "Sends warm lead summaries to your team instantly",
      "Lead notifications in under 2 minutes",
    ],
    accent: "emerald",
    reverse: true,
  },
  {
    id: "whatsapp-marketing",
    icon: MessageCircle,
    brand: WhatsAppLogo,
    eyebrow: "WhatsApp Marketing Agent",
    title: "AI Agent to Increase Repeat Sales & Google Reviews",
    subtitle: "Turn past customers into repeat revenue",
    points: [
      "Creates offers and messaging for returning customers",
      "Analyses purchase data to target high-potential buyers",
      "Spots repeat purchase opportunities automatically",
      "Sends review requests after every won project",
      "Runs scheduled reminder campaigns on WhatsApp",
    ],
    accent: "emerald",
  },
  {
    id: "intelligence",
    icon: BarChart3,
    eyebrow: "Growth Intelligence",
    title: "Shared Brain of All AI Agents",
    subtitle: "Data intelligence that powers every decision",
    points: [
      "Captures and stores leads, customer and sales data",
      "Monthly value report delivered by the 5th",
      "Tracks guarantee fulfillment automatically",
      "Analyses conversations to identify high-intent leads",
      "Displays key business performance in your dashboard",
    ],
    accent: "indigo",
  },
];

export function AgentDetailsSection() {
  return (
    <section id="how-it-works" className="landing-section scroll-mt-20 bg-white">
      <div className="landing-container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="landing-eyebrow">Meet Your Digital Marketing AI Team</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Three agents. One growth system.
          </h2>
        </div>

        <div className="space-y-20">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className={cn(
                "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                agent.reverse && "lg:[&>*:first-child]:order-2"
              )}
            >
              <div
                className={cn(
                  "rounded-3xl p-8 sm:p-12",
                  agent.accent === "violet" && "bg-gradient-to-br from-violet-100 to-indigo-50",
                  agent.accent === "emerald" && "bg-gradient-to-br from-emerald-100 to-teal-50",
                  agent.accent === "indigo" && "bg-gradient-to-br from-indigo-100 to-violet-50"
                )}
              >
                <div className="flex h-48 items-center justify-center rounded-2xl bg-white/80 shadow-sm sm:h-56">
                  <div className="text-center">
                    {agent.brand ? (
                      <agent.brand className="mx-auto h-16 w-16" />
                    ) : (
                      <agent.icon className="mx-auto h-16 w-16 text-violet-600" />
                    )}
                    <p className="mt-4 text-sm font-semibold text-slate-700">{agent.eyebrow}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-violet-600">{agent.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {agent.title}
                </h3>
                <p className="mt-2 text-base font-medium text-slate-500">{agent.subtitle}</p>
                <ul className="mt-8 space-y-4">
                  {agent.points.map((p) => (
                    <li key={p} className="flex gap-3 text-slate-700">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="landing-btn-primary mt-8">
                  Book Free Demo
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
