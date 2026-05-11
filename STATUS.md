# Crafty — Status snapshot

Quick handoff note. Read `README.md` for setup; this file is for "where are we right now."

## The PRD

The full V1 product requirements doc lives in [`PRD/Crafty-PRD-v1.md`](PRD/Crafty-PRD-v1.md). It's the source of truth for scope, data model, URLs, design system, and Day-90 success gates. Read it before touching anything structural.

## What's done

1. **All 4 entity types end-to-end (read path)** — Crafters, Stores, Studios (Learn), Events have listing + detail pages across all 6 cities (`/bengaluru`, `/mumbai`, `/chennai`, `/delhi`, `/hyderabad`, `/pune`). See the table in `README.md` for the full URL map.
2. **City-localized URL design + Postgres FTS search** — `/bengaluru/search?q=pottery` works, city-scoped, grouped by entity type. SlugRedirect table is wired from day one.
3. **Dashboard + crafter create wizard** — full multi-step create flow with image upload (server-proxied sharp pipeline → thumb/medium/full WebP) and on-demand `revalidatePath` after mutation. Saved list works across all 4 entity types.
4. **Admin moderation surfaces** — `/admin` (flag queue) and `/admin/listings` (all entities, all cities) are live. Auth is Clerk with a `DEV_AUTH=true` dev-stub that auto-logs you in as the admin user.

## What's pending / in corrections

- **Create flows for Store / Studio / Events are stubbed** — only the crafter create wizard is end-to-end. Shells exist at `/dashboard/store/new`, `/dashboard/studio/new`, `/dashboard/events/new`.
- **Admin sub-pages are router shells only** — `/admin/users`, `/admin/cities`, `/admin/categories`, `/admin/export`.
- **Typography is out of compliance** (T1 in `TODOS.md`) — `tailwind.config.ts` still ships `system-ui` as the font stack. PRD §17.2 forbids this. Blocked on font license decision (Open Q I in the PRD).
- **Design Day-90 metrics not wired** (T5) — PRD §16.2 event list (`session_start`, `profile_view`, `profile_completed`, `signup_started/completed` with UTM tags) needs PostHog wiring. These can't be backfilled, so wiring before launch matters.
- **Working-tree corrections in progress** — a UI/UX cleanup pass is in flight across `app/[city]/page.tsx`, search tabs, store detail page, saved page, and `CrafterForm`. See `TODOS.md` for the full list (T1–T7) of design-review items.

Full backlog with priorities and dependencies is in [`TODOS.md`](TODOS.md). T1 + T5 + T7 are launch-blockers; T2–T4 + T6 are valuable but not gating.

## Quick start

```bash
bun install
bun run db:push
psql "$DATABASE_URL" -f prisma/raw-migrations/0001_fts_and_constraints.sql
bun run db:seed
bun run dev
```

Then open http://localhost:3000 → redirects to `/bengaluru`.

You'll need Postgres on `localhost:5432` with a `crafty_dev` database. Copy `.env.example` to `.env` and fill in the values — `DEV_AUTH=true` lets you skip Clerk locally.
