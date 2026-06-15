## Context

The city landing (`app/[city]/page.tsx`) is the surface ~95% of (mobile) buyers open. Today it renders four static "newest 8" rails (`DiscoveryRail`) and never reflects the buyer or the freshness of the directory. The personalization engine (`lib/recommendations.ts` `getForYou`, item-to-item co-save CF) already exists and is hydrated cleanly, but is only mounted in the dashboard (`ForYouSection`) and on detail pages (`CoSaveRecommendations`). `CrossLinkCard` is fully built but imported nowhere. Messaging persists fine (`/api/messages`, `Conversation`/`Message` with read pointers) but the owner is only told via a once-daily digest cron. The community page derives "Crafter of the week" from a raw save count and labels it "Most-saved", the only public ranking in the app.

This change reuses all of that — no new data models, no new dependencies — to make the return loop actually close. Constraints: stay local-first (no global feed), keep popularity private (no public counts), preserve LCP on the landing (server-rendered), and don't flood creators with email.

## Goals / Non-Goals

**Goals:**
- A returning buyer sees something new and something personal on the city landing.
- Sessions move across the maker↔studio↔event graph (more listing-page views/visit).
- A creator learns within minutes that a buyer reached out, and can see unread count at a glance.
- Remove the public most-saved ranking without losing the editorial spotlight.

**Non-Goals:**
- Follow-a-maker, notify-on-update crons, web push, RSVP reminders (the separate "retention engines" slice).
- Any new public metric, global feed, or schema migration.

## Decisions

**1. "New this week" rail = bounded per-entity recency queries, merged, hidden when thin.**
Add a small server query per entity type for `status=PUBLISHED, city_id, created_at >= now-14d` (events also `end_at >= now`), `take` ~6 each, newest first, rendered with existing card components inside a `DiscoveryRail`. Render the rail only when the combined fresh count ≥ 3. *Alternative considered:* a materialized "recent" view or a unified activity table — rejected as premature; `created_at` is already indexed enough for a `take`-bounded query and this avoids schema work. Overlap with the standard rails is allowed (freshness emphasis) rather than adding dedupe complexity.

**2. Personalized rail is server-rendered, gated, and city-scoped.**
Extend `getForYou` with an optional `citySlug`/`cityId` filter so picks stay local. Call it from the landing **only** when the request is authenticated AND the user has ≥1 save (a cheap `count`), so anonymous/zero-save visitors pay nothing and the current rails are unchanged for them. Reuse `ForYouSection`'s rec card. *Alternative:* client-side fetch after load — rejected: the landing is server-rendered for SEO/LCP and a client rail would flash in late.

**3. Cross-links are derived from existing relations.**
`CrossLinkCard` reads relations that already exist (e.g. a crafter's `EventCrafter` appearances, the studio they teach at, associated stores). No new model; if a relation is empty the card is omitted. Keep it below the fold so it never competes with the primary contact CTA.

**4. Message notification = best-effort owner email on buyer→owner messages + unread badge from existing read pointers.**
In `/api/messages` (and the reply route), when the sender is the buyer (not the owner), fire a fire-and-forget owner email via `lib/email.ts` (new "new message" template), never blocking the mutation, respecting `email_bounced`. Throttle to at most one email per conversation per hour (compare `last_message_at` / a `last_notified_at` style guard) so a rapid back-and-forth doesn't spam. The dashboard badge is a `count` of the owner's conversations with unread buyer messages, derived from the existing read-pointer columns — no schema change. *Alternative:* instant web push — deferred to the retention-engines slice.

**5. Crafter-of-the-week = curated/rotating, not ranked.**
Drop the save-count `groupBy` and the "Most-saved" copy. Select the weekly feature by: an optional admin pin (reuse `is_featured`), else a deterministic rotation among active crafters in the city (e.g. seeded by ISO week number so it's stable within a week and varies across weeks). Save counts are computed nowhere on this surface. Copy becomes editorial ("This week in {City}").

## Risks / Trade-offs

- **Extra landing queries inflate TTFB** → all new queries are `take`-bounded and run inside the existing `Promise.all`; the personalized query is gated to signed-in savers only; page stays under `revalidate`.
- **Creator email fatigue from chatty buyers** → per-conversation hourly throttle + respect `email_bounced`; daily digest stays as the catch-all.
- **"New this week" looks empty in a thin city** → hard ≥3 threshold hides the rail entirely rather than showing one lonely card.
- **Rotation could resurface an inactive crafter as "this week"** → restrict the rotation pool to crafters with a recent `created_at`/activity and allow an admin pin to override.
- **Duplicate items (new-this-week also in the main rail)** → accepted as low-harm; the rails have different framing.

## Migration Plan

Code-only; **no database migration** (no schema changes). Deploy via the normal Vercel prod build. Rollback = revert the change's commits (each surface is independent, so a single problematic surface can be reverted in isolation). Feature-flag not required; the personalized rail self-disables for anon/zero-save users and the freshness rail self-disables under the threshold.

## Open Questions

- Crafter-of-the-week: ship rotation-only now, or also add an explicit admin "pin this week" control? (Lean: rotation + reuse existing `is_featured` as the pin; no new admin UI in this change.)
- Message-notification throttle window: 1 hour per conversation assumed — confirm against expected message volume.
