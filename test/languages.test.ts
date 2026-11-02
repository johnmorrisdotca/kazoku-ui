import assert from "node:assert/strict";
import { test } from "node:test";

import { applyLanguage, DEFAULT_LANGUAGES, languageName, matchLanguage, normaliseCode, parseLanguages, startingLanguage } from "../src/language-picker/languages.ts";
import { WORDS, languageOf, wordsFor } from "../src/language-picker/words.ts";

test("a list of codes keeps the valid ones, once each, in order, and falls back to English and Japanese", () => {
  assert.deepEqual(parseLanguages("en ja fr"), ["en", "ja", "fr"]);
  assert.deepEqual(parseLanguages("EN, ja_JP ,en,  de"), ["en", "ja-jp", "de"]);
  assert.deepEqual(parseLanguages("x, 12, english-language-tag-too-long-x"), [...DEFAULT_LANGUAGES]);
  assert.deepEqual(parseLanguages(null), ["en", "ja"]);
  assert.deepEqual(parseLanguages(""), ["en", "ja"]);
  assert.equal(normaliseCode(" Zh-Hant "), "zh-hant");
  assert.equal(normaliseCode("e"), undefined);
});

test("a tag means the entry of the list it names, or its main language", () => {
  const list = ["en", "ja", "pt-br"];
  assert.equal(matchLanguage("ja", list), "ja");
  assert.equal(matchLanguage("JA-JP", list), "ja");
  assert.equal(matchLanguage("en_CA", list), "en");
  assert.equal(matchLanguage("pt", list), "pt-br");
  assert.equal(matchLanguage("pt-br", list), "pt-br");
  assert.equal(matchLanguage("fr", list), undefined);
  assert.equal(matchLanguage("", list), undefined);
  assert.equal(matchLanguage(null, list), undefined);
});

test("each language is named in its own language", () => {
  assert.equal(languageName("en"), "English");
  assert.equal(languageName("ja"), "日本語");
  assert.equal(languageName("fr"), "Français");
  assert.equal(languageName("en", { en: "English (Canada)" }), "English (Canada)");
  // Not in the table: the browser's own name for it, in that language, with a capital; a code nobody knows is itself.
  assert.equal(languageName("tr"), "Türkçe");
  assert.equal(languageName("zzz"), "zzz");
});

test("the start: address, store, the page's value, the reader's languages, what the page holds, the first", () => {
  const list = ["en", "ja"];
  const storage = { getItem: (key: string) => (key === "kazoku-lang" ? "ja" : null) };
  assert.equal(startingLanguage({ list, search: "?lang=en", storage, value: "ja", preferred: ["ja"], current: "ja" }), "en");
  assert.equal(startingLanguage({ list, search: "?lang=fr", storage, value: "en" }), "ja");
  assert.equal(startingLanguage({ list, search: "", value: "ja", preferred: ["en"] }), "ja");
  assert.equal(startingLanguage({ list, preferred: ["fr-CA", "ja-JP"], current: "en" }), "ja");
  assert.equal(startingLanguage({ list, preferred: ["fr"], current: "ja-JP" }), "ja");
  assert.equal(startingLanguage({ list, preferred: ["fr"], current: "de" }), "en");
  assert.equal(startingLanguage({ list: ["ja", "en"] }), "ja");
  assert.equal(startingLanguage({ list, search: "?l=ja", addressKey: "l" }), "ja");
});

test("a store that throws is the same as an empty one", () => {
  const storage = { getItem: () => { throw new Error("blocked"); } };
  assert.equal(startingLanguage({ list: ["en", "ja"], storage, value: "ja" }), "ja");
});

test("a choice is written as lang", () => {
  const held = new Map<string, string>();
  applyLanguage({ setAttribute: (name: string, value: string) => void held.set(name, value) } as unknown as Element, "ja");
  assert.equal(held.get("lang"), "ja");
});

test("every label is in English and Japanese", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(wordsFor("en", { group: "Pick" }).group, "Pick");
});
