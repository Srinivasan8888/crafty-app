## Context

Auth lives in `lib/auth.ts`: `getCurrentUser()` lazily upserts a `User` on the
first authenticated request and returns a `SessionUser` (`role`, `is_admin`,
`is_banned`, …). Gating helpers are `requireUser` / `requireCreator` /
`requireAdmin`. `UserRole = VISITOR | CREATOR | ADMIN`; `is_admin` is a
back-compat boolean ("ADMIN role is authoritative"). `/admin/*` is protected by
the admin layout calling `requireAdmin()` → `/forbidden`, and the middleware
lists `/admin` in `PRIVATE_ROUTES`. The dashboard only shows the "Admin →" link
and "admin" badge when `user.is_admin`. There are 13 admin pages today,
including `/admin/users` (manual promote/demote of existing users) and
`/admin/metrics` (product/Day-90 gates). There is no tier above ADMIN, no way to
invite a not-yet-registered admin, and no single owner-level view of the
business. An existing `lib/audit.ts` records admin actions; `lib/email.ts`
no-ops until Resend is set. Bootstrap-by-env precedent exists (`SIC_ADMIN_EMAIL`,
`DEV_USER_EMAIL`).

## Goals / Non-Goals

**Goals:**
- A SUPERADMIN ("owner") tier strictly above ADMIN, gating owner-only surfaces.
- Grant/revoke admin access without DB or env edits — including inviting people
  by email before they have an account.
- A safe ownership handover from the developer to the real owner.
- One read-only god-mode console with app-wide insight.
- Regular users never see or reach any admin/superadmin surface.

**Non-Goals:**
- No fine-grained permission matrix / per-resource RBAC — three tiers
  (CREATOR < ADMIN < SUPERADMIN) are enough.
- No "log in as user" impersonation (security/privacy surface; revisit later).
- No new analytics pipeline — god-mode aggregates existing tables.
- No change to how end users sign in (Descope flow is unchanged).

## Decisions

**D1 — SUPERADMIN as a role enum value, not a new boolean.**
Add `SUPERADMIN` to `UserRole`. Hierarchy: `VISITOR < CREATOR < ADMIN <
SUPERADMIN`. `requireAdmin()` admits ADMIN **and** SUPERADMIN; new
`requireSuperadmin()` admits only SUPERADMIN. `SessionUser` gains
`is_superadmin`. Keep `is_admin` for back-compat and set it `true` for both
ADMIN and SUPERADMIN so existing `is_admin` checks keep working. Rationale: one
authoritative role field avoids the role/boolean drift the schema comment
already warns about.

**D2 — Bootstrap the first owner from `SUPERADMIN_EMAIL` (allow-list).**
On lazy upsert, if the authenticated email is in the comma-separated
`SUPERADMIN_EMAIL` allow-list, ensure the row is SUPERADMIN (idempotent, every
request). This guarantees an owner exists without manual DB edits and survives
re-seeds. `SIC_ADMIN_EMAIL` is unchanged (an ADMIN seed). In DEV mode
(`DEV_AUTH=true`) the dev user is treated as SUPERADMIN so god-mode can be built
and tested locally. Handover path: set `SUPERADMIN_EMAIL` to the developer to
bootstrap, then transfer ownership (D5) to the real owner and remove the
developer from the allow-list.

**D3 — Invitations consumed by email match on first authenticated request.**
New `AdminInvite { id, email, role (ADMIN|SUPERADMIN), token_hash, invited_by,
status (PENDING|CONSUMED|REVOKED|EXPIRED), expires_at, consumed_at }`. A
superadmin creates an invite → we send an email via `lib/email.ts` with a link
to sign in. Consumption does **not** require the link to be clicked: in the
lazy-upsert path (next to the existing signup-intent logic), if the
authenticated email has a PENDING, unexpired invite, we apply the invited role
and mark it CONSUMED. The token is single-use, hashed at rest, and expires
(default 14 days); the link is a convenience + audit anchor, not the trust
boundary (Descope already proves the email). Rationale: works whether the
invitee already has an account or signs up later, with no separate accept page
to secure.

**D4 — All privilege changes go through audited server actions, superadmin-only.**
Invite, promote, demote, revoke-admin, and revoke-invite are server actions
gated by `requireSuperadmin()`, each writing to `lib/audit.ts`. ADMINs cannot
change roles (today `/admin/users` allows ADMINs to promote/demote — we tighten
role mutation to SUPERADMIN-only).

**D5 — Ownership transfer with a last-superadmin invariant.**
A superadmin can promote another account to SUPERADMIN and (optionally) step
down to ADMIN, behind an explicit confirm. A guard refuses any demotion/transfer
that would leave zero SUPERADMINs (`count(role=SUPERADMIN) > 1` required before
removing one). This makes the developer→owner handover safe and reversible.

**D6 — God-mode console is read-only aggregation over existing tables.**
`/admin/owner` (requireSuperadmin) runs a `Promise.all` of `count` / `aggregate`
/ `groupBy` queries: users (total, new 7/30d, by role, banned), listings by
type×status×city, commerce (orders, GMV, commission, payouts pending/paid,
PRO subscriptions + MRR), engagement (saves, messages, reviews 7/30d),
moderation (open flags, pending claim/city requests), and cron/system health
(reuse `/admin/health`). Cards drill through to existing admin pages. Use
`export const revalidate` for a short cache; queries are cheap now that the DB
is co-located (`sin1`). No raw per-row scans.

**D7 — Visibility is enforced server-side, then mirrored in nav.**
Trust boundary = the route guards (`requireAdmin` / `requireSuperadmin` fail
closed to `/forbidden`; `/admin` stays in middleware `PRIVATE_ROUTES`). The nav
is cosmetic: dashboard shows "Admin →" only for `is_admin`; the admin sidebar
shows Owner-console + Admins links only for `is_superadmin`. Add an audit task
to grep for any admin link/string rendered without a role guard.

**D8 — Reuse existing infrastructure.**
Audit via `lib/audit.ts`; email via `lib/email.ts`; bootstrap-by-env like
`SIC_ADMIN_EMAIL`; migrations on `DIRECT_URL` (per the Neon pooling split).

## Risks / Trade-offs

- **Owner lockout** (no superadmin left) → the last-superadmin invariant (D5)
  plus the `SUPERADMIN_EMAIL` env bootstrap (D2) provide two independent
  recovery paths.
- **Privilege escalation** → role mutations are SUPERADMIN-only, audited, and
  all guards fail closed; invites are single-use, expiring, hashed.
- **Stale invite reuse / email mismatch** → invites match on the verified email
  from Descope, are single-use, and expire; revoking sets status REVOKED.
- **God-mode query cost** → aggregates only, short `revalidate`, co-located DB.
  If a metric gets heavy, move it behind its own drill-through page.
- **Tightening `/admin/users` role mutation to superadmin-only** could surprise
  current ADMINs who relied on it → call out in handover notes; ADMINs keep all
  non-role admin powers.
- **DEV treats dev user as SUPERADMIN** → only under `DEV_AUTH=true`, which is
  already forbidden in production by the existing hard-stop, so prod is unaffected.

## Migration Plan

1. Schema: add `SUPERADMIN` to `UserRole`; add `AdminInvite` model; `prisma
   migrate` / `db push` (DIRECT connection). Regenerate client.
2. Auth: `requireSuperadmin()`, `is_superadmin`, `SUPERADMIN_EMAIL` bootstrap,
   invite consumption in lazy upsert; SUPERADMIN ⇒ `is_admin=true`.
3. UI/actions: `/admin/admins` (invite + promote/demote/revoke + transfer) and
   `/admin/owner` (god-mode); audited server actions; invite email.
4. Visibility: role-gate nav; audit for unguarded admin surfaces.
5. Ops: set `SUPERADMIN_EMAIL` in Vercel prod (bootstrap the owner), deploy,
   verify the console renders and an invite round-trips; then perform the
   ownership transfer to the real owner.

## Open Questions

- Bootstrap as the developer (`srinivasan@indianvcs.com`) then transfer to the
  real owner — confirmed default. Or set `SUPERADMIN_EMAIL` directly to the
  owner once their email is known?
- Should SUPERADMIN-only also cover existing destructive admin actions (e.g.,
  user ban, listing delete), or do ADMINs keep those? Default: ADMINs keep
  moderation powers; only role/owner management is SUPERADMIN-only.
