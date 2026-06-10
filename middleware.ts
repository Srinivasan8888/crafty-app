import { NextResponse, type NextRequest } from "next/server";

// S2 — DEV_AUTH is server-only and forbidden in production. Module load
// will throw via lib/auth.ts if a prod deploy somehow has DEV_AUTH=true,
// but we double-check here so the middleware itself fails closed.
const DEV = process.env.DEV_AUTH === "true";

if (DEV && process.env.NODE_ENV === "production") {
  throw new Error(
    "DEV_AUTH=true is not allowed in production. middleware.ts hard-fails.",
  );
}

const DESCOPE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID &&
  !process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID.startsWith("P_placeholder");

// Descope's authMiddleware is "private by default" — only routes listed in
// publicRoutes (or matching wildcards) skip the auth check. We enumerate
// everything that should be reachable without sign-in.
//
// Keep this list in sync with the actual public surface. Forgetting
// /sitemap.xml here would break Google indexing.
const PUBLIC_ROUTES = [
  "/",
  "/sign-in", "/sign-in/(.*)",
  "/sign-up", "/sign-up/(.*)",
  "/list-your-profile",
  "/privacy",
  "/terms",
  "/sitemap.xml",
  "/robots.txt",
  // Per-city public routes: /[city] and /[city]/(crafters|stores|learn|events|search)
  // + their detail pages. Match-anything against the city wildcards.
  "/:city",
  "/:city/(.*)",
  // Public API routes — webhooks (signed independently), cron (token-gated
  // independently), city-requests (anonymous), flags (anonymous), saves
  // (anonymous form-post fallback).
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
  "/api/city-requests",
  "/api/flags",
  "/api/saves",
];

const passthrough = (_req: NextRequest) => NextResponse.next();

// In dev mode (DEV_AUTH=true) OR when Descope isn't yet configured, skip auth
// entirely — the lib/auth.ts dev path / placeholder path handles identity.
const useDescope = !DEV && DESCOPE_CONFIGURED;

export default useDescope
  ? // Dynamic import keeps the SDK out of the dev/placeholder bundle.
    // The middleware function is lazily resolved on the first request.
    (async (req: NextRequest) => {
      const { authMiddleware } = await import("@descope/nextjs-sdk/server");
      const handler = authMiddleware({
        projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
        redirectUrl: "/sign-in",
        publicRoutes: PUBLIC_ROUTES,
      });
      return handler(req);
    })
  : passthrough;

export const config = {
  // Skip Next internals and any static asset (anything with a file extension).
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
