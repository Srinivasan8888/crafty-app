// V3 Tier 3 — Open Read API.
// GET /api/public/v1/crafters?city=bengaluru&limit=50&cursor=…
//
// Auth: Bearer <api-key>. Public-safe fields only — no owner email / id.
// Response: { data: [...], next_cursor: string | null }

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

  if (!citySlug) {
    return NextResponse.json({ error: "missing_city" }, { status: 400 });
  }
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    select: { id: true, slug: true, display_name: true, is_active: true },
  });
  if (!city || !city.is_active) {
    return NextResponse.json({ error: "city_not_found" }, { status: 404 });
  }

  const rows = await prisma.crafter.findMany({
    where: { city_id: city.id, status: "PUBLISHED" },
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, name: true, tagline: true, bio: true,
      profile_photo: true, portfolio_photos: true,
      contact_whatsapp: true, contact_instagram: true, contact_website: true,
      offers_classes: true,
      is_featured: true, created_at: true,
      craft_categories: { select: { category: { select: { slug: true, display_name: true } } } },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const next_cursor = hasMore ? slice[slice.length - 1].id : null;

  const data = slice.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    bio: c.bio,
    profile_photo: c.profile_photo,
    portfolio_photos: c.portfolio_photos,
    city: { slug: city.slug, display_name: city.display_name },
    contact: {
      whatsapp: c.contact_whatsapp ?? null,
      instagram: c.contact_instagram ?? null,
      website: c.contact_website ?? null,
    },
    categories: c.craft_categories.map((j) => ({
      slug: j.category.slug, display_name: j.category.display_name,
    })),
    offers_classes: c.offers_classes,
    is_featured: c.is_featured,
    created_at: c.created_at.toISOString(),
  }));

  return NextResponse.json({ data, next_cursor }, { headers: PUBLIC_API_CACHE_HEADERS });
}
