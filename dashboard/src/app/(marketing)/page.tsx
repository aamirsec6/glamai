import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Zap } from "lucide-react";
import { FunnelCompareSection } from "@/components/marketing/home/funnel-compare-section";
import { PeachHero } from "@/components/marketing/home/peach-hero";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { CtaBand } from "@/components/marketing/cta-band";
import { LogoStripSection } from "@/components/marketing/logo-strip-section";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";
import {
  AGENT_CAST,
  AGENT_ROSTER_TAGLINE,
  HOME_BENEFITS,
  HOME_FEATURE_ROWS,
  HOME_FEATURES,
  HOME_PLANS,
  HOME_TESTIMONIALS,
  SITE,
  VERTICALS,
} from "@/lib/marketing-content";

const FEATURE_ICONS = {
  spark: Sparkles,
  sage: TrendingUp,
  maya: Zap,
} as const;

export default function HomePage() {
  return (
    <>
      <PeachHero />

      {/* Product spotlight */}
      <section className="mkt-section border-b border-white/5">
        <div className="mkt-container-wide">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <p className="mkt-peach-label">Product</p>
              <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl lg:text-5xl">
                Simplify complex local growth.
              </h2>
              <p className="mkt-body mt-6 text-lg">
                One platform replaces scattered tools. Qimma coordinates visibility,
                leads, reviews, and reporting — so your team focuses on delivery, not
                marketing busywork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={SITE.demoUrl} className="mkt-btn-primary">
                  Book a Demo
                </Link>
                <Link href="/how-it-works" className="mkt-btn-secondary">
                  Watch how it works
                </Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="mkt-peach-glass-card relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
                <p className="text-sm font-semibold text-cyan-400">This week&apos;s pipeline</p>
                <ul className="mt-6 space-y-4">
                  {[
                    "Scout assigned 4 local keywords",
                    "Sage moved 2 terms into top 5",
                    "Spark published SEO GBP post",
                    "Ruby sent 3 review requests",
                    "Cleo delivered growth scorecard",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <LogoStripSection />

      <FunnelCompareSection />

      {/* Features grid */}
      <section id="features" className="mkt-section mkt-section-muted">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Features</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl lg:text-5xl">
              The future of local marketing is here.
            </h2>
            <p className="mkt-body mx-auto mt-4 max-w-2xl">
              {AGENT_ROSTER_TAGLINE} Each agent owns a part of your growth — together
              they run the full pipeline.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {HOME_FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[f.icon];
              return (
                <Reveal key={f.title} delay={i * 80}>
                  <div className="mkt-peach-glass-card h-full">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Alternating feature rows */}
      {HOME_FEATURE_ROWS.map((row, i) => (
        <section
          key={row.step}
          className={cn(
            "mkt-section border-b border-white/5",
            i % 2 === 1 && "mkt-section-muted",
          )}
        >
          <div className="mkt-container-wide">
            <div
              className={cn(
                "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                i % 2 === 1 && "lg:[&>*:first-child]:order-2",
              )}
            >
              <Reveal>
                <p className="mkt-peach-label">{row.label}</p>
                <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
                  {row.title}
                </h2>
                <p className="mkt-body mt-5 text-lg">{row.desc}</p>
                <Link href={row.href} className="mkt-btn-ghost mt-6 inline-flex gap-2">
                  {row.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
              <Reveal delay={100}>
                <div className="relative">
                  <span className="mkt-peach-feature-num absolute -left-2 -top-6 select-none">
                    {row.step}
                  </span>
                  <div className="mkt-peach-glass-card ml-8 mt-8 min-h-[200px]">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Step {row.step}
                    </p>
                    <p className="mt-4 text-lg font-medium text-white">{row.label}</p>
                    <div className="mt-6 h-px w-full bg-gradient-to-r from-cyan-500/50 via-violet-500/30 to-transparent" />
                    <p className="mt-4 text-sm text-zinc-500">
                      Automated · Coordinated · Measurable
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* Agent cast */}
      <section id="agents" className="mkt-section">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Your AI team</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl lg:text-5xl">
              Meet Scout, Sage, Spark & the crew.
            </h2>
            <p className="mkt-body mx-auto mt-4 max-w-2xl">
              Six specialists with real roles — territory, SEO, posts, leads, reviews,
              and insights. Friendly names, serious outcomes.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_CAST.map((agent, i) => (
              <Reveal key={agent.id} delay={i * 60}>
                <Link
                  href={agent.href}
                  className={cn(
                    "mkt-peach-glass-card group flex h-full flex-col",
                    agent.glow,
                  )}
                >
                  <div className="flex items-start gap-4">
                    <AgentAvatar agent={agent.avatar} size={48} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/80">
                        {agent.codename}
                      </p>
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-300">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-zinc-500">{agent.title}</p>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-400">
                    {agent.mission}
                  </p>
                  <p className="mt-4 text-xs text-cyan-400/70">{agent.liveStatus}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="mkt-section mkt-section-dark">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Solutions</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
              Built for local businesses that win on trust.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {VERTICALS.map((v, i) => (
              <Reveal key={v.title} delay={i * 70}>
                <Link
                  href={v.href}
                  className={cn(
                    "mkt-peach-glass-card block bg-gradient-to-br",
                    v.gradient,
                  )}
                >
                  <h3 className="text-lg font-semibold text-white">{v.title}</h3>
                  <ul className="mt-3 space-y-1.5">
                    {v.bullets.map((b) => (
                      <li key={b} className="text-sm text-zinc-400">
                        · {b}
                      </li>
                    ))}
                  </ul>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mkt-section border-y border-white/5">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Benefits</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
              Fast. Scalable. Built for local growth.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_BENEFITS.map((b, i) => (
              <Reveal key={b.label} delay={i * 80}>
                <div className="mkt-peach-stat-card">
                  <p className="mkt-peach-stat-value mkt-gradient-text">{b.value}</p>
                  <p className="mt-2 font-semibold text-white">{b.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{b.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container-wide">
          <Reveal className="text-center">
            <p className="mkt-peach-label">Testimonials</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
              What business owners say.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {HOME_TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <blockquote className="mkt-peach-testimonial h-full">
                  <p className="text-sm leading-relaxed text-zinc-300">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-6 border-t border-white/10 pt-4">
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mkt-section">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Pricing</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
              Plans for every stage of growth.
            </h2>
            <p className="mkt-body mx-auto mt-4">
              Every plan includes your full AI marketing team.{" "}
              <Link href="/pricing" className="text-cyan-400 hover:underline">
                See full pricing →
              </Link>
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
            {HOME_PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={cn(
                    "mkt-pricing-card relative h-full",
                    plan.highlight && "mkt-pricing-card-highlight",
                  )}
                >
                  {"badge" in plan && plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-[#030712]">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-cyan-400">{plan.name}</p>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-500">{plan.period}</span>
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">{plan.desc}</p>
                  <ul className="mt-6 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="text-sm text-zinc-400">
                        · {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={SITE.demoUrl}
                    className={cn(
                      "mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold transition-all",
                      plan.highlight
                        ? "mkt-btn-primary"
                        : "border border-white/20 text-white hover:bg-white/5",
                    )}
                  >
                    Book a Demo
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
