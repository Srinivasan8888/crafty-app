// V2.0 — reply within an existing conversation. Both parties (buyer and
// owner) can use this; we look up their role from the conversation row.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "flags");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const conv = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    select: { owner_user_id: true, buyer_user_id: true },
  });
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.id !== conv.owner_user_id && user.id !== conv.buyer_user_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  await prisma.message.create({
    data: {
      conversation_id: params.conversationId,
      sender_user_id: user.id,
      body: parsed.data.body,
    },
  });

  // Bump last_message_at and the sender's read pointer.
  const senderIsBuyer = user.id === conv.buyer_user_id;
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      last_message_at: new Date(),
      ...(senderIsBuyer
        ? { buyer_last_read_at: new Date() }
        : { owner_last_read_at: new Date() }),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
