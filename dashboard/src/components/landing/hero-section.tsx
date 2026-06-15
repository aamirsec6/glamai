import Link from "next/link";
import { Star, Users } from "lucide-react";
import { GoogleLogo, WhatsAppLogo } from "@/components/landing/brand-logos";

export function HeroSection() {
  return (
    <section className="landing-gradient-bg pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="landing-container">
        <div className="mx-auto max-w-4xl text-center">
          <p className="landing-eyebrow">Marketing Platform</p>

          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your All-in-One AI Marketing Team
            <span className="mt-2 block text-violet-600">
              that Delivers Real Revenue
            </span>
          </h1>

          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Users className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-medium text-slate-700">
              Built for local businesses worldwide
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Google visibility, instant WhatsApp lead qualification, and monthly
            growth reports — three AI agents working together so you focus on your
            craft, not marketing.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up" className="landing-btn-outline min-w-[220px]">
              Free GBP Profile Booster
            </Link>
            <Link href="/sign-up" className="landing-btn-primary min-w-[220px]">
              Book Free Demo
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: GoogleLogo,
              title: "Google Business Profile Agent",
              subtitle: "Bring new potential customers",
              color: "from-blue-50 to-indigo-50 border-blue-100",
            },
            {
              icon: WhatsAppLogo,
              title: "WhatsApp Chat Agent",
              subtitle: "Realtime customer interaction",
              color: "from-emerald-50 to-green-50 border-emerald-100",
            },
            {
              icon: null,
              title: "Growth Intelligence",
              subtitle: "Shared brain of all AI agents",
              color: "from-violet-50 to-purple-50 border-violet-100",
              emoji: "🧠",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`landing-card bg-gradient-to-br ${card.color} p-6 text-center`}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                {card.icon ? (
                  <card.icon className="h-8 w-8" />
                ) : (
                  <span className="text-2xl">{card.emoji}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-xs font-medium text-violet-600">{card.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
