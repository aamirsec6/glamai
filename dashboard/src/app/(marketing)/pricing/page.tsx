import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqSection } from "@/components/marketing/faq-section";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/marketing-content";

const PLANS = [
  {
    name: "Starter",
    price: "₹1,999",
    period: "/mo",
    desc: "Get found and respond instantly",
    features: [
      "GBP + WhatsApp AI agents",
      "4 posts per month",
      "Monthly value report",
      "Top 3 ranking target",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹4,999",
    period: "/mo",
    desc: "Outrank local competitors",
    features: [
      "Everything in Starter",
      "Competitor monitoring",
      "Business insights dashboard",
      "Review engine + campaigns",
    ],
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    period: "/mo",
    desc: "Own your territory",
    features: [
      "Everything in Growth",
      "5km territory exclusivity",
      "6+ dedicated keywords",
      "Priority support",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple plans. Serious growth."
        description="Every plan includes your full AI marketing team. No hidden fees — cancel anytime."
        cta={{ label: "Book a Demo", href: SITE.demoUrl }}
      />

      <section className="mkt-section -mt-8">
        <div className="mkt-container">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-3xl border p-8 transition-all",
                  plan.highlight
                    ? "scale-[1.02] border-[#c9a962]/50 bg-gradient-to-b from-[#c9a962]/15 to-[#0a0a0a] shadow-[0_0_60px_rgba(212,175,55,0.08)]"
                    : "mkt-card border-white/[0.08]"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] px-3 py-1 text-xs font-bold text-[#0a0a0a]">
                    {plan.badge}
                  </span>
                )}
                <p className={cn("text-sm font-semibold", plan.highlight ? "text-[#e8d5a3]" : "text-zinc-500")}>
                  {plan.name}
                </p>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className={plan.highlight ? "text-[#c9a962]" : "text-zinc-500"}>{plan.period}</span>
                </p>
                <p className={cn("mt-2 text-sm", plan.highlight ? "text-zinc-300" : "text-zinc-400")}>
                  {plan.desc}
                </p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-zinc-300">
                      <Check className={cn("h-4 w-4 shrink-0", plan.highlight ? "text-[#d4af37]" : "text-[#c9a962]")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={SITE.demoUrl}
                  className={cn(
                    "mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-colors",
                    plan.highlight
                      ? "mkt-btn-primary"
                      : "border border-white/10 bg-white/[0.04] text-white hover:border-[#c9a962]/40 hover:bg-white/[0.08]"
                  )}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-zinc-500">
            Questions? <Link href="/contact" className="mkt-link">Contact us</Link> for custom plans.
          </p>
        </div>
      </section>

      <FaqSection />

      <CtaBand />
    </>
  );
}
