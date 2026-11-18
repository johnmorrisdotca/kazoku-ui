import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "@playwright/test";

import { bestShift, checkGestures, GESTURE_NAMES, GESTURES, type GesturePage } from "../src/testing/gestures.ts";
import { EVENT } from "../src/view-controls/index.ts";
import { WORDS } from "../src/view-controls/words.ts";

// Playwright's own `Page` must be what the check takes: this fails to type-check if it is not.
export const takesPlaywright = (page: Page): Promise<unknown> => checkGestures(page, "#view");
export const asPage: (page: Page) => GesturePage = (page) => page;

test("the gesture check reads the same event the controls send", async () => {
  const { readFileSync } = await import("node:fs");
  assert.ok(readFileSync(new URL("../src/testing/gestures.ts", import.meta.url), "utf8").includes(`const EVENT = "${EVENT}"`));
});

test("every gesture has a sentence, and the help text names the keys and buttons the gestures use", () => {
  assert.deepEqual(GESTURE_NAMES, Object.keys(GESTURES));
  for (const sentence of Object.values(GESTURES)) assert.ok(sentence.length > 10);
  assert.match(WORDS.en.gestures, /Ctrl or Command and a drag/);
  assert.match(WORDS.en.gestures, /two fingers/);
  assert.match(WORDS.ja.gestures, /Ctrl/);
});

test("a lack without a reason, or for a name that is not a gesture, is refused before the page is touched", async () => {
  const page = {} as unknown as GesturePage;
  await assert.rejects(checkGestures(page, "#v", { lacks: { roll: "" } }), /say why/);
  await assert.rejects(checkGestures(page, "#v", { lacks: { spin: "no" } as never }), /not a gesture/);
});

test("bestShift finds how far a picture moved, and says how far apart they are with no shift", () => {
  const w = 120;
  const h = 90;
  const picture = (ox: number, oy: number): Uint8Array => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) out[y * w + x] = (((x - ox) * 7) ^ ((y - oy) * 13)) & 255;
    return out;
  };
  const moved = bestShift(picture(0, 0), picture(9, -4), w, h, 15);
  assert.deepEqual([moved.x, moved.y], [9, -4]);
  assert.ok(moved.error < moved.zero);
  const still = bestShift(picture(0, 0), picture(0, 0), w, h, 15);
  assert.deepEqual([still.x, still.y, still.error], [0, 0, 0]);
});

// A page with no `kazoku-view-controls` and a view that binds its own controller: the page's controller is reached by a path from window, and the check reads `state` and calls `set` on it.
type Fake = { zoom: number; yaw: number; tilt: number; roll: number; panX: number; panY: number };
const withFakePage = async (run: (page: GesturePage, g: Record<string, unknown>) => Promise<void>): Promise<void> => {
  const g = globalThis as unknown as Record<string, unknown>;
  const kept = { window: g.window, document: g.document, requestAnimationFrame: g.requestAnimationFrame };
  g.window = globalThis;
  g.document = { querySelector: () => null, addEventListener: () => undefined, removeEventListener: () => undefined };
  g.requestAnimationFrame = (step: () => void) => setTimeout(step, 0);
  const noBox = { boundingBox: async () => ({ x: 0, y: 0, width: 100, height: 100 }), screenshot: async () => new Uint8Array(), focus: async () => undefined };
  const fake = {
    evaluate: async (fn: (arg: unknown) => unknown, arg: unknown) => fn(arg),
    locator: () => noBox,
    waitForTimeout: async () => undefined,
    mouse: {},
    keyboard: { down: async () => undefined, up: async () => undefined, press: async () => undefined },
  };
  try {
    await run(fake as unknown as GesturePage, g);
  } finally {
    for (const [key, value] of Object.entries(kept)) {
      if (value === undefined) delete g[key];
      else g[key] = value;
    }
    delete g.__kazokuGestures;
    delete g.ownView;
  }
};
const everyGestureBut = (keep: string): Record<string, string> => Object.fromEntries([...GESTURE_NAMES, "picture"].filter((name) => name !== keep).map((name) => [name, "not under test"]));

test("the controller option reads a view's state from a controller given as a path from window, and sets it there", async () => {
  await withFakePage(async (page, g) => {
    const state: Fake = { zoom: 1, yaw: 0, tilt: 0, roll: 0, panX: 0, panY: 0 };
    const sets: object[] = [];
    g.ownView = { state, set: (next: Partial<Fake>) => { sets.push(next); Object.assign(state, next); }, pause: () => undefined };
    // The "+" key zooms the page's controller, as a bound controller would.
    (page as unknown as { keyboard: { press(key: string): Promise<void> } }).keyboard.press = async (key) => { state.zoom *= key === "Equal" ? 1.4 : 1 / 1.4; };
    const report = await checkGestures(page, "#own", { controller: "ownView", lacks: everyGestureBut("key-zoom") });
    assert.deepEqual(report.filter((r) => r.result === "checked").map((r) => r.gesture), ["key-zoom"]);
    assert.ok(sets.length > 0, "the check set the view through the controller");
  });
});

test("the controller option takes an object that holds the controller, and a controller that does not zoom fails the gesture by name", async () => {
  await withFakePage(async (page, g) => {
    const state: Fake = { zoom: 1, yaw: 0, tilt: 0, roll: 0, panX: 0, panY: 0 };
    g.ownView = { views: { sky: { controller: { state, set: (next: Partial<Fake>) => Object.assign(state, next) } } } };
    await assert.rejects(checkGestures(page, "#own", { controller: "ownView.views.sky", timeout: 50, lacks: everyGestureBut("key-zoom") }), /key-zoom.*\+ did not zoom in/s);
  });
});

test("a path that reaches nothing, and an element with no controller, are told what to give", async () => {
  await withFakePage(async (page, g) => {
    await assert.rejects(checkGestures(page, "#own", { controller: "nowhere.at.all" }), /window\.nowhere\.at\.all is not a controller/);
    g.ownView = { state: {} };
    await assert.rejects(checkGestures(page, "#own", { controller: "ownView" }), /no controller to set the view with/);
  });
});
