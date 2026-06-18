// storefront-completeness — POST /api/community-comments
// Create a public community note. Same guard stack as /api/flags: same-origin,
// per-IP rate limit, session-derived author. Never returns the author's email.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { toCommentView } from "@/lib/community-comments";

export const runtime = "nodejs";

const Schema = z.object({ body: z.string().trim().min(1).max(500) });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  const rl = await rateLimit(req, "community-comments");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.communityComment.create({
    data: { author_user_id: user.id, body: parsed.data.body },
    // Privacy: select display_name only — never the author's email.
    select: { id: true, body: true, created_at: true, author: { select: { display_name: true } } },
  });

  revalidatePath("/community");

  return NextResponse.json(toCommentView(created), { status: 201 });
}
