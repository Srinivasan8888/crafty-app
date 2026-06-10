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

async function findNewMatches(
  entity: EntityKind,
  cityId: string,
  query: string,
  since: Date,
): Promise<Array<{ name: string; slug: string; created_at: Date }>> {
  const q = `%${query}%`;
  const base = {
    city_id: cityId,
    status: "PUBLISHED" as const,
    created_at: { gte: since },
    name: { contains: query, mode: "insensitive" as const },
  };
  switch (entity) {
    case "CRAFTER":
      return prisma.crafter.findMany({ where: base, select: { name: true, slug: true, created_at: true }, take: 20 });
    case "STORE":
      return prisma.store.findMany({ where: base, select: { name: true, slug: true, created_at: true }, take: 20 });
    case "STUDIO":
      return prisma.studio.findMany({ where: base, select: { name: true, slug: true, created_at: true }, take: 20 });
    case "EVENT":
      return prisma.event.findMany({
        where: { ...base, end_at: { gte: new Date() } },
        select: { name: true, slug: true, created_at: true },
        take: 20,
      });
  }
  // Touch `q` so the unused-var linter stays happy in some configs (kept for the LIKE pattern variant).
  void q;
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

  return NextResponse.json({ ok: true, processed, emailed, at: now });
}
