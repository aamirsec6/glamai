import Link from "next/link";
import { Quote } from "lucide-react";

const STORIES = [
  {
    quote:
      "Before GlamAI, we barely got 2–3 leads a month. Now we're ranking on the first page of Google and generating 20+ qualified leads every week. WhatsApp replies happen instantly — we just call the warm ones.",
    name: "Dr. Sharma",
    role: "Dental Clinic Owner",
    location: "Mumbai",
  },
  {
    quote:
      "Despite being an established salon, we struggled to compete with bigger chains online. After GlamAI, we saw a 60% jump in new footfall and now receive 20–25 client calls every week from Google and WhatsApp.",
    name: "Priya & Jay",
    role: "Salon Owners",
    location: "Bangalore",
  },
  {
    quote:
      "In just 3 months, our Google profile views doubled and revenue jumped 2×. GlamAI handles posts, replies, and lead qualification — I finally focus on training clients, not chasing marketing.",
    name: "Rahul Mehta",
    role: "Gym Founder",
    location: "Delhi",
  },
];

export function TestimonialsSection() {
  return (
    <section className="landing-section bg-slate-50">
      <div className="landing-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Real Stories, Real Results
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            See how GlamAI has helped business owners like you grow their businesses.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STORIES.map((s) => (
            <article
              key={s.name}
              className="landing-card relative p-8"
            >
              <Quote className="mb-4 h-8 w-8 text-violet-200" />
              <p className="text-sm leading-relaxed text-slate-600 italic">
                "{s.quote}"
              </p>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="text-sm text-slate-500">
                  {s.role} · {s.location}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/sign-up" className="landing-btn-outline">
            Free GBP Profile Booster
          </Link>
          <Link href="/sign-up" className="landing-btn-primary">
            Book Free Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
