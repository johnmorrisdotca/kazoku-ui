import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_STEPS, nearestStep, parseSpeed, parseSteps, speedText, startStep, stepFrom } from "../src/speed-buttons/steps.ts";
import { WORDS, languageOf, wordsFor } from "../src/speed-buttons/words.ts";

test("the steps are the numbers of a list, once each, in the order given", () => {
  assert.deepEqual(parseSteps("0.5 1 2"), [0.5, 1, 2]);
  assert.deepEqual(parseSteps("1, 10,100"), [1, 10, 100]);
  assert.deepEqual(parseSteps("2 1 2 0.5"), [2, 1, 0.5]);
  assert.deepEqual(parseSteps("0 1 3600 86400 -3600"), [0, 1, 3600, 86400, -3600]);
});

test("a list with no number in it is the default steps, or the fallback", () => {
  assert.deepEqual(parseSteps(""), [...DEFAULT_STEPS]);
  assert.deepEqual(parseSteps(null), [0.5, 1, 2]);
  assert.deepEqual(parseSteps("fast slow"), [0.5, 1, 2]);
  assert.deepEqual(parseSteps("x", [4]), [4]);
});

test("a speed reads as its number and its unit, a real minus sign for a negative one", () => {
  assert.deepEqual([0.5, 1, 2, 10, 100, 3600].map((n) => speedText(n)), ["0.5×", "1×", "2×", "10×", "100×", "3600×"]);
  assert.equal(speedText(-3600), "−3600×");
  assert.equal(speedText(1 / 3), "0.3333×");
  assert.equal(speedText(7, " d/s"), "7 d/s");
  assert.equal(speedText(0), "0×");
});

test("the nearest step is found on a log scale for steps above zero", () => {
  assert.equal(nearestStep(2.5, [1, 2, 4]), 2);
  assert.equal(nearestStep(2.9, [1, 2, 4]), 4);
  assert.equal(nearestStep(0.6, [0.5, 1, 2]), 0.5);
  assert.equal(nearestStep(-1, [-3600, 0, 1]), 0);
  assert.equal(nearestStep(5, []), undefined);
});

test("the buttons start on 1 where there is a 1, else on the first", () => {
  assert.equal(startStep([0.5, 1, 2]), 1);
  assert.equal(startStep([10, 100]), 10);
  assert.equal(startStep([]), 1);
});

test("a single button that cycles goes round at both ends", () => {
  assert.equal(stepFrom(1, [0.5, 1, 2]), 2);
  assert.equal(stepFrom(2, [0.5, 1, 2]), 0.5);
  assert.equal(stepFrom(0.5, [0.5, 1, 2], -1), 2);
  assert.equal(stepFrom(1.2, [0.5, 1, 2]), 2);
});

test("an address or attribute is a number nearest to a step, or one of the words of 0.12 and 0.13", () => {
  assert.equal(parseSpeed("2", [0.5, 1, 2]), 2);
  assert.equal(parseSpeed("3", [0.5, 1, 2]), 2);
  assert.equal(parseSpeed("fast", [0.5, 1, 2]), 2);
  assert.equal(parseSpeed("slow", [1, 10]), 1);
  assert.equal(parseSpeed("", [0.5, 1, 2]), undefined);
  assert.equal(parseSpeed("nope", [0.5, 1, 2]), undefined);
  assert.equal(parseSpeed(null, [0.5, 1, 2]), undefined);
});

test("the labels are in both languages", () => {
  assert.equal(WORDS.en.group, "Speed");
  assert.equal(WORDS.ja.group, "速さ");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(wordsFor("en", { group: "Time" }).group, "Time");
});
