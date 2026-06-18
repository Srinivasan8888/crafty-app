## Why

Crafty is being handed from the building developer to its real owner, but the
access model isn't ready for that handover. Today the top of the hierarchy is a
single flat `ADMIN` role (`UserRole = VISITOR | CREATOR | ADMIN`, plus a
back-compat `is_admin` flag): every admin is equal, the only way to grant admin
is to manually promote an **already-registered** user in `/admin/users`, there
is no owner/superadmin tier, and no single place where the owner can see the
whole business at a glance. `/admin/metrics` shows product gates, but not the
full operational + financial picture an owner needs to run the company.

For a clean, safe handover the owner needs three things:

1. **A SUPERADMIN ("owner") tier above ADMIN** — the keys to the kingdom, held by
   one or few people, distinct from day-to-day admins.
2. **The ability to grant and revoke admin access** — including inviting people
   by email *before* they've signed up, and demoting/revoking anyone — without a
   developer running SQL or env edits.
3. **A god-mode owner console** — app-wide insight into users, listings,
   revenue/orders/payouts, subscriptions, messaging, moderation, and system
   health, in one owner-only place.

And throughout, regular users must never see or reach any admin surface.

## What Changes

- **New SUPERADMIN role** added to the role hierarchy, above `ADMIN`. A
  `requireSuperadmin()` gate protects owner-only routes; `requireAdmin()`
  continues to admit both ADMIN and SUPERADMIN. The initial superadmin is
  bootstrapped from an env allow-list (`SUPERADMIN_EMAIL`) so the first owner
  exists without manual DB edits.
- **Admin invitations + lifecycle management** — superadmins can invite a person
  by email to become an ADMIN (or SUPERADMIN). The invite is consumed on that
  person's next authenticated request (even if they sign up later), with a
  signed, expiring token. Superadmins can also promote, demote, and revoke
  admins from a management screen, every action written to the audit log.
- **Ownership transfer** — a superadmin can hand the owner role to another
  account (the real owner), with a confirm step, so the developer can step down
  cleanly. The system always keeps at least one superadmin.
- **God-mode owner console** at `/admin/owner` — a superadmin-only dashboard
  aggregating live, app-wide insight: user growth + role/ban breakdown, listing
  counts by type/city/status, commerce (GMV, orders, payouts, commission,
  subscriptions), engagement (saves, messages, reviews), moderation queue depth,
  and cron/system health — read-only, with drill-through links to existing admin
  pages.
- **Admin-surface hardening** — audit and lock down every admin entry point so
  it is invisible and unreachable to non-admins, and so SUPERADMIN-only items are
  hidden from plain ADMINs.

## Capabilities

### New Capabilities
- `superadmin-role`: A SUPERADMIN tier above ADMIN, bootstrapped from env, gating owner-only routes, with safe ownership transfer that never drops the last superadmin.
- `admin-management`: Superadmin-driven granting and revoking of admin access — email invitations consumed on first authenticated request, plus promote/demote/revoke, all audited.
- `owner-insights-console`: A superadmin-only, read-only god-mode dashboard aggregating app-wide product, commerce, engagement, moderation, and system-health metrics.
- `admin-surface-visibility`: A guarantee that admin and superadmin surfaces are hidden and unreachable for users who lack the corresponding role.

### Modified Capabilities
<!-- None — openspec/specs/ is currently empty; this change introduces these specs. -->

## Impact

- **Schema/DB**: `UserRole` enum gains `SUPERADMIN`; new `AdminInvite` model (email, role, token hash, inviter, status, expiry, consumed_at). No destructive migration. Run via `prisma migrate`/`db push` on the DIRECT connection.
- **Auth**: `lib/auth.ts` — add `SUPERADMIN` handling, `requireSuperadmin()`, `is_superadmin` on `SessionUser`, env bootstrap (`SUPERADMIN_EMAIL`), and invite consumption in the lazy-upsert path (alongside the existing signup-intent flow).
- **Routes/UI**: new `/admin/owner` (god-mode console) and `/admin/admins` (admin management + invites); server actions for invite/promote/demote/revoke/transfer; admin nav shows SUPERADMIN-only items conditionally; audit-log writes for every privileged action.
- **Config**: `SUPERADMIN_EMAIL` env (bootstrap owner). Relationship to the existing `SIC_ADMIN_EMAIL` clarified (SIC stays an ADMIN seed; SUPERADMIN is the owner tier).
- **Email**: a transactional "you've been invited as an admin" email via the existing `lib/email.ts` (no-ops cleanly until Resend is configured).
- **Security**: privileged routes fail closed; invites are single-use, expiring, hashed at rest; ownership transfer requires explicit confirmation and preserves a last-superadmin invariant.
- **Non-goals**: no per-permission RBAC matrix, no admin impersonation/"log in as user", no new analytics warehouse — god-mode reads from existing tables.
