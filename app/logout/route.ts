// Logout handler. The global header isn't inside Descope's <AuthProvider>, so
// we can't use the client logout() hook from the account menu. Instead this
// route clears the Descope session cookies (DS = session JWT, DSR = refresh)
// plus our signup-intent cookie, then redirects home. A GET handler so a plain
// <a href="/logout"> works with no client JS.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLEARED_COOKIES = ["DS", "DSR", "crafty_signup_intent"];

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url));
  // Descope writes DS (session) / DSR (refresh) with an explicit Domain when the
  // project configures a cookieDomain (e.g. ".crafty.app" for apex+www). A
  // deletion Set-Cookie must match that Domain to overwrite the cookie — a
  // host-only delete leaves a domain-scoped cookie intact and the session
  // silently resurrects. So clear both forms. Set DESCOPE_COOKIE_DOMAIN to match
  // Descope's cookieDomain in prod; leave unset if no cookieDomain is configured.
  const domain = process.env.DESCOPE_COOKIE_DOMAIN?.trim() || undefined;
  for (const name of CLEARED_COOKIES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
    if (domain) {
      res.cookies.set(name, "", { path: "/", maxAge: 0, domain });
    }
  }
  return res;
}
