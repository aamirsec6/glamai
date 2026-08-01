import Link from "next/link";
import Reveal from "@/components/Reveal";

export default function FinalCTA() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden py-32 md:py-44"
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 110%, rgba(45,214,200,0.14), transparent 65%), radial-gradient(ellipse 40% 35% at 50% 115%, rgba(127,240,211,0.1), transparent 70%)",
      }}
    >
      {/* accent light rule echoing the hero motif */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgba(45,214,200,0.4)] to-transparent"
      />
      <Reveal stagger className="section-pad mx-auto max-w-4xl text-center">
        <h2
          data-reveal-item
          className="text-[clamp(2.2rem,5.5vw,4.6rem)] leading-[1.04]"
        >
          Stop losing leads
          <br />
          after hours.
        </h2>
        <p
          data-reveal-item
          className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]"
        >
          See your city, your keywords, and your pipeline in a 30-minute demo.
        </p>
        <div
          data-reveal-item
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/sign-up" className="btn-primary">
            Book a Demo <span aria-hidden="true">→</span>
          </Link>
          <a href="mailto:hello@qimma.io" className="btn-ghost">
            hello@qimma.io
          </a>
        </div>
      </Reveal>
    </section>
  );
}
