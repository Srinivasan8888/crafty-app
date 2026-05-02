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
| Sign in / Sign up | `/sign-in`, `/sign-up` | Clerk catch-all (only used when DEV_AUTH=false). |
| 404 / error | any non-existent path | Branded error pages. |

## What's stubbed (next pass)

These have shells but not the full create flow yet — per our scope agreement of "all four entity types, shallow":

- `/dashboard/store/new`
- `/dashboard/studio/new`
- `/dashboard/events/new`
- `/admin/users`, `/admin/cities`, `/admin/categories`, `/admin/export` (router shells only)

## Auth modes

`.env` has `NEXT_PUBLIC_DEV_AUTH=true` by default. In this mode you're auto-logged-in
as `pavithran7777@gmail.com` (admin), so you can browse the dashboard and admin without
signing up. Flip to `false` and Clerk takes over.

## Decisions baked into this build

1. URL: city-in-path (`/bengaluru/crafters`)
2. Event organizer: 3 nullable FKs + Postgres CHECK constraint
3. Image pipeline: server-proxied with sharp generating thumb/medium/full WebP
4. Lifecycle: `status` enum + `deleted_at` + `hidden_by_user_id`
5. SlugRedirect table from day one
6. Backups: rely on Replit-managed (per your call)
7. Auth: lazy upsert by clerk_id on first authed request
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
