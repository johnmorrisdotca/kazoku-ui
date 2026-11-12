import { expect, test } from "@playwright/test";

// A bar bound to an element that moves its own view must keep that view, or the bar's next change snaps back to the old yaw and tilt.
test("a bound bar keeps a view the element shows itself, and the next change keeps that yaw", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("kazoku-view-controls .bar").first()).toBeVisible();
  await page.evaluate(async () => {
    const { carryControls } = await import("/dist/view-controls/index.js");
    const view = document.createElement("div");
    view.id = "moved";
    view.tabIndex = 0;
    view.style.cssText = "width:240px;height:180px";
    document.body.append(view);
    const hands = carryControls(view, { onChange: (state) => { window.__fromHands = state.yaw; } });
    const bar = document.createElement("kazoku-view-controls");
    bar.id = "moved-bar";
    bar.setAttribute("for", "moved");
    document.body.append(bar);
    window.__hands = hands;
    window.__bar = bar;
    window.__changes = [];
    bar.addEventListener("kazoku-viewchange", (event) => window.__changes.push({ yaw: event.detail.yaw, tilt: event.detail.tilt, zoom: event.detail.zoom, reason: event.detail.reason }));
  });
  await expect(page.locator("#moved-bar .bar")).toBeVisible();
  await page.evaluate(() => { window.__changes.length = 0; window.__hands.show({ yaw: 40, tilt: 12, zoom: 2 }); });
  await expect.poll(() => page.evaluate(() => window.__bar.state.yaw)).toBe(40);
  const state = await page.evaluate(() => window.__bar.state);
  expect(state).toMatchObject({ yaw: 40, tilt: 12, zoom: 2 });
  expect(await page.evaluate(() => window.__changes)).toEqual([]);
  expect(await page.evaluate(() => window.__fromHands)).toBeUndefined();
  await page.locator("#moved-bar").evaluate((el) => el.set({ zoom: 3 }));
  const last = await page.evaluate(() => window.__changes.at(-1));
  expect(last).toMatchObject({ yaw: 40, tilt: 12, zoom: 3, reason: "set" });
});
