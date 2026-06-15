## Why

A save is the core low-commitment buyer action, but today it is a dead-end shelf: nothing reaches the buyer when a maker they saved posts something new, and a saved event sends them no reminder (the T-24h cron emails only the organizer). The North Star is a directory buyers **return** to, and a buyer's own saves are the strongest, most on-strategy signal for pulling them back — personal, local, no global feed, no public counts. This change turns saves into two recurring return triggers.

## What Changes

- Add a daily **saved-listing update digest**: a new cron scans each user's saved crafters/stores/studios for genuinely new activity since a per-save watermark (new product listed, new event organized) and sends that user **one batched email** ("Makers you saved have something new"), linking to the listings. Watermark advances after each send so nothing repeats.
- Add **event RSVP reminders**: extend the existing `event-reminders` cron so that, when an event crosses its T-24h window, it emails not just the organizer but **everyone who saved that event** ("Tomorrow: {event} in {City}", with venue + add-to-calendar). Reuses the event's existing `reminder_sent_at` guard, so each event (organizer + all savers) is reminded exactly once.
- Add a `Save.last_notified_at` column (the update-digest watermark) and two new branded email templates (the saved-update digest; the attendee event reminder, distinct from the organizer reminder).
- Register the new cron in the `/admin/health` catalog and `vercel.json`.

Non-goals (kept out to bound scope): **price-drop alerts** (require a price-history mechanism — deferred; this change covers new product + new event only), web push (separate slice), follow-a-maker (separate slice), and any public save/popularity count. No change to who can see a listing.

## Capabilities

### New Capabilities
- `saved-listing-update-alerts`: a daily batched email to a buyer when a crafter/store/studio they saved has new activity (new product or new event) since the buyer last heard, watermarked per save so updates never repeat.
- `event-rsvp-reminders`: a T-24h reminder email to every buyer who saved an event (alongside the existing organizer reminder), sent exactly once per event.

### Modified Capabilities
<!-- None at the spec level. The existing event-reminders cron is extended in implementation; cron-health-monitor simply gains a new job in its catalog (no requirement change). -->

## Impact

- **Schema**: add `Save.last_notified_at DateTime?` (nullable; one migration). No other model changes.
- **Cron**: new `app/api/cron/saved-listing-updates/route.ts` (daily); extend `app/api/cron/event-reminders/route.ts` to also email savers; register both in `lib/cron.ts` `CRON_JOBS` and `vercel.json`.
- **Email**: new templates/senders in `lib/email.ts` (saved-update digest; attendee event reminder). All best-effort, respect `User.email_bounced`, lazy-imported.
- **Data**: reads existing `Save`, `Product`, `Event`, `Crafter/Store/Studio`, `User` models; writes only `Save.last_notified_at` and `Event.reminder_sent_at` (already written today) + `CronRun` records.
- **Deployment**: requires applying the Prisma migration to the database (`prisma migrate deploy` / `db push`) in addition to the normal build. No new third-party dependencies. No breaking changes.
