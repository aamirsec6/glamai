"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { QimmaLogo } from "@/components/marketing/logo";
import { NAV_LINKS, SITE } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

function NavCta({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  return (
    <Link
      href={SITE.demoUrl}
      onClick={onClose}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-[#030712]",
        "shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-all hover:brightness-110 active:scale-[0.98]",
        mobile && "w-full",
      )}
    >
      Book a Demo
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="fixed inset-x-0 top-[41px] z-50 px-4 pt-3 sm:px-6 lg:px-8">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center gap-2 rounded-full border pl-4 pr-2 transition-all duration-300",
          "backdrop-blur-2xl backdrop-saturate-150",
          scrolled
            ? "h-16 border-white/15 bg-[#0a0f1e]/75 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]"
            : "h-[4.25rem] border-white/10 bg-white/[0.06] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]",
        )}
      >
        <Link href="/" className="relative z-10 shrink-0">
          <QimmaLogo size="sm" variant="dark" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive(link.href)
                  ? "bg-white/10 text-white"
                  : "text-zinc-300/90 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 lg:block">
          <NavCta />
        </div>

        <button
          type="button"
          className="ml-auto rounded-full p-2.5 text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/10 bg-[#0a0f1e]/90 p-3 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-white/10 text-white"
                  : "text-zinc-300 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 px-1 pb-1">
            <NavCta mobile onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
