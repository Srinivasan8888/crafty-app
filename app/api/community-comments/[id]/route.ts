// storefront-completeness — admin moderation for community notes.
//   DELETE → hide (soft delete: status = HIDDEN, preserves the row for audit).
//   PATCH  → restore (status = VISIBLE).
// Both require an admin; the route is the source of truth, the nav is cosmetic.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

async function gateAdmin() {
  try {
    await requireAdmin();
    return null;
  } catch (e: any) {
    const status = e?.message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: "forbidden" }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const denied = await gateAdmin();
  if (denied) return denied;

  const updated = await prisma.communityComment
    .update({ where: { id: params.id }, data: { status: "HIDDEN" } })
    .catch(() => null);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidatePath("/community");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const denied = await gateAdmin();
  if (denied) return denied;

  const updated = await prisma.communityComment
    .update({ where: { id: params.id }, data: { status: "VISIBLE", report_count: 0 } })
    .catch(() => null);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidatePath("/community");
  return NextResponse.json({ ok: true });
}
