import { describe, it, expect } from "vitest";
import { safeCounterpartyName } from "@/lib/messaging";

describe("safeCounterpartyName", () => {
  it("uses the display name when present", () => {
    expect(
      safeCounterpartyName({
        viewerIsBuyer: true,
        displayName: "Aisha",
        entityName: "Aisha Crochet",
      }),
    ).toBe("Aisha");
  });

  it("buyer with a nameless owner falls back to the listing name — never an email", () => {
    const out = safeCounterpartyName({
      viewerIsBuyer: true,
      displayName: null,
      entityName: "Aisha Crochet",
    });
    expect(out).toBe("Aisha Crochet");
    expect(out).not.toMatch(/@/);
  });

  it("owner with a nameless buyer gets a neutral label — never an email", () => {
    const out = safeCounterpartyName({
      viewerIsBuyer: false,
      displayName: null,
      entityName: "Aisha Crochet",
    });
    expect(out).toBe("Crafty member");
    expect(out).not.toMatch(/@/);
  });

  it("blank display name + no entity still avoids leaking anything", () => {
    expect(
      safeCounterpartyName({ viewerIsBuyer: true, displayName: "   ", entityName: null }),
    ).toBe("Crafty member");
  });
});
