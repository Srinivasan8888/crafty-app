// V2.0 — POST a message. Creates the Conversation on demand if this is the
// buyer's first message to this entity owner. Returns the conversation id so
// the caller can navigate to /dashboard/messages/[id].
//
// Rules:
//   - Must be authenticated.
//   - Either party can be the sender (buyer reaches out → owner replies →
//     buyer replies → ...). Conversation participants are pinned at creation;
//     only those two users can send.
//   - You can't message yourself (owner would never need to message their own
//     listing).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const Schema = z.object({
  entity_type: z.enum(["CRAFTER", "STORE", "STUDIO"]),
  entity_id: z.string().min(1).max(40),
  body: z.string().min(1).max(4000),
});

async function loadOwner(kind: "CRAFTER" | "STORE" | "STUDIO", id: string): Promise<string | null> {
  if (kind === "CRAFTER") {
    const r = await prisma.crafter.findUnique({ where: { id }, select: { owner_user_id: true, status: true } });
    return r && r.status !== "DELETED" ? r.owner_user_id : null;
  }
  if (kind === "STORE") {
    const r = await prisma.store.findUnique({ where: { id }, select: { owner_user_id: true, status: true } });
    return r && r.status !== "DELETED" ? r.owner_user_id ?? null : null;
  }
  const r = await prisma.studio.findUnique({ where: { id }, select: { owner_user_id: true, status: true } });
  return r && r.status !== "DELETED" ? r.owner_user_id ?? null : null;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rl = await rateLimit(req, "flags"); // share bucket; same threat profile
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthenticated" }, { status: 401 }); }

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const ownerId = await loadOwner(data.entity_type, data.entity_id);
  if (!ownerId) return NextResponse.json({ error: "entity_not_found_or_unclaimed" }, { status: 404 });
  if (ownerId === user.id) return NextResponse.json({ error: "cannot_message_self" }, { status: 400 });

  // Upsert the conversation. Whoever speaks first is the "buyer"; the entity
  // owner is the "owner". If the sender IS the owner, they're replying — we
  // need to find an existing conversation by entity+owner+sender-as-buyer.
  // Simpler model: only buyers initiate. Owners can only reply in existing
  // conversations (we look them up by id from /dashboard/messages/[id]).
  const conv = await prisma.conversation.upsert({
    where: {
      entity_type_entity_id_buyer_user_id: {
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        buyer_user_id: user.id,
      },
    },
    create: {
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      owner_user_id: ownerId,
      buyer_user_id: user.id,
      last_message_at: new Date(),
    },
    update: { last_message_at: new Date() },
    select: { id: true },
  });

  await prisma.message.create({
    data: {
      conversation_id: conv.id,
      sender_user_id: user.id,
      body: data.body,
    },
  });

  // Mark the sender's read pointer up-to-date.
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { buyer_last_read_at: new Date() },
  });

  return NextResponse.json({ conversation_id: conv.id }, { status: 201 });
}
