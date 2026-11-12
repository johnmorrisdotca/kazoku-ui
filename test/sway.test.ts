import assert from "node:assert/strict";
import { test } from "node:test";

import { nextSwayGain, parseSway, swayOffset } from "../src/view-controls/sway.ts";
import { type Clock, createViewController, type Sway, type ViewState } from "../src/view-controls/controller.ts";

function fakeClock() {
  let callback: ((now: number) => void) | undefined;
  const clock: Clock = { request: (cb) => { callback = cb; return 1; }, cancel: () => { callback = undefined; } };
  return { clock, step: (ms: number) => { const run = callback; callback = undefined; run?.(ms); }, pending: () => callback !== undefined };
}

test("gentle and more are the only names, and more is the stronger drift", () => {
  assert.equal(parseSway(null), "off");
  assert.equal(parseSway("nope"), "off");
  assert.equal(parseSway(" Gentle "), "gentle");
  const gentle = swayOffset(2000, "gentle");
  const more = swayOffset(2000, "more");
  assert.deepEqual(swayOffset(2000, "off"), { yaw: 0, tilt: 0, roll: 0, panX: 0, panY: 0 });
  assert.ok(Math.abs(gentle.yaw) + Math.abs(gentle.tilt) > 0.05);
  assert.ok(Math.abs(more.yaw) > Math.abs(gentle.yaw) * 2);
  assert.notDeepEqual(swayOffset(2000, "gentle"), swayOffset(9000, "gentle"));
});

test("the drift fades out while the reader has the view, and back in after", () => {
  assert.equal(nextSwayGain(1, 450, true), 0);
  assert.equal(nextSwayGain(0, 450, false), 1);
  assert.ok(nextSwayGain(1, 100, true) > 0.5);
  assert.equal(nextSwayGain(0.4, 0, false), 0.4);
});

test("while the view turns, the picture drifts and the angle does not, and a still view asks for no frame", () => {
  let t = 0;
  const seen: { state: ViewState; final: boolean; reason: string }[] = [];
  const clock = fakeClock();
  const view = createViewController({ sway: "gentle" satisfies Sway, speed: 0, clock: clock.clock, now: () => t, onChange: (state, info) => seen.push({ state, ...info }) });
  assert.equal(clock.pending(), false, "sway alone asks for nothing");
  view.play();
  t = 1000;
  clock.step(16);
  t = 1500;
  clock.step(500);
  t = 2000;
  clock.step(1000);
  const drawn = seen.at(-1);
  assert.equal(drawn?.reason, "auto");
  assert.equal(view.state.yaw, 0);
  assert.notEqual(drawn?.state.yaw, 0, "the picture has drifted");
  const angle = view.state.yaw;
  view.pause();
  assert.equal(seen.at(-1)?.state.yaw, angle, "a settled frame is the angle, with no drift");
  assert.equal(clock.pending(), false);
});

test("a drag fades the drift out", () => {
  let t = 0;
  const seen: { state: ViewState; reason: string }[] = [];
  const clock = fakeClock();
  const view = createViewController({ sway: "gentle", speed: 0, clock: clock.clock, now: () => t, onChange: (state, info) => seen.push({ state, reason: info.reason }) });
  const listeners = new Map<string, (e: unknown) => void>();
  view.bind({
    style: {},
    dataset: {},
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: () => undefined,
    setPointerCapture: () => undefined,
    contains: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    ownerDocument: { addEventListener: () => undefined, removeEventListener: () => undefined },
  } as unknown as HTMLElement);
  view.play();
  t = 1000;
  clock.step(16);
  t = 1500;
  clock.step(500);
  t = 2000;
  clock.step(1000);
  assert.notEqual(seen.at(-1)?.state.yaw, view.state.yaw);
  listeners.get("pointerdown")?.({ target: {}, composedPath: () => [], pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10, shiftKey: false, button: 0 });
  t = 2600;
  listeners.get("pointermove")?.({ pointerId: 1, pointerType: "mouse", clientX: 80, clientY: 10 });
  const during = seen.at(-1);
  assert.equal(during?.reason, "drag");
  assert.ok(Math.abs((during?.state.yaw ?? 0) - view.state.yaw) < 0.02, "the drift has faded while the reader drags");
});

test("reduced motion draws the angle alone", () => {
  const media = globalThis.matchMedia;
  globalThis.matchMedia = (() => ({ matches: true })) as unknown as typeof matchMedia;
  try {
    let t = 0;
    const seen: { state: ViewState }[] = [];
    const clock = fakeClock();
    const view = createViewController({ sway: "more", speed: 0, clock: clock.clock, now: () => t, onChange: (state) => seen.push({ state }) });
    view.play();
    t = 1000;
    clock.step(16);
    t = 1500;
    clock.step(500);
    t = 2000;
    clock.step(1000);
    assert.equal(seen.at(-1)?.state.yaw, view.state.yaw);
  } finally {
    globalThis.matchMedia = media;
  }
});
