import assert from "node:assert/strict";
import { test } from "node:test";

import { BODY_LABEL_HEIGHTS, BODY_LABEL_MAX_LATITUDE, bodyLabelFacing, bodyLabelLayout } from "../src/body-label/index.ts";

const close = (a: number, b: number, within = 1e-9): void => assert.ok(Math.abs(a - b) <= within, `${a} is not ${b}`);

test("once: one copy at the longitude asked, the medium height, on the equator with no stretch", () => {
  const layout = bodyLabelLayout({ widthEm: 4, longitude: 30 });
  assert.equal(layout.spans.length, 1);
  assert.equal(layout.spans[0]!.centre, 30);
  assert.equal(layout.height, BODY_LABEL_HEIGHTS.medium);
  assert.equal(layout.latitude, 0);
  close(layout.stretch, 1);
  // four ems of a 14-degree letter: 56 degrees of longitude
  close(layout.spans[0]!.width, 56);
});

test("both: two copies on opposite sides; around: as many as fit with a gap, evenly spaced", () => {
  const both = bodyLabelLayout({ widthEm: 4, repeat: "both", longitude: 350 });
  assert.deepEqual(both.spans.map((span) => span.centre), [350, 170]);
  const around = bodyLabelLayout({ widthEm: 4, repeat: "around" });
  // each copy is 56 degrees and a gap of 1.5 ems is 21: 360 / 77 = 4 copies
  assert.equal(around.spans.length, 4);
  assert.deepEqual(around.spans.map((span) => span.centre), [0, 90, 180, 270]);
  for (const span of around.spans) assert.ok(span.width + 21 <= 90 + 1e-9);
});

test("off the equator the text is stretched by 1 / cos(latitude), so a letter keeps its shape on the shorter circle", () => {
  const layout = bodyLabelLayout({ widthEm: 2, latitude: 60 });
  close(layout.stretch, 2, 1e-12);
  close(layout.spans[0]!.width, 2 * 14 * 2, 1e-9);
  const south = bodyLabelLayout({ widthEm: 2, latitude: -60 });
  close(south.stretch, 2, 1e-12);
  assert.equal(south.latitude, -60);
});

test("the band is kept within 70 degrees of the equator, and bad numbers fall back", () => {
  assert.equal(bodyLabelLayout({ widthEm: 2, latitude: 89 }).latitude, BODY_LABEL_MAX_LATITUDE);
  assert.equal(bodyLabelLayout({ widthEm: 2, latitude: -120 }).latitude, -BODY_LABEL_MAX_LATITUDE);
  const odd = bodyLabelLayout({ widthEm: Number.NaN, latitude: Number.NaN, longitude: Number.POSITIVE_INFINITY });
  assert.equal(odd.latitude, 0);
  assert.equal(odd.spans.length, 0);
});

test("a name too long for its share of the circle is made smaller until it fits, and copies never meet", () => {
  const once = bodyLabelLayout({ widthEm: 40, size: "large" });
  assert.ok(once.height < BODY_LABEL_HEIGHTS.large);
  close(once.spans[0]!.width, 360, 1e-9);
  const both = bodyLabelLayout({ widthEm: 30, repeat: "both" });
  assert.ok(both.spans[0]!.width + 1.5 * both.height <= 180 + 1e-9);
  const around = bodyLabelLayout({ widthEm: 30, repeat: "around" });
  assert.equal(around.spans.length, 1);
});

test("facing: the turn that brings the name's middle round to the camera, in the globe's own frame", () => {
  // three's sphere: longitude 0 is +x and east runs towards -z
  close(bodyLabelFacing(5, 0, 0), 0);
  close(bodyLabelFacing(0, -5, 0), Math.PI / 2);
  close(bodyLabelFacing(0, 5, 0), -Math.PI / 2);
  // straight behind: a half turn either way
  close(Math.abs(bodyLabelFacing(-5, 0, 0)), Math.PI);
  // a name centred at 90 east, the camera at +x: turn it back a quarter
  close(bodyLabelFacing(5, 0, 90), -Math.PI / 2);
  // always within a half turn
  for (let degrees = -720; degrees <= 720; degrees += 37) {
    const turn = bodyLabelFacing(Math.cos((degrees * Math.PI) / 180), -Math.sin((degrees * Math.PI) / 180), 10);
    assert.ok(turn >= -Math.PI - 1e-9 && turn <= Math.PI + 1e-9);
  }
});
