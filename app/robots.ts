import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Dashboard + admin are gated server-side anyway, but no point asking
        // crawlers to spend budget on routes that always redirect to /sign-in.
        disallow: ["/dashboard", "/admin", "/api", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
