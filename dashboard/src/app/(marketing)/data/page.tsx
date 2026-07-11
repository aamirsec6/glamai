import Link from "next/link";
import { Database, LineChart, Lock, Shield } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { CtaBand } from "@/components/marketing/cta-band";
import { DATA_FOR_INSIGHTS, DATA_WE_COLLECT } from "@/lib/marketing-content";

export default function DataPage() {
  return (
    <>
      <PageHero
        eyebrow="Data & Insights"
        title="Transparent about what we collect — and why it matters"
        description="GlamAI only uses data that helps you get found, qualify leads, and grow. Here's exactly what we take and how it powers your insights."
      />

      <section className="mkt-section">
        <div className="mkt-container">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-[#d4af37]" />
            <h2 className="mkt-heading text-2xl">What data we collect</h2>
          </div>
          <p className="mkt-body mt-3 max-w-2xl">
            We connect to your Google Business Profile and WhatsApp with your permission. We never sell your data.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {DATA_WE_COLLECT.map((block) => (
              <div key={block.category} className="mkt-card p-8">
                <h3 className="font-bold text-white">{block.category}</h3>
                <ul className="mt-4 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-zinc-400">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#c9a962]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-lg border border-[#c9a962]/20 bg-[#c9a962]/5 px-3 py-2 text-xs text-[#e8d5a3]">
                  <strong>Why:</strong> {block.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-section-muted">
        <div className="mkt-container">
          <div className="flex items-center gap-3">
            <LineChart className="h-8 w-8 text-[#d4af37]" />
            <h2 className="mkt-heading text-2xl">How we turn data into insights</h2>
          </div>
          <p className="mkt-body mt-3 max-w-2xl">
            Our analytics models run on your stored data — no black box. Each signal maps to a clear business outcome.
          </p>

          <div className="mkt-card mt-10 overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                  <th className="px-6 py-4 font-semibold text-white">Data signal</th>
                  <th className="px-6 py-4 font-semibold text-white">Insight you get</th>
                </tr>
              </thead>
              <tbody>
                {DATA_FOR_INSIGHTS.map((row, i) => (
                  <tr key={row.signal} className={i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}>
                    <td className="px-6 py-4 font-medium text-zinc-200">{row.signal}</td>
                    <td className="px-6 py-4 text-zinc-400">{row.insight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container grid gap-8 md:grid-cols-2">
          <div className="mkt-card flex gap-4 p-8">
            <Shield className="h-10 w-10 shrink-0 text-[#c9a962]" />
            <div>
              <h3 className="font-bold text-white">You own your data</h3>
              <p className="mkt-body mt-2 text-sm">
                Export or disconnect anytime. We use data only to power your GlamAI account and reports.
              </p>
            </div>
          </div>
          <div className="mkt-card flex gap-4 p-8">
            <Lock className="h-10 w-10 shrink-0 text-[#d4af37]" />
            <div>
              <h3 className="font-bold text-white">Secure by design</h3>
              <p className="mkt-body mt-2 text-sm">
                Encrypted connections to Google and WhatsApp. Tenant-isolated storage — your data never mixes with other clients.
              </p>
            </div>
          </div>
        </div>
        <p className="mkt-container mt-8 text-center text-sm text-zinc-500">
          See insights live in the{" "}
          <Link href="/client/insights" className="mkt-link">
            client dashboard
          </Link>{" "}
          or platform view in{" "}
          <Link href="/admin/intelligence" className="mkt-link">
            admin intelligence
          </Link>
          .
        </p>
      </section>

      <CtaBand />
    </>
  );
}
