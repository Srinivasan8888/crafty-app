// V3 Tier 2 — Creator response thread on a review.
//
// POST   — owner of the reviewed listing replies (1500 chars max).
// PATCH  — owner edits OR admin hides a hostile response. Two branches share
//          the route: admin-only `{ hidden: true|false }` flips
//          `creator_response_hidden`; owner can supply `{ body: "..." }` to
//          edit their existing reply.
// DELETE — owner clears their reply.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const PostSchema = z.object({ body: z.string().min(1).max(1500) });
const PatchSchema = z.object({
  body: z.string().min(1).max(1500).optional(),
  hidden: z.boolean().optional(),
}).refine((v) => v.body !== undefined || v.hidden !== undefined, { message: "missing_fields" });

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

async function loadReviewWithOwner(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, entity_type: true, entity_id: true, creator_response: true },
  });
  if (!review) return null;
  let ownerUserId: string | null = null;
  let segmentSlug: string | null = null;
  let citySlug: string | null = null;
  if (review.entity_type === "CRAFTER") {
    const r = await prisma.crafter.findUnique({ where: { id: review.entity_id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (r) { ownerUserId = r.owner_user_id; segmentSlug = r.slug; citySlug = r.city.slug; }
  } else if (review.entity_type === "STORE") {
    const r = await prisma.store.findUnique({ where: { id: review.entity_id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (r) { ownerUserId = r.owner_user_id; segmentSlug = r.slug; citySlug = r.city.slug; }
  } else if (review.entity_type === "STUDIO") {
    const r = await prisma.studio.findUnique({ where: { id: review.entity_id }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (r) { ownerUserId = r.owner_user_id; segmentSlug = r.slug; citySlug = r.city.slug; }
  }
  return { ...review, ownerUserId, segmentSlug, citySlug };
}

function revalidateReviewedPage(r: { entity_type: string; segmentSlug: string | null; citySlug: string | null }) {
  if (r.segmentSlug && r.citySlug) {
    revalidatePath(`/${r.citySlug}/${SEGMENT[r.entity_type]}/${r.segmentSlug}`);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "flags");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const review = await loadReviewWithOwner(params.id);
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (review.ownerUserId !== user.id) return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  if (review.creator_response) return NextResponse.json({ error: "already_responded" }, { status: 400 });

  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });

  await prisma.review.update({
    where: { id: params.id },
    data: {
      creator_response: parsed.data.body,
      creator_response_at: new Date(),
      creator_response_hidden: false,
    },
  });
  revalidateReviewedPage(review);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });

  const review = await loadReviewWithOwner(params.id);
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Admin branch — hide / unhide a hostile response.
  if (parsed.data.hidden !== undefined) {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    await prisma.review.update({
      where: { id: params.id },
      data: { creator_response_hidden: parsed.data.hidden },
    });
    void logAudit({
      actorUserId: user.id,
      action: parsed.data.hidden ? "review_response.hide" : "review_response.unhide",
      entityType: "FLAG", entityId: params.id,
    });
    revalidateReviewedPage(review);
    return NextResponse.json({ ok: true });
  }

  // Owner edit branch.
  if (parsed.data.body !== undefined) {
    if (review.ownerUserId !== user.id) return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
    await prisma.review.update({
      where: { id: params.id },
      data: { creator_response: parsed.data.body, creator_response_at: new Date() },
    });
    revalidateReviewedPage(review);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "missing_fields" }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const review = await loadReviewWithOwner(params.id);
  if (!review) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (review.ownerUserId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.review.update({
    where: { id: params.id },
    data: { creator_response: null, creator_response_at: null, creator_response_hidden: false },
  });
  revalidateReviewedPage(review);
  return NextResponse.json({ ok: true });
}
