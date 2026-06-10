# Crafty — V1 dev build

City-localized discovery platform for India's craft community. Built per the V1 PRD
plus the 16 plan-eng-review decisions (URL design, lifecycle status, 3-FK Event,
SlugRedirect, lazy upsert, drop @unique on owners, FTS triggers, server-proxied
sharp pipeline, on-demand revalidate, public-read images, etc.).

## Run it

Postgres must be running on `localhost:5432` with database `crafty_dev` (already created).

```bash
bun install         # already done
bun run db:push     # already applied
psql "$DATABASE_URL" -f prisma/raw-migrations/0001_fts_and_constraints.sql   # already applied
bun run db:seed     # already run
bun run dev
```

Then open http://localhost:3000 → redirects to `/bengaluru`.

## What's working

| Surface | URL | Notes |
|---|---|---|
| City homepage | `/bengaluru`, `/mumbai`, `/chennai`, `/delhi`, `/hyderabad`, `/pune` | All 4 discovery rails + city selector + hero. Empty cities show empty states. |
| Crafters listing | `/bengaluru/crafters` | Grid + category filter chips. |
| Crafter detail | `/bengaluru/crafters/aisha-crochet` | Hero, contact CTAs, portfolio, bio, upcoming events, cross-listing. |
| Stores listing + detail | `/bengaluru/stores`, `/bengaluru/stores/krishnan-yarns` | Supply category filter; claim notice on unclaimed listings. |
| Learn (studios) listing + detail | `/bengaluru/learn`, `/bengaluru/learn/anjali-s-pottery-studio` | Discipline filter, age-group badge. |
| Events listing + detail | `/bengaluru/events`, `/bengaluru/events/sunday-cubbon-crochet-meetup` | Type filter, register CTA, organizer link-back. |
| Search | `/bengaluru/search?q=pottery` | Postgres FTS, city-scoped, grouped by entity type. |
| Dashboard | `/dashboard` | Stats + listings overview. Sidebar nav. |
| Crafter create flow | `/dashboard/crafter/new` | Full multi-step wizard with image upload + revalidate-on-publish. |
| Saved | `/dashboard/saved` | Heart/save list across all 4 entity types. |
| Admin: flags | `/admin` | Moderation queue. |
| Admin: listings | `/admin/listings` | All entities, all cities. |
| Sign in / Sign up | `/sign-in`, `/sign-up` | Descope flow components (only used when DEV_AUTH=false). |
| 404 / error | any non-existent path | Branded error pages. |

## What shipped 2026-05-23 (since the original README)

- **All 4 create flows end-to-end** — `/dashboard/{crafter,store,studio,events}/new` all submit, validate, upload images, and `revalidatePath` on success.
- **All 4 PATCH/DELETE routes** — `/api/{crafter,store,studio,event}/[id]` with ownership/admin gating, soft-delete via `status=DELETED`, and **SlugRedirect writes on rename** (old URLs auto-redirect via meta-refresh in dev / 307 in prod).
- **Role-based auth** (PRD §12) — `UserRole` enum on User (`VISITOR | CREATOR | ADMIN`); `requireCreator()` gates mutation routes; `/list-your-profile` server action promotes signups via a signup-intent cookie.
- **Typography fix (T1)** — Inter + Fraunces via `next/font/google`; all `system-ui` in non-terminal positions removed.
- **SiC admin seeded (T7)** — `SIC_ADMIN_EMAIL` env var + 2nd `ADMIN` row in seed. Ops runbook at [docs/operations.md](docs/operations.md).
- **PostHog + Day-90 metrics (T5)** — `session_start`, `signup_started`, `signup_completed`, `profile_view`, `profile_completed` events firing. Lazy-loaded post-LCP. `/admin/metrics` shows live DB-derived gates; engagement gates populate once you set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or `NEXT_PUBLIC_POSTHOG_KEY`.
- **SEO foundation** — `app/sitemap.ts` (DB-driven), `app/robots.ts`, JSON-LD schema.org markup (`LocalBusiness` / `Store` / `EducationalOrganization` / `Event`) on the 4 detail pages, `generateMetadata()` + canonical URLs on the 4 listing pages.
- **Transactional email (PRD §15)** — Resend wired via `lib/email.ts`. Welcome email fires on first signup (in lazy upsert); listing-live email fires after each entity create. No-ops cleanly until `RESEND_API_KEY` is set.
- **Descope webhook** at `/api/webhooks/descope` — HMAC-SHA256 verification against `x-descope-webhook-s256` header + `User Created/Modified/Deleted` audit handlers. 503s until `DESCOPE_WEBHOOK_SECRET` is set.

## Shipped 2026-05-23 (V1 close + V1.5 start)

**V1 close — Tier 1 defer-list cleared:**
- **Blurhash** — sharp pipeline generates a base64 data URL on upload; stored in `*_blurhash` columns on Crafter / Store / Studio / Event; CrafterCard renders with `placeholder="blur"`. CLS-shift gone.
- **Transfer-ownership** (PRD §8.7) — admin inline form on `/admin/listings` unclaimed rows; creates/finds the owner User, sets `owner_user_id`, sends claim-confirm email, flips `is_claimed=true`.
- **`/admin/listings` row actions** — Feature/Unfeature, Hide, Restore, Delete (soft), Transfer — all wired via server actions.
- **Event-reminder T-24h cron** — `GET /api/cron/event-reminders?token=…` finds events starting in the next 24-26h and sends reminders. `CRON_SECRET` env var; idempotent via `reminder_sent_at`.
- **9 E2E flows** — homepage smoke, axe-core a11y, list-your-profile, creator-flow, search query, search empty, city-switch, save-toggle, pre-existing smoke. All passing.

**V3.0 Tier 2-4 shipped 2026-05-27** (built in parallel via 3 subagents):

- **Multi-language (i18n)** — `next-intl` cookie-based locale. EN / Hindi / Tamil / Kannada strings for nav, hero, dashboard, common CTAs. `<LocaleSwitcher>` in AppHeader. `messages/{en,hi,ta,kn}.json` source files.
- **PWA** — `public/manifest.webmanifest`, hand-written `public/sw.js` (precache shell + runtime SWR/CacheFirst/NetworkFirst by route, personal/mutating routes excluded), `<InstallPrompt>` component, `/offline` fallback page.
- **Community page** — `/community` shows per-city CommunityMoment timeline + Crafter-of-the-week (most saves in 7d) + ambient signal feed. Comments deferred to V3.1.
- **Cross-city search** — `/[city]/search?cities=bengaluru,mumbai,pune` runs FTS across multiple cities, groups results by city. New multi-select `<CitySelectorMulti>` popover.
- **Open Read API** — `/api/public/v1/{crafters,stores,studios,events}` (list + detail) with `Bearer crafty_<32hex>` auth + per-key rate limit + scope check + public-safe field projection. 5-min stale-while-revalidate cache. API key CRUD at `/dashboard/api-keys` + admin view at `/admin/api-keys`. One-time secret reveal on create.
- **Reviews enrichment** — photos (up to 4 per review via `review-photos` upload folder), verified-purchase badge (when reviewer has a PAID Order from the listing's owner), creator response thread with admin-hide moderation.
- **Recurring events** — `Event.recurrence_rule` accepts an RFC 5545 RRULE subset (FREQ + BYDAY + COUNT + UNTIL). Daily `/api/cron/materialize-recurring-events` expands the next 4 occurrences. `/[city]/events/[slug]/ics` emits a VCALENDAR for the series.
- **Self-serve claim flow** — public `<ClaimRequestForm>` on unclaimed Crafter/Store/Studio pages → `ClaimRequest` row → admin queue at `/admin/claim-requests` with approve (auto-transfers ownership, promotes VISITOR→CREATOR) / reject / withdraw.
- **Background job queue (scaffold)** — `lib/queue.ts` exports `enqueue()` + `registerHandler()`. Inline mode by default; flip on by setting `REDIS_URL` + `bun add bullmq`. `/admin/queue` diagnostic page.
- **AI moderation** — `lib/ai-moderation.ts` → Claude API (`claude-opus-4-7`). POST `/api/admin/flags/[id]/triage` returns `{verdict, confidence, reasoning}` + AuditLog write. AI-Triage button on `/admin` flag queue.
- **Marketing automation** — `/api/cron/lifecycle-emails` (daily) finds lapsed creators / inactive buyers / cold signups → targeted re-engagement emails. Capped at 100 per run.
- **Analytics warehouse (scaffold)** — `/api/cron/warehouse-sync` (daily) streams 17 tables to `var/warehouse/<date>/<Table>.jsonl`. PII stripped. BigQuery upload step is V3.1.
- **Native mobile** — `mobile/README.md` documents the Expo SDK 51 scaffold path. Not built; PWA covers ~80% of the need today.

**V3.0 Tier 1 shipped 2026-05-27** (built in parallel via 3 subagents):

- **On-platform commerce** — full marketplace MVP. New models: `Product`, `CartItem`, `Order`, `OrderItem`, `Payout`. Routes: `/api/{products,cart,orders}/**`, `/api/orders/[id]/fulfill`. Dashboard surfaces: `/dashboard/{products,cart,orders,sales}`. Components: `ProductCard`, `ProductForm`, `AddToCartButton`, `CheckoutButton`. 10% commission, GST invoice numbers (`CRA-YYYY-NNNN`), multi-seller cart with per-seller `Payout` rows, inventory tracking (`-1` = made-to-order), shipping address capture, `cannot_buy_own_product` guard. Razorpay webhook extended for `Order` payment.captured.
- **Crafty Pro subscription** — `Subscription` model + `SubscriptionTier` enum (`FREE` / `PRO`) on User. Two plans (₹299/mo, ₹2999/yr). Razorpay Subscriptions API in `lib/razorpay.ts`. Feature gates: `getMaxPortfolioPhotos()` (6 → 12), `getMaxProducts()` (5 → 25), `getPriorityBoost()` for ranking. Pro pill on cards (`Cards.tsx`) + on detail pages. Dashboard page at `/dashboard/subscription` with comparison table + upgrade/cancel flow. Webhook extended for `subscription.activated/charged/cancelled/completed/halted`. `lib/subscription-gates.ts` + `lib/subscription-plans.ts`.
- **Smart alerts (co-save signals)** — `lib/recommendations.ts` with raw-SQL co-occurrence queries (`getCoSaves()`, `getForYou()`). No ML, no embeddings, no new schema. `CoSaveRecommendations` mounted on all 4 entity detail pages ("People who saved this also saved…"). `ForYouSection` on `/dashboard`. `/api/cron/for-you-digest` weekly email digest (Sunday 10am IST). 15-min stale-while-revalidate cache on `/api/recommendations/co-saves`.

**V2.0 shipped 2026-05-24:**

- **In-app messaging** — `Conversation` + `Message` schema, `<MessageButton>` on the 3 owner-able detail pages (crafter / store / studio), `/dashboard/messages` inbox (sorted by last_message_at, unread badges), `/dashboard/messages/[id]` thread with sticky reply composer. Daily `/api/cron/message-digest` summarizes unread for offline users.
- **Reviews** — `Review` schema with one-per-(author, entity) unique constraint, `POST/DELETE/PATCH /api/reviews` (PATCH is admin-only for hide/unhide), `<ReviewSection>` rendered server-side on the 3 detail pages with 5-star widget + edit-your-own-review flow.
- **Featured-listing payments (Razorpay)** — `FeatureOrder` ledger, [lib/razorpay.ts](lib/razorpay.ts) (Order creation + HMAC-SHA256 webhook verification), 3 tiers (₹500/7d, ₹1,500/30d, ₹3,500/90d), `<FeatureListingButton>` on all 4 dashboard edit pages (loads Razorpay Checkout JS on click — zero bundle weight by default), `/api/webhooks/razorpay` flips `is_featured=true` on `payment.captured`, daily `/api/cron/expire-featured` flips it back when the window ends.
- All three no-op cleanly when their respective env vars are still placeholder.

**Post-V1.5 shipped 2026-05-24:**
- **Audit log** — `lib/audit.ts` helper + writes from all admin actions (users, listings, transfer-ownership) + `/admin/audit-log` page with actor/action/entity filters and pagination.
- **`bun --env-file=.env run descope:setup`** — one-shot script (`scripts/descope-setup.ts`) automating Descope's Phase 0 JWT template work: user-session claims (`email`, `name`). Idempotent. Audit Webhook connector creation is now a manual Console step because Descope no longer exposes the old connector Management API path.
- **Bundle analyzer** — `bun run bundle:analyze` opens an interactive bundle map. Wrapped via `@next/bundle-analyzer`.
- **Pluggable storage backend** — `lib/storage.ts` with `local` (default) and `s3` (Replit Object Storage / Cloudflare R2 / AWS S3) drivers. Switch via `STORAGE_DRIVER=s3` + `STORAGE_S3_*` env vars. SDK lazy-imported only when active.
- **Production deployment checklist** — new section in README covering Descope, Upstash, Object Storage, pgbouncer, Cron, Email, Analytics, bundle health.
- **V2.0 — Saved-search alerts** — `SavedSearch` model + `POST/DELETE /api/saved-searches` + "Notify me of new matches" button on `/[city]/search` + `/dashboard/saved-searches` management page + daily cron `/api/cron/saved-search-alerts` that emails buyers when new matches appear.

**V1.5 start:**
- **`CityRequest` model + `/api/city-requests` POST + `/admin/city-requests` queue** — buyers can request their unsupported city; admin sees a sorted-by-demand list.
- **IP geo helper** (`lib/geo.ts`) reads Vercel/Cloudflare headers; `RequestCityBanner` shows when geo suggests India but no city pill matches.
- **"Add my city" pill** in `CitySelector` jumps to the request banner.
- **CommunityMoment per-city DB** — `City.community_moment` JSON column with admin editor in `/admin/cities`. Falls back to generic when null.
- **Creator walkthrough** — `CreatorWalkthrough` floating tooltip on `/dashboard/*` with 3 hint steps. localStorage flag prevents re-show. Zero external deps.
- **Contrast guard test** — `__tests__/contrast.test.ts` parses tokens from `globals.css` and asserts WCAG AA pairs from PRD §22.4. 6/6 passing.

**Edit/Delete UI** — `/dashboard/{crafter,store,studio}` are edit pages; `/dashboard/events` lists with edit/delete; `/dashboard/events/[id]/edit` for events. `DeleteListingButton` with confirmation modal calls the DELETE endpoint.
- **All 4 admin sub-pages** — `/admin/users` (search + promote/demote + ban via server actions), `/admin/cities` (toggle is_active + reorder), `/admin/categories` (tabbed craft/supply/discipline), `/admin/export` (CSV streams via `/api/admin/export?bucket=...`).
- **Form draft auto-save** — `useFormDraft` hook + DraftBanner wired into all 4 create/edit forms. Auto-saves every 1.5s; restore prompt on next visit; cleared on submit.
- **CommunityMoment** — full-bleed editorial section on the homepage between rails 2 and 3 (PRD §7.1).
- **Cookie consent + DPDP** — banner gates PostHog initialization; `/api/users/me/export` streams a full user-data snapshot for DPDP compliance.
- **Sentry** — `instrumentation.ts` + client config; no-ops on placeholder DSN.
- **framer-motion** — `AnimatedList` wrapper available for list-reorder animations (PRD §17.7 pattern 2). Reduced-motion honored.
- **Playwright + axe-core E2E** — 9 test cases in `e2e/`, run across Chromium + Mobile Safari (18 project runs) including a11y audit. Run with `bun run test:e2e`.

## What's still external / stubbed for production

- **Real third-party credentials** — all placeholders no-op cleanly: paste your keys for `RESEND_API_KEY`, `NEXT_PUBLIC_DESCOPE_PROJECT_ID` + `DESCOPE_MANAGEMENT_KEY` + `DESCOPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or `NEXT_PUBLIC_POSTHOG_KEY`, `UPSTASH_REDIS_REST_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `CRON_SECRET`, and the Razorpay keys.
- **Production cron schedules** — 8 route handlers exist; production still needs platform cron entries with `Authorization: Bearer $CRON_SECRET`.
- **Production object storage** — local uploads work; prod should flip `STORAGE_DRIVER=s3` and set the `STORAGE_S3_*` env vars.
- **Optional V3.1 integrations** — `REDIS_URL` for BullMQ worker mode, `ANTHROPIC_API_KEY` for AI moderation, and the BigQuery/S3 warehouse upload step.

## Auth modes

`.env` has `DEV_AUTH=true` by default. In this mode you're auto-logged-in
as `pavithran7777@gmail.com` (role `ADMIN`), so you can browse the dashboard and admin
without signing up. Flip to `false` and Descope takes over.

### Descope setup (Phase 0, founder work)

Migrated from Clerk → Descope on 2026-05-24. To enable real auth in prod:

1. Create a project at https://www.descope.com/sign-up (free tier, 7,500 MAU).
2. **Project Settings → Custom Claims**: add `email` and `name` as JWT custom claims. Without this every server-side auth check needs an extra round-trip.
3. **Flow Editor**: customize `sign-in` and `sign-up` flows (colors, OAuth providers — Google + email magic link is the minimum). Replaces what was `lib/clerkAppearance.ts` previously.
4. **Connectors → Audit Webhook**: URL `https://<your-domain>/api/webhooks/descope`, filter events to `User Created` / `User Modified` / `User Deleted`, set a shared secret.
5. Paste the Project ID, Management Key, and Webhook Secret into `.env` (the three `DESCOPE_*` placeholders).

## Decisions baked into this build

1. URL: city-in-path (`/bengaluru/crafters`)
2. Event organizer: 3 nullable FKs + Postgres CHECK constraint
3. Image pipeline: server-proxied with sharp generating thumb/medium/full WebP
4. Lifecycle: `status` enum + `deleted_at` + `hidden_by_user_id`
5. SlugRedirect table from day one
6. Backups: rely on Replit-managed (per your call)
7. Auth: lazy upsert by descope_id on first authed request (migrated from clerk_id 2026-05-24)
8. Listing cap: dropped `@unique` on owner; enforced in app code
9. Search: FTS triggers cover parent + join tables + category renames
10. Products: dropped from V1; portfolio gallery is enough
11. Tests: scaffolded for Vitest + Playwright (next pass)
12. Analytics: lazy-loaded post-LCP (not yet wired in this build)
13. Image URLs: public (no signing)
14. ISR: 60s safety net + on-demand `revalidatePath` after mutation
15. Pre-launch TODOs: Replit Object Storage public-read spike + pgbouncer config
16. (Hosting locked to Replit, not re-litigated)

## Gotchas in dev

- Images use Unsplash placeholders for seeded data. Real uploads go to `public/uploads/`.
- The dev-stub user IS admin in dev mode. Flip `DEV_USER_EMAIL` if you want a non-admin local user.
- `bun run db:reset && bun run db:seed` to wipe and reseed.
- After `db:reset`, re-run `psql "$DATABASE_URL" -f prisma/raw-migrations/0001_fts_and_constraints.sql` because the raw triggers don't go through Prisma migrate.

## Production deployment checklist

Before flipping `DEV_AUTH=false` and pointing real users at the deploy:

### 1. Auth (Descope)
- Run the setup script: `bun --env-file=.env run descope:setup` (with `DESCOPE_MANAGEMENT_KEY` + `NEXT_PUBLIC_DESCOPE_PROJECT_ID` + `DESCOPE_WEBHOOK_SECRET` set). It creates/updates the `crafty-default-user` JWT template with `email` and `name` claims.
- In Descope Console, set **Project Settings → Session Management → User JWT Token Format** to `crafty-default-user` if it is not already active.
- In Descope Console, create the **Audit Webhook** connector manually: URL `https://<your-domain>/api/webhooks/descope`, filter actions `User Created`, `User Modified`, `User Deleted`, and set the HMAC secret to `DESCOPE_WEBHOOK_SECRET`.
- The Flow Editor styling remains manual visual work.
- Paste real values into `.env`: `NEXT_PUBLIC_DESCOPE_PROJECT_ID`, `DESCOPE_MANAGEMENT_KEY`, `DESCOPE_WEBHOOK_SECRET`.

### 2. Rate limiting (Upstash)
- Create a free database at https://upstash.com (Redis, regional, eviction off).
- Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` into `.env`. Until set, `/api/*` mutation routes fail-closed on rate-limit checks.

### 3. Object storage (Replit / R2)
- Pick a backend (Replit Object Storage, Cloudflare R2, AWS S3 — all S3-compatible).
- Set `STORAGE_DRIVER=s3` plus the `STORAGE_S3_*` env vars (see `.env.example`).
- `bun add @aws-sdk/client-s3` (the SDK is lazy-imported only when the s3 driver is active).
- Ensure the bucket is publicly readable (PRD Decision #13 — public image URLs, no signing).

### 4. Database (pgbouncer for Postgres pool)
- Replit's serverless model can exhaust the default Postgres connection pool under load. Front your database with **pgbouncer** in transaction-pool mode.
- For Prisma compatibility add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.
- See [Prisma's pgbouncer guide](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer).

### 5. Cron
- Set `CRON_SECRET` to a strong random string.
- Configure Replit Cron / Vercel Cron / GitHub Actions to hit each endpoint with `Authorization: Bearer $CRON_SECRET`.
- Current cron routes:
  - `/api/cron/event-reminders` — hourly.
  - `/api/cron/saved-search-alerts` — daily.
  - `/api/cron/message-digest` — daily.
  - `/api/cron/expire-featured` — daily.
  - `/api/cron/materialize-recurring-events` — daily.
  - `/api/cron/lifecycle-emails` — daily at `0 11 * * *` (4:30pm IST).
  - `/api/cron/warehouse-sync` — nightly at `0 19 * * *`; V3.1 will upload to BigQuery / S3.
  - `/api/cron/for-you-digest` — weekly Sunday around 10:00 IST.

### 5b. Background job queue (V3 Tier 4 — scaffold, prod-ready flip)
- Dev default is **inline mode**: `enqueue()` runs the registered handler immediately in-process. Confirm at `/api/admin/queue`.
- To enable real background processing when traffic warrants it:
  1. Provision Redis (Upstash Redis, Railway Redis, or self-hosted Redis 6+).
  2. Set `REDIS_URL=<your-redis-url>` in `.env`.
  3. `bun add bullmq` — the dependency is intentionally NOT in `package.json` so dev builds stay light.
  4. Stand up a worker process that imports `lib/queue-bootstrap.ts` and runs a BullMQ `Worker` against `crafty:<jobname>` queues.
- The `/api/admin/queue` page shows current mode + the registered handler names.

### 6. Email (Resend)
- Sign up at https://resend.com, verify your sending domain.
- Set `RESEND_API_KEY` and `RESEND_FROM` in `.env`. Until set, every `sendEmail()` call no-ops + logs to console.

### 7. Analytics (PostHog) + Errors (Sentry)
- PostHog free tier at https://posthog.com — paste `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or `NEXT_PUBLIC_POSTHOG_KEY`, and set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` for the EU region.
- Sentry free tier at https://sentry.io — paste `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`.
- Both no-op cleanly on placeholders.

### 8. Bundle health
- Before each release: `bun run bundle:analyze` opens an interactive bundle map.
- Target: keep landing page JS < 250KB gzipped. The lazy-loaded chunks (PostHog, Descope flows, framer-motion) are excluded from the initial bundle by design.

### 9. Sanity smoke after deploy
- `curl -L https://your-domain/ ` → 200 (redirects to `/bengaluru`).
- `curl https://your-domain/sitemap.xml | head` → real XML.
- `curl -X POST https://your-domain/api/webhooks/descope -d '{}'` → 401 (not 503 — proves the secret is set; 401 because no signature).
