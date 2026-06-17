// PRD §15.2 — event-reminder email cron.
//
// Runs DAILY (vercel.json "0 2 * * *"). The Vercel Hobby plan forbids
// sub-daily crons, so instead of an hourly 24-26h sliding window we use one
// daily pass over a wide 48h look-ahead: every PUBLISHED event starting within
// the next 48h that hasn't been reminded yet gets its reminder now, and the
// `reminder_sent_at` guard ensures it is sent exactly once. Net effect: each
// event's organizer + everyone who saved it are reminded once, ~1-2 days
// ahead (less precise than hourly, but every event is covered).
//
// Auth: protected by a shared secret in CRON_SECRET to keep public crawlers
// from accidentally firing it.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cronSecretMatches } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret.startsWith("placeholder")) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!cronSecretMatches(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Daily pass: remind every upcoming event in the next 48h not yet reminded.
  const t48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      reminder_sent_at: null,
      start_at: { gte: now, lt: t48 },
    },
    include: { organizer: { select: { email: true, display_name: true, email_bounced: true } }, city: true },
  });

  // Avoid pulling in the email module unless we actually have work.
  let sent = 0;
  let attendeesNotified = 0;
  if (events.length > 0) {
    const { sendListingLive, sendEventReminderAttendee } = await import("@/lib/email");
    for (const e of events) {
      // Organizer reminder — skip bounced / placeholder addresses, matching the
      // attendee guard below and every other cron (protects sender reputation).
      if (
        e.organizer.email &&
        !e.organizer.email_bounced &&
        !e.organizer.email.endsWith("@noreply.crafty.app")
      ) {
        void sendListingLive({
          to: e.organizer.email,
          firstName: e.organizer.display_name,
          kind: "event",
          name: `Reminder: ${e.name} starts in 24h`,
          publicUrl: `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
        });
      }

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
  return NextResponse.json({ window: { from: now, to: t48 }, candidates: events.length, sent, attendeesNotified });
}
