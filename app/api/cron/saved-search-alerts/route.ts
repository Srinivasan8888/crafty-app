// V2.0 — daily cron that re-runs every SavedSearch and emails the owner when
// new matches appear since `last_run_at`. Idempotent against re-runs within
// the same hour because we advance `last_run_at` to the run timestamp.
//
// Auth: shared CRON_SECRET (Authorization: Bearer ...).
// Schedule: hit once per day (e.g. 0 9 * * * — 9 AM IST).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type EntityKind = "CRAFTER" | "STORE" | "STUDIO" | "EVENT";

const SEGMENT: Record<EntityKind, string> = {
  CRAFTER: "crafters",
  STORE: "stores",
  STUDIO: "learn",
  EVENT: "events",
};

// Table name per entity. Trusted, fixed strings — never user input — so they
// can be interpolated into the SQL while every value stays parameterized.
const TABLE: Record<EntityKind, string> = {
  CRAFTER: "Crafter",
  STORE: "Store",
  STUDIO: "Studio",
  EVENT: "Event",
};

// Match the live search page exactly: build a `simple` to_tsquery from the
// query (strip punctuation, AND the tokens together) and run it against
// `search_vector`. Falls back to no matches when the query has no usable
// tokens.
function toTsQuery(query: string): string {
  return query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");
}

async function findNewMatches(
  entity: EntityKind,
  cityId: string,
  query: string,
  since: Date,
): Promise<Array<{ name: string; slug: string; created_at: Date }>> {
  const safe = toTsQuery(query);
  if (!safe) return [];

  const table = TABLE[entity];
  // Same FTS predicate as /[city]/search: city_id + PUBLISHED + search_vector.
  // Events additionally exclude past listings via end_at >= NOW().
  const eventClause = entity === "EVENT" ? "AND end_at >= NOW() " : "";
  const sql =
    `SELECT name, slug, created_at FROM "${table}" ` +
    `WHERE city_id = $1 AND status = 'PUBLISHED' AND created_at >= $2 ` +
    eventClause +
    `AND search_vector @@ to_tsquery('simple', $3) LIMIT 20`;

  return prisma.$queryRawUnsafe<Array<{ name: string; slug: string; created_at: Date }>>(
    sql,
    cityId,
    since,
    safe,
  );
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret === "placeholder") {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const subs = await prisma.savedSearch.findMany({
    include: {
      user: { select: { email: true, display_name: true, email_bounced: true } },
      city: { select: { slug: true, display_name: true } },
    },
  });

  let processed = 0;
  let emailed = 0;

  // Lazy-load the email module so this cron doesn't pay the Resend import cost
  // when the secret isn't set / there's no work.
  const { sendListingLive } = await import("@/lib/email");

  for (const sub of subs) {
    processed++;
    if (sub.user.email_bounced) continue;
    const since = sub.last_run_at ?? sub.created_at;
    const matches = await findNewMatches(sub.entity_type as EntityKind, sub.city_id, sub.query, since);

    // Always advance the watermark, even if there are zero matches, so the
    // next run only sees rows created after this point.
    await prisma.savedSearch.update({
      where: { id: sub.id },
      data: {
        last_run_at: now,
        ...(matches.length > 0 && { last_match_at: now }),
      },
    });

    if (matches.length === 0) continue;

    const segment = SEGMENT[sub.entity_type as EntityKind];
    // Reuse the listing-live template for V2.0; the dedicated "saved-search digest"
    // template is V2.1 polish.
    void sendListingLive({
      to: sub.user.email,
      firstName: sub.user.display_name,
      kind: "crafter", // template uses kind label only; pass crafter as the closest fit
      name: `${matches.length} new "${sub.query}" match${matches.length > 1 ? "es" : ""} in ${sub.city.display_name}`,
      publicUrl: `${SITE_URL}/${sub.city.slug}/${segment}?q=${encodeURIComponent(sub.query)}`,
    });
    emailed++;
  }

  await prisma.cronRun.create({ data: { job_name: "saved_search_alerts", status: "success", completed_at: new Date(), rows_affected: emailed } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({ ok: true, processed, emailed, at: now });
}
