// V2.0 — reply within an existing conversation. Both parties (buyer and
// owner) can use this; we look up their role from the conversation row.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { sendNewMessageNotice } from "@/lib/email";

export const runtime = "nodejs";

const Schema = z.object({ body: z.string().min(1).max(4000) });

const THROTTLE_MS = 60 * 60 * 1000; // 1h between owner notifications per conversation

async function loadEntityName(kind: string, id: string): Promise<string> {
  if (kind === "CRAFTER") return (await prisma.crafter.findUnique({ where: { id }, select: { name: true } }))?.name ?? "your listing";
  if (kind === "STORE") return (await prisma.store.findUnique({ where: { id }, select: { name: true } }))?.name ?? "your listing";
  return (await prisma.studio.findUnique({ where: { id }, select: { name: true } }))?.name ?? "your listing";
}

// Best-effort, fire-and-forget owner notification. Same throttle + bounce
// rules as the new-conversation path; only called when the buyer is the sender.
async function maybeNotifyOwner(args: {
  ownerId: string;
  entityType: string;
  entityId: string;
  conversationId: string;
  priorMessageAt: Date | null;
}) {
  try {
    if (args.priorMessageAt && Date.now() - args.priorMessageAt.getTime() <= THROTTLE_MS) return;
    const owner = await prisma.user.findUnique({
      where: { id: args.ownerId },
      select: { email: true, display_name: true, email_bounced: true },
    });
    if (!owner || !owner.email || owner.email_bounced) return;
    const listingName = await loadEntityName(args.entityType, args.entityId);
    await sendNewMessageNotice({
      to: owner.email,
      firstName: owner.display_name,
      listingName,
      conversationId: args.conversationId,
    });
  } catch (e) {
    console.error("[messages:notify-error]", e);
  }
}

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "flags");
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const conv = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    select: { owner_user_id: true, buyer_user_id: true, entity_type: true, entity_id: true },
  });
  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.id !== conv.owner_user_id && user.id !== conv.buyer_user_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 400 });

  // Throttle basis: most recent existing message before this write.
  const senderIsBuyer = user.id === conv.buyer_user_id;
  const prior = senderIsBuyer
    ? await prisma.message.findFirst({
        where: { conversation_id: params.conversationId },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      })
    : null;

  await prisma.message.create({
    data: {
      conversation_id: params.conversationId,
      sender_user_id: user.id,
      body: parsed.data.body,
    },
  });

  // Bump last_message_at and the sender's read pointer.
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      last_message_at: new Date(),
      ...(senderIsBuyer
        ? { buyer_last_read_at: new Date() }
        : { owner_last_read_at: new Date() }),
    },
  });

  // Only the buyer -> owner direction notifies; owner replies never notify the
  // owner. Fire-and-forget — never block or fail the message write.
  if (senderIsBuyer) {
    void maybeNotifyOwner({
      ownerId: conv.owner_user_id,
      entityType: conv.entity_type,
      entityId: conv.entity_id,
      conversationId: params.conversationId,
      priorMessageAt: prior?.created_at ?? null,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
