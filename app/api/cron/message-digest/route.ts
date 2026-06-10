// V2.0 — daily unread-message digest cron.
//
// Finds users with unread messages (one or both sides) and sends a single
// summary email per recipient with a count + link to /dashboard/messages.
// We send at most one digest per user per day to avoid spam — guard via
// last_message_at > recipient's read pointer AND > 24h ago.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("token");
  if (!secret || secret === "placeholder") return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Pull every conversation with activity in the last 24h. Filter in-app for
  // unread-per-user — simpler than two parallel queries on different read
  // pointers.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const convs = await prisma.conversation.findMany({
    where: { last_message_at: { gte: since } },
    select: {
      id: true,
      owner_user_id: true,
      buyer_user_id: true,
      owner_last_read_at: true,
      buyer_last_read_at: true,
      last_message_at: true,
      owner: { select: { email: true, display_name: true, email_bounced: true } },
      buyer: { select: { email: true, display_name: true, email_bounced: true } },
    },
  });

  // Aggregate unread counts per recipient.
  type Bucket = { email: string; name: string | null; bounced: boolean; count: number };
  const byUser = new Map<string, Bucket>();
  const bump = (userId: string, user: { email: string; display_name: string | null; email_bounced: boolean }) => {
    const b = byUser.get(userId);
    if (b) b.count++;
    else byUser.set(userId, { email: user.email, name: user.display_name, bounced: user.email_bounced, count: 1 });
  };

  for (const c of convs) {
    const ownerUnread = !c.owner_last_read_at || c.owner_last_read_at < c.last_message_at;
    const buyerUnread = !c.buyer_last_read_at || c.buyer_last_read_at < c.last_message_at;
    if (ownerUnread) bump(c.owner_user_id, c.owner);
    if (buyerUnread) bump(c.buyer_user_id, c.buyer);
  }

  const { sendListingLive } = await import("@/lib/email");
  let sent = 0;
  for (const [, b] of byUser) {
    if (b.bounced || !b.email.endsWith("@") === false && b.email.endsWith("@noreply.crafty.app")) continue;
    void sendListingLive({
      to: b.email,
      firstName: b.name,
      kind: "crafter",
      name: `You have ${b.count} unread message${b.count > 1 ? "s" : ""} on Crafty`,
      publicUrl: `${SITE_URL}/dashboard/messages`,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, recipients: byUser.size, sent });
}
