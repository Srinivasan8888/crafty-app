// V3 — Cart line operations.
// PATCH sets the absolute quantity for a product (0 → delete).
// DELETE removes a single line.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const PatchSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "cart");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const { quantity } = parsed.data;

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { buyer_user_id: user.id, product_id: params.productId },
    });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { status: true, inventory: true },
  });
  if (!product || product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  }
  if (product.inventory >= 0 && quantity > product.inventory) {
    return NextResponse.json({ error: "insufficient_inventory", available: product.inventory }, { status: 409 });
  }

  // PATCH sets the quantity of an EXISTING line — it must not create one.
  // upsert turned "set quantity" into "add", which also skipped the
  // cannot-buy-own-product guard that the POST /cart path enforces. Update only
  // the user's own line; 404 if it isn't in the cart.
  const updated = await prisma.cartItem.updateMany({
    where: { buyer_user_id: user.id, product_id: params.productId },
    data: { quantity },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "not_in_cart" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quantity });
}

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  await prisma.cartItem.deleteMany({
    where: { buyer_user_id: user.id, product_id: params.productId },
  });
  return NextResponse.json({ ok: true });
}
