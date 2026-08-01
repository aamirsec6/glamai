const LOGOS = [
  "Studio Indiranagar",
  "DesignCraft",
  "UrbanNest",
  "Elite Homes",
  "Modular Kitchen Co",
  "Bangalore Interiors",
];

export function LogoStripSection() {
  const items = [...LOGOS, ...LOGOS];

  return (
    <section className="overflow-hidden border-y border-white/5 bg-[#050816] py-12">
      <div className="mkt-container-wide">
        <p className="mb-8 text-center text-sm font-medium tracking-wide text-zinc-600">
          Trusted by local businesses across India and the Gulf
        </p>
        <div className="mkt-marquee relative">
          <div className="mkt-marquee-track">
            {items.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="mkt-marquee-item text-sm font-semibold tracking-wide text-zinc-600 transition-colors hover:text-cyan-400"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
