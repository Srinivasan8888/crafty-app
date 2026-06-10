// V2.0 — inbox: list of conversations where the user is either the buyer or
// the owner. Sorted by last_message_at descending. Shows an unread badge if
// the user's read pointer is older than the conversation's last_message_at.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const SEGMENT: Record<string, string> = { CRAFTER: "crafters", STORE: "stores", STUDIO: "learn" };

export default async function MessagesInboxPage() {
  const user = await requireUser();

  const convs = await prisma.conversation.findMany({
    where: {
      OR: [{ owner_user_id: user.id }, { buyer_user_id: user.id }],
    },
    orderBy: { last_message_at: "desc" },
    take: 100,
    include: {
      owner: { select: { id: true, display_name: true, email: true } },
      buyer: { select: { id: true, display_name: true, email: true } },
      messages: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: { body: true, created_at: true, sender_user_id: true },
      },
    },
  });

  // Resolve the entity name + slug + city for each conversation in one bulk pass.
  const crafterIds = convs.filter((c) => c.entity_type === "CRAFTER").map((c) => c.entity_id);
  const storeIds   = convs.filter((c) => c.entity_type === "STORE").map((c) => c.entity_id);
  const studioIds  = convs.filter((c) => c.entity_type === "STUDIO").map((c) => c.entity_id);
  const [crafters, stores, studios] = await Promise.all([
    prisma.crafter.findMany({ where: { id: { in: crafterIds } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } }),
    prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } }),
    prisma.studio.findMany({ where: { id: { in: studioIds } }, select: { id: true, name: true, slug: true, city: { select: { slug: true } } } }),
  ]);
  const byId = new Map<string, { name: string; slug: string; citySlug: string }>();
  for (const c of crafters) byId.set(`CRAFTER:${c.id}`, { name: c.name, slug: c.slug, citySlug: c.city.slug });
  for (const s of stores)   byId.set(`STORE:${s.id}`,   { name: s.name, slug: s.slug, citySlug: s.city.slug });
  for (const s of studios)  byId.set(`STUDIO:${s.id}`,  { name: s.name, slug: s.slug, citySlug: s.city.slug });

  return (
    <div>
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-ink-muted">Conversations with crafters, supply stores, and studios.</p>

      {convs.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-ink-subtle" aria-hidden />
          <p className="mt-2 text-ink-muted">No conversations yet.</p>
          <p className="mt-1 text-sm text-ink-subtle">
            Visit a profile and click "Message" to start one.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {convs.map((c) => {
            const meIsBuyer = c.buyer_user_id === user.id;
            const them = meIsBuyer ? c.owner : c.buyer;
            const myReadAt = meIsBuyer ? c.buyer_last_read_at : c.owner_last_read_at;
            const unread = !myReadAt || myReadAt.getTime() < c.last_message_at.getTime();
            const entity = byId.get(`${c.entity_type}:${c.entity_id}`);
            const last = c.messages[0];
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/messages/${c.id}`}
                  className="card flex items-start gap-3 p-4 hover:border-line-strong"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate font-semibold text-ink">
                        {them.display_name ?? them.email}
                      </p>
                      {entity && (
                        <p className="truncate text-xs text-ink-muted">
                          · {entity.name}
                        </p>
                      )}
                      {unread && <span className="ml-auto inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">new</span>}
                    </div>
                    {last && (
                      <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
                        {last.sender_user_id === user.id ? "You: " : ""}{last.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-subtle">
                      {c.last_message_at.toISOString().replace("T", " ").slice(0, 16)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
