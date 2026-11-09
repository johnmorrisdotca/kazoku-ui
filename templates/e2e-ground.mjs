// e2e-ground.mjs: the family's shared browser check of the drag rule (spx-stats docs/package-work.md, "A drag moves the object with the pointer"). Copied unchanged into a package's
// e2e/ folder (as e2e/ground.mjs) and never edited there; kazoku-ui's docs/drag-rule.md says how to use it. Not a test file: a test imports it.
//
//   import { checkFollowsTheHand, checkExactGrab } from "./ground.mjs";
//   test("the globe follows the hand", async ({ page }) => { await open(page); await checkFollowsTheHand(page, { view: "#globe", controls: "kazoku-view-controls", autoTurn: "right" }); });
//
// It moves a real pointer and real keys, takes a picture of the view before and after, and finds how far the ground moved by sliding the middle of the first picture over the second.
// The rule: the surface under the pointer follows the pointer (drag right and it moves right, drag up and it moves up), the arrow keys agree, Auto-turn goes the object's real way,
// and, where a package turns a globe or any piece with a known on-screen radius, the touched point stays under the pointer (exact grab).
import { expect } from "@playwright/test";

/**
 * The best shift of `after` against `before`, both as grey values (one number a pixel, row by row) `w` by `h`: slide the middle of `before` over `after` up to `reach` pixels each way.
 * @param {ArrayLike<number>} before
 * @param {ArrayLike<number>} after
 * @param {number} w
 * @param {number} h
 * @param {number} reach
 * @param {[number, number, number, number]} [window] the part of `before` that is slid, as shares of its width and height: left, right, top, bottom (the middle 40%: 0.3, 0.7, 0.3, 0.7)
 * @returns {{ x: number, y: number, error: number }}
 */
export function bestShift(before, after, w, h, reach, window = [0.3, 0.7, 0.3, 0.7]) {
  const x0 = Math.round(w * window[0]);
  const x1 = Math.round(w * window[1]);
  const y0 = Math.round(h * window[2]);
  const y1 = Math.round(h * window[3]);
  const width = 2 * reach + 1;
  const order = [];
  for (let dy = -reach; dy <= reach; dy += 1) for (let dx = -reach; dx <= reach; dx += 1) order.push([dx, dy]);
  // Nearest first, so a good match is found early and the rest are dropped as soon as they cannot beat it; the answer is the one a plain scan in row order gives, ties included.
  order.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
  const most = Math.ceil((y1 - y0) / 3) * Math.ceil((x1 - x0) / 3);
  let best = { x: 0, y: 0, error: Infinity };
  let bestAt = Infinity;
  for (const [dx, dy] of order) {
    let sum = 0;
    let n = 0;
    let dropped = false;
    for (let y = y0; y < y1; y += 3) {
      const ys = y + dy;
      if (ys < 0 || ys >= h) continue;
      for (let x = x0; x < x1; x += 3) {
        const xs = x + dx;
        if (xs < 0 || xs >= w) continue;
        sum += Math.abs(before[y * w + x] - after[ys * w + xs]);
        n += 1;
      }
      // Fewer samples than `most` only raise the error, so a sum already past the best cannot win.
      if (sum / most > best.error) {
        dropped = true;
        break;
      }
    }
    if (dropped) continue;
    const error = n === 0 ? Infinity : sum / n;
    const at = (dy + reach) * width + dx + reach;
    if (error < best.error || (error === best.error && at < bestAt)) {
      best = { x: dx, y: dy, error };
      bestAt = at;
    }
  }
  return best;
}

/**
 * Which way the ground moved between two pictures of a view (PNG buffers): `x` pixels to the right (negative: left), `y` pixels down (negative: up), and `error`, how different the
 * pictures still are at that shift (large when they have nothing in common).
 * @param {import("@playwright/test").Page} page
 * @param {Buffer} before
 * @param {Buffer} after
 * @param {number} [reach]
 * @param {[number, number, number, number]} [window] the part of the first picture that is slid (see `bestShift`)
 */
export async function groundShift(page, before, after, reach = 60, window) {
  const grey = (data) =>
    page.evaluate(async (png) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const rgba = ctx.getImageData(0, 0, img.width, img.height).data;
      const out = new Array(img.width * img.height);
      for (let i = 0; i < out.length; i += 1) out[i] = Math.round(rgba[i * 4] * 0.3 + rgba[i * 4 + 1] * 0.59 + rgba[i * 4 + 2] * 0.11);
      return { w: img.width, h: img.height, out };
    }, data.toString("base64"));
  const [p, q] = [await grey(before), await grey(after)];
  return bestShift(p.out, q.out, p.w, p.h, reach, window);
}

/**
 * The part of a picture to follow, around a point: `span` is its width and height as a share of the picture's.
 * @param {[number, number]} [aim] the point, as shares of the picture's width and height (the middle)
 * @param {number} [span]
 * @returns {[number, number, number, number]} left, right, top, bottom, as `bestShift` takes them
 */
export function windowAround(aim = [0.5, 0.5], span = 0.2) {
  const near = (centre) => [Math.max(0, centre - span / 2), Math.min(1, centre + span / 2)];
  return [...near(aim[0]), ...near(aim[1])];
}

/** Wait for `count` animation frames of the page to have been drawn. */
export const frames = (page, count = 2) =>
  page.evaluate(
    (left) =>
      new Promise((resolve) => {
        const step = (n) => (n <= 0 ? resolve(undefined) : window.requestAnimationFrame(() => step(n - 1)));
        step(left);
      }),
    count,
  );

/**
 * A picture of `view` once it has stopped changing: two pictures in a row, each taken after two frames of the page, are the same. With `before`, the picture must also differ from it (a view that has
 * not drawn the change yet looks like the one before), until `timeout` ms are up; then the last picture is returned and the check says what it saw.
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} view
 * @param {{ before?: Buffer, ready?: () => Promise<unknown>, settle?: number, timeout?: number }} [options] `ready` is the package's own signal that its draw is done, awaited before each picture; `settle` is a least wait in ms (none by default); `timeout` the longest wait (5000)
 */
export async function settledPicture(page, view, options = {}) {
  const { before, ready, settle = 0, timeout = 5000 } = options;
  const until = Date.now() + timeout;
  if (settle > 0) await page.waitForTimeout(settle);
  let last = null;
  for (;;) {
    await frames(page);
    await ready?.();
    const picture = await view.screenshot({ scale: "css" });
    if (last !== null && picture.equals(last) && (before === undefined || !picture.equals(before))) return picture;
    if (Date.now() > until) return picture;
    last = picture;
  }
}

/**
 * A real pointer drag from the middle of `target` (or from `at`) by `dx` and `dy` pixels, in ten steps, with the pointer left up at the end.
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} target
 * @param {number} dx
 * @param {number} dy
 * @param {[number, number]} [at] where the drag starts, as shares of the target's width and height (the middle)
 */
export async function dragBy(page, target, dx, dy, at = [0.5, 0.5]) {
  const box = await target.boundingBox();
  if (box === null) throw new Error("the view has no box to drag");
  const x = box.x + box.width * at[0];
  const y = box.y + box.height * at[1];
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  await page.mouse.up();
}

/**
 * Do `act`, then say how far the ground of `view` moved on the screen. The second picture is taken when the view has stopped changing (see `settledPicture`), not after a fixed time; the view must be
 * at rest before the first.
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} view
 * @param {() => Promise<void>} act
 * @param {{ settle?: number, reach?: number, window?: [number, number, number, number], ready?: () => Promise<unknown>, timeout?: number }} [options]
 */
export async function movedBy(page, view, act, options = {}) {
  const before = await view.screenshot({ scale: "css" });
  await act();
  const after = await settledPicture(page, view, { before, ready: options.ready, settle: options.settle, timeout: options.timeout });
  return groundShift(page, before, after, options.reach ?? 70, options.window);
}

/**
 * The drag rule: the ground follows the hand. Drag right and it moves right, drag up and it moves up, the right and up arrow keys agree, and (with `autoTurn`) Auto-turn goes the way
 * the object really turns. The view is put back after each step. Fails with a message that says what moved and where.
 * @param {import("@playwright/test").Page} page
 * @param {{ view: string, picture?: string, window?: [number, number, number, number], controls?: string, min?: number, settle?: number, ready?: () => Promise<unknown>, timeout?: number, keys?: boolean, autoTurn?: "right" | "left" | false, distance?: number }} options
 *   `view` is the selector of the element the hands are bound to; `picture` the selector of what is photographed (the view by default; give the globe's own canvas when the view is much wider than the globe, so the middle of the picture is ground); `window` the part of the picture that is followed, as shares `[left, right, top, bottom]` (the middle 40%; give the part that holds the object when it is thin, such as a rocket); `controls` the selector of the `<kazoku-view-controls>` (needed for Auto-turn); `min` the pixels that count as moved (8; the other axis may move by up to the larger of `min` and 3);
 *   `settle` a least wait in ms after each act (none by default: the view is photographed when it has stopped changing); `ready` the package's own signal that its draw is done (a promise); `timeout` the longest wait for the view to rest (5000);
 *   `distance` the pixels dragged (30); `keys: false` skips the arrow keys; `autoTurn` the direction the ground goes while Auto-turn runs, in a view whose Auto-turn is the object's own turn.
 */
export async function checkFollowsTheHand(page, options) {
  const { view, picture = view, window, controls = "kazoku-view-controls", min = 8, settle, ready, timeout, keys = true, autoTurn = false, distance = 30 } = options;
  const target = page.locator(view);
  const photo = page.locator(picture);
  const move = (act) => movedBy(page, photo, act, { settle, window, ready, timeout });
  // Put the view back, and wait until the picture has changed and stopped: the next check photographs it at rest.
  const back = async (act) => {
    const was = await photo.screenshot({ scale: "css" });
    await act();
    await settledPicture(page, photo, { before: was, ready, settle, timeout });
  };
  await settledPicture(page, photo, { ready, settle, timeout });
  const right = await move(() => dragBy(page, target, distance, 0));
  expect(right.x, `a drag right moves the ground right (moved ${right.x},${right.y})`).toBeGreaterThan(min);
  expect(Math.abs(right.y), "and not up or down").toBeLessThan(Math.max(min, 3));
  await back(() => dragBy(page, target, -distance, 0));
  const up = await move(() => dragBy(page, target, 0, -distance));
  expect(up.y, `a drag up moves the ground up (moved ${up.x},${up.y})`).toBeLessThan(-min);
  expect(Math.abs(up.x), "and not sideways").toBeLessThan(Math.max(min, 3));
  await back(() => dragBy(page, target, 0, distance));
  if (keys) {
    await target.focus();
    const arrowRight = await move(() => page.keyboard.press("ArrowRight"));
    expect(arrowRight.x, `the right arrow moves the ground right (moved ${arrowRight.x},${arrowRight.y})`).toBeGreaterThan(min);
    await back(() => page.keyboard.press("ArrowLeft"));
    const arrowUp = await move(() => page.keyboard.press("ArrowUp"));
    expect(arrowUp.y, `the up arrow moves the ground up (moved ${arrowUp.x},${arrowUp.y})`).toBeLessThan(-min);
    await back(() => page.keyboard.press("ArrowDown"));
  }
  if (autoTurn) {
    const turn = await move(async () => {
      await page.locator(controls).evaluate((el) => {
        el.controller.speed = 6;
        el.controller.play();
      });
      await page.waitForTimeout(1500); // how long Auto-turn runs: a duration of the act, not a wait for the view
      await page.locator(controls).evaluate((el) => el.pause());
    });
    if (autoTurn === "right") expect(turn.x, `Auto-turn moves the ground right (moved ${turn.x},${turn.y})`).toBeGreaterThan(min);
    else expect(turn.x, `Auto-turn moves the ground left (moved ${turn.x},${turn.y})`).toBeLessThan(-min);
  }
}

/**
 * Exact grab: a drag of a few pixels moves the ground at the aim point (the middle of the picture by default) by as many pixels, so the touched point stays under the pointer. Use it on a globe
 * or any piece whose on-screen radius is known (`radius`, in pixels), with the view set to `grab-radius` to match. The drag starts on the aim point, and only a small patch around it is followed.
 * @param {import("@playwright/test").Page} page
 * @param {{ view: string, picture?: string, radius: number, tolerance?: number, aim?: [number, number], span?: number, window?: [number, number, number, number], settle?: number, ready?: () => Promise<unknown>, timeout?: number, reach?: number }} options
 *   `picture` is what is photographed (the view by default; see `checkFollowsTheHand`); `tolerance` is the share of the drag the ground may differ by (0.2); `aim` is the point of the picture to grab and measure, as shares of its
 *   width and height (the middle: `[0.5, 0.5]`; the middle of the globe when the globe is not in the middle of its picture); `span` is the width and height of the patch that is followed, as a share of the picture (0.2; the old
 *   check followed 0.4); `window` names that patch outright and wins over `aim` and `span` for it; `settle`, `ready` and `timeout` are as in `checkFollowsTheHand`.
 */
export async function checkExactGrab(page, options) {
  const { view, picture = view, radius, tolerance = 0.2, aim = [0.5, 0.5], span = 0.2, settle, ready, timeout, reach } = options;
  const window = options.window ?? windowAround(aim, span);
  const target = page.locator(view);
  const photo = page.locator(picture);
  const pixels = Math.max(12, Math.round(radius * 0.15));
  const grabbed = async () => {
    const [on, of] = [await photo.boundingBox(), await target.boundingBox()];
    if (on === null || of === null) throw new Error("the view or the picture has no box to drag");
    return [(on.x + on.width * aim[0] - of.x) / of.width, (on.y + on.height * aim[1] - of.y) / of.height];
  };
  const at = await grabbed();
  const move = (act) => movedBy(page, photo, act, { settle, ready, timeout, window, reach: reach ?? pixels * 2 });
  const back = async (act) => {
    const was = await photo.screenshot({ scale: "css" });
    await act();
    await settledPicture(page, photo, { before: was, ready, settle, timeout });
  };
  await settledPicture(page, photo, { ready, settle, timeout });
  const moved = await move(() => dragBy(page, target, pixels, 0, at));
  expect(Math.abs(moved.x - pixels), `a drag of ${pixels} px moves the ground at the aim point by ${pixels} px, within ${Math.round(tolerance * 100)}% (moved ${moved.x},${moved.y})`).toBeLessThanOrEqual(Math.max(2, pixels * tolerance));
  expect(Math.abs(moved.y), "and not up or down").toBeLessThanOrEqual(Math.max(2, pixels * tolerance));
  await back(() => dragBy(page, target, -pixels, 0, at));
  const upward = await move(() => dragBy(page, target, 0, -pixels, at));
  expect(Math.abs(upward.y + pixels), `a drag up of ${pixels} px moves the ground at the aim point up by ${pixels} px, within ${Math.round(tolerance * 100)}% (moved ${upward.x},${upward.y})`).toBeLessThanOrEqual(Math.max(2, pixels * tolerance));
  await back(() => dragBy(page, target, 0, pixels, at));
}
