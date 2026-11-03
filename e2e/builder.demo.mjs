import { expect, test } from "@playwright/test";

// demo/builder.html in a real browser at a phone's width and a desk's, in Chromium and WebKit: a choice changes the part and the code, and is kept in the address.
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/builder.html${query}`);
  await expect(page.locator('[data-testid="stage"] kazoku-view-controls')).toBeAttached();
  return errors;
};

test("a layout and a level are written into the code and kept in the address", async ({ page }) => {
  const errors = await ready(page);
  await page.locator('#options [data-key="layout"] [data-value="compact"]').click();
  await page.locator('#options [data-key="level"] [data-value="advanced"]').click();
  await expect(page.locator("#code")).toContainText('layout="compact"');
  await expect(page.locator("#code")).toContainText('controls="advanced"');
  await expect(page.locator('[data-testid="stage"] kazoku-view-controls')).toHaveAttribute("layout", "compact");
  expect(await page.evaluate(() => location.search)).toContain("layout");
  expect(errors).toEqual([]);
});

test("each part builds its own tag, and a link opens the same setup", async ({ page }) => {
  await ready(page);
  for (const [part, tag] of [["theme-switch", "kazoku-theme-switch"], ["language-picker", "kazoku-language-picker"], ["save-image", "kazoku-save-image"]]) {
    await page.locator(`#parts [data-part="${part}"]`).click();
    await expect(page.locator("#code")).toContainText(`<${tag}`);
    await expect(page.locator(`[data-testid="stage"] ${tag}`)).toBeAttached();
  }
  await page.locator('#options [data-key="formats"] [data-value="png"]').click();
  await expect(page.locator("#code")).toContainText('formats="png"');
  const search = await page.evaluate(() => location.search);
  await page.goto(`/builder.html${search}`);
  await expect(page.locator("#code")).toContainText('formats="png"');
  await expect(page.locator('#parts [data-part="save-image"]')).toHaveAttribute("aria-pressed", "true");
});

test("the Japanese words come with the page's language", async ({ page }) => {
  await ready(page, "?lang=ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator('#parts [data-part="view-controls"]')).toHaveText("表示の操作");
});

test("every control is at least 44 px high and nothing is wider than the screen", async ({ page }) => {
  await ready(page);
  const report = await page.evaluate(() => ({
    small: [...document.querySelectorAll("#parts button, #options button, #copy")].filter((b) => b.getBoundingClientRect().height < 44).length,
    wide: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));
  expect(report).toEqual({ small: 0, wide: false });
});
