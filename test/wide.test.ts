import assert from "node:assert/strict";
import { test } from "node:test";

import { applyWide, isTyping, parseWide, readWide, WIDE_ATTRIBUTE, wideCss, wideOf } from "../src/wide-layout/wide.ts";
import { languageOf, WORDS, wordsFor } from "../src/wide-layout/words.ts";

const fake = (attributes: Record<string, string> = {}) => {
  const held = new Map(Object.entries(attributes));
  return { getAttribute: (name: string) => held.get(name) ?? null, setAttribute: (name: string, value: string) => void held.set(name, value), removeAttribute: (name: string) => void held.delete(name) } as unknown as Element;
};

test("the choice is on or off, in the words a page or an address would use", () => {
  for (const word of ["on", "ON", "1", "true", " wide "]) assert.equal(parseWide(word), true, word);
  for (const word of ["off", "0", "false", "normal"]) assert.equal(parseWide(word), false, word);
  for (const word of ["", "maybe", null, undefined, 1]) assert.equal(parseWide(word), undefined, String(word));
});

test("a choice is written on the target as data-wide=on, and taken off for normal", () => {
  const target = fake();
  assert.equal(wideOf(target), false);
  applyWide(target, true);
  assert.equal(target.getAttribute(WIDE_ATTRIBUTE), "on");
  assert.equal(wideOf(target), true);
  applyWide(target, false);
  assert.equal(target.getAttribute(WIDE_ATTRIBUTE), null);
});

test("the address is read first, then the store, and a store that throws is an empty one", () => {
  assert.equal(readWide({ search: "?wide=on" }), true);
  assert.equal(readWide({ search: "?wide=off", storage: { getItem: () => "on" } }), false);
  assert.equal(readWide({ search: "?other=1", storage: { getItem: () => "on" } }), true);
  assert.equal(readWide({ search: "?wide=nonsense", storage: { getItem: (key) => (key === "kazoku-wide" ? "off" : null) } }), false);
  assert.equal(readWide({ storage: { getItem: () => { throw new Error("blocked"); } } }), undefined);
  assert.equal(readWide({ search: "?k=on", addressKey: "k" }), true);
  assert.equal(readWide({ storage: { getItem: (key) => (key === "mine" ? "on" : null) }, storageKey: "mine" }), true);
  assert.equal(readWide({}), undefined);
});

test("the T key is left alone in a text field, a select, an editable element and with Ctrl, Command or Alt", () => {
  const inside = (selector: string) => ({ closest: (want: string) => (want.includes(selector) ? {} : null) }) as unknown as Element;
  assert.equal(isTyping(inside("input"), {}), true);
  assert.equal(isTyping(inside("textarea"), {}), true);
  assert.equal(isTyping(inside("select"), {}), true);
  assert.equal(isTyping(inside("[contenteditable]"), {}), true);
  assert.equal(isTyping(inside("nothing"), {}), false);
  assert.equal(isTyping(null, {}), false);
  assert.equal(isTyping(null, { ctrlKey: true }), true);
  assert.equal(isTyping(null, { metaKey: true }), true);
  assert.equal(isTyping(null, { altKey: true }), true);
});

test("the rule: a column beside the view in Normal, the view over the panel in Wide, and nothing changes on a phone", () => {
  const css = wideCss();
  assert.match(css, /\.kazoku-stage \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 320px/);
  const wide = css.slice(css.indexOf("@media (min-width: 641px)"));
  assert.match(wide, /\[data-wide="on"\] \.kazoku-stage \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(wide, /aspect-ratio: 16 \/ 9; max-height: 80vh/);
  assert.match(wide, /\.kazoku-side \{ display: grid; grid-template-columns: repeat\(auto-fit/);
  assert.match(css, /@media \(max-width: 640px\) \{ \.kazoku-stage \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.equal(css.slice(0, css.indexOf("@media (min-width")).includes("data-wide"), false, "the Wide rules are only for a desk");
  const own = wideCss({ side: "20rem", maxHeight: "70vh" });
  assert.match(own, /20rem/);
  assert.match(own, /max-height: 70vh/);
});

test("the words are in English and Japanese, every key in both", () => {
  assert.deepEqual(Object.keys(WORDS.en).sort(), Object.keys(WORDS.ja).sort());
  for (const language of ["en", "ja"] as const) for (const [key, value] of Object.entries(WORDS[language])) assert.ok(value.length > 0, `${language} ${key}`);
  assert.equal(WORDS.en.wide, "Wide");
  assert.equal(WORDS.en.normal, "Normal");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("fr"), "en");
  assert.equal(wordsFor("en", { wide: "Theatre" }).wide, "Theatre");
});
