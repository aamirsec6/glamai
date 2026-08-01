"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";

/* ------------------------------------------------------------------ */
/* Micro-scene 1: WhatsApp qualification — messages type themselves   */
/* in when the block enters view. Stylized chat, not a screenshot.    */
/* ------------------------------------------------------------------ */
const CHAT: { from: "lead" | "maya"; text: string; tag?: string }[] = [
  { from: "lead", text: "Hi, do you do 3BHK interiors in Indiranagar?" },
  {
    from: "maya",
    text: "We do! Quick question so I route you right — is this a full-home project or specific rooms?",
    tag: "intent",
  },
  { from: "lead", text: "Full home. Moving in by November." },
  {
    from: "maya",
    text: "Lovely. Most full 3BHKs with us land between ₹12–20L. Does that range work for you?",
    tag: "budget",
  },
  { from: "lead", text: "Yes, around 15 is fine." },
  {
    from: "maya",
    text: "Perfect — booking you a site visit with our lead designer. Two slots open Thursday. ✅ Qualified lead → your pipeline",
    tag: "handoff",
  },
];

function ChatScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(CHAT.length);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        CHAT.forEach((_, i) =>
          setTimeout(() => setVisible(i + 1), 350 + i * 620),
        );
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-raise)] p-6"
      aria-label="Example WhatsApp qualification conversation"
    >
      {CHAT.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] transition-all duration-500 ${
            m.from === "maya" ? "self-end" : "self-start"
          }`}
          style={{
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.from === "maya"
                ? "rounded-br-sm bg-[rgba(45,214,200,0.12)] text-[var(--fg)]"
                : "rounded-bl-sm bg-[rgba(255,255,255,0.05)] text-[var(--muted)]"
            }`}
          >
            {m.text}
          </div>
          {m.tag && (
            <span className="mt-1 block text-right text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {m.tag} captured
            </span>
          )}
        </div>
      ))}
      <p className="mt-2 text-center text-xs text-[var(--faint)]">
        Median first response: under 30 seconds
      </p>
    </div>
  );
}

/* Micro-scene 2: GBP content engine — cadence rail + completeness. */
function CadenceScene() {
  const weeks = ["W1", "W2", "W3", "W4"];
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-raise)] p-6">
      <div className="flex items-end justify-between gap-4">
        {weeks.map((w, i) => (
          <div key={w} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className="w-3 rounded-full bg-gradient-to-t from-[rgba(45,214,200,0.2)] to-[var(--accent)]"
                style={{ height: `${45 + i * 16}%` }}
              />
            </div>
            <span className="text-xs text-[var(--faint)]">{w}</span>
          </div>
        ))}
      </div>
      <div className="hairline mt-6 pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">Profile completeness</span>
          <span className="font-semibold text-[var(--accent)]">98%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div className="h-full w-[98%] rounded-full bg-[var(--accent)]" />
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Spark drafts, you approve, it publishes — services, offers, photos,
          posts. Cadence never slips.
        </p>
      </div>
    </div>
  );
}

/* Micro-scene 3: rank path — keyword climbs positions on a rail. */
const RANKS = [
  { kw: "“interior designer indiranagar”", from: 18, to: 3 },
  { kw: "“3bhk interiors bangalore”", from: 24, to: 6 },
  { kw: "“modular kitchen near me”", from: 12, to: 4 },
];

function RankScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setOn(true), io.disconnect()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-[var(--line)] bg-[var(--bg-raise)] p-6"
    >
      {RANKS.map((r, i) => (
        <div key={r.kw} className={i > 0 ? "hairline mt-5 pt-5" : ""}>
          <p className="text-sm text-[var(--muted)]">{r.kw}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="w-10 text-right text-sm text-[var(--faint)]">
              #{r.from}
            </span>
            <div className="relative h-px flex-1 bg-[rgba(255,255,255,0.1)]">
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--accent)] transition-all duration-[1200ms] ease-out"
                style={{
                  width: on ? `${100 - (r.to / r.from) * 100}%` : "0%",
                  transitionDelay: `${i * 250}ms`,
                }}
              />
            </div>
            <span className="w-10 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--accent)]">
              #{r.to}
            </span>
          </div>
        </div>
      ))}
      <p className="mt-5 text-sm text-[var(--muted)]">
        Scout finds the searches; Sage moves the rankings. 90-day median shown,
        illustrative keywords.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
const FEATURES = [
  {
    kicker: "WhatsApp AI",
    title: "Every enquiry answered like your best receptionist — in seconds.",
    body: "Maya greets, understands intent, checks budget and timeline, then hands qualified leads to you with full context. Late-night enquiries stop dying in your inbox.",
    scene: <ChatScene />,
  },
  {
    kicker: "GBP + content engine",
    title: "A Business Profile that looks alive, because it is.",
    body: "Spark keeps posts, offers, photos, and services fresh on a steady cadence — the single strongest signal that your business is open, active, and worth ranking.",
    scene: <CadenceScene />,
  },
  {
    kicker: "Local SEO",
    title: "A measurable path from invisible to top three.",
    body: "Scout maps what your city actually searches. Sage closes the gaps — categories, citations, keywords, replies — and you watch positions move month over month.",
    scene: <RankScene />,
  },
];

export default function FeatureStories() {
  return (
    <section className="section-pad py-28 md:py-40">
      <Reveal className="mx-auto max-w-5xl">
        <p className="kicker mb-6">Product depth</p>
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]">
          Three engines, one pipeline.
        </h2>
      </Reveal>

      <div className="mx-auto mt-20 flex max-w-5xl flex-col gap-24 md:gap-32">
        {FEATURES.map((f, i) => (
          <Reveal
            key={f.kicker}
            stagger
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-16`}
          >
            <div
              data-reveal-item
              className={i % 2 === 1 ? "md:order-2" : undefined}
            >
              <p className="kicker mb-4">{f.kicker}</p>
              <h3 className="text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight">
                {f.title}
              </h3>
              <p className="mt-5 text-[var(--muted)]">{f.body}</p>
            </div>
            <div data-reveal-item>{f.scene}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
