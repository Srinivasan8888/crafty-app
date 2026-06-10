import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("homepage smoke", () => {
  test("/ redirects to /bengaluru and renders the four rails", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/bengaluru$/);

    // The four discovery rails from PRD §7.1.
    await expect(page.getByRole("heading", { name: /Crafters in Bengaluru/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Stores in Bengaluru/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Learn in Bengaluru/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Events in Bengaluru/i })).toBeVisible();
  });

  test("axe-core: homepage has no critical a11y violations", async ({ page }) => {
    await page.goto("/bengaluru");
    const results = await new AxeBuilder({ page: page as any })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test("List your profile entry point", async ({ page }) => {
    await page.goto("/list-your-profile");
    await expect(page).toHaveURL(/list-your-profile/);
    await expect(page.getByText(/get your craft\s+discovered/i)).toBeVisible();
  });
});
