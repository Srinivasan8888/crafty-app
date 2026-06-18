// storefront-completeness — admin moderation queue for community notes.
// Access is gated by app/admin/layout.tsx (requireAdmin); the mutating routes
// re-check admin independently. Reported + recent notes float to the top.
// Privacy: display_name only, never the author's email.

import { prisma } from "@/lib/db";
import { AdminCommentActions } from "@/components/AdminCommentActions";

export const dynamic = "force-dynamic";

export default async function AdminCommunityComments() {
  const comments = await prisma.communityComment.findMany({
    orderBy: [{ report_count: "desc" }, { created_at: "desc" }],
    take: 200,
    select: {
      id: true,
      body: true,
      status: true,
      report_count: true,
      created_at: true,
      author: { select: { display_name: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Community notes</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Reported and recent notes from the public community page. Hiding a note removes it for everyone (soft delete).
      </p>

      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No community notes yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-subtle">
                <th className="py-2 pr-4">Note</th>
                <th className="py-2 pr-4">Author</th>
                <th className="py-2 pr-4">Reports</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Posted</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id} className="border-b border-line/60 align-top">
                  <td className="py-3 pr-4" style={{ maxWidth: 360 }}>
                    <span className="whitespace-pre-wrap break-words">{c.body}</span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{c.author.display_name || "Crafty member"}</td>
                  <td className="py-3 pr-4">
                    <span className={c.report_count > 0 ? "font-semibold text-danger" : "text-ink-subtle"}>
                      {c.report_count}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={c.status === "HIDDEN" ? "text-ink-subtle" : "text-forest"}>
                      {c.status === "HIDDEN" ? "Hidden" : "Visible"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-ink-subtle">
                    {c.created_at.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="py-3">
                    <AdminCommentActions id={c.id} status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
