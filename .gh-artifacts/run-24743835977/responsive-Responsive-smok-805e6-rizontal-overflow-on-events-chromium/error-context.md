# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.ts >> Responsive smoke >> iPhoneXR has no major horizontal overflow on /events
- Location: tests/e2e/responsive.spec.ts:27:11

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('body')
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('body')
    14 × locator resolved to <body>…</body>
       - unexpected value "hidden"

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const viewports = [
  4  |   { name: "iPhoneSE", width: 375, height: 667 },
  5  |   { name: "iPhoneXR", width: 414, height: 896 },
  6  |   { name: "iPhone12Pro", width: 390, height: 844 },
  7  |   { name: "iPhone14ProMax", width: 430, height: 932 },
  8  |   { name: "Pixel7", width: 412, height: 915 },
  9  |   { name: "GalaxyS20Ultra", width: 412, height: 915 },
  10 |   { name: "iPadMini", width: 768, height: 1024 },
  11 |   { name: "iPadAir", width: 820, height: 1180 },
  12 |   { name: "iPadPro", width: 1024, height: 1366 },
  13 |   { name: "SurfacePro7", width: 912, height: 1368 },
  14 |   { name: "SurfaceDuo", width: 540, height: 720 },
  15 |   { name: "GalaxyZFold5", width: 882, height: 344 },
  16 |   { name: "AsusZenbookFold", width: 853, height: 1280 },
  17 |   { name: "GalaxyA51_71", width: 412, height: 914 },
  18 |   { name: "NestHub", width: 1024, height: 600 },
  19 |   { name: "NestHubMax", width: 1280, height: 800 },
  20 | ];
  21 | 
  22 | const pagesToCheck = ["/login", "/signup", "/events", "/stats"];
  23 | 
  24 | test.describe("Responsive smoke", () => {
  25 |   for (const viewport of viewports) {
  26 |     for (const route of pagesToCheck) {
  27 |       test(`${viewport.name} has no major horizontal overflow on ${route}`, async ({ page }) => {
  28 |         await page.setViewportSize({ width: viewport.width, height: viewport.height });
  29 |         await page.goto(route);
  30 | 
> 31 |         await expect(page.locator("body")).toBeVisible();
     |                                            ^ Error: expect(locator).toBeVisible() failed
  32 | 
  33 |         const hasOverflow = await page.evaluate(() => {
  34 |           const doc = document.documentElement;
  35 |           return doc.scrollWidth > doc.clientWidth + 1;
  36 |         });
  37 |         expect(hasOverflow).toBeFalsy();
  38 |       });
  39 |     }
  40 |   }
  41 | });
  42 | 
```