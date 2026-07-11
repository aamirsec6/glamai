import Link from "next/link";
import { GlamLogo } from "@/components/marketing/logo";
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
    title: "Account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Book a Demo", href: SITE.demoUrl },
      { label: "Client Dashboard", href: "/client" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#020202] text-zinc-400">
      <div className="mkt-container py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <GlamLogo size="md" variant="dark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              {SITE.tagline} Built for interior designers, clinics, salons, and local service brands in India.
            </p>
            <p className="mt-6 text-sm">
              <a href={`mailto:${SITE.email}`} className="text-white transition-colors hover:text-[#d4af37]">
                {SITE.email}
              </a>
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <p className="text-sm font-semibold text-white">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-[#d4af37]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-white">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-[#d4af37]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Made for local businesses that deserve better marketing.</p>
        </div>
      </div>
    </footer>
  );
}
