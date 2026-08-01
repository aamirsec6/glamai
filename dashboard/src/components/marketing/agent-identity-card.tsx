import Link from "next/link";
import { ArrowRight, Check, Moon } from "lucide-react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import type { AgentCastMember } from "@/lib/marketing-content";
import { SITE } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

type AgentIdentityCardProps = {
  agent: AgentCastMember;
  compact?: boolean;
};

export function AgentIdentityCard({ agent, compact = false }: AgentIdentityCardProps) {
  return (
    <article
      id={agent.name.toLowerCase()}
      className={cn(
        "mkt-agent-card group scroll-mt-32 overflow-hidden rounded-3xl border bg-gradient-to-br",
        agent.border,
        agent.accent,
        agent.glow,
      )}
    >
      <div className={cn("grid gap-0", compact ? "" : "lg:grid-cols-[300px_1fr]")}>
        {/* Identity panel */}
        <div className="flex flex-col justify-between border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {agent.codename} · {agent.number}
            </p>
            <div className="mt-5 flex items-center gap-4">
              <AgentAvatar
                agent={agent.avatar}
                size={72}
                className="transition-transform duration-500 group-hover:scale-105"
              />
              <div>
                <h3 className="text-2xl font-bold text-white">{agent.name}</h3>
                <p className="text-sm font-medium text-zinc-400">{agent.title}</p>
              </div>
            </div>
            <p className="mkt-personality-chips mt-5">
              {agent.personality.map((trait) => (
                <span key={trait} className="mkt-personality-chip">
                  {trait}
                </span>
              ))}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{agent.mission}</p>
          </div>
          {!compact && (
            <Link
              href={SITE.demoUrl}
              className="mkt-btn-primary mt-8 inline-flex w-full justify-center lg:w-auto"
            >
              Book a Demo
            </Link>
          )}
        </div>

        {/* Voice + capabilities */}
        <div className="p-8 lg:p-10">
          <div className="mkt-dialogue-bubble">
            <p className="text-sm italic leading-relaxed text-zinc-300">
              &ldquo;{agent.sampleQuote}&rdquo;
            </p>
            <p className="mt-2 text-xs font-semibold text-cyan-400/80">— {agent.name}</p>
          </div>

          <div className="mkt-while-you-sleep mt-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Moon className="h-3.5 w-3.5" />
              While you sleep
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{agent.whileYouSleep}</p>
          </div>

          <h4 className="mt-8 text-lg font-semibold text-white">{agent.headline}</h4>
          <ul className="mt-4 space-y-3">
            {agent.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-zinc-300 transition-colors hover:text-white"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                  <Check className="h-3 w-3 text-cyan-400" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href={agent.href}
            className="group/link mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition-all hover:gap-3 hover:text-cyan-300"
          >
            Meet {agent.name} <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
