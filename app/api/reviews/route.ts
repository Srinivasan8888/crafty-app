// V2.0 — buyer reviews on creator listings. One review per (entity, author).
//
// POST: create or update the caller's review for an entity.
// DELETE ?id=...: remove the caller's own review (or any review if admin).
//
// PRD §24 — admin moderation. We add a "hide" mutation here so admin actions
// land alongside the review create/update flow rather than in a new file.
//
// V3 Tier 2 — accept up to 4 photos + photo_blurhashes (matching uploads to
// /uploads/review-photos/...). Also stamp `verified_purchase_order_id` when
// the author has a PAID Order with an item from this listing's owner.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const reviewPhotoPath = z
  .string()
  .startsWith("/uploads/review-photos/")
  .max(300);

const Schema = z.object({
  entity_type: z.enum(["CRAFTER", "STORE", "STUDIO"]),
  entity_id: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional().nullable(),
  photos: z.array(reviewPhotoPath).max(4).optional().default([]),
  photo_blurhashes: z.array(z.string().max(500)).max(4).optional().default([]),
});

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

async function loadEntity(kind: "CRAFTER" | "STORE" | "STUDIO", id: string) {
  if (kind === "CRAFTER") return prisma.crafter.findUnique({ where: { id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
  if (kind === "STORE")   return prisma.store.findUnique({ where: { id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
  return prisma.studio.findUnique({ where: { id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
}

/**
 * Look up the most recent PAID Order in which the author bought from this
 * listing's owner. Returns that Order's id (used as the
 * `verified_purchase_order_id` stamp on the Review). Returns null if none.
 */
async function findVerifiedPurchase(authorId: string, ownerId: string): Promise<string | null> {
  const item = await prisma.orderItem.findFirst({
    where: {
      seller_user_id: ownerId,
      order: { buyer_user_id: authorId, status: "PAID" },
    },
    orderBy: { id: "desc" },
    select: { order_id: true },
  });
  return item?.order_id ?? null;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "flags");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const entity = await loadEntity(data.entity_type, data.entity_id);
  if (!entity || !entity.owner_user_id) return NextResponse.json({ error: "entity_not_found" }, { status: 404 });
  if (entity.owner_user_id === user.id) return NextResponse.json({ error: "cannot_review_own_listing" }, { status: 400 });

  const verifiedOrderId = await findVerifiedPurchase(user.id, entity.owner_user_id);

  const row = await prisma.review.upsert({
    where: {
      entity_type_entity_id_author_user_id: {
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        author_user_id: user.id,
      },
    },
    create: {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      author_user_id: user.id,
      rating: data.rating,
      body: data.body ?? null,
      photos: data.photos,
      photo_blurhashes: data.photo_blurhashes,
      verified_purchase_order_id: verifiedOrderId,
    },
    update: {
      rating: data.rating,
      body: data.body ?? null,
      photos: data.photos,
      photo_blurhashes: data.photo_blurhashes,
      verified_purchase_order_id: verifiedOrderId,
      hidden: false, // resubmitting un-hides; admin can re-hide
    },
  });

  revalidatePath(`/${entity.city.slug}/${SEGMENT[data.entity_type]}/${entity.slug}`);
  return NextResponse.json({ id: row.id, verified_purchase: !!verifiedOrderId }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const existing = await prisma.review.findUnique({ where: { id }, select: { author_user_id: true, entity_type: true, entity_id: true } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.author_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  if (user.role === "ADMIN" && existing.author_user_id !== user.id) {
    void logAudit({ actorUserId: user.id, action: "review.delete", entityType: "FLAG", entityId: id });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  // Admin-only — toggle a review's `hidden` flag.
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let admin;
  try { admin = await requireAdmin(); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const json = (await req.json().catch(() => ({}))) as { id?: string; hidden?: boolean };
  if (!json.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  await prisma.review.update({ where: { id: json.id }, data: { hidden: !!json.hidden } });
  void logAudit({
    actorUserId: admin.id,
    action: json.hidden ? "review.hide" : "review.unhide",
    entityType: "FLAG",
    entityId: json.id,
  });
  return NextResponse.json({ ok: true });
}
