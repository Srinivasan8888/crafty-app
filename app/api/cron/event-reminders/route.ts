// PRD §15.2 — event-reminder T-24h email cron.
//
// Endpoint MUST be hit hourly — vercel.json schedules it at "0 * * * *". The
// handler queries a 24-26h look-ahead window, so an hourly cadence covers
// every event exactly once: as the window slides 1h per run, each event falls
// inside it for ~2 runs, and the `reminder_sent_at` guard prevents a second
// send. (A daily run would only ever cover a 2h band of start times and skip
// the rest — that was the bug this comment now guards against.)
//
// It finds events whose start_at falls within the next 24-26h window AND that
// haven't received a reminder yet, sends one email to the organizer, and marks
// `reminder_sent_at`.
//
// Auth: protected by a shared secret in CRON_SECRET to keep public crawlers
// from accidentally firing it.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret.startsWith("placeholder")) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const t24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const t26 = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  // Two-hour overlap window covers hourly cron drift without double-sending
  // (reminder_sent_at check guards that).
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      reminder_sent_at: null,
      start_at: { gte: t24, lt: t26 },
    },
    include: { organizer: { select: { email: true, display_name: true } }, city: true },
  });

  // Avoid pulling in the email module unless we actually have work.
  let sent = 0;
  let attendeesNotified = 0;
  if (events.length > 0) {
    const { sendListingLive, sendEventReminderAttendee } = await import("@/lib/email");
    for (const e of events) {
      // Organizer reminder (unchanged).
      void sendListingLive({
        to: e.organizer.email,
        firstName: e.organizer.display_name,
        kind: "event",
        name: `Reminder: ${e.name} starts in 24h`,
        publicUrl: `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
      });

      // RSVP-lite: also remind everyone who SAVED this event. The event-level
      // reminder_sent_at guard (set below, once) means organizer + all savers
      // are notified exactly once — no per-attendee state needed.
      const savers = await prisma.save.findMany({
        where: { entity_type: "EVENT", entity_id: e.id },
        include: { user: { select: { email: true, display_name: true, email_bounced: true } } },
      });
      const publicUrl = `${SITE_URL}/${e.city.slug}/events/${e.slug}`;
      for (const s of savers) {
        if (!s.user.email || s.user.email_bounced) continue;
        void sendEventReminderAttendee({
          to: s.user.email,
          firstName: s.user.display_name,
          eventName: e.name,
          cityName: e.city.display_name,
          venue: e.venue_name,
          publicUrl,
        });
        attendeesNotified++;
      }

      await prisma.event.update({
        where: { id: e.id },
        data: { reminder_sent_at: new Date() },
      });
      sent++;
    }
  }

  await prisma.cronRun.create({ data: { job_name: "event_reminders", status: "success", completed_at: new Date(), rows_affected: sent + attendeesNotified } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({ window: { from: t24, to: t26 }, candidates: events.length, sent, attendeesNotified });
}
