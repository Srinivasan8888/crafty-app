// V3 Tier 3 — materialize the next ~4 occurrences of every recurring event
// series. Runs daily (Replit Cron / Vercel Cron). Idempotent — re-running
// only inserts missing rows; never duplicates.
//
// The "master" Event row holds the recurrence_rule. Each materialized
// occurrence is a CLONE with recurrence_master_id set, recurrence_rule null,
// and a deterministic slug "<master.slug>-YYYY-MM-DD" so we can detect
// existing occurrences without a separate sentinel field.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseRrule, expandRrule } from "@/lib/rrule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OCCURRENCES_PER_RUN = 4;
const WINDOW_DAYS = 60;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 86400000);

  // Only series masters: have a rule, AND are not themselves an occurrence.
  const masters = await prisma.event.findMany({
    where: {
      recurrence_rule: { not: null },
      recurrence_master_id: null,
      status: { in: ["PUBLISHED", "UNPUBLISHED"] },
    },
    select: {
      id: true, slug: true, organizer_user_id: true,
      organizer_crafter_id: true, organizer_store_id: true, organizer_studio_id: true,
      name: true, description: true, cover_image: true, cover_image_blurhash: true,
      start_at: true, end_at: true, city_id: true, venue_name: true, venue_address: true,
      is_online: true, event_type: true, craft_category_id: true,
      is_free: true, price_amount: true, price_currency: true, registration_url: true,
      recurrence_rule: true,
    },
  });

  let createdTotal = 0;
  const seriesProcessed: { id: string; created: number; skipped_reason?: string }[] = [];

  for (const m of masters) {
    let occurrences: Date[];
    try {
      const rule = parseRrule(m.recurrence_rule!);
      occurrences = expandRrule(rule, m.start_at, 200);
    } catch {
      seriesProcessed.push({ id: m.id, created: 0, skipped_reason: "invalid_rrule" });
      continue;
    }

    // We want the next OCCURRENCES_PER_RUN that fall within the window AND
    // are not yet present in the DB. Skip the master's own start date.
    const candidates = occurrences.filter((d) =>
      d.getTime() > now.getTime() && d.getTime() <= windowEnd.getTime()
    );

    if (candidates.length === 0) {
      seriesProcessed.push({ id: m.id, created: 0 });
      continue;
    }

    // Look up existing occurrence slugs for this master, to skip duplicates.
    const existing = await prisma.event.findMany({
      where: { recurrence_master_id: m.id },
      select: { slug: true },
    });
    const existingSlugs = new Set(existing.map((e) => e.slug));

    const eventDurationMs = m.end_at.getTime() - m.start_at.getTime();
    let createdThis = 0;

    for (const occ of candidates) {
      if (createdThis >= OCCURRENCES_PER_RUN) break;
      const occSlug = `${m.slug}-${isoDate(occ)}`;
      if (existingSlugs.has(occSlug)) continue;

      // Also skip if a non-occurrence event already has this slug (e.g.
      // someone manually created one). Slug column has @unique.
      const collision = await prisma.event.findUnique({
        where: { slug: occSlug }, select: { id: true },
      });
      if (collision) continue;

      const endAt = new Date(occ.getTime() + eventDurationMs);
      try {
        await prisma.event.create({
          data: {
            slug: occSlug,
            organizer_user_id: m.organizer_user_id,
            organizer_crafter_id: m.organizer_crafter_id,
            organizer_store_id: m.organizer_store_id,
            organizer_studio_id: m.organizer_studio_id,
            name: m.name,
            description: m.description,
            cover_image: m.cover_image,
            cover_image_blurhash: m.cover_image_blurhash,
            start_at: occ,
            end_at: endAt,
            city_id: m.city_id,
            venue_name: m.venue_name,
            venue_address: m.venue_address,
            is_online: m.is_online,
            event_type: m.event_type,
            craft_category_id: m.craft_category_id,
            is_free: m.is_free,
            price_amount: m.price_amount,
            price_currency: m.price_currency,
            registration_url: m.registration_url,
            recurrence_master_id: m.id,
          },
        });
        createdThis += 1;
        createdTotal += 1;
      } catch (e) {
        // Continue — a unique-slug race is the most likely cause and is benign.
        console.error("[materialize-recurring-events] create failed", m.id, occSlug, e);
      }
    }
    seriesProcessed.push({ id: m.id, created: createdThis });
  }

  return NextResponse.json({
    now: now.toISOString(),
    window_end: windowEnd.toISOString(),
    masters: masters.length,
    created: createdTotal,
    series: seriesProcessed,
  });
}
