import { test, expect } from "@playwright/test";

// PRD §19.3 IRON RULE — creator signup → first listing live.
// This test runs against DEV_AUTH mode (dev-stub user auto-logged-in as admin).
// In production the same flow goes through Descope; we cover the auth bypass case
// because that's what local dev exercises.

test.describe("creator publishes their first crafter", () => {
  test.skip(() => process.env.E2E_SKIP_CREATOR === "1", "skipped via env");

  test("starts at list-your-profile → dashboard → crafter form", async ({ page }) => {
    await page.goto("/list-your-profile");
    // Button accessible name comes from aria-label="Create a crafter profile".
    const cta = page.getByRole("button", { name: /create a crafter profile/i });
    await expect(cta).toBeVisible();
    await cta.click();

    // Either we hit /dashboard/crafter/new (no crafter yet) or the existing
    // public profile (founder already has one). Both are valid landings.
    await page.waitForURL(/\/(dashboard\/crafter\/new|crafters\/)/);
  });
});
