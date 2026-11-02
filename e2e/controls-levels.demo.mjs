import { expect, test } from "@playwright/test";

// The controls' two levels, the zoom readout and the auto-turn speed, in a real browser at a phone's width and a desk's.
const BAR = "kazoku-view-controls";
const stateOf = (page) => page.evaluate((tag) => ({ ...document.querySelector(tag).state }), BAR);
const button = (page, name) => page.locator(`${BAR} [data-b="${name}"]`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  return errors;
};
/** The names of the buttons and sliders a reader can see. */
const shown = (page) => page.evaluate(() => {
  const root = document.querySelector("kazoku-view-controls").shadowRoot;
  return [...root.querySelectorAll("button, input")].filter((el) => el.getClientRects().length > 0).map((el) => el.dataset.b ?? el.id);
});

test("the controls start basic: turn, Auto-turn, zoom, Fit and More, and nothing else", async ({ page }) => {
  const errors = await ready(page);
  expect(await shown(page)).toEqual(["yaw", "play", "out", "level", "in", "fit", "more"]);
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "false");
  const sizes = await page.evaluate(() => [...document.querySelector("kazoku-view-controls").shadowRoot.querySelectorAll("button, input")].filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect().height));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(47.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("More shows tilt, speed, Front, 2 times and, once zoomed, the pan pad; and shows them as the page's own style", async ({ page }) => {
  await ready(page);
  await button(page, "more").click();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  expect(await shown(page)).toEqual(["yaw", "tilt", "play", "slow", "medium", "fast", "front", "out", "level", "in", "two", "fit", "more"]);
  await button(page, "two").click();
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeVisible();
  const plain = await page.evaluate(() => [...document.querySelector("kazoku-view-controls").shadowRoot.querySelectorAll("button, input")].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).appearance !== "none").map((el) => el.dataset.b ?? el.id));
  expect(plain).toEqual([]);
  await button(page, "more").click();
  expect(await shown(page)).toEqual(["yaw", "play", "out", "level", "in", "fit", "more"]);
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeHidden();
});

test("the level is remembered, an attribute is only the start, and the reader's choice wins", async ({ page }) => {
  await ready(page);
  await button(page, "more").click();
  await page.reload();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  await expect(button(page, "tilt")).toHaveCount(0);
  await expect(page.locator(`${BAR} #tilt`)).toBeVisible();
  // What the reader chose beats the controls attribute a page writes in its markup (an element made with the attribute already on it).
  const levelOf = (attribute) => page.evaluate((value) => {
    const el = document.createElement("kazoku-view-controls");
    el.setAttribute("controls", value);
    document.body.append(el);
    const level = el.dataset.level;
    el.remove();
    return level;
  }, attribute);
  expect(await levelOf("basic")).toBe("advanced");
  await button(page, "more").click();
  expect(await levelOf("advanced")).toBe("basic");
  await page.evaluate(() => window.localStorage.removeItem("kazoku-view-controls"));
  expect(await levelOf("advanced")).toBe("advanced");
  expect(await levelOf("bogus")).toBe("basic");
});

test("a page that sets controls=advanced starts advanced when nothing is remembered", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
});

test("a browser that keeps nothing still toggles", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const errors = await ready(page);
  await button(page, "more").click();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  expect(errors).toEqual([]);
});

test("the zoom readout follows every zoom, and a tap on it is Fit", async ({ page }) => {
  await ready(page);
  const readout = button(page, "level");
  await expect(readout).toHaveText("1×");
  await button(page, "in").click();
  await expect(readout).toHaveText("1.4×");
  await expect(readout).toHaveAttribute("aria-label", "Zoom level 1.4×, back to Fit");
  await button(page, "in").click();
  await expect(readout).toHaveText("2×");
  await page.evaluate(() => document.querySelector("kazoku-view-controls").set({ zoom: 2.4 }));
  await expect(readout).toHaveText("2.4×");
  await readout.click();
  expect((await stateOf(page)).zoom).toBe(1);
  await expect(readout).toHaveText("1×");
});

test("a screen reader is told the zoom once it settles, and not on load", async ({ page }) => {
  await ready(page);
  const live = page.locator(`${BAR} [data-live]`);
  await expect(live).toHaveAttribute("role", "status");
  await page.waitForTimeout(600);
  await expect(live).toHaveText("");
  await page.evaluate(() => { const el = document.querySelector("kazoku-view-controls"); for (const z of [1.2, 1.5, 1.9, 2.4]) el.set({ zoom: z }, false); });
  await expect(live).toHaveText("Zoom level 2.4×");
});

test("Slow, Medium and Fast change the turn's speed and keep it turning, and are kept in the address", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const speed = () => page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed);
  expect(await speed()).toBe(30);
  await expect(button(page, "medium")).toHaveAttribute("aria-pressed", "true");
  await button(page, "play").click();
  await button(page, "fast").click();
  expect(await speed()).toBe(60);
  expect((await stateOf(page)).turning).toBe(true);
  await expect(button(page, "fast")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "medium")).toHaveAttribute("aria-pressed", "false");
  await expect(page).toHaveURL(/speed=fast/);
  await button(page, "slow").click();
  expect(await speed()).toBe(15);
  await expect(page).toHaveURL(/speed=slow/);
  await button(page, "medium").click();
  expect(await speed()).toBe(30);
  await expect(page).not.toHaveURL(/speed=/);
});

test("the faster the pace the faster the angle moves", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const turned = async (pace) => {
    await button(page, pace).click();
    await page.evaluate(() => document.querySelector("kazoku-view-controls").set({ yaw: 0 }));
    await page.waitForTimeout(600);
    return (await stateOf(page)).yaw;
  };
  await button(page, "play").click();
  const slow = await turned("slow");
  const fast = await turned("fast");
  expect(fast).toBeGreaterThan(slow * 2.5);
});

test("a page opened on a speed starts at it", async ({ page }) => {
  await ready(page, "?controls=advanced&speed=slow");
  await expect(button(page, "slow")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(15);
});

test("the labels are English or Japanese", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await expect(button(page, "more")).toHaveText("More");
  await expect(button(page, "slow")).toHaveText("Slow");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(button(page, "more")).toHaveText("詳細");
  await expect(button(page, "slow")).toHaveText("ゆっくり");
  await expect(page.locator(`${BAR} [data-g="pace"]`)).toHaveAttribute("aria-label", "速さ");
  await expect(button(page, "level")).toHaveAttribute("aria-label", "ズーム倍率 1×, 全体に戻す");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("a flat view shows no speed, tilt or Front even when advanced", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await page.evaluate(() => document.querySelector("kazoku-view-controls").setAttribute("flat", ""));
  expect(await shown(page)).toEqual(["out", "level", "in", "two", "fit", "more"]);
});
