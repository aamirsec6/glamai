"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "@/components/Reveal";

gsap.registerPlugin(ScrollTrigger);

type Metric = { value: number; prefix?: string; suffix?: string; label: string; decimals?: number };

const CASES: {
  name: string;
  place: string;
  quote: string;
  person: string;
  metrics: Metric[];
}[] = [
  {
    name: "Studio Indiranagar",
    place: "Interior design · Bangalore",
    quote:
      "The ₹14 lakh project came from a WhatsApp message at 10:40 pm. Maya had qualified them before I woke up.",
    person: "Founder & Principal Designer",
    metrics: [
      { value: 18, prefix: "+", suffix: "%", label: "GBP views in 30 days" },
      { value: 8, label: "qualified leads in 30 days" },
      { value: 14, prefix: "₹", suffix: "L", label: "project won via WhatsApp" },
    ],
  },
  {
    name: "Design Hub",
    place: "Interior studio · Bangalore",
    quote:
      "We stopped chasing. Posts go out, reviews get answered, and the pipeline report tells me exactly what worked.",
    person: "Co-founder",
    metrics: [
      { value: 12, label: "leads per quarter" },
      { value: 30, prefix: "<", suffix: "s", label: "WhatsApp response time" },
      { value: 4.7, suffix: "★", label: "average rating", decimals: 1 },
    ],
  },
];

/* Count-up: tween a plain object and write formatted text each tick. */
function CountUp({ m }: { m: Metric }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (v: number) =>
      `${m.prefix ?? ""}${v.toFixed(m.decimals ?? 0)}${m.suffix ?? ""}`;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = format(m.value);
      return;
    }
    el.textContent = format(0);
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: m.value,
      duration: 1.6,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = format(obj.v);
      },
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [m]);

  return (
    <span
      ref={ref}
      className="whitespace-nowrap font-[family-name:var(--font-display)] text-[clamp(1.8rem,2.9vw,2.9rem)] font-extrabold leading-none text-[var(--fg)]"
    />
  );
}

export default function CaseStudies() {
  return (
    <section id="case-studies" className="section-pad py-28 md:py-40">
      <Reveal className="mx-auto max-w-5xl">
        <p className="kicker mb-6">Case studies</p>
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]">
          Real businesses. Real pipelines.
        </h2>
      </Reveal>

      <div className="mx-auto mt-16 flex max-w-5xl flex-col gap-6">
        {CASES.map((c) => (
          <Reveal
            key={c.name}
            stagger
            className="hairline pt-12 pb-6 md:grid md:grid-cols-[1fr_1.2fr] md:gap-16"
          >
            <div data-reveal-item>
              <h3 className="text-2xl md:text-3xl">{c.name}</h3>
              <p className="mt-1 text-sm text-[var(--faint)]">{c.place}</p>
              <blockquote className="mt-8 max-w-md border-l border-[var(--accent)] pl-5 text-lg leading-relaxed text-[var(--muted)]">
                “{c.quote}”
                <footer className="mt-3 text-sm not-italic text-[var(--faint)]">
                  — {c.person}
                </footer>
              </blockquote>
            </div>
            <div
              data-reveal-item
              className="mt-10 grid grid-cols-3 gap-4 md:mt-0 md:items-center"
            >
              {c.metrics.map((m) => (
                <div key={m.label}>
                  <CountUp m={m} />
                  <p className="mt-2 text-xs leading-snug text-[var(--muted)] md:text-sm">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-5xl text-xs text-[var(--faint)]">
        Results from active Qimma accounts, 2025–26. Individual outcomes vary
        by category, locality, and starting profile strength.
      </p>
    </section>
  );
}
