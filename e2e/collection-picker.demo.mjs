import { expect, test } from "@playwright/test";

// The collection picker on demo/collection.html. A reader searches, adds, reorders and removes, with the pointer and with the keyboard.
const ready = async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/collection.html");
  await expect(page.locator("kazoku-collection-picker")).toBeVisible();
  return errors;
};
const box = (page) => page.locator("kazoku-collection-picker").locator("input");
const shadow = (page, selector) => page.locator("kazoku-collection-picker").locator(selector);

test("typing a name offers it, Enter adds it, and move and remove change the order", async ({ page }) => {
  const errors = await ready(page);
  await box(page).fill("mars");
  await expect(shadow(page, "#suggestions button")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("#out")).toHaveText("mars");
  await box(page).fill("vega");
  await shadow(page, "#suggestions button").click();
  await expect(page.locator("#out")).toHaveText("mars, vega");
  await shadow(page, 'button[data-id="vega"][data-act="up"]').click();
  await expect(page.locator("#out")).toHaveText("vega, mars");
  await shadow(page, 'button[data-id="mars"][data-act="remove"]').click();
  await expect(page.locator("#out")).toHaveText("vega");
  const small = await page.locator("kazoku-collection-picker").locator("button").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height < 47.5).length);
  expect(small).toBe(0);
  expect(errors).toEqual([]);
});

test("the labels are Japanese when the page is", async ({ page }) => {
  await ready(page);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(box(page)).toHaveAttribute("placeholder", "検索");
  await box(page).fill("火星");
  await expect(shadow(page, "#suggestions button")).toHaveText("火星 · 惑星");
});
