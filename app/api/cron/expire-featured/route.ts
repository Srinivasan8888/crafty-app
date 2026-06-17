// V2.0 — daily cron that flips is_featured=false on listings whose paid
// feature window has expired. Idempotent.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cronSecretMatches } from "@/lib/cron";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret === "placeholder") return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (!cronSecretMatches(provided, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const expired = await prisma.featureOrder.findMany({
    where: {
      status: "PAID",
      feature_expires_at: { lt: now },
    },
  });

  let flipped = 0;
  for (const o of expired) {
    try {
      // Don't un-feature a listing that's still covered by another active paid
      // window (a renewal or overlapping purchase). Without this, expiring the
      // older order prematurely drops featuring the creator already paid for.
      const stillCovered = await prisma.featureOrder.findFirst({
        where: {
          id: { not: o.id },
          entity_type: o.entity_type,
          entity_id: o.entity_id,
          status: "PAID",
          feature_expires_at: { gte: now },
        },
        select: { id: true },
      });

      if (!stillCovered) {
        if (o.entity_type === "CRAFTER") await prisma.crafter.update({ where: { id: o.entity_id }, data: { is_featured: false } });
        if (o.entity_type === "STORE")   await prisma.store.update({   where: { id: o.entity_id }, data: { is_featured: false } });
        if (o.entity_type === "STUDIO")  await prisma.studio.update({  where: { id: o.entity_id }, data: { is_featured: false } });
        if (o.entity_type === "EVENT")   await prisma.event.update({   where: { id: o.entity_id }, data: { is_featured: false } });
        flipped++;
      }
      // This order is expired either way; only the is_featured flip is gated.
      await prisma.featureOrder.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
    } catch (e) {
      console.error("[expire-featured] flip failed", o.id, e);
    }
  }

  // Invalidate the homepage so unfeatured listings stop appearing in featured slots.
  revalidatePath("/");

  await prisma.cronRun.create({ data: { job_name: "expire_featured", status: "success", completed_at: new Date(), rows_affected: flipped } }).catch((e) => console.error("[cron] record", e));
  return NextResponse.json({ ok: true, examined: expired.length, flipped });
}
