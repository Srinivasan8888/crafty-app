// V2.0 — single-conversation thread view. Lists messages oldest-first with
// a reply composer at the bottom. On mount the page advances the viewer's
// read pointer so the inbox unread badge clears.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { safeCounterpartyName } from "@/lib/messaging";
import { formatDateTime } from "@/lib/util";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReplyComposer } from "./ReplyComposer";
import { MessagesAutoRefresh } from "./MessagesAutoRefresh";

export const dynamic = "force-dynamic";

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, display_name: true } },
      buyer: { select: { id: true, display_name: true } },
      messages: { orderBy: { created_at: "asc" } },
    },
  });
  if (!conv) notFound();
  if (user.id !== conv.owner_user_id && user.id !== conv.buyer_user_id) notFound();

  // Advance the viewer's read pointer. Best-effort; not awaited critically.
  const meIsBuyer = conv.buyer_user_id === user.id;
  await prisma.conversation.update({
    where: { id: conv.id },
    data: meIsBuyer
      ? { buyer_last_read_at: new Date() }
      : { owner_last_read_at: new Date() },
  });

  // Look up the linked entity (one query — the conversation is scoped to one).
  let entity: { name: string; slug: string; citySlug: string } | null = null;
  if (conv.entity_type === "CRAFTER") {
    const c = await prisma.crafter.findUnique({ where: { id: conv.entity_id }, select: { name: true, slug: true, city: { select: { slug: true } } } });
    if (c) entity = { name: c.name, slug: c.slug, citySlug: c.city.slug };
  } else if (conv.entity_type === "STORE") {
    const s = await prisma.store.findUnique({ where: { id: conv.entity_id }, select: { name: true, slug: true, city: { select: { slug: true } } } });
    if (s) entity = { name: s.name, slug: s.slug, citySlug: s.city.slug };
  } else if (conv.entity_type === "STUDIO") {
    const s = await prisma.studio.findUnique({ where: { id: conv.entity_id }, select: { name: true, slug: true, city: { select: { slug: true } } } });
    if (s) entity = { name: s.name, slug: s.slug, citySlug: s.city.slug };
  }

  const them = meIsBuyer ? conv.owner : conv.buyer;

  return (
    <div>
      <Link href="/dashboard/messages" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> All conversations
      </Link>
      <MessagesAutoRefresh />
      <header className="mt-3 flex items-baseline gap-2">
        <h1 className="text-xl font-bold text-ink">
          {safeCounterpartyName({
            viewerIsBuyer: meIsBuyer,
            displayName: them.display_name,
            entityName: entity?.name,
          })}
        </h1>
        {entity && (
          <Link
            href={`/${entity.citySlug}/${SEGMENT[conv.entity_type]}/${entity.slug}`}
            className="text-sm text-ink-muted hover:underline"
          >
            · {entity.name}
          </Link>
        )}
      </header>

      <section className="mt-6 grid gap-3 pb-32" aria-label="Conversation history">
        {conv.messages.map((m) => {
          const mine = m.sender_user_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  mine
                    ? "bg-accent-soft text-ink"
                    : "bg-canvas-sunken text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className="mt-1 text-[10px] text-ink-subtle">
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <ReplyComposer conversationId={conv.id} />
    </div>
  );
}
