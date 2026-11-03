import { expect, test } from "@playwright/test";

// <kazoku-speed-buttons> on its own page: the default 0.5×, 1×, 2×, any other steps, the attribute, the address, the event, the words, and with reduced motion.
const tid = (page, id) => page.locator(`[data-testid="${id}"]`);
const press = (page, id, value) => page.locator(`[data-testid="${id}"] button[data-v="${value}"]`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/speed.html${query}`);
  await expect(tid(page, "turn-speed").locator("button").first()).toBeVisible();
  return errors;
};
const pressed = (page, id) => tid(page, id).locator("button").evaluateAll((all) => all.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.v));

test("the default buttons are 0.5×, 1× and 2×, 1× is on, each is a finger wide and none is a menu", async ({ page }) => {
  const errors = await ready(page);
  await expect(tid(page, "turn-speed").locator("button")).toHaveText(["0.5×", "1×", "2×"]);
  expect(await pressed(page, "turn-speed")).toEqual(["1"]);
  expect(await tid(page, "turn-speed").locator("select, option").count()).toBe(0);
  const boxes = await tid(page, "turn-speed").locator("button").evaluateAll((all) => all.map((b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }));
  for (const [width, height] of boxes) {
    expect(width).toBeGreaterThanOrEqual(47.5);
    expect(height).toBeGreaterThanOrEqual(47.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("a press turns that button on, writes the value attribute and the address, and tells the page; the start leaves the address", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.heard = []; document.getElementById("turn-speed").addEventListener("kazoku-speedchange", (e) => window.heard.push(e.detail)); });
  await press(page, "turn-speed", 2).click();
  expect(await pressed(page, "turn-speed")).toEqual(["2"]);
  await expect(tid(page, "turn-speed")).toHaveAttribute("value", "2");
  expect(await tid(page, "turn-speed").evaluate((el) => el.value)).toBe(2);
  await expect(page).toHaveURL(/turn=2/);
  expect(await page.evaluate(() => window.heard)).toEqual([{ value: 2, steps: [0.5, 1, 2], reason: "user" }]);
  await press(page, "turn-speed", 1).click();
  await expect(page).not.toHaveURL(/turn=/);
  await press(page, "turn-speed", 0.5).click();
  await expect(page).toHaveURL(/turn=0\.5/);
  await expect(tid(page, "turn-out")).toContainText("0.5×");
});

test("a page opened on an address starts there, and other parameters are kept", async ({ page }) => {
  await ready(page, "?turn=0.5&days=100&replay=4&keep=1");
  expect(await pressed(page, "turn-speed")).toEqual(["0.5"]);
  expect(await pressed(page, "days-speed")).toEqual(["100"]);
  expect(await pressed(page, "replay-speed")).toEqual(["4"]);
  await press(page, "days-speed", 10).click();
  await expect(page).toHaveURL(/keep=1/);
  await expect(page).toHaveURL(/days=10/);
});

test("any steps: a solar system's days a second, and a replay bar's five speeds", async ({ page }) => {
  await ready(page);
  await expect(tid(page, "days-speed").locator("button")).toHaveText(["1", "10", "100"]);
  await expect(tid(page, "replay-speed").locator("button")).toHaveText(["0.25×", "0.5×", "1×", "2×", "4×"]);
  expect(await pressed(page, "days-speed")).toEqual(["1"]);
  await press(page, "replay-speed", 4).click();
  expect(await pressed(page, "replay-speed")).toEqual(["4"]);
  await expect(tid(page, "days-speed").locator("[role='group']")).toHaveAttribute("aria-label", "Days a second");
});

test("the attribute and the property move the buttons, and new steps keep the nearest speed", async ({ page }) => {
  await ready(page);
  const el = tid(page, "replay-speed");
  await el.evaluate((node) => node.setAttribute("value", "2"));
  expect(await pressed(page, "replay-speed")).toEqual(["2"]);
  await el.evaluate((node) => { node.value = 3; });
  expect(await pressed(page, "replay-speed")).toEqual(["4"]);
  await el.evaluate((node) => node.setAttribute("steps", "1 10"));
  await expect(el.locator("button")).toHaveText(["1×", "10×"]);
  expect(await pressed(page, "replay-speed")).toEqual(["10"]);
  await el.evaluate((node) => { node.steps = [-1, 0, 1]; });
  await expect(el.locator("button")).toHaveText(["−1×", "0×", "1×"]);
  await el.evaluate((node) => node.step(1));
  expect(await el.evaluate((node) => node.value)).toBe(-1);
});

test("with reduced motion the buttons still step", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await press(page, "turn-speed", 2).click();
  expect(await pressed(page, "turn-speed")).toEqual(["2"]);
  await tid(page, "turn-speed").evaluate((el) => el.step(1));
  expect(await pressed(page, "turn-speed")).toEqual(["0.5"]);
});

test("the name and the numbers are English or Japanese, and the demo stays inside the screen", async ({ page }) => {
  await ready(page);
  await expect(tid(page, "turn-speed").locator("[role='group']")).toHaveAttribute("aria-label", "Speed");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(tid(page, "turn-speed").locator("[role='group']")).toHaveAttribute("aria-label", "速さ");
  await expect(tid(page, "days-speed").locator("[role='group']")).toHaveAttribute("aria-label", "1秒あたりの日数");
  await expect(tid(page, "turn-speed").locator("button").nth(0)).toHaveText("0.5×");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("a look in the page's own style: no browser-default button", async ({ page }) => {
  await ready(page);
  const plain = await page.evaluate(() => [...document.querySelectorAll("kazoku-speed-buttons")].flatMap((el) => [...el.shadowRoot.querySelectorAll("button")]).filter((b) => getComputedStyle(b).appearance !== "none").length);
  expect(plain).toBe(0);
});
