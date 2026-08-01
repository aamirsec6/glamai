import type { Metadata } from "next";
/* Self-hosted fonts (Fontsource) — no external font requests. */
import "@fontsource/syne/500.css";
import "@fontsource/syne/600.css";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qimma — AI marketing for local businesses that want real leads",
  description:
    "Qimma runs Google Business Profile, WhatsApp AI lead qualification, local SEO, reviews, and growth reporting — so owners get booked appointments, not busywork.",
  metadataBase: new URL("https://qimma.io"),
  openGraph: {
    title: "Qimma — Local growth, run by AI agents",
    description:
      "Maps visibility, WhatsApp qualification, reviews, and reports — coordinated so you get real leads.",
    siteName: "Qimma",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
