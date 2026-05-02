import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { ENTITY_TYPES, FLAG_REASONS, type EntityType } from "@/lib/types";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().min(1).max(30),
  reason: z.enum(FLAG_REASONS),
  note: z.string().max(200).optional(),
  // S7 — never accept reporter_email from anonymous callers; we always
  // derive it from the authenticated session below. Field stays in the
  // schema only for forward-compat with V1.5 verified-email flow.
  reporter_email: z.string().email().max(254).optional(),
});

async function entityExists(type: EntityType, id: string): Promise<boolean> {
  switch (type) {
    case "CRAFTER":
      return !!(await prisma.crafter.findUnique({ where: { id }, select: { id: true } }));
    case "STORE":
      return !!(await prisma.store.findUnique({ where: { id }, select: { id: true } }));
    case "STUDIO":
      return !!(await prisma.studio.findUnique({ where: { id }, select: { id: true } }));
    case "EVENT":
      return !!(await prisma.event.findUnique({ where: { id }, select: { id: true } }));
  }
}

export async function POST(req: NextRequest) {
  // S5 — CSRF defense in depth.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  // Rate limit first — flag spam is a known abuse vector.
  const rl = rateLimit(req, "flags");
  if (!rl.allowed) {
    const retry = Math.ceil(rl.resetIn / 1000);
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const user = await getCurrentUser(); // anonymous flags allowed per §7.12
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const { entity_type, entity_id, reason, note } = parsed.data;

  // Make sure the target actually exists before persisting a flag against it.
  if (!(await entityExists(entity_type, entity_id))) {
    return NextResponse.json({ error: "entity_not_found" }, { status: 404 });
  }

  // S7 — derive reporter_email ONLY from authenticated session. Accepting
  // attacker-supplied emails on anonymous flags is a moderation-poisoning
  // vector (someone frames `victim@example.com` as the reporter) and a
  // DPDP §6 lawful-purpose violation. Anonymous flags persist with null
  // reporter_email; admin sees "Anonymous" in the queue.
  const reporterEmail = user?.email ?? null;

  await prisma.flag.create({
    data: {
      reporter_user_id: user?.id ?? null,
      reporter_email: reporterEmail,
      entity_type, entity_id, reason, note: note ?? null,
      crafter_id: entity_type === "CRAFTER" ? entity_id : null,
      store_id:   entity_type === "STORE"   ? entity_id : null,
      studio_id:  entity_type === "STUDIO"  ? entity_id : null,
      event_id:   entity_type === "EVENT"   ? entity_id : null,
    },
  });
  return NextResponse.json({ ok: true });
}
