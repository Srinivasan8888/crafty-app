// V3 Tier 3 — Open Read API. GET single event by slug.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiKeyError, PUBLIC_API_CACHE_HEADERS } from "@/lib/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return apiKeyError(auth);

  const citySlug = req.nextUrl.searchParams.get("city");

  const e = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, slug: true, name: true, description: true, cover_image: true,
      start_at: true, end_at: true, venue_name: true, venue_address: true,
      is_online: true, event_type: true, is_free: true, price_amount: true,
      price_currency: true, registration_url: true,
      recurrence_rule: true, recurrence_master_id: true,
      is_featured: true, status: true, created_at: true,
      city: { select: { slug: true, display_name: true, is_active: true } },
      craft_category: { select: { slug: true, display_name: true } },
    },
  });
  if (!e || e.status !== "PUBLISHED" || !e.city.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (citySlug && e.city.slug !== citySlug) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: e.id, slug: e.slug, name: e.name,
    description: e.description,
    cover_image: e.cover_image,
    start_at: e.start_at.toISOString(),
    end_at: e.end_at.toISOString(),
    city: { slug: e.city.slug, display_name: e.city.display_name },
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
    recurrence_rule: e.recurrence_rule ?? null,
    is_recurrence_occurrence: e.recurrence_master_id !== null,
    created_at: e.created_at.toISOString(),
  }, { headers: PUBLIC_API_CACHE_HEADERS });
}
