## Why

Crafty ships ~30+ features across discovery, commerce, dashboard, admin, public API, and cron. A feature-by-feature audit of the shipped code (five parallel reviews covering commerce, discovery, dashboard/creator, admin, and backend/infra) found a cluster of verified defects where a feature *looks* live but silently does the wrong thing — a moderation control that is a no-op, paid-tier limits that aren't enforced, filter UI that doesn't filter, and scheduled notifications that mostly never fire. These are exactly the failures that erode trust at launch because they pass a glance but fail in use. This change fixes the confirmed defects before the demo/soft launch.

Auth gating, payment money-math, webhook signature verification, ownership/IDOR checks, the public API, and the upload pipeline were all reviewed and found correct — so the work here is targeted bug-fixing, not a rewrite.

## What Changes

- **Enforce account bans.** `is_banned` is set by the admin "Ban" action but never read; banned users can still sign in and mutate. Make `requireUser()`/auth treat banned accounts as denied.
- **Enforce per-tier product limits.** `getMaxProducts` (5 free / 25 Pro) is documented as enforced by `POST /api/products` but is never called — any seller can create unlimited products. Add the count check.
- **Fix the Learn (studios) filters.** The filter bottom-sheet pushes `age`/`nbhd`/`online`/`trial`/`featured`/`sort` and a mobile search `q`, all of which the Learn page ignores; the neighbourhood list is hardcoded Bengaluru-only with fabricated counts; "Featured first" defaults ON. Wire the params that should work, remove the fabricated ones, and route Learn search to `/search` like the other listings.
- **Fix scheduled notifications.** `event-reminders` uses a 2h look-ahead window but is scheduled daily (most events never get a reminder); `expire-featured` un-features listings that still have an overlapping active paid window; `message-digest`'s noreply guard is dead code and emails internal `@noreply.crafty.app` addresses. Correct the windowing, overlap check, and address guard.
- **Fix listing edit integrity.** Edit PATCH schemas drop re-uploaded image blurhashes (stale placeholders), edit pages don't pre-fill stored blurhashes, the crafter 1-per-type cap counts soft-deleted rows (permanent lockout after delete), and event price validation is looser on edit than create. Carry blurhash through, exclude `DELETED` from the cap, and match validation.
- **Fix claim/ownership/admin-state integrity.** Approving a stale claim request can overwrite an existing owner with no server-side guard; admin city reorder drifts `display_order` instead of swapping neighbors; `setStatus("HIDDEN")` leaves a stale `deleted_at`; `/api/city-requests` trusts a client-supplied `reporter_email`. Add the ownership guard, neighbor-swap, timestamp clear, and session-derived identity.
- **Fix discovery/UX correctness.** Remove dead links/anchors (`#getting-there` with no target; no-op `phoneDigits` JSX), deep-link dashboard event View/Edit rows (currently both point to the list) and show their city, include ongoing multi-day events in the "Today" filter, relabel misleading "Crafters who source/teach here" headings, soften the order-status "updates automatically" copy where there is no polling, and add the missing `community.eyebrow` i18n key to hi/kn/ta.

## Capabilities

### New Capabilities
- `account-ban-enforcement`: Banned accounts are denied authenticated access and blocked from all mutations; the admin Ban control has a real effect.
- `subscription-product-limits`: Product creation enforces the per-tier cap (free vs Pro) server-side.
- `studio-discovery-filters`: The Learn (studios) listing honors its filter, sort, and search controls; fabricated/non-functional filter UI is removed or backed by real data.
- `scheduled-notification-delivery`: Event-reminder, featured-expiry, and message-digest crons deliver correctly — full event coverage, no premature un-featuring across overlapping paid windows, and no sends to placeholder addresses.
- `listing-edit-integrity`: Edit flows preserve image blurhashes, pre-fill stored values, validate consistently with create, and never permanently block re-creation after a soft delete.
- `claim-and-ownership-integrity`: Claim approval cannot clobber an existing owner, admin reordering swaps deterministically, status transitions leave consistent timestamps, and request/report attribution is session-derived rather than client-supplied.
- `discovery-ux-correctness`: Public and dashboard surfaces have no dead links/anchors or misleading headings, deep-link correctly, scope date filters correctly, present accurate status copy, and have locale parity for shipped strings.

### Modified Capabilities
<!-- No existing spec's requirements change; the reporting/cron-health/access-denied specs in openspec/specs/ are unaffected. -->

## Impact

- **Auth/security:** `lib/auth.ts` (ban enforcement); `app/api/city-requests/route.ts` (trusted identity); `app/api/admin/claim-requests/[id]/route.ts` (ownership guard).
- **Commerce:** `app/api/products/route.ts` (tier cap), `lib/subscription-gates.ts`.
- **Discovery:** `app/[city]/learn/_components/Filters.tsx` + `app/[city]/learn/page.tsx`; `app/[city]/events/page.tsx` + `[slug]/page.tsx`; `app/[city]/stores/[slug]/page.tsx`, `app/[city]/learn/[slug]/page.tsx`.
- **Cron:** `app/api/cron/event-reminders/route.ts`, `expire-featured/route.ts`, `message-digest/route.ts`, and `vercel.json` schedule.
- **Dashboard/edit:** `app/dashboard/page.tsx`; `app/api/{crafters,stores,studios,events}/[id]/route.ts` + matching edit pages; `app/api/crafters/route.ts` (soft-delete cap).
- **Admin:** `app/admin/users/actions.ts`, `app/admin/cities/page.tsx`, `app/admin/listings/actions.ts`.
- **i18n:** `messages/hi.json`, `messages/kn.json`, `messages/ta.json`.
- **No schema migrations required** for the core fixes; no dependency changes. Existing E2E flows should continue to pass, with new coverage added for ban enforcement, product limits, and Learn filters.
