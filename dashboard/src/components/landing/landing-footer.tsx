import Link from "next/link";
import { GlamLogo } from "@/components/landing/logo";

const VERTICALS = [
  "Salon Owners",
  "Gym & Fitness Centres",
  "Doctors & Health Clinics",
  "Restaurants & Bars",
  "Interior Designers",
  "Handyman Services",
];

const COMPANY = [
  { label: "Pricing", href: "#pricing" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Sign in", href: "/sign-in" },
];

export function LandingFooter() {
  return (
    <footer>
      <section className="landing-purple-gradient py-20 text-center text-white">
        <div className="landing-container">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Marketing that actually delivers revenue.
          </h2>
          <p className="mt-3 text-lg text-violet-100">
            No stress. No guesswork. Just real growth!
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
          >
            Book Free Demo
          </Link>

          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold">FREE</p>
            <p className="mt-1 text-lg font-bold">AI Google Business Profile Booster</p>
            <p className="mt-2 text-sm text-violet-100">
              Get more leads & customers from Google
            </p>
            <Link
              href="/sign-up"
              className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
            >
              Try on WhatsApp →
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200 bg-white py-14">
        <div className="landing-container grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <GlamLogo size="md" />
            <p className="mt-4 max-w-sm text-sm text-slate-500">
              Marketing AI platform for local businesses that delivers real revenue.
            </p>
            <p className="mt-4 text-sm text-slate-500">hello@glamai.in</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">GlamAI For</p>
            <ul className="mt-4 space-y-2">
              {VERTICALS.map((v) => (
                <li key={v} className="text-sm text-slate-500">
                  {v}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">Company</p>
            <ul className="mt-4 space-y-2">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-slate-500 hover:text-violet-600">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="landing-container mt-12 border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} GlamAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
