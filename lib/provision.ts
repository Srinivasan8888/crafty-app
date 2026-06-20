// fix-signup-provisioning-race — race-safe first-touch provisioning helpers.
//
// A provisioning write can lose a unique-constraint race to a concurrent first
// request for the same brand-new user: Prisma's `upsert` is SELECT-then-INSERT,
// so two cold inserts collide on email/descope_id and the loser throws P2002.
// These helpers turn that into a no-op recovery (re-read the winner's row) so the
// race never surfaces to the caller / error boundary.
//
// Kept dependency-free (no Prisma/Next imports) so it is trivially unit-testable.

// True only for a Prisma "unique constraint failed" error. Duck-typed on `code`
// rather than `instanceof PrismaClientKnownRequestError` to stay robust across
// duplicate @prisma/client instances.
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: unknown }).code === "P2002"
  );
}

// Run a provisioning write idempotently. On a unique-constraint race, treat it as
// "a concurrent request already created the row" and return the winner's row
// (re-read) instead of surfacing the error. Bounded to one retry so a pathological
// case can never loop. Existing-user reads never reach here (no write attempted).
export async function provisionSafely<T>(
  write: () => Promise<T>,
  reread: () => Promise<T | null>,
): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const winner = await reread();
    if (winner) return winner;
    // Conflicted but the row isn't visible yet — one bounded retry, then surface
    // the original race error rather than spin.
    try {
      return await write();
    } catch (e2) {
      if (!isUniqueViolation(e2)) throw e2;
      const w2 = await reread();
      if (w2) return w2;
      throw e; // surface the original race error rather than spin
    }
  }
}
