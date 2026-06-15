import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ENTITY_TYPES } from "@/lib/types";
import { isSameOrigin, safeReferer } from "@/lib/security";

export const runtime = "nodejs";

// GET — the current user's saved set, as "TYPE:id" keys. Powers SaveButton
// hydration so hearts render filled on load (and re-tapping doesn't un-save).
// Signed-out callers get an empty set (200, not 401) so the client provider
// doesn't treat "not logged in" as an error.
export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ saved: [] }); }
  const rows = await prisma.save.findMany({
    where: { user_id: user.id },
    select: { entity_type: true, entity_id: true },
  });
  return NextResponse.json(
    { saved: rows.map((r) => `${r.entity_type}:${r.entity_id}`) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

const Schema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().min(1).max(30),
});

export async function POST(req: NextRequest) {
  // S5 — CSRF defense in depth. Even with SameSite=Lax cookies, top-level
  // POSTs from cross-origin pages can be allowed by some browsers; an
  // explicit origin check is cheap and correct.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // Rate limit first — cheap, IP-bound, no DB hit on rejection.
  const rl = await rateLimit(req, "saves");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  // Accept JSON or form-encoded (so the inline form on detail pages works without JS).
  const ct = req.headers.get("content-type") ?? "";
  const isJson = ct.includes("application/json");
  let body: unknown;
  if (isJson) {
    body = await req.json().catch(() => null);
  } else {
    const fd = await req.formData();
    body = Object.fromEntries(fd.entries());
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const { entity_type, entity_id } = parsed.data;

  // Race-safe toggle:
  //  1. deleteMany — succeeds whether or not a row exists
  //  2. if nothing was deleted, attempt create; swallow P2002 (concurrent insert)
  const del = await prisma.save.deleteMany({
    where: { user_id: user.id, entity_type, entity_id },
  });

  if (del.count > 0) {
    if (!isJson) {
      // S4 — never reflect the raw Referer (open-redirect / phishing pivot).
      return NextResponse.redirect(new URL(safeReferer(req), req.url), 303);
    }
    return NextResponse.json({ saved: false });
  }

  try {
    await prisma.save.create({ data: { user_id: user.id, entity_type, entity_id } });
  } catch (e: any) {
    // P2002 = unique constraint violation (a parallel request beat us to it).
    // Treat as success: the row exists now, which matches our intended state.
    if (e?.code !== "P2002") throw e;
  }

  if (!isJson) {
    // S4 — never reflect the raw Referer (open-redirect / phishing pivot).
      return NextResponse.redirect(new URL(safeReferer(req), req.url), 303);
  }
  return NextResponse.json({ saved: true });
}
