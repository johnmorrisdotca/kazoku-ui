import { expect, test } from "@playwright/test";
import { COUNT_SCRIPT, drainGpu, gpuObjects, readCounts } from "../dist/testing/index.js";

// A name on the globe (demo/body-label.html): it turns with the body (half a turn puts it at the back), faces the reader when asked, is not drawn when off or when the
// body is small, and keeps the freeze rules: one context, nothing drawn at rest, the GPU objects flat over many changes.
test.use({ reducedMotion: "reduce" });

const demo = (page, fn, arg) => page.evaluate(fn, arg);
const draws = (page) => demo(page, () => window.kazokuDemo.renderer.stats.draws);

async function open(page, query = "") {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(COUNT_SCRIPT);
  await page.goto(`/body-label.html${query}`);
  await expect.poll(() => demo(page, () => Boolean(window.kazokuDemo?.view?.live && window.kazokuDemo.label))).toBe(true);
  await demo(page, () => window.kazokuDemo.label.ready);
  await settle(page);
  return errors;
}

/** Wait until the view has drawn what it was asked to and stopped: the draw count holds across two drawn frames' worth of time. */
async function settle(page) {
  let before = -1;
  await expect
    .poll(
      async () => {
        await demo(page, () => new Promise((done) => window.requestAnimationFrame(() => window.requestAnimationFrame(done))));
        const now = await draws(page);
        const same = now === before && now > 0;
        before = now;
        return same;
      },
      { timeout: 20_000, intervals: [300] },
    )
    .toBe(true);
}

/** Turn the globe (the body) to a yaw, in degrees, through the view controls, and wait for it to be drawn. */
async function turnTo(page, yaw) {
  await demo(page, (y) => window.kazokuDemo.controls.set({ yaw: y, tilt: 0 }), yaw);
  await settle(page);
}

/** The globe's picture, 8 pixels in from the box's rounded edge (the page shows through the corners, and that is not the label's). */
async function picture(page) {
  const box = await page.getByTestId("globe").boundingBox();
  return page.screenshot({ clip: { x: box.x + 8, y: box.y + 8, width: box.width - 16, height: box.height - 16 } });
}

test("the name is drawn on the globe: with it on, the picture differs from the same globe with it off", async ({ page }) => {
  const errors = await open(page);
  const on = await picture(page);
  await page.getByTestId("shown").click();
  await settle(page);
  expect(await demo(page, () => window.kazokuDemo.label.object.parent === null)).toBe(true);
  const off = await picture(page);
  expect(on.equals(off)).toBe(false);
  await page.getByTestId("shown").click();
  await settle(page);
  expect((await picture(page)).equals(on)).toBe(true);
  expect(await demo(page, () => new URL(location.href).searchParams.get("label"))).toBeNull();
  expect(errors).toEqual([]);
});

test("it turns with the body: half a turn takes a name written once round to the back, where it is not seen", async ({ page }) => {
  await open(page);
  expect(await demo(page, () => window.kazokuDemo.label.object.parent === window.kazokuDemo.parts.globe)).toBe(true);
  await turnTo(page, 180);
  const back = await picture(page);
  await page.getByTestId("shown").click();
  await settle(page);
  expect((await picture(page)).equals(back), "at the back the name is hidden by the globe").toBe(true);
});

test("written on both sides, a name is in view after half a turn too", async ({ page }) => {
  await open(page, "?repeat=both");
  expect(await demo(page, () => window.kazokuDemo.label.layout.spans.map((span) => span.centre))).toEqual([0, 180]);
  await turnTo(page, 180);
  const back = await picture(page);
  await page.getByTestId("shown").click();
  await settle(page);
  expect((await picture(page)).equals(back)).toBe(false);
});

test("always facing: the body turns under the name, which stays in front of the reader", async ({ page }) => {
  await open(page, "?facing=1");
  await turnTo(page, 120);
  // the label turns back by as much as the globe turned: its world turn is the same as at the start
  const turn = await demo(page, () => {
    const { label, parts } = window.kazokuDemo;
    return { label: label.object.rotation.y, globe: parts.globe.rotation.y };
  });
  // the camera looks along -z, which is longitude -90 degrees in the world: the label's turn and the globe's together must bring the name's middle there
  const sum = Math.atan2(Math.sin(turn.label + turn.globe), Math.cos(turn.label + turn.globe));
  expect(Math.abs(sum + Math.PI / 2)).toBeLessThan(1e-3);
  const front = await picture(page);
  await page.getByTestId("shown").click();
  await settle(page);
  expect((await picture(page)).equals(front)).toBe(false);
  expect(await demo(page, () => new URL(location.href).searchParams.get("facing"))).toBe("1");
});

test("a body drawn smaller than the least radius has no name, and update says when that changed", async ({ page }) => {
  await open(page);
  const result = await demo(page, () => {
    const { label, parts } = window.kazokuDemo;
    const small = label.update(parts.camera, 10);
    const hidden = label.object.visible;
    const again = label.update(parts.camera, 10);
    const big = label.update(parts.camera, 200);
    return { small, hidden, again, big, shown: label.object.visible };
  });
  expect(result).toEqual({ small: true, hidden: false, again: false, big: true, shown: true });
});

test("at rest nothing is drawn, and fifty changes of look, how many, where and name keep one context and the GPU objects flat", async ({ page }) => {
  // about 240 presses, each drawing the 4096-pixel band again: under a loaded machine that is longer than the default 30 seconds
  test.setTimeout(180_000);
  await open(page);
  const rest = await readCounts(page);
  await page.waitForTimeout(1500);
  const after = await readCounts(page);
  expect(after.draws - rest.draws, "drawn at rest").toBe(0);
  expect(after.rafRequests - rest.rafRequests, "frames asked for at rest").toBe(0);
  const looks = ["painted", "etched", "outline", "burned"];
  const repeats = ["once", "both", "around"];
  const wheres = ["equator", "north", "south"];
  const change = async (i) => {
    await page.locator(`[data-testid="look"] button[data-value="${looks[i % 4]}"]`).click();
    await page.locator(`[data-testid="repeat"] button[data-value="${repeats[i % 3]}"]`).click();
    await page.locator(`[data-testid="where"] button[data-value="${wheres[i % 3]}"]`).click();
    if (i % 5 === 0) await page.getByTestId("shown").click();
  };
  for (let i = 0; i < 10; i += 1) await change(i);
  await settle(page);
  const before = gpuObjects(await readCounts(page));
  for (let i = 10; i < 60; i += 1) await change(i);
  await settle(page);
  const counts = await readCounts(page);
  expect(counts.contexts).toBe(1);
  expect(gpuObjects(counts), "GPU objects after fifty changes").toBe(before);
  await drainGpu(page);
});
