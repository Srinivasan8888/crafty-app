## 1. P0 — Lifecycle email re-blast (ship with migration)

- [x] 1.1 ~~Add Prisma migration: `User.last_lifecycle_email_at`~~ — SUPERSEDED: the cron's own header documents `updated_at` as the dedup watermark, so the fix needs no schema change (avoids a prod `db push`)
- [x] 1.2 Filter every segment on the `updated_at` window (already present) and collect emailed IDs
- [x] 1.3 Bump `updated_at` for everyone emailed (`updateMany`) so the next run excludes them
- [ ] 1.4 Regression test for lifecycle dedupe (needs a Prisma mock/integration harness — not yet added)

## 2. P1 fixes

- [x] 2.1 `app/logout/route.ts`: clear `DS`/`DSR` with both host-only and an explicit `Domain` (via `DESCOPE_COOKIE_DOMAIN`) so a domain-scoped cookie is overwritten *(server-side revocation deferred — see notes)*
- [x] 2.2 `app/api/webhooks/descope/route.ts`: HMAC the raw `req.text()` bytes (accepts both raw and re-stringified forms so a valid webhook is never falsely rejected)
- [x] 2.3 `app/api/orders/[id]/fulfill/route.ts`: only flip the order to FULFILLED when the action covers EVERY item (no-schema interim; multi-seller orders no longer mis-flip). Full per-item model deferred to V3.1

## 3. P2 fixes

- [x] 3.1 `app/api/cart/[productId]/route.ts`: PATCH `upsert` → owner-scoped `updateMany`, 404 if absent
- [x] 3.2 `app/api/cron/event-reminders/route.ts`: select + honor organizer `email_bounced` / placeholder
- [x] 3.3 `app/[city]/events/page.tsx`: anchor weekend to the current Saturday so Sunday's events show
- [x] 3.4 `components/ThemeToggle.tsx`: render a neutral placeholder until mounted (no wrong icon, no mismatch)
- [x] 3.5 `app/actions/locale.ts`: add `secure` in production
- [x] 3.6 `components/ProfileMenu.tsx`: disclosure semantics (dropped `role=menu`) + focus restore on Escape
- [x] 3.7 `lib/auth.ts`: clear `crafty_signup_intent` after promotion (best-effort, render-safe)

## 4. P3 fixes

- [x] 4.1 `app/api/api-keys/route.ts`: validate scopes against an allowlist (`z.enum`)
- [x] 4.2 Cron secret constant-time compare across all 9 `app/api/cron/**` routes — shared `cronSecretMatches()` helper in `lib/cron.ts`
- [x] 4.3 `lib/util.ts`: re-slice in `ensureUniqueSlug` so the slug never exceeds 60 chars
- [x] 4.4 `app/api/webhooks/descope/route.ts`: "User Deleted" detaches only (no `is_banned`), so re-signup works
- [x] 4.5 `lib/recommendations.ts`: widen the candidate pool when city-scoped so the rail fills
- [x] 4.6 Escape URL fields in email templates (`lib/email.ts`) — defense-in-depth via the existing `escape()` helper
- [x] 4.7 `components/AppHeader.tsx`: guard `current` against an empty `getCities()`
- [x] 4.8 `components/MobileDrawer.tsx`: remove the stray `className="me"`

## 5. Tests & verification

- [x] 5.1 Added regression tests: weekend window incl. Sunday (`__tests__/lib/event-windows.test.ts`, after extracting `whenWindow` to `lib/event-windows.ts`) + `ensureUniqueSlug` 4-digit-suffix cap. (Fulfillment + lifecycle dedupe still need a Prisma harness)
- [x] 5.2 `npx tsc --noEmit` and `npm test` green
- [x] 5.3 Clean production build: `DEV_AUTH= NEXT_TELEMETRY_DISABLED=1 npx next build` succeeds
- [ ] 5.4 Manual: confirm logout ends the session in a real Descope env; confirm locale cookie is `Secure` in prod
- [x] 5.5 ~~Deploy the Prisma migration~~ — N/A (no schema change; nothing to migrate)
