// storefront-completeness — POST /api/community-comments/[id]/report
// A signed-in member flags a note for moderation. Bumps report_count so the
// note rises in the admin queue; admins then hide it. Rate-limited per IP.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  const rl = await rateLimit(req, "community-comments-report");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Only visible notes can be reported; a hidden one is already moderated.
  const updated = await prisma.communityComment.updateMany({
    where: { id: params.id, status: "VISIBLE" },
    data: { report_count: { increment: 1 } },
  });
  if (updated.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
