import { expect, test } from "@playwright/test";
import { canvasSize, COUNT_SCRIPT, drainGpu, gpuObjects, readCounts, withinPixelBudget } from "../dist/testing/index.js";

// The shared 3D renderer on demo/renderer.html: thirty views, one WebGL context. The budgets every 3D package asserts: contexts = 1, draws and frames at rest = 0,
// the GPU objects flat over a run of changes, and the canvas within budget at 5K.
const demo = (page) => page.evaluate(() => window.kazokuDemo.renderer.stats);
const live = (page, i) => page.evaluate((n) => window.kazokuDemo.views[n].live, i);
const switchTo = async (page, i) => {
  await page.evaluate((n) => window.kazokuDemo.focusView(window.kazokuDemo.views[n]), i);
  await expect.poll(() => live(page, i)).toBe(true);
};
const canvases = (page) => page.evaluate(() => document.querySelectorAll(".host canvas").length);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(COUNT_SCRIPT);
  await page.goto(`/renderer.html${query}`);
  // A probe context is not the page's: it is let go at once and not counted.
  const gl = await page.evaluate(() => {
    const c = window.__kazokuCount.contexts;
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    window.__kazokuCount.contexts = c;
    return Boolean(context);
  });
  test.skip(!gl, "this browser has no WebGL here");
  await expect.poll(() => live(page, 0)).toBe(true);
  return errors;
};
/** Wait until the stills for the views in sight are made (no new one for a moment). */
const quiet = async (page) => {
  let last = -1;
  for (let i = 0; i < 40; i += 1) {
    const now = (await demo(page)).snapshots;
    if (now === last && now > 0) return;
    last = now;
    await page.waitForTimeout(400);
  }
};
/** The page's own JS heap in bytes after a collection (Chromium only). */
const heap = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  await cdp.detach();
  return metrics.find((m) => m.name === "JSHeapUsedSize").value;
};

test("thirty views and fifty changes of focus make one WebGL context and keep one canvas", async ({ page }) => {
  const errors = await ready(page);
  for (let step = 0; step < 50; step += 1) {
    await switchTo(page, (step * 7) % 30);
    expect(await canvases(page)).toBeLessThanOrEqual(1);
  }
  const counts = await readCounts(page);
  expect(counts.contexts).toBe(1);
  expect((await demo(page)).contexts).toBe(1);
  expect(await page.evaluate(() => document.querySelectorAll("canvas").length)).toBe(1);
  expect(errors).toEqual([]);
});

test("the views that are not live show a still, and a view that is live hides its own", async ({ page }) => {
  await ready(page);
  await quiet(page);
  const shown = await page.evaluate(() => [...document.querySelectorAll(".host")].map((h) => { const img = h.querySelector("img.kazoku-still"); const r = h.getBoundingClientRect(); return { inSight: r.top >= 0 && r.bottom <= window.innerHeight, live: Boolean(h.querySelector("canvas")), src: img?.getAttribute("src")?.startsWith("blob:") === true, visible: img ? getComputedStyle(img).visibility !== "hidden" : false }; }));
  expect(shown[0]).toEqual({ inSight: true, live: true, src: true, visible: false });
  const others = shown.slice(1).filter((h) => h.inSight);
  expect(others.length).toBeGreaterThan(1);
  expect(others.every((h) => !h.live && h.src && h.visible)).toBe(true);
});

test("at rest nothing is drawn and no frame is asked for", async ({ page }) => {
  await ready(page);
  await switchTo(page, 4);
  await quiet(page);
  await page.waitForTimeout(600);
  const before = { counts: await readCounts(page), stats: await demo(page) };
  await page.waitForTimeout(1500);
  const after = { counts: await readCounts(page), stats: await demo(page) };
  expect(after.counts.draws - before.counts.draws).toBe(0);
  expect(after.counts.rafRequests - before.counts.rafRequests).toBe(0);
  expect(after.stats.draws - before.stats.draws).toBe(0);
  expect(after.stats.frames.requests - before.stats.frames.requests).toBe(0);
});

test("turning draws once a frame, asks for one frame at a time, and stops when the turn does", async ({ page }) => {
  await ready(page);
  // The stills of the views in sight are drawn on the same context: let them finish, or their draws are counted as the turn's.
  await quiet(page);
  const start = await demo(page);
  await page.evaluate(() => window.kazokuDemo.controls.play());
  // A slow software frame holds the turn back: wait until it is drawing, not for a fixed time.
  await expect.poll(async () => (await demo(page)).draws - start.draws, { timeout: 15_000 }).toBeGreaterThan(5);
  const running = await demo(page);
  expect(running.frames.draws).toBeLessThanOrEqual(running.frames.frames);
  expect(running.frames.requests - running.frames.frames).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.kazokuDemo.controls.pause());
  // The frame already asked for is the last: wait for it, then nothing more may be drawn or asked for.
  await expect.poll(async () => { const { frames } = await demo(page); return frames.requests - frames.frames; }).toBe(0);
  const paused = await readCounts(page);
  await page.waitForTimeout(1000);
  const later = await readCounts(page);
  expect(later.draws - paused.draws).toBe(0);
  expect(later.rafRequests - paused.rafRequests).toBe(0);
  // Seconds of software drawing leave the GPU behind the page: this test pays for it, not the next one.
  await drainGpu(page);
});

test("a turning view is drawn at most 30 times a second, whatever the screen's rate", async ({ page }) => {
  await ready(page);
  await quiet(page);
  await page.evaluate(() => window.kazokuDemo.controls.play());
  // A slow software frame holds the turn back: wait until it is drawing, then time a window by the page's own clock.
  const first = await demo(page);
  await expect.poll(async () => (await demo(page)).draws - first.draws, { timeout: 15_000 }).toBeGreaterThan(3);
  const from = await page.evaluate((n) => ({ at: window.performance.now(), draws: n }), (await demo(page)).draws);
  await page.waitForTimeout(3000);
  const to = await page.evaluate(() => window.performance.now());
  const draws = (await demo(page)).draws - from.draws;
  const seconds = (to - from.at) / 1000;
  // Software drawing may be slower than 30, never faster; the page's frames may come at 60 or more.
  expect(draws).toBeLessThanOrEqual(Math.ceil(30 * seconds) + 1);
  expect(draws).toBeGreaterThan(0);
  await page.evaluate(() => window.kazokuDemo.controls.pause());
  // Three seconds of drawing leave the software GPU behind the page; pay for it here, not in the next test's clock.
  await drainGpu(page);
});

test("memory is steady over fifty changes of focus: the GPU objects, the cache and the heap are flat", async ({ page, browserName }) => {
  await ready(page, "?linger=150");
  // Warm up: every view live once, so every still and shared asset exists.
  for (let i = 0; i < 30; i += 1) await switchTo(page, i);
  await switchTo(page, 0);
  await quiet(page);
  await page.waitForTimeout(700);
  const a = { counts: await readCounts(page), stats: await demo(page), heap: browserName === "chromium" ? await heap(page) : 0 };
  for (let step = 0; step < 50; step += 1) await switchTo(page, (step * 11 + 3) % 30);
  await switchTo(page, 0);
  await quiet(page);
  await page.waitForTimeout(700);
  const b = { counts: await readCounts(page), stats: await demo(page), heap: browserName === "chromium" ? await heap(page) : 0 };
  expect(b.counts.contexts).toBe(1);
  expect(gpuObjects(b.counts)).toBe(gpuObjects(a.counts));
  expect(b.stats.assets.entries).toBe(a.stats.assets.entries);
  expect(b.stats.stills.count).toBe(a.stats.stills.count);
  expect(b.stats.stills.bytes).toBe(a.stats.stills.bytes);
  if (browserName === "chromium") expect(b.heap - a.heap).toBeLessThan(3 * 1024 * 1024);
  // Eighty changes of focus drew a great deal in software: settle the GPU before the next test's clock starts.
  await drainGpu(page);
});

test("a second view of the same shape takes the shared geometry from the cache", async ({ page }) => {
  await ready(page);
  await quiet(page);
  await switchTo(page, 0);
  const before = (await demo(page)).assets;
  // View 3 is a cube of another colour: its geometry is the cube's, still held, and at most its material is new.
  await switchTo(page, 3);
  const after = (await demo(page)).assets;
  expect(after.hits - before.hits).toBeGreaterThanOrEqual(1);
  expect(after.misses - before.misses).toBeLessThanOrEqual(1);
});

test("the canvas stays within budget when the view fills a 5K screen at pixel ratio 2", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 5120, height: 2880 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await ready(page);
  await page.locator('[data-testid="fill"]').click();
  await expect.poll(async () => (await demo(page)).canvas.pixels).toBeGreaterThan(3_000_000);
  const size = await canvasSize(page);
  expect(size.count).toBe(1);
  expect(withinPixelBudget(size)).toBe(true);
  const css = await page.evaluate(() => { const r = document.querySelector(".host canvas").getBoundingClientRect(); return { w: r.width, h: r.height }; });
  expect(css).toEqual({ w: 5120, h: 2880 });
  await context.close();
});

test("a canvas at a desk's size is drawn at the device's ratio, up to 2", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await ready(page);
  const host = await page.evaluate(() => { const h = document.querySelector(".host canvas").parentElement; return { w: h.clientWidth, h: h.clientHeight }; });
  const stats = await demo(page);
  expect(stats.canvas).toMatchObject({ width: host.w * 2, height: host.h * 2 });
  await context.close();
});

test("a lost context shows the still, a restored one draws again, and it is still one context", async ({ page }) => {
  await ready(page);
  const count = (await readCounts(page)).contexts;
  // A lost context gives no extensions, so the page keeps the one it asked for before.
  await page.evaluate(() => { window.__lose = document.querySelector(".host canvas").getContext("webgl2").getExtension("WEBGL_lose_context"); window.__lose.loseContext(); });
  await expect.poll(async () => (await demo(page)).lost).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="host-0"] img')).visibility)).toBe("visible");
  // onContext is told of both: "lost" now, and (KAZOKU-UI-15) "restored" once the context comes back.
  expect(await page.evaluate(() => window.kazokuDemo.contextEvents)).toEqual(["lost"]);
  await page.evaluate(() => window.__lose.restoreContext());
  await expect.poll(async () => (await demo(page)).lost).toBe(false);
  expect(await page.evaluate(() => window.kazokuDemo.contextEvents)).toEqual(["lost", "restored"]);
  const before = (await demo(page)).draws;
  await page.evaluate(() => window.kazokuDemo.renderer.focused.invalidate());
  await expect.poll(async () => (await demo(page)).draws).toBeGreaterThan(before);
  expect((await readCounts(page)).contexts).toBe(count);
  await drainGpu(page);
});

test("out of sight no frame is asked for, and after a while the context is let go; back in sight it is made again", async ({ page }) => {
  await ready(page, "?release=700");
  await quiet(page);
  await page.evaluate(() => { document.body.style.paddingBottom = "4000px"; window.kazokuDemo.controls.play(); });
  await page.waitForTimeout(400);
  expect((await demo(page)).draws).toBeGreaterThan(3);
  await page.evaluate(() => window.scrollTo(0, 3500));
  await page.waitForTimeout(300);
  const away = await readCounts(page);
  const drawn = (await demo(page)).draws;
  await page.waitForTimeout(400);
  expect((await readCounts(page)).rafRequests).toBe(away.rafRequests);
  expect((await demo(page)).draws).toBe(drawn);
  await expect.poll(async () => (await demo(page)).live).toBe(false);
  expect(await page.evaluate(() => document.querySelectorAll("canvas").length)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => live(page, 0)).toBe(true);
  expect((await demo(page)).contexts).toBe(2);
  expect(await page.evaluate(() => document.querySelectorAll("canvas").length)).toBe(1);
  await drainGpu(page);
});

test("the stills stay within their byte budget, and a view whose still was let go makes it again", async ({ page }) => {
  await ready(page, "?stills=1500000");
  const made = await page.evaluate(async () => {
    for (const view of window.kazokuDemo.views) await view.showStill();
    return window.kazokuDemo.renderer.stats;
  });
  expect(made.stills.bytes).toBeLessThanOrEqual(1_500_000);
  expect(made.stills.count).toBeLessThan(10);
  expect(made.snapshots).toBeGreaterThanOrEqual(30);
  const again = await page.evaluate(async () => {
    const view = window.kazokuDemo.views[1];
    const had = window.kazokuDemo.renderer.stills.get(view.item.key) !== undefined;
    await view.showStill();
    return { had, src: view.host.querySelector("img").getAttribute("src")?.startsWith("blob:") === true };
  });
  expect(again.src).toBe(true);
  expect(again.had).toBe(false);
});

test("a click on a view takes the renderer, and the view controls then move that view", async ({ page }) => {
  await ready(page);
  await quiet(page);
  await page.locator('[data-testid="host-9"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="host-9"]').click();
  await expect.poll(() => live(page, 9)).toBe(true);
  await page.waitForTimeout(500);
  expect(await live(page, 0)).toBe(false);
  expect(await page.evaluate(() => window.kazokuDemo.controls.view === document.querySelector('[data-testid="host-9"]'))).toBe(true);
  const before = (await demo(page)).draws;
  await page.evaluate(() => window.kazokuDemo.controls.set({ yaw: 40 }));
  await expect.poll(async () => (await demo(page)).draws).toBeGreaterThan(before);
  const settled = (await demo(page)).draws;
  await page.waitForTimeout(500);
  expect((await demo(page)).draws).toBe(settled);
  await drainGpu(page);
});

test("three.js is not fetched until a view first goes live, and then only once", async ({ page }) => {
  const asked = [];
  page.on("request", (request) => /three\.(module|core)\.js/.test(request.url()) && asked.push(request.url()));
  await page.goto("/renderer-lazy.html");
  await expect(page.locator('[data-testid="go"]')).toBeVisible();
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
  await page.locator('[data-testid="go"]').click();
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.view.live)).toBe(true);
  expect(asked.some((url) => url.includes("three.module.js"))).toBe(true);
  const once = new Set(asked).size;
  expect(asked.length).toBe(once);
});
