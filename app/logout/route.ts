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
  for (const name of CLEARED_COOKIES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
