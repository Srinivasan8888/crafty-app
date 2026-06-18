## 1. Schema & migration (shared foundation)

- [x] 1.1 Add `StudioCrafter` and `StoreCrafter` join models to `prisma/schema.prisma`, mirroring `DisciplineOnStudio`/`SupplyCategoryOnStore` (composite `@@id([studio_id, crafter_id])` / `@@id([store_id, crafter_id])`, `@@index` on `crafter_id`, `onDelete: Cascade` on both FKs)
- [x] 1.2 Add back-relations on `Studio`, `Store`, and `Crafter` for the two new join tables
- [x] 1.3 Add `CommunityComment` model (`id`, `author_user_id` → User, `body String`, `status CommentStatus @default(VISIBLE)`, `report_count`, `created_at`) and a `CommentStatus { VISIBLE HIDDEN }` enum
- [x] 1.4 ~~Flag FK~~ → self-contained moderation: `report_count` + `status HIDDEN` on `CommunityComment` (design D5 revised — avoids a global `FlagEntityType` enum ALTER; see design.md)
- [x] 1.5 Wrote idempotent `prisma/raw-migrations/0003_storefront_completeness.sql` + ran `prisma generate`. NOTE: `db push` against the live Neon DB is intentionally left for the owner to run (additive-only, zero-risk)

## 2. Event location map

- [x] 2.1 Added `venueMap()` helper returning `{src, href}` or null (treats empty/whitespace `venue_address` as "no address")
- [x] 2.2 Replaced the "Map embed coming soon" box with a keyless `<iframe ?output=embed>` plus an "Open in Google Maps" `api=1` link
- [x] 2.3 Address paragraph stays as the fallback when no usable address; iframe only renders when `venueMap()` is non-null
- [x] 2.4 "Map embed coming soon" string removed from the page

## 3. Studio ↔ crafter tagging

- [x] 3.1 `crafter_ids` added to studios POST + PATCH (`requireCreator` + owner check already in place); validates PUBLISHED crafters; persists via `tagged_crafters: { deleteMany, create }` (idempotent via composite PK + `new Set`)
- [x] 3.2 Crafter pill multi-select added to `StudioForm` (edit flow only); studio edit page loads city's published crafters + current tags
- [x] 3.3 `learn/[slug]` queries tagged crafters and prefers them over the city sample (shared select shape)
- [x] 3.4 "studio tagging coming soon" footnote removed (heading flips to "Crafters who teach here" when tagged)

## 4. Store ↔ crafter sourcing tags

- [x] 4.1 `crafter_ids` added to stores POST + PATCH; same validation + `tagged_crafters` persistence
- [x] 4.2 Crafter pill multi-select added to `StoreForm`; store edit page loads candidates + current tags
- [x] 4.3 `stores/[slug]` queries tagged crafters with the same non-empty-else-sample fallback
- [x] 4.4 "sourcing tags coming soon" footnote removed (heading flips to "Crafters sourced here" when tagged)

## 5. Community comments

- [x] 5.1 `app/api/community-comments/route.ts` POST: `requireUser` + `isSameOrigin` + `rateLimit(req, "community-comments")` + Zod (1–500 chars)
- [x] 5.2 `components/CommunityComments.tsx` composer + list; uses `lib/community-comments.ts` mapper (display_name / "Crafty member", never email); page query filters `status: VISIBLE`, `created_at desc`
- [x] 5.3 Mounted in `app/community/page.tsx`, replacing the `commentsTeaser` footer; optimistic insert + `router.refresh()`; route `revalidatePath("/community")`
- [x] 5.4 Report path `/[id]/report` (increments `report_count`); admin hide `DELETE` → `status HIDDEN`, restore `PATCH`; new `/admin/community-comments` queue + nav link
- [x] 5.5 ~~ENTITY_TYPES audit~~ N/A — self-contained moderation deliberately avoids touching the global `FlagEntityType`/`ENTITY_TYPES` surface (design D5 revised)
- [x] 5.6 Added comment i18n keys to all 4 locales (`en/hi/kn/ta`); `commentsTeaser` no longer referenced in code (unused key left in locale files)

## 6. Verification

- [x] 6.1 `tsc --noEmit` clean; `vitest run` green (57 passed, +4 new in `__tests__/lib/community-comments.test.ts` asserting no email is ever returned)
- [ ] 6.2 Manual: event with an address shows a working map + "Open in Maps"; an empty/placeholder-venue event shows the address block with no broken iframe
- [ ] 6.3 Manual: owner tags a crafter on a studio and a store → that crafter appears on the detail page; untagged listing still shows the city sample; non-owner cannot tag
- [ ] 6.4 Manual: signed-in member posts a comment (appears without full reload); signed-out visitor is prompted to sign in; oversize/empty rejected; rapid posts throttled; report → comment hides after admin remove
- [x] 6.5 Confirmed the three targeted footnotes are gone (map/studio/store); the separate "Course details coming soon" placeholder is intentionally out of scope
- [ ] 6.6 Apply the DB migration before runtime: `bun run db:push` (or apply `prisma/raw-migrations/0003_storefront_completeness.sql`) — intentionally left for the owner
