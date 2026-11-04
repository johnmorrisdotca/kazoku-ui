import { expect, test } from "@playwright/test";

// The automatic turn must go idle when nothing can see the view: scrolled out of sight, or a hidden tab. Idle means no `kazoku-viewchange` events and no animation-frame callbacks at all.
const BAR = "kazoku-view-controls";
const SETTLE = 400;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const seen = { frames: 0, auto: 0 };
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request((time) => { seen.frames += 1; callback(time); });
    document.addEventListener("kazoku-viewchange", (event) => { if (event.detail.reason === "auto") seen.auto += 1; }, true);
    window.__seen = seen;
  });
  await page.goto("/");
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
});

const count = (page) => page.evaluate(() => ({ ...window.__seen }));
/** What happens in `ms` milliseconds. */
const during = async (page, ms) => {
  const before = await count(page);
  await page.waitForTimeout(ms);
  const after = await count(page);
  return { frames: after.frames - before.frames, auto: after.auto - before.auto };
};
/** The view is seen to turn: more than five changes (and frames) arrive, however slow the machine's frames are. It waits for them, not for a fixed time. */
const turnsAgain = async (page) => {
  const before = await count(page);
  await expect.poll(async () => {
    const now = await count(page);
    return { auto: now.auto - before.auto > 5, frames: now.frames - before.frames > 5 };
  }, { timeout: 15_000 }).toEqual({ auto: true, frames: true });
};
const play = (page) => page.evaluate((tag) => document.querySelector(tag).play(), BAR);
const turning = (page) => page.evaluate((tag) => document.querySelector(tag).state.turning, BAR);
const scrollAway = (page) => page.evaluate(() => {
  const spacer = document.createElement("div");
  spacer.id = "spacer";
  spacer.style.height = "4000px";
  document.body.prepend(spacer);
  window.scrollTo(0, 0);
});
const scrollBack = (page) => page.evaluate(() => document.getElementById("scene").scrollIntoView());
const hideTab = (page, hidden) => page.evaluate((value) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (value ? "hidden" : "visible") });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
  document.dispatchEvent(new window.Event("visibilitychange"));
}, hidden);

test("it turns while the view is on screen", async ({ page }) => {
  await play(page);
  await turnsAgain(page);
});

test("scrolled out of sight, no change events and no frames; back in sight, it goes on", async ({ page }) => {
  await play(page);
  await scrollAway(page);
  await page.waitForTimeout(SETTLE);
  const off = await during(page, 800);
  expect(off).toEqual({ frames: 0, auto: 0 });
  expect(await turning(page)).toBe(true);
  await scrollBack(page);
  await turnsAgain(page);
});

test("a hidden tab sends no change events and asks for no frames; shown again, it goes on", async ({ page }) => {
  await play(page);
  await hideTab(page, true);
  await page.waitForTimeout(100);
  expect(await during(page, 800)).toEqual({ frames: 0, auto: 0 });
  expect(await turning(page)).toBe(true);
  await hideTab(page, false);
  await turnsAgain(page);
});

test("hidden and scrolled away at once needs both undone", async ({ page }) => {
  await play(page);
  await hideTab(page, true);
  await scrollAway(page);
  await page.waitForTimeout(SETTLE);
  await hideTab(page, false);
  expect(await during(page, 600)).toEqual({ frames: 0, auto: 0 });
  await scrollBack(page);
  await turnsAgain(page);
});

test("autoplay-for stops the turn by itself, counting only the time it turned", async ({ page }) => {
  await page.evaluate(() => {
    const controls = document.createElement("kazoku-view-controls");
    controls.id = "intro";
    controls.setAttribute("for", "scene");
    controls.setAttribute("autoplay", "");
    controls.setAttribute("autoplay-for", "1");
    document.body.append(controls);
  });
  const state = () => page.evaluate(() => document.getElementById("intro").state.turning);
  await expect.poll(state).toBe(true);
  await expect.poll(state, { timeout: 4000 }).toBe(false);
  const after = await during(page, 500);
  expect(after.auto).toBe(0);
});

test("autoplay-for also stops a turn the Play button or play() starts", async ({ page }) => {
  await page.evaluate(() => {
    const controls = document.createElement("kazoku-view-controls");
    controls.id = "intro";
    controls.setAttribute("for", "scene");
    controls.setAttribute("autoplay-for", "1");
    document.body.append(controls);
  });
  const state = () => page.evaluate(() => document.getElementById("intro").state.turning);
  await page.locator("#intro").evaluate((el) => el.shadowRoot.querySelector('[data-b="play"]').click());
  await expect.poll(state).toBe(true);
  await expect.poll(state, { timeout: 5000 }).toBe(false);
  await page.evaluate(() => document.getElementById("intro").play());
  await expect.poll(state).toBe(true);
  await expect.poll(state, { timeout: 5000 }).toBe(false);
  await page.evaluate(() => document.getElementById("intro").play(60));
  await page.waitForTimeout(1500);
  expect(await state()).toBe(true);
});

test("autoplay without autoplay-for keeps turning", async ({ page }) => {
  await page.evaluate(() => {
    const controls = document.createElement("kazoku-view-controls");
    controls.id = "intro";
    controls.setAttribute("for", "scene");
    controls.setAttribute("autoplay", "");
    document.body.append(controls);
  });
  await expect.poll(() => page.evaluate(() => document.getElementById("intro").state.turning)).toBe(true);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.getElementById("intro").state.turning)).toBe(true);
});
