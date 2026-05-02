import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
