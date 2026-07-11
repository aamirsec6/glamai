import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { LogoStripSection } from "@/components/marketing/logo-strip-section";
import { PRODUCTS, SITE } from "@/lib/marketing-content";

const EXPLORE = [
  {
    title: "How it Works",
    desc: "Connect GBP & WhatsApp → AI agents run → you get qualified leads.",
    href: "/how-it-works",
    icon: Sparkles,
  },
  {
    title: "Case Studies",
    desc: "Real studios. Real rankings. Real revenue from local search.",
    href: "/case-studies",
    icon: TrendingUp,
  },
  {
    title: "Data & Insights",
    desc: "What we collect, how we use it, and the models behind your dashboard.",
    href: "/data",
    icon: Shield,
  },
  {
    title: "Contact",
    desc: "Talk to our team — demos, partnerships, or questions.",
    href: "/contact",
    icon: MessageCircle,
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mkt-hero-dark mkt-grid-bg relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="mkt-blob mkt-blob-gold -left-24 top-10" />
        <div className="mkt-blob mkt-blob-soft -right-16 top-32" />

        <div className="mkt-container relative">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
            <div className="mkt-fade-up">
              <p className="mkt-eyebrow">AI marketing for local business</p>
              <h1 className="mkt-heading mt-5 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
                Turn local search into
                <span className="mt-2 block landing-highlight-hero">qualified revenue.</span>
              </h1>
              <p className="mkt-body mt-6 max-w-lg text-lg">
                GlamAI is your autonomous marketing team — GBP posts, WhatsApp qualification,
                reviews, and business insights — built for service businesses in India.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={SITE.demoUrl} className="mkt-btn-primary mkt-pulse-ring">
                  Book a Demo
                </Link>
                <Link href="/product" className="mkt-btn-outline-light">
                  Explore product
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#c9a962]" /> GBP optimization
                </span>
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#c9a962]" /> WhatsApp AI
                </span>
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#c9a962]" /> Live insights
                </span>
              </div>
            </div>

            <div className="mkt-fade-up mkt-delay-2 mkt-float relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="mkt-card-3d rounded-2xl border border-white/10 bg-[#0a0a0a]/90 p-1 backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2 text-xs text-zinc-600">GlamAI · Studio Dashboard</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Health", v: "72" },
                      { l: "Leads", v: "8" },
                      { l: "GBP views", v: "2.0k" },
                    ].map((s) => (
                      <div key={s.l} className="mkt-card-dark rounded-xl p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">{s.l}</p>
                        <p className="mt-1 text-xl font-bold text-white">{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mkt-card-dark rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs text-[#d4af37]">
                      <Bot className="h-4 w-4" /> AI Agents · Running
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      4 posts scheduled · 2 reviews replied · Profile optimized
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#c9a962]/20 bg-gradient-to-br from-[#c9a962]/10 to-transparent p-4">
                    <p className="text-xs text-[#c9a962]">Image post draft</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-200">
                      ✨ 3BHK transformation in Whitefield — book a free consultation…
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LogoStripSection />

      <section className="mkt-section">
        <div className="mkt-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mkt-eyebrow">Explore</p>
            <h2 className="mkt-heading mt-3 text-3xl sm:text-4xl">
              Everything you need to know — on its own page
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {EXPLORE.map((item) => (
              <Link key={item.href} href={item.href} className="mkt-card group flex gap-5 p-8">
                <div className="mkt-icon-box">
                  <item.icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white group-hover:text-[#d4af37]">
                    {item.title}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </h3>
                  <p className="mkt-body mt-2 text-sm">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mkt-eyebrow">Product</p>
              <h2 className="mkt-heading mt-3 text-3xl">Four AI agents. One growth engine.</h2>
            </div>
            <Link href="/product" className="mkt-btn-ghost gap-2">
              View all agents <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <Link key={p.title} href={p.href} className="mkt-card block h-full p-6">
                <h3 className="font-semibold text-white">{p.title}</h3>
                <p className="mkt-body mt-2 text-sm">{p.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
