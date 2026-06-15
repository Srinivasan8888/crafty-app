## Why

Crafty's North Star is a living directory buyers **return** to (weekly active discovery; creators who self-onboard and stay). The app already has the machinery for that loop, but the pieces are buried, disconnected, or silently broken: the co-save recommendation engine only renders inside the dashboard, there is no "what's new since last visit" signal anywhere, finished cross-link UI ships nothing, a buyer's message to a creator dies in an unbadged inbox the creator is never told about, and the one public ranking ("Most-saved crafter") cuts against the product's "show the maker, not the metric" principle. This change closes those loops using surfaces and data that already exist, so returning to Crafty next Sunday has a reason.

## What Changes

- Add a **"New this week in {City}"** rail to the top of the city landing page: the most recent published crafters/stores/studios and upcoming events for that city (created in the last ~14 days), hidden when fewer than ~3 fresh items exist so it never looks stale. No schema change (`created_at` already exists).
- For **signed-in buyers with at least one save**, render a **"Picks for you in {City}"** rail on the city landing, powered by the existing `getForYou` recommendation engine (city-scoped). Signed-out / zero-save buyers see the current rails unchanged.
- Wire the already-built but unused **`CrossLinkCard`** into crafter/store/studio detail pages so a maker links to the studio they teach at, events they appear in, and related listings, keeping sessions moving across the directory.
- **Notify creators of new buyer messages**: send the listing owner a transactional email when a buyer starts/continues a conversation, and show an unread-conversation count badge on the dashboard "Messages" nav and in the activity strip. (Today `/api/messages` persists the message but tells the owner nothing until a once-daily digest.)
- **Reframe "Crafter of the week"** on the community page: present it as an editorial/rotating weekly feature instead of a "Most-saved crafter this week" ranking. Save counts stay private. Removes the only public popularity leaderboard in the app.

Non-goals (explicitly out of scope, to keep this on-strategy): no global/non-local feed, no public save/popularity counts, no follow primitive, no push notifications, no notify-on-update cron (those are the separate "retention engines" slice).

## Capabilities

### New Capabilities
- `discovery-surfaces`: the return-loop discovery surfaces — the city landing's "new this week" freshness rail, the signed-in personalized "picks for you" rail, and detail-page cross-entity links — that give buyers a reason to return and deepen each session.
- `creator-message-notifications`: alerting a listing owner (email + dashboard unread badge) when a buyer messages them, so the warm introduction is not lost in an unseen inbox.
- `community-spotlight`: presenting the weekly community crafter feature editorially rather than as a public most-saved ranking, keeping popularity private.

### Modified Capabilities
<!-- None. Existing specs (access-denied-page, cron-health-monitor, listing-reporting) are unrelated; this change introduces new surfaces only. -->

## Impact

- **Discovery / landing**: `app/[city]/page.tsx`, `components/DiscoveryRail.tsx`, `components/Cards.tsx`, `components/ForYouSection.tsx` (reuse its rec card), `lib/recommendations.ts` (add an optional city scope to `getForYou`).
- **Detail pages / cross-links**: `components/CrossLinkCard.tsx` (currently unimported), `app/[city]/crafters/[slug]/page.tsx`, `app/[city]/stores/[slug]/page.tsx`, `app/[city]/learn/[slug]/page.tsx` (read existing relations; no new model).
- **Messaging notifications**: `app/api/messages/route.ts` (fire owner email on buyer message), `lib/email.ts` (new template), `app/dashboard/layout.tsx` + `components/ActivityStrip.tsx` (unread badge). No schema change (uses existing `Conversation`/`Message` read pointers).
- **Community**: `app/community/page.tsx`, `messages/en.json` (+ hi/ta/kn) for the reframed eyebrow/label; drops the save-count-derived "most-saved" copy.
- **Performance**: the landing gains 1-2 extra queries (recent listings; `getForYou` only for signed-in savers) — bounded `take` limits, behind `revalidate`. No new dependencies. No breaking changes.
