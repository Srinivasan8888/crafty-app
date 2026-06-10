// Where users review and unsubscribe their saved-search alerts.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { UnsubscribeButton } from "./UnsubscribeButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SEGMENT: Record<string, string> = {
  CRAFTER: "crafters",
  STORE: "stores",
  STUDIO: "learn",
  EVENT: "events",
};

export default async function SavedSearchesPage() {
  const user = await requireUser();
  const subs = await prisma.savedSearch.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    include: { city: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Saved searches</h1>
      <p className="mt-1 text-sm text-ink-muted">
        We email you once a day when a new listing matches one of these.
      </p>

      {subs.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-ink-muted">No saved searches yet.</p>
          <p className="mt-2 text-sm text-ink-subtle">
            Run a search like <Link className="underline" href="/bengaluru/search?q=pottery">pottery in Bengaluru</Link> and click "Notify me of new matches".
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {subs.map((s) => (
            <li key={s.id} className="card flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  <Link
                    href={`/${s.city.slug}/${SEGMENT[s.entity_type]}?q=${encodeURIComponent(s.query)}`}
                    className="hover:underline"
                  >
                    "{s.query}" in {s.city.display_name}
                  </Link>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {s.entity_type.toLowerCase()}s
                  {s.last_match_at && <> · last alert {s.last_match_at.toISOString().slice(0, 10)}</>}
                </p>
              </div>
              <UnsubscribeButton id={s.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
