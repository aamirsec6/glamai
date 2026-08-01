"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STEPS } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/hooks";

gsap.registerPlugin(ScrollTrigger);

const HowItWorksCanvas = dynamic(() => import("./HowItWorksCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full"
      style={{
        background:
          "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(45,214,200,0.1), transparent 70%)",
      }}
    />
  ),
});

/**
 * Pinned chapter: DOM steps on the left, morphing 3D on the right.
 * ScrollTrigger scrubs a shared progress ref that the scene reads
 * every frame — no React re-renders on scroll except step index.
 */
export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=320%",
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          const idx = Math.min(3, Math.floor(self.progress * 4));
          setStep((prev) => (prev === idx ? prev : idx));
        },
        onToggle: (self) => setActive(self.isActive),
      });
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  /* Reduced motion: static stacked list, no pin, no canvas. */
  if (reduced) {
    return (
      <section id="how-it-works" className="section-pad py-28">
        <p className="kicker mb-6">How it works</p>
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]">
          From connected to compounding in four moves.
        </h2>
        <ol className="mt-14 max-w-2xl">
          {STEPS.map((s) => (
            <li key={s.n} className="hairline py-7">
              <span className="text-sm font-semibold text-[var(--accent)]">
                {s.n}
              </span>
              <h3 className="mt-1 text-2xl">{s.title}</h3>
              <p className="mt-2 text-[var(--muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative h-[100svh] overflow-hidden"
    >
      {/* 3D plane */}
      <div className="absolute inset-0 md:left-[38%]" aria-hidden="true">
        <HowItWorksCanvas progress={progressRef} active={active} />
      </div>
      {/* mobile readability scrim over canvas */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(7,8,10,0.55)] md:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 hidden w-[55%] md:block"
        style={{
          background:
            "linear-gradient(90deg, var(--bg) 55%, transparent 100%)",
        }}
      />

      <div className="section-pad relative z-10 flex h-full flex-col justify-center">
        <p className="kicker mb-6">How it works</p>
        <h2 className="max-w-md text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.08]">
          From connected to compounding in four moves.
        </h2>

        <ol className="mt-12 max-w-md" aria-label="Steps">
          {STEPS.map((s, i) => {
            const current = i === step;
            return (
              <li
                key={s.n}
                className="border-l py-4 pl-6 transition-colors duration-500"
                style={{
                  borderColor: current ? "var(--accent)" : "var(--line)",
                }}
              >
                <div
                  className="transition-opacity duration-500"
                  style={{ opacity: current ? 1 : 0.35 }}
                >
                  <span className="text-xs font-semibold tracking-[0.2em] text-[var(--accent)]">
                    {s.n}
                  </span>
                  <h3 className="mt-1 text-xl md:text-2xl">{s.title}</h3>
                  <div
                    className="grid transition-[grid-template-rows] duration-500"
                    style={{ gridTemplateRows: current ? "1fr" : "0fr" }}
                  >
                    <p className="overflow-hidden text-sm text-[var(--muted)] md:text-base">
                      {s.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
