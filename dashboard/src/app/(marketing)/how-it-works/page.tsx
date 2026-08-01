import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { HOW_IT_WORKS_STEPS, SITE } from "@/lib/marketing-content";

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it Works"
        title="From signup to qualified leads in days, not months"
        description="A clear, repeatable process — connect your accounts, let AI agents run, and watch insights tell you what to do next."
        cta={{ label: "Get started", href: SITE.demoUrl }}
      />

      <section className="mkt-section">
        <div className="mkt-container">
          <div className="relative">
            <div className="absolute left-8 top-0 hidden h-full w-px bg-white/10 lg:left-1/2 lg:block" />
            <div className="space-y-16">
              {HOW_IT_WORKS_STEPS.map((step, i) => (
                <div
                  key={step.step}
                  className={`relative grid gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:text-right" : ""}`}
                >
                  <div className={i % 2 === 1 ? "lg:order-2 lg:text-left" : ""}>
                    <span className="text-5xl font-bold text-white/10">{step.step}</span>
                    <h3 className="mkt-heading mt-2 text-2xl">{step.title}</h3>
                    <p className="mkt-body mt-3">{step.desc}</p>
                  </div>
                  <div
                    className={`flex items-center ${i % 2 === 1 ? "lg:order-1 lg:justify-end" : "lg:justify-start"}`}
                  >
                    <div className="mkt-card flex h-32 w-full max-w-sm items-center justify-center lg:h-40">
                      <CheckCircle2 className="h-12 w-12 text-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container">
          <h2 className="mkt-heading text-center text-2xl">What you&apos;ll need</h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {["Google Business Profile", "WhatsApp Business number", "15 min for onboarding"].map(
              (item) => (
                <div key={item} className="mkt-card p-5 text-center text-sm font-medium text-zinc-300">
                  {item}
                </div>
              ),
            )}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-zinc-500">
            We never post without your approval on connected accounts. You stay in control.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container text-center">
          <Link href="/data" className="mkt-btn-ghost inline-flex gap-2">
            Learn what data we use <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
