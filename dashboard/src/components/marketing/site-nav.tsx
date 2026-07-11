"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { GlamLogo } from "@/components/marketing/logo";
import { isClerkEnabled } from "@/lib/auth-config";
import { NAV_LINKS, SITE } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

function NavCtaWithClerk({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <div className={cn("h-10 rounded-lg bg-white/5", mobile ? "w-full" : "w-28")} />;

  if (isSignedIn) {
    const role = user?.publicMetadata?.role as string | undefined;
    const href = role === "admin" ? "/admin" : "/client";
    return (
      <Link href={href} className={cn("mkt-btn-primary", mobile && "w-full text-center")} onClick={onClose}>
        Dashboard
      </Link>
    );
  }

  return (
    <div className={cn("flex gap-2", mobile && "w-full flex-col")}>
      <Link href="/sign-in" className={cn("mkt-btn-ghost", mobile && "w-full text-center")} onClick={onClose}>
        Sign in
      </Link>
      <Link href={SITE.demoUrl} className={cn("mkt-btn-primary", mobile && "w-full text-center")} onClick={onClose}>
        Book a Demo
      </Link>
    </div>
  );
}

function NavCta({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  if (!isClerkEnabled) {
    return (
      <Link
        href={SITE.demoUrl}
        className={cn("mkt-btn-primary", mobile && "w-full text-center")}
        onClick={onClose}
      >
        Book a Demo
      </Link>
    );
  }
  return <NavCtaWithClerk mobile={mobile} onClose={onClose} />;
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

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-black/85 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "border-transparent bg-black/40 backdrop-blur-md"
      )}
    >
      <div className="mkt-container flex h-16 items-center justify-between lg:h-[4.25rem]">
        <Link href="/" className="relative z-10">
          <GlamLogo size="sm" variant="dark" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#c9a962]/15 text-[#e8d5a3]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <NavCta />
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 hover:text-white lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4">
            <NavCta mobile />
          </div>
        </div>
      )}
    </header>
  );
}
