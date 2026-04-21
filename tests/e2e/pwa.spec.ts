import { expect, test } from "@playwright/test";

test.describe("PWA surfaces", () => {
  test("manifest is reachable and has core fields", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("service worker script is served", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("self.addEventListener");
  });

  test("offline page renders when directly requested", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  });
});
