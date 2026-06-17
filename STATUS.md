# Crafty — Status snapshot

Quick handoff note. Read `README.md` for setup; this file is for "where are we right now."

## Production status (updated 2026-06-16)

- **Stack**: Vercel (hosting) + Descope (auth) + Neon (Postgres). The old PRD assumed Replit/Clerk — that swap is done; ignore stale Replit/Clerk references below.
- **Deployed & live**: production builds and serves on Vercel (`crafty-app-five.vercel.app`); root → `/bengaluru`, sign-in renders the Descope flow. Preview deploys are env-seeded for the `demo-launch-pass` branch.
- **Auth**: sign-in/sign-up use Descope's combined `sign-up-or-in` flow so first-time Google/email users are created (previously the sign-in-only flow rejected new users with `E062108`).
- **Credentials**: real values are set in the Vercel **Production** environment (Descope, Upstash, Resend, Sentry, PostHog, `CRON_SECRET`, `DATABASE_URL`); `DEV_AUTH=false` in prod. Local `.env` carries real Descope + Neon.
- **Scope note (PRD)**: the build is well past PRD V1 — payments, messaging, recurring events, i18n, recommendations, PWA, and a mobile scaffold all already exist. "Production-ready" here means *operational hardening*, not new features.

This file is for "where are we right now."

## The PRD

The full V1 product requirements doc lives in [`PRD/Crafty-PRD-v1.md`](PRD/Crafty-PRD-v1.md). It's the source of truth for scope, data model, URLs, design system, and Day-90 success gates. Read it before touching anything structural.

## What's done

1. **All 4 entity types end-to-end (read + write path)** — Crafters, Stores, Studios (Learn), Events have listing + detail pages across all 6 cities, AND create wizards at `/dashboard/{crafter,store,studio,events}/new` that submit, validate, upload images, enforce 1-per-type cap, ownership-check (events), and `revalidatePath` on success.
2. **City-localized URL design + Postgres FTS search** — `/bengaluru/search?q=pottery` works, city-scoped, grouped by entity type. SlugRedirect table is wired from day one.
3. **Role-based auth (PRD §12)** — `UserRole` enum on User (`VISITOR | CREATOR | ADMIN`); buyer flow signs in implicitly on heart/save; seller flow goes through `/list-your-profile` interstitial that sets a signup-intent cookie + promotes new accounts to `CREATOR`. `requireCreator()` gates all mutation routes; `requireAdmin()` gates `/admin/*`.
4. **T1 typography (closed)** — Inter (body) + Fraunces (display) via `next/font/google`; all non-terminal `system-ui` fallbacks removed.
5. **T7 SiC admin (closed)** — `SIC_ADMIN_EMAIL` env var + 2nd `ADMIN` row seeded. Operations runbook at [docs/operations.md](docs/operations.md) covering moderation SLAs, curator quotas, weekly cadence, takedown authority.
6. **T5 PostHog + Day-90 metrics (closed)** — `session_start`, `signup_started`, `signup_completed`, `profile_view`, `profile_completed` events fire client-side with first-touch UTM. `/admin/metrics` shows live DB-derived gates (self-serve count, activation %, content tallies, signup windows, pending flags). Engagement gates populate once you set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or `NEXT_PUBLIC_POSTHOG_KEY` to a real project key.
7. **Admin moderation** — `/admin/flags` queue and `/admin/listings` data view are live.

## What's pending

- **Real third-party credentials**: `RESEND_API_KEY`, `NEXT_PUBLIC_DESCOPE_PROJECT_ID` + `DESCOPE_MANAGEMENT_KEY` + `DESCOPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` or `NEXT_PUBLIC_POSTHOG_KEY`, `UPSTASH_REDIS_REST_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `CRON_SECRET`, `STORAGE_DRIVER` + `STORAGE_S3_*` (when ready for object storage). All currently placeholders; every code path no-ops cleanly until set.
- **Descope dashboard config** — `bun --env-file=.env run descope:setup` creates/updates the `crafty-default-user` JWT template with `email` and `name` claims. Still manual in Descope Console: select that template as the User JWT Token Format, create the Audit Webhook connector, and style the Flow Editor.
- **Cron schedules** — 8 endpoints now need a scheduler: `/api/cron/event-reminders` (hourly), `/api/cron/saved-search-alerts` (daily), `/api/cron/message-digest` (daily), `/api/cron/expire-featured` (daily), `/api/cron/for-you-digest` (weekly Sun), `/api/cron/materialize-recurring-events` (daily), `/api/cron/lifecycle-emails` (daily), `/api/cron/warehouse-sync` (daily). All bearer-auth via `CRON_SECRET`.
- **V3 Tier 4 infra creds** — `REDIS_URL` (BullMQ queue flip), `ANTHROPIC_API_KEY` (AI moderation), `ADMIN_EMAIL` (claim queue notifications) — all placeholders, no-op cleanly.
- **Razorpay setup**: create account at https://razorpay.com, paste test keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) into `.env`, configure webhook → `/api/webhooks/razorpay` with `RAZORPAY_WEBHOOK_SECRET`. For V3 subscriptions, also create Razorpay Plans for monthly (₹299) and annual (₹2999) tiers and paste IDs as `RAZORPAY_PLAN_MONTHLY` / `RAZORPAY_PLAN_ANNUAL`.
- **Pluggable storage** — `lib/storage.ts` supports `local` (dev), `s3`, and `blob` (Vercel Blob) drivers. **Production uses Vercel Blob** — `@vercel/blob` is installed, `BLOB_READ_WRITE_TOKEN` is set in all Vercel environments, and `*.public.blob.vercel-storage.com` is whitelisted in `next.config`. Activate with `STORAGE_DRIVER=blob` (no extra bucket/keys). Verify: `STORAGE_DRIVER=blob bunx tsx --env-file=.env scripts/check-storage.ts`. (The `s3`/R2 path still exists as an alternative but needs `bun add @aws-sdk/client-s3` + `STORAGE_S3_*`.)
- **DB connection pooling** — Prisma `datasource` now has `directUrl` (migrations) alongside `url` (runtime). On Vercel/Neon, point `DATABASE_URL` at Neon's **pooled** endpoint (`-pooler` host, `?pgbouncer=true&connection_limit=1`) and set `DIRECT_URL` to the non-pooled endpoint.
- **Brand mark / logo icon** (PRD §17.3) and real commissioned photography (PRD §28.2 J) — founder/designer work.

V1.0 launch-blockers (T1, T5, T7) closed 2026-05-23. V1.0 polish + V1.5 scope (CityRequest, IP geo, per-city CommunityMoment, walkthrough, contrast guard) also shipped 2026-05-23. See `TODOS.md` for the full closed-out backlog.

## Quick start

```bash
bun install
bun run db:push
psql "$DATABASE_URL" -f prisma/raw-migrations/0001_fts_and_constraints.sql
bun run db:seed
bun run dev
```

Then open http://localhost:3000 → redirects to `/bengaluru`.

You'll need Postgres on `localhost:5432` with a `crafty_dev` database. Copy `.env.example` to `.env` and fill in the values — `DEV_AUTH=true` lets you skip Descope locally.
