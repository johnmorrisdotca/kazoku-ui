import assert from "node:assert/strict";
import { test } from "node:test";

import { addressKeys, DEFAULT_STEPS, flagOn, PLAY_KEY, REPEAT_KEY, SPEED_KEY } from "../src/replay-bar/state.ts";
import { WORDS, languageOf, wordsFor } from "../src/replay-bar/words.ts";

test("on is on, and anything else is off", () => {
  assert.equal(flagOn("on"), true);
  assert.equal(flagOn("true"), true);
  assert.equal(flagOn("1"), true);
  assert.equal(flagOn("off"), false);
  assert.equal(flagOn(""), false);
  assert.equal(flagOn(null), false);
  assert.equal(flagOn(undefined), false);
});

test("the address keys start as play and repeat, and a page can rename either", () => {
  assert.deepEqual(addressKeys(null), { play: PLAY_KEY, repeat: REPEAT_KEY });
  assert.deepEqual(addressKeys("play:p,repeat:r"), { play: "p", repeat: "r" });
  assert.deepEqual(addressKeys("speed:s,play:going"), { play: "going", repeat: REPEAT_KEY });
  assert.equal(SPEED_KEY, "replay-speed");
  assert.equal(DEFAULT_STEPS, "0.25 0.5 1 2 4");
});

test("the labels are in both languages, and a page can cover one", () => {
  assert.deepEqual(Object.keys(WORDS.en).sort(), Object.keys(WORDS.ja).sort());
  assert.equal(WORDS.en.play, "Play");
  assert.equal(WORDS.en.pause, "Pause");
  assert.equal(WORDS.ja.pause, "一時停止");
  assert.equal(WORDS.ja.start, "最初へ");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en"), "en");
  assert.equal(wordsFor("en", { play: "Go" }).play, "Go");
  assert.equal(wordsFor("en", { play: "Go" }).pause, "Pause");
});
