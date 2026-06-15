// PATCH/DELETE /api/products/[id]
//
// Owner-only edit + soft-delete. The product's parent listing is fixed at
// create time; we don't allow re-parenting (would invalidate slug history).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadedImageUrl } from "@/lib/upload-url";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const internalUploadPath = uploadedImageUrl;

const PatchSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  description: z.string().max(4000).nullable().optional(),
  price_inr: z.number().int().positive().max(10_000_000).optional(),
  inventory: z.number().int().min(-1).max(1_000_000).optional(),
  photos: z.array(internalUploadPath).min(1).max(6).optional(),
  // generated base64 data-URL placeholder from lib/image.ts can exceed 500 chars
  photo_blurhashes: z.array(z.string().max(4000)).max(6).optional(),
  status: z.enum(["PUBLISHED", "UNPUBLISHED"]).optional(),
});

async function loadProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      crafter: { select: { slug: true, city: { select: { slug: true } } } },
      store: { select: { slug: true, city: { select: { slug: true } } } },
      studio: { select: { slug: true, city: { select: { slug: true } } } },
    },
  });
}

function revalidateParent(p: NonNullable<Awaited<ReturnType<typeof loadProduct>>>) {
  if (p.crafter) revalidatePath(`/${p.crafter.city.slug}/crafters/${p.crafter.slug}`);
  if (p.store) revalidatePath(`/${p.store.city.slug}/stores/${p.store.slug}`);
  if (p.studio) revalidatePath(`/${p.studio.city.slug}/learn/${p.studio.slug}`);
  revalidatePath("/dashboard/products");
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "products");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await loadProduct(params.id);
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

  await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price_inr !== undefined && { price_inr: data.price_inr }),
      ...(data.inventory !== undefined && { inventory: data.inventory }),
      ...(data.photos !== undefined && { photos: data.photos }),
      ...(data.photo_blurhashes !== undefined && { photo_blurhashes: data.photo_blurhashes }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  void logAudit({
    actorUserId: user.id,
    action: "product.update",
    entityType: "USER",
    entityId: existing.id,
    metadata: { fields: Object.keys(data) },
  });

  revalidateParent(existing);
  return NextResponse.json({ id: existing.id, ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "products");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  let user;
  try { user = await requireCreator(); }
  catch (e: any) {
    if (e?.message === "FORBIDDEN_NOT_CREATOR") return NextResponse.json({ error: "not_a_creator" }, { status: 403 });
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const existing = await loadProduct(params.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
  }

  await prisma.product.update({
    where: { id: existing.id },
    data: { status: "DELETED" },
  });

  void logAudit({
    actorUserId: user.id,
    action: "product.delete",
    entityType: "USER",
    entityId: existing.id,
  });

  revalidateParent(existing);
  return NextResponse.json({ ok: true });
}
