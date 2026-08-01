import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { CtaBand } from "@/components/marketing/cta-band";
import { PeachDashboardVisual } from "@/components/marketing/home/peach-dashboard-visual";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";
import {
  AGENT_CAST,
  AGENT_ROSTER_TAGLINE,
  HOME_FEATURE_ROWS,
  SITE,
} from "@/lib/marketing-content";

export default function ProductPage() {
  return (
    <>
      {/* Peach-style product hero */}
      <section className="mkt-peach-hero relative overflow-hidden">
        <div className="mkt-peach-hero-bg" />
        <div className="mkt-container-wide relative z-10 pt-32 pb-16 lg:pt-40 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="mkt-fade-up max-w-xl">
              <p className="mkt-peach-label">Product</p>
              <h1 className="mkt-peach-headline mt-4">
                Six specialists.{" "}
                <span className="mkt-gradient-text">Zero manual marketing.</span>
              </h1>
              <p className="mkt-body mt-6 text-lg text-zinc-400">
                {AGENT_ROSTER_TAGLINE} Each agent owns a lane — territory, SEO, posts,
                leads, reviews, and insights — and they hand work to each other.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={SITE.demoUrl} className="mkt-btn-primary mkt-pulse-ring">
                  Book a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="#cast" className="mkt-btn-secondary">
                  Meet the cast
                </Link>
              </div>
            </div>
            <div className="mkt-fade-up mkt-delay-2 relative mt-4 flex justify-center lg:mt-0 lg:justify-end">
              <PeachDashboardVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline strip */}
      <section className="border-y border-white/5 bg-[#050816] py-10">
        <div className="mkt-container-wide">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {["Scout", "Sage", "Spark", "Maya", "Ruby", "Cleo"].map((name, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white">
                    {name}
                  </span>
                  {i < 5 && (
                    <ArrowRight className="hidden h-4 w-4 text-cyan-500/50 sm:block" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-zinc-500">
              Coordinated weekly · Event-driven for leads · One dashboard
            </p>
          </Reveal>
        </div>
      </section>

      {/* How product works */}
      <section className="mkt-section">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">How it works</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl">
              From connect to compound growth.
            </h2>
          </Reveal>
          <div className="mt-14 space-y-6">
            {HOME_FEATURE_ROWS.map((row, i) => (
              <Reveal key={row.step} delay={i * 80}>
                <div className="mkt-peach-glass-card grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="text-4xl font-bold text-white/10">{row.step}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      {row.label}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{row.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{row.desc}</p>
                  </div>
                  <Link href={row.href} className="mkt-btn-ghost shrink-0 gap-1">
                    {row.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Agent cast detail */}
      <section id="cast" className="mkt-section mkt-section-muted">
        <div className="mkt-container-wide">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="mkt-peach-label">Agent cast</p>
            <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl lg:text-5xl">
              Your autonomous growth team.
            </h2>
            <p className="mkt-body mx-auto mt-4 max-w-2xl">
              Friendly names. Clear jobs. They plan, execute, and report back.
            </p>
          </Reveal>

          <div className="mt-14 space-y-5">
            {AGENT_CAST.map((agent, i) => (
              <Reveal key={agent.id} delay={i * 50}>
                <article
                  id={agent.name.toLowerCase()}
                  className={cn(
                    "mkt-peach-glass-card grid gap-6 lg:grid-cols-[1fr_1.2fr]",
                    agent.glow,
                  )}
                >
                  <div className="flex items-start gap-4">
                    <AgentAvatar agent={agent.avatar} size={64} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-400/80">
                        {agent.number} · {agent.codename}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold text-white">{agent.name}</h3>
                      <p className="text-sm text-zinc-500">{agent.title}</p>
                      <div className="mkt-personality-chips mt-3">
                        {agent.personality.map((t) => (
                          <span key={t} className="mkt-personality-chip">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm leading-relaxed text-zinc-300">{agent.mission}</p>
                    <div className="mkt-dialogue-bubble mt-4">
                      <p className="text-sm italic text-zinc-400">
                        &ldquo;{agent.sampleQuote}&rdquo;
                      </p>
                      <p className="mt-2 text-xs font-semibold text-cyan-400/80">
                        — {agent.name}
                      </p>
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {agent.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex gap-2 text-xs text-zinc-500">
                          <span className="text-cyan-500">→</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Full funnel */}
      <section className="mkt-section">
        <div className="mkt-container-wide">
          <Reveal>
            <div className="mkt-peach-glass-card text-center">
              <Layers className="mx-auto h-12 w-12 text-cyan-400" />
              <h2 className="mkt-peach-headline mt-4 text-2xl sm:text-3xl">
                Full-funnel, one platform
              </h2>
              <p className="mkt-body mx-auto mt-3 max-w-xl">
                From territory mapping to WhatsApp qualification to monthly reporting —
                six agents, one coordinated pipeline.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/how-it-works" className="mkt-btn-primary inline-flex">
                  See how it works
                </Link>
                <Link href="/pricing" className="mkt-btn-secondary inline-flex">
                  View pricing
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
