const VERTICALS = [
  "Interior Design",
  "Salons",
  "Dental Clinics",
  "Bakeries",
  "Fitness Studios",
  "Boutiques",
  "Pet Clinics",
  "Tutoring Centres",
];

/* Refined type marquee — duplicated track for a seamless loop. */
export default function Verticals() {
  const row = [...VERTICALS, ...VERTICALS];
  return (
    <section className="hairline overflow-hidden py-16 md:py-20">
      <p className="section-pad kicker mb-8 text-center">
        Built for the businesses your city runs on
      </p>
      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <ul className="marquee-track" aria-label="Supported business types">
          {row.map((v, i) => (
            <li
              key={`${v}-${i}`}
              aria-hidden={i >= VERTICALS.length}
              className="flex items-center whitespace-nowrap px-6 font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.2vw,2.8rem)] font-semibold text-[var(--faint)] transition-colors hover:text-[var(--fg)]"
            >
              {v}
              <span
                aria-hidden="true"
                className="ml-12 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-50"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
