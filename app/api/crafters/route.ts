import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { sendListingLive } from "@/lib/email";
import { getMaxPortfolioPhotos } from "@/lib/subscription-gates";

export const runtime = "nodejs";

// S12 — only same-origin uploads are accepted as photo URLs. We previously
// allowed any external https:// URL, which let attackers store tracker /
// phishing pixels rendered server-side as og:image and on the public profile.
const internalUploadPath = z.string().startsWith("/uploads/");

const Schema = z.object({
  name: z.string().min(3).max(60),
  tagline: z.string().max(80).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  city_id: z.string().min(1).max(30),
  profile_photo: internalUploadPath,
  profile_photo_blurhash: z.string().max(500).optional().default(""),
  // V3 — schema cap is 12 (the PRO ceiling); runtime check below enforces 6
  // for FREE users via getMaxPortfolioPhotos().
  portfolio_photos: z.array(internalUploadPath).max(12).default([]),
  portfolio_blurhashes: z.array(z.string().max(500)).max(12).default([]),
  contact_whatsapp: z.string().max(40).optional().nullable(),
  contact_instagram: z.string().max(40).optional().nullable(),
  contact_website: z.string().url().max(500).optional().nullable(),
  offers_classes: z.boolean().default(false),
  category_ids: z.array(z.string().max(30)).min(1).max(3),
}).refine(
  (v) => Boolean(v.contact_whatsapp || v.contact_instagram || v.contact_website),
  { message: "At least one contact method is required" }
);

export async function POST(req: NextRequest) {
  // S5 — CSRF defense in depth. SameSite cookies cover the common case but
  // we explicitly verify the request origin matches our deployed host.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
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

  // V3 — enforce subscription-tier portfolio cap. FREE = 6, PRO = 12.
  // Schema accepts up to 12; this runtime check rejects FREE users who
  // try to slip in more than their cap.
  const subRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscription_tier: true, subscription_expires_at: true },
  });
  const maxPhotos = getMaxPortfolioPhotos(subRow);
  if (data.portfolio_photos.length > maxPhotos) {
    return NextResponse.json({ error: "portfolio_cap_exceeded", max: maxPhotos }, { status: 400 });
  }

  // Issue 2.2 — enforce 1-per-type cap in app code (schema dropped @unique).
  const existing = await prisma.crafter.count({ where: { owner_user_id: user.id } });
  if (existing >= 1) {
    return NextResponse.json({ error: "already_have_crafter" }, { status: 409 });
  }

  const city = await prisma.city.findUnique({
    where: { id: data.city_id },
    select: { id: true, slug: true, is_active: true },
  });
  if (!city || !city.is_active) {
    return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  // S8 — verify category IDs actually exist AND are active. Without this,
  // a client can pass arbitrary cuid-shaped strings and either trip a 500
  // on FK violation or, worse, attach the listing to inactive/admin-only
  // categories that aren't supposed to be selectable.
  const matchedCategories = await prisma.craftCategory.count({
    where: { id: { in: data.category_ids }, is_active: true },
  });
  if (matchedCategories !== data.category_ids.length) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const slug = await ensureUniqueSlug(data.name, async (s) =>
    !!(await prisma.crafter.findUnique({ where: { slug: s } }))
  );

  const created = await prisma.crafter.create({
    data: {
      slug,
      owner_user_id: user.id,
      name: data.name,
      tagline: data.tagline ?? null,
      bio: data.bio ?? null,
      city_id: data.city_id,
      profile_photo: data.profile_photo,
      profile_photo_blurhash: data.profile_photo_blurhash || null,
      portfolio_photos: data.portfolio_photos,
      portfolio_blurhashes: data.portfolio_blurhashes,
      contact_whatsapp: data.contact_whatsapp ?? null,
      contact_instagram: data.contact_instagram ?? null,
      contact_website: data.contact_website ?? null,
      offers_classes: data.offers_classes,
      craft_categories: { create: data.category_ids.map((cid) => ({ category_id: cid })) },
    },
  });

  // Issue 4.3 — on-demand revalidation
  revalidatePath(`/${city.slug}`);
  revalidatePath(`/${city.slug}/crafters`);

  // Fire-and-forget email. Failure never blocks the response.
  void sendListingLive({
    to: user.email,
    firstName: user.display_name,
    kind: "crafter",
    name: data.name,
    publicUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${city.slug}/crafters/${slug}`,
  });

  return NextResponse.json({ id: created.id, slug, city: city.slug }, { status: 201 });
}
