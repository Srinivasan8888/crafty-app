import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
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

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/(crafters|stores|studios|events|upload|saves|flags)(.*)",
]);

const passthrough = (_req: NextRequest) => NextResponse.next();

// In dev mode the Clerk middleware is bypassed entirely; protected routes still
// resolve via the auth dev-stub user. Flip DEV_AUTH to "false" (or unset it)
// to enforce real Clerk session checks.
export default DEV
  ? passthrough
  : clerkMiddleware(async (auth, req) => {
      if (isProtected(req)) {
        // Clerk Next.js v6: auth() is async; protect() is async.
        await auth.protect();
      }
    });

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
