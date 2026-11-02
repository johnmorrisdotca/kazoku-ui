import assert from "node:assert/strict";
import { test } from "node:test";

import { applyTheme, parseModes, parseTheme, readTheme, resolveTheme, themeOf, THEMES } from "../src/theme-switch/theme.ts";
import { WORDS, languageOf, wordsFor } from "../src/theme-switch/words.ts";

/** A stand-in element with attributes. */
const fake = (attributes: Record<string, string> = {}) => {
  const held = new Map(Object.entries(attributes));
  return { getAttribute: (name: string) => held.get(name) ?? null, setAttribute: (name: string, value: string) => void held.set(name, value), removeAttribute: (name: string) => void held.delete(name), hasAttribute: (name: string) => held.has(name), held } as unknown as Element & { held: Map<string, string> };
};

test("the three choices", () => {
  assert.deepEqual([...THEMES], ["light", "dark", "auto"]);
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("Dark"), undefined);
  assert.equal(parseTheme(""), undefined);
  assert.equal(parseTheme(null), undefined);
});

test("auto is the device's colours, light and dark are themselves", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("modes keep the known choices once each, in order, and fall back to all three", () => {
  assert.deepEqual(parseModes(null), ["light", "dark", "auto"]);
  assert.deepEqual(parseModes("dark light"), ["light", "dark"]);
  assert.deepEqual(parseModes("dark, dark ,sepia"), ["dark"]);
  assert.deepEqual(parseModes("sepia"), ["light", "dark", "auto"]);
  assert.deepEqual(parseModes(""), ["light", "dark", "auto"]);
});

test("a choice is written as data-theme, and auto takes it off", () => {
  const el = fake({ "data-theme": "light", other: "x" });
  applyTheme(el, "dark");
  assert.equal(el.getAttribute("data-theme"), "dark");
  assert.equal(themeOf(el), "dark");
  applyTheme(el, "auto");
  assert.equal(el.hasAttribute("data-theme"), false);
  assert.equal(themeOf(el), "auto");
  assert.equal(el.getAttribute("other"), "x");
  el.setAttribute("data-theme", "sepia");
  assert.equal(themeOf(el), "auto");
});

test("a remembered choice is read from the address first, then the store", () => {
  const storage = { getItem: (key: string) => (key === "kazoku-theme" ? "light" : null) };
  assert.equal(readTheme({ search: "?theme=dark", storage }), "dark");
  assert.equal(readTheme({ search: "?theme=nope", storage }), "light");
  assert.equal(readTheme({ search: "?x=1", storage }), "light");
  assert.equal(readTheme({ search: "?t=dark", addressKey: "t" }), "dark");
  assert.equal(readTheme({ storage: { getItem: () => "dark" }, storageKey: "mine" }), "dark");
  assert.equal(readTheme({}), undefined);
});

test("a store that throws is the same as an empty one", () => {
  const storage = { getItem: () => { throw new Error("blocked"); } };
  assert.equal(readTheme({ search: "", storage }), undefined);
  assert.equal(readTheme({ search: "?theme=dark", storage }), "dark");
});

test("every label is in English and Japanese", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("fr"), "en");
  assert.equal(wordsFor("en", { auto: "System" }).auto, "System");
  assert.equal(wordsFor("en", { auto: "System" }).dark, "Dark");
});
