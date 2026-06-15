import { describe, it, expect } from "vitest";
import { exceedsProductCap, getMaxProducts } from "@/lib/subscription-gates";

/**
 * Per-tier product cap (feature-bug-audit 1.3/1.4). getMaxProducts (5 free /
 * 25 Pro) was documented as enforced by POST /api/products but was never
 * called — any seller could create unlimited products. The route now counts
 * the seller's non-DELETED products and rejects via exceedsProductCap when
 * another would exceed the tier cap.
 */

const free = { subscription_tier: "FREE" } as const;

describe("product cap", () => {
  it("free tier blocks at the 5-product cap, allows below it", () => {
    expect(getMaxProducts(free)).toBe(5);
    expect(exceedsProductCap(free, 4)).toBe(false); // within cap → allowed
    expect(exceedsProductCap(free, 5)).toBe(true); // at cap → blocked
    expect(exceedsProductCap(free, 6)).toBe(true);
  });

  it("active Pro tier raises the cap to 25", () => {
    const pro = {
      subscription_tier: "PRO",
      subscription_expires_at: new Date(Date.now() + 86_400_000),
    } as const;
    expect(getMaxProducts(pro)).toBe(25);
    expect(exceedsProductCap(pro, 24)).toBe(false);
    expect(exceedsProductCap(pro, 25)).toBe(true);
  });

  it("expired Pro degrades to the free cap", () => {
    const expiredPro = {
      subscription_tier: "PRO",
      subscription_expires_at: new Date(Date.now() - 1_000),
    } as const;
    expect(getMaxProducts(expiredPro)).toBe(5);
    expect(exceedsProductCap(expiredPro, 5)).toBe(true);
  });

  it("excludes soft-deleted products (caller passes the non-DELETED count)", () => {
    // The route counts `status != DELETED`, so a seller with 4 live products
    // (and any number of deleted ones) is still under the free cap.
    const liveCount = 4;
    expect(exceedsProductCap(free, liveCount)).toBe(false);
  });
});
