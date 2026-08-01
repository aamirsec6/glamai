"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/content";

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="14" cy="14" r="9.5" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M20 20 L25.5 25.5"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="3" fill="var(--accent)" />
    </svg>
  );
}

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,border,backdrop-filter] duration-500 ${
        scrolled
          ? "border-b border-[var(--line)] bg-[rgba(7,8,10,0.72)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav
        className="section-pad flex h-16 items-center justify-between"
        aria-label="Main"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6" />
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
            Qimma
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="link-underline text-sm text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
            >
              {l.label}
            </a>
          ))}
          <Link href="/sign-up" className="btn-primary !px-5 !py-2.5 text-sm">
            Book a Demo
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`h-px w-6 bg-[var(--fg)] transition-transform duration-300 ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-6 bg-[var(--fg)] transition-transform duration-300 ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </nav>

      {/* mobile drawer */}
      <div
        className={`lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 top-16 z-40 bg-[var(--bg)] transition-opacity duration-400 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="section-pad flex flex-col gap-2 pt-10">
            {NAV_LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--line)] py-4 font-[family-name:var(--font-display)] text-2xl font-semibold transition-all duration-500"
                style={{
                  transitionDelay: `${i * 40}ms`,
                  transform: open ? "translateY(0)" : "translateY(12px)",
                  opacity: open ? 1 : 0,
                }}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="btn-primary mt-8 justify-center"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
