import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { QrCodeGeneratorTool } from "@/components/marketing/qr-code-generator-tool";
import { SITE } from "@/lib/marketing-content";

export const metadata = {
  title: "Free QR Code Generator for Google Maps Reviews | Qimma",
  description:
    "Create a branded Google review QR code for your local business. Free forever — print it at your counter or send it on WhatsApp.",
};

export default function QrCodeGeneratorPage() {
  return (
    <>
      <PageHero
        eyebrow="Free tool"
        title="Free QR Code Generator for Google Maps Reviews"
        description="Turn happy customers into keyword-rich Google reviews. Generate a scannable QR code in seconds — no design skills needed."
      />
      <section className="mkt-section -mt-8">
        <div className="mkt-container mb-10 flex flex-wrap justify-center gap-4 text-sm text-zinc-400">
          <span className="mkt-badge">Free forever</span>
          <span className="mkt-badge">No credit card</span>
          <span className="mkt-badge">Works for any business</span>
        </div>
        <QrCodeGeneratorTool />
      </section>
      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container text-center">
          <h2 className="mkt-heading text-2xl sm:text-3xl">
            Qimma sends review requests automatically
          </h2>
          <p className="mkt-body mx-auto mt-4 max-w-2xl">
            Connect your Google profile and WhatsApp. When a lead is marked won, Qimma can text
            them your review link — plus AI replies to every new Google review.
          </p>
          <Link href={SITE.demoUrl} className="mkt-btn-primary mt-8 inline-flex gap-2">
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
