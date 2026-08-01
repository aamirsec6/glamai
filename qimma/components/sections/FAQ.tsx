"use client";

import { useState } from "react";
import { FAQS } from "@/lib/content";
import Reveal from "@/components/Reveal";

function Item({
  q,
  a,
  open,
  onToggle,
  id,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div className="hairline">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium transition-colors hover:text-[var(--accent-2)]"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          onClick={onToggle}
        >
          {q}
          <span
            aria-hidden="true"
            className="relative h-4 w-4 shrink-0 text-[var(--accent)]"
          >
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
            <span
              className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300"
              style={{ transform: open ? "scaleY(0)" : "scaleY(1)" }}
            />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className="grid transition-[grid-template-rows] duration-400 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-7 text-[var(--muted)]">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-pad py-28 md:py-36">
      <Reveal className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[300px_1fr]">
        <div>
          <p className="kicker mb-6">FAQ</p>
          <h2 className="text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.08]">
            Fair questions, straight answers.
          </h2>
        </div>
        <div>
          {FAQS.map((f, i) => (
            <Item
              key={f.q}
              id={`faq-${i}`}
              q={f.q}
              a={f.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
          <div className="hairline" />
        </div>
      </Reveal>
    </section>
  );
}
