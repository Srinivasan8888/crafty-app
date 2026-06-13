## Why

A full page-coverage audit against the PRD found the app is 35/37 pages complete with zero runtime errors — but three PRD-required surfaces are missing or non-functional. None block public discovery, but two are quick wins worth clearing before the product is shown, and the third (cron health) is the only blind spot on background-job reliability. Two of the three are *more* broken than a missing page:

- The **report-a-listing** flow (§7.12) dead-ends: detail pages link to `/contact?ref=report&type=…&slug=…`, but `/contact` ignores those params and renders only a `mailto:` — so users cannot actually report anything, even though `/api/flags` works.
- The **cron health** monitor (§7.14/§10.5) has no page AND none of the 8 cron handlers write `CronRun` rows — so there is no data behind it either.

## What Changes

- **403 Forbidden page (§23.1):** Add a branded access-denied page. Authenticated-but-unauthorized access (non-admin → `/admin`, non-owner → an edit page) currently `redirect("/dashboard")` silently; route it to the new page instead. (Next 14 has no `forbidden.tsx`, so this is a `/forbidden` route + redirect.)
- **Working report + contact (§7.12):** Make `/contact` render (a) a working **report form** when `ref=report` — resolve the entity by `type`+`slug`, let the user pick a reason + note, and POST to the existing `/api/flags`; and (b) a general **contact form** otherwise. Add the missing "Report this" link to the **event** detail page for parity with crafter/store/studio.
- **Cron health monitor (§7.14/§10.5):** Instrument all 8 cron handlers to write a `CronRun` row (start → success/error). Add `/admin/health` showing last-run timestamp + status per job, with a **red row when a job is >25h stale**, and add it to the admin nav.
- **Minor doc reconciliation:** Note that PRD §10.4's `GET /api/crafters` (etc.) list endpoints are intentionally not implemented (listings are served via RSC) — a stale-spec annotation, not code. *(Optional, lowest priority.)*

## Capabilities

### New Capabilities
- `access-denied-page`: A branded 403 page shown when an authenticated user lacks permission for a route, instead of a silent redirect.
- `listing-reporting`: A functional report-a-listing path (and general contact form) that turns the existing `/api/flags` endpoint into something users can actually reach.
- `cron-health-monitor`: Cron handlers record their runs, and an admin page surfaces last-run/status per job so silent scheduler failures are visible.

### Modified Capabilities
<!-- None — these are new surfaces; no existing spec's requirements change. -->

## Impact

- **New files:** `app/forbidden/page.tsx`, `app/admin/health/page.tsx`, a `ReportForm`/`ContactForm` client component (`components/`), `lib/cron.ts` (a `withCronRun` wrapper).
- **Modified:** `app/admin/layout.tsx` (redirect target + nav entry), `app/contact/page.tsx` (report + contact forms), the 8 `app/api/cron/*/route.ts` handlers (wrap with `CronRun`), the event detail page (`app/[city]/events/[slug]/page.tsx`, add report link), and the creator dashboard guard if it also silently redirects.
- **Reuses (no change):** `POST /api/flags` (anonymous, same-origin, entity-existence-validated), the `CronRun` Prisma model (already defined). **No schema migration.**
- **Auth/middleware:** `/forbidden` and `/contact` must be reachable by both anonymous and authed users (add to `PUBLIC_ROUTES` if gated).
