import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TODO: Real-DB integration test required per PRD §19.3 IRON RULE — needs
 * ephemeral Postgres in CI to verify the unique constraint + SERIALIZABLE
 * transaction guarantees the toggleSave handler relies on. This file is a
 * logical/mocked test only; it asserts the handler shape and that two
 * concurrent calls don't throw and converge to a coherent state.
 */

type SaveRow = { id: string; userId: string; listingId: string };

/**
 * Minimal in-memory mock of the Save table that simulates the unique
 * (userId, listingId) constraint. This mirrors the shape we expect from
 * Prisma so the toggle logic under test can run without a real DB.
 */
function makeMockPrisma() {
  const saves: SaveRow[] = [];
  const findUnique = vi.fn(
    async ({ where }: { where: { userId_listingId: { userId: string; listingId: string } } }) => {
      const { userId, listingId } = where.userId_listingId;
      return saves.find((s) => s.userId === userId && s.listingId === listingId) ?? null;
    },
  );
  const create = vi.fn(
    async ({ data }: { data: { userId: string; listingId: string } }) => {
      const exists = saves.some(
        (s) => s.userId === data.userId && s.listingId === data.listingId,
      );
      if (exists) {
        // Prisma surfaces P2002 as a thrown error on unique constraint violation.
        const err = new Error("Unique constraint failed on Save(userId,listingId)");
        (err as unknown as { code: string }).code = "P2002";
        throw err;
      }
      const row = {
        id: `save_${saves.length + 1}`,
        userId: data.userId,
        listingId: data.listingId,
      };
      saves.push(row);
      return row;
    },
  );
  const deleteMany = vi.fn(
    async ({ where }: { where: { userId: string; listingId: string } }) => {
      const before = saves.length;
      for (let i = saves.length - 1; i >= 0; i--) {
        if (saves[i].userId === where.userId && saves[i].listingId === where.listingId) {
          saves.splice(i, 1);
        }
      }
      return { count: before - saves.length };
    },
  );
  return {
    save: { findUnique, create, deleteMany },
    _rows: saves,
  };
}

/**
 * Logical implementation of the toggle that mirrors what the real route is
 * expected to do. Other lanes will land the actual route under
 * app/api/listings/[id]/save — when that lands, this mock should be
 * replaced with a direct import of that handler.
 */
async function toggleSave(
  prisma: ReturnType<typeof makeMockPrisma>,
  userId: string,
  listingId: string,
): Promise<{ saved: boolean }> {
  const existing = await prisma.save.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await prisma.save.deleteMany({ where: { userId, listingId } });
    return { saved: false };
  }
  try {
    await prisma.save.create({ data: { userId, listingId } });
    return { saved: true };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      // Concurrent insert — treat as already saved, the other tx won.
      return { saved: true };
    }
    throw e;
  }
}

describe("toggleSave race conditions (mocked Prisma)", () => {
  let prisma: ReturnType<typeof makeMockPrisma>;
  beforeEach(() => {
    prisma = makeMockPrisma();
  });

  it("two concurrent toggles don't throw and converge to a coherent state", async () => {
    const userId = "user_1";
    const listingId = "listing_1";

    const results = await Promise.all([
      toggleSave(prisma, userId, listingId),
      toggleSave(prisma, userId, listingId),
    ]);

    // Neither call threw — both produced a saved boolean.
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(typeof r.saved).toBe("boolean");
    }

    // After both calls, the Save table has at most one row for this pair.
    // It may also be zero (two creates raced and one was rolled back, then
    // the second observed it and tried to delete) — the iron rule is
    // "no duplicates", which is what the unique constraint enforces.
    const matching = prisma._rows.filter(
      (r) => r.userId === userId && r.listingId === listingId,
    );
    expect(matching.length).toBeLessThanOrEqual(1);
  });

  it("a single toggle creates exactly one Save row", async () => {
    const result = await toggleSave(prisma, "u", "l");
    expect(result.saved).toBe(true);
    expect(prisma._rows).toHaveLength(1);
  });

  it("toggling a saved listing removes the row", async () => {
    await toggleSave(prisma, "u", "l");
    expect(prisma._rows).toHaveLength(1);
    const result = await toggleSave(prisma, "u", "l");
    expect(result.saved).toBe(false);
    expect(prisma._rows).toHaveLength(0);
  });
});
