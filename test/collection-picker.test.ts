import assert from "node:assert/strict";
import { test } from "node:test";

import { addId, indexItems, moveId, removeId, searchItems, SUGGEST_LIMIT } from "../src/collection-picker/items.ts";
import { WORDS, languageOf, wordsFor } from "../src/collection-picker/words.ts";
import type { CollectionItem } from "../src/collection-picker/items.ts";

const item = (id: string, name: string, extra: Partial<CollectionItem> = {}): CollectionItem => ({ kind: "body", id, name, ...extra });

test("search finds every word, ignores case and accents, and stops at the limit", () => {
  const index = indexItems([
    item("a", "Étoile du Nord", { group: "Stars", keywords: ["polaris"] }),
    item("b", "Mars", { group: "Planets" }),
    item("c", "March", { keywords: ["month"] }),
  ]);
  assert.deepEqual(searchItems(index, "").map((one) => one.id), []);
  assert.deepEqual(searchItems(index, "   ").map((one) => one.id), []);
  assert.deepEqual(searchItems(index, "etoile nord").map((one) => one.id), ["a"]);
  assert.deepEqual(searchItems(index, "POLARIS").map((one) => one.id), ["a"]);
  assert.deepEqual(searchItems(index, "mar").map((one) => one.id), ["b", "c"]);
  assert.deepEqual(searchItems(index, "mar", 1).map((one) => one.id), ["b"]);
  assert.equal(SUGGEST_LIMIT, 8);
});

test("seventeen thousand items are searched in one pass and a late match is still found", () => {
  const items = Array.from({ length: 17_000 }, (_, i) => item(`b${i}`, `Body ${i}`, { group: i % 2 === 0 ? "Even" : "Odd", keywords: ["sample"] }));
  const index = indexItems(items);
  const started = performance.now();
  const found = searchItems(index, "body 16999");
  const elapsed = performance.now() - started;
  assert.deepEqual(found.map((one) => one.id), ["b16999"]);
  assert.ok(elapsed < 50, `search took ${elapsed}ms`);
});

test("add keeps an id once, remove drops it, and move swaps with a neighbour", () => {
  assert.deepEqual(addId(["a"], "b"), ["a", "b"]);
  assert.deepEqual(addId(["a", "b"], "a"), ["a", "b"]);
  assert.deepEqual(removeId(["a", "b", "a"], "a"), ["b"]);
  assert.deepEqual(removeId(["a"], "z"), ["a"]);
  assert.deepEqual(moveId(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveId(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
  assert.deepEqual(moveId(["a"], "z", -1), ["a"]);
});

test("the labels are English or Japanese, and a partial override replaces one key", () => {
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en"), "en");
  assert.equal(languageOf(null), "en");
  assert.equal(wordsFor("ja").search, WORDS.ja.search);
  assert.equal(wordsFor("en", { search: "Find" }).search, "Find");
  assert.equal(wordsFor("en", { search: "Find" }).chosen, WORDS.en.chosen);
  for (const language of ["en", "ja"] as const) assert.deepEqual(Object.keys(WORDS[language]).sort(), Object.keys(WORDS.en).sort());
});
