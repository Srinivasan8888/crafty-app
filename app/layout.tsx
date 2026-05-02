import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crafty — discover India's craft community",
  description:
    "City-localized discovery for crafters, supply stores, studios and craft events across India. Starting in Bengaluru.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Crafty — India's craft community, one city at a time",
    description: "Crafters, supply stores, studios, and events near you.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ClerkProvider is intentionally NOT mounted at the root (PRD §19.2 — saves ~80KB on landing).
  // Authenticated routes (dashboard, admin, sign-in, sign-up) wrap themselves in ClerkProvider.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${dmSans.variable}`}
      style={{
        // Bridge font CSS variables to the names used in tokens.css
        // (--font-display and --font-sans are referenced by tailwind config + globals.css)
        ["--font-display" as never]: "var(--font-fraunces)",
        ["--font-sans" as never]: "var(--font-dm-sans)",
      }}
    >
      <head>
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
