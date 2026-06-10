// V3 Tier 3 — Open Read API. GET /api/public/v1/stores?city=…

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
  const limit = Math.min(MAX_LIMIT, parseInt(url.searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT);
  const cursor = url.searchParams.get("cursor") || undefined;

  if (!citySlug) return NextResponse.json({ error: "missing_city" }, { status: 400 });
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, slug: true, display_name: true, is_active: true },
  });
  if (!city || !city.is_active) return NextResponse.json({ error: "city_not_found" }, { status: 404 });

  const rows = await prisma.store.findMany({
    where: { city_id: city.id, status: "PUBLISHED" },
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, name: true, logo_photo: true, address: true,
      is_online_only: true, contact_phone: true, contact_whatsapp: true, contact_website: true,
      is_featured: true, created_at: true,
      supply_categories: { select: { category: { select: { slug: true, display_name: true } } } },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const next_cursor = hasMore ? slice[slice.length - 1].id : null;

  const data = slice.map((s) => ({
    id: s.id, slug: s.slug, name: s.name,
    logo_photo: s.logo_photo,
    address: s.address,
    is_online_only: s.is_online_only,
    city: { slug: city.slug, display_name: city.display_name },
    contact: {
      phone: s.contact_phone ?? null,
      whatsapp: s.contact_whatsapp ?? null,
      website: s.contact_website ?? null,
    },
    categories: s.supply_categories.map((j) => ({
      slug: j.category.slug, display_name: j.category.display_name,
    })),
    is_featured: s.is_featured,
    created_at: s.created_at.toISOString(),
  }));

  return NextResponse.json({ data, next_cursor }, { headers: PUBLIC_API_CACHE_HEADERS });
}
