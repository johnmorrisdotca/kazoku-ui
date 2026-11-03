import assert from "node:assert/strict";
import { test } from "node:test";

import { between, clamp, clampPan, type Camera, degreesPerPixel, dragTurn, pinchTo, wheelZoomFactor, wrapYaw, zoomAbout } from "../src/view-controls/math.ts";

const start: Camera = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };

test("an angle wraps into [-180, 180)", () => {
  assert.equal(wrapYaw(0), 0);
  assert.equal(wrapYaw(180), -180);
  assert.equal(wrapYaw(-180), -180);
  assert.equal(wrapYaw(190), -170);
  assert.equal(wrapYaw(-190), 170);
  assert.equal(wrapYaw(725), 5);
  assert.equal(wrapYaw(-725), -5);
  assert.equal(clamp(9, 0, 5), 5);
});

test("zoom about a point keeps the point under the pointer", () => {
  const at = { x: 80, y: -40 };
  const a = zoomAbout(start, 2, at);
  // The point at `at` before is at (at - pan) / zoom in the picture; after it must be the same picture point.
  const before = { x: (at.x - start.panX) / start.zoom, y: (at.y - start.panY) / start.zoom };
  const after = { x: (at.x - a.panX) / a.zoom, y: (at.y - a.panY) / a.zoom };
  assert.deepEqual(after, before);
  // And again from a panned, zoomed camera.
  const b = zoomAbout({ ...a, panX: 12, panY: -7 }, 3.5, { x: -30, y: 60 });
  const p1 = { x: (-30 - 12) / 2, y: (60 + 7) / 2 };
  const p2 = { x: (-30 - b.panX) / b.zoom, y: (60 - b.panY) / b.zoom };
  assert.ok(Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(p1.y - p2.y) < 1e-9);
});

test("zoom is held to its limits and returns to the middle at 1x", () => {
  assert.equal(zoomAbout(start, 99, { x: 0, y: 0 }).zoom, 5);
  const z = zoomAbout({ ...start, zoom: 2, panX: 40, panY: 40 }, 1, { x: 10, y: 10 });
  assert.deepEqual([z.zoom, z.panX, z.panY], [1, 0, 0]);
  assert.equal(zoomAbout(start, 0.1, { x: 0, y: 0 }, { tiltMax: 30, zoomMin: 0.5, zoomMax: 5 }).zoom, 0.5);
});

test("the pan is held so the picture still covers the view", () => {
  const held = clampPan({ ...start, zoom: 2, panX: 900, panY: -900 }, { width: 400, height: 300 });
  assert.deepEqual([held.panX, held.panY], [200, -150]);
  assert.deepEqual([clampPan({ ...start, panX: 50 }, { width: 400, height: 300 }).panX], [0]);
  // With no size known the pan is left alone.
  assert.equal(clampPan({ ...start, zoom: 2, panX: 900 }, undefined).panX, 900);
});

test("a pinch zooms by the change of distance about where it began, and the fingers' middle drags", () => {
  const centre = { x: 200, y: 150 };
  const begin = { distance: 100, middle: { x: 260, y: 150 }, camera: start };
  const spread = pinchTo(begin, { x: 210, y: 150 }, { x: 310, y: 150 }, centre);
  assert.equal(spread.zoom, 1);
  const wider = pinchTo(begin, { x: 160, y: 150 }, { x: 360, y: 150 }, centre);
  assert.equal(wider.zoom, 2);
  // The middle did not move, so the point under it stays: picture point (260 - 200 - 0) / 1 = 60 is at 260 - 200 = 60 from the middle after.
  assert.ok(Math.abs((60 - wider.panX) / wider.zoom - 60) < 1e-9);
  // Both fingers slide 30 px right with the distance unchanged: only a pan, and only once zoomed.
  const zoomedStart = { distance: 100, middle: { x: 260, y: 150 }, camera: { ...start, zoom: 2 } };
  const slid = pinchTo(zoomedStart, { x: 240, y: 150 }, { x: 340, y: 150 }, centre);
  assert.equal(slid.zoom, 2);
  assert.equal(slid.panX, 30);
  assert.ok(pinchTo(begin, { x: 300, y: 150 }, { x: 300, y: 150 }, centre).zoom >= 1);
});

test("a drag across the view is a half turn, and a finger does not tilt", () => {
  const size = { width: 400, height: 300 };
  assert.deepEqual(dragTurn(start, 400, 0, size, true), { yaw: -180, tilt: 0 });
  assert.equal(dragTurn(start, 200, 0, size, true).yaw, 90);
  assert.equal(dragTurn(start, 100, 0, size, true).yaw, 45);
  assert.equal(dragTurn({ ...start, yaw: 170 }, 40, 0, size, true).yaw, wrapYaw(170 + 18));
  // Up lifts (positive tilt), down lowers, both held to the limit.
  assert.equal(dragTurn(start, 0, -75, size, true).tilt, 15);
  assert.equal(dragTurn(start, 0, -300, size, true).tilt, 30);
  assert.equal(dragTurn(start, 0, 300, size, true).tilt, -30);
  assert.equal(dragTurn({ ...start, tilt: 12 }, 0, -75, size, false).tilt, 12);
});

test("a Ctrl wheel zooms in on a turn up and out on a turn down", () => {
  assert.ok(wheelZoomFactor(-100, 0) > 1);
  assert.ok(wheelZoomFactor(100, 0) < 1);
  assert.ok(wheelZoomFactor(-3, 1) > 1);
  assert.equal(wheelZoomFactor(0, 0), 1);
  // A plain wheel's notch (about 100 pixels) zooms about 1.2 times; a pinch's small steps zoom faster per pixel.
  assert.ok(wheelZoomFactor(-100, 0, "wheel") > 1.15 && wheelZoomFactor(-100, 0, "wheel") < 1.3);
  assert.ok(Math.abs(wheelZoomFactor(-100, 0, "wheel") * wheelZoomFactor(100, 0, "wheel") - 1) < 1e-12, "up then down comes back");
  assert.equal(wheelZoomFactor(-1e6, 0, "wheel"), 2);
  assert.equal(wheelZoomFactor(1e6, 0, "wheel"), 0.5);
  assert.ok(wheelZoomFactor(-1, 2, "wheel") > 1, "a page step zooms in too");
});

test("dragTurn rounds the tilt to a step and still holds the limits", () => {
  const start: Camera = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };
  const size = { width: 400, height: 300 };
  assert.equal(dragTurn(start, 0, -17, size, true, undefined, 1).tilt, 3);
  assert.ok(Math.abs(dragTurn(start, 0, -17, size, true, undefined, 0).tilt - 3.4) < 1e-9);
  assert.equal(dragTurn(start, 0, -300, size, true, undefined, 7).tilt, 30);
  assert.equal(dragTurn(start, 0, -17, size, false, undefined, 1).tilt, 0);
});

test("an exact grab turns by the angle that carries the touched point by the pixels dragged, on both axes", () => {
  const size = { width: 400, height: 300 };
  // A globe 100 pixels in radius: one radian of turn is 100 pixels of a point at the middle of its face.
  assert.ok(Math.abs(degreesPerPixel(100) - 180 / Math.PI / 100) < 1e-12);
  assert.ok(Math.abs(dragTurn(start, 100, 0, size, true, undefined, 0, 100).yaw - 180 / Math.PI) < 1e-9);
  assert.ok(Math.abs(dragTurn(start, 0, -40, size, true, undefined, 0, 100).tilt - 0.4 * (180 / Math.PI)) < 1e-9);
  // The same drag turns a bigger piece less, and the same on both axes (the fixed angle gives 1.5 and 0.5 degrees a pixel on this view).
  assert.ok(dragTurn(start, 50, 0, size, true, undefined, 0, 200).yaw < dragTurn(start, 50, 0, size, true, undefined, 0, 100).yaw);
  const sideways = dragTurn(start, 10, 0, size, true, undefined, 0, 120).yaw;
  const upright = dragTurn(start, 0, -10, size, true, undefined, 0, 120).tilt;
  assert.ok(Math.abs(sideways - upright) < 1e-9);
  // Off (0, a negative or a number that is not one) it is the fixed angle across the view; a finger still does not tilt and the limits hold.
  for (const off of [0, -5, Number.NaN]) assert.equal(dragTurn(start, 100, 0, size, true, undefined, 0, off).yaw, 45);
  assert.equal(dragTurn({ ...start, tilt: 12 }, 0, -75, size, false, undefined, 0, 100).tilt, 12);
  assert.equal(dragTurn(start, 0, -1000, size, true, undefined, 0, 50).tilt, 30);
});

test("a pan keeps at least a quarter of a small object in view, and the picture covering the view still holds without one", () => {
  const size = { width: 400, height: 300 };
  const zoomed: Camera = { ...start, zoom: 2 };
  // As the picture (no object given): at 2x it may move half the view's size, so it still covers the view.
  assert.equal(clampPan({ ...zoomed, panX: 900, panY: -900 }, size).panX, 200);
  assert.equal(clampPan({ ...zoomed, panX: 900, panY: -900 }, size).panY, -150);
  // An object 100 by 80 at Fit is 200 by 160 at 2x; it may go until a quarter of it (50 by 40) is left in the view's edge.
  const object = { width: 100, height: 80 };
  const far = clampPan({ ...zoomed, panX: 5000, panY: -5000 }, size, object);
  assert.equal(far.panX, 200 + 50);
  assert.equal(far.panY, -(150 + 40));
  // The object spans pan +/- 100 about its middle, so at the limit its edge is 50 in from the view's: a quarter of its width is in view.
  assert.equal(far.panX - 100, 150);
  assert.equal(clampPan({ ...start, panX: 40 }, size, object).panX, 0, "at Fit nothing moves");
});

test("between eases from one camera to another and holds at the ends", () => {
  const from: Camera = { yaw: 90, tilt: 20, zoom: 3, panX: 100, panY: -50 };
  const to: Camera = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };
  assert.deepEqual(between(from, to, 0), from);
  assert.deepEqual(between(from, to, 1), to);
  assert.deepEqual(between(from, to, 2), to);
  const half = between(from, to, 0.5);
  assert.ok(half.yaw < 45 && half.yaw > 0, "quick at first: past the half way at the half time");
});
