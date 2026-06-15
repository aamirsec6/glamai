import { Shield, Check } from "lucide-react";

const GUARANTEES = [
  "4 optimized GBP posts every month",
  "WhatsApp AI responds in under 30 seconds",
  "Monthly value report delivered by the 5th",
  "GBP fully optimized within 48 hours",
  "Lead notifications in under 2 minutes",
];

export function GuaranteesSection() {
  return (
    <section className="landing-section bg-white">
      <div className="landing-container">
        <div className="landing-card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="landing-purple-gradient p-8 text-white sm:p-12">
              <Shield className="h-10 w-10 text-violet-200" />
              <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
                5 guarantees every month.
                <br />
                Or we make it right.
              </h2>
              <p className="mt-4 text-violet-100 leading-relaxed">
                Most agencies over-promise rankings. GlamAI guarantees
                deliverables you can verify in your dashboard — every single month.
              </p>
              <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm text-violet-50">
                <strong>Enterprise:</strong> Miss a guaranteed deliverable? Your
                next month is free.
              </p>
            </div>

            <div className="p-8 sm:p-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-600">
                What we guarantee
              </p>
              <ul className="mt-6 space-y-4">
                {GUARANTEES.map((g) => (
                  <li key={g} className="flex gap-3 text-slate-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                    {g}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm text-slate-500">
                Rankings are actively optimized — outcomes vary by competition
                and location. We guarantee the systems, not vanity metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
