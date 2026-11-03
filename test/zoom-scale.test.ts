import assert from "node:assert/strict";
import { test } from "node:test";

import { LAYOUTS, parseLayout } from "../src/view-controls/levels.ts";
import { zoomAtPosition, zoomMarks, zoomPosition, zoomSnap, zoomStep, zoomToMark } from "../src/view-controls/zoomScale.ts";

const zooms = (min: number, max: number): number[] => zoomMarks(min, max).map((mark) => mark.zoom);

test("a layout is one of its words, and anything else is classic", () => {
  assert.deepEqual(LAYOUTS.map(parseLayout), ["classic", "horizontal", "vertical", "compact"]);
  for (const other of [null, undefined, "", "Horizontal", "row", "grid"]) assert.equal(parseLayout(other), "classic");
});

test("the slider is logarithmic: a step of + or - is the same distance anywhere, and position and zoom are each other's inverse", () => {
  assert.equal(zoomPosition(1, 1, 5), 0);
  assert.equal(zoomPosition(5, 1, 5), 1);
  assert.ok(Math.abs(zoomPosition(2, 1, 4) - 0.5) < 1e-12);
  assert.ok(Math.abs(zoomPosition(1.4, 1, 5) - zoomPosition(1.96, 1, 5) + zoomPosition(1.4, 1, 5) - zoomPosition(1, 1, 5)) < 1e-12);
  for (const zoom of [0.5, 0.8, 1, 1.7, 3.3, 4]) assert.ok(Math.abs(zoomAtPosition(zoomPosition(zoom, 0.5, 4), 0.5, 4) - zoom) < 1e-9);
  assert.equal(zoomPosition(9, 1, 5), 1);
  assert.equal(zoomPosition(0.1, 1, 5), 0);
  assert.equal(zoomAtPosition(0, 1, 5), 1);
  assert.equal(zoomAtPosition(1, 1, 5), 5);
});

test("marks: both ends, then the common zooms inside that have room for a label", () => {
  assert.deepEqual(zooms(1, 5), [1, 2, 3, 5]);
  assert.deepEqual(zooms(0.5, 4), [0.5, 1, 2, 4]);
  assert.deepEqual(zooms(1, 10), [1, 2, 4, 10]);
  assert.deepEqual(zooms(0.25, 16), [0.25, 1, 4, 16]);
  assert.deepEqual(zooms(1, 2), [1, 2]);
  assert.deepEqual(zooms(1, 3), [1, 2, 3]);
  assert.deepEqual(zooms(1, 4.7), [1, 2, 3, 4.7]);
  assert.deepEqual(zooms(1, 1), []);
  const marks = zoomMarks(0.25, 16);
  for (let i = 1; i < marks.length; i += 1) assert.ok((marks[i]?.at ?? 0) - (marks[i - 1]?.at ?? 0) >= 0.18 - 1e-9, "no two labels touch");
  assert.deepEqual(marks.filter((mark) => mark.end).map((mark) => mark.at), [0, 1]);
});

test("Page Up and Page Down go to the next mark, else to the end", () => {
  const marks = zoomMarks(1, 5);
  assert.equal(zoomToMark(1, marks, 1, 1, 5), 2);
  assert.equal(zoomToMark(2, marks, 1, 1, 5), 3);
  assert.equal(zoomToMark(2.4, marks, 1, 1, 5), 3);
  assert.equal(zoomToMark(2.4, marks, -1, 1, 5), 2);
  assert.equal(zoomToMark(5, marks, 1, 1, 5), 5);
  assert.equal(zoomToMark(1, marks, -1, 1, 5), 1);
});

test("an arrow steps a little and stops on a mark it would pass", () => {
  const marks = zoomMarks(1, 5);
  assert.ok(Math.abs(zoomStep(1, marks, 1, 1, 5) - 1.1) < 1e-12);
  assert.equal(zoomStep(1.9, marks, 1, 1, 5), 2);
  assert.ok(Math.abs(zoomStep(2, marks, 1, 1, 5) - 2.2) < 1e-12);
  assert.equal(zoomStep(2.1, marks, -1, 1, 5), 2);
  assert.equal(zoomStep(4.8, marks, 1, 1, 5), 5);
  assert.equal(zoomStep(1.05, marks, -1, 1, 5), 1);
});

test("a drag that ends near a mark goes to it, and anywhere else stays", () => {
  const marks = zoomMarks(1, 5);
  const tolerance = 8 / 200;
  assert.equal(zoomSnap(2.05, marks, 1, 5, tolerance), 2);
  assert.equal(zoomSnap(1.95, marks, 1, 5, tolerance), 2);
  assert.equal(zoomSnap(2.5, marks, 1, 5, tolerance), 2.5);
  assert.equal(zoomSnap(2.05, marks, 1, 5, 0), 2.05);
});
