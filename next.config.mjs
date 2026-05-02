/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Replit Object Storage + dev seeds. Be permissive in dev, restrictive in prod.
const remotePatterns = [
  // Replit Object Storage CDN domains
  { protocol: "https", hostname: "*.replit.app" },
  { protocol: "https", hostname: "*.repl.co" },
  { protocol: "https", hostname: "replit.com" },
  { protocol: "https", hostname: "*.replit.com" },
  // Clerk avatars
  { protocol: "https", hostname: "img.clerk.com" },
  { protocol: "https", hostname: "images.clerk.dev" },
  // Dev image seeds
  { protocol: "https", hostname: "picsum.photos" },
  { protocol: "https", hostname: "fastly.picsum.photos" },
  { protocol: "https", hostname: "images.unsplash.com" },
  ...(isProd
    ? []
    : [
        // Permissive in dev: allow any https host for seed/test imagery.
        { protocol: "https", hostname: "**" },
      ]),
];

// S10 — baseline security headers for every response. Tuned conservatively
// because we render user-uploaded images from /uploads/* on the same origin
// (so a CSP that blocks 'self' images would break our own product).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS: enable in production only (avoid breaking local http://).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  // CSP: 'self' for everything by default. Inline styles are needed for
  // Tailwind/Next; inline scripts only via 'unsafe-inline' on dev where
  // Next.js dev overlay needs it. Production CSP can be tightened with
  // nonces in a follow-up.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Clerk hosts auth iframes/scripts; allow them.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.upstash.io",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
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

export default nextConfig;
