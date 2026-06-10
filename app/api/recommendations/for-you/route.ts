// V3 — Personalized "For you" recommendations.
// Requires auth. Per-user; do NOT set public cache headers — would leak across users.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { getForYou } from "@/lib/recommendations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, "saves");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limitRaw = req.nextUrl.searchParams.get("limit");
  let limit = 12;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isFinite(n) && n >= 1 && n <= 36) limit = Math.floor(n);
  }

  // Cheap early-out: if the user has zero saves the co-save graph yields
  // nothing useful. Skip the four raw queries.
  const saveCount = await prisma.save.count({ where: { user_id: user.id } });
  if (saveCount === 0) {
    return NextResponse.json({ hits: [], reason: "no_saves_yet" });
  }

  const hits = await getForYou(user.id, limit);
  return NextResponse.json({ hits });
}
