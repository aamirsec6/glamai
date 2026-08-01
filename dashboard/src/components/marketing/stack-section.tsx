import Link from "next/link";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { Reveal } from "@/components/marketing/reveal";
import { AGENT_CAST, AGENT_ROSTER_TAGLINE, QIMMA_STACK } from "@/lib/marketing-content";

export function StackSection() {
  const castById = Object.fromEntries(AGENT_CAST.map((a) => [a.id, a]));

  return (
    <section className="mkt-section mkt-section-dark">
      <div className="mkt-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="mkt-eyebrow">The Qimma Stack</p>
            <h2 className="mkt-heading mt-4 text-3xl sm:text-4xl lg:text-5xl">
              Innovation,
              <span className="block mkt-gradient-text">orchestrated.</span>
            </h2>
            <p className="mkt-body mt-6 max-w-lg">
              {AGENT_ROSTER_TAGLINE} From Scout&apos;s territory brief to Cleo&apos;s monthly report —
              one pipeline, zero manual marketing.
            </p>
            <Link href="/product" className="mkt-btn-ghost group mt-8 inline-flex gap-2">
              Meet the full cast
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>

          <div className="mkt-stack-grid">
            {QIMMA_STACK.map((item, i) => {
              const agent = castById[item.agentId];
              return (
                <Reveal key={item.num} delay={i * 60} className="h-full">
                  <Link
                    href={agent?.href ?? "/product"}
                    className="mkt-stack-item group flex h-full items-start gap-4"
                  >
                    {agent && (
                      <AgentAvatar
                        agent={agent.avatar}
                        size={44}
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white transition-colors group-hover:text-cyan-300">
                        {item.name}
                        <span className="ml-2 text-xs font-normal text-zinc-500">{item.role}</span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>

        <Reveal delay={200}>
          <div className="pointer-events-none relative mx-auto mt-16 max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-cyan-500/5 to-transparent p-1">
            <svg viewBox="0 0 800 200" className="mkt-float w-full" aria-hidden="true">
              <defs>
                <linearGradient id="qimma-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <circle
                    cx={80 + i * 128}
                    cy={100}
                    r={28}
                    fill="none"
                    stroke="url(#qimma-line)"
                    strokeWidth="1.5"
                    opacity={0.6 + i * 0.06}
                  />
                  <circle cx={80 + i * 128} cy={100} r={6} fill="#22d3ee" opacity={0.5 + i * 0.08} />
                  {i < 5 && (
                    <line
                      x1={108 + i * 128}
                      y1={100}
                      x2={152 + i * 128}
                      y2={100}
                      stroke="url(#qimma-line)"
                      strokeWidth="1"
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
