// V3 Tier 3 — Open Read API. GET single crafter by slug.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiKeyError, PUBLIC_API_CACHE_HEADERS } from "@/lib/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return apiKeyError(auth);

  const citySlug = req.nextUrl.searchParams.get("city");

  const c = await prisma.crafter.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, slug: true, name: true, tagline: true, bio: true,
      profile_photo: true, portfolio_photos: true,
      contact_whatsapp: true, contact_instagram: true, contact_website: true,
      offers_classes: true, classes_json: true,
      is_featured: true, status: true, created_at: true,
      city: { select: { slug: true, display_name: true, is_active: true } },
      craft_categories: { select: { category: { select: { slug: true, display_name: true } } } },
    },
  });
  if (!c || c.status !== "PUBLISHED" || !c.city.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (citySlug && c.city.slug !== citySlug) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    bio: c.bio,
    profile_photo: c.profile_photo,
    portfolio_photos: c.portfolio_photos,
    city: { slug: c.city.slug, display_name: c.city.display_name },
    contact: {
      whatsapp: c.contact_whatsapp ?? null,
      instagram: c.contact_instagram ?? null,
      website: c.contact_website ?? null,
    },
    categories: c.craft_categories.map((j) => ({
      slug: j.category.slug, display_name: j.category.display_name,
    })),
    offers_classes: c.offers_classes,
    classes: c.classes_json ?? null,
    is_featured: c.is_featured,
    created_at: c.created_at.toISOString(),
  }, { headers: PUBLIC_API_CACHE_HEADERS });
}
