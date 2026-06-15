## Context

Crafty is a Next.js 14 (App Router) + Prisma/Postgres app already past its V1 roadmap. A five-track audit of shipped features (commerce, discovery, dashboard/creator, admin, backend/infra) confirmed the security and money-critical paths are sound, and surfaced a set of localized correctness defects. This change fixes only the verified defects; it is deliberately scoped to avoid touching the parts the audit cleared.

Most fixes are single-file and low-risk. A few have subtle semantics (cron windowing, featured overlap, ban enforcement reaching every auth path) that warrant deciding the approach up front. No schema migration is required — every field these fixes read (`is_banned`, `*_blurhash`, `status`, `deleted_at`, `feature_expires_at`) already exists.

## Goals / Non-Goals

**Goals:**
- Make controls that *look* functional actually work, or remove them: ban enforcement, product caps, Learn filters.
- Make scheduled jobs deliver correctly: event reminders, featured expiry, message digests.
- Preserve data integrity in edits and admin actions: blurhash carry-through, soft-delete re-creation, claim-ownership guard, deterministic reorder, consistent `deleted_at`.
- Remove dead links/markup, fix deep-links, correct misleading copy, and close the one i18n parity gap.
- Add regression coverage for the highest-value fixes (ban, product cap, Learn filters, cron windowing).

**Non-Goals:**
- No rewrite of auth, payments, webhooks, public API, or upload — the audit cleared them.
- No new schema, no new dependencies, no new third-party integrations.
- Not addressing documented "no-op until credential set" behavior (Razorpay/Resend/PostHog/Anthropic), which is intentional.
- Not building the deferred V3.1 backlog (per-item fulfillment flag, refunds, real Redis worker, embeddings recs) — out of scope.

## Decisions

- **Ban enforcement at the single auth chokepoint.** Enforce `is_banned` inside the lowest shared resolver in `lib/auth.ts` (`getCurrentUser`/`requireUser`) so that `requireCreator()` and `requireAdmin()`, which build on it, inherit denial automatically. Rationale: one chokepoint covers every page and mutation route without auditing each call site. A banned user is treated as anonymous (redirect to sign-in/`/forbidden`) rather than throwing a special error, matching existing unauthenticated handling. *Alternative considered:* per-route checks — rejected as error-prone and easy to miss.

- **Event-reminder window matches the schedule.** Prefer changing the Vercel schedule to hourly (`0 * * * *`) and keeping the existing 24–26h window, since the handler is already written and idempotent (`reminder_sent_at`). *Alternative:* keep the daily 02:00 run but widen the window to a full `[now+24h, now+48h)` band — works but sends reminders up to 48h early. Decision: hourly schedule (tighter T-24h accuracy, no handler change), and align the comment to the schedule.

- **Featured overlap guard via existence check.** Before clearing `is_featured`, query for any other `FeatureOrder` on the same `entity_id` with `status = PAID AND feature_expires_at >= now`; only clear when none exist. Keeps the job idempotent and avoids a schema change. *Alternative:* recompute featured-state from the max active window per entity — more robust but larger; deferred.

- **Claim guard re-checks ownership inside the PATCH handler.** Move the `isStillClaimable` logic server-side: in `/api/admin/claim-requests/[id]`, re-read the target listing and reject approval when `owner_user_id` is set to a different user, unless an explicit override flag is passed. Rationale: the UI warning is advisory and races; the server must be authoritative.

- **City reorder = neighbor swap in a transaction.** Replace `display_order += delta` with: find the adjacent city at the target rank, swap the two `display_order` values inside `prisma.$transaction`. Eliminates drift and collisions.

- **Learn filters: wire the real ones, delete the fabricated ones.** Wire `discipline` (already works), `online`/`trial`/`featured`, and `sort` into the page's `where`/`orderBy`; route the search box to `/{city}/search?q=…`; remove the hardcoded neighbourhood facet and its invented counts; default "Featured first" off. Rationale: showing fabricated counts is worse than omitting the facet; only ship controls backed by real data.

- **Blurhash on edit = schema + initialValues, symmetric with create.** Add `*_blurhash` to each PATCH zod schema and persist alongside the image; pass stored blurhashes into each edit page's `initialValues`. Mirrors the working create path.

- **Copy/markup fixes are mechanical.** Add `id="getting-there"`, delete the no-op `phoneDigits` JSX, relabel association headings to "Crafters in {city}", soften order-status copy, deep-link dashboard event rows (select `slug` + `city.slug`, include `city`), broaden the "Today" query to interval-overlap, add `community.eyebrow` to hi/kn/ta.

## Risks / Trade-offs

- **[Ban enforcement locks out the wrong path] →** Gate strictly on `is_banned === true`; non-banned and anonymous behavior unchanged. Add a test asserting normal users are unaffected and a banned user is denied on both a page and a mutation route.
- **[Hourly cron increases invocations] →** Negligible cost; the handler is idempotent and the query is indexed on `start_at`. If hourly is undesirable on the host, fall back to the documented daily+wide-window alternative.
- **[Featured overlap query per expiring order] →** Bounded by the number of expiring orders per run (small); acceptable. Indexed on `entity_id`/`status`.
- **[Removing the neighbourhood facet changes the Learn UI] →** Intended — it was fabricated. Communicated in the proposal; no data loss.
- **[Product-cap enforcement could surprise existing over-cap sellers] →** Enforce only on new creates (count-then-create); never delete existing rows. Existing over-cap accounts keep their products but cannot add more until under cap.
- **[Claim-guard override] →** Provide an explicit override path for the legitimate admin case (re-assigning a genuinely abandoned listing) so the guard does not become a hard block.

## Migration Plan

1. No DB migration. Ship code changes behind normal deploy.
2. Update `vercel.json` cron schedule for event-reminders in the same deploy as the handler comment fix.
3. Roll out in logical batches (security/enforcement → cron → edit/admin integrity → discovery/UX polish) so each can be verified independently; all are independently revertible since there is no shared schema change.
4. Rollback: revert the commit(s); no data backfill needed. The featured-overlap and claim guards are additive checks — reverting restores prior (buggy) behavior without leaving bad data.

## Open Questions

- **Event-reminder schedule host:** confirm the deploy target supports hourly cron (Vercel/Replit/GitHub Actions). If hourly is constrained, use the daily + `[now+24h, now+48h)` window fallback.
- **Claim-approval override UX:** is an explicit "reassign anyway" affordance needed for admins now, or is rejecting stale-claim approval sufficient for launch? Default: reject with a clear message; add override only if ops needs it.
- **Learn `sort` options:** confirm which sort orders to expose (e.g. featured-first, recently added, A–Z) so the UI only offers backed options.
