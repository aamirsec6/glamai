import Link from "next/link";
import { ArrowRight } from "lucide-react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
  dark?: boolean;
};

export function PageHero({ eyebrow, title, description, cta }: PageHeroProps) {
  return (
    <section className="mkt-hero-dark mkt-grid-bg relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20">
      <div className="mkt-blob mkt-blob-gold -left-32 top-0" />
      <div className="mkt-blob mkt-blob-soft right-0 top-20" />

      <div className="mkt-container relative">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow && <p className="mkt-eyebrow">{eyebrow}</p>}
          <h1 className="mkt-heading mt-4 text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            {title}
          </h1>
          <p className="mkt-body mx-auto mt-6 max-w-2xl text-lg">{description}</p>
          {cta && (
            <Link href={cta.href} className="mkt-btn-primary mt-8 inline-flex gap-2">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
