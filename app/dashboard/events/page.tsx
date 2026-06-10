import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { formatDateShort } from "@/lib/util";
import { DeleteListingButton } from "@/components/DeleteListingButton";

export default async function MyEvents() {
  const user = await getCurrentUser();
  if (!user) redirect("/list-your-profile");
  if (user.role === "VISITOR") redirect("/list-your-profile");

  const events = await prisma.event.findMany({
    where: { organizer_user_id: user.id, status: { not: "DELETED" } },
    orderBy: { start_at: "desc" },
    include: { city: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your events</h1>
          <p className="mt-1 text-sm text-ink-muted">Edit or delete events you've hosted.</p>
        </div>
        <Link href="/dashboard/events/new" className="btn btn-primary btn-sm">
          <Plus size={14} /> Host event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-muted">No events yet.</p>
          <Link href="/dashboard/events/new" className="btn btn-primary btn-sm mt-3">
            Create your first event
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {events.map((e) => (
            <li key={e.id} className="card flex items-center gap-4 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{e.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {e.city.display_name} · {formatDateShort(e.start_at)} · {e.status.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/events/${e.id}/edit`}
                  className="btn btn-ghost btn-sm"
                  aria-label={`Edit ${e.name}`}
                >
                  <Pencil size={12} /> Edit
                </Link>
                <DeleteListingButton
                  endpoint={`/api/events/${e.id}`}
                  kindLabel="event"
                  redirectTo="/dashboard/events"
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
