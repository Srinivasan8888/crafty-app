// V3 Tier 3 — Open Read API. GET /api/public/v1/studios?city=…

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

  const rows = await prisma.studio.findMany({
    where: { city_id: city.id, status: "PUBLISHED" },
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, slug: true, name: true, logo_photo: true, address: true,
      is_online_only: true, age_group: true,
      contact_phone: true, contact_whatsapp: true, contact_website: true,
      is_featured: true, created_at: true,
      craft_disciplines: { select: { discipline: { select: { slug: true, display_name: true } } } },
    },
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const next_cursor = hasMore ? slice[slice.length - 1].id : null;

  const data = slice.map((st) => ({
    id: st.id, slug: st.slug, name: st.name,
    logo_photo: st.logo_photo,
    address: st.address,
    is_online_only: st.is_online_only,
    age_group: st.age_group,
    city: { slug: city.slug, display_name: city.display_name },
    contact: {
      phone: st.contact_phone ?? null,
      whatsapp: st.contact_whatsapp ?? null,
      website: st.contact_website ?? null,
    },
    disciplines: st.craft_disciplines.map((j) => ({
      slug: j.discipline.slug, display_name: j.discipline.display_name,
    })),
    is_featured: st.is_featured,
    created_at: st.created_at.toISOString(),
  }));

  return NextResponse.json({ data, next_cursor }, { headers: PUBLIC_API_CACHE_HEADERS });
}
