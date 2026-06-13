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

// Crafty is PUBLIC by default: all city discovery pages must be reachable
// without sign-in. We therefore use Descope's `privateRoutes` (everything is
// public unless it matches a private route) and list the only protected
// surfaces — the creator dashboard and the admin console.
//
// IMPORTANT — Descope's matcher (matchWildcardRoute) escapes regex and converts
// only `*` -> `[^/]*` (a SINGLE path segment, no slashes). It does NOT support
// `:param` or `(.*)`. A previous `publicRoutes` list using `/:city` and
// `/(.*)` matched nothing, so every public page redirected to /sign-in. Because
// `*` can't cross `/`, nested depths are enumerated explicitly. The dashboard
// and admin LAYOUTS also guard (getCurrentUser / requireAdmin), so this is
// defense-in-depth, not the sole gate. API routes are intentionally NOT listed:
// their handlers self-gate and return 401 JSON rather than an HTML redirect.
const PRIVATE_ROUTES = [
  "/dashboard",
  "/dashboard/*",
  "/dashboard/*/*",
  "/dashboard/*/*/*",
  "/admin",
  "/admin/*",
  "/admin/*/*",
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
        privateRoutes: PRIVATE_ROUTES,
      });
      return handler(req);
    })
  : passthrough;

export const config = {
  // Skip Next internals and any static asset (anything with a file extension).
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
