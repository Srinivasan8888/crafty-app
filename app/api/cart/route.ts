// V3 — Cart. Buyer-scoped CRUD.
//
// GET    returns the current user's cart with product joins.
// POST   adds (or increments) a product to the cart.
// DELETE empties the cart.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const AddSchema = z.object({
  product_id: z.string().min(1).max(40),
  quantity: z.number().int().positive().max(99).default(1),
});

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const items = await prisma.cartItem.findMany({
    where: { buyer_user_id: user.id },
    orderBy: { created_at: "desc" },
    include: {
      product: {
        select: {
          id: true, slug: true, name: true, price_inr: true,
          photos: true, photo_blurhashes: true, inventory: true, status: true,
          owner_user_id: true,
        },
      },
    },
  });

  // Filter out items whose product is no longer purchasable.
  const live = items.filter((i) => i.product.status === "PUBLISHED");
  const subtotal = live.reduce((acc, i) => acc + i.product.price_inr * i.quantity, 0);

  return NextResponse.json({
    items: live.map((i) => ({
      id: i.id,
      product_id: i.product.id,
      product: {
        id: i.product.id,
        slug: i.product.slug,
        name: i.product.name,
        price_inr: i.product.price_inr,
        photo: i.product.photos[0] ?? null,
        photo_blurhash: i.product.photo_blurhashes[0] ?? null,
        inventory: i.product.inventory,
      },
      quantity: i.quantity,
      line_total_inr: i.product.price_inr * i.quantity,
    })),
    subtotal_inr: subtotal,
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "cart");
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } });
  }

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const { product_id, quantity } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: product_id },
    select: { id: true, status: true, inventory: true, owner_user_id: true },
  });
  if (!product || product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  }
  // Don't let sellers buy their own products — surfaces as a clear error
  // instead of a confusing self-payout downstream.
  if (product.owner_user_id === user.id) {
    return NextResponse.json({ error: "cannot_buy_own_product" }, { status: 400 });
  }

  // Upsert: increment quantity if already in cart.
  const existing = await prisma.cartItem.findUnique({
    where: { buyer_user_id_product_id: { buyer_user_id: user.id, product_id } },
  });
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (product.inventory >= 0 && newQty > product.inventory) {
    return NextResponse.json({ error: "insufficient_inventory", available: product.inventory }, { status: 409 });
  }

  await prisma.cartItem.upsert({
    where: { buyer_user_id_product_id: { buyer_user_id: user.id, product_id } },
    create: { buyer_user_id: user.id, product_id, quantity },
    update: { quantity: newQty },
  });

  return NextResponse.json({ ok: true, quantity: newQty }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  await prisma.cartItem.deleteMany({ where: { buyer_user_id: user.id } });
  return NextResponse.json({ ok: true });
}
