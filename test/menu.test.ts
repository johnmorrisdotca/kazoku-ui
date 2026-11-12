import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWhich, WORDS, type MenuWords } from "../src/menu/index.ts";

const keys = (words: MenuWords): string[] => Object.keys(words).sort();

test("both languages name the same menus", () => {
  assert.deepEqual(keys(WORDS.en), keys(WORDS.ja));
  assert.equal(WORDS.en.settings, "Settings");
  assert.equal(WORDS.ja.settings, "設定");
  assert.equal(WORDS.en.resources, "Resources");
  assert.equal(WORDS.ja.resources, "資料");
  assert.equal(WORDS.en.close, "Close");
  assert.equal(WORDS.ja.close, "閉じる");
});

test("a missing which is Settings, and resources is its own menu", () => {
  assert.equal(parseWhich(null), "settings");
  assert.equal(parseWhich("  "), "settings");
  assert.equal(parseWhich("Resources"), "resources");
  assert.equal(parseWhich("nope"), "settings");
});
