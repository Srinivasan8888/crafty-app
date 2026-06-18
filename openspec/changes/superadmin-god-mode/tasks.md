# Superadmin / God-Mode Tasks

Legend: **[CODE]** = in-repo · **[OPS]** = founder/dashboard · **[VERIFY]** = check behavior.
Critical path: 1 → 2 → 3/4 → 5 → 6.

## 1. Schema & migration

- [x] 1.1 **[CODE]** Add `SUPERADMIN` to the `UserRole` enum in `prisma/schema.prisma`.
- [x] 1.2 **[CODE]** Add `AdminInvite` model: `id`, `email`, `role` (UserRole, ADMIN|SUPERADMIN), `token_hash`, `invited_by_user_id` (→ User), `status` (PENDING|CONSUMED|REVOKED|EXPIRED), `expires_at`, `consumed_at`, `created_at`. Index on `email` + `status`; unique guard for one active invite per email.
- [ ] 1.3 **[CODE]** `bunx prisma migrate dev` (uses `DIRECT_URL`) then `prisma generate`. Confirm `bun run typecheck` + `DEV_AUTH=false STORAGE_DRIVER=local bun run build` pass.

## 2. Auth core (`lib/auth.ts`)

- [x] 2.1 **[CODE]** Add `is_superadmin` to `SessionUser`; set `is_admin = true` whenever role is SUPERADMIN.
- [x] 2.2 **[CODE]** Add `requireSuperadmin()` (throws/redirects like `requireAdmin`); ensure `requireAdmin()` admits SUPERADMIN.
- [x] 2.3 **[CODE]** Bootstrap: parse `SUPERADMIN_EMAIL` (comma-separated allow-list); in lazy upsert, if the authed email is allow-listed, ensure role=SUPERADMIN (idempotent). In DEV mode, treat the dev user as SUPERADMIN.
- [x] 2.4 **[CODE]** Invite consumption: in the lazy-upsert path (beside signup-intent), if a PENDING, unexpired `AdminInvite` matches the authed email, apply the invited role, mark CONSUMED (+ `consumed_at`), and write an audit entry. Treat past-expiry invites as EXPIRED and ignore.

## 3. Admin management (`/admin/admins`)

- [x] 3.1 **[CODE]** Page `/admin/admins` (gated by `requireSuperadmin()`): list current admins/superadmins + pending invites.
- [x] 3.2 **[CODE]** Server action `inviteAdmin(email, role)` — superadmin-only; create hashed, expiring invite; send invite email via `lib/email.ts`; audit.
- [x] 3.3 **[CODE]** Server actions `promote/demote/revokeAdmin(userId, role)` and `revokeInvite(id)` — superadmin-only; enforce the last-superadmin invariant; audit each.
- [x] 3.4 **[CODE]** Server action `transferOwnership(targetUserId, {stepDown})` — promote target to SUPERADMIN, optional self step-down to ADMIN, behind a confirm; never drop below one SUPERADMIN; audit.
- [x] 3.5 **[CODE]** Tighten role mutation in `/admin/users` so only SUPERADMIN can change roles (ADMINs keep moderation powers).
- [x] 3.6 **[CODE]** Invite email template in `lib/email.ts` (no-ops cleanly when Resend unset).

## 4. God-mode owner console (`/admin/owner`)

- [x] 4.1 **[CODE]** Page `/admin/owner` (gated by `requireSuperadmin()`), read-only; `export const revalidate` short cache.
- [x] 4.2 **[CODE]** Aggregate queries (`Promise.all` of count/aggregate/groupBy): users (total, new 7/30d, by role, banned); listings by type×status×city; commerce (orders, GMV, commission, payouts pending/paid, active PRO subs); engagement (saves, messages, reviews 7/30d); moderation (open flags, pending claim/city requests); cron/system health.
- [x] 4.3 **[CODE]** Render metric cards with drill-through links to existing admin pages; no mutations.

## 5. Visibility hardening

- [x] 5.1 **[CODE]** Admin sidebar (`app/admin/layout.tsx`): show "Owner console" + "Admins" links only when `is_superadmin`.
- [x] 5.2 **[CODE]** Confirm dashboard "Admin →" + badge stay gated by `is_admin`; confirm `/admin` is in middleware `PRIVATE_ROUTES`.
- [ ] 5.3 **[VERIFY]** Grep for any admin link/route string rendered without a role guard; fix leaks. Verify non-admin → `/admin/*` and admin → `/admin/owner` both redirect to `/forbidden`.

## 6. Ops & verification

- [ ] 6.1 **[OPS]** Set `SUPERADMIN_EMAIL` in Vercel production (bootstrap owner). Add to `.env.example` with a comment.
- [ ] 6.2 **[OPS/CODE]** Deploy; verify `/admin/owner` renders for the superadmin and is `/forbidden` for an ADMIN.
- [ ] 6.3 **[VERIFY]** Invite round-trip: invite a test email → that account signs in → becomes ADMIN → audit entry present → invite CONSUMED.
- [ ] 6.4 **[VERIFY]** Handover dry-run: transfer ownership to a second account; confirm last-superadmin invariant blocks removing the final SUPERADMIN.
- [ ] 6.5 **[OPS]** On real handover: set `SUPERADMIN_EMAIL` to the owner, transfer ownership, and remove the developer from the allow-list.
