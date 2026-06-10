// PRD §15.2 — event-reminder T-24h email cron.
//
// Endpoint is meant to be hit by a scheduler every ~hour (Replit Cron / Vercel
// Cron / GitHub Actions on schedule). It finds events whose start_at falls
// within the next 24-26h window AND that haven't received a reminder yet,
// sends one email to the organizer, and marks `reminder_sent_at`.
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
  if (events.length > 0) {
    const { sendListingLive } = await import("@/lib/email");
    for (const e of events) {
      void sendListingLive({
        to: e.organizer.email,
        firstName: e.organizer.display_name,
        kind: "event",
        name: `Reminder: ${e.name} starts in 24h`,
        publicUrl: `${SITE_URL}/${e.city.slug}/events/${e.slug}`,
      });
      await prisma.event.update({
        where: { id: e.id },
        data: { reminder_sent_at: new Date() },
      });
      sent++;
    }
  }

  return NextResponse.json({ window: { from: t24, to: t26 }, candidates: events.length, sent });
}
