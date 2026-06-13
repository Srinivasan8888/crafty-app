// PATCH/DELETE /api/crafters/[id]
//
// Edit / soft-delete a crafter you own (or any crafter if you're admin).
// Slug rename writes a SlugRedirect row so old URLs keep working.

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
import { getMaxPortfolioPhotos } from "@/lib/subscription-gates";

export const runtime = "nodejs";

const internalUploadPath = uploadedImageUrl;

const PatchSchema = z.object({
  name: z.string().min(3).max(60).optional(),
  tagline: z.string().max(80).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  city_id: z.string().min(1).max(30).optional(),
  profile_photo: internalUploadPath.optional(),
  // V3 — schema cap is 12 (PRO ceiling); runtime check below enforces FREE=6.
  portfolio_photos: z.array(internalUploadPath).max(12).optional(),
  contact_whatsapp: phoneNumber.nullable().optional(),
  contact_instagram: z.string().max(40).nullable().optional(),
  contact_website: z.string().url().max(500).nullable().optional(),
  offers_classes: z.boolean().optional(),
  category_ids: z.array(z.string().max(30)).min(1).max(3).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await prisma.crafter.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, name: true, owner_user_id: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.category_ids) {
    const ok = await prisma.craftCategory.count({ where: { id: { in: data.category_ids }, is_active: true } });
    if (ok !== data.category_ids.length) return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  // V3 — enforce subscription-tier portfolio cap on edits.
  if (data.portfolio_photos) {
    const subRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { subscription_tier: true, subscription_expires_at: true },
    });
    const maxPhotos = getMaxPortfolioPhotos(subRow);
    if (data.portfolio_photos.length > maxPhotos) {
      return NextResponse.json({ error: "portfolio_cap_exceeded", max: maxPhotos }, { status: 400 });
    }
  }
  if (data.city_id) {
    const c = await prisma.city.findUnique({ where: { id: data.city_id }, select: { is_active: true } });
    if (!c || !c.is_active) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  // Slug rename + redirect write.
  let newSlug = existing.slug;
  if (data.name && data.name !== existing.name) {
    newSlug = await ensureUniqueSlug(data.name, async (s) =>
      !!(await prisma.crafter.findFirst({ where: { slug: s, NOT: { id: existing.id } } })),
    );
    if (newSlug !== existing.slug) {
      await prisma.slugRedirect.upsert({
        where: { entity_type_old_slug: { entity_type: "crafter", old_slug: existing.slug } },
        create: { entity_type: "crafter", old_slug: existing.slug, new_slug: newSlug },
        update: { new_slug: newSlug },
      });
    }
  }

  const updated = await prisma.crafter.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(newSlug !== existing.slug && { slug: newSlug }),
      ...(data.tagline !== undefined && { tagline: data.tagline }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.city_id !== undefined && { city_id: data.city_id }),
      ...(data.profile_photo !== undefined && { profile_photo: data.profile_photo }),
      ...(data.portfolio_photos !== undefined && { portfolio_photos: data.portfolio_photos }),
      ...(data.contact_whatsapp !== undefined && { contact_whatsapp: data.contact_whatsapp }),
      ...(data.contact_instagram !== undefined && { contact_instagram: data.contact_instagram }),
      ...(data.contact_website !== undefined && { contact_website: data.contact_website }),
      ...(data.offers_classes !== undefined && { offers_classes: data.offers_classes }),
      ...(data.category_ids && {
        craft_categories: {
          deleteMany: {},
          create: data.category_ids.map((cid) => ({ category_id: cid })),
        },
      }),
    },
    select: { slug: true, city: { select: { slug: true } } },
  });

  revalidatePath(`/${updated.city.slug}`);
  revalidatePath(`/${updated.city.slug}/crafters`);
  revalidatePath(`/${updated.city.slug}/crafters/${updated.slug}`);
  if (newSlug !== existing.slug) revalidatePath(`/${existing.city.slug}/crafters/${existing.slug}`);

  return NextResponse.json({ id: existing.id, slug: updated.slug, city: updated.city.slug });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await prisma.crafter.findUnique({
    where: { id: params.id },
    select: { owner_user_id: true, slug: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  await prisma.crafter.update({
    where: { id: params.id },
    data: { status: "DELETED", deleted_at: new Date(), hidden_by_user_id: user.id },
  });

  revalidatePath(`/${existing.city.slug}`);
  revalidatePath(`/${existing.city.slug}/crafters`);
  revalidatePath(`/${existing.city.slug}/crafters/${existing.slug}`);

  return NextResponse.json({ ok: true });
}
