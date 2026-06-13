// Auth abstraction. Two modes:
//   DEV  (DEV_AUTH=true, server-only) — hardcoded dev user, lazy-upserted on every call.
//   PROD — Descope session via @descope/nextjs-sdk/server, lazy-upserted to local User row.
//
// Migrated from Clerk to Descope on 2026-05-24. Implementation kept structurally
// identical so the rest of the codebase (requireUser / requireCreator / requireAdmin
// + the signup-intent cookie flow) doesn't notice the swap.
//
// Issue 2.1 — never trust webhook-only provisioning: lazy upsert on first
// authenticated request to close the race window between session creation
// and Descope's audit-webhook delivery.
//
// S2 — DEV_AUTH is a SERVER-ONLY var (no NEXT_PUBLIC_ prefix). Hard-stop the
// process if DEV_AUTH=true under NODE_ENV=production so a misconfigured
// deploy fails loud, not silent.
//
// PRD §12 — role gating. Three roles: VISITOR (default), CREATOR, ADMIN.
// New users default to VISITOR. The /list-your-profile interstitial sets a
// `crafty_signup_intent=creator` cookie which the lazy-upsert reads on first
// authenticated request to promote new accounts to CREATOR.

import { prisma } from "./db";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { sendSignupWelcome } from "./email";

export type SessionUser = {
  id: string;
  descope_id: string | null;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_admin: boolean;
};

const DEV = process.env.DEV_AUTH === "true";

if (DEV && process.env.NODE_ENV === "production") {
  throw new Error(
    "DEV_AUTH=true is not allowed in production. Unset DEV_AUTH or set NODE_ENV != production.",
  );
}

const DESCOPE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID &&
  !process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID.startsWith("P_placeholder");

export const SIGNUP_INTENT_COOKIE = "crafty_signup_intent";

function readSignupIntent(): "creator" | null {
  try {
    const v = cookies().get(SIGNUP_INTENT_COOKIE)?.value;
    return v === "creator" ? "creator" : null;
  } catch {
    return null;
  }
}

// Descope JWT claims we expect. `sub` is always present; `email` and `name`
// require custom-claim setup in Descope console (see Phase 0 in README).
type DescopeClaims = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

async function readDescopeSession(): Promise<DescopeClaims | null> {
  if (!DESCOPE_CONFIGURED) return null;
  try {
    // Dynamic import so dev mode doesn't pull the SDK into the bundle.
    const { session } = await import("@descope/nextjs-sdk/server");
    const s = await session();
    if (!s) return null;
    const t = s.token as unknown as DescopeClaims;
    return t.sub ? t : null;
  } catch {
    // Misconfigured project, expired JWT, etc. — treat as anonymous.
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (DEV) {
    const email = process.env.DEV_USER_EMAIL || "dev@crafty.app";
    const name = process.env.DEV_USER_NAME || "Dev User";
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, display_name: name, role: "ADMIN", is_admin: true },
      update: {},
    });
    return {
      id: user.id, descope_id: user.descope_id, email: user.email,
      display_name: user.display_name, role: user.role, is_admin: user.is_admin,
    };
  }

  const claims = await readDescopeSession();
  if (!claims) return null;

  const existing = await prisma.user.findUnique({ where: { descope_id: claims.sub } });
  if (existing) {
    // Idempotent CREATOR promotion (Issue 2.1 follow-up). The Descope audit
    // webhook may have created this row as VISITOR before our first
    // authenticated request could read the signup-intent cookie. Without this,
    // a new creator stays VISITOR and gets bounced off /dashboard/*/new.
    if (existing.role === "VISITOR" && readSignupIntent() === "creator") {
      const promoted = await prisma.user.update({
        where: { id: existing.id },
        data: { role: "CREATOR" },
      });
      return {
        id: promoted.id, descope_id: promoted.descope_id, email: promoted.email,
        display_name: promoted.display_name, role: promoted.role, is_admin: promoted.is_admin,
      };
    }
    return {
      id: existing.id, descope_id: existing.descope_id, email: existing.email,
      display_name: existing.display_name, role: existing.role, is_admin: existing.is_admin,
    };
  }

  // First-touch — create a row. Email comes from the custom JWT claim if the
  // Descope project is configured per Phase 0; otherwise fall back to a
  // pseudo-email tied to the user ID so the unique constraint holds.
  const email = claims.email ?? `${claims.sub}@noreply.crafty.app`;
  const intent = readSignupIntent();
  const role: UserRole = intent === "creator" ? "CREATOR" : "VISITOR";

  const preExisting = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const created = await prisma.user.upsert({
    where: { email },
    create: {
      descope_id: claims.sub,
      email,
      display_name: claims.name ?? null,
      profile_photo_url: claims.picture ?? null,
      role,
    },
    update: { descope_id: claims.sub },
  });

  if (!preExisting && !email.endsWith("@noreply.crafty.app")) {
    void sendSignupWelcome({ to: email, firstName: created.display_name });
  }

  return {
    id: created.id, descope_id: created.descope_id, email: created.email,
    display_name: created.display_name, role: created.role, is_admin: created.is_admin,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function requireCreator(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "CREATOR" && u.role !== "ADMIN") throw new Error("FORBIDDEN_NOT_CREATOR");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "ADMIN" && !u.is_admin) throw new Error("FORBIDDEN");
  return u;
}
