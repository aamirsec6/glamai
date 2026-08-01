import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { CASE_STUDIES, SITE } from "@/lib/marketing-content";

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Case Studies"
        title="Local businesses growing with Qimma"
        description="Real results from interior design studios in Bangalore — rankings, leads, and revenue you can measure."
        cta={{ label: "Book a Demo", href: SITE.demoUrl }}
      />

      <section className="mkt-section">
        <div className="mkt-container space-y-16">
          {CASE_STUDIES.map((study) => (
            <article key={study.slug} className="mkt-card-metric overflow-hidden p-0">
              <div className="p-8 sm:p-12">
                <p className="text-sm font-medium text-cyan-400">{study.industry}</p>
                <h2 className="mkt-heading mt-2 text-2xl sm:text-3xl">{study.headline}</h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {study.metrics.map((m) => (
                    <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                      <p className="mkt-stat-value text-2xl">{m.value}</p>
                      <p className="mt-1 text-xs font-medium text-zinc-400">{m.label}</p>
                      <p className="text-[11px] text-zinc-500">{m.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 grid gap-8 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-white">Challenge</h3>
                    <p className="mkt-body mt-2 text-sm">{study.challenge}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Solution</h3>
                    <p className="mkt-body mt-2 text-sm">{study.solution}</p>
                  </div>
                </div>

                <blockquote className="mt-10 border-l-4 border-cyan-400 pl-6">
                  <p className="text-lg italic text-zinc-300">&ldquo;{study.quote}&rdquo;</p>
                  <footer className="mt-2 text-sm text-zinc-500">— {study.author}</footer>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-section-muted text-center">
        <div className="mkt-container">
          <p className="text-zinc-400">Want results like these for your business?</p>
          <Link href="/contact" className="mkt-btn-primary mt-6 inline-flex">
            Talk to our team
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
