"use server";

// PRD §8.3 — creator-signup intent.
//
// When a user submits one of the "List your X" CTAs on /list-your-profile,
// we want them to end up with role=CREATOR by the time they reach the form.
// Three cases:
//   1. Not signed in   → set intent cookie, redirect to /sign-up?redirect_url=<dest>.
//                        Lazy upsert in lib/auth.ts reads the cookie on the first
//                        authed request and creates the User row with role=CREATOR.
//   2. Already VISITOR → promote to CREATOR in place, then redirect to dest.
//   3. CREATOR / ADMIN → no-op, redirect to dest.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, SIGNUP_INTENT_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_DESTS = new Set([
  "/dashboard",
  "/dashboard/crafter/new",
  "/dashboard/store/new",
  "/dashboard/studio/new",
  "/dashboard/events/new",
]);

export async function startCreatorIntent(dest: string) {
  const safeDest = ALLOWED_DESTS.has(dest) ? dest : "/dashboard";

  cookies().set(SIGNUP_INTENT_COOKIE, "creator", {
    maxAge: 600,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  const user = await getCurrentUser();
  if (user) {
    if (user.role === "VISITOR") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "CREATOR" } });
    }
    redirect(safeDest);
  }

  redirect(`/sign-up?redirect_url=${encodeURIComponent(safeDest)}`);
}
