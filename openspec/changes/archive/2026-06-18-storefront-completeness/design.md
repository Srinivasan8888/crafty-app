## Context

Four public storefront surfaces still ship hardcoded "coming soon" placeholders (see [proposal.md](./proposal.md)). The app is past its PRD roadmap and in launch-hardening, so the bar here is **finish the visible gaps with the patterns already in the codebase** — not invent new infrastructure.

Relevant existing patterns this design reuses:

- **Join tables** use a composite primary key: `@@id([a_id, b_id])` + `@@index` on the secondary FK, `onDelete: Cascade` (`CraftCategoryOnCrafter`, `SupplyCategoryOnStore`, `DisciplineOnStudio` in [prisma/schema.prisma](../../../prisma/schema.prisma)).
- **Moderation** flows through the `Flag` model + `/admin/flags` queue + [app/api/flags/route.ts](../../../app/api/flags/route.ts), which already does origin checks (`isSameOrigin`), session-derived reporters (`getCurrentUser`), and `rateLimit(req, "<bucket>")`.
- **Rate limiting** is centralized in [lib/rate-limit.ts](../../../lib/rate-limit.ts).
- **Privacy-safe identity** display was just standardized in [lib/messaging.ts](../../../lib/messaging.ts) (`safeCounterpartyName`) — comments follow the same "never render an email" rule.
- **Placeholder-host detection** for event registration URLs already exists ([lib/json-ld.ts](../../../lib/json-ld.ts), [app/[city]/events/[slug]/page.tsx](../../../app/[city]/events/[slug]/page.tsx)) and is the precedent for "usable address" logic.

## Goals / Non-Goals

**Goals:**
- Replace all four "coming soon" placeholders with working, owner/visitor-usable functionality.
- Add zero new third-party credentials.
- Mirror existing schema, moderation, rate-limit, and privacy patterns rather than introduce new ones.
- Degrade gracefully on seed/empty data (no address, no tagged crafters, no comments).

**Non-Goals:**
- Geocoding, lat/lng storage, or a self-hosted map tile server.
- Threaded/nested comment replies, reactions, or edit history (flat list only).
- Real-time comment streaming (websockets) — revalidate/poll is sufficient.
- Backfilling tags or comments for existing data.
- Touching the adjacent `community-spotlight`, `studio-discovery-filters`, or `event-rsvp-reminders` requirements.

## Decisions

### D1 — Keyless Google Maps embed for event location
Use an `<iframe>` pointed at `https://www.google.com/maps?q=<urlencoded venue_address|venue_name>&output=embed`, plus an "Open in Google Maps" anchor to `https://www.google.com/maps/search/?api=1&query=<...>`.
- **Why:** No API key, no new env var, works for any free-text address — consistent with the app's "no-op cleanly without creds" philosophy. The event already stores `venue_name` + `venue_address`; no geocoding needed.
- **Alternatives considered:** (a) Google Maps Embed API — rejected, requires a billed `MAPS_API_KEY`. (b) OpenStreetMap iframe — rejected, needs lat/lng we don't store. (c) Leaflet client lib — rejected, adds a dependency + still needs coordinates.
- **Trade-off:** `output=embed` is an unofficial URL form; if Google changes it the iframe could break. Mitigated because the address block and the official `api=1` "Open in Maps" link always render independently of the iframe.

### D2 — "Usable address" guard reuses placeholder-host logic
Render the iframe only when `venue_address` is non-empty and not a known seed/placeholder value; otherwise fall back to the current address-only block (never an empty iframe).
- **Why:** Seed/empty events carry placeholder data; an empty map reads worse than the text block. Reuse the existing placeholder-detection precedent.

### D3 — Two new join tables, mirroring `*OnCrafter`/`*OnStore`
Add `StudioCrafter(studio_id, crafter_id)` and `StoreCrafter(store_id, crafter_id)`, each with composite `@@id`, `@@index` on `crafter_id`, and `onDelete: Cascade` both directions.
- **Why:** Identical shape to the three existing join tables → predictable Prisma queries, free idempotency (composite PK rejects duplicates), and automatic cleanup when a crafter/studio/store is deleted.
- **Alternatives considered:** A polymorphic single `ListingCrafter` table with an entity-type column — rejected; the codebase consistently prefers explicit typed join tables (3-FK / per-pair pattern) over polymorphic rows.
- **Display rule:** detail page queries tagged crafters first; only if the set is empty does it fall back to the existing city-sample query (so the page never regresses for untagged listings). Filter tagged crafters to `status: PUBLISHED` so unpublished/removed crafters drop out automatically.

### D4 — Owner-scoped tagging via existing edit forms
Tag management lives in the studio/store dashboard edit flow, gated by the same `requireCreator` + ownership check those forms already use. The control is a multi-select of the owner's-city published crafters.
- **Why:** Reuses the established mutation-authorization path; no new admin surface.

### D5 — `CommunityComment` model + API route, self-contained moderation
Add a `CommunityComment` model (`id`, `author_user_id`, `body`, `status: VISIBLE|HIDDEN`, `report_count`, `created_at`). Posting is an `app/api/community-comments` route guarded by `requireUser` + `isSameOrigin` + `rateLimit(req, "community-comments")`, with Zod length validation (1–500 chars). Display orders by `created_at desc`, shows only `display_name` (neutral label otherwise) via the shared `lib/community-comments.ts` mapper, and filters `status: VISIBLE`.
- **Why:** Mirrors the flags route's exact guard stack; the `status` soft-delete preserves an audit trail and matches how listings are moderated.
- **Moderation wiring (revised during apply):** a member **report** increments `report_count` (`/api/community-comments/[id]/report`, `requireUser`); a dedicated admin queue at `/admin/community-comments` (gated by the admin layout) lists notes by `report_count desc` with hide (`DELETE` → `status = HIDDEN`) and restore (`PATCH`) actions.
- **Why not extend `Flag`:** the original plan threaded a `COMMENT` member through the global `FlagEntityType` **Postgres enum** + `lib/types` `ENTITY_TYPES` + the flags route's `entityExists` switch + comment-specific rendering in the existing admin queue. That is a high-blast-radius change (an enum `ALTER` plus edits to every flag consumer) for a row that isn't a listing. A self-contained `report_count` + status field satisfies every spec scenario (report → surfaces in an admin queue; admin remove → hidden) with no enum migration and no churn to unrelated flag code.
- **Alternative considered:** a standalone parallel report **table** — rejected as heavier than a counter; `report_count` + a soft-delete status is the minimum that meets the requirements.

## Risks / Trade-offs

- **Keyless map URL is unofficial** → Mitigation: address text + official "Open in Maps" link render independently; iframe failure never blocks the section (D1).
- **Comment spam / abuse** → Mitigation: auth required, same-origin enforced, `rateLimit` bucket, length cap, and `Flag`-based report→hide path (D5).
- **Email/PII leak in comments** (the exact bug just fixed in messaging) → Mitigation: select only `display_name`; never select or render `email`; covered by a spec scenario and a unit test asserting no email is returned.
- **`ENTITY_TYPES` is referenced widely** (flags route, types, admin queue) → Mitigation: adding a `COMMENT` member is additive; audit each `switch (type)` for exhaustiveness so the build fails loudly on any unhandled case.
- **Migration on prod (Neon)** → uses `db:push` + raw FK SQL like prior changes; all additive, so rollback = drop the new tables/column. No existing column is altered.

## Migration Plan

1. Add `StudioCrafter`, `StoreCrafter`, `CommunityComment` models + `Flag.community_comment_id` + `CommentStatus` enum to `prisma/schema.prisma`.
2. `bun run db:push` (dev) / apply as a raw migration on prod, consistent with prior changes.
3. Ship code behind graceful fallbacks — every surface works whether or not any rows exist, so deploy order is not load-bearing.
4. **Rollback:** drop the three tables + the nullable `Flag` column; no data backfill to unwind, no existing column changed.

## Open Questions

- Comment length cap and rate-limit window — propose 500 chars and the same bucket policy as `flags`; confirm during implementation against `lib/rate-limit.ts` defaults.
- Should tagged crafters be reciprocal (show the studio/store on the *crafter's* page too)? Out of scope for this change; the join tables make it a trivial follow-up if desired.
