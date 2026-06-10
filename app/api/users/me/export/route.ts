// PRD §21 — DPDP (Digital Personal Data Protection Act) data-export endpoint.
//
// Returns a JSON snapshot of everything Crafty stores about the calling user:
// account, all owned listings, saves, flags they reported. Triggered by the
// user themselves (admin export uses /api/admin/export instead).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const [account, crafters, stores, studios, events, saves, flags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, display_name: true, profile_photo_url: true,
        role: true, is_admin: true, is_banned: true, created_at: true,
      },
    }),
    prisma.crafter.findMany({ where: { owner_user_id: user.id } }),
    prisma.store.findMany({ where: { owner_user_id: user.id } }),
    prisma.studio.findMany({ where: { owner_user_id: user.id } }),
    prisma.event.findMany({ where: { organizer_user_id: user.id } }),
    prisma.save.findMany({ where: { user_id: user.id } }),
    prisma.flag.findMany({ where: { reporter_user_id: user.id } }),
  ]);

  const snapshot = {
    generated_at: new Date().toISOString(),
    account,
    crafters,
    stores,
    studios,
    events,
    saves,
    flags_reported: flags,
  };

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="crafty_my_data_${stamp}.json"`,
    },
  });
}
