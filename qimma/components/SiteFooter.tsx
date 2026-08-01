import Link from "next/link";
import Reveal from "@/components/Reveal";

const COLS = [
  {
    h: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Agents", href: "#product" },
      { label: "Case studies", href: "#case-studies" },
    ],
  },
  {
    h: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    h: "Legal",
    links: [
      { label: "Privacy policy", href: "#" },
      { label: "Terms of service", href: "#" },
      { label: "Data processing", href: "#" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="hairline">
      <Reveal className="section-pad py-16 md:py-20" y={20}>
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--accent)]">
              Qimma
            </p>
            <p className="mt-3 max-w-xs text-sm text-[var(--muted)]">
              AI marketing for local businesses that want real leads.
            </p>
            <a
              href="mailto:hello@qimma.io"
              className="link-underline mt-5 inline-block text-sm text-[var(--fg)]"
            >
              hello@qimma.io
            </a>
            <div className="mt-6 flex gap-5 text-sm text-[var(--faint)]">
              <a href="#" className="transition-colors hover:text-[var(--fg)]">
                LinkedIn
              </a>
              <a href="#" className="transition-colors hover:text-[var(--fg)]">
                Instagram
              </a>
              <a href="#" className="transition-colors hover:text-[var(--fg)]">
                X
              </a>
            </div>
          </div>
          {COLS.map((c) => (
            <nav key={c.h} aria-label={c.h}>
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--faint)]">
                {c.h}
              </h3>
              <ul className="mt-5 flex flex-col gap-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="hairline mt-14 flex flex-col justify-between gap-3 pt-7 text-xs text-[var(--faint)] md:flex-row">
          <p>© 2026 Qimma. Bengaluru, India.</p>
          <p>
            Built for the businesses your city runs on.{" "}
            <Link href="/sign-up" className="text-[var(--accent)]">
              Book a demo →
            </Link>
          </p>
        </div>
      </Reveal>
    </footer>
  );
}
