// POST /api/studios — create a studio (Learn) listing.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { sendListingLive } from "@/lib/email";

export const runtime = "nodejs";

const internalUploadPath = z.string().startsWith("/uploads/");

const Schema = z.object({
  name: z.string().min(3).max(80),
  logo_photo: internalUploadPath,
  logo_photo_blurhash: z.string().max(500).optional().default(""),
  city_id: z.string().min(1).max(30),
  address: z.string().max(200).default(""),
  is_online_only: z.boolean().default(false),
  age_group: z.string().max(40).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  contact_whatsapp: z.string().max(40).optional().nullable(),
  contact_website: z.string().url().max(500).optional().nullable(),
  discipline_ids: z.array(z.string().max(30)).min(1).max(5),
})
  .refine(
    (v) => Boolean(v.contact_phone || v.contact_whatsapp || v.contact_website),
    { message: "At least one contact method is required" },
  )
  .refine(
    (v) => v.is_online_only || v.address.trim().length > 0,
    { message: "Address required unless online-only" },
  );

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") {
      return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    }
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.studio.count({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
  });
  if (existing >= 1) {
    return NextResponse.json({ error: "already_have_studio" }, { status: 409 });
  }

  const city = await prisma.city.findUnique({
    where: { id: data.city_id },
    select: { id: true, slug: true, is_active: true },
  });
  if (!city || !city.is_active) {
    return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  const matchedDisciplines = await prisma.discipline.count({
    where: { id: { in: data.discipline_ids }, is_active: true },
  });
  if (matchedDisciplines !== data.discipline_ids.length) {
    return NextResponse.json({ error: "invalid_discipline" }, { status: 400 });
  }

  const slug = await ensureUniqueSlug(data.name, async (s) =>
    !!(await prisma.studio.findUnique({ where: { slug: s } })),
  );

  const created = await prisma.studio.create({
    data: {
      slug,
      owner_user_id: user.id,
      name: data.name,
      logo_photo: data.logo_photo,
      logo_photo_blurhash: data.logo_photo_blurhash || null,
      city_id: data.city_id,
      address: data.address,
      is_online_only: data.is_online_only,
      age_group: data.age_group ?? null,
      contact_phone: data.contact_phone ?? null,
      contact_whatsapp: data.contact_whatsapp ?? null,
      contact_website: data.contact_website ?? null,
      craft_disciplines: { create: data.discipline_ids.map((did) => ({ discipline_id: did })) },
    },
  });

  revalidatePath(`/${city.slug}`);
  revalidatePath(`/${city.slug}/learn`);

  void sendListingLive({
    to: user.email,
    firstName: user.display_name,
    kind: "studio",
    name: data.name,
    publicUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${city.slug}/learn/${slug}`,
  });

  return NextResponse.json({ id: created.id, slug, city: city.slug }, { status: 201 });
}
