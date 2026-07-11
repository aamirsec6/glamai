import Link from "next/link";
import { SITE } from "@/lib/marketing-content";

export function CtaBand() {
  return (
    <section className="mkt-section">
      <div className="mkt-container">
        <div className="mkt-cta-band relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16 sm:py-16">
          <div className="mkt-blob mkt-blob-white absolute -right-20 -top-20 opacity-60" />
          <h2 className="relative mkt-heading text-3xl sm:text-4xl">Ready to grow on autopilot?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
            Book a 15-minute demo. We&apos;ll show you live agents, insights, and what GlamAI can do for your business.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={SITE.demoUrl} className="mkt-btn-primary min-w-[180px]">
              Book a Demo
            </Link>
            <Link href="/contact" className="mkt-btn-outline-light min-w-[180px]">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
