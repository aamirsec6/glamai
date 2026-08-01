import Link from "next/link";
import { QimmaLogo } from "@/components/marketing/logo";
import { NAV_LINKS, SITE } from "@/lib/marketing-content";

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "AI Agents", href: "/product" },
      { label: "How it Works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Case Studies", href: "/case-studies" },
      { label: "Data & Insights", href: "/data" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Book a Demo", href: SITE.demoUrl },
      { label: "Contact", href: "/contact" },
      { label: "Free QR Tool", href: "/qr-code-generator" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020617] text-zinc-500">
      <div className="mkt-container py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <QimmaLogo size="md" variant="dark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {SITE.tagline} Built for salons, clinics, studios, and local service brands worldwide.
            </p>
            <p className="mt-6 text-sm">
              <a href={`mailto:${SITE.email}`} className="text-cyan-400 transition-colors hover:text-cyan-300">
                {SITE.email}
              </a>
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <p className="text-sm font-medium text-white">{group.title}/</p>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm transition-colors hover:text-cyan-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-600">© {new Date().getFullYear()} Qimma. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            {NAV_LINKS.slice(0, 4).map((link) => (
              <Link key={link.href} href={link.href} className="text-sm hover:text-cyan-400">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
