import Reveal from "@/components/Reveal";

const PAINS = [
  {
    k: "The 9 pm enquiry",
    v: "A customer messages on WhatsApp after hours. By morning, they've booked with whoever replied first.",
  },
  {
    k: "The dead profile",
    v: "Your Google Business Profile hasn't posted in months, so Maps quietly ranks the salon two streets over instead.",
  },
  {
    k: "The invisible storefront",
    v: "You're excellent at the work — but nobody searching “near me” can tell, because reviews and photos have gone stale.",
  },
];

export default function ProblemPromise() {
  return (
    <section id="product" className="section-pad py-28 md:py-40">
      <Reveal stagger className="mx-auto max-w-5xl">
        <p data-reveal-item className="kicker mb-6">
          The problem
        </p>
        <h2
          data-reveal-item
          className="max-w-3xl text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08]"
        >
          Great local businesses lose demand in the gaps between replies.
        </h2>
        <p data-reveal-item className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Not because the work isn&apos;t good — because Maps can&apos;t see it
          and WhatsApp goes quiet at the exact moment someone is ready to buy.
        </p>

        <div className="mt-16">
          {PAINS.map((p) => (
            <div
              key={p.k}
              data-reveal-item
              className="hairline grid gap-2 py-7 md:grid-cols-[240px_1fr] md:gap-10"
            >
              <h3 className="text-base font-semibold text-[var(--accent-2)]">
                {p.k}
              </h3>
              <p className="max-w-2xl text-[var(--muted)]">{p.v}</p>
            </div>
          ))}
          <div className="hairline" />
        </div>

        <p
          data-reveal-item
          className="mt-16 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.6vw,2.1rem)] font-semibold leading-snug"
        >
          Qimma is the operating system that closes the loop —{" "}
          <span className="text-[var(--accent)]">
            visibility, response, reviews, and reporting
          </span>
          , coordinated by agents that never sleep through an enquiry.
        </p>
      </Reveal>
    </section>
  );
}
