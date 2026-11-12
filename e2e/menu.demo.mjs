import { expect, test } from "@playwright/test";

test("Settings opens the page's theme switch, and Escape closes it", async ({ page }) => {
  await page.goto("/menu.html");
  const menu = page.locator("[data-testid=settings]");
  const opener = menu.locator("button.opener");
  await expect(opener).toBeVisible();
  const box = await opener.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  await opener.click();
  await expect(menu.locator("kazoku-theme-switch")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu.locator("#panel")).toBeHidden();
  await expect(opener).toBeFocused();
});

test("the button says 設定 when the page is Japanese", async ({ page }) => {
  await page.goto("/menu.html?lang=ja");
  await expect(page.locator("[data-testid=settings] button.opener")).toContainText("設定");
});
