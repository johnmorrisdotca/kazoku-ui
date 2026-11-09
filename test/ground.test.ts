import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

type Window = [number, number, number, number];
const ground = (await import(new URL("../templates/e2e-ground.mjs", import.meta.url).href)) as {
  bestShift(a: ArrayLike<number>, b: ArrayLike<number>, w: number, h: number, reach: number, window?: Window): { x: number; y: number; error: number };
  windowAround(aim?: [number, number], span?: number): Window;
};

/** A picture with no two neighbouring rows or columns alike, as grey values, shifted: what a ground looks like to the finder. */
function picture(w: number, h: number, dx: number, dy: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) out.push(((x - dx) * 37 + (y - dy) * 91 + ((x - dx) * (y - dy) * 13) % 97) % 251);
  return out;
}

test("the shared drag check finds how far a picture moved, in the right direction", () => {
  const w = 80;
  const h = 60;
  const before = picture(w, h, 0, 0);
  for (const [dx, dy] of [[0, 0], [7, 0], [-9, 0], [0, 5], [0, -6], [4, -3]] as const) {
    const found = ground.bestShift(before, picture(w, h, dx, dy), w, h, 12);
    assert.deepEqual([found.x, found.y], [dx, dy], `a picture moved by ${dx}, ${dy}`);
  }
});

test("the part of the picture that is followed can be named, for a thin object", () => {
  const w = 80;
  const h = 60;
  // Only a strip down the middle has anything on it; the rest is one colour, which would hold the best shift at zero.
  const strip = (dx: number): number[] => picture(w, h, dx, 0).map((value, at) => (at % w >= 34 + dx && at % w < 46 + dx ? value : 7));
  const found = ground.bestShift(strip(0), strip(5), w, h, 10, [0.4, 0.6, 0.3, 0.7]);
  assert.deepEqual([found.x, found.y], [5, 0]);
});

test("the shared drag check is a copy for packages: no import but Playwright, and the drag rule's two checks are exported", () => {
  const text = readFileSync(new URL("../templates/e2e-ground.mjs", import.meta.url), "utf8");
  assert.deepEqual([...text.matchAll(/^import .* from "([^"]+)";$/gm)].map((one) => one[1]), ["@playwright/test"]);
  for (const name of ["checkFollowsTheHand", "checkExactGrab", "groundShift", "dragBy", "movedBy", "bestShift", "settledPicture", "windowAround"]) assert.match(text, new RegExp(`export (async )?function ${name}\\b`));
});

/** The plain scan the finder was before it dropped candidates early: every shift in row order, the first of equal errors kept. */
function plainShift(before: ArrayLike<number>, after: ArrayLike<number>, w: number, h: number, reach: number, window: Window = [0.3, 0.7, 0.3, 0.7]) {
  const [x0, x1, y0, y1] = [Math.round(w * window[0]), Math.round(w * window[1]), Math.round(h * window[2]), Math.round(h * window[3])];
  let best = { x: 0, y: 0, error: Infinity };
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 3) {
        if (y + dy < 0 || y + dy >= h) continue;
        for (let x = x0; x < x1; x += 3) {
          if (x + dx < 0 || x + dx >= w) continue;
          sum += Math.abs(before[y * w + x] - after[(y + dy) * w + x + dx]);
          n += 1;
        }
      }
      const error = n === 0 ? Infinity : sum / n;
      if (error < best.error) best = { x: dx, y: dy, error };
    }
  }
  return best;
}

test("the finder gives exactly what a plain scan of every shift gives, on noise, flat pictures and near matches", () => {
  let seed = 12345;
  const random = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const w = 90;
  const h = 70;
  const noise = (): number[] => Array.from({ length: w * h }, () => Math.floor(random() * 256));
  const flat = new Array<number>(w * h).fill(120);
  const base = noise();
  const nudged = base.map((value) => Math.min(255, Math.max(0, value + Math.floor(random() * 9) - 4)));
  for (const [a, b, reach, window] of [[base, noise(), 15, undefined], [flat, flat, 10, undefined], [base, nudged, 12, [0.4, 0.6, 0.4, 0.6]], [base, picture(w, h, 6, -4), 14, [0.1, 0.9, 0.1, 0.9]], [flat, base, 8, [0, 1, 0, 1]]] as const) {
    assert.deepEqual(ground.bestShift(a, b, w, h, reach, window as Window | undefined), plainShift(a, b, w, h, reach, window as Window | undefined));
  }
});

test("a narrow patch around the aim point is the window of exact grab: centred, clipped to the picture", () => {
  assert.deepEqual(ground.windowAround(), [0.4, 0.6, 0.4, 0.6]);
  assert.deepEqual(ground.windowAround([0.5, 0.5], 0.4), [0.3, 0.7, 0.3, 0.7]);
  assert.deepEqual(ground.windowAround([0.25, 0.75], 0.1).map((n) => Math.round(n * 1000) / 1000), [0.2, 0.3, 0.7, 0.8]);
  assert.deepEqual(ground.windowAround([0.02, 1], 0.2).map((n) => Math.round(n * 1000) / 1000), [0, 0.12, 0.9, 1]);
});

test("the shared drag check waits for the view to rest, not for a fixed time", () => {
  const text = readFileSync(new URL("../templates/e2e-ground.mjs", import.meta.url), "utf8");
  assert.equal(/waitForTimeout\(\s*(options\.settle \?\? )?\d+\s*\)/.test(text.replace(/waitForTimeout\(1500\)[^\n]*/, "")), false, "no fixed 600 ms wait is left (the one wait is how long Auto-turn runs)");
  assert.match(text, /requestAnimationFrame/);
});
