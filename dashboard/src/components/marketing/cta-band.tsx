import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { SITE } from "@/lib/marketing-content";

export function CtaBand() {
  return (
    <section className="mkt-section">
      <div className="mkt-container">
        <Reveal>
          <div className="mkt-cta-band group">
            <div className="mkt-blob mkt-blob-violet mkt-blob-drift -right-20 -top-20 h-48 w-48 opacity-40" />
            <p className="relative text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              Available for new clients
            </p>
            <h2 className="relative mt-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to take the next step?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
              Book a 15-minute demo. See live agents, your Path to Top 3 scorecard, and what Qimma can do for your business.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={SITE.demoUrl} className="mkt-btn-primary min-w-[180px]">
                Book a Demo
              </Link>
              <Link href="/contact" className="mkt-btn-secondary min-w-[180px]">
                Contact Us
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
