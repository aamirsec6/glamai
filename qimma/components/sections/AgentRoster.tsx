"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AGENTS } from "@/lib/content";
import Reveal from "@/components/Reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * Cinematic horizontal strip: the row translates slightly against scroll
 * (desktop) while each agent staggers in. Emissive orb = agent identity.
 */
export default function AgentRoster() {
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { x: 80 },
        {
          x: -80,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="overflow-hidden py-28 md:py-40">
      <Reveal className="section-pad mx-auto max-w-5xl">
        <p className="kicker mb-6">The cast</p>
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]">
          Six agents. One growth engine.
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Each agent owns a job and hands off to the next. They work together —
          you stay in control of every word that goes out.
        </p>
      </Reveal>

      <div ref={trackRef} className="mt-16">
        <Reveal
          stagger
          className="section-pad grid grid-cols-2 gap-x-8 gap-y-14 md:grid-cols-3 xl:grid-cols-6 xl:gap-x-6"
        >
          {AGENTS.map((a) => (
            <article key={a.name} data-reveal-item className="group">
              <div className="relative mb-6 h-20 w-20">
                {/* emissive orb avatar */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-110"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${a.hue}, #0a1416 68%)`,
                    boxShadow: `0 0 44px -6px ${a.hue}66, inset 0 0 18px ${a.hue}33`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-full border opacity-40 transition-opacity duration-500 group-hover:opacity-90"
                  style={{ borderColor: `${a.hue}55` }}
                />
              </div>
              <h3 className="text-xl font-bold">{a.name}</h3>
              <p
                className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em]"
                style={{ color: a.hue }}
              >
                {a.role}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                {a.line}
              </p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
