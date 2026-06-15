// POST /api/events — create an event linked to one of the caller's listings.
//
// PRD §7.6 + Issue 1.2: organizer must be exactly one of (crafter | store | studio)
// owned by the authenticated user. The schema's 3-FK + CHECK constraint enforces
// this at the DB layer too.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadedImageUrl } from "@/lib/upload-url";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { sendListingLive } from "@/lib/email";
import { validateRrule } from "@/lib/rrule";

export const runtime = "nodejs";

const internalUploadPath = uploadedImageUrl;

const Schema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(20).max(2000),
  cover_image: internalUploadPath,
  // generated base64 data-URL placeholder from lib/image.ts can exceed 500 chars
  cover_image_blurhash: z.string().max(4000).optional().default(""),
  organizer_kind: z.enum(["CRAFTER", "STORE", "STUDIO"]),
  organizer_id: z.string().min(1).max(40),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  city_id: z.string().min(1).max(30),
  venue_name: z.string().min(1).max(120),
  venue_address: z.string().max(200).optional().nullable(),
  is_online: z.boolean().default(false),
  event_type: z.enum(["WORKSHOP", "FAIR", "EXHIBITION", "CLASS", "POPUP", "OTHER"]),
  craft_category_id: z.string().max(30).optional().nullable(),
  is_free: z.boolean(),
  price_amount: z.number().int().nonnegative().nullable().optional(),
  registration_url: z.string().url().max(500),
  recurrence_rule: z.string().max(200).optional().nullable(),
}).refine(
  (v) => new Date(v.end_at) > new Date(v.start_at),
  { message: "End time must be after start time" },
).refine(
  (v) => new Date(v.start_at).getTime() > Date.now() - 3600000,
  { message: "Start time cannot be in the past", path: ["start_at"] },
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

  const city = await prisma.city.findUnique({
    where: { id: data.city_id },
    select: { id: true, slug: true, is_active: true },
  });
  if (!city || !city.is_active) {
    return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  // Verify organizer ownership.
  let organizer_crafter_id: string | null = null;
  let organizer_store_id: string | null = null;
  let organizer_studio_id: string | null = null;

  if (data.organizer_kind === "CRAFTER") {
    const c = await prisma.crafter.findUnique({
      where: { id: data.organizer_id },
      select: { owner_user_id: true, status: true },
    });
    if (!c || c.owner_user_id !== user.id || c.status === "DELETED") {
      return NextResponse.json({ error: "organizer_not_yours" }, { status: 403 });
    }
    organizer_crafter_id = data.organizer_id;
  } else if (data.organizer_kind === "STORE") {
    const s = await prisma.store.findUnique({
      where: { id: data.organizer_id },
      select: { owner_user_id: true, status: true },
    });
    if (!s || s.owner_user_id !== user.id || s.status === "DELETED") {
      return NextResponse.json({ error: "organizer_not_yours" }, { status: 403 });
    }
    organizer_store_id = data.organizer_id;
  } else if (data.organizer_kind === "STUDIO") {
    const st = await prisma.studio.findUnique({
      where: { id: data.organizer_id },
      select: { owner_user_id: true, status: true },
    });
    if (!st || st.owner_user_id !== user.id || st.status === "DELETED") {
      return NextResponse.json({ error: "organizer_not_yours" }, { status: 403 });
    }
    organizer_studio_id = data.organizer_id;
  }

  if (data.craft_category_id) {
    const cat = await prisma.craftCategory.findUnique({
      where: { id: data.craft_category_id },
      select: { is_active: true },
    });
    if (!cat || !cat.is_active) {
      return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }
  }

  // V3 Tier 3 — validate the RRULE if present. Strict subset; see lib/rrule.ts.
  if (data.recurrence_rule) {
    try { validateRrule(data.recurrence_rule); }
    catch (e: any) {
      return NextResponse.json(
        { error: "invalid_rrule", reason: e?.message ?? "unknown" },
        { status: 400 },
      );
    }
  }

  const slug = await ensureUniqueSlug(data.name, async (s) =>
    !!(await prisma.event.findUnique({ where: { slug: s } })),
  );

  const created = await prisma.event.create({
    data: {
      slug,
      organizer_user_id: user.id,
      organizer_crafter_id,
      organizer_store_id,
      organizer_studio_id,
      name: data.name,
      description: data.description,
      cover_image: data.cover_image,
      cover_image_blurhash: data.cover_image_blurhash || null,
      start_at: new Date(data.start_at),
      end_at: new Date(data.end_at),
      city_id: data.city_id,
      venue_name: data.venue_name,
      venue_address: data.venue_address ?? null,
      is_online: data.is_online,
      event_type: data.event_type,
      craft_category_id: data.craft_category_id ?? null,
      is_free: data.is_free,
      price_amount: data.is_free ? null : data.price_amount ?? null,
      registration_url: data.registration_url,
      recurrence_rule: data.recurrence_rule || null,
    },
  });

  revalidatePath(`/${city.slug}`);
  revalidatePath(`/${city.slug}/events`);

  void sendListingLive({
    to: user.email,
    firstName: user.display_name,
    kind: "event",
    name: data.name,
    publicUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${city.slug}/events/${slug}`,
  });

  return NextResponse.json({ id: created.id, slug, city: city.slug }, { status: 201 });
}
