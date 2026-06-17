## Context

Post-launch audit of the live `main` branch. 19 confirmed defects across auth/session, commerce, email/cron, discovery, and UI. Unit tests (44) and `tsc` are green; the defects are logic/security gaps that tests don't currently cover. Three of the bugs are in code shipped this session (logout, account dropdown, mobile drawer). The lifecycle-email P0 fires on a daily cron, so it has a real-world clock attached.

## Goals / Non-Goals

**Goals:**
- Stop the P0 daily email re-blast before its next run.
- Make logout actually end the session (the feature shipped this session is ineffective under a configured Descope `cookieDomain`).
- Fix the P1 correctness/security defects (webhook HMAC, multi-seller fulfillment).
- Clear the P2/P3 backlog with low-risk, surgical fixes.
- Add regression tests for the logic bugs that have deterministic inputs (weekend window, slug length, fulfillment gating, lifecycle dedupe).

**Non-Goals:**
- No new product features. No redesign of the email/cron architecture.
- Full per-item order fulfillment (the proper fix for multi-seller orders) is a larger V3.1 change; here we only stop the order from misrepresenting state.
- Full ARIA menu keyboard pattern is optional; downgrading the dropdown to a disclosure is the accepted minimal fix.

## Decisions

**P0 — lifecycle email dedupe.** Add a dedicated `last_lifecycle_email_at DateTime?` column on `User` and filter each segment on `last_lifecycle_email_at == null OR < cutoff`, writing it after each successful send. Chosen over reusing `User.updated_at` (the original intent) because `updated_at` is bumped by unrelated writes and overloading it caused the bug; a dedicated watermark is unambiguous and queryable. Requires a Prisma migration.

**P1 — logout.** Clear `DS`/`DSR` with both the host-only form *and* an explicit `Domain` matching Descope's configured `cookieDomain` (read from env), since a `Set-Cookie` deletion must match the original cookie's domain to overwrite it. Additionally call Descope's server-side session/refresh revocation so the token is dead, not just dropped. Alternative (clear only host-only) rejected: it's exactly the current broken behavior under a domain-scoped cookie.

**P1 — webhook HMAC.** Read the raw body once with `await req.text()`, HMAC the raw bytes, then `JSON.parse` for handling. Re-serializing parsed JSON is not byte-stable (key order, whitespace, unicode escaping), so the current code rejects valid webhooks.

**P1 — order fulfillment.** Until per-item fulfillment exists, only flip `Order.status` to `FULFILLED` when every `OrderItem`'s seller is covered; a single seller's action marks just their items (add a per-item `fulfilled_at`/boolean) and the order flips only when all are done. Minimal interim: gate the order-level flip behind `order.items.every(item => fulfilled)`.

**P2 fixes (surgical):**
- Cart PATCH: switch `upsert` → `update`; return 404 if the line doesn't exist (PATCH is "set quantity", not "add"). Preserves the `cannot_buy_own_product` guard that only the POST path enforces.
- Event-reminders: add `email_bounced` to the organizer `select` and skip bounced/empty/`@noreply` organizers, matching every other cron.
- Weekend filter: anchor to the *current* weekend's Saturday — `daysSinceSat = (day + 1) % 7` (Sat→0, Sun→1) — so Sunday stays in this weekend; the existing `lowerEnd = max(now, start)` clamp keeps past events out.
- ThemeToggle: lazy-init state from the DOM class the pre-paint bootstrap already set (`document.documentElement.classList.contains("dark")`), SSR-guarded, so the first client render matches.
- Locale cookie: add `secure: process.env.NODE_ENV === "production"`.
- ProfileMenu: drop `role="menu"`/`menuitem`/`aria-haspopup="menu"` → plain disclosure popover (fully correct with no keyboard-roving requirement), and restore focus to the trigger on close.
- Signup-intent: clear `crafty_signup_intent` in `getCurrentUser` immediately after it's consumed for promotion, so it can't promote an unrelated later sign-in.

**P3 fixes:** allowlist API-key scopes (`z.enum(["read:public"])`); `timingSafeEqual` for cron secrets (shared helper); re-slice in `ensureUniqueSlug` so suffix never overflows 60 chars; use a dedicated delete tombstone instead of `is_banned` for "User Deleted"; push the city filter into the `getForYou` SQL before `LIMIT`; escape URL fields in email templates; guard `current` in `AppHeader` (`if (!current) return null`); remove the stray `className="me"` in `MobileDrawer`.

## Risks / Trade-offs

- [Prisma migration on prod for the watermark] → Additive nullable column, safe to deploy; backfill not required (null = "never emailed", treated as eligible, but the first post-deploy run will then set watermarks and self-correct).
- [Logout revocation call adds a Descope network dependency] → Wrap in try/catch; cookie clearing still happens even if revocation errors, so logout never hard-fails.
- [Interim order-fulfillment gate could leave an order "stuck" PAID if one seller never ships] → Acceptable and already true; surfaced to admin via existing sales views. Proper fix tracked separately.
- [Local `next build` fails on `DEV_AUTH=true`] → Not a code bug; the intentional prod hard-stop trips because local `.env` carries `DEV_AUTH`. Build with `DEV_AUTH=` to reproduce prod; Vercel prod env omits it.

## Migration Plan

1. Prisma migration: add `User.last_lifecycle_email_at DateTime?`. `prisma migrate deploy` on prod (additive, no lock risk).
2. Ship the lifecycle-email fix in the same deploy as the migration so the next daily run reads/writes the new column.
3. Logout/webhook/fulfillment fixes are code-only — deploy via `main`.
4. Rollback: revert the commit; the nullable column can stay (harmless) or be dropped in a follow-up.

## Open Questions

- Does the production Descope project set a `cookieDomain`? If yes, the logout `Domain` fix is required for correctness; if no, it's defense-in-depth. Confirm in the Descope console before sizing the logout fix.
- Should the multi-seller order get the full per-item fulfillment model now, or ship the interim gate and defer? (Proposal assumes interim gate.)
