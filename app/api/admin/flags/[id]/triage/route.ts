// V3 Tier 4 — POST /api/admin/flags/[id]/triage
//
// Admin-only. Loads the flag + linked entity, calls Claude via
// lib/ai-moderation.ts, returns the verdict to the caller. Also writes an
// AuditLog row so we have a history of which flags got AI-triaged with what
// verdict (useful for evaluating the moderation tool's accuracy over time).
//
// Decision support, not auto-moderation: the route does NOT mutate the flag
// or the listing. The admin still presses dismiss/hide/delete themselves.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { triageFlag } from "@/lib/ai-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Anthropic calls can take a few seconds; give them headroom.
export const maxDuration = 60;

async function loadEntity(
  entityType: string,
  entityId: string,
): Promise<{ name: string | null; tagline: string | null; bio: string | null } | null> {
  switch (entityType) {
    case "CRAFTER": {
      const row = await prisma.crafter.findUnique({
        where: { id: entityId },
        select: { name: true, tagline: true, bio: true },
      });
      return row;
    }
    case "STORE": {
      const row = await prisma.store.findUnique({
        where: { id: entityId },
        select: { name: true },
      });
      return row ? { name: row.name, tagline: null, bio: null } : null;
    }
    case "STUDIO": {
      const row = await prisma.studio.findUnique({
        where: { id: entityId },
        select: { name: true },
      });
      return row ? { name: row.name, tagline: null, bio: null } : null;
    }
    case "EVENT": {
      const row = await prisma.event.findUnique({
        where: { id: entityId },
        select: { name: true, description: true },
      });
      return row ? { name: row.name, tagline: null, bio: row.description ?? null } : null;
    }
    default:
      return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rl = await rateLimit(req, "admin:flag-triage", 30);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited", resetIn: rl.resetIn }, { status: 429 });
  }

  const flag = await prisma.flag.findUnique({ where: { id: params.id } });
  if (!flag) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const entity = await loadEntity(flag.entity_type, flag.entity_id);
  const result = await triageFlag(
    {
      reason: flag.reason,
      note: flag.note,
      entity_type: flag.entity_type,
      reporter_email: flag.reporter_email,
    },
    entity,
  );

  void logAudit({
    actorUserId: adminUser.id,
    action: "flag.ai_triage",
    entityType: "FLAG",
    entityId: flag.id,
    metadata: {
      verdict: result.verdict,
      confidence: result.confidence,
      model: result.model,
    },
  });

  return NextResponse.json(result);
}
