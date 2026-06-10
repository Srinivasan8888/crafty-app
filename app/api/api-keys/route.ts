// V3 Tier 3 — API key management for the authenticated user.
//
// GET   — list the caller's keys (id, name, prefix, scopes, dates) — no secrets.
// POST  — create a new key. Returns `{ id, key }` ONCE; we never hand it out again.
// DELETE ?id=… — revoke (soft).
//
// Same-origin + auth-required. Admin uses /app/admin/api-keys to manage all keys.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { generateApiKey } from "@/lib/api-key";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.string().min(1).max(40)).max(8).optional(),
  rate_limit_per_min: z.number().int().min(10).max(600).optional(),
});

export async function GET(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const keys = await prisma.apiKey.findMany({
    where: { owner_user_id: user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      rate_limit_per_min: true, last_used_at: true, revoked_at: true, created_at: true,
    },
  });
  return NextResponse.json({ data: keys });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "api-keys");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  // Soft cap — 20 active keys per user, to prevent abuse.
  const activeCount = await prisma.apiKey.count({
    where: { owner_user_id: user.id, revoked_at: null },
  });
  if (activeCount >= 20) {
    return NextResponse.json({ error: "too_many_keys" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const { name, scopes, rate_limit_per_min } = parsed.data;

  // Try a few times in the unlikely event of a hash collision (1 in 2^256).
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { full, prefix, keyHash } = generateApiKey();
    try {
      const created = await prisma.apiKey.create({
        data: {
          owner_user_id: user.id,
          name,
          prefix,
          key_hash: keyHash,
          scopes: scopes && scopes.length > 0 ? scopes : ["read:public"],
          rate_limit_per_min: rate_limit_per_min ?? 60,
        },
        select: { id: true },
      });
      void logAudit({
        actorUserId: user.id, action: "api_key.create",
        entityType: "USER", entityId: user.id,
        metadata: { key_id: created.id, prefix, scopes: scopes ?? ["read:public"] },
      });
      return NextResponse.json({ id: created.id, key: full, prefix }, { status: 201 });
    } catch (e) {
      lastErr = e;
    }
  }
  return NextResponse.json({ error: "create_failed", reason: String(lastErr) }, { status: 500 });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const key = await prisma.apiKey.findUnique({ where: { id }, select: { owner_user_id: true } });
  if (!key) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (key.owner_user_id !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revoked_at: new Date() },
  });
  void logAudit({
    actorUserId: user.id, action: "api_key.revoke",
    entityType: "USER", entityId: key.owner_user_id ?? user.id,
    metadata: { key_id: id },
  });
  return NextResponse.json({ ok: true });
}
