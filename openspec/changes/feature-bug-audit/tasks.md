## 1. Security & enforcement

- [x] 1.1 Enforce `is_banned` in `lib/auth.ts` at the shared resolver (`getCurrentUser`/`requireUser`) so banned accounts are treated as anonymous/denied; `requireCreator()` and `requireAdmin()` inherit it.
- [x] 1.2 Add a test asserting a banned user is denied on an authenticated page and on a creator mutation route, and that a non-banned user is unaffected.
- [x] 1.3 Enforce the per-tier product cap in `POST /api/products` (`app/api/products/route.ts`): count the seller's non-`DELETED` products and reject when creating another would exceed `getMaxProducts(user)`.
- [x] 1.4 Add a test: free-tier seller at the cap is blocked, soft-deleted products are excluded from the count, within-cap create still succeeds.
- [x] 1.5 Add a server-side ownership guard in `app/api/admin/claim-requests/[id]/route.ts`: re-read the listing and reject approval when `owner_user_id` belongs to a different user (unless an explicit override flag is passed).
- [x] 1.6 Derive `reporter_email` from the session in `app/api/city-requests/route.ts` (or omit for anonymous); stop trusting the client-supplied field, matching `/api/flags`.

## 2. Scheduled jobs (cron)

- [x] 2.1 Align event reminders: set the `vercel.json` schedule for `/api/cron/event-reminders` to hourly (`0 * * * *`) to match the 24–26h window, and fix the handler comment to match the schedule.
- [x] 2.2 In `app/api/cron/expire-featured/route.ts`, before clearing `is_featured`, confirm no other `FeatureOrder` for the same `entity_id` is still active (`status = PAID AND feature_expires_at >= now`); only un-feature when none exist.
- [x] 2.3 Fix the dead-code noreply guard in `app/api/cron/message-digest/route.ts:59` so recipients ending in `@noreply.crafty.app` (and bounced addresses) are actually skipped.

## 3. Learn discovery filters

- [x] 3.1 Wire the real filter/sort params into `app/[city]/learn/page.tsx` query (`online` and `sort`), so the Learn filter sheet controls affect results. (`trial`/`age`/`nbhd` removed — no backing columns; see 3.2.)
- [x] 3.2 Remove the fabricated neighbourhood facet and its hardcoded counts from `app/[city]/learn/_components/Filters.tsx` — also removed the unbacked age-group, free-trial, and popular/saves-sort controls.
- [x] 3.3 Default the "Featured first" toggle to off and stop appending spurious params to the URL on first Apply. (Replaced the toggle with a real `sort`; default "featured" appends no param.)
- [x] 3.4 Route the Learn page mobile search box to `/{city}/search?q=…` (parity with Crafters/Stores), removing the dead `/learn?q=` route.
- [x] 3.5 Add a test asserting an applied Learn filter narrows/reorders the result set.

## 4. Listing edit integrity

- [x] 4.1 Add the `*_blurhash` fields to the PATCH zod schemas in `app/api/{crafters,stores,studios,events}/[id]/route.ts` and persist them alongside the replaced image.
- [x] 4.2 Pass stored blurhash values into `initialValues` on the crafter/store/studio/event edit pages so unchanged images keep their placeholders.
- [x] 4.3 Exclude `status = "DELETED"` from the crafter 1-per-type cap count in `app/api/crafters/route.ts` (parity with stores/studios) so re-creation after soft delete works.
- [x] 4.4 Tighten event PATCH `price_amount` validation in `app/api/events/[id]/route.ts` to `int().nonnegative()` to match the create path.

## 5. Admin state integrity

- [ ] 5.1 Rewrite `reorderCity` in `app/admin/cities/page.tsx` to swap `display_order` with the adjacent city at the target rank inside a `prisma.$transaction` (no value drift/collisions).
- [ ] 5.2 In `app/admin/listings/actions.ts` `setStatus`, clear `deleted_at` on any transition to a non-`DELETED` status (including `HIDDEN`).

## 6. Discovery & UX correctness

- [ ] 6.1 Add `id="getting-there"` to the "Getting there" section in `app/[city]/events/[slug]/page.tsx` so the "View on map" anchor resolves.
- [ ] 6.2 Delete the no-op `{phoneDigits === undefined ? null : null}` JSX and the unused `phoneDigits` const in `app/[city]/stores/[slug]/page.tsx`.
- [ ] 6.3 Deep-link dashboard event rows in `app/dashboard/page.tsx`: select event `slug` + `city`, set "View" to the public event page and "Edit" to `/dashboard/events/{id}/edit`, and show the event's city.
- [ ] 6.4 Broaden the events "Today" filter in `app/[city]/events/page.tsx` to match events whose `[start_at, end_at]` interval overlaps today (include in-progress multi-day events).
- [ ] 6.5 Relabel the "Crafters who source/teach here" headings to "Crafters in {city}" in `app/[city]/stores/[slug]/page.tsx` and `app/[city]/learn/[slug]/page.tsx` (or gate until real tagging exists).
- [ ] 6.6 Soften the PENDING "updates automatically" copy in `app/dashboard/orders/[id]/page.tsx` to tell the user how to check status (no polling exists).
- [ ] 6.7 Add the missing `community.eyebrow` key to `messages/hi.json`, `messages/kn.json`, and `messages/ta.json`.

## 7. Verification

- [ ] 7.1 Run `bun run typecheck` and `bun run lint`; resolve any new errors.
- [ ] 7.2 Run `bun run test` (unit) and the relevant E2E specs; ensure existing + new tests pass.
- [ ] 7.3 Manually smoke each fixed flow: ban a test user and confirm lockout; hit the product cap; apply a Learn filter; edit a listing image; reorder cities; verify the event "Today" filter and dashboard event links.
