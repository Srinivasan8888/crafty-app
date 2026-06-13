// V2.0 — buyer-saved search subscriptions.
//
// POST: create a SavedSearch for the authenticated user.
// DELETE ?id=...: unsubscribe (remove the row).
//
// Daily cron at /api/cron/saved-search-alerts emails the user when new
// matches appear.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({
  city_id: z.string().min(1).max(30),
  entity_type: z.enum(["CRAFTER", "STORE", "STUDIO", "EVENT"]),
  query: z.string().min(2).max(100),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "saves");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const city = await prisma.city.findUnique({ where: { id: data.city_id }, select: { is_active: true } });
  if (!city) return NextResponse.json({ error: "invalid_city" }, { status: 400 });

  // Normalize the query (lowercase + collapse whitespace) so dedup is
  // case-/whitespace-insensitive and stored queries stay consistent.
  const normalizedQuery = data.query.toLowerCase().replace(/\s+/g, " ").trim();

  // Dedup: don't store the same (user, city, entity_type, query) twice.
  const existing = await prisma.savedSearch.findFirst({
    where: { user_id: user.id, city_id: data.city_id, entity_type: data.entity_type, query: normalizedQuery },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ id: existing.id, already_saved: true });

  const created = await prisma.savedSearch.create({
    data: {
      user_id: user.id,
      city_id: data.city_id,
      entity_type: data.entity_type,
      query: normalizedQuery,
      // Seed last_run_at to now so the first cron only flags genuinely-new matches.
      last_run_at: new Date(),
    },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await prisma.savedSearch.deleteMany({
    where: { id, user_id: user.id }, // user-scoped → no need for a separate ownership check
  });
  return NextResponse.json({ ok: true });
}
