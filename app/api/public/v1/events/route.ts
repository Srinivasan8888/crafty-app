// V3 Tier 3 — Open Read API. GET /api/public/v1/events?city=…&from=ISO&to=ISO

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiKeyError, PUBLIC_API_CACHE_HEADERS } from "@/lib/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return apiKeyError(auth);

  const url = req.nextUrl;
  const citySlug = url.searchParams.get("city");
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const limit = Math.min(MAX_LIMIT, parseInt(url.searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT);
  const cursor = url.searchParams.get("cursor") || undefined;

  if (!citySlug) return NextResponse.json({ error: "missing_city" }, { status: 400 });
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, slug: true, display_name: true, is_active: true },
  });
  if (!city || !city.is_active) return NextResponse.json({ error: "city_not_found" }, { status: 404 });

  const from = fromStr ? new Date(fromStr) : new Date();
  const to = toStr ? new Date(toStr) : new Date(Date.now() + 365 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "invalid_date_range" }, { status: 400 });
  }

  const rows = await prisma.event.findMany({
    where: {
      city_id: city.id, status: "PUBLISHED",
      start_at: { gte: from, lte: to },
    },
    orderBy: [{ start_at: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, name: true, description: true, cover_image: true,
      start_at: true, end_at: true, venue_name: true, venue_address: true,
      is_online: true, event_type: true, is_free: true, price_amount: true,
      price_currency: true, registration_url: true,
      recurrence_master_id: true,
      is_featured: true, created_at: true,
      craft_category: { select: { slug: true, display_name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const next_cursor = hasMore ? slice[slice.length - 1].id : null;

  const data = slice.map((e) => ({
    id: e.id, slug: e.slug, name: e.name,
    description: e.description,
    cover_image: e.cover_image,
    start_at: e.start_at.toISOString(),
    end_at: e.end_at.toISOString(),
    city: { slug: city.slug, display_name: city.display_name },
    venue_name: e.venue_name,
    venue_address: e.venue_address,
    is_online: e.is_online,
    event_type: e.event_type,
    category: e.craft_category
      ? { slug: e.craft_category.slug, display_name: e.craft_category.display_name }
      : null,
    is_free: e.is_free,
    price_amount: e.price_amount ? Number(e.price_amount) : null,
    price_currency: e.price_currency,
    registration_url: e.registration_url,
    is_featured: e.is_featured,
    is_recurrence_occurrence: e.recurrence_master_id !== null,
    created_at: e.created_at.toISOString(),
  }));

  return NextResponse.json({ data, next_cursor }, { headers: PUBLIC_API_CACHE_HEADERS });
}
