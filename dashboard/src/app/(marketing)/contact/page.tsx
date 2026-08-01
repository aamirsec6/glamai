"use client";

import { useState } from "react";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { SITE } from "@/lib/marketing-content";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", business: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about growing your business"
        description="Book a demo, ask about pricing, or tell us about your business. We typically respond within one business day."
      />

      <section className="mkt-section">
        <div className="mkt-container grid gap-12 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-2">
            <div>
              <h2 className="mkt-heading text-xl">Get in touch</h2>
              <p className="mkt-body mt-2">
                Whether you&apos;re a salon in Dubai or a studio in Bangalore — we&apos;d love to hear from you.
              </p>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 text-sm text-zinc-400">
                <Mail className="h-5 w-5 shrink-0 text-cyan-400" />
                <a href={`mailto:${SITE.email}`} className="mkt-link">
                  {SITE.email}
                </a>
              </li>
              <li className="flex gap-3 text-sm text-zinc-400">
                <Phone className="h-5 w-5 shrink-0 text-cyan-400" />
                {SITE.phone}
              </li>
              <li className="flex gap-3 text-sm text-zinc-400">
                <MapPin className="h-5 w-5 shrink-0 text-cyan-400" />
                Bangalore, India · Serving local businesses worldwide
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div className="mkt-card flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle2 className="h-14 w-14 text-cyan-400" />
                <h3 className="mkt-heading mt-4 text-xl">Message received</h3>
                <p className="mkt-body mt-2">
                  Thanks, {form.name || "there"}! We&apos;ll reach out at {form.email || "your email"} soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mkt-card space-y-5 p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-300">Name</span>
                    <input
                      required
                      className="mkt-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-300">Email</span>
                    <input
                      type="email"
                      required
                      className="mkt-input"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">Business name</span>
                  <input
                    className="mkt-input"
                    value={form.business}
                    onChange={(e) => setForm({ ...form, business: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">How can we help?</span>
                  <textarea
                    required
                    rows={4}
                    className="mkt-input resize-none"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </label>
                <button type="submit" className="mkt-btn-primary w-full sm:w-auto">
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
