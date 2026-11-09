import assert from "node:assert/strict";
import { test } from "node:test";

import { type AddressChoices, formatAddress, parseAddress, parseKeys } from "../src/view-controls/address.ts";

const plain: AddressChoices = { yaw: 0, tilt: 0, zoom: 1, drag: "move" };

test("a view at its starting values keeps the address plain", () => {
  assert.equal(formatAddress("", plain), "");
  assert.equal(formatAddress("?a=1", plain), "?a=1");
});

test("the choices round-trip through the address", () => {
  for (const choices of [{ yaw: 40, tilt: -12, zoom: 2.5, drag: "turn" }, { yaw: -170, tilt: 30, zoom: 5, drag: "move" }, { yaw: 1, tilt: 0, zoom: 1.25, drag: "move" }] as AddressChoices[]) {
    const search = formatAddress("", choices);
    assert.deepEqual({ ...plain, ...parseAddress(search) }, choices);
  }
});

test("other parameters are kept and a choice back at its start leaves the address", () => {
  const first = formatAddress("?colour=blue&yaw=40", { ...plain, yaw: 40, zoom: 2 });
  assert.equal(first, "?colour=blue&yaw=40&zoom=2");
  assert.equal(formatAddress(first, plain), "?colour=blue");
});

test("while it turns by itself the angle is left as it was", () => {
  assert.equal(formatAddress("?yaw=12", { ...plain, yaw: 99, zoom: 2 }, undefined, true), "?yaw=12&zoom=2");
});

test("keys are configurable", () => {
  const keys = parseKeys("yaw:a, zoom:z,bogus:x,tilt:");
  assert.deepEqual(keys, { yaw: "a", tilt: "tilt", zoom: "z", drag: "drag", speed: "pace", direction: "direction", roll: "roll", axis: "axis", tiltDirection: "tiltDirection", rollDirection: "rollDirection" });
  const search = formatAddress("", { yaw: 30, tilt: 5, zoom: 2, drag: "turn" }, keys);
  assert.equal(search, "?a=30&tilt=5&z=2&drag=turn");
  assert.deepEqual(parseAddress(search, keys), { yaw: 30, tilt: 5, zoom: 2, drag: "turn" });
});

test("a bad or out-of-range value is dropped or held to its limit", () => {
  assert.deepEqual(parseAddress("?yaw=abc&tilt=&zoom=nope&drag=sideways"), {});
  assert.deepEqual(parseAddress("?tilt=99&zoom=99&yaw=190"), { tilt: 30, zoom: 50, yaw: -170 });
  assert.deepEqual(parseAddress("yaw=5"), { yaw: 5 });
  assert.deepEqual(parseAddress("?zoom=0"), { zoom: 0.1 });
});

test("a zoom at the page's own start leaves the address, and Fit is then written", () => {
  assert.equal(formatAddress("", { ...plain, zoom: 2.5 }, undefined, false, 2.5), "");
  assert.equal(formatAddress("", { ...plain, zoom: 1 }, undefined, false, 2.5), "?zoom=1");
});
