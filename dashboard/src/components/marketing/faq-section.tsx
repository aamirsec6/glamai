"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "What is Qimma, and how does it benefit my business?",
    a: "Qimma is an AI marketing team for local businesses. It optimizes your Google Business Profile, qualifies leads on WhatsApp, collects reviews, and sends monthly growth reports — so you get more customers with less manual work.",
  },
  {
    q: "How secure is my customer data?",
    a: "Your data is encrypted and tenant-isolated. We never sell customer information. Each business gets its own secure workspace.",
  },
  {
    q: "How soon will I see results?",
    a: "WhatsApp AI works from day one. GBP optimization completes within 48 hours. Most clients see more qualified leads within 7–14 days.",
  },
  {
    q: "How easy is it to get started?",
    a: "Sign up, connect your Google Business Profile and WhatsApp number, and our AI agents start working. No technical skills required.",
  },
  {
    q: "What kind of results can I expect?",
    a: "Clients typically see faster WhatsApp responses, more GBP visibility, better-qualified leads, and measurable monthly growth in their value report.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No long-term lock-in on Starter and Growth plans. Cancel with 30 days notice.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mkt-section scroll-mt-20">
      <div className="mkt-container max-w-3xl">
        <div className="text-center">
          <p className="mkt-eyebrow">FAQ</p>
          <h2 className="mkt-heading mt-4 text-3xl sm:text-4xl">
            Got questions?
            <span className="mt-1 block mkt-gradient-text">We&apos;ve got answers.</span>
          </h2>
        </div>

        <div className="mt-14 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q} className="mkt-card overflow-hidden p-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-semibold text-white">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-neutral-400 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <p className="border-t border-white/10 px-6 py-4 text-sm leading-relaxed text-zinc-400">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
