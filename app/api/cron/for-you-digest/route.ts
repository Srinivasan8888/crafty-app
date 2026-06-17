// V3 — weekly "for you" email digest.
//
// Auth: shared CRON_SECRET (Authorization: Bearer ...) — same pattern as
// /api/cron/saved-search-alerts.
//
// Schedule (configured externally by the founder, e.g. via Vercel cron or a
// platform cron):  0 4 * * 0   (10:00 IST every Sunday — IST is UTC+5:30, so
// the cron runs at 04:30 UTC; pick whatever your platform's cron supports).
//
// Idempotency: the schema is locked (no `last_for_you_digest_at` column),
// so this job is intentionally idempotent against same-week re-runs only at
// the platform level — i.e. schedule it once a week. We do NOT keep a sent-at
// watermark; if the founder triggers it twice in a day, users get two emails.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cronSecretMatches } from "@/lib/cron";
import { getForYou, publicHrefFor } from "@/lib/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const MIN_SAVES = 3; // soft floor — too few saves and the rec graph is too sparse

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("token");

  if (!secret || secret === "placeholder") {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!cronSecretMatches(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();

  // Eligible users: VISITOR or CREATOR (skip ADMIN), email is not bounced,
  // and they have at least MIN_SAVES saves so the co-save graph can yield
  // something meaningful.
  //
  // We materialize the candidates with a single aggregation, then iterate.
  const candidates = await prisma.$queryRaw<Array<{ user_id: string; n: bigint }>>`
    SELECT s.user_id, COUNT(*)::bigint AS n
    FROM "Save" s
    JOIN "User" u ON u.id = s.user_id
    WHERE u.role IN ('VISITOR', 'CREATOR')
      AND u.is_banned = false
      AND u.email_bounced = false
    GROUP BY s.user_id
    HAVING COUNT(*) >= ${MIN_SAVES}
  `;

  let processed = 0;
  let emailed = 0;

  // Lazy-load the email module so this cron doesn't pay the Resend import
  // cost in environments where the secret isn't set (the early-return above
  // would already have bailed, but the lazy pattern matches saved-search-alerts).
  const { sendListingLive } = await import("@/lib/email");

  for (const row of candidates) {
    processed++;
    const hits = await getForYou(row.user_id, 5);

    // Soft signal: if getForYou turned up nothing — either because the user's
    // entire shelf is unique to them, or every overlap is also already saved —
    // skip the send entirely. Weekly cadence + this filter keeps churn low.
    if (hits.length === 0) continue;

    const top = hits[0];
    const user = await prisma.user.findUnique({
      where: { id: row.user_id },
      select: { email: true, display_name: true },
    });
    if (!user) continue;

    void sendListingLive({
      to: user.email,
      firstName: user.display_name,
      // V3 reuses the listing-live template as a digest stub. A dedicated
      // template ("here are 5 picks for you") is V3.1 polish.
      kind: "crafter",
      name: `${hits.length} new pick${hits.length > 1 ? "s" : ""} for you on Crafty`,
      publicUrl: `${SITE_URL}${publicHrefFor(top)}`,
    });
    emailed++;
  }

  await prisma.cronRun.create({ data: { job_name: "for_you_digest", status: "success", completed_at: new Date(), rows_affected: emailed } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({
    ok: true,
    processed,
    emailed,
    started_at: startedAt,
    finished_at: new Date(),
  });
}
