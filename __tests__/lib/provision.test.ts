import { describe, it, expect, vi } from "vitest";
import { isUniqueViolation, provisionSafely } from "@/lib/provision";

// Stand-in for Prisma's "unique constraint failed" error.
const p2002 = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

describe("isUniqueViolation", () => {
  it("is true only for an error carrying code P2002", () => {
    expect(isUniqueViolation(p2002())).toBe(true);
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("is false for other Prisma codes and non-errors", () => {
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});

describe("provisionSafely", () => {
  it("returns the write result and never re-reads when the write succeeds", async () => {
    const reread = vi.fn(async () => null);
    const out = await provisionSafely(async () => ({ id: "u1" }), reread);
    expect(out).toEqual({ id: "u1" });
    expect(reread).not.toHaveBeenCalled();
  });

  it("recovers from a P2002 race by returning the winner's row", async () => {
    const write = vi.fn(async () => {
      throw p2002();
    });
    const out = await provisionSafely(write, async () => ({ id: "winner" }));
    expect(out).toEqual({ id: "winner" });
    expect(write).toHaveBeenCalledTimes(1); // no retry needed once the winner is found
  });

  it("retries the write once when the row isn't visible yet, then succeeds", async () => {
    let attempts = 0;
    const write = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw p2002();
      return { id: "second-attempt" };
    });
    const out = await provisionSafely(write, async () => null);
    expect(out).toEqual({ id: "second-attempt" });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("surfaces the original error if the row is never found", async () => {
    const original = p2002();
    const write = vi.fn(async () => {
      throw original;
    });
    await expect(provisionSafely(write, async () => null)).rejects.toBe(original);
    expect(write).toHaveBeenCalledTimes(2); // initial + one bounded retry
  });

  it("rethrows non-unique errors immediately without re-reading", async () => {
    const reread = vi.fn(async () => ({ id: "x" }));
    const boom = new Error("connection lost");
    await expect(provisionSafely(async () => { throw boom; }, reread)).rejects.toBe(boom);
    expect(reread).not.toHaveBeenCalled();
  });

  it("is idempotent under concurrency: one insert wins, all callers get the same row", async () => {
    // Simulate the real bug: many concurrent first-touch provisions of the same
    // brand-new user. A shared store inserts once; every other write loses with
    // P2002. With provisionSafely, every caller resolves to the single row.
    const store = new Map<string, { id: string; email: string }>();
    let inserts = 0;
    const email = "race@example.com";

    const provisionOne = () =>
      provisionSafely(
        async () => {
          if (store.has(email)) throw p2002(); // unique constraint on email
          const row = { id: `id-${inserts}`, email };
          store.set(email, row);
          inserts++;
          return row;
        },
        async () => store.get(email) ?? null,
      );

    const results = await Promise.all(Array.from({ length: 12 }, provisionOne));

    expect(inserts).toBe(1); // exactly one row created
    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(1); // everyone got the same row
    expect(results.every((r) => r.email === email)).toBe(true);
  });
});
