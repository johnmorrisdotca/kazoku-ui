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

test("a row's buttons name their item, a keyboard keeps its place through a move and a remove, and a picker moved on the page is still one", async ({ page }) => {
  const errors = await ready(page);
  for (const name of ["mars", "vega"]) {
    await box(page).fill(name);
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("#out")).toHaveText("mars, vega");
  await expect(shadow(page, 'button[data-id="mars"][data-act="remove"]')).toHaveAccessibleName(/^Remove Mars/);
  // vega up with the keyboard: vega's button still has the focus (its Up is now at the top and off, so its Down)
  await shadow(page, 'button[data-id="vega"][data-act="up"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#out")).toHaveText("vega, mars");
  const focused = () => page.locator("kazoku-collection-picker").evaluate((el) => { const a = el.shadowRoot.activeElement; return a ? `${a.getAttribute("data-id")} ${a.getAttribute("data-act")}` : null; });
  expect(await focused()).toBe("vega down");
  // remove vega: the row now in its place (mars) has the focus
  await shadow(page, 'button[data-id="vega"][data-act="remove"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#out")).toHaveText("mars");
  expect(await focused()).toBe("mars remove");
  // the options are the listbox's own: their rows are only holders
  await box(page).fill("ve");
  expect(await shadow(page, "#suggestions > li").evaluateAll((rows) => rows.every((row) => row.getAttribute("role") === "presentation"))).toBe(true);
  // moved to another place on the page, it is still one field and one list
  const counts = await page.locator("kazoku-collection-picker").evaluate((el) => {
    document.body.append(el);
    return { fields: el.shadowRoot.querySelectorAll(".field").length, lists: el.shadowRoot.querySelectorAll(".chosen").length };
  });
  expect(counts).toEqual({ fields: 1, lists: 1 });
  expect(errors).toEqual([]);
});
