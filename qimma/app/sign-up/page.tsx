import Link from "next/link";

export const metadata = { title: "Book a Demo — Qimma" };

/* Stub route so the primary CTA resolves. Replace with the real form. */
export default function SignUp() {
  return (
    <main className="section-pad flex min-h-screen flex-col items-start justify-center">
      <p className="kicker mb-6">Book a demo</p>
      <h1 className="max-w-xl text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
        Let&apos;s look at your city together.
      </h1>
      <p className="mt-6 max-w-md text-lg text-[var(--muted)]">
        Demo scheduling launches here. Meanwhile, write to us and we&apos;ll set
        it up within a day.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="mailto:hello@qimma.io" className="btn-primary">
          hello@qimma.io
        </a>
        <Link href="/" className="btn-ghost">
          ← Back
        </Link>
      </div>
    </main>
  );
}
