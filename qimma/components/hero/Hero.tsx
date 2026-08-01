"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { HeroStatic } from "./HeroCanvas";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <HeroStatic />,
});

export default function Hero() {
  const copyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = copyRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-line]",
        { autoAlpha: 0, y: 42 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.14,
          delay: 0.35, // let the 3D settle first
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative h-[100svh] min-h-[620px] w-full overflow-hidden">
      <HeroCanvas />

      {/* readability band: soft falloff behind copy, not a card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(7,8,10,0.82) 0%, rgba(7,8,10,0.45) 38%, transparent 62%), linear-gradient(to top, rgba(7,8,10,0.9) 0%, transparent 32%)",
        }}
      />

      <div
        ref={copyRef}
        className="section-pad relative z-10 flex h-full flex-col justify-end pb-[12svh] md:justify-center md:pb-0"
      >
        <div className="max-w-3xl">
          <p
            data-hero-line
            className="mb-5 font-[family-name:var(--font-display)] text-[clamp(2.4rem,5.5vw,4.6rem)] font-extrabold leading-none tracking-tight text-[var(--accent)]"
          >
            Qimma
          </p>
          <h1
            data-hero-line
            className="text-[clamp(2.5rem,6.5vw,5.4rem)] leading-[1.02]"
          >
            Local growth,
            <br />
            run by AI agents.
          </h1>
          <p
            data-hero-line
            className="mt-6 max-w-xl text-lg text-[var(--muted)]"
          >
            Maps visibility, WhatsApp qualification, reviews, and reports —
            coordinated so you get real leads, not busywork.
          </p>
          <div data-hero-line className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/sign-up" className="btn-primary">
              Book a Demo
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/how-it-works" className="btn-ghost">
              Watch how it works
            </Link>
          </div>
        </div>
      </div>

      {/* scroll hint */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block"
      >
        <div className="h-10 w-px bg-gradient-to-b from-transparent via-[var(--accent)] to-transparent opacity-60" />
      </div>
    </section>
  );
}
