// Auth abstraction. Two modes:
//   DEV  (DEV_AUTH=true, server-only) — hardcoded dev user, lazy-upserted on every call.
//   PROD — Clerk session via @clerk/nextjs/server, lazy-upserted to local User row.
// Implements the Issue 2.1 pattern: never trust webhook-only provisioning;
// upsert on first authenticated request to avoid the race window.
//
// S2 — DEV_AUTH is a SERVER-ONLY var (no NEXT_PUBLIC_ prefix). The previous
// name leaked the flag to the client bundle and, more importantly, would
// have shipped to production via .env, turning every visitor into the
// hardcoded admin. We hard-stop the process if DEV_AUTH is true under
// NODE_ENV=production so a misconfigured deploy fails loud, not silent.

import { prisma } from "./db";
import { auth, currentUser } from "@clerk/nextjs/server";

export type SessionUser = {
  id: string;
  clerk_id: string | null;
  email: string;
  display_name: string | null;
  is_admin: boolean;
};

const DEV = process.env.DEV_AUTH === "true";

if (DEV && process.env.NODE_ENV === "production") {
  // Throw at module load time — Next.js will surface this as a build/runtime
  // error and refuse to serve with auth bypassed.
  throw new Error(
    "DEV_AUTH=true is not allowed in production. Unset DEV_AUTH or set NODE_ENV != production.",
  );
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (DEV) {
    const email = process.env.DEV_USER_EMAIL || "dev@crafty.app";
    const name = process.env.DEV_USER_NAME || "Dev User";
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, display_name: name, is_admin: true },
      update: {},
    });
    return {
      id: user.id, clerk_id: user.clerk_id, email: user.email,
      display_name: user.display_name, is_admin: user.is_admin,
    };
  }

  // Clerk Next.js v6: auth() is async.
  const { userId } = await auth();
  if (!userId) return null;

  // Lazy upsert by clerk_id. Pulls email + name from Clerk if we don't have a row yet.
  const existing = await prisma.user.findUnique({ where: { clerk_id: userId } });
  if (existing) {
    return {
      id: existing.id, clerk_id: existing.clerk_id, email: existing.email,
      display_name: existing.display_name, is_admin: existing.is_admin,
    };
  }
  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? `${userId}@noreply.crafty.app`;
  const created = await prisma.user.upsert({
    where: { email },
    create: {
      clerk_id: userId,
      email,
      display_name: cu?.firstName ?? cu?.username ?? null,
      profile_photo_url: cu?.imageUrl ?? null,
    },
    update: { clerk_id: userId },
  });
  return {
    id: created.id, clerk_id: created.clerk_id, email: created.email,
    display_name: created.display_name, is_admin: created.is_admin,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.is_admin) throw new Error("FORBIDDEN");
  return u;
}
