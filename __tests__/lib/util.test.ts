import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug, formatINR } from "@/lib/util";

describe("slugify", () => {
  it("lowercases input and strips diacritics", () => {
    // "Aïcha" should become "aicha" — combining marks must be removed
    // after NFKD normalization.
    expect(slugify("Aïcha")).toBe("aicha");
    expect(slugify("Café")).toBe("cafe");
    expect(slugify("Niño")).toBe("nino");
  });

  it("collapses non-alphanumeric runs to single hyphens and trims edges", () => {
    expect(slugify("  Hello, World!!  ")).toBe("hello-world");
    expect(slugify("foo___bar  baz")).toBe("foo-bar-baz");
  });

  it("returns empty string for input that produces no characters", () => {
    // Pure punctuation collapses to empty after the regex pass.
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("respects the maxLength cap including suffix budget", () => {
    // The 56-char base + "-999" suffix must still fit within 60 chars,
    // so default base cap is 60 and explicit cap of 56 holds.
    const long = "a".repeat(200);
    expect(slugify(long, 56).length).toBe(56);
    // Even with the largest 4-char suffix, total stays ≤60.
    expect((slugify(long, 56) + "-999").length).toBeLessThanOrEqual(60);
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base slug when no collisions exist", async () => {
    const exists = async () => false;
    expect(await ensureUniqueSlug("My Studio", exists)).toBe("my-studio");
  });

  it("returns 'untitled' for input that slugifies to empty", async () => {
    const exists = async () => false;
    expect(await ensureUniqueSlug("!!!", exists)).toBe("untitled");
  });

  it("appends -1 when the slug collides with a reserved word", async () => {
    const exists = async () => false;
    expect(await ensureUniqueSlug("admin", exists)).toBe("admin-1");
    expect(await ensureUniqueSlug("api", exists)).toBe("api-1");
  });

  it("increments the suffix on collisions: -2, -3, ...", async () => {
    const taken = new Set(["studio", "studio-2", "studio-3"]);
    const exists = async (slug: string) => taken.has(slug);
    expect(await ensureUniqueSlug("studio", exists)).toBe("studio-4");
  });

  it("respects the 60-char cap when collisions occur after truncation", async () => {
    // A 200-char input gets sliced to a 56-char base, leaving 4 chars for
    // up to "-999" suffix. Result must always be ≤60 chars.
    const longBase = "a".repeat(200);
    let calls = 0;
    const exists = async () => {
      calls += 1;
      // Force three collisions to push the suffix to "-4".
      return calls <= 3;
    };
    const result = await ensureUniqueSlug(longBase, exists);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("-4")).toBe(true);
  });

  it("holds the 60-char cap under high collision count", async () => {
    const longBase = "a".repeat(200);
    let calls = 0;
    const exists = async () => {
      calls += 1;
      return calls <= 998; // forces suffix to "-999"
    };
    const result = await ensureUniqueSlug(longBase, exists);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("-999")).toBe(true);
  });

  it("re-slices the base so the cap holds past 999 collisions (4-digit suffix)", async () => {
    // Regression: the old code reserved only 4 chars for "-NNN", so a 5-char
    // suffix like "-1001" pushed a 56-char base to 61 chars (>60). The fix
    // re-slices the base per suffix length.
    const longBase = "a".repeat(200);
    let calls = 0;
    const exists = async () => {
      calls += 1;
      return calls <= 1000; // forces suffix to "-1001" (5 chars)
    };
    const result = await ensureUniqueSlug(longBase, exists);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("-1001")).toBe(true);
  });
});

describe("formatINR", () => {
  it("formats positive numbers with INR currency and Indian grouping", () => {
    const out = formatINR(125000);
    // ₹ symbol or "INR" depending on ICU; assert digits + grouping.
    expect(out).toMatch(/1,25,000/);
  });

  it("formats zero correctly", () => {
    const out = formatINR(0);
    expect(out).toMatch(/0/);
  });

  it("drops fractional digits per maximumFractionDigits: 0", () => {
    const out = formatINR(99.6);
    // No decimal point in the output.
    expect(out).not.toMatch(/\./);
  });
});
