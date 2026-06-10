// V3 Tier 3 — Open Read API. GET single studio by slug.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey, apiKeyError, PUBLIC_API_CACHE_HEADERS } from "@/lib/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return apiKeyError(auth);

  const citySlug = req.nextUrl.searchParams.get("city");

  const st = await prisma.studio.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, slug: true, name: true, logo_photo: true, address: true,
      is_online_only: true, age_group: true,
      contact_phone: true, contact_whatsapp: true, contact_website: true,
      operating_hours: true, ongoing_courses: true,
      is_featured: true, status: true, created_at: true,
      city: { select: { slug: true, display_name: true, is_active: true } },
      craft_disciplines: { select: { discipline: { select: { slug: true, display_name: true } } } },
    },
  });
  if (!st || st.status !== "PUBLISHED" || !st.city.is_active) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (citySlug && st.city.slug !== citySlug) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: st.id, slug: st.slug, name: st.name,
    logo_photo: st.logo_photo,
    address: st.address,
    is_online_only: st.is_online_only,
    age_group: st.age_group,
    city: { slug: st.city.slug, display_name: st.city.display_name },
    contact: {
      phone: st.contact_phone ?? null,
      whatsapp: st.contact_whatsapp ?? null,
      website: st.contact_website ?? null,
    },
    operating_hours: st.operating_hours ?? null,
    ongoing_courses: st.ongoing_courses ?? null,
    disciplines: st.craft_disciplines.map((j) => ({
      slug: j.discipline.slug, display_name: j.discipline.display_name,
    })),
    is_featured: st.is_featured,
    created_at: st.created_at.toISOString(),
  }, { headers: PUBLIC_API_CACHE_HEADERS });
}
