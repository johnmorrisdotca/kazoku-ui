import assert from "node:assert/strict";
import { test } from "node:test";

import { createPanZoomController, wheelFactor, zoomAbout, type PanZoomReason, type PanZoomView } from "../src/pan-zoom/index.ts";

type Handler = (event: Record<string, unknown>) => void;

/** An element a test drives by hand: a 400 by 200 box at (100, 50) whose listeners the test calls. */
function fakeElement() {
  const handlers = new Map<string, Handler>();
  const element = {
    style: { touchAction: "auto" },
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 200 }),
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    removeEventListener: (type: string) => handlers.delete(type),
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  };
  const fire = (type: string, event: Record<string, unknown> = {}): { defaultPrevented: boolean } => {
    const full = { defaultPrevented: false, preventDefault() { full.defaultPrevented = true; }, ...event };
    handlers.get(type)?.(full);
    return full;
  };
  return { element: element as unknown as HTMLElement, handlers, fire, style: element.style };
}

function make(options: Parameters<typeof createPanZoomController>[0] = {}) {
  const changes: { view: PanZoomView; reason: PanZoomReason }[] = [];
  const controller = createPanZoomController({ ...options, onChange: (view, reason) => changes.push({ view: { ...view }, reason }) });
  const fake = fakeElement();
  const unbind = controller.bind(fake.element);
  return { controller, changes, unbind, ...fake };
}

test("zooming about a point keeps the content under that point", () => {
  const view = zoomAbout({ x: 30, y: -10, zoom: 2 }, 3, 80, 40, 0.1, 50);
  assert.equal(view.zoom, 6);
  // the content point under (80, 40) before: ((80 - 30) / 2, (40 + 10) / 2); after, at the same pixel
  assert.equal((80 - view.x) / view.zoom, (80 - 30) / 2);
  assert.equal((40 - view.y) / view.zoom, (40 + 10) / 2);
});

test("the zoom is held to the limits, and the sky's 0.6 to 60 is allowed", () => {
  const { controller } = make({ minZoom: 0.6, maxZoom: 60 });
  controller.zoomBy(1000);
  assert.equal(controller.view.zoom, 60);
  controller.zoomBy(1e-6);
  assert.equal(controller.view.zoom, 0.6);
  assert.equal(zoomAbout({ x: 0, y: 0, zoom: 60 }, 2, 0, 0, 0.6, 60).x, 0);
});

test("one finger drags the content both ways, and the page's scrolling is turned off", () => {
  const { changes, fire, style, unbind } = make();
  assert.equal(style.touchAction, "none");
  fire("pointerdown", { pointerId: 1, pointerType: "touch", button: 0, clientX: 300, clientY: 150 });
  fire("pointermove", { pointerId: 1, clientX: 320, clientY: 135 });
  fire("pointermove", { pointerId: 1, clientX: 330, clientY: 160 });
  assert.deepEqual(changes.map((c) => [c.reason, c.view.x, c.view.y, c.view.zoom]), [["drag", 20, -15, 1], ["drag", 30, 10, 1]]);
  fire("pointerup", { pointerId: 1 });
  fire("pointermove", { pointerId: 1, clientX: 400, clientY: 400 });
  assert.equal(changes.length, 2);
  unbind();
  assert.equal(style.touchAction, "auto");
});

test("two fingers zoom about their middle", () => {
  const { controller, fire } = make();
  fire("pointerdown", { pointerId: 1, pointerType: "touch", button: 0, clientX: 250, clientY: 150 });
  fire("pointerdown", { pointerId: 2, pointerType: "touch", button: 0, clientX: 350, clientY: 150 });
  // the fingers start 100 apart round the element's middle (300, 150) and spread to 200 apart round the same point
  fire("pointermove", { pointerId: 1, clientX: 200, clientY: 150 });
  fire("pointermove", { pointerId: 2, clientX: 400, clientY: 150 });
  const { x, y, zoom } = controller.view;
  assert.ok(Math.abs(zoom - 2) < 1e-9, `zoom ${zoom}`);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9);
});

test("the wheel zooms about the pointer, in and out the same distance", () => {
  const { controller, fire } = make();
  const first = fire("wheel", { deltaY: -100, deltaMode: 0, clientX: 400, clientY: 150, ctrlKey: false, metaKey: false });
  assert.equal(first.defaultPrevented, true);
  assert.ok(controller.view.zoom > 1.2);
  assert.ok(controller.view.x < 0, "the point right of the middle stays under the pointer, so the content moves left");
  fire("wheel", { deltaY: 100, deltaMode: 0, clientX: 400, clientY: 150 });
  assert.ok(Math.abs(controller.view.zoom - 1) < 1e-9);
  assert.ok(Math.abs(wheelFactor(100) * wheelFactor(-100) - 1) < 1e-12);
});

test("in modifier mode the plain wheel is left to the page and Ctrl zooms", () => {
  const { controller, changes, fire } = make({ wheel: "modifier" });
  const plain = fire("wheel", { deltaY: -100, clientX: 300, clientY: 150, ctrlKey: false, metaKey: false });
  assert.equal(plain.defaultPrevented, false);
  assert.equal(changes.length, 0);
  fire("wheel", { deltaY: -100, clientX: 300, clientY: 150, ctrlKey: true, metaKey: false });
  assert.ok(controller.view.zoom > 1);
  const off = make({ wheel: "none" });
  off.fire("wheel", { deltaY: -100, clientX: 300, clientY: 150, ctrlKey: true, metaKey: false });
  assert.equal(off.changes.length, 0);
});

test("arrow keys pan, plus and minus zoom, Home goes back, and a modified key is left alone", () => {
  const { controller, fire } = make({ home: { zoom: 2 } });
  assert.equal(controller.view.zoom, 2);
  fire("keydown", { key: "ArrowRight" });
  assert.deepEqual([controller.view.x, controller.view.y], [-20, 0]);
  fire("keydown", { key: "ArrowDown" });
  assert.deepEqual([controller.view.x, controller.view.y], [-20, -20]);
  fire("keydown", { key: "+" });
  assert.equal(controller.view.zoom, 2.5);
  fire("keydown", { key: "-" });
  assert.equal(controller.view.zoom, 2);
  const kept = fire("keydown", { key: "ArrowLeft", ctrlKey: true });
  assert.equal(kept.defaultPrevented, false);
  assert.deepEqual([controller.view.x, controller.view.y], [-20, -20]);
  const home = fire("keydown", { key: "Home" });
  assert.equal(home.defaultPrevented, true);
  assert.deepEqual(controller.view, { x: 0, y: 0, zoom: 2 });
});

test("a right-button press does not drag, and an unbound element stops listening", () => {
  const { changes, handlers, fire, unbind } = make();
  fire("pointerdown", { pointerId: 1, pointerType: "mouse", button: 2, clientX: 300, clientY: 150 });
  fire("pointermove", { pointerId: 1, clientX: 320, clientY: 150 });
  assert.equal(changes.length, 0);
  unbind();
  assert.equal(handlers.size, 0);
});

test("set, panBy and reset say 'api' and say nothing when nothing changed", () => {
  const { controller, changes } = make();
  controller.panBy(5, 6);
  controller.set({ zoom: 3 });
  controller.set({ zoom: 3 });
  controller.reset();
  assert.deepEqual(changes.map((c) => c.reason), ["api", "api", "api"]);
  assert.deepEqual(controller.view, { x: 0, y: 0, zoom: 1 });
});
