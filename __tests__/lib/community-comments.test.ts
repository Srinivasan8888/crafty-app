import { describe, it, expect } from "vitest";
import { safeCommentAuthorName, toCommentView } from "@/lib/community-comments";

describe("safeCommentAuthorName", () => {
  it("uses the display name when present", () => {
    expect(safeCommentAuthorName("Aisha")).toBe("Aisha");
  });

  it("falls back to a neutral label when blank/null — never an email", () => {
    expect(safeCommentAuthorName(null)).toBe("Crafty member");
    expect(safeCommentAuthorName("   ")).toBe("Crafty member");
    expect(safeCommentAuthorName(null)).not.toMatch(/@/);
  });
});

describe("toCommentView", () => {
  const base = {
    id: "c1",
    body: "hello craft world",
    created_at: new Date("2026-06-18T10:00:00.000Z"),
  };

  it("maps a row to a privacy-safe view", () => {
    const view = toCommentView({ ...base, author: { display_name: "Aisha" } });
    expect(view).toEqual({
      id: "c1",
      body: "hello craft world",
      authorName: "Aisha",
      createdAt: "2026-06-18T10:00:00.000Z",
    });
  });

  it("never returns the author email even if one is over-selected onto the row", () => {
    const view = toCommentView({
      ...base,
      author: { display_name: null, email: "private@example.com" },
    });
    expect(JSON.stringify(view)).not.toMatch(/@/);
    expect(view.authorName).toBe("Crafty member");
  });
});
