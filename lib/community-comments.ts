// storefront-completeness — shared mapping for public community notes.
// The single rule this enforces everywhere: a note never exposes the author's
// email. Mirrors lib/messaging.ts's safeCounterpartyName for the inbox.

export type CommunityCommentRow = {
  id: string;
  body: string;
  created_at: Date;
  // `email` is intentionally allowed in the input type but never read, so a
  // caller that over-selects can't accidentally leak it through this mapper.
  author: { display_name: string | null; email?: string };
};

export type CommunityCommentView = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string; // ISO
};

/** Display name, else a neutral label — never an email. */
export function safeCommentAuthorName(displayName: string | null | undefined): string {
  const n = (displayName ?? "").trim();
  return n || "Crafty member";
}

export function toCommentView(row: CommunityCommentRow): CommunityCommentView {
  return {
    id: row.id,
    body: row.body,
    authorName: safeCommentAuthorName(row.author.display_name),
    createdAt: row.created_at.toISOString(),
  };
}
