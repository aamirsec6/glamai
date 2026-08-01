import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PeachDashboardVisual } from "@/components/marketing/home/peach-dashboard-visual";
import { SITE } from "@/lib/marketing-content";

export function PeachHero() {
  return (
    <section className="mkt-peach-hero relative overflow-hidden">
      <div className="mkt-peach-hero-bg" />
      <div className="mkt-container-wide relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="mkt-fade-up max-w-xl">
            <p className="mkt-peach-label">AI growth platform</p>
            <h1 className="mkt-peach-headline mt-4">
              Automate your local marketing with{" "}
              <span className="mkt-gradient-text">Qimma.</span>
            </h1>
            <p className="mkt-body mt-6 text-lg text-zinc-400">
              Six friendly AI specialists run your Google profile, local SEO, reviews,
              WhatsApp leads, and weekly insights — while you focus on your customers.
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-500">
              Trusted by salons, clinics, studios & local brands
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={SITE.demoUrl} className="mkt-btn-primary mkt-pulse-ring">
                Book a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="#features" className="mkt-btn-secondary">
                See how it works
              </Link>
            </div>
          </div>

          <div className="mkt-fade-up mkt-delay-2 relative mt-4 flex justify-center lg:mt-0 lg:justify-end">
            <PeachDashboardVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
