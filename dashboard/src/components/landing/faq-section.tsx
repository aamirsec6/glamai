"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Will it work if I'm not tech-savvy?",
    a: "Absolutely. GlamAI is simple and intuitive. If you can use WhatsApp, you can use GlamAI with ease.",
  },
  {
    q: "How soon will I see results?",
    a: "WhatsApp AI works from day one. GBP optimization completes in 48 hours. Most users see more leads within 7–14 days of setup.",
  },
  {
    q: "Is my customer data secure?",
    a: "100%. We follow strict data privacy protocols and encryption. Your customer data is never sold.",
  },
  {
    q: "Is there someone to help if I get stuck?",
    a: "Of course! Our support team is always just a call or WhatsApp away.",
  },
  {
    q: "Does GlamAI work for all types of businesses?",
    a: "Yes. Whether you're a salon, doctor, gym, or restaurant — GlamAI is built for local business growth worldwide.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No long-term contract. Cancel with 30 days notice. Enterprise includes deliverables guarantee.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="landing-section scroll-mt-20 bg-white">
      <div className="landing-container max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Common Questions from Business Owners
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q} className="landing-card overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-medium text-slate-900">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <p className="border-t border-slate-100 px-6 py-4 text-sm leading-relaxed text-slate-600">
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
