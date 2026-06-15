import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/auth-config";
import { OrgProvider } from "@/lib/org-context";
import { OrgClerkSync } from "@/lib/org-clerk-sync";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GlamAI — All-in-One AI Marketing for Local Business Growth",
  description:
    "Your AI marketing team that delivers real revenue. Google Business Profile, WhatsApp lead qualification, and monthly growth reports for local businesses worldwide.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <OrgProvider>
          {isClerkEnabled ? <OrgClerkSync>{children}</OrgClerkSync> : children}
        </OrgProvider>
      </body>
    </html>
  );

  if (!isClerkEnabled) {
    return shell;
  }

  return <ClerkProvider>{shell}</ClerkProvider>;
}
