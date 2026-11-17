import { expect, test } from "@playwright/test";

// The search box on demo/search-long.html: one kind with ten thousand rows (9,812 start with Starlink). Narrowed to it, the list goes on as the reader scrolls or walks it, a count line says how many
// are drawn, only what has been reached is drawn, and a short answer is as it always was. Every wait is on the page's state, never on a timer.
const host = (page) => page.locator("kazoku-search-box");
const ready = async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search-long.html");
  await expect(host(page)).toBeVisible();
  return errors;
};
const input = (page) => host(page).locator("input");
const rows = (page) => host(page).locator("[role=row][data-i]:not(.extra)");
const panel = (page) => host(page).locator(".panel");
const count = (page) => host(page).locator(".count");
const narrow = async (page, text) => {
  await input(page).fill(text);
  await host(page).locator("[data-kind=all]").click();
  await expect(rows(page).first()).toBeVisible();
};
const drawn = (page) => rows(page).count();
const scrollEnd = (page) => panel(page).evaluate((el) => void (el.scrollTop = el.scrollHeight));

test("narrowed to ten thousand, a window is drawn, the count line says so, and each row knows its place in the whole", async ({ page }) => {
  const errors = await ready(page);
  await input(page).fill("starlink");
  await expect(host(page).locator("[role=rowheader] .n")).toHaveText("9812");
  // not narrowed: a few rows and See all, as for any answer
  await expect(count(page)).toBeHidden();
  await host(page).locator("[data-kind=all]").click();
  await expect(rows(page)).toHaveCount(20);
  await expect(count(page)).toHaveText("Showing 20 of 9,812");
  await expect(rows(page).first()).toHaveAttribute("aria-setsize", "9812");
  await expect(rows(page).first()).toHaveAttribute("aria-posinset", "1");
  await expect(rows(page).nth(19)).toHaveAttribute("aria-posinset", "20");
  expect(errors).toEqual([]);
});

test("scrolling to the end draws the next window under the rows already there, and keeps the rows above as they were", async ({ page }) => {
  await ready(page);
  await narrow(page, "starlink");
  const before = await host(page).evaluate((el) => {
    window.__first = el.shadowRoot.querySelector("[role=row][data-i='0']");
    return el.drawCount;
  });
  await scrollEnd(page);
  await expect.poll(() => drawn(page)).toBeGreaterThan(20);
  await expect(count(page)).toHaveText(/^Showing [\d,]+ of 9,812$/);
  const after = await host(page).evaluate((el) => ({ draws: el.drawCount, same: el.shadowRoot.querySelector("[role=row][data-i='0']") === window.__first }));
  expect(after).toEqual({ draws: before, same: true });
  // it goes on while the reader goes on, and never draws the rows nobody has reached
  for (let i = 0; i < 4; i += 1) {
    const now = await drawn(page);
    await scrollEnd(page);
    await expect.poll(() => drawn(page)).toBeGreaterThan(now);
  }
  expect(await drawn(page)).toBeLessThan(400);
  const n = await drawn(page);
  await expect(count(page)).toHaveText(`Showing ${n.toLocaleString("en-US")} of 9,812`);
  await expect(rows(page).nth(n - 1)).toHaveAttribute("aria-posinset", String(n));
});

test("walking with the arrow keys never runs into the end of the drawn rows, and Page Down goes a page at a time", async ({ page }) => {
  await ready(page);
  await narrow(page, "starlink");
  await input(page).focus();
  const place = () => host(page).evaluate((el) => {
    const id = el.shadowRoot.querySelector("input").getAttribute("aria-activedescendant");
    return Number(el.shadowRoot.getElementById(id)?.closest("[role=row]")?.getAttribute("aria-posinset") ?? 0);
  });
  for (let i = 0; i < 30; i += 1) await page.keyboard.press("ArrowDown");
  await expect.poll(place).toBe(30);
  expect(await drawn(page)).toBeGreaterThan(30);
  const from = await place();
  await page.keyboard.press("PageDown");
  await expect.poll(place).toBeGreaterThan(from + 3);
  const down = await place();
  await page.keyboard.press("PageUp");
  await expect.poll(place).toBeLessThan(down);
  // Enter still does the highlighted row's action, whichever window it is in
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText(/^go Starlink-\d+$/);
});

test("a short answer has no count line, no place in a whole and no Show more", async ({ page }) => {
  await ready(page);
  await narrow(page, "orbcomm-18");
  await expect(rows(page)).toHaveCount(10);
  await expect(count(page)).toBeHidden();
  await expect(rows(page).first()).not.toHaveAttribute("aria-setsize", /.*/);
  await expect(host(page).locator("[data-kind=more]")).toHaveCount(0);
});

test("the popup closes on Escape, on a press outside, when the focus leaves, and when a row is picked", async ({ page }) => {
  await ready(page);
  await narrow(page, "starlink");
  await input(page).focus();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await input(page).fill("starlink-5");
  await expect(panel(page)).toBeVisible();
  // a press on plain text, as a finger makes it, does not take the focus from the box, so the press itself must close the popup
  await page.locator("h1").evaluate((el) => el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true })));
  await expect(input(page)).toBeFocused();
  await expect(panel(page)).toBeHidden();
  await input(page).fill("starlink-55");
  await expect(panel(page)).toBeVisible();
  await page.locator("h1").click();
  await expect(panel(page)).toBeHidden();
  await input(page).fill("starlink-6");
  await expect(panel(page)).toBeVisible();
  await input(page).evaluate((el) => el.blur());
  await expect(panel(page)).toBeHidden();
  await input(page).fill("starlink-7");
  await expect(rows(page).first()).toContainText("Starlink-7");
  await rows(page).first().locator(".main").click();
  await expect(page.locator("#picked")).toHaveText(/^go Starlink-7/);
  await expect(panel(page)).toBeHidden();
});
