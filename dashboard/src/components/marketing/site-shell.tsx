import Link from "next/link";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SITE } from "@/lib/marketing-content";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt-site min-h-screen flex flex-col">
      <Link href={SITE.demoUrl} className="mkt-announcement sticky top-0 z-[60]">
        Book a free demo — see your AI marketing team live →
      </Link>
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
