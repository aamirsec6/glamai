"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { GlamLogo } from "@/components/landing/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="landing-container flex h-16 items-center justify-between">
        <Link href="/">
          <GlamLogo size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-violet-700"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/sign-up" className="landing-btn-primary">
            Book Free Demo
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2.5 text-sm font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/sign-up"
            className="landing-btn-primary mt-4 w-full"
            onClick={() => setOpen(false)}
          >
            Book Free Demo
          </Link>
        </div>
      )}
    </header>
  );
}
