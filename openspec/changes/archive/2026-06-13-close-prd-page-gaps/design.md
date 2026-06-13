## Context

Audit verdict: pages are effectively complete and the app runs clean. The three gaps are small but two are functionally broken, not just absent. Verified current state:

- `app/contact/page.tsx` renders a `mailto:` only. The 3 detail pages (`crafters`/`stores`/`learn`) link to `/contact?ref=report&type=<kind>&slug=<slug>`; the event detail page has **no** report link. `POST /api/flags` exists, is anonymous + same-origin + entity-existence-validated, and takes `entity_id` (cuid, ≤30 chars) + `reason` (enum) + optional `note` — NOT a slug.
- `app/admin/layout.tsx` guards with `requireAdmin()` and `redirect("/dashboard")` on `FORBIDDEN`. Next.js here is **14.2.18** — the `forbidden.tsx` / `forbidden()` convention (Next 15) is unavailable.
- The `CronRun` model exists (`job_name`, `started_at`, `completed_at`, `status`, `error_message`, `rows_affected`) but **no cron handler writes to it**. The 8 jobs are defined in `vercel.json`.

## Goals / Non-Goals

**Goals:** A branded 403 page wired into the guard paths; a working report flow + general contact form; cron handlers that record runs + an admin health page that flags stale jobs.

**Non-Goals:** No new moderation features (the queue at `/admin` index stays). No changes to `/api/flags` behavior. No schema migration. No backfill of historical cron runs. The PRD §10.4 GET-API divergence is a doc note, not implemented endpoints.

## Decisions

**D1 — 403 via a `/forbidden` route + redirect, not `forbidden.tsx`.**
Next 14 lacks the App Router `forbidden()` interrupt. Add `app/forbidden/page.tsx` (branded, matching `not-found.tsx`'s treatment: Logo + "You don't have access" + sign-in and home CTAs). Change `app/admin/layout.tsx`'s catch from `redirect("/dashboard")` to `redirect("/forbidden")`, and apply the same to the creator dashboard guard and ownership-failure paths on edit pages. Add `/forbidden` to `PUBLIC_ROUTES` so it renders for anyone. *Alternative considered:* render a 403 component inline in each layout's catch — rejected; a single route is reused everywhere and keeps one source of truth.

**D2 — Report form resolves slug→id server-side; keep the existing detail-page links.**
The detail links already pass `type`+`slug`. `/contact` (a server component) reads `searchParams`; when `ref=report`, it maps `type`→entity table, looks up the row by `slug` (scoped to PUBLISHED), and renders a client `<ReportForm entityType entityId entityName />` that POSTs `{entity_type, entity_id, reason, note}` to `/api/flags`. When `slug` doesn't resolve, show a friendly "listing not found" with a contact fallback. Without `ref=report`, render a general `<ContactForm />` (name/email/message → mailto-built submission or a simple POST; for V1 a `mailto:` with prefilled body is acceptable and keeps scope tight). Add the same report link to the event detail page (`type=event`). *Alternative considered:* change detail links to pass `entity_id` and skip the lookup — rejected; slugs keep the report URL human-readable and the lookup is one indexed query.

**D3 — Instrument crons with a `withCronRun(jobName, handler)` wrapper.**
Add `lib/cron.ts` exporting `withCronRun(jobName, fn)`: create a `CronRun` row (`status:"running"`), run `fn` (which returns `rows_affected`), then update to `success` + `completed_at` (or `error` + `error_message`) — wrapped so a throw still records the failure. Each of the 8 `app/api/cron/*/route.ts` handlers wraps its body with it (after the existing `CRON_SECRET` bearer check, so unauthorized pings don't create rows). Idempotent and additive — handler logic is unchanged otherwise.

**D4 — `/admin/health` reads the latest `CronRun` per job.**
Server component (under the admin layout, already `requireAdmin`-gated). For each of the 8 known job names, fetch the most recent `CronRun` (`orderBy started_at desc`). Render a table: job, last run (relative), status, rows affected, error. A row is **red when `completed_at` is null+old or the last run is >25h ago** (per §10.5), and shows "never run" when there's no row yet. Add "Cron health" → `/admin/health` to the admin nav in the layout.

## Risks / Trade-offs

- **Health page shows "never run" until the next cron tick.** → Expected and correct on day one; the page's value is ongoing staleness detection. Document it in the empty state.
- **`withCronRun` adds two DB writes per cron run.** → Negligible (8 jobs, daily/weekly). Acceptable for the reliability signal.
- **Report `entity_id` from a resolved slug could be stale if the listing is unpublished mid-session.** → `/api/flags` re-validates entity existence, returning 404 — the form surfaces that. No integrity risk.
- **`/contact` general form scope creep.** → Keep V1 minimal (prefilled `mailto:` or a thin POST); the launch-critical half is the *report* form, not a ticketing system.
- **Adding `/forbidden` to public routes must not expose anything sensitive.** → The page is static branded copy with CTAs only.

## Migration Plan

Additive, no migration. Order: (1) `/forbidden` page + guard redirects; (2) `lib/cron.ts` + wrap the 8 handlers; (3) `/admin/health` page + nav; (4) `/contact` report+contact forms + event report link; (5) re-run the smoke test. Rollback is per-file revert; nothing destructive.
