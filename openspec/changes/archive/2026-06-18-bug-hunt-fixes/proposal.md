## Why

A line-by-line review of the codebase (5 parallel area audits) plus the unit suite (44 passing) and a production build surfaced 19 confirmed defects — including 1 P0 and 3 P1 that affect production right now: lifecycle emails re-blast the same users daily, the just-shipped logout doesn't reliably end a session, the Descope webhook verifies the wrong bytes, and a single seller can mark a whole multi-seller order fulfilled. The full launch branch is already live on `main`, so these need fixing on prod.

## What Changes

Defect fixes only — no new product surface. Grouped by severity:

**P0 — fix immediately**
- Lifecycle re-engagement cron (`app/api/cron/lifecycle-emails/route.ts`): the dedupe model relies on bumping `User.updated_at` after a send, but the code never writes it back, so the same lapsed creators / inactive buyers / cold signups are re-emailed on **every daily run** (up to ~300 recipients/run). Add a real per-recipient send watermark.

**P1**
- Logout (`app/logout/route.ts`): deletion cookies omit the `Domain` attribute, so when Descope is configured with a `cookieDomain` the `DSR`/`DS` cookies are not overwritten and the session silently resurrects; logout also never revokes the refresh token server-side. (This is in the logout feature shipped this session.)
- Descope webhook (`app/api/webhooks/descope/route.ts`): HMAC is computed over `JSON.stringify(parsedBody)` instead of the raw request bytes, so any payload that doesn't round-trip identically fails verification and silently drops user-sync events.
- Order fulfillment (`app/api/orders/[id]/fulfill/route.ts`): a single seller's "mark fulfilled" flips the **entire** multi-seller order to `FULFILLED`, hiding other sellers' fulfill action and showing the buyer "shipped" prematurely.

**P2**
- Cart PATCH (`app/api/cart/[productId]/route.ts`): uses `upsert`, so "set quantity" silently **creates** a line for a never-added product and skips the `cannot_buy_own_product` guard.
- Event-reminders cron (`app/api/cron/event-reminders/route.ts`): organizer send ignores `email_bounced` (field isn't even selected) while every other cron honors it — sender-reputation risk.
- "This weekend" events filter (`app/[city]/events/page.tsx`): on Sundays the window jumps to next weekend, hiding events happening that same Sunday.
- ThemeToggle (`components/ThemeToggle.tsx`): initial state hardcoded to `light`, so dark-mode users see the wrong icon + wrong `aria-label` until `useEffect` runs.
- Locale cookie (`app/actions/locale.ts`): written without the `Secure` flag in production.
- Account dropdown a11y (`components/ProfileMenu.tsx`): declares `role="menu"` without keyboard roving focus and never restores focus to the trigger on close. (Shipped this session.)
- Signup-intent (`app/list-your-profile/actions.ts` + `lib/auth.ts`): the `crafty_signup_intent` cookie is set before auth and is never cleared after consumption, so an unrelated sign-in within 10 minutes can be auto-promoted to `CREATOR`.

**P3**
- `getForYou` city recall (`lib/recommendations.ts`): city filter is applied after the SQL `LIMIT`, so the "Picks for you in {City}" rail can under-fill or show empty.
- API-key scopes (`app/api/api-keys/route.ts`): self-service scopes aren't validated against an allowlist (`read:*` wildcard accepted).
- Cron secret comparison (`app/api/cron/**`, ×9): plain `!==` instead of constant-time `timingSafeEqual`.
- `ensureUniqueSlug` (`lib/util.ts`): collision suffix can push the slug past the 60-char invariant after ≥1000 collisions.
- Descope "User Deleted" (`app/api/webhooks/descope/route.ts`): reuses `is_banned` as a delete tombstone, blocking the same email from ever signing back in.
- MobileDrawer header (`components/MobileDrawer.tsx`): stray `className="me"` pulls in avatar-row CSS, drawing an unintended divider under the logo. (Touched this session.)
- Email URLs (`lib/email.ts`, `lib/lifecycle-emails.ts`): URL fields interpolated into `href` without escaping (defense-in-depth; no current injection vector).
- AppHeader (`components/AppHeader.tsx`): `current` can be `undefined` if `getCities()` returns empty, then `current.slug` throws.

## Capabilities

### New Capabilities
- None. This is a defect-fix change; it restores existing intended behavior and introduces no new requirements.

### Modified Capabilities
- `scheduled-notification-delivery`: lifecycle re-engagement emails must de-duplicate per recipient; organizer reminders must honor bounce state.
- `discovery-ux-correctness`: "This weekend" must include the current Sunday; city-scoped "Picks for you" must apply the city filter before the candidate limit.
- `account-ban-enforcement`: a Descope account deletion must not permanently block re-registration of the same email.

## Impact

- **Production**: P0/P1 items are live on `main` / `crafty-app-five.vercel.app`. The lifecycle-email P0 should be paused/fixed before its next daily run.
- **Auth/session**: `app/logout/route.ts`, `app/api/webhooks/descope/route.ts`, `lib/auth.ts`, `app/list-your-profile/actions.ts`, `app/actions/locale.ts`.
- **Commerce**: `app/api/orders/[id]/fulfill/route.ts`, `app/dashboard/sales/[orderId]/page.tsx`, `app/api/cart/[productId]/route.ts`.
- **Email/cron**: `app/api/cron/lifecycle-emails/route.ts`, `app/api/cron/event-reminders/route.ts`, `app/api/cron/**` (secret compare), `lib/email.ts`, `lib/lifecycle-emails.ts`.
- **UI**: `components/ThemeToggle.tsx`, `components/ProfileMenu.tsx`, `components/MobileDrawer.tsx`, `components/AppHeader.tsx`.
- **Discovery / misc**: `app/[city]/events/page.tsx`, `lib/recommendations.ts`, `app/api/api-keys/route.ts`, `lib/util.ts`.
- **Schema**: the lifecycle-email watermark fix may add a column (`last_lifecycle_email_at`) or a small table — a Prisma migration. No other DB changes.
- Verified green before fixes: `npm test` (44/44), `tsc --noEmit`. (Clean production build is being re-confirmed after a dev-server collision invalidated the first run.)
