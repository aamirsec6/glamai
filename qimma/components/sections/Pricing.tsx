import Link from "next/link";
import Reveal from "@/components/Reveal";

const PLANS = [
  {
    name: "Presence",
    price: "₹9,900",
    per: "/mo",
    tag: "Get found",
    points: [
      "GBP optimization + AI posts (Spark)",
      "Review requests & replies (Ruby)",
      "Monthly visibility report",
    ],
  },
  {
    name: "Growth",
    price: "₹19,900",
    per: "/mo",
    tag: "Most popular",
    featured: true,
    points: [
      "Everything in Presence",
      "WhatsApp AI qualification (Maya)",
      "Local SEO agents (Sage + Scout)",
      "Pipeline & scorecard (Cleo)",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    per: "",
    tag: "Multi-location",
    points: [
      "All agents, every location",
      "Cross-location reporting",
      "Priority onboarding & support",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="section-pad py-28 md:py-40">
      <Reveal className="mx-auto max-w-5xl">
        <p className="kicker mb-6">Pricing</p>
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]">
          Simple plans. No lock-in.
        </h2>
        <p className="mt-6 max-w-xl text-lg text-[var(--muted)]">
          Monthly billing, cancel anytime. Book a demo and we&apos;ll price it
          for your city and category.
        </p>
      </Reveal>

      <Reveal stagger className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <article
            key={p.name}
            data-reveal-item
            className={`flex flex-col rounded-2xl border p-7 transition-colors duration-500 ${
              p.featured
                ? "border-[rgba(45,214,200,0.45)] bg-[rgba(45,214,200,0.05)]"
                : "border-[var(--line)] bg-[var(--bg-raise)]"
            }`}
          >
            <p
              className={`text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${
                p.featured ? "text-[var(--accent)]" : "text-[var(--faint)]"
              }`}
            >
              {p.tag}
            </p>
            <h3 className="mt-3 text-2xl">{p.name}</h3>
            <p className="mt-4">
              <span className="font-[family-name:var(--font-display)] text-4xl font-bold">
                {p.price}
              </span>
              <span className="text-[var(--muted)]">{p.per}</span>
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-[var(--muted)]">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">
                    —
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className={`mt-8 ${p.featured ? "btn-primary justify-center" : "btn-ghost justify-center"}`}
            >
              Book a Demo
            </Link>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
