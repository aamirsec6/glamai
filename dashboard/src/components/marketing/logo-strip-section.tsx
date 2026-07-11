const LOGOS = [
  "Studio Indiranagar",
  "DesignCraft",
  "UrbanNest",
  "Elite Homes",
  "Modular Kitchen Co",
  "Bangalore Interiors",
];

export function LogoStripSection() {
  return (
    <section className="border-y border-white/[0.06] bg-[#050505] py-10">
      <div className="landing-container-wide">
        <p className="mb-8 text-center text-sm font-medium tracking-wide text-zinc-600">
          Driving revenue for local businesses across India
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-zinc-700 transition-colors hover:text-[#c9a962]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
