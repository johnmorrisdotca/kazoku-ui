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

test("it opens at Fit by default, and a number is a scale over the page's fit scale", () => {
  assert.equal(make().view.state.zoom, 1);
  assert.equal(make({ zoom: "fit", fitScale: 0.4 }).view.state.zoom, 1);
  assert.equal(make({ zoom: 2 }).view.state.zoom, 2);
  const { view } = make({ zoom: 1, fitScale: 0.4 });
  assert.equal(view.state.zoom, 2.5);
  assert.equal(view.startZoom, 2.5);
  assert.equal(make({ initial: { zoom: 3 } }).view.state.zoom, 3);
  assert.equal(make({ zoom: 1, fitScale: 0.01 }).view.state.zoom, 5, "held to the zoom limit");
});

test("the page can tell it what zoom 1 means later, until the reader has zoomed", () => {
  const { view, seen } = make({ zoom: 1 });
  assert.equal(view.state.zoom, 1);
  view.setFitScale(0.5);
  assert.deepEqual([view.fitScale, view.state.zoom, seen.at(-1)?.reason], [0.5, 2, "fit-scale"]);
  view.setFitScale(0.25);
  assert.equal(view.state.zoom, 4);
  view.zoomBy(0.5);
  view.setFitScale(0.5);
  assert.equal(view.state.zoom, 2, "the reader's zoom stays");
  view.fit();
  assert.equal(view.state.zoom, 1, "Fit still means 1");
  view.setFitScale(0.1);
  assert.equal(view.state.zoom, 1);
  view.setStartZoom("fit");
  assert.deepEqual([view.state.zoom, view.startZoom], [1, 1]);
  view.setFitScale(Number.NaN);
  view.setFitScale(-2);
  assert.equal(view.fitScale, 0.1);
});

test("a press on what is inside the view is left alone, a press on the view itself is taken", () => {
  const listeners = new Map<string, (e: unknown) => void>();
  const inside = new Set<unknown>();
  let captured = 0;
  const fakeView = {
    style: {},
    dataset: {} as Record<string, string>,
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: () => undefined,
    setPointerCapture: () => { captured += 1; },
    contains: (node: unknown) => inside.has(node),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    ownerDocument: {},
  };
  const child = (selector: string | undefined) => {
    const node = { closest: (sel: string) => (selector !== undefined && sel.split(",").map((s) => s.trim()).includes(selector) ? node : null) };
    inside.add(node);
    return node;
  };
  const press = (target: unknown, composedPath?: () => unknown[]) => listeners.get("pointerdown")?.({ target, composedPath, pointerId: 1, pointerType: "mouse", button: 0, clientX: 5, clientY: 5, shiftKey: false });
  const { view } = make();
  view.bind(fakeView as unknown as HTMLElement);
  press(child("button"));
  assert.equal(captured, 0, "a button inside is not captured");
  press(child("[data-kazoku-ignore]"));
  assert.equal(captured, 0);
  press(child(undefined));
  assert.equal(captured, 1, "other children turn the view");
  listeners.get("pointercancel")?.({ pointerId: 1, type: "pointercancel" });
  const host = child(undefined);
  const inner = { matches: (sel: string) => sel.split(",").map((s) => s.trim()).includes("button") };
  press(host, () => [inner, host, fakeView]);
  assert.equal(captured, 1, "a button inside a shadow root is not captured");
  press(host, () => [{ matches: () => false }, host, fakeView]);
  assert.equal(captured, 2, "a shadow root without a match turns the view");
  listeners.get("pointercancel")?.({ pointerId: 1, type: "pointercancel" });
  press(host, () => [host, fakeView, inner]);
  assert.equal(captured, 3, "the path is not read past the view");
  listeners.get("pointercancel")?.({ pointerId: 1, type: "pointercancel" });
  view.ignore = "";
  press(child("button"));
  assert.equal(captured, 4, "an empty selector leaves nothing alone");
  listeners.get("pointercancel")?.({ pointerId: 1, type: "pointercancel" });
  view.ignore = "((";
  press(child("button"));
  assert.equal(captured, 5, "a bad selector leaves nothing alone");
});

const fakeBound = () => {
  const listeners = new Map<string, (e: unknown) => void>();
  const fakeView = {
    style: {},
    dataset: {} as Record<string, string>,
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: () => undefined,
    setPointerCapture: () => undefined,
    contains: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    ownerDocument: {},
  };
  const key = (k: string) => { let stopped = false; listeners.get("keydown")?.({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: () => { stopped = true; } }); return stopped; };
  const wheel = (init: object) => listeners.get("wheel")?.({ ctrlKey: false, metaKey: false, shiftKey: false, deltaX: 0, deltaY: 0, deltaMode: 0, clientX: 200, clientY: 150, preventDefault: () => undefined, ...init });
  const press = (x: number, y: number) => listeners.get("pointerdown")?.({ target: {}, composedPath: () => [], pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y, shiftKey: false });
  const move = (x: number, y: number) => listeners.get("pointermove")?.({ pointerId: 1, pointerType: "mouse", clientX: x, clientY: y });
  const release = () => listeners.get("pointerup")?.({ pointerId: 1, type: "pointerup", pointerType: "mouse", clientX: 0, clientY: 0, timeStamp: 1e9 });
  return { fakeView: fakeView as unknown as HTMLElement, key, wheel, press, move, release };
};

test("the buttons and keys zoom about the anchor, which stays where it is on screen", () => {
  const { view } = make();
  const screen = (): { x: number; y: number } => ({ x: view.state.panX + view.state.zoom * 60, y: view.state.panY + view.state.zoom * -30 });
  view.anchor = { x: 60, y: -30 };
  const before = screen();
  view.zoomBy(1.4);
  assert.ok(Math.abs(screen().x - before.x) < 1 && Math.abs(screen().y - before.y) < 1, "plus keeps the anchor");
  assert.ok(view.state.zoom > 1.39);
  view.zoomBy(1.25);
  const mid = screen();
  view.zoomBy(1 / 1.25);
  view.zoomBy(1 / 1.4);
  assert.ok(Math.abs(mid.x - before.x) < 1 && Math.abs(screen().x - before.x) < 1 && Math.abs(screen().y - before.y) < 1, "plus then minus leaves it fixed");
  assert.ok(Math.abs(view.state.zoom - 1) < 1e-9);
  view.zoomAt(2);
  assert.ok(Math.abs(screen().x - 60) < 1, "zoomAt with no point uses it too");
  view.fit();
  view.anchor = undefined;
  view.zoomBy(2);
  assert.deepEqual([view.state.panX, view.state.panY], [0, 0], "no anchor: about the middle, as before");
});

test("the anchor moves with the picture when the view is moved", () => {
  const { view } = make({ anchor: { x: 40, y: 0 } });
  view.zoomAt(2);
  view.panBy(-1, 0);
  const x = view.state.panX + view.state.zoom * 40;
  view.zoomBy(1.25);
  assert.ok(Math.abs(view.state.panX + view.state.zoom * 40 - x) < 1);
});

test("the wheel and a pinch still zoom about the pointer, whatever the anchor", () => {
  const { view } = make({ anchor: { x: 60, y: 0 } });
  const hands = fakeBound();
  view.bind(hands.fakeView);
  hands.wheel({ ctrlKey: true, deltaY: -50, clientX: 300, clientY: 150 });
  const k = view.state.zoom;
  assert.ok(k > 1);
  assert.ok(Math.abs(view.state.panX - (100 - 100 * k)) < 1e-6, "about the pointer's place, 100 right of the middle");
});

test("Arrow Up tips like a drag up by default and the other way with keyTilt wheel", () => {
  const drag = make();
  const a = fakeBound();
  drag.view.bind(a.fakeView);
  a.key("ArrowUp");
  assert.equal(drag.view.state.tilt, 5);
  a.key("ArrowDown");
  a.key("ArrowDown");
  assert.equal(drag.view.state.tilt, -5);
  const wheel = make({ keyTilt: "wheel" });
  const b = fakeBound();
  wheel.view.bind(b.fakeView);
  b.key("ArrowUp");
  assert.equal(wheel.view.state.tilt, -5);
  b.key("ArrowDown");
  b.key("ArrowDown");
  assert.equal(wheel.view.state.tilt, 5);
});

test("the plain wheel over the view zooms about the pointer; it never tips the view", () => {
  const { view } = make();
  const hands = fakeBound();
  view.bind(hands.fakeView);
  let stopped = false;
  hands.wheel({ deltaY: -100, clientX: 300, clientY: 150, timeStamp: 1000, preventDefault: () => { stopped = true; } });
  const k = view.state.zoom;
  assert.ok(stopped, "the view takes the wheel, so the page does not scroll");
  assert.ok(k > 1.15 && k < 1.3, `one notch zooms about 1.2 times (${k})`);
  assert.ok(Math.abs(view.state.panX - (100 - 100 * k)) < 1e-6, "about the pointer's place, 100 right of the middle");
  assert.equal(view.state.tilt, 0, "the wheel does not tip");
  assert.equal(view.state.yaw, 0, "nor turn");
  hands.wheel({ deltaY: 100, clientX: 300, clientY: 150, timeStamp: 1100 });
  assert.ok(Math.abs(view.state.zoom - 1) < 1e-9, "a notch down zooms back out");
  // Firefox counts in lines: three lines a notch zoom about as much as 100 pixels do.
  hands.wheel({ deltaY: -3, deltaMode: 1, timeStamp: 1200 });
  assert.ok(Math.abs(view.state.zoom - k) < 0.02, `three lines (${view.state.zoom}) zoom like one notch (${k})`);
  hands.wheel({ deltaY: -100000, timeStamp: 1300 });
  assert.ok(view.state.zoom <= k * 2 + 1e-9, "one event never zooms more than twice");
});

test("Shift and the wheel, or a sideways swipe, turns the view; a flat view leaves them to the page", () => {
  const { view } = make();
  const hands = fakeBound();
  view.bind(hands.fakeView);
  let stopped = false;
  hands.wheel({ shiftKey: true, deltaY: 100, timeStamp: 10, preventDefault: () => { stopped = true; } });
  assert.ok(stopped);
  assert.equal(view.state.yaw, 30, "Shift and the wheel turns");
  assert.equal(view.state.zoom, 1, "and does not zoom");
  hands.wheel({ deltaX: -50, deltaY: 5, timeStamp: 20 });
  assert.equal(view.state.yaw, 15, "a sideways swipe turns");
  assert.equal(view.state.tilt, 0, "neither tips");
  const flat = make();
  flat.view.turnable = false;
  const f = fakeBound();
  flat.view.bind(f.fakeView);
  stopped = false;
  f.wheel({ deltaX: 80, timeStamp: 10, preventDefault: () => { stopped = true; } });
  assert.equal(stopped, false, "a flat view lets the page have a sideways swipe");
  assert.equal(flat.view.state.yaw, 0);
});

test("the page scrolls when the zoom is at its end, but a wheel that reaches the end part-way through does not fling it", () => {
  const { view } = make();
  const hands = fakeBound();
  view.bind(hands.fakeView);
  let taken = 0;
  const spin = (deltaY: number, timeStamp: number, init: object = {}) => {
    let stopped = false;
    hands.wheel({ deltaY, timeStamp, preventDefault: () => { stopped = true; }, ...init });
    if (stopped) taken += 1;
    return stopped;
  };
  // At Fit, a wheel turned down (zooming out) has nowhere to go: the page scrolls, and goes on scrolling.
  assert.equal(spin(100, 1000), false, "zooming out at Fit scrolls the page");
  assert.equal(spin(100, 1050), false, "and keeps scrolling it");
  assert.equal(view.state.zoom, 1);
  // Turned up, it zooms in, then back out to Fit; the steps that come on in the same turn stop at Fit and do not scroll the page.
  assert.equal(spin(-100, 2000), true);
  assert.ok(view.state.zoom > 1);
  assert.equal(spin(100, 2050), true);
  assert.equal(spin(100, 2100), true, "reaching Fit part-way through a turn holds the page still");
  assert.equal(spin(100, 2350), true, "so does its glide, while the steps keep coming");
  assert.equal(view.state.zoom, 1);
  assert.equal(spin(100, 3000), false, "a new turn of the wheel at Fit scrolls the page again");
  // The same at the other end.
  view.zoomAt(5);
  assert.equal(spin(-100, 4000), false, "zooming in at the most scrolls the page");
  // A pinch is always the view's, or the browser would zoom the page.
  view.fit();
  assert.equal(spin(50, 5000, { ctrlKey: true }), true, "Ctrl and the wheel at Fit is still the view's");
  assert.equal(view.state.zoom, 1);
  assert.equal(taken, 5, "the view took only the steps it zoomed or held");
});

test("a press, the wheel or a key stops the automatic turn only when asked; a control never does", () => {
  for (const stopTurn of [false, true]) {
    for (const hand of ["press", "wheel", "key", "ctrl-wheel"] as const) {
      const { view, clock } = make({ stopTurn });
      const hands = fakeBound();
      (hands.fakeView as unknown as { ownerDocument: { activeElement: unknown } }).ownerDocument.activeElement = hands.fakeView;
      view.bind(hands.fakeView);
      view.play();
      clock.step(16);
      if (hand === "press") hands.press(10, 10);
      else if (hand === "wheel") hands.wheel({ deltaY: -40, timeStamp: 100 });
      else if (hand === "ctrl-wheel") hands.wheel({ ctrlKey: true, deltaY: -40 });
      else hands.key("ArrowLeft");
      assert.equal(view.state.turning, !stopTurn, `${hand}, stopTurn ${stopTurn}`);
    }
  }
  const { view } = make({ stopTurn: true });
  view.play();
  view.zoomBy(1.4);
  view.set({ tilt: 4 });
  view.front();
  assert.equal(view.state.turning, true);
  const idle = make({ stopTurn: true });
  const hands = fakeBound();
  idle.view.bind(hands.fakeView);
  assert.equal(hands.key("q"), false, "a key it does not handle is left alone");
});

test("tiltStep rounds the tilt of a drag, and 0 leaves it as it is", () => {
  for (const [tiltStep, expected] of [[0, 3.4], [1, 3], [5, 5]] as const) {
    const { view } = make({ tiltStep });
    const hands = fakeBound();
    view.bind(hands.fakeView);
    hands.press(100, 100);
    hands.move(100, 83);
    assert.ok(Math.abs(view.state.tilt - expected) < 1e-9, `step ${tiltStep}`);
    hands.release();
  }
});

test("grabRadius keeps the touched point under the pointer: the same degrees for a pixel on both axes, a bigger piece turns less, a zoomed one too, and off it is the fixed angle", () => {
  const radian = 180 / Math.PI;
  const drag = (extra: Parameters<typeof createViewController>[0], dx: number, dy: number, zoomFirst = 1) => {
    const { view } = make({ drag: undefined, ...extra } as never);
    const hands = fakeBound();
    view.bind(hands.fakeView);
    if (zoomFirst !== 1) {
      view.setDrag("turn");
      view.zoomAt(zoomFirst);
    }
    hands.press(100, 100);
    hands.move(100 + dx, 100 + dy);
    hands.release();
    return view.state;
  };
  assert.ok(Math.abs(drag({ grabRadius: 100 }, 100, 0).yaw - radian) < 1e-9);
  assert.ok(Math.abs(drag({ grabRadius: 100 }, 0, -40).tilt - 0.4 * radian) < 1e-9);
  assert.ok(Math.abs(drag({ grabRadius: 200 }, 100, 0).yaw - radian / 2) < 1e-9, "a bigger piece turns less");
  // "fit" is half the smaller side of the view: 150 here (400 by 300).
  assert.ok(Math.abs(drag({ grabRadius: "fit" }, 150, 0).yaw - radian) < 1e-9);
  const zoomed = drag({ grabRadius: 100 }, 100, 0, 2);
  assert.ok(Math.abs(zoomed.yaw - radian / 2) < 1e-9, "at 2x the piece is twice as big, so the same pixels turn it half as far");
  assert.equal(drag({}, 100, 0).yaw, 45, "unset it is a half turn across the view");
  const { view } = make();
  assert.equal(view.grabRadius, 0);
  view.grabRadius = 100;
  const hands = fakeBound();
  view.bind(hands.fakeView);
  hands.press(0, 0);
  hands.move(100, 0);
  assert.ok(Math.abs(view.state.yaw - radian) < 1e-9, "it can be changed at any time");
});

test("centre puts the object back in the middle at Fit and the default angle, in a quarter of a second, and says so when it is there", () => {
  const { view, clock, seen } = make();
  view.set({ yaw: 120, tilt: 20, zoom: 3, panX: 80, panY: -40 }, true);
  seen.length = 0;
  view.centre();
  assert.equal(clock.pending(), true, "it moves over frames");
  clock.step(0);
  clock.step(100);
  assert.ok(view.state.zoom < 3 && view.state.zoom > 1 && view.state.yaw < 120 && view.state.yaw > 0, "on the way");
  assert.ok(seen.every((one) => one.reason === "centre" && !one.final), "the steps are not final");
  clock.step(200);
  assert.deepEqual({ yaw: view.state.yaw, tilt: view.state.tilt, zoom: view.state.zoom, panX: view.state.panX, panY: view.state.panY }, { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 });
  assert.equal(seen[seen.length - 1]?.final, true);
  assert.equal(clock.pending(), false, "and the loop is done");
});

test("centre with animate false, or for a reader who prefers reduced motion, goes at once; a hand on the view stops it where it is", () => {
  const instant = make();
  instant.view.set({ yaw: 120, zoom: 3, panX: 80 }, true);
  instant.view.centre(false);
  assert.equal(instant.view.state.zoom, 1);
  assert.equal(instant.view.state.yaw, 0);
  assert.equal(instant.clock.pending(), false);
  const reduced = make();
  reduced.view.set({ yaw: 120, zoom: 3, panX: 80 }, true);
  const was = (globalThis as { matchMedia?: unknown }).matchMedia;
  (globalThis as { matchMedia?: unknown }).matchMedia = () => ({ matches: true });
  try {
    reduced.view.centre();
  } finally {
    (globalThis as { matchMedia?: unknown }).matchMedia = was;
  }
  assert.equal(reduced.view.state.zoom, 1, "reduced motion: at once");
  const held = make();
  held.view.set({ yaw: 120, zoom: 3, panX: 80 }, true);
  held.view.centre();
  held.clock.step(0);
  held.clock.step(80);
  const hands = fakeBound();
  held.view.bind(hands.fakeView);
  hands.press(100, 100);
  const stopped = held.view.state.zoom;
  assert.equal(held.clock.pending(), false, "a press stops the move");
  held.clock.step(500);
  assert.equal(held.view.state.zoom, stopped);
  hands.release();
});

test("an object smaller than the view cannot be panned out of it", () => {
  const { view } = make({ objectSize: { width: 100, height: 80 } });
  view.set({ zoom: 2 }, true);
  view.panBy(40, 0);
  assert.equal(view.state.panX, 250, "a quarter of the object (50 of 200) is left in the view");
  view.panBy(-80, 0);
  assert.equal(view.state.panX, -250);
});

test("a suspended turn asks for no frames and sends no change, and goes on when resumed", () => {
  const { view, clock, seen } = make();
  view.play();
  clock.step(16);
  clock.step(1000);
  const sent = seen.length;
  view.suspendTurn();
  assert.equal(clock.pending(), false);
  assert.equal(view.state.turning, true);
  clock.step(1000);
  clock.step(1000);
  assert.equal(seen.length, sent);
  view.resumeTurn();
  assert.equal(clock.pending(), true);
  const yaw = view.state.yaw;
  clock.step(5000);
  assert.equal(view.state.yaw, yaw, "the first frame back only starts the clock");
  clock.step(1000);
  assert.equal(view.state.yaw, yaw + 3, "a frame advances at most a tenth of a second");
});

test("suspends nest, and playing while suspended waits for the resume", () => {
  const { view, clock } = make();
  view.suspendTurn();
  view.suspendTurn();
  view.play();
  assert.equal(clock.pending(), false);
  view.resumeTurn();
  assert.equal(clock.pending(), false);
  view.resumeTurn();
  assert.equal(clock.pending(), true);
  view.resumeTurn();
  view.pause();
  view.suspendTurn();
  view.resumeTurn();
  assert.equal(clock.pending(), false, "a paused view has no loop to resume");
});

test("play with seconds stops by itself after that many seconds of turning, and a plain play has no limit", () => {
  const { view, clock, seen } = make({ speed: 30 });
  view.play(1);
  clock.step(16);
  clock.step(100);
  view.suspendTurn();
  clock.step(60_000);
  view.resumeTurn();
  clock.step(16);
  for (let i = 0; i < 9; i += 1) clock.step(100);
  assert.equal(view.state.turning, true, "the time off screen does not count");
  clock.step(100);
  clock.step(100);
  assert.equal(view.state.turning, false);
  assert.equal(clock.pending(), false);
  assert.equal(seen.at(-1)?.reason, "pause");
  view.play();
  for (let i = 0; i < 30; i += 1) clock.step(100);
  assert.equal(view.state.turning, true);
});

/** A view for `bind`, with an IntersectionObserver and a tab the test moves by hand. */
function sightRig() {
  const answers: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
  const observed: unknown[] = [];
  const before = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { answers.push(callback); }
    observe(target: unknown) { observed.push(target); }
    disconnect() { answers.length = 0; }
  } as unknown as typeof IntersectionObserver;
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: "visible",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const view = { style: {}, dataset: {}, addEventListener: () => undefined, removeEventListener: () => undefined, ownerDocument: doc } as unknown as HTMLElement;
  return {
    view,
    observed,
    onScreen: (value: boolean) => { for (const answer of [...answers]) answer([{ isIntersecting: value }]); },
    tab: (state: string) => { doc.visibilityState = state; for (const fn of [...listeners]) fn(); },
    watching: () => answers.length > 0 || listeners.size > 0,
    done: () => { globalThis.IntersectionObserver = before; },
  };
}

test("a bound view that cannot be seen asks for no frame, from the start, off screen or in a hidden tab, and goes on where it was", () => {
  const rig = sightRig();
  try {
    const { view, clock, seen } = make({ speed: 30 });
    view.bind(rig.view);
    assert.deepEqual(rig.observed, [rig.view]);
    view.play();
    assert.equal(clock.pending(), false, "not asked for before the observer has answered");
    rig.onScreen(true);
    assert.equal(clock.pending(), true);
    clock.step(16);
    clock.step(100);
    const yaw = view.state.yaw;
    assert.ok(yaw > 0);
    rig.onScreen(false);
    assert.equal(clock.pending(), false);
    const sent = seen.length;
    clock.step(5000);
    assert.equal(seen.length, sent, "nothing sent while off screen");
    rig.onScreen(true);
    rig.tab("hidden");
    assert.equal(clock.pending(), false);
    rig.onScreen(false);
    rig.tab("visible");
    assert.equal(clock.pending(), false, "both have to be undone");
    assert.equal(view.state.turning, true);
    rig.onScreen(true);
    assert.equal(clock.pending(), true);
    clock.step(5000);
    assert.equal(view.state.yaw, yaw, "the first frame back only starts the clock");
    clock.step(100);
    assert.ok(view.state.yaw - yaw <= 3.0001, "no jump for the time away");
  } finally {
    rig.done();
  }
});

test("unbinding stops watching and takes its hold off, and the page's own suspend still counts", () => {
  const rig = sightRig();
  try {
    const { view, clock } = make();
    const off = view.bind(rig.view);
    view.play();
    assert.equal(clock.pending(), false);
    view.suspendTurn();
    off();
    assert.equal(rig.watching(), false);
    assert.equal(clock.pending(), false, "the page's suspend is still on");
    view.resumeTurn();
    assert.equal(clock.pending(), true);
  } finally {
    rig.done();
  }
});

test("a destroyed controller never turns again, whatever still holds it", () => {
  const { view, clock, seen } = make();
  view.destroy();
  const sent = seen.length;
  view.play();
  view.toggle();
  view.set({ turning: true });
  assert.equal(view.state.turning, false);
  assert.equal(clock.pending(), false);
  view.resumeTurn();
  assert.equal(clock.pending(), false);
  assert.ok(seen.slice(sent).every((change) => !change.state.turning));
});

test("one frame is asked for at a time, whatever is pressed during a frame", () => {
  // A clock that remembers every request, so a second loop cannot hide behind the one before it.
  const waiting = new Map<number, (now: number) => void>();
  let id = 0;
  let most = 0;
  const clock: Clock = {
    request: (cb) => { id += 1; waiting.set(id, cb); most = Math.max(most, waiting.size); return id; },
    cancel: (which) => { waiting.delete(which); },
  };
  let now = 0;
  const frame = (): void => {
    now += 16;
    const run = [...waiting.values()];
    waiting.clear();
    for (const cb of run) cb(now);
  };
  let during: (() => void) | undefined;
  const view = createViewController({ clock, onChange: () => { const act = during; during = undefined; act?.(); } });
  view.play();
  frame();
  const acts: (() => void)[] = [
    () => { view.pause(); view.play(); },
    () => { view.toggle(); view.toggle(); },
    () => { view.suspendTurn(); view.resumeTurn(); },
    () => { view.suspendTurn(); view.suspendTurn(); view.resumeTurn(); view.resumeTurn(); },
    () => { view.holdTurn(); view.releaseTurn(); },
    () => { view.play(); view.play(); },
    () => view.set({ turning: true }),
  ];
  for (const act of acts) {
    during = act;
    frame();
    frame();
    act();
    frame();
    assert.equal(waiting.size, 1, act.toString());
  }
  assert.equal(most, 1);
});
