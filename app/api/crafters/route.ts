import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

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
  portfolio_photos: z.array(internalUploadPath).max(6).default([]),
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

  const rl = rateLimit(req, "crafters");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

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
      portfolio_photos: data.portfolio_photos,
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

  return NextResponse.json({ id: created.id, slug, city: city.slug }, { status: 201 });
}
