import assert from "node:assert/strict";
import { test } from "node:test";

import { carryControls } from "../src/view-controls/carry.ts";
import type { Clock } from "../src/view-controls/controller.ts";
import { DEFAULT_LIMITS } from "../src/view-controls/math.ts";

const clock: Clock = { request: () => 1, cancel: () => undefined };

/** An element the test can read and change attributes on: just what `carryControls` and `bind` touch. */
function fakeElement(attrs: Record<string, string> = {}, display = "block") {
  const listeners = new Map<string, (e: unknown) => void>();
  const style: Record<string, string> = { touchAction: "" };
  const element = {
    style: Object.assign(style, { removeProperty: (name: string) => { delete style[name]; } }),
    dataset: {} as Record<string, string>,
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
    removeAttribute: (name: string) => { delete attrs[name]; },
    set tabIndex(value: number) { attrs.tabindex = String(value); },
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
    setPointerCapture: () => undefined,
    contains: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display }), setTimeout: () => 0, clearTimeout: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, innerHeight: 800, innerWidth: 1000 }, addEventListener: () => undefined, removeEventListener: () => undefined },
  };
  const events: CustomEvent[] = [];
  (element as Record<string, unknown>).dispatchEvent = (event: CustomEvent) => events.push(event);
  const wheel = (init: object): boolean => { let stopped = false; listeners.get("wheel")?.({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, deltaX: 0, deltaY: 0, deltaMode: 0, clientX: 200, clientY: 150, timeStamp: 1000, preventDefault: () => { stopped = true; }, ...init }); return stopped; };
  const key = (k: string): void => listeners.get("keydown")?.({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: () => undefined });
  /** What a bar does when it binds or lets go: the mark first, then the event. */
  const bar = (on: boolean): void => { if (on) attrs["data-kazoku-bar"] = ""; else delete attrs["data-kazoku-bar"]; listeners.get("kazoku-viewbar")?.({}); };
  return { element: element as unknown as HTMLElement, attrs, listeners, style, events, wheel, key, bar };
}

const carry = (rig: ReturnType<typeof fakeElement>, extra: object = {}) => carryControls(rig.element, { clock, onChange: () => undefined, ...extra });

test("with no attributes it takes the hands, gets a tabindex, and runs from a tenth of Fit to fifty times it", () => {
  const rig = fakeElement();
  const { controller, unbind } = carry(rig);
  assert.ok(rig.listeners.has("pointerdown") && rig.listeners.has("wheel") && rig.listeners.has("keydown"));
  assert.equal(rig.attrs.tabindex, "0");
  assert.equal(rig.style.touchAction, "pan-y");
  assert.deepEqual({ ...controller.limits }, DEFAULT_LIMITS);
  controller.zoomAt(1000);
  assert.equal(controller.state.zoom, 50);
  controller.zoomAt(0.001);
  assert.equal(controller.state.zoom, 0.1);
  unbind();
});

test("the zoom-min and zoom-max attributes win over the package's limits, which win over the defaults", () => {
  const own = fakeElement();
  const a = carry(own, { limits: { zoomMin: 0.5, zoomMax: 20 } });
  assert.deepEqual([a.controller.limits.zoomMin, a.controller.limits.zoomMax], [0.5, 20]);
  a.unbind();
  const set = fakeElement({ "zoom-min": "0.25", "zoom-max": "8" });
  const b = carry(set, { limits: { zoomMin: 0.5, zoomMax: 20 } });
  assert.deepEqual([b.controller.limits.zoomMin, b.controller.limits.zoomMax], [0.25, 8]);
  b.controller.zoomAt(100);
  assert.equal(b.controller.state.zoom, 8);
  b.unbind();
});

test("the zoom starts where the package says, inside the limits", () => {
  const rig = fakeElement({ "zoom-max": "4" });
  const { controller, unbind } = carry(rig, { zoom: 10 });
  assert.equal(controller.state.zoom, 4);
  unbind();
});

test("controls=\"none\" takes no hands, on=false is the same until controls is given, and a given tabindex is kept", () => {
  const none = fakeElement({ controls: "none" });
  const a = carry(none);
  assert.equal(none.listeners.has("pointerdown"), false);
  assert.equal(none.attrs.tabindex, undefined);
  a.unbind();
  const off = fakeElement();
  const b = carry(off, { on: false });
  assert.equal(off.listeners.has("wheel"), false);
  b.unbind();
  const asked = fakeElement({ controls: "" });
  const c = carry(asked, { on: false });
  assert.equal(asked.listeners.has("wheel"), true, "an attribute that is there asks for them");
  c.unbind();
  const tabbed = fakeElement({ tabindex: "-1" });
  const d = carry(tabbed);
  assert.equal(tabbed.attrs.tabindex, "-1");
  d.unbind();
  assert.equal(tabbed.attrs.tabindex, "-1");
});

test("the wheel: at Fit the plain wheel is the page's, Ctrl and the wheel is the view's, and the keys zoom", () => {
  const rig = fakeElement();
  const seen: string[] = [];
  const { controller, unbind } = carry(rig, { onChange: (_state: unknown, info: { reason: string }) => seen.push(info.reason) });
  assert.equal(rig.wheel({ deltaY: 100 }), false, "nothing to move at Fit, so the page scrolls");
  assert.equal(controller.state.zoom, 1);
  assert.equal(rig.wheel({ deltaY: -100, ctrlKey: true }), true);
  assert.ok(controller.state.zoom > 1);
  rig.key("0");
  assert.equal(controller.state.zoom, 1);
  rig.key("+");
  assert.ok(controller.state.zoom > 1);
  assert.ok(seen.includes("zoom"));
  unbind();
});

test("an inline element becomes a block while it carries the hands, and goes back after", () => {
  const rig = fakeElement({}, "inline");
  const { unbind } = carry(rig);
  assert.equal(rig.style.display, "block");
  unbind();
  assert.equal(rig.style.display, undefined);
  const block = fakeElement({}, "block");
  carry(block).unbind();
  assert.equal(block.style.display, undefined);
});

test("a bar for the element takes the hands over while it is there, and gives them back", () => {
  const rig = fakeElement();
  const { unbind } = carry(rig);
  assert.ok(rig.listeners.has("wheel"));
  rig.bar(true);
  assert.equal(rig.listeners.has("wheel"), false, "the element's own hands stand down");
  assert.equal(rig.attrs.tabindex, "0", "the focus stays for the bar's keys");
  rig.bar(false);
  assert.ok(rig.listeners.has("wheel"));
  unbind();
  const barred = fakeElement({ "data-kazoku-bar": "" });
  carry(barred).unbind();
  assert.equal(barred.listeners.has("wheel"), false, "a bar that was there first is respected");
  assert.equal(barred.attrs.tabindex, undefined, "and it is unbound again with the element");
});

test("a bar bound before the element starts still gets a tabindex and a block, and a given tabindex is kept", () => {
  const first = fakeElement({ "data-kazoku-bar": "" }, "inline");
  const { unbind } = carry(first);
  assert.equal(first.listeners.has("wheel"), false, "the bar's hands, not the element's");
  assert.equal(first.attrs.tabindex, "0");
  assert.equal(first.style.display, "block");
  unbind();
  assert.equal(first.attrs.tabindex, undefined);
  assert.equal(first.style.display, undefined);
  const tabbed = fakeElement({ "data-kazoku-bar": "", tabindex: "-1" });
  carry(tabbed).unbind();
  assert.equal(tabbed.attrs.tabindex, "-1");
  const none = fakeElement({ "data-kazoku-bar": "", controls: "none" });
  carry(none).unbind();
  assert.equal(none.attrs.tabindex, undefined, "controls=none gives nothing");
});

test("setLimits changes the package's limits after setup, the attributes still win, and a zoom outside is moved in", () => {
  const rig = fakeElement();
  const { controller, setLimits, unbind } = carry(rig, { limits: { zoomMin: 0.5, zoomMax: 6 } });
  controller.zoomAt(100);
  assert.equal(controller.state.zoom, 6);
  setLimits({ zoomMax: 20 });
  assert.deepEqual([controller.limits.zoomMin, controller.limits.zoomMax], [0.5, 20]);
  controller.zoomAt(100);
  assert.equal(controller.state.zoom, 20);
  setLimits({ zoomMax: 4 });
  assert.equal(controller.state.zoom, 4, "a zoom outside the new limits is moved inside them");
  setLimits({ zoomMin: 0.25 });
  controller.zoomAt(0.001);
  assert.equal(controller.state.zoom, 0.25);
  rig.attrs["zoom-max"] = "3";
  setLimits({ zoomMax: 50 });
  assert.equal(controller.limits.zoomMax, 3, "the element's own attribute wins");
  assert.equal(controller.limits.zoomMin, 0.25, "a limit not named stays");
  unbind();
});

test("setLimits tells a bound bar the new limits", () => {
  const rig = fakeElement();
  const { setLimits, unbind } = carry(rig, { limits: { zoomMax: 5 } });
  rig.bar(true);
  setLimits({ zoomMin: 1, zoomMax: 20 });
  const said = rig.events.filter((e) => e.type === "kazoku-viewcarry").map((e) => e.detail.limits);
  assert.deepEqual(said.at(-1), { ...DEFAULT_LIMITS, zoomMin: 1, zoomMax: 20 });
  unbind();
});

test("while a bar is bound the element says its limits: its attributes over the package's, and the defaults under both", () => {
  const said = (rig: ReturnType<typeof fakeElement>) => rig.events.filter((e) => e.type === "kazoku-viewcarry").map((e) => e.detail.limits);
  const coded = fakeElement();
  const a = carry(coded, { limits: { zoomMin: 1e-6, zoomMax: 2.5 } });
  assert.deepEqual(said(coded), [], "no bar, nothing said");
  coded.bar(true);
  assert.deepEqual(said(coded).at(-1), { ...DEFAULT_LIMITS, zoomMin: 1e-6, zoomMax: 2.5 });
  coded.attrs["zoom-max"] = "8";
  coded.listeners.get("kazoku-viewbar")?.({});
  assert.equal(said(coded).at(-1)?.zoomMax, 8);
  a.unbind();
  const first = fakeElement({ "data-kazoku-bar": "" });
  carry(first).unbind();
  assert.deepEqual(said(first), [DEFAULT_LIMITS], "a bar that was there first hears it when the element starts");
});

test("immersive comes from the option or the attribute, and a later limit change does not wipe a value set by hand", () => {
  const fromOption = fakeElement();
  const opted = carry(fromOption, { immersive: true });
  assert.equal(opted.controller.immersive, true);
  opted.unbind();
  const fromAttr = fakeElement({ immersive: "" });
  const marked = carry(fromAttr);
  assert.equal(marked.controller.immersive, true);
  marked.unbind();
  const plain = fakeElement();
  const hands = carry(plain);
  assert.equal(hands.controller.immersive, false);
  hands.controller.immersive = true;
  hands.setLimits({ zoomMax: 10 });
  assert.equal(hands.controller.immersive, true, "zoom-max does not reset a hand-set immersive");
  hands.unbind();
});

test("double-press=\"off\" and doublePress: false leave a double press off, and a limit change keeps a hand-set value", () => {
  const off = fakeElement({ "double-press": "off" });
  const a = carry(off);
  assert.equal(a.controller.doublePress, false);
  a.unbind();
  const asked = fakeElement();
  const b = carry(asked, { doublePress: false });
  assert.equal(b.controller.doublePress, false);
  b.controller.doublePress = true;
  b.setLimits({ zoomMin: 0.5 });
  assert.equal(b.controller.doublePress, true, "a limit change does not reset a hand-set doublePress");
  b.unbind();
  const on = fakeElement({ "double-press": "" });
  const c = carry(on, { doublePress: false });
  assert.equal(c.controller.doublePress, true, "an attribute that is there, and not off, asks for it");
  c.unbind();
});

test("a bound bar is told whether the element is immersive", () => {
  const said = (rig: ReturnType<typeof fakeElement>) => rig.events.filter((e) => e.type === "kazoku-viewcarry").map((e) => e.detail.immersive);
  const plain = fakeElement();
  const a = carry(plain);
  plain.bar(true);
  assert.equal(said(plain).at(-1), false);
  a.unbind();
  const full = fakeElement({ immersive: "", "data-kazoku-bar": "" });
  carry(full).unbind();
  assert.deepEqual(said(full), [true], "a bar that was there first hears it when the element starts");
  const opted = fakeElement();
  const c = carry(opted, { immersive: true });
  opted.bar(true);
  assert.equal(said(opted).at(-1), true);
  c.unbind();
});

test("show writes the view the element is already showing and does not call onChange; a bound bar is told", () => {
  const rig = fakeElement();
  const seen: number[] = [];
  const hands = carry(rig, { onChange: (state: { yaw: number }) => seen.push(state.yaw) });
  hands.show({ yaw: 40, tilt: 12, zoom: 2 });
  assert.equal(hands.controller.state.yaw, 40);
  assert.equal(hands.controller.state.tilt, 12);
  assert.equal(hands.controller.state.zoom, 2);
  assert.deepEqual(seen, []);
  assert.equal(rig.events.some((event) => event.type === "kazoku-viewshow"), false);
  rig.bar(true);
  hands.show({ yaw: 15, tilt: -8, zoom: 1.5 });
  const told = rig.events.filter((event) => event.type === "kazoku-viewshow");
  assert.equal(told.length, 1);
  assert.deepEqual(told[0]?.detail, { yaw: 15, tilt: -8, zoom: 1.5 });
  assert.equal(hands.controller.state.yaw, 15);
  assert.deepEqual(seen, []);
  hands.unbind();
});

test("unbind lets every hand go, takes back what it gave, and the controller is done", () => {
  const rig = fakeElement();
  const { controller, unbind } = carry(rig);
  unbind();
  assert.equal(rig.listeners.has("pointerdown"), false);
  assert.equal(rig.listeners.has("kazoku-viewbar"), false);
  assert.equal(rig.attrs.tabindex, undefined);
  assert.equal(rig.style.touchAction, "");
  controller.play();
  assert.equal(controller.state.turning, false);
});
