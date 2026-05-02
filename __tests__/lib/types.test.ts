import { describe, it, expect } from "vitest";
import { ENTITY_TYPES, FLAG_REASONS, LISTING_STATUSES } from "@/lib/types";

describe("ENTITY_TYPES", () => {
  it("has exactly 4 members", () => {
    expect(ENTITY_TYPES).toHaveLength(4);
  });

  it("is composed entirely of uppercase ASCII tokens", () => {
    for (const t of ENTITY_TYPES) {
      expect(t).toBe(t.toUpperCase());
      expect(/^[A-Z_]+$/.test(t)).toBe(true);
    }
  });

  it("has a predictable, stable order matching the PRD entity registry", () => {
    expect([...ENTITY_TYPES]).toEqual(["CRAFTER", "STORE", "STUDIO", "EVENT"]);
  });

  it("has no duplicate members", () => {
    expect(new Set(ENTITY_TYPES).size).toBe(ENTITY_TYPES.length);
  });
});

describe("FLAG_REASONS", () => {
  it("has exactly 5 members", () => {
    expect(FLAG_REASONS).toHaveLength(5);
  });

  it("is composed entirely of uppercase ASCII tokens", () => {
    for (const r of FLAG_REASONS) {
      expect(r).toBe(r.toUpperCase());
      expect(/^[A-Z_]+$/.test(r)).toBe(true);
    }
  });

  it("has no duplicate members", () => {
    expect(new Set(FLAG_REASONS).size).toBe(FLAG_REASONS.length);
  });
});

describe("LISTING_STATUSES", () => {
  it("contains the four canonical lifecycle states", () => {
    expect([...LISTING_STATUSES].sort()).toEqual(
      ["DELETED", "HIDDEN", "PUBLISHED", "UNPUBLISHED"].sort(),
    );
  });
});
