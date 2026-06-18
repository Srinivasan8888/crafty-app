// POST /api/stores — create a store listing.
// Mirrors /api/crafters: same auth, rate limit, CSRF, slug, revalidate flow.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { phoneNumber } from "@/lib/phone";
import { uploadedImageUrl } from "@/lib/upload-url";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { sendListingLive } from "@/lib/email";

export const runtime = "nodejs";

const internalUploadPath = uploadedImageUrl;

const Schema = z.object({
  name: z.string().min(3).max(80),
  logo_photo: internalUploadPath,
  // generated base64 data-URL placeholder from lib/image.ts can exceed 500 chars
  logo_photo_blurhash: z.string().max(4000).optional().default(""),
  city_id: z.string().min(1).max(30),
  address: z.string().max(200).default(""),
  is_online_only: z.boolean().default(false),
  contact_phone: phoneNumber.optional().nullable(),
  contact_whatsapp: phoneNumber.optional().nullable(),
  contact_website: z.string().url().max(500).optional().nullable(),
  category_ids: z.array(z.string().max(30)).min(1).max(5),
  crafter_ids: z.array(z.string().max(30)).max(20).optional(),
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

  const rl = await rateLimit(req, "crafters"); // share crafter bucket; stores are lower volume
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

  // Issue 2.2 — 1-per-type cap enforced in app code.
  const existing = await prisma.store.count({
    where: { owner_user_id: user.id, status: { not: "DELETED" } },
  });
  if (existing >= 1) {
    return NextResponse.json({ error: "already_have_store" }, { status: 409 });
  }

  const city = await prisma.city.findUnique({
    where: { id: data.city_id },
    select: { id: true, slug: true, is_active: true },
  });
  if (!city || !city.is_active) {
    return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  const matchedCategories = await prisma.supplyCategory.count({
    where: { id: { in: data.category_ids }, is_active: true },
  });
  if (matchedCategories !== data.category_ids.length) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const crafterIds = data.crafter_ids ? [...new Set(data.crafter_ids)] : [];
  if (crafterIds.length > 0) {
    const matched = await prisma.crafter.count({ where: { id: { in: crafterIds }, status: "PUBLISHED" } });
    if (matched !== crafterIds.length) {
      return NextResponse.json({ error: "invalid_crafter" }, { status: 400 });
    }
  }

  const slug = await ensureUniqueSlug(data.name, async (s) =>
    !!(await prisma.store.findUnique({ where: { slug: s } })),
  );

  const created = await prisma.store.create({
    data: {
      slug,
      owner_user_id: user.id,
      name: data.name,
      logo_photo: data.logo_photo,
      logo_photo_blurhash: data.logo_photo_blurhash || null,
      city_id: data.city_id,
      address: data.address,
      is_online_only: data.is_online_only,
      contact_phone: data.contact_phone ?? null,
      contact_whatsapp: data.contact_whatsapp ?? null,
      contact_website: data.contact_website ?? null,
      supply_categories: { create: data.category_ids.map((cid) => ({ category_id: cid })) },
      ...(crafterIds.length > 0 && {
        tagged_crafters: { create: crafterIds.map((cid) => ({ crafter_id: cid })) },
      }),
    },
  });

  revalidatePath(`/${city.slug}`);
  revalidatePath(`/${city.slug}/stores`);

  void sendListingLive({
    to: user.email,
    firstName: user.display_name,
    kind: "store",
    name: data.name,
    publicUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${city.slug}/stores/${slug}`,
  });

  return NextResponse.json({ id: created.id, slug, city: city.slug }, { status: 201 });
}
