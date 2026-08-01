import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/auth-config";
import { OrgProvider } from "@/lib/org-context";
import { OrgClerkSync } from "@/lib/org-clerk-sync";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Qimma — AI Marketing for Local Business Growth",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('qimma-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.remove('dark')}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider defaultTheme="light">
          <OrgProvider>
            {isClerkEnabled ? <OrgClerkSync>{children}</OrgClerkSync> : children}
          </OrgProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (!isClerkEnabled) {
    return shell;
  }

  return <ClerkProvider>{shell}</ClerkProvider>;
}
