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

test("the pace is kept in the address as its number, and 1 leaves it", () => {
  assert.equal(formatAddress("", { ...plain, pace: 2 }), "?pace=2");
  assert.equal(formatAddress("?pace=2", { ...plain, pace: 1 }), "");
  assert.equal(formatAddress("", { ...plain, pace: 0.5 }, parseKeys("speed:turn")), "?turn=0.5");
  assert.deepEqual(parseAddress("?pace=0.5&zoom=2"), { pace: 0.5, zoom: 2 });
  assert.deepEqual(parseAddress("?turn=4", parseKeys("speed:turn")), { pace: 4 });
});

test("the words of 0.12 and 0.13 in an address still mean 0.5, 1 and 2", () => {
  assert.deepEqual(parseAddress("?pace=slow"), { pace: 0.5 });
  assert.deepEqual(parseAddress("?pace=fast"), { pace: 2 });
  assert.deepEqual(parseAddress("?pace=medium"), { pace: 1 });
});

test("a page's own speed parameter is never read or written by the pace", () => {
  assert.equal(formatAddress("?speed=5", { ...plain, pace: 2 }), "?speed=5&pace=2");
  assert.equal(formatAddress("?speed=5", plain), "?speed=5");
  assert.deepEqual(parseAddress("?speed=5"), {});
  assert.deepEqual(parseAddress("?pace=nonsense"), {});
});

test("every new label is in both languages", () => {
  for (const key of ["zoomLevel", "zoomReset", "more", "speed", "slow", "medium", "fast"] as const) {
    assert.ok(WORDS.en[key] !== "" && WORDS.ja[key] !== "", key);
  }
});
