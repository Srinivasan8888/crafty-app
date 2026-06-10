import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const internalUploadPath = z.string().startsWith("/uploads/");

const PatchSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  logo_photo: internalUploadPath.optional(),
  city_id: z.string().min(1).max(30).optional(),
  address: z.string().max(200).optional(),
  is_online_only: z.boolean().optional(),
  age_group: z.string().max(40).nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  contact_whatsapp: z.string().max(40).nullable().optional(),
  contact_website: z.string().url().max(500).nullable().optional(),
  discipline_ids: z.array(z.string().max(30)).min(1).max(5).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await prisma.studio.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, name: true, owner_user_id: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if (data.discipline_ids) {
    const ok = await prisma.discipline.count({ where: { id: { in: data.discipline_ids }, is_active: true } });
    if (ok !== data.discipline_ids.length) return NextResponse.json({ error: "invalid_discipline" }, { status: 400 });
  }
  if (data.city_id) {
    const c = await prisma.city.findUnique({ where: { id: data.city_id }, select: { is_active: true } });
    if (!c || !c.is_active) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  let newSlug = existing.slug;
  if (data.name && data.name !== existing.name) {
    newSlug = await ensureUniqueSlug(data.name, async (s) =>
      !!(await prisma.studio.findFirst({ where: { slug: s, NOT: { id: existing.id } } })),
    );
    if (newSlug !== existing.slug) {
      await prisma.slugRedirect.upsert({
        where: { entity_type_old_slug: { entity_type: "studio", old_slug: existing.slug } },
        create: { entity_type: "studio", old_slug: existing.slug, new_slug: newSlug },
        update: { new_slug: newSlug },
      });
    }
  }

  const updated = await prisma.studio.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(newSlug !== existing.slug && { slug: newSlug }),
      ...(data.logo_photo !== undefined && { logo_photo: data.logo_photo }),
      ...(data.city_id !== undefined && { city_id: data.city_id }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.is_online_only !== undefined && { is_online_only: data.is_online_only }),
      ...(data.age_group !== undefined && { age_group: data.age_group }),
      ...(data.contact_phone !== undefined && { contact_phone: data.contact_phone }),
      ...(data.contact_whatsapp !== undefined && { contact_whatsapp: data.contact_whatsapp }),
      ...(data.contact_website !== undefined && { contact_website: data.contact_website }),
      ...(data.discipline_ids && {
        craft_disciplines: {
          deleteMany: {},
          create: data.discipline_ids.map((did) => ({ discipline_id: did })),
        },
      }),
    },
    select: { slug: true, city: { select: { slug: true } } },
  });

  revalidatePath(`/${updated.city.slug}`);
  revalidatePath(`/${updated.city.slug}/learn`);
  revalidatePath(`/${updated.city.slug}/learn/${updated.slug}`);
  if (newSlug !== existing.slug) {
    revalidatePath(`/${existing.city.slug}/learn/${existing.slug}`);
  }

  return NextResponse.json({ id: existing.id, slug: updated.slug, city: updated.city.slug });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "crafters");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await prisma.studio.findUnique({
    where: { id: params.id },
    select: { owner_user_id: true, slug: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  await prisma.studio.update({
    where: { id: params.id },
    data: { status: "DELETED", deleted_at: new Date(), hidden_by_user_id: user.id },
  });
  revalidatePath(`/${existing.city.slug}`);
  revalidatePath(`/${existing.city.slug}/learn`);
  revalidatePath(`/${existing.city.slug}/learn/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
