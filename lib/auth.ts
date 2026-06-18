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
// PRD §12 + superadmin-god-mode — role gating. Roles:
//   VISITOR < CREATOR < ADMIN < SUPERADMIN.
// New users default to VISITOR. /list-your-profile sets a signup-intent cookie
// promoting to CREATOR. ADMIN/SUPERADMIN come from: env bootstrap
// (SUPERADMIN_EMAIL), a consumed AdminInvite, or an explicit superadmin action.

import { prisma } from "./db";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { sendSignupWelcome } from "./email";
import { logAudit } from "./audit";

export type SessionUser = {
  id: string;
  descope_id: string | null;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_admin: boolean;       // true for ADMIN and SUPERADMIN
  is_superadmin: boolean;  // true only for SUPERADMIN (owner / god-mode)
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

// Owner bootstrap (superadmin-god-mode): any email in SUPERADMIN_EMAIL
// (comma-separated) is ensured SUPERADMIN on each authenticated request, so an
// owner always exists without manual DB edits and survives re-seeds.
const SUPERADMIN_EMAILS = new Set(
  (process.env.SUPERADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const ROLE_RANK: Record<UserRole, number> = {
  VISITOR: 0,
  CREATOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

type UserRow = {
  id: string;
  descope_id: string | null;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_admin: boolean;
};

function toSession(u: UserRow): SessionUser {
  const is_superadmin = u.role === "SUPERADMIN";
  return {
    id: u.id,
    descope_id: u.descope_id,
    email: u.email,
    display_name: u.display_name,
    role: u.role,
    is_admin: is_superadmin || u.role === "ADMIN" || u.is_admin,
    is_superadmin,
  };
}

function readSignupIntent(): "creator" | null {
  try {
    const v = cookies().get(SIGNUP_INTENT_COOKIE)?.value;
    return v === "creator" ? "creator" : null;
  } catch {
    return null;
  }
}

// Apply role elevations: the SUPERADMIN_EMAIL env allow-list and any PENDING,
// unexpired AdminInvite for this email. Idempotent — safe to run every request.
// Only touches the DB when an actual change is needed.
async function applyElevations(row: UserRow): Promise<UserRow> {
  try {
    return await applyElevationsInner(row);
  } catch (e) {
    // Best-effort: elevations are an enhancement, never the core auth path. If
    // the AdminInvite table / SUPERADMIN enum aren't migrated yet (or any DB
    // hiccup), degrade to no elevation rather than breaking every request.
    console.error("[auth:elevations-skipped]", e);
    return row;
  }
}

async function applyElevationsInner(row: UserRow): Promise<UserRow> {
  let { role } = row;
  let is_admin = row.is_admin;

  // 1. Env bootstrap → SUPERADMIN.
  if (
    SUPERADMIN_EMAILS.has(row.email.toLowerCase()) &&
    ROLE_RANK[role] < ROLE_RANK.SUPERADMIN
  ) {
    const u = await prisma.user.update({
      where: { id: row.id },
      data: { role: "SUPERADMIN", is_admin: true },
    });
    role = u.role;
    is_admin = true;
  }

  // 2. Consume a pending admin invite (email match). Skip once already at the
  // top so superadmins don't pay for an invite lookup on every request.
  if (ROLE_RANK[role] < ROLE_RANK.SUPERADMIN) {
    const invite = await prisma.adminInvite.findFirst({
      where: { email: row.email.toLowerCase(), status: "PENDING" },
      orderBy: { created_at: "desc" },
    });
    if (invite) {
      if (invite.expires_at.getTime() < Date.now()) {
        await prisma.adminInvite
          .update({ where: { id: invite.id }, data: { status: "EXPIRED" } })
          .catch(() => {});
      } else {
        if (ROLE_RANK[invite.role] > ROLE_RANK[role]) {
          const u = await prisma.user.update({
            where: { id: row.id },
            data: { role: invite.role, is_admin: true },
          });
          role = u.role;
          is_admin = true;
          void logAudit({
            actorUserId: row.id,
            action: "admin.invite.consumed",
            entityType: "USER",
            entityId: row.id,
            metadata: { role: invite.role, inviteId: invite.id },
          });
        }
        // Single-use regardless of whether it raised the role.
        await prisma.adminInvite
          .update({
            where: { id: invite.id },
            data: { status: "CONSUMED", consumed_at: new Date() },
          })
          .catch(() => {});
      }
    }
  }

  return { ...row, role, is_admin };
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
    const { session } = await import("@descope/nextjs-sdk/server");
    const s = await session();
    if (!s) return null;
    const t = s.token as unknown as DescopeClaims;
    return t.sub ? t : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (DEV) {
    const email = process.env.DEV_USER_EMAIL || "dev@crafty.app";
    const name = process.env.DEV_USER_NAME || "Dev User";
    // Dev user is SUPERADMIN locally so god-mode surfaces can be built + tested.
    // Create as ADMIN (safe pre-migration), then best-effort elevate so a
    // not-yet-migrated DB (no SUPERADMIN enum value) still yields a working
    // admin dev user instead of crashing.
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, display_name: name, role: "ADMIN", is_admin: true },
      update: {},
    });
    if (user.is_banned) return null;
    let row: UserRow = user;
    if (user.role !== "SUPERADMIN") {
      try {
        row = await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPERADMIN", is_admin: true },
        });
      } catch (e) {
        console.error("[auth:dev-superadmin-skipped]", e);
      }
    }
    return toSession(row);
  }

  const claims = await readDescopeSession();
  if (!claims) return null;

  const existing = await prisma.user.findUnique({ where: { descope_id: claims.sub } });
  if (existing) {
    if (existing.is_banned) return null;

    let row: UserRow = existing;
    // Idempotent CREATOR promotion from the signup-intent cookie (Issue 2.1).
    if (existing.role === "VISITOR" && readSignupIntent() === "creator") {
      row = await prisma.user.update({
        where: { id: existing.id },
        data: { role: "CREATOR" },
      });
      try {
        cookies().delete(SIGNUP_INTENT_COOKIE);
      } catch {
        /* read-only cookie context (render) — leave it to expire via TTL */
      }
    }
    row = await applyElevations(row);
    return toSession(row);
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

  if (created.is_banned) return null;

  const row = await applyElevations(created);
  return toSession(row);
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}

export async function requireCreator(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "CREATOR" && u.role !== "ADMIN" && u.role !== "SUPERADMIN")
    throw new Error("FORBIDDEN_NOT_CREATOR");
  return u;
}

// Admits ADMIN and SUPERADMIN (is_admin is true for both).
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.is_admin) throw new Error("FORBIDDEN");
  return u;
}

// Owner / god-mode gate — SUPERADMIN only.
export async function requireSuperadmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.is_superadmin) throw new Error("FORBIDDEN");
  return u;
}

// Count of current superadmins — used to enforce the last-superadmin invariant
// before any demotion / ownership transfer.
export async function superadminCount(): Promise<number> {
  return prisma.user.count({ where: { role: "SUPERADMIN", is_banned: false } });
}
