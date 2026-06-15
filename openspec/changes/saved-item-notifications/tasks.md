## 1. Schema — watermark column

- [x] 1.1 Add `last_notified_at DateTime?` to the `Save` model in `prisma/schema.prisma` (nullable, no backfill).
- [x] 1.2 Generate the migration (`prisma migrate dev --name save_last_notified_at`) and run `prisma generate`.

## 2. Email templates

- [x] 2.1 Add a `sendSavedUpdatesDigest` sender + branded template to `lib/email.ts` ("Makers you saved have something new", lists up to N items with deep links, dev no-op + `email_bounced` aware, consistent with existing senders).
- [x] 2.2 Add a `sendEventReminderAttendee` sender + template to `lib/email.ts` ("Tomorrow: {event} in {City}", venue + add-to-calendar link) — distinct from the organizer reminder.

## 3. Saved-listing update digest cron

- [x] 3.1 Create `app/api/cron/saved-listing-updates/route.ts` with `CRON_SECRET` bearer auth + `cron_not_configured` 503 (mirror `saved-search-alerts`).
- [x] 3.2 Load CRAFTER/STORE/STUDIO saves, group by saved entity, and find products/events created after each save's `last_notified_at ?? created_at` using grouped queries (no per-save N+1).
- [x] 3.3 Per user with fresh activity, send one `sendSavedUpdatesDigest` (skip `email_bounced`); for users with no fresh activity, send nothing.
- [x] 3.4 After dispatch, advance `last_notified_at = now` on the scanned saves for that user so updates never repeat.
- [x] 3.5 Record a `CronRun` (`job_name: "saved_listing_updates"`, rows_affected = emails sent), lazy-importing `lib/email`.

## 4. RSVP reminders (extend event-reminders)

- [x] 4.1 In `app/api/cron/event-reminders/route.ts`, after sending the organizer reminder for an event in the window, load all `Save` rows for that event (`entity_type=EVENT`), resolve users, and send each `sendEventReminderAttendee` (skip `email_bounced`).
- [x] 4.2 Keep the single `reminder_sent_at` stamp at the end so organizer + all savers are sent exactly once; ensure attendee sends are best-effort (void) and never block the stamp.
- [x] 4.3 Update `rows_affected` / logging to reflect attendee sends.

## 5. Register the cron

- [x] 5.1 Add `{ name: "saved_listing_updates", label: "Saved-listing update digest", cadence: "daily" }` to `CRON_JOBS` in `lib/cron.ts`.
- [x] 5.2 Add the schedule to `vercel.json` (e.g. `"0 6 * * *"` for `/api/cron/saved-listing-updates`).

## 6. Verify & ship

- [x] 6.1 `bun run typecheck` clean.
- [x] 6.2 `DEV_AUTH=false bun run build` succeeds.
- [x] 6.3 Apply the migration to the database (`prisma migrate deploy` / `db push` against Neon).
- [ ] 6.4 Commit on `demo-launch-pass`, deploy to Vercel prod, push to `origin`.
- [ ] 6.5 Smoke: hit each cron with the `CRON_SECRET` (e.g. `?token=`) and confirm a 200 + `CronRun` recorded; verify `/admin/health` shows the new job; confirm no email fires when there is no fresh activity.
