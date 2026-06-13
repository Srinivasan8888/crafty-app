import withBundleAnalyzerImport from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = withBundleAnalyzerImport({
  enabled: process.env.ANALYZE === "true",
});

// V3 — next-intl request-config path. Cookie-based locale (not URL-segment).
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Image remote patterns. Be permissive in dev, restrictive in prod.
const remotePatterns = [
  // Replit Object Storage CDN domains
  { protocol: "https", hostname: "*.replit.app" },
  { protocol: "https", hostname: "*.repl.co" },
  { protocol: "https", hostname: "replit.com" },
  { protocol: "https", hostname: "*.replit.com" },
  // Descope avatars (oauth provider profile photos proxied through Descope)
  { protocol: "https", hostname: "*.descope.com" },
  { protocol: "https", hostname: "static-content.descope.com" },
  // Dev image seeds
  { protocol: "https", hostname: "picsum.photos" },
  { protocol: "https", hostname: "fastly.picsum.photos" },
  { protocol: "https", hostname: "images.unsplash.com" },
  // Vercel Blob object storage — public image URLs (STORAGE_DRIVER=blob).
  { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
  ...(isProd
    ? []
    : [
        // Permissive in dev: allow any https host for seed/test imagery.
        { protocol: "https", hostname: "**" },
      ]),
];

// S10 — baseline security headers for every response.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  // CSP: 'self' by default. Descope's flow runtime (Web Component) and
  // session refresh endpoint live on the Descope API domain.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.descope.com https://static-content.descope.com",
      "style-src 'self' 'unsafe-inline' https://static-content.descope.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://static-content.descope.com",
      "connect-src 'self' https://api.descope.com https://*.descope.com https://*.upstash.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io",
      "frame-src 'self' https://*.descope.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      // V3 — PWA: allow self-hosted manifest + worker.
      "manifest-src 'self'",
      "worker-src 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    // dangerouslyAllowSVG intentionally omitted — security risk.
    remotePatterns,
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  org: "crafty-q2",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
