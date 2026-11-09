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
