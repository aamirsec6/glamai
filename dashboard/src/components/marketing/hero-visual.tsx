import { MapPin, Store } from "lucide-react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AGENT_CAST } from "@/lib/marketing-content";

const HUB_RADIUS = 38;

function hubPosition(index: number) {
  const angle = ((index * 60 - 90) * Math.PI) / 180;
  return {
    left: `${50 + HUB_RADIUS * Math.cos(angle)}%`,
    top: `${50 + HUB_RADIUS * Math.sin(angle)}%`,
    lineX: 50 + HUB_RADIUS * Math.cos(angle),
    lineY: 50 + HUB_RADIUS * Math.sin(angle),
  };
}

/** Hero visual — all six agents working around your business */
export function HeroVisual() {
  const nodes = AGENT_CAST.map((agent, i) => ({
    agent,
    ...hubPosition(i),
  }));

  return (
    <div className="mkt-hero-hub mx-auto mt-14 w-full max-w-3xl" aria-hidden="true">
      {/* Desktop hub */}
      <div className="relative hidden aspect-[16/10] w-full md:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hub-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {nodes.map(({ agent, lineX, lineY }) => (
            <line
              key={agent.id}
              x1="50"
              y1="50"
              x2={lineX}
              y2={lineY}
              stroke="url(#hub-line)"
              strokeWidth="0.35"
              className="mkt-hero-hub-line"
            />
          ))}
          <circle cx="50" cy="50" r="8" fill="#22d3ee" fillOpacity="0.06" />
          <circle cx="50" cy="50" r="4" fill="#22d3ee" fillOpacity="0.12" />
        </svg>

        {/* Center — your business */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="mkt-hero-hub-core">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-500/30">
              <Store className="h-6 w-6 text-cyan-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">Your business</p>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs text-emerald-400">
              <span className="mkt-hero-hub-dot" />
              6 agents active
            </p>
          </div>
        </div>

        {/* Agent nodes */}
        {nodes.map(({ agent, left, top }, i) => (
          <div
            key={agent.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left, top, animationDelay: `${i * 0.15}s` }}
          >
            <div className={`mkt-hero-agent-node mkt-hero-agent-node-delay-${i}`}>
              <AgentAvatar agent={agent.avatar} size={40} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">{agent.name}</p>
                <p className="mkt-hero-agent-status mt-0.5 truncate text-[10px] text-zinc-500">
                  {agent.liveStatus}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile — stacked activity feed */}
      <div className="space-y-2 md:hidden">
        <div className="mkt-hero-hub-core flex-row items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/30">
            <Store className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Your local business</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="mkt-hero-hub-dot" />
              All 6 agents working now
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AGENT_CAST.map((agent) => (
            <div key={agent.id} className="mkt-hero-agent-node flex-col items-start gap-2 p-3">
              <div className="flex items-center gap-2">
                <AgentAvatar agent={agent.avatar} size={32} />
                <p className="text-xs font-bold text-white">{agent.name}</p>
              </div>
              <p className="text-[10px] leading-snug text-zinc-500">{agent.liveStatus}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing pipeline label */}
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-zinc-600">
        <MapPin className="h-3.5 w-3.5 text-cyan-500/60" />
        Discover → Qualify → Convert → Grow — orchestrated by your AI team
      </p>
    </div>
  );
}
