## Why

Four user-visible features on the public storefront still render hardcoded "coming soon" placeholders instead of working functionality. They ship to real visitors today and read as half-built:

- Event detail pages show a grey box that says *"Map embed coming soon"* instead of a map ([events/[slug]/page.tsx:484](../../../app/[city]/events/[slug]/page.tsx#L484)).
- Studio (Learn) and Store detail pages list a generic city-wide crafter sample under a footnote *"studio/sourcing tagging coming soon"* — there is no way to tag the crafters who actually teach at a studio or are stocked by a store ([learn/[slug]/page.tsx:544](../../../app/[city]/learn/[slug]/page.tsx#L544), [stores/[slug]/page.tsx:438](../../../app/[city]/stores/[slug]/page.tsx#L438)).
- The Community page ends with an italic teaser *"comments coming in V3.1"* and is fully read-only ([community/page.tsx:194](../../../app/community/page.tsx#L194)).

These are the last visible incompleteness markers in the public product. Closing them removes the "unfinished" signal from the storefront without expanding scope.

## What Changes

- **Event location map.** Replace the placeholder box with a real, keyless map embed driven by the event's existing `venue_name` / `venue_address`, plus an "Open in Google Maps" link. Degrades gracefully to the address-only block when no address is set (seed/empty rows, placeholder venues).
- **Studio ↔ crafter tagging.** Add a many-to-many relation so a studio owner can tag the crafters who teach there; the studio detail page lists *those* crafters (falling back to the city sample only when none are tagged). Remove the "coming soon" footnote.
- **Store ↔ crafter sourcing tags.** Same pattern: a store owner tags the crafters it stocks/sources; the store detail page surfaces them. Remove the "coming soon" footnote.
- **Community comments.** Add a lightweight, moderatable comment thread to the Community page so signed-in members can post and read short notes. Comments are reportable/removable through the existing moderation surface. Replace the read-only teaser.

No breaking changes — all four are additive. Existing pages keep working if a creator never tags anyone or an event has no address.

## Capabilities

### New Capabilities
- `event-location-map`: render a keyless map embed (and external maps link) on event detail pages from the event's venue address, with graceful fallback when no usable address exists.
- `listing-cross-references`: owner-managed many-to-many tagging of crafters to studios ("teaches here") and stores ("sourced here"), surfaced on the respective detail pages with a city-sample fallback.
- `community-comments`: signed-in members can post and view short comments on the Community page; comments are moderatable (reportable + admin-removable) and never expose private contact info.

### Modified Capabilities
<!-- None — these are net-new behaviors. `community-spotlight`, `studio-discovery-filters`, and `event-rsvp-reminders` are adjacent but their existing requirements are unchanged. -->

## Impact

- **Schema / migration**: new join tables `StudioCrafter` and `StoreCrafter` (mirroring the existing `*OnCrafter`/`*OnStore` join-table pattern), and a `CommunityComment` model. Prisma `db:push` + raw FK constraints; no changes to existing columns.
- **Public pages**: [app/[city]/events/[slug]/page.tsx](../../../app/[city]/events/[slug]/page.tsx), [app/[city]/learn/[slug]/page.tsx](../../../app/[city]/learn/[slug]/page.tsx), [app/[city]/stores/[slug]/page.tsx](../../../app/[city]/stores/[slug]/page.tsx), [app/community/page.tsx](../../../app/community/page.tsx).
- **Dashboard edit flows**: studio + store edit forms gain a crafter-tagging control (owner-scoped, `requireCreator`).
- **API / actions**: a comment-create server action or `app/api/community-comments` route (`requireUser`, rate-limited), and report wiring into the existing `Flag` moderation queue.
- **i18n**: new message keys for the comment composer, map labels, and tagging UI.
- **No new third-party credentials** — the map embed uses Google Maps' keyless `?q=&output=embed` URL, consistent with the app's "no-op cleanly without creds" philosophy.
