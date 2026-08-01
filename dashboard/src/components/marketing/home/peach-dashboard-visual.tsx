"use client";

import { useCallback, useRef, useState } from "react";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AGENT_CAST } from "@/lib/marketing-content";

/** Layered 3D control center with mouse parallax — CSS depth, no WebGL */
export function PeachDashboardVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 14 });
  }, []);

  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={ref}
      className="mkt-peach-scene"
      aria-hidden="true"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="mkt-peach-scene-glow" />
      <div className="mkt-peach-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`mkt-peach-particle mkt-peach-particle-${i % 6}`} />
        ))}
      </div>
      <div className="mkt-peach-scene-ring mkt-peach-scene-ring-1" />
      <div className="mkt-peach-scene-ring mkt-peach-scene-ring-2" />
      <div className="mkt-peach-scene-ring mkt-peach-scene-ring-3" />

      <div
        className="mkt-peach-scene-stage"
        style={{
          transform: `rotateX(${12 + tilt.x}deg) rotateY(${-8 + tilt.y}deg)`,
        }}
      >
        <div className="mkt-peach-panel mkt-peach-panel-back">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-medium text-zinc-500">Growth pipeline</span>
            <span className="mkt-peach-live-dot">Live</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Leads", "Rank", "Reviews"].map((label, i) => (
              <div key={label} className="rounded-lg bg-white/[0.04] p-2 text-center">
                <p className="text-lg font-bold text-white">{["12", "#3", "4.8★"][i]}</p>
                <p className="text-[10px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex flex-1 items-end">
                <div
                  className="w-full rounded-sm bg-gradient-to-t from-cyan-500/40 to-violet-500/50"
                  style={{ height: `${h * 0.35}px` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mkt-peach-panel mkt-peach-panel-mid">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">Agent hub</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {AGENT_CAST.map((agent) => (
              <div
                key={agent.id}
                className="mkt-peach-agent-cell flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-2"
              >
                <AgentAvatar agent={agent.avatar} size={28} />
                <span className="text-[9px] font-medium text-zinc-400">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mkt-peach-panel mkt-peach-panel-front">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <p className="text-sm font-semibold text-white">Scout mapped your territory</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            4 keywords assigned · 3 competitors tracked · GBP sync complete
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="mkt-peach-progress h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
