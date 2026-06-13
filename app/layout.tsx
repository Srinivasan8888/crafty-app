import type { Metadata, Viewport } from "next";
import Script from "next/script";
import dynamic from "next/dynamic";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Brand typefaces (PRD §17.2 / §19.2 — self-optimized, preloaded). Fraunces
// is the editorial display face, Inter the body. Exposed as CSS variables that
// globals.css already references via var(--font-fraunces)/var(--font-inter).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Dynamically load PostHog after LCP. ssr:false keeps it out of the initial
// HTML payload entirely; the bundle is ~30KB and analytics doesn't need to
// fire before paint. PRD §19.2 — lazy-loaded post-LCP analytics.
const PostHogProvider = dynamic(
  () => import("@/components/PostHogProvider").then((m) => m.PostHogProvider),
  { ssr: false },
);
const CookieConsent = dynamic(
  () => import("@/components/CookieConsent").then((m) => m.CookieConsent),
  { ssr: false },
);
// V3 — PWA install prompt. Client-only, dismissable, localStorage-gated.
const InstallPrompt = dynamic(
  () => import("@/components/InstallPrompt").then((m) => m.InstallPrompt),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Crafty — discover India's craft community",
  description:
    "City-localized discovery for crafters, supply stores, studios and craft events across India. Starting in Bengaluru.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  // V3 — PWA manifest.
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Crafty — India's craft community, one city at a time",
    description: "Crafters, supply stores, studios, and events near you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#B5365B",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // V3 — read locale + messages on the server. Cookie-based, so no segment
  // routing required. See lib/i18n/{config,request}.ts.
  const locale = await getLocale();
  const messages = await getMessages();

  // Descope's AuthProvider is intentionally NOT mounted at the root (PRD §19.2
  // — saves bundle on landing). Authenticated routes (dashboard, admin,
  // sign-in, sign-up) wrap themselves in MaybeAuthProvider.
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable}`}
      style={{
        ["--font-display" as never]: "var(--font-fraunces), Georgia, 'Times New Roman', serif",
        ["--font-sans" as never]:
          "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <head>
        <Script src="/theme-bootstrap.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PostHogProvider />
          {children}
          <CookieConsent />
          <InstallPrompt />
        </NextIntlClientProvider>
        {/* V3 — PWA service worker registration. Loaded after interactive. */}
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
