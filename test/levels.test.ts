import assert from "node:assert/strict";
import { test } from "node:test";

import { formatAddress, parseAddress, parseKeys, type AddressChoices } from "../src/view-controls/address.ts";
import { PACE_FACTOR, PACES, parseLevel, parsePace, zoomText } from "../src/view-controls/levels.ts";
import { WORDS } from "../src/view-controls/words.ts";

const plain: AddressChoices = { yaw: 0, tilt: 0, zoom: 1, drag: "move" };

test("the zoom readout shows one decimal at most", () => {
  assert.deepEqual([1, 1.4, 2.4, 1.96, 5, 1.04].map(zoomText), ["1×", "1.4×", "2.4×", "2×", "5×", "1×"]);
});

test("below 1 the readout keeps two figures, so a small zoom never reads as nothing", () => {
  assert.deepEqual([0.5, 0.25, 0.04, 0.123].map(zoomText), ["0.5×", "0.25×", "0.04×", "0.12×"]);
});

test("a level or a pace is one of its words, else nothing", () => {
  assert.equal(parseLevel("advanced"), "advanced");
  assert.equal(parseLevel("basic"), "basic");
  assert.equal(parseLevel("Advanced"), undefined);
  assert.equal(parseLevel(null), undefined);
  assert.deepEqual(PACES.map(parsePace), ["slow", "medium", "fast"]);
  assert.equal(parsePace("30"), undefined);
  assert.deepEqual(PACES.map((p) => PACE_FACTOR[p]), [0.5, 1, 2]);
});

test("the speed is kept in the address as slow or fast, and Medium leaves it", () => {
  assert.equal(formatAddress("", { ...plain, pace: "fast" }), "?speed=fast");
  assert.equal(formatAddress("?speed=fast", { ...plain, pace: "medium" }), "");
  assert.equal(formatAddress("", { ...plain, pace: "slow" }, parseKeys("speed:pace")), "?pace=slow");
  assert.deepEqual(parseAddress("?speed=slow&zoom=2"), { pace: "slow", zoom: 2 });
  assert.deepEqual(parseAddress("?pace=fast", parseKeys("speed:pace")), { pace: "fast" });
});

test("a page's own speed parameter is left alone unless a pace word is chosen", () => {
  assert.equal(formatAddress("?speed=5", { ...plain, pace: "medium" }), "?speed=5");
  assert.equal(formatAddress("?speed=5", plain), "?speed=5");
  assert.deepEqual(parseAddress("?speed=5"), {});
  assert.equal(formatAddress("?speed=5", { ...plain, pace: "fast" }), "?speed=fast");
});

test("every new label is in both languages", () => {
  for (const key of ["zoomLevel", "zoomReset", "more", "speed", "slow", "medium", "fast"] as const) {
    assert.ok(WORDS.en[key] !== "" && WORDS.ja[key] !== "", key);
  }
});
