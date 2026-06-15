import Link from "next/link";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "₹1,999",
    desc: "Get found and respond instantly",
    features: [
      "GBP + WhatsApp AI agents",
      "4 posts per month",
      "Monthly value report",
      "Top 3 ranking target",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹4,999",
    desc: "Outrank local competitors",
    features: [
      "Everything in Starter",
      "Competitor monitoring",
      "Bi-weekly ranking reports",
      "Priority keyword strategy",
    ],
    cta: "Get Growth",
    highlight: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    desc: "Own your territory",
    features: [
      "Everything in Growth",
      "5km territory exclusivity",
      "6+ dedicated keywords",
      "Money-back guarantee",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="landing-section scroll-mt-20 bg-slate-50">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Simple pricing. Real growth.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every plan includes your full AI marketing team. No hidden fees.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "relative landing-card flex flex-col p-8",
                plan.highlight && "border-violet-300 ring-2 ring-violet-500/20"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-violet-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={cn(
                  "mt-8 block rounded-full py-3 text-center text-sm font-semibold transition-colors",
                  plan.highlight
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "border-2 border-violet-600 text-violet-700 hover:bg-violet-50"
                )}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
