import { expect, test } from "@playwright/test";

const viewports = [
  { name: "iPhoneSE", width: 375, height: 667 },
  { name: "iPhoneXR", width: 414, height: 896 },
  { name: "iPhone12Pro", width: 390, height: 844 },
  { name: "iPhone14ProMax", width: 430, height: 932 },
  { name: "Pixel7", width: 412, height: 915 },
  { name: "GalaxyS20Ultra", width: 412, height: 915 },
  { name: "iPadMini", width: 768, height: 1024 },
  { name: "iPadAir", width: 820, height: 1180 },
  { name: "iPadPro", width: 1024, height: 1366 },
  { name: "SurfacePro7", width: 912, height: 1368 },
  { name: "SurfaceDuo", width: 540, height: 720 },
  { name: "GalaxyZFold5", width: 882, height: 344 },
  { name: "AsusZenbookFold", width: 853, height: 1280 },
  { name: "GalaxyA51_71", width: 412, height: 914 },
  { name: "NestHub", width: 1024, height: 600 },
  { name: "NestHubMax", width: 1280, height: 800 },
];

const pagesToCheck = ["/login", "/signup", "/events", "/stats"];

test.describe("Responsive smoke", () => {
  for (const viewport of viewports) {
    for (const route of pagesToCheck) {
      test(`${viewport.name} has no major horizontal overflow on ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route);

        await expect(page.locator("body")).toBeVisible();

        const hasOverflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 1;
        });
        expect(hasOverflow).toBeFalsy();
      });
    }
  }
});
