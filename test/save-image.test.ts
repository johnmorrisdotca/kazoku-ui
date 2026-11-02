import assert from "node:assert/strict";
import { test } from "node:test";

import { filenameFor, formatsFor, MAX_PIXELS, MAX_SIDE, parseFormats, pixelSize } from "../src/save-image/format.ts";
import { WORDS, languageOf, wordsFor } from "../src/save-image/words.ts";

test("the formats of an attribute: the known ones, once each, in order, falling back to both", () => {
  assert.deepEqual(parseFormats("svg png"), ["svg", "png"]);
  assert.deepEqual(parseFormats("PNG, png ,gif"), ["png"]);
  assert.deepEqual(parseFormats("gif"), ["png", "svg"]);
  assert.deepEqual(parseFormats(null), ["png", "svg"]);
});

test("an SVG can be saved as either, anything else as a PNG", () => {
  assert.deepEqual([...formatsFor("svg")], ["png", "svg"]);
  assert.deepEqual([...formatsFor("canvas")], ["png"]);
  assert.deepEqual([...formatsFor("element")], ["png"]);
});

test("a file name is safe and has the extension of its format", () => {
  assert.equal(filenameFor("senshu-jersey", "svg"), "senshu-jersey.svg");
  assert.equal(filenameFor("senshu-jersey.PNG", "png"), "senshu-jersey.png");
  assert.equal(filenameFor("a/b\\c:d*e?f\"g<h>i|j", "png"), "a-b-c-d-e-f-g-h-i-j.png");
  assert.equal(filenameFor("  ../..  ", "png"), "image.png");
  assert.equal(filenameFor("", "png"), "image.png");
  assert.equal(filenameFor(undefined, "svg"), "image.svg");
  assert.equal(filenameFor("日本語の名前", "png"), "日本語の名前.png");
  assert.equal(filenameFor("line\nbreak\ttab", "png"), "line-break-tab.png");
  assert.equal(filenameFor("x".repeat(200), "png").length, 80 + 4);
});

test("a PNG is whole pixels at the scale, and a huge one is held to the limits", () => {
  assert.deepEqual(pixelSize(150, 210, 2), { width: 300, height: 420, scale: 2 });
  assert.deepEqual(pixelSize(100.4, 50.2, 1), { width: 100, height: 50, scale: 1 });
  assert.deepEqual(pixelSize(10, 10, 0), { width: 10, height: 10, scale: 1 });
  assert.deepEqual(pixelSize(10, 10, Number.NaN), { width: 10, height: 10, scale: 1 });
  const wide = pixelSize(1000, 100, 100);
  assert.ok(wide.width <= MAX_SIDE && wide.height <= MAX_SIDE);
  assert.equal(wide.width, MAX_SIDE);
  const big = pixelSize(6000, 6000, 3);
  assert.ok(big.width * big.height <= MAX_PIXELS * 1.001);
  assert.deepEqual(pixelSize(0, 0, 2), { width: 2, height: 2, scale: 2 });
});

test("every label is in English and Japanese", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja"), "ja");
  assert.equal(wordsFor("en", { png: "Download PNG" }).png, "Download PNG");
});
