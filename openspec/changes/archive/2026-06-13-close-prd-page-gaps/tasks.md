# Tasks — Close PRD Page Gaps

Order: 1 → 2 → 3 → 4 → 5. Each group is independently shippable.

## 1. 403 Forbidden page (§23.1)

- [x] 1.1 Create `app/forbidden/page.tsx` — branded access-denied page matching `app/not-found.tsx` treatment (Logo, "You don't have access" heading, supporting copy, "Sign in" + "Take me home" CTAs).
- [x] 1.2 Add `/forbidden` to `PUBLIC_ROUTES` in `middleware.ts` so it renders for anyone.
- [x] 1.3 In `app/admin/layout.tsx`, change the `requireAdmin()` catch from `redirect("/dashboard")` to `redirect("/forbidden")`.
- [x] 1.4 Apply the same `redirect("/forbidden")` to other authenticated-but-unauthorized guards: `app/admin/queue/page.tsx`. (No creator-page silent redirects exist — creator gating returns 403 JSON from API routes; the dashboard layout's `!user → /sign-in` is the correct unauthenticated path and is left as-is.)

## 2. Cron run recording (§10.5)

- [x] 2.1 Create `lib/cron.ts` — exports `CRON_JOBS` (catalog: name/label/cadence) + `CRON_STALE_MS` (25h). (Runs are recorded inline in each handler via `prisma.cronRun.create` rather than a wrapper, to keep each handler's diff to one line and avoid restructuring.)
- [x] 2.2 Record a successful run in each of the 8 cron handlers (after the `CRON_SECRET` check, before the final response): `event-reminders`, `expire-featured`, `materialize-recurring-events`, `message-digest`, `saved-search-alerts`, `lifecycle-emails`, `warehouse-sync`, `for-you-digest`.
- [x] 2.3 Verified: unauthorized cron call (no `CRON_SECRET`) returns 401 and writes **no** `CronRun` row (record line runs only after the auth guard).

## 3. Admin cron health page (§7.14)

- [x] 3.1 Create `app/admin/health/page.tsx` (server component, inherits admin-gated layout): for each of the 8 known job names, fetch the latest `CronRun` (`orderBy started_at desc`).
- [x] 3.2 Render a table — job, cadence, last run (relative time), status badge, rows affected. Flag a row **stale/red** when the latest run is >25h old or never recorded.
- [x] 3.3 Add `["Cron health", "/admin/health"]` to the admin nav array in `app/admin/layout.tsx`.

## 4. Report + contact (§7.12)

- [x] 4.1 Create `components/ReportForm.tsx` — props `{ entityType, entityId, entityName }`; reason `<select>` + optional note (≤200) + submit → `POST /api/flags`; success/error states.
- [x] 4.2 Rework `app/contact/page.tsx` (server): when `ref=report`, map `type`→entity table, resolve the row by `slug` (PUBLISHED) to `id`+`name`, render `<ReportForm>`. If unresolved, show a friendly "listing not found" + contact fallback.
- [x] 4.3 When not `ref=report`, render the general contact path (mailto with prefilled subject + guidance).
- [x] 4.4 Add a "Report this listing" link to `app/[city]/events/[slug]/page.tsx` → `/contact?ref=report&type=event&slug=${e.slug}` (parity with crafter/store/studio).
- [x] 4.5 Confirm `/contact` is reachable without auth — added to `PUBLIC_ROUTES`.

## 5. Verify + minor doc note

- [x] 5.1 `bun run typecheck` + `DEV_AUTH=false bun run build` — both clean.
- [x] 5.2 Re-smoked: `/forbidden`, `/admin/health`, `/contact`, `/contact?ref=report` (valid + invalid slug), event report link, cron auth (401→200), cron→CronRun→health pipeline — all green, zero 500s.
- [ ] 5.3 *(Optional, not done — lowest priority)* Add a one-line note to PRD §10.4 that `GET /api/{crafters,stores,studios,events}` list endpoints are intentionally unimplemented (listings served via RSC). Doc-only; zero functional impact.
