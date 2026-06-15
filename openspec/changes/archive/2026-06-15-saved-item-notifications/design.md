## Context

Crafty already runs eight authenticated daily crons (`lib/cron.ts` catalog, `vercel.json`, each recording a `CronRun` for `/admin/health`) and a best-effort, lazy-imported email layer (`lib/email.ts`, dev no-op, `email_bounced`-aware). The `event-reminders` cron runs **hourly** with a 24–26h look-ahead window and an `Event.reminder_sent_at` guard so each event is processed exactly once. The `Save` model has `@@unique([user_id, entity_type, entity_id])` and a `SavedEntityType` of CRAFTER/STORE/STUDIO/EVENT. Today saves trigger nothing for the buyer who made them.

This change adds two return triggers built entirely on that existing infra, with the smallest possible data change.

## Goals / Non-Goals

**Goals:**
- A buyer hears (one batched email) when a maker they saved posts new work.
- A buyer who saved an event gets a T-24h reminder, exactly once.
- No repeats, no inbox spam, no public counts, minimal schema change.

**Non-Goals:**
- Price-drop alerts (need price history — deferred).
- New-portfolio-photo alerts, web push, follow-a-maker (separate slices).
- Any per-attendee RSVP record or public attendee count.

## Decisions

**1. RSVP reminders piggyback on the existing event-reminders cron and reuse `Event.reminder_sent_at` — no per-attendee schema.**
When an event first enters the 24–26h window (`reminder_sent_at == null`), the cron already sends the organizer reminder and stamps `reminder_sent_at`. In the same atomic pass, also load every `Save` where `entity_type=EVENT, entity_id=event.id`, resolve those users (skip `email_bounced`), and send each the attendee reminder, then stamp `reminder_sent_at` once at the end. Because the event-level guard already guarantees once-per-event, every saver is reminded exactly once with **zero new columns**. *Alternative:* a separate cron + a per-`Save` `reminded_at` guard — rejected as redundant; the event guard is sufficient and simpler.

**2. Update digest watermark = one nullable column `Save.last_notified_at`.**
For a saved crafter/store/studio, "new" means activity created strictly after `save.last_notified_at ?? save.created_at`. After a user's digest is sent, set `last_notified_at = now` on the CRAFTER/STORE/STUDIO saves that were scanned, so the next run only sees newer activity. Existing saves have `null` → the first run uses `created_at` as the baseline, so there is no historical flood at launch. *Alternatives:* a `SavedListingNotice` table (heavier, unnecessary) or a global per-user `last_run` (can't express per-save freshness) — both rejected.

**3. One batched email per user, not one per listing.**
The `saved-listing-updates` cron iterates users who have CRAFTER/STORE/STUDIO saves, gathers fresh activity across all their saved makers in that run, and sends a single "Makers you saved have something new" digest listing up to N items with deep links. This respects concierge-warmth and avoids flooding. A user with no fresh activity gets no email and no watermark change.

**4. "New activity" sources (v1): new product + new event by the saved entity's owner.**
A saved crafter/store/studio is "active" when it has a `Product` (or organized `Event`) created after the watermark, found via the owner/organizer relation already in the schema. Price drops are out (no history). Detection runs as a small number of grouped queries per run, not per-save N+1.

**5. Reuse all existing cron conventions.**
New cron `app/api/cron/saved-listing-updates/route.ts`: `CRON_SECRET` bearer auth, `cron_not_configured` 503 when unset, lazy `lib/email` import, records a `CronRun` (`job_name: "saved_listing_updates"`), registered in `lib/cron.ts` `CRON_JOBS` and `vercel.json` at a free daily slot (e.g. `0 6 * * *`). Two new email senders in `lib/email.ts` (digest; attendee reminder) follow the existing branded-template + `email_bounced` pattern.

## Risks / Trade-offs

- **Watermark advances even if a send fails → a missed update.** → Advance `last_notified_at` only after the digest send is dispatched; a rare miss is low-harm (next genuinely-new item still notifies). Acceptable for best-effort email.
- **Daily full scan cost as saves grow.** → Queries are grouped (saves → distinct saved entities → one products/events query per batch), bounded result sizes, and the cron is off-peak. Revisit with pagination if save volume becomes large.
- **A buyer could get both a saved-search alert and a saved-update digest for the same new listing.** → Accepted; different triggers (a watched query vs a specific saved maker), both legitimately useful.
- **Attendee reminder load for a popular event.** → Bounded by savers; sends are best-effort/void and skip bounced; the event guard prevents re-runs.

## Migration Plan

1. Add `last_notified_at DateTime?` to `Save` in `prisma/schema.prisma`; generate a migration (`prisma migrate dev --name save_last_notified_at`).
2. Deploy applies it to Neon via `prisma migrate deploy` (or `prisma db push`) — the column is nullable with no backfill, so it is safe and online.
3. Ship the cron + email + `vercel.json` + `lib/cron.ts` registration; Vercel begins scheduling the new job.
4. **Rollback:** revert the code; the nullable column can be left in place harmlessly (or dropped in a follow-up migration). The event-reminders extension is pure code and reverts cleanly.

## Open Questions

- Cron time slot: `0 6 * * *` assumed (after saved-search-alerts at 03:30, before lifecycle at 11:00) — confirm no quiet-hours preference.
- For studios, does "new activity" include new `ongoing_courses`/sessions in addition to events? (v1 assumes events + products; sessions can be added later.)
- Digest cap N (items per email) and whether to localize subject lines now (en/hi/ta/kn) or in a follow-up.
