// V3 Tier 3 — Open Read API. GET single store by slug.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiKeyError, PUBLIC_API_CACHE_HEADERS } from "@/lib/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return apiKeyError(auth);

  const citySlug = req.nextUrl.searchParams.get("city");

  const s = await prisma.store.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, slug: true, name: true, logo_photo: true, address: true,
      is_online_only: true,
      contact_phone: true, contact_whatsapp: true, contact_website: true,
      operating_hours: true,
      is_featured: true, status: true, created_at: true,
      city: { select: { slug: true, display_name: true, is_active: true } },
      supply_categories: { select: { category: { select: { slug: true, display_name: true } } } },
    },
  });
  if (!s || s.status !== "PUBLISHED" || !s.city.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (citySlug && s.city.slug !== citySlug) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: s.id, slug: s.slug, name: s.name,
    logo_photo: s.logo_photo,
    address: s.address,
    is_online_only: s.is_online_only,
    city: { slug: s.city.slug, display_name: s.city.display_name },
    contact: {
      phone: s.contact_phone ?? null,
      whatsapp: s.contact_whatsapp ?? null,
      website: s.contact_website ?? null,
    },
    operating_hours: s.operating_hours ?? null,
    categories: s.supply_categories.map((j) => ({
      slug: j.category.slug, display_name: j.category.display_name,
    })),
    is_featured: s.is_featured,
    created_at: s.created_at.toISOString(),
  }, { headers: PUBLIC_API_CACHE_HEADERS });
}
