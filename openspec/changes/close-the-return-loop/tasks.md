## 1. Discovery — "New this week" freshness rail

- [x] 1.1 In `app/[city]/page.tsx`, add bounded queries for crafters/stores/studios published in the city in the last 14 days (`created_at >= now-14d`, `status=PUBLISHED`, `take ~6`, newest first) and upcoming events (`created_at >= now-14d` AND `end_at >= now`), inside the existing `Promise.all`.
- [x] 1.2 Compute a combined fresh-item count; only render the rail when it is ≥ 3.
- [x] 1.3 Render a "New this week in {City}" `DiscoveryRail` above the standard rails using the existing card components, with a relative "Added …" caption; ensure no save/popularity count is shown.
- [x] 1.4 Verify on a city with ≥3 recent items (rail shows) and a thin/empty city (rail hidden, no empty section).

## 2. Discovery — Personalized "Picks for you" rail

- [x] 2.1 Extend `getForYou` in `lib/recommendations.ts` with an optional `cityId`/`citySlug` filter so picks stay local; keep PUBLISHED + non-expired filtering.
- [x] 2.2 In `app/[city]/page.tsx`, resolve the current user; if authenticated, run a cheap `prisma.save.count` and only call `getForYou` (city-scoped) when count ≥ 1.
- [x] 2.3 Render a "Picks for you in {City}" rail (reuse `ForYouSection`'s rec card) for those users; render nothing for anonymous / zero-save users and execute no recommendation query for them.
- [x] 2.4 Verify: signed-in saver sees the rail; anonymous and zero-save users see the unchanged landing (and no extra query fires).

## 3. Discovery — Cross-entity links on detail pages

- [x] 3.1 Identify the existing relations to surface (crafter ↔ events via `EventCrafter`, crafter/studio teaching link, associated stores) and the data each detail page already loads.
- [x] 3.2 Render `CrossLinkCard` on crafter/store/studio detail pages below the primary contact action, fed from those relations; omit a section when it has no related entities.
- [x] 3.3 Verify links resolve to real pages (no `#`/dead links) and the section is absent when there are no relations.

## 4. Creator message notifications

- [x] 4.1 Add a "new message" template + send helper to `lib/email.ts` (branded, links to the conversation, localized subject).
- [x] 4.2 In `app/api/messages/route.ts` (and the reply route if a buyer can send there), when the sender is the buyer and the recipient is the owner, fire the email best-effort (never block the write), respecting `email_bounced`, throttled to ≤1 per conversation per hour.
- [x] 4.3 Compute the owner's unread-conversation count from existing read pointers; show a badge on the dashboard "Messages" nav (`app/dashboard/layout.tsx`) and in `components/ActivityStrip.tsx`.
- [x] 4.4 Verify: buyer message → owner email (once within an hour); owner self-reply → no email; badge appears with unread and clears when read.

## 5. Community — reframe "Crafter of the week"

- [x] 5.1 In `app/community/page.tsx`, remove the save-count `groupBy` and the "Most-saved crafter" copy/count.
- [x] 5.2 Select the weekly feature via an optional `is_featured` pin, else a deterministic ISO-week rotation among active crafters in the city (stable within a week).
- [x] 5.3 Update copy to an editorial framing ("This week in {City}") in `messages/en.json` (+ hi/ta/kn).
- [x] 5.4 Verify: no public count rendered; same crafter within a week; pin overrides rotation.

## 6. Verify & ship

- [x] 6.1 `bun run typecheck` clean.
- [x] 6.2 `DEV_AUTH=false bun run build` succeeds.
- [ ] 6.3 Commit on `demo-launch-pass`, deploy to Vercel prod, push to `origin`.
- [ ] 6.4 Live smoke: landing shows new-this-week (+ picks-for-you when signed in), detail pages show cross-links, community has no most-saved label; confirm the bookmark loop still works.
