// PRD §10.5 — cron job catalog for the /admin/health monitor.
//
// The 8 scheduled jobs (vercel.json). Listed here so /admin/health can show
// every job — including ones that have never run yet. Each cron handler
// records a successful run inline (prisma.cronRun.create) on completion; a
// handler that throws records nothing, so it surfaces as stale on the health
// page (which is the alert we want).
export const CRON_JOBS = [
  { name: "event_reminders", label: "Event reminders (T-24h)", cadence: "daily" },
  { name: "expire_featured", label: "Expire featured listings", cadence: "daily" },
  { name: "materialize_recurring_events", label: "Materialize recurring events", cadence: "daily" },
  { name: "message_digest", label: "Unread-message digest", cadence: "daily" },
  { name: "saved_search_alerts", label: "Saved-search alerts", cadence: "daily" },
  { name: "lifecycle_emails", label: "Lifecycle re-engagement", cadence: "daily" },
  { name: "warehouse_sync", label: "Warehouse export", cadence: "daily" },
  { name: "for_you_digest", label: "For-you weekly digest", cadence: "weekly" },
] as const;

// A job is "stale" (flagged red on /admin/health) if its most recent recorded
// run is older than this. Daily jobs should run every 24h; 25h gives an hour
// of scheduler drift before alerting. (§10.5)
export const CRON_STALE_MS = 25 * 60 * 60 * 1000;
