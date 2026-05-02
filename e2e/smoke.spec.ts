import { test, expect } from "@playwright/test";

/**
 * Minimal smoke test — verifies the app boots and serves the homepage.
 * Full happy-path E2E coverage requires a seeded test DB, which is out of
 * scope for this lane. Add deeper specs once a CI Postgres is in place.
 */
test("homepage renders successfully and contains 'Crafty'", async ({ page }) => {
  // The root route 307-redirects to /<defaultCity> (e.g. /bengaluru).
  // Playwright follows redirects; we assert the final response is 200 and
  // that the rendered page contains the brand name somewhere.
  const response = await page.goto("/");
  expect(response, "navigation response should not be null").not.toBeNull();
  expect(response!.status()).toBeLessThan(400);

  // Wait for hydration before asserting on text content.
  await page.waitForLoadState("domcontentloaded");

  // "Crafty" should appear in the page (logo, title, or nav). We use a
  // case-sensitive match because the brand is always title-cased.
  await expect(page.locator("body")).toContainText("Crafty");
});
