// V3 — Product CRUD.
//
// POST creates a Product attached to one of the caller's listings
// (crafter | store | studio). Owner is denormalized on the row for fast
// "all my products" queries; the parent-listing FK enforces cascade-delete.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadedImageUrl } from "@/lib/upload-url";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreator } from "@/lib/auth";
import { ensureUniqueSlug } from "@/lib/util";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const internalUploadPath = uploadedImageUrl;

const Schema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().max(4000).optional().nullable(),
  price_inr: z.number().int().positive().max(10_000_000),
  // -1 sentinel = made-to-order. Otherwise ≥0 stock count.
  inventory: z.number().int().min(-1).max(1_000_000).default(-1),
  photos: z.array(internalUploadPath).min(1).max(6),
  photo_blurhashes: z.array(z.string().max(500)).max(6).default([]),
  parent_listing: z.object({
    kind: z.enum(["CRAFTER", "STORE", "STUDIO"]),
    id: z.string().min(1).max(40),
  }),
});

export async function POST(req: NextRequest) {
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

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Verify the caller actually owns the parent listing. Without this anyone
  // could spam Products under another seller's storefront.
  const { kind, id: parentId } = data.parent_listing;
  let citySlug: string | null = null;
  let parentSlug: string | null = null;
  if (kind === "CRAFTER") {
    const c = await prisma.crafter.findUnique({ where: { id: parentId }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (!c) return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    if (c.owner_user_id !== user.id && user.role !== "ADMIN") return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
    citySlug = c.city.slug; parentSlug = c.slug;
  } else if (kind === "STORE") {
    const s = await prisma.store.findUnique({ where: { id: parentId }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (!s) return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    if (s.owner_user_id !== user.id && user.role !== "ADMIN") return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
    citySlug = s.city.slug; parentSlug = s.slug;
  } else {
    const s = await prisma.studio.findUnique({ where: { id: parentId }, select: { owner_user_id: true, slug: true, city: { select: { slug: true } } } });
    if (!s) return NextResponse.json({ error: "parent_not_found" }, { status: 404 });
    if (s.owner_user_id !== user.id && user.role !== "ADMIN") return NextResponse.json({ error: "forbidden_not_owner" }, { status: 403 });
    citySlug = s.city.slug; parentSlug = s.slug;
  }

  const slug = await ensureUniqueSlug(data.name, async (s) =>
    !!(await prisma.product.findUnique({ where: { slug: s } })),
  );

  const created = await prisma.product.create({
    data: {
      slug,
      owner_user_id: user.id,
      crafter_id: kind === "CRAFTER" ? parentId : null,
      store_id: kind === "STORE" ? parentId : null,
      studio_id: kind === "STUDIO" ? parentId : null,
      name: data.name,
      description: data.description ?? null,
      price_inr: data.price_inr,
      photos: data.photos,
      photo_blurhashes: data.photo_blurhashes,
      inventory: data.inventory,
      status: "PUBLISHED",
    },
  });

  void logAudit({
    actorUserId: user.id,
    action: "product.create",
    entityType: "USER", // no PRODUCT enum entry; pivot via metadata.
    entityId: created.id,
    metadata: { parent_kind: kind, parent_id: parentId },
  });

  // Bust the parent listing's detail page so the new product appears.
  if (citySlug && parentSlug) {
    const sectionPath = kind === "CRAFTER" ? "crafters" : kind === "STORE" ? "stores" : "learn";
    revalidatePath(`/${citySlug}/${sectionPath}/${parentSlug}`);
  }
  revalidatePath("/dashboard/products");

  return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 });
}
