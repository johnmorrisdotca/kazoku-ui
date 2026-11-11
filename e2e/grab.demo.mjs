import { expect, test } from "@playwright/test";
import { checkExactGrab, checkFollowsTheHand, dragBy, movedBy, settledPicture } from "../templates/e2e-ground.mjs";

// Exact grab, on demo/grab.html: a drawn globe 120 pixels in radius. The shared check of the drag rule (templates/e2e-ground.mjs) moves a real pointer and real keys and compares pictures.
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/grab.html${query}`);
  await expect(page.locator("kazoku-view-controls .bar")).toBeVisible();
  await page.locator("#scene").scrollIntoViewIfNeeded();
  return errors;
};

test("the ground follows the hand: a drag, the arrow keys and Auto-turn all move it the way the hand does", async ({ page }) => {
  const errors = await ready(page);
  await checkFollowsTheHand(page, { view: "#scene", picture: "#globe", autoTurn: "right" });
  expect(errors).toEqual([]);
});

test("with grab-radius a drag keeps the touched point under the pointer, sideways and upward", async ({ page }) => {
  const errors = await ready(page);
  await expect(page.locator("kazoku-view-controls")).toHaveAttribute("grab-radius", "120");
  await checkExactGrab(page, { view: "#scene", picture: "#globe", radius: 120 });
  expect(errors).toEqual([]);
});

test("without it a drag turns by the fixed angle across the view: a half turn over its width", async ({ page }) => {
  await ready(page, "?grab=off");
  await expect(page.locator("kazoku-view-controls")).not.toHaveAttribute("grab-radius", /.*/);
  const width = (await page.locator("#scene").boundingBox()).width;
  const scene = page.locator("#scene");
  const moved = await movedBy(page, page.locator("#globe"), () => dragBy(page, scene, 18, 0), { reach: 80 });
  const expected = 120 * Math.sin((18 / width) * Math.PI);
  expect(Math.abs(moved.x - expected), `18 px of drag over a view ${Math.round(width)} px wide moved the ground ${moved.x} px, and a half turn across the width is ${expected.toFixed(1)} px`).toBeLessThanOrEqual(3);
});

test("the ground is photographed when the view has stopped changing, not after a fixed time: a redraw that comes late is waited for", async ({ page }) => {
  await ready(page);
  const scene = page.locator("#scene");
  const globe = page.locator("#globe");
  // The first picture must be of a view at rest.
  await settledPicture(page, globe);
  // The view turns 1.2 s after the act, twice as long as the old fixed wait; the helper waits for the picture to change, then to stop. The page counts its redraws and says when each came.
  const late = await movedBy(page, globe, () =>
    scene.evaluate(() => {
      const controls = document.querySelector("#controls");
      const started = window.performance.now();
      window.__redraws = [];
      controls.addEventListener("kazoku-viewchange", () => window.__redraws.push(Math.round(window.performance.now() - started)));
      setTimeout(() => controls.set({ yaw: 20 }), 1200);
    }),
  );
  const redraws = await page.evaluate(() => window.__redraws);
  expect(redraws, "the page redrew once, for the late turn").toHaveLength(1);
  expect(late.x, `the turn drew late and the ground moved right (moved ${late.x},${late.y}; the page redrew at ${redraws[0]} ms)`).toBeGreaterThan(25);
  expect(Math.abs(late.y)).toBeLessThan(4);
  // A view that never changes is given up on at the timeout, with the picture it has, so a check can say it did not move.
  const started = Date.now();
  const none = await movedBy(page, globe, async () => undefined, { timeout: 600 });
  expect(Date.now() - started).toBeLessThan(4000);
  expect(Math.abs(none.x) + Math.abs(none.y)).toBe(0);
});

test("the package's own ready signal is awaited before each picture, and a settled picture is a still one", async ({ page }) => {
  await ready(page);
  let signals = 0;
  const globe = page.locator("#globe");
  const first = await settledPicture(page, globe, { ready: async () => { signals += 1; } });
  expect(signals).toBeGreaterThanOrEqual(2);
  expect((await globe.screenshot({ scale: "css" })).equals(first)).toBe(true);
});

test("exact grab can aim at a point of the picture: the drag starts there and only a small patch around it is followed", async ({ page }) => {
  await ready(page);
  await checkExactGrab(page, { view: "#scene", picture: "#globe", radius: 120, aim: [0.58, 0.5], span: 0.1 });
  await checkExactGrab(page, { view: "#scene", picture: "#globe", radius: 120, window: [0.45, 0.55, 0.45, 0.55] });
});

test("with free-pan a middle-button drag moves the view zoomed out as well as zoomed in; without it a zoomed-out view stays put", async ({ page, browserName }, info) => {
  test.skip(info.project.name.includes("phone"), "a middle button is a desk pointer's");
  await ready(page);
  const controls = page.locator("#controls");
  const scene = page.locator("#scene");
  const box = await scene.boundingBox();
  const middleDrag = async () => {
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y);
    await page.mouse.down({ button: "middle" });
    for (let i = 1; i <= 10; i += 1) await page.mouse.move(at.x + 4 * i, at.y + 3 * i);
    await page.mouse.up({ button: "middle" });
  };
  // the pan the controls report, read after they have told the page about it
  const panOf = () => controls.evaluate((el) => [Math.round(el.state.panX), Math.round(el.state.panY)]);
  await controls.evaluate((el) => {
    el.setAttribute("zoom-min", "0.001");
    el.setAttribute("free-pan", "");
  });
  for (const zoom of [0.0051, 0.23, 2]) {
    await controls.evaluate((el, z) => el.set({ zoom: z, panX: 0, panY: 0 }), zoom);
    await middleDrag();
    await expect.poll(panOf, { message: `a middle-button drag moves the view at ${zoom}x` }).toEqual([40, 30]);
  }
  await controls.evaluate((el) => {
    el.removeAttribute("free-pan");
    el.set({ zoom: 0.23, panX: 0, panY: 0 });
  });
  // the drag is proved to have run (the scene saw the middle button come up) before the pan is read
  await scene.evaluate((el) => {
    window.__ups = 0;
    el.addEventListener("pointerup", (event) => event.button === 1 && (window.__ups += 1));
  });
  await middleDrag();
  await expect.poll(() => page.evaluate(() => window.__ups)).toBe(1);
  expect(await panOf(), `without free-pan (${browserName}) a zoomed-out view stays in the middle`).toEqual([0, 0]);
});

test("free-pan reads a share from 0 to 4, takes 0.5 for a bare or wrong value, and shows the pan pad zoomed out", async ({ page }) => {
  await ready(page);
  const controls = page.locator("#controls");
  const read = (value) =>
    controls.evaluate((el, v) => {
      if (v === null) el.removeAttribute("free-pan");
      else el.setAttribute("free-pan", v);
      return el.freePan ?? null;
    }, value);
  expect(await read("")).toBe(0.5);
  expect(await read("0.25")).toBe(0.25);
  expect(await read("4")).toBe(4);
  for (const wrong of ["abc", "-1", "0", "9"]) expect(await read(wrong), `free-pan="${wrong}"`).toBe(0.5);
  expect(await read(null)).toBe(null);
  // the pan pad sits in More: hidden at a zoom below Fit, shown once free-pan is on, hidden again without it
  await controls.evaluate((el) => el.set({ zoom: 0.5 }));
  await page.locator('kazoku-view-controls [data-b="more"]').click();
  const pad = page.locator('kazoku-view-controls [data-g="pan"]');
  await expect(pad).toBeHidden();
  await read("");
  await expect(pad).toBeVisible();
  await read(null);
  await expect(pad).toBeHidden();
});

test("on a phone, with free-pan, two fingers dragging together move a zoomed-out view, and the view takes every touch", async ({ page }, info) => {
  test.skip(!info.project.name.includes("phone"), "two fingers are a phone's");
  await ready(page);
  const controls = page.locator("#controls");
  await controls.evaluate((el) => {
    el.setAttribute("zoom-min", "0.001");
    el.setAttribute("free-pan", "");
    el.set({ zoom: 0.23, panX: 0, panY: 0 });
  });
  await expect(page.locator("#scene")).toHaveCSS("touch-action", "none");
  const box = await page.locator("#scene").boundingBox();
  await page.evaluate(({ x, y }) => {
    const el = document.querySelector("#scene");
    const send = (type, id, px, py) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: px, clientY: py, bubbles: true, cancelable: true, composed: true, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
    send("pointerdown", 1, x - 40, y);
    send("pointerdown", 2, x + 40, y);
    for (let i = 1; i <= 8; i += 1) {
      send("pointermove", 1, x - 40 + 4 * i, y + 3 * i);
      send("pointermove", 2, x + 40 + 4 * i, y + 3 * i);
    }
    send("pointerup", 1, x - 8, y + 24);
    send("pointerup", 2, x + 72, y + 24);
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await expect.poll(() => controls.evaluate((el) => [Math.round(el.state.panX), Math.round(el.state.panY)])).toEqual([32, 24]);
});
