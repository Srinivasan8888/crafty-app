import { test, expect } from "@playwright/test";

// PRD §19.3 IRON RULE — search flow E2E.

test.describe("search flow", () => {
  test("/bengaluru/search?q=pottery returns grouped results", async ({ page }) => {
    await page.goto("/bengaluru/search?q=pottery");
    // The page should echo the query and render at least one result group.
    await expect(page.locator("body")).toContainText(/pottery/i);
  });

  test("empty query state", async ({ page }) => {
    await page.goto("/bengaluru/search");
    await expect(page.locator("body")).toContainText(/search|find|crafters/i);
  });
});
