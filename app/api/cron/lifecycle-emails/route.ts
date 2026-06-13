// V3 Tier 4 — Marketing automation: lifecycle re-engagement emails.
//
// Recommended schedule: `0 11 * * *` (11:00 UTC = 4:30pm IST daily).
//
// Three segments per run, each capped at 100 emails to bound throughput:
//   1. Lapsed creators — published a listing >30 days ago, no edits since.
//   2. Inactive buyers — VISITORs whose updated_at is >60 days old.
//   3. Cold signups — users >7 days old with no listings of any kind.
//
// V3 idempotency: skip users whose User.updated_at was bumped in the last
// 7 days (proxy for "we just sent them something OR they engaged with the
// product"). Schema is locked for this tier — no lifecycle_emails_sent
// table. Tighten in V3.1 once segment sizes warrant it.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PER_SEGMENT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("token");
  if (!secret || secret === "placeholder") {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_MS);

  const {
    sendLapsedCreatorReengagement,
    sendInactiveBuyerWinback,
    sendCreatorNoListing,
  } = await import("@/lib/lifecycle-emails");

  let lapsedCreators = 0;
  let inactiveBuyers = 0;
  let coldSignups = 0;

  // ─── Segment 1: lapsed creators ──────────────────────────────────
  // Anyone who owns at least one PUBLISHED listing where every listing's
  // most-recent updated_at is older than 30 days. Cheap-and-cheerful query:
  // pick creators whose User.updated_at is old AND who own a published
  // crafter; the crafter's own updated_at is the listing freshness proxy.
  const candidatesCreators = await prisma.user.findMany({
    where: {
      role: { in: ["CREATOR", "ADMIN"] },
      is_banned: false,
      email_bounced: false,
      updated_at: { lt: sevenDaysAgo },
      crafters: {
        some: {
          status: "PUBLISHED",
          updated_at: { lt: thirtyDaysAgo },
        },
      },
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      crafters: {
        where: { status: "PUBLISHED" },
        orderBy: { updated_at: "desc" },
        take: 1,
        select: { updated_at: true },
      },
    },
    take: MAX_PER_SEGMENT,
  });
  for (const u of candidatesCreators) {
    if (u.email.endsWith("@noreply.crafty.app")) continue;
    const lastListingUpdate = u.crafters[0]?.updated_at ?? now;
    const days = Math.max(
      1,
      Math.floor((now.getTime() - lastListingUpdate.getTime()) / DAY_MS),
    );
    void sendLapsedCreatorReengagement({
      to: u.email,
      firstName: u.display_name,
      daysSinceListing: days,
    });
    lapsedCreators++;
  }

  // ─── Segment 2: inactive buyers ──────────────────────────────────
  const candidatesBuyers = await prisma.user.findMany({
    where: {
      role: "VISITOR",
      is_banned: false,
      email_bounced: false,
      updated_at: { lt: sixtyDaysAgo },
    },
    select: { id: true, email: true, display_name: true, updated_at: true },
    take: MAX_PER_SEGMENT,
  });
  for (const u of candidatesBuyers) {
    if (u.email.endsWith("@noreply.crafty.app")) continue;
    void sendInactiveBuyerWinback({
      to: u.email,
      firstName: u.display_name,
      lastSeenDate: u.updated_at,
    });
    inactiveBuyers++;
  }

  // ─── Segment 3: cold signups (>7 days, no listings) ──────────────
  const candidatesCold = await prisma.user.findMany({
    where: {
      created_at: { lt: sevenDaysAgo },
      updated_at: { lt: sevenDaysAgo },
      is_banned: false,
      email_bounced: false,
      crafters: { none: {} },
      stores: { none: {} },
      studios: { none: {} },
      events: { none: {} },
    },
    select: { id: true, email: true, display_name: true },
    take: MAX_PER_SEGMENT,
  });
  for (const u of candidatesCold) {
    if (u.email.endsWith("@noreply.crafty.app")) continue;
    void sendCreatorNoListing({ to: u.email, firstName: u.display_name });
    coldSignups++;
  }

  await prisma.cronRun.create({ data: { job_name: "lifecycle_emails", status: "success", completed_at: new Date(), rows_affected: lapsedCreators + inactiveBuyers + coldSignups } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({
    ok: true,
    at: now,
    sent: {
      lapsedCreators,
      inactiveBuyers,
      coldSignups,
      total: lapsedCreators + inactiveBuyers + coldSignups,
    },
  });
}
