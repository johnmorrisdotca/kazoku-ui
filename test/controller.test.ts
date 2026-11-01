import assert from "node:assert/strict";
import { test } from "node:test";

import { type Clock, createViewController, type ViewState } from "../src/view-controls/controller.ts";
import { WORDS, languageOf, wordsFor } from "../src/view-controls/words.ts";

/** A clock the test turns by hand. */
function fakeClock() {
  let callback: ((now: number) => void) | undefined;
  let now = 0;
  const clock: Clock = { request: (cb) => { callback = cb; return 1; }, cancel: () => { callback = undefined; } };
  return { clock, step: (ms: number) => { now += ms; const run = callback; callback = undefined; run?.(now); }, pending: () => callback !== undefined };
}

const make = (extra: Parameters<typeof createViewController>[0] = {}) => {
  const clock = fakeClock();
  const seen: { state: ViewState; final: boolean; reason: string }[] = [];
  const view = createViewController({ clock: clock.clock, size: () => ({ width: 400, height: 300 }), onChange: (state, info) => seen.push({ state, ...info }), ...extra });
  return { view, clock, seen };
};

test("it turns by itself at its speed, and a hundred milliseconds is the most one frame advances", () => {
  const { view, clock } = make({ speed: 30 });
  view.play();
  clock.step(1000);
  clock.step(1000);
  assert.equal(view.state.yaw, 3);
  clock.step(5000);
  assert.equal(view.state.yaw, 6);
  view.pause();
  assert.equal(clock.pending(), false);
});

test("a control never stops or resets the turn", () => {
  const { view, clock } = make();
  view.play();
  clock.step(16);
  clock.step(1000);
  const turning = (): boolean => view.state.turning;
  const yawBefore = view.state.yaw;
  view.set({ tilt: 10 });
  view.set({ yaw: 50 }, false, "slider");
  view.zoomBy(1.4);
  view.zoomAt(2);
  view.panBy(1, 0);
  view.setDrag("turn");
  view.fit();
  assert.equal(turning(), true);
  assert.equal(view.state.yaw, 50);
  clock.step(1000);
  assert.ok(view.state.yaw > 50, "the turn carries on from where the slider left it");
  assert.notEqual(yawBefore, view.state.yaw);
  view.front();
  assert.deepEqual([view.state.yaw, view.state.tilt, turning()], [0, 0, true]);
  clock.step(1000);
  assert.ok(view.state.yaw > 0);
});

test("a held turn waits and carries on from where the hand left it", () => {
  const { view, clock } = make();
  view.play();
  clock.step(16);
  view.holdTurn();
  clock.step(1000);
  clock.step(1000);
  assert.equal(view.state.yaw, 0);
  view.set({ yaw: 90 }, false, "slider");
  view.releaseTurn();
  clock.step(100);
  clock.step(100);
  assert.equal(view.state.yaw, 93);
});

test("zoom about the pointer keeps the point; the buttons zoom about the middle", () => {
  const { view } = make();
  view.zoomAt(2);
  assert.deepEqual([view.state.zoom, view.state.panX, view.state.panY], [2, 0, 0]);
  view.fit();
  // With no view bound the middle is 0, 0 and `at` is read from it too.
  view.zoomAt(2, { x: 100, y: 0 });
  assert.equal(view.state.panX, -100);
  assert.equal(view.state.zoom, 2);
});

test("the pan pad moves a quarter of the view and is held inside the zoom's room", () => {
  const { view } = make();
  view.zoomAt(2);
  view.panBy(1, 0);
  assert.equal(view.state.panX, 100);
  view.panBy(1, 0);
  view.panBy(1, 0);
  assert.equal(view.state.panX, 200, "held: at 2x the picture may move half the width");
  view.panBy(0, -1);
  assert.equal(view.state.panY, -75);
  view.fit();
  assert.deepEqual([view.state.zoom, view.state.panX, view.state.panY], [1, 0, 0]);
});

test("front sets the angle and tilt to zero and the limits hold", () => {
  const { view } = make();
  view.set({ yaw: 200, tilt: 99, zoom: 99 });
  assert.deepEqual([view.state.yaw, view.state.tilt, view.state.zoom], [-160, 30, 5]);
  view.front();
  assert.deepEqual([view.state.yaw, view.state.tilt, view.state.zoom], [0, 0, 5]);
});

test("a flat view cannot turn", () => {
  const { view, clock } = make({ turnable: false });
  view.set({ yaw: 40, tilt: 10 });
  assert.deepEqual([view.state.yaw, view.state.tilt], [0, 0]);
  view.play();
  assert.equal(view.state.turning, false);
  assert.equal(clock.pending(), false);
});

test("every change reports the whole state, and a frame of the automatic turn is not final", () => {
  const { view, clock, seen } = make();
  view.play();
  clock.step(16);
  clock.step(500);
  view.zoomBy(2);
  const auto = seen.find((s) => s.reason === "auto");
  assert.equal(auto?.final, false);
  const last = seen.at(-1);
  assert.equal(last?.reason, "zoom");
  assert.equal(last?.final, true);
  assert.deepEqual(Object.keys(last?.state ?? {}).sort(), ["drag", "panX", "panY", "tilt", "turning", "yaw", "zoom"]);
  assert.equal(last?.state.turning, true);
});

test("the labels are complete in both languages", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(languageOf(""), "en");
  assert.equal(wordsFor("en", { front: "Home" }).front, "Home");
});
