import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { validateRrule } from "@/lib/rrule";

export const runtime = "nodejs";

const internalUploadPath = z.string().startsWith("/uploads/");

const PatchSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(20).max(2000).optional(),
  cover_image: internalUploadPath.optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  city_id: z.string().min(1).max(30).optional(),
  venue_name: z.string().min(1).max(120).optional(),
  venue_address: z.string().max(200).nullable().optional(),
  is_online: z.boolean().optional(),
  event_type: z.enum(["WORKSHOP", "FAIR", "EXHIBITION", "CLASS", "POPUP", "OTHER"]).optional(),
  craft_category_id: z.string().max(30).nullable().optional(),
  is_free: z.boolean().optional(),
  price_amount: z.number().nonnegative().nullable().optional(),
  registration_url: z.string().url().max(500).optional(),
  recurrence_rule: z.string().max(200).nullable().optional(),
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

  const existing = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, name: true, organizer_user_id: true, start_at: true, end_at: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.organizer_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const newStart = data.start_at ? new Date(data.start_at) : existing.start_at;
  const newEnd = data.end_at ? new Date(data.end_at) : existing.end_at;
  if (newEnd <= newStart) {
    return NextResponse.json({ error: "validation", details: { fieldErrors: { end_at: ["End must be after start"] } } }, { status: 400 });
  }

  if (data.city_id) {
    const c = await prisma.city.findUnique({ where: { id: data.city_id }, select: { is_active: true } });
    if (!c || !c.is_active) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }
  if (data.craft_category_id) {
    const cat = await prisma.craftCategory.findUnique({ where: { id: data.craft_category_id }, select: { is_active: true } });
    if (!cat || !cat.is_active) return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  if (data.recurrence_rule) {
    try { validateRrule(data.recurrence_rule); }
    catch (e: any) {
      return NextResponse.json(
        { error: "invalid_rrule", reason: e?.message ?? "unknown" },
        { status: 400 },
      );
    }
  }

  let newSlug = existing.slug;
  if (data.name && data.name !== existing.name) {
    newSlug = await ensureUniqueSlug(data.name, async (s) =>
      !!(await prisma.event.findFirst({ where: { slug: s, NOT: { id: existing.id } } })),
    );
    if (newSlug !== existing.slug) {
      await prisma.slugRedirect.upsert({
        where: { entity_type_old_slug: { entity_type: "event", old_slug: existing.slug } },
        create: { entity_type: "event", old_slug: existing.slug, new_slug: newSlug },
        update: { new_slug: newSlug },
      });
    }
  }

  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(newSlug !== existing.slug && { slug: newSlug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.cover_image !== undefined && { cover_image: data.cover_image }),
      ...(data.start_at !== undefined && { start_at: new Date(data.start_at) }),
      ...(data.end_at !== undefined && { end_at: new Date(data.end_at) }),
      ...(data.city_id !== undefined && { city_id: data.city_id }),
      ...(data.venue_name !== undefined && { venue_name: data.venue_name }),
      ...(data.venue_address !== undefined && { venue_address: data.venue_address }),
      ...(data.is_online !== undefined && { is_online: data.is_online }),
      ...(data.event_type !== undefined && { event_type: data.event_type }),
      ...(data.craft_category_id !== undefined && { craft_category_id: data.craft_category_id }),
      ...(data.is_free !== undefined && { is_free: data.is_free }),
      ...(data.price_amount !== undefined && { price_amount: data.is_free === true ? null : data.price_amount }),
      ...(data.registration_url !== undefined && { registration_url: data.registration_url }),
      ...(data.recurrence_rule !== undefined && { recurrence_rule: data.recurrence_rule || null }),
    },
    select: { slug: true, city: { select: { slug: true } } },
  });

  revalidatePath(`/${updated.city.slug}`);
  revalidatePath(`/${updated.city.slug}/events`);
  revalidatePath(`/${updated.city.slug}/events/${updated.slug}`);
  if (newSlug !== existing.slug) {
    revalidatePath(`/${existing.city.slug}/events/${existing.slug}`);
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

  const existing = await prisma.event.findUnique({
    where: { id: params.id },
    select: { organizer_user_id: true, slug: true, city: { select: { slug: true } } },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.organizer_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  await prisma.event.update({
    where: { id: params.id },
    data: { status: "DELETED", deleted_at: new Date(), hidden_by_user_id: user.id },
  });
  revalidatePath(`/${existing.city.slug}`);
  revalidatePath(`/${existing.city.slug}/events`);
  revalidatePath(`/${existing.city.slug}/events/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
