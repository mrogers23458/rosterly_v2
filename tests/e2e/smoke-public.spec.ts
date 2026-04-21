import { expect, test } from "@playwright/test";

test.describe("Public route smoke", () => {
  const routes = [
    { path: "/" },
    { path: "/login" },
    { path: "/signup" },
    { path: "/privacy" },
    { path: "/terms" },
  ];

  for (const route of routes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveTitle(/Rosterly/i);
      await expect(page).toHaveURL(new RegExp(route.path === "/" ? "/$" : route.path));
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
