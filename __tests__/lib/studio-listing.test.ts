import { describe, it, expect } from "vitest";
import { buildStudioListingQuery, normalizeStudioSort } from "@/lib/studio-listing";

/**
 * Learn (studios) filters (feature-bug-audit 3.x). The filter sheet previously
 * pushed params the page ignored. Each control now maps to a real Studio
 * column: discipline → craft_disciplines, online → is_online_only, sort →
 * orderBy. These assert that applying a control actually narrows or reorders
 * the query.
 */

const cityId = "city_1";

describe("normalizeStudioSort", () => {
  it("defaults unknown/absent to featured-first", () => {
    expect(normalizeStudioSort(undefined)).toBe("featured");
    expect(normalizeStudioSort("bogus")).toBe("featured");
    expect(normalizeStudioSort("featured")).toBe("featured");
  });
  it("honors newest", () => {
    expect(normalizeStudioSort("newest")).toBe("newest");
  });
});

describe("buildStudioListingQuery", () => {
  it("base query scopes to the city and published studios with no extra filters", () => {
    const { where, orderBy } = buildStudioListingQuery({ cityId, sort: "featured" });
    expect(where).toMatchObject({ city_id: cityId, status: "PUBLISHED" });
    expect(where.craft_disciplines).toBeUndefined();
    expect(where.is_online_only).toBeUndefined();
    // Featured-first default ordering.
    expect(orderBy).toEqual([{ is_featured: "desc" }, { created_at: "desc" }]);
  });

  it("discipline filter narrows the query", () => {
    const { where } = buildStudioListingQuery({ cityId, discipline: "pottery", sort: "featured" });
    expect(where.craft_disciplines).toEqual({ some: { discipline: { slug: "pottery" } } });
  });

  it("online filter narrows to online-only studios", () => {
    const { where } = buildStudioListingQuery({ cityId, online: true, sort: "featured" });
    expect(where.is_online_only).toBe(true);
  });

  it("newest sort reorders by recency only (no featured boost)", () => {
    const { orderBy } = buildStudioListingQuery({ cityId, sort: "newest" });
    expect(orderBy).toEqual([{ created_at: "desc" }]);
  });
});
