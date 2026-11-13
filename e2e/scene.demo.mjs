import { expect, test } from "@playwright/test";
import { expectAtMost30, readStamps, stampDraws, untilDrawn } from "./draw-stamps.mjs";
import { canvasSize, COUNT_SCRIPT, drainGpu, gpuObjects, readCounts, withinPixelBudget } from "../dist/testing/index.js";

// The shared scene on demo/scene.html (the freeze test of the scene composer): four stand-in layers (stars, an Earth-sized sphere, a sphere at the Moon's distance, a satellite 400 km up),
// one camera, one clock, one WebGL context. It asserts what the family's freeze rule asks of a 3D page: one context, nothing drawn or asked for at rest, at most 30 frames a second, the GPU
// objects flat over many changes of focus, the canvas within budget, one clock for every layer, the depth slices, and no request at rest.
const demo = (page) => page.evaluate(() => window.kazokuDemo.renderer.stats);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(COUNT_SCRIPT);
  await page.goto(`/scene.html${query}`);
  await page.waitForFunction(() => window.kazokuDemo?.view?.live === true, null, { timeout: 60_000 });
  return errors;
};
/** Wait until no frame is waiting to run (the scheduler says so: a pause that cancels a frame leaves `requests - frames` one over for good) and the GPU has caught up. */
const settle = async (page) => {
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.renderer.scheduler.pending), { timeout: 30_000 }).toBe(false);
  await drainGpu(page);
};
/**
 * The picture is on the screen: no frame waiting, the GPU caught up, and the page has presented two animation frames since, so a screenshot reads what was drawn and not
 * the frame before it (KAZOKU-UI-109: on a loaded runner two pictures of a scene at rest differed once). Every wait is on what the page reports, none on a time.
 */
const shown = async (page) => {
  await settle(page);
  await page.evaluate(() => new Promise((done) => window.requestAnimationFrame(() => window.requestAnimationFrame(done))));
  await settle(page);
};
/** Ask the view for another frame, wait for the page to say it drew one (the draw count rose), then until the picture is on the screen. */
const redraw = async (page) => {
  const before = (await readCounts(page)).draws;
  await page.evaluate(() => window.kazokuDemo.view.invalidate());
  await expect.poll(async () => (await readCounts(page)).draws, { timeout: 30_000 }).toBeGreaterThan(before);
  await shown(page);
};
/** What the page says is true of the stage and the drawing, read in one step: the draw count, the camera, the moment and the stage's box. A picture is only the picture of a frame if these held while it was taken. */
const holding = (page) => page.evaluate(() => {
  const { renderer, scene } = window.kazokuDemo;
  const box = document.querySelector('[data-testid="stage"]').getBoundingClientRect();
  return JSON.stringify({ draws: renderer.stats.draws, pending: renderer.scheduler.pending, camera: scene.camera.state, ms: scene.frame?.ms, box: [box.x, box.y, box.width, box.height], ratio: window.devicePixelRatio });
});
/**
 * The stage's picture, taken only while the page held still: the same draw count, camera, moment and box before and after the screenshot, and nothing waiting to be drawn.
 * A screenshot taken while the page drew or moved is not the picture of any one frame, so it is taken again; the wait is on the page's own numbers, and a page that never holds still fails with them.
 */
const picture = async (page) => {
  const stage = page.locator('[data-testid="stage"]');
  const seen = [];
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await shown(page);
    const before = await holding(page);
    const image = await stage.screenshot();
    const after = await holding(page);
    if (before === after && !JSON.parse(after).pending) return image;
    seen.push({ before, after });
  }
  throw new Error(`the page did not hold still for a picture in 30 s: ${JSON.stringify(seen.slice(-2))}`);
};
/** How two pictures of the stage differ, read in the page: their sizes, how many pixels differ, by how much at most, and the box they are in. */
const differ = (page, a, b) => page.evaluate(async ([x, y]) => {
  const load = async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height);
  };
  const [p, q] = [await load(x), await load(y)];
  const out = { sizes: [[p.width, p.height], [q.width, q.height]], differing: 0, most: 0, box: null };
  if (p.width !== q.width || p.height !== q.height) return { ...out, differing: -1 };
  let [x0, y0, x1, y1] = [p.width, p.height, -1, -1];
  for (let i = 0; i < p.data.length; i += 4) {
    const d = Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2]), Math.abs(p.data[i + 3] - q.data[i + 3]));
    if (d === 0) continue;
    out.differing += 1;
    out.most = Math.max(out.most, d);
    const [px, py] = [(i / 4) % p.width, Math.floor(i / 4 / p.width)];
    [x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
  }
  return { ...out, box: out.differing > 0 ? [x0, y0, x1, y1] : null };
}, [a.toString("base64"), b.toString("base64")]);
/** Two pictures of a scene at rest are the same picture: byte for byte, and when they are not, the message says how many pixels differ, where and by how much. */
const expectSamePicture = async (page, a, b, what) => {
  if (a.equals(b)) return;
  const found = await differ(page, a, b);
  expect(found.differing, `${what}: two frames at rest differ: ${JSON.stringify(found)} (sizes, differing pixels, largest step, box of them; -1 pixels means the sizes differ)`).toBe(0);
  expect(a.equals(b), `${what}: the pictures differ as files but in no pixel`).toBe(true);
};
const focusOn = async (page, id) => {
  await page.locator(`[data-focus="${id}"]`).click();
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.scene.camera.state.focus)).toBe(id);
};

test("a plain link opens running, from now, at the focused body's speed, and the readout moves", async ({ page }) => {
  const errors = await ready(page);
  const open = await page.evaluate(() => ({ running: window.kazokuDemo.clock.running, speed: window.kazokuDemo.clock.speed, touched: window.kazokuDemo.clock.touched, time: window.kazokuDemo.clock.time, sinceLoad: window.performance.now(), opened: Date.now() - window.performance.now() }));
  expect(open.running).toBe(true);
  expect(open.speed).toBe(3600);
  expect(open.touched).toBe(false);
  // From now: the moment is the wall clock's at the page's start, and has run on at most 3600 times the real time since.
  expect(open.time).toBeGreaterThanOrEqual(open.opened - 1000);
  expect(open.time - open.opened).toBeLessThanOrEqual(open.speed * open.sinceLoad + 5000);
  const first = await page.locator('[data-testid="date"]').textContent();
  await expect.poll(() => page.locator('[data-testid="date"]').textContent(), { timeout: 5000 }).not.toBe(first);
  await expect(page.locator('[data-testid="bar"] button[data-act="play"]')).toHaveText("Pause");
  expect(errors).toEqual([]);
});

test("the opening speed follows the body in focus until the reader sets a speed", async ({ page }) => {
  await ready(page);
  await focusOn(page, "moon");
  expect(await page.evaluate(() => window.kazokuDemo.clock.speed)).toBe(86_400);
  await focusOn(page, "satellite");
  expect(await page.evaluate(() => window.kazokuDemo.clock.speed)).toBe(60);
  await page.locator('[data-testid="bar"] kazoku-speed-buttons button[data-v="604800"]').click();
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.clock.touched)).toBe(true);
  await focusOn(page, "earth");
  expect(await page.evaluate(() => window.kazokuDemo.clock.speed)).toBe(604_800);
});

test("a link that names a time, a speed or a pause is obeyed", async ({ page }) => {
  await ready(page, "?time=2026-11-10T12:00:00Z&speed=60&play=off");
  const state = await page.evaluate(() => ({ time: window.kazokuDemo.clock.time, speed: window.kazokuDemo.clock.speed, running: window.kazokuDemo.clock.running }));
  expect(state).toEqual({ time: Date.UTC(2026, 10, 10, 12), speed: 60, running: false });
  await expect(page.locator('[data-testid="date"]')).toContainText("2026-11-10 12:00:00 UTC");
  await focusOn(page, "moon");
  expect(await page.evaluate(() => window.kazokuDemo.clock.speed)).toBe(60);
});

test("a reader who asked for reduced motion gets a still view with Play ready", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  expect(await page.evaluate(() => ({ running: window.kazokuDemo.clock.running, speed: window.kazokuDemo.clock.speed }))).toEqual({ running: false, speed: 3600 });
  await settle(page);
  const before = await readCounts(page);
  await page.waitForTimeout(1500);
  const after = await readCounts(page);
  expect(after.draws - before.draws).toBe(0);
  expect(after.rafRequests - before.rafRequests).toBe(0);
  const play = page.locator('[data-testid="bar"] button[data-act="play"]');
  await expect(play).toBeEnabled();
  await play.click();
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.clock.running)).toBe(true);
  await expect.poll(async () => (await readCounts(page)).draws, { timeout: 30_000 }).toBeGreaterThan(after.draws);
  await play.click();
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.clock.running)).toBe(false);
  await settle(page);
});

test("one context after the four layers load and after every change of focus", async ({ page }) => {
  await ready(page);
  expect((await readCounts(page)).contexts).toBe(1);
  for (const id of ["moon", "satellite", "earth", "moon", "earth"]) {
    await focusOn(page, id);
    expect((await readCounts(page)).contexts).toBe(1);
  }
  expect((await demo(page)).contexts).toBe(1);
});

test("paused, nothing is drawn and no frame is asked for; running, at most 30 a second", async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  await settle(page);
  const paused = await readCounts(page);
  const stats = await demo(page);
  await page.waitForTimeout(2000);
  const later = await readCounts(page);
  expect(later.draws - paused.draws).toBe(0);
  expect(later.rafRequests - paused.rafRequests).toBe(0);
  expect((await demo(page)).draws - stats.draws).toBe(0);
  await stampDraws(page);
  await page.evaluate(() => window.kazokuDemo.clock.play());
  // A slow software frame holds the clock back: wait for two seconds' worth of draws, however long they take. The page records the timestamp of every frame and draw, and the rule is asserted on those.
  await untilDrawn(page, 61, 60_000);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  expectAtMost30(await readStamps(page));
  await settle(page);
  expect(await page.evaluate(() => window.kazokuDemo.renderer.scheduler.pending)).toBe(false);
  await drainGpu(page);
});

test("a hidden tab, or a page out of sight, asks for no frame", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { document.body.style.paddingBottom = "4000px"; });
  await page.evaluate(() => window.scrollTo(0, 3800));
  await page.waitForTimeout(600);
  const away = await readCounts(page);
  const draws = (await demo(page)).draws;
  await page.waitForTimeout(1200);
  expect((await readCounts(page)).rafRequests).toBe(away.rafRequests);
  expect((await demo(page)).draws).toBe(draws);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await demo(page)).draws, { timeout: 30_000 }).toBeGreaterThan(draws);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  await settle(page);
});

test("one clock: after a set, every layer is told the same moment in the same draw", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  await settle(page);
  const told = await page.evaluate(async () => {
    const { layers, clock, scene } = window.kazokuDemo;
    const heard = new Map(layers.map((layer) => [layer.id, []]));
    for (const layer of layers) {
      const update = layer.update.bind(layer);
      layer.update = (frame) => { heard.get(layer.id).push(frame.ms); return update(frame); };
    }
    const at = Date.UTC(2031, 2, 5, 7, 8, 9);
    clock.set(at);
    await new Promise((resolve) => { const check = () => (scene.frame?.ms === at ? resolve() : setTimeout(check, 50)); check(); });
    return { at, heard: [...heard].map(([id, list]) => [id, list.at(-1)]) };
  });
  expect(told.heard.map(([, ms]) => ms)).toEqual([told.at, told.at, told.at, told.at]);
  expect(told.heard.map(([id]) => id).sort()).toEqual(["earth", "moon", "satellite", "stars"]);
  await settle(page);
});

test("the GPU objects are flat over twenty changes of focus and the context count stays one", async ({ page }) => {
  test.setTimeout(180_000);
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  for (const id of ["moon", "satellite", "earth"]) await focusOn(page, id);
  await settle(page);
  const a = await readCounts(page);
  const stats = await demo(page);
  for (let step = 0; step < 20; step += 1) await focusOn(page, ["moon", "satellite", "earth"][step % 3]);
  await settle(page);
  const b = await readCounts(page);
  expect(b.contexts).toBe(1);
  expect(gpuObjects(b)).toBe(gpuObjects(a));
  const after = await demo(page);
  expect(after.assets.entries).toBe(stats.assets.entries);
  expect(after.stills.count).toBe(stats.stills.count);
});

test("every body is whole inside its depth slice, at the Earth, at the Moon and at the satellite", async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  for (const id of ["earth", "moon", "satellite"]) {
    await focusOn(page, id);
    await expect.poll(() => page.evaluate(() => window.kazokuDemo.scene.frame?.focusKm !== undefined)).toBe(true);
    const report = await page.evaluate((focus) => {
      const { scene } = window.kazokuDemo;
      const frame = scene.frame;
      const cam = frame.camera.positionKm;
      const out = [];
      for (const body of scene.bodies) {
        const p = frame.positionsKm.get(body.id);
        const d = Math.hypot(p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]);
        const slice = scene.stats.slices.find((s) => s.ids.includes(body.id));
        out.push({ id: body.id, held: slice !== undefined && slice.nearKm <= Math.max(d - body.radiusKm, 0) + 1e-9 && slice.farKm >= d + body.radiusKm, ok: slice !== undefined && slice.nearKm > 0 });
      }
      return { focus, out, slices: scene.stats.slices.length };
    }, id);
    for (const body of report.out) expect(body, `${id}: ${body.id}`).toMatchObject({ held: true, ok: true });
    expect(report.slices).toBeGreaterThan(0);
  }
  await settle(page);
});

test("from 400 km above the Earth, the satellite and the Earth draw without flicker: two frames at rest are the same picture", async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  // The camera at 400 km above the Earth's surface, looking at the Earth with the Moon beyond; and, close to the satellite, the satellite over the Earth.
  await page.evaluate(() => window.kazokuDemo.scene.camera.set({ focus: "earth", distanceKm: window.kazokuDemo.EARTH_KM + 400, tilt: 0, yaw: 0 }));
  const one = await picture(page);
  await redraw(page);
  await expectSamePicture(page, one, await picture(page), "400 km above the Earth");
  await focusOn(page, "satellite");
  await page.evaluate(() => window.kazokuDemo.scene.camera.set({ distanceKm: 0.3, tilt: 20, yaw: 40 }));
  const near = await picture(page);
  await redraw(page);
  await expectSamePicture(page, near, await picture(page), "0.3 km from the satellite");
  const slices = await page.evaluate(() => window.kazokuDemo.scene.stats.slices.map((s) => s.ids));
  expect(slices.length).toBe(2);
  expect(slices[1]).toEqual(["satellite"]);
  expect(slices[0]).toEqual(expect.arrayContaining(["earth", "moon"]));
});

test("the canvas stays within budget at a desk's 1440 by 900 at ratio 2, and a phone's 390 by 844 at ratio 3", async ({ browser }) => {
  for (const [width, height, ratio, touch] of [[1440, 900, 2, false], [390, 844, 3, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: ratio, hasTouch: touch });
    const page = await context.newPage();
    await ready(page);
    await page.evaluate(() => window.kazokuDemo.clock.pause());
    await settle(page);
    const size = await canvasSize(page);
    expect(size.count).toBe(1);
    expect(withinPixelBudget(size)).toBe(true);
    expect((await readCounts(page)).contexts).toBe(1);
    await context.close();
  }
});

test("no request is made at rest, and the page's credit line names every layer's own sources", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  await settle(page);
  const asked = [];
  page.on("request", (request) => asked.push(request.url()));
  await page.waitForTimeout(1500);
  expect(asked).toEqual([]);
  const credits = (await page.locator("kazoku-page-credits").getAttribute("credits")) ?? "";
  for (const text of await page.evaluate(() => window.kazokuDemo.scene.credits().map((c) => c.text))) expect(credits).toContain(text);
  // The three stand-in bodies share one credit, the stars have their own: each is said once.
  expect(await page.evaluate(() => window.kazokuDemo.scene.credits().length)).toBe(2);
});

test("the shared view controls turn and zoom the scene about the body in focus, and the camera never goes inside it", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  await settle(page);
  const before = await page.evaluate(() => window.kazokuDemo.scene.camera.state);
  await page.evaluate(() => window.kazokuDemo.controls.set({ yaw: 40, tilt: 10, zoom: 2 }));
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.scene.camera.state.yaw)).toBe(-40);
  const turned = await page.evaluate(() => window.kazokuDemo.scene.camera.state);
  expect(turned.tilt).toBe(10);
  expect(turned.distanceKm).toBeCloseTo(before.distanceKm / 2, 3);
  await page.evaluate(() => window.kazokuDemo.controls.set({ zoom: 400 }));
  await expect.poll(() => page.evaluate(() => window.kazokuDemo.scene.camera.state.distanceKm)).toBeGreaterThan(await page.evaluate(() => window.kazokuDemo.EARTH_KM));
  await settle(page);
});

test("what is drawn is really there: hiding the Earth, the stars or the satellite each changes the picture", async ({ page, browserName }) => {
  test.setTimeout(120_000);
  // WebKit's page screenshot did not change when a body was hidden on a hosted runner (CI run 42817910095), so it cannot say whether the canvas is read back; Chromium's does.
  test.skip(browserName !== "chromium", "only Chromium's page screenshot reads the software WebGL canvas back");
  await ready(page);
  await page.evaluate(() => window.kazokuDemo.clock.pause());
  const shot = async () => { await redraw(page); return picture(page); };
  const hide = (what) => page.evaluate((id) => {
    const { layers } = window.kazokuDemo;
    const layer = layers.find((l) => l.id === id);
    const object = layer.sky ?? layer.bodies[0].root;
    object.visible = !object.visible;
  }, what);
  // Earth in view, with the stars behind it and the satellite near.
  await page.evaluate(() => window.kazokuDemo.scene.camera.set({ focus: "earth", distanceKm: 20_000, tilt: 20, yaw: 25 }));
  const all = await shot();
  await hide("earth");
  const noEarth = await shot();
  await hide("earth");
  expect(Buffer.compare(all, noEarth)).not.toBe(0);
  await hide("stars");
  const noStars = await shot();
  await hide("stars");
  expect(Buffer.compare(all, noStars)).not.toBe(0);
  // The picture is not one flat colour: the Earth's lit blue side, and a dark sky round it.
  const spread = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let bright = 0;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const sum = pixels[i] + pixels[i + 1] + pixels[i + 2];
      // The Earth is blue where it is lit; the sky is near black.
      if (pixels[i + 2] > 80 && pixels[i + 2] > pixels[i] + 30) bright += 1;
      else if (sum < 60) dark += 1;
    }
    return { bright, dark, total: pixels.length / 4 };
  }, all.toString("base64"));
  expect(spread.bright).toBeGreaterThan(spread.total * 0.05);
  expect(spread.dark).toBeGreaterThan(spread.total * 0.1);
  await focusOn(page, "satellite");
  await page.evaluate(() => window.kazokuDemo.scene.camera.set({ distanceKm: 0.3, tilt: 20, yaw: 40 }));
  const withSatellite = await shot();
  await hide("satellite");
  const without = await shot();
  await hide("satellite");
  expect(Buffer.compare(withSatellite, without)).not.toBe(0);
});
