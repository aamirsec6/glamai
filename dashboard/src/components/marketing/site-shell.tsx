import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt-site min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
