"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";
import {
  FUNNEL_LEAK_LEGEND,
  FUNNEL_STAGES,
  SITE,
} from "@/lib/marketing-content";

type Mode = "old" | "qimma";

const LEAK_PILL: Record<string, string> = {
  visibility: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  leads: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  reputation: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
};

function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function LiveFunnelColumn({
  mode,
  active,
  playing,
  filter,
}: {
  mode: Mode;
  active: boolean;
  playing: boolean;
  filter: string | null;
}) {
  const isOld = mode === "old";
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!playing || !active) return;
    setActiveStep(0);
    const id = window.setInterval(() => {
      setActiveStep((s) => (s + 1) % FUNNEL_STAGES.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [playing, active, mode]);

  return (
    <div
      className={cn(
        "mkt-funnel-card relative h-full overflow-hidden",
        isOld ? "mkt-funnel-card-old" : "mkt-funnel-card-new",
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "mkt-funnel-live-dot",
                isOld ? "mkt-funnel-live-dot-old" : "mkt-funnel-live-dot-new",
              )}
            />
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.2em]",
                isOld ? "text-rose-400" : "text-cyan-400",
              )}
            >
              {isOld ? "Before · live leak map" : "After · agents running"}
            </p>
          </div>
          <h3 className="mt-1.5 text-xl font-bold text-white">
            {isOld ? "Old funnel" : "With Qimma"}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            {isOld
              ? "Manual · slow · silent drop-offs"
              : "Plugged leaks · clear rules"}
          </p>
        </div>
        {isOld ? (
          <Droplets className="h-7 w-7 text-rose-400/40" />
        ) : (
          <ShieldCheck className="h-7 w-7 text-cyan-400/50" />
        )}
      </div>

      <div className="space-y-2.5">
        {FUNNEL_STAGES.map((stage, i) => {
          const target = isOld ? stage.oldWidth : stage.newWidth;
          const isActive = playing && active && activeStep === i;
          const revealed = playing && active && i <= activeStep;
          const dimmed = filter !== null && stage.leakage.type !== filter;

          return (
            <div
              key={stage.id}
              className={cn(
                "mkt-funnel-stage rounded-2xl border px-3 py-2.5 transition-all duration-500",
                dimmed && "opacity-25",
                isActive
                  ? isOld
                    ? "border-rose-500/40 bg-rose-500/[0.08] shadow-[0_0_24px_rgba(244,63,94,0.12)]"
                    : "border-cyan-500/40 bg-cyan-500/[0.08] shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : "border-transparent bg-transparent",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-[10px] font-bold tabular-nums text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="truncate text-sm font-semibold text-white">
                    {stage.label}
                  </p>
                  {isActive && !dimmed && (
                    <span
                      className={cn(
                        "hidden rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline",
                        isOld
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-cyan-500/20 text-cyan-300",
                      )}
                    >
                      {isOld ? "leaking" : "working"}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-bold tabular-nums transition-opacity duration-300",
                    isOld ? "text-rose-400" : "text-emerald-400",
                    revealed ? "opacity-100" : "opacity-40",
                  )}
                >
                  {target}%
                </span>
              </div>

              <div className="relative mx-auto h-8 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                <div
                  className={cn(
                    "mkt-funnel-bar absolute inset-y-0 left-1/2 flex items-center justify-center rounded-lg",
                    isOld ? "mkt-funnel-bar-old" : "mkt-funnel-bar-new",
                    revealed && "mkt-funnel-bar-run",
                  )}
                  style={
                    {
                      ["--funnel-w" as string]: revealed ? `${target}%` : "8%",
                    } as React.CSSProperties
                  }
                >
                  <span className="truncate px-2 text-[10px] font-medium text-white/85">
                    {stage.short}
                  </span>
                </div>
              </div>

              <p
                className={cn(
                  "mt-1.5 truncate text-[11px] leading-snug transition-opacity duration-300",
                  revealed ? "opacity-100" : "opacity-40",
                  isOld ? "text-rose-300/80" : "text-cyan-200/80",
                )}
                title={
                  isOld
                    ? `${stage.leakage.title}: ${stage.leakage.detail}`
                    : `${stage.fix.agents.join(", ")} — ${stage.fix.detail}`
                }
              >
                {isOld ? (
                  <>
                    <span className="font-semibold text-rose-300">
                      {stage.leakage.title}
                    </span>
                    <span className="text-zinc-500"> — </span>
                    <span className="text-zinc-400">{stage.leakage.detail}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-cyan-300">
                      {stage.fix.agents.join(" · ")}
                    </span>
                    <span className="text-zinc-500"> — </span>
                    <span className="text-zinc-400">{stage.fix.title}</span>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-5 rounded-xl border px-4 py-3 text-center text-sm",
          isOld
            ? "border-rose-500/20 bg-rose-500/[0.06] text-rose-200/90"
            : "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/90",
        )}
      >
        {isOld
          ? "Fewer bookings · weaker reviews · growth you can’t explain"
          : "More visibility · hotter leads · reviews that compound"}
      </div>
    </div>
  );
}

export function FunnelCompareSection() {
  const { ref, visible } = useInViewOnce<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>("qimma");
  const [filter, setFilter] = useState<string | null>(null);

  return (
    <section id="funnel" className="mkt-section mkt-section-dark">
      <div className="mkt-container-wide">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mkt-peach-label">Before & after</p>
          <h2 className="mkt-peach-headline mt-4 text-3xl sm:text-4xl lg:text-5xl">
            Watch the leaks —{" "}
            <span className="mkt-gradient-text">then watch Qimma plug them.</span>
          </h2>
          <p className="mkt-body mx-auto mt-4 max-w-2xl">
            Same path for a salon, clinic, or studio. The left side drops off.
            The right side stays wide — because each agent owns a stage.
          </p>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-500">Focus leak type:</span>
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                filter === null
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              All
            </button>
            {FUNNEL_LEAK_LEGEND.map((l) => (
              <button
                key={l.type}
                type="button"
                onClick={() => setFilter(filter === l.type ? null : l.type)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  LEAK_PILL[l.type],
                  filter === l.type && "ring-2 ring-offset-0",
                  filter && filter !== l.type && "opacity-40",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Mobile mode toggle */}
        <div className="mt-8 flex justify-center lg:hidden">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            {(["old", "qimma"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                  mode === m
                    ? m === "old"
                      ? "bg-rose-500/20 text-rose-200"
                      : "bg-cyan-500/20 text-cyan-200"
                    : "text-zinc-500",
                )}
              >
                {m === "old" ? "Old funnel" : "With Qimma"}
              </button>
            ))}
          </div>
        </div>

        <div ref={ref} className="mt-8 grid gap-5 lg:mt-10 lg:grid-cols-2">
          <div className={cn(mode !== "old" && "hidden lg:block")}>
            <LiveFunnelColumn
              mode="old"
              active={visible}
              playing={visible}
              filter={filter}
            />
          </div>
          <div className={cn(mode !== "qimma" && "hidden lg:block")}>
            <LiveFunnelColumn
              mode="qimma"
              active={visible}
              playing={visible}
              filter={filter}
            />
          </div>
        </div>

        {/* Filter hint when selected */}
        {filter && (
          <p className="mt-4 text-center text-xs text-zinc-500">
            Showing journey stages where{" "}
            <span className="text-zinc-300">
              {FUNNEL_LEAK_LEGEND.find((l) => l.type === filter)?.label}
            </span>{" "}
            leaks matter most —{" "}
            {FUNNEL_STAGES.filter((s) => s.leakage.type === filter)
              .map((s) => s.label)
              .join(", ")}
            .
          </p>
        )}

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <p className="max-w-lg text-sm text-zinc-500">
              Live rules: reply under 30s · post weekly · ask reviews after every win ·
              track Maps every Monday
            </p>
            <Link href={SITE.demoUrl} className="mkt-btn-primary inline-flex gap-2">
              See this on your business
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
