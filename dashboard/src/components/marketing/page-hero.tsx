import Link from "next/link";
import { ArrowRight } from "lucide-react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
};

export function PageHero({ eyebrow, title, description, cta }: PageHeroProps) {
  return (
    <section className="mkt-hero mkt-grid-bg relative overflow-hidden">
      <div className="mkt-container relative">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow && <p className="mkt-eyebrow">{eyebrow}</p>}
          <h1 className="mkt-heading-display mt-4">{title}</h1>
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
