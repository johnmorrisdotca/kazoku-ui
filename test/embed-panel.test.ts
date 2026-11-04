import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_KINDS, DEFAULT_SIZES, filterItems, groupsOf, nearestSize, parseKinds, parseSizes, type PickItem } from "../src/embed-panel/choices.ts";
import { EMBED_KINDS, embedSnippet, type SnippetSpec } from "../src/embed-panel/snippets.ts";
import { WORDS, kindLabel, languageOf, wordsFor } from "../src/embed-panel/words.ts";

const spec: SnippetSpec = {
  package: "@scope/dial",
  cdn: "https://cdn.jsdelivr.net/npm/@scope/dial@1.2.3",
  tag: "scope-dial",
  element: "element",
  entries: ["looks"],
  attrs: [["value", "7"], ["title", 'a "dial"'], ["live", ""]],
  name: "dial",
  iframe: { src: "https://example.com/embed.html?value=7&look=a", title: "Dial", width: 240, height: 240 },
};

test("the seven ways a page is made are the default tabs, in the order the family shows them", () => {
  assert.deepEqual([...EMBED_KINDS], ["html", "module", "react", "vue", "angular", "svelte", "iframe"]);
  assert.deepEqual([...DEFAULT_KINDS], [...EMBED_KINDS]);
});

test("the HTML way loads the element and each entry from the CDN, then writes the tag with its attributes", () => {
  assert.equal(
    embedSnippet("html", spec),
    `<script type="module" src="https://cdn.jsdelivr.net/npm/@scope/dial@1.2.3/element/+esm"></script>\n<script type="module" src="https://cdn.jsdelivr.net/npm/@scope/dial@1.2.3/looks/+esm"></script>\n\n<scope-dial value="7" title="a &quot;dial&quot;" live></scope-dial>`,
  );
});

test("a package whose element is its main entry has no empty path segment", () => {
  const main = { ...spec, element: "", entries: [] };
  assert.ok(embedSnippet("html", main).startsWith('<script type="module" src="https://cdn.jsdelivr.net/npm/@scope/dial@1.2.3/+esm">'));
  assert.ok(embedSnippet("module", main).startsWith('import "@scope/dial";'));
  assert.ok(embedSnippet("react", main).includes('void import("@scope/dial");'));
});

test("the module way imports the entries and sets each attribute", () => {
  const code = embedSnippet("module", spec);
  assert.ok(code.startsWith('import "@scope/dial/element";\nimport "@scope/dial/looks";'));
  assert.ok(code.includes('dial.setAttribute("title", "a \\"dial\\"");'));
  assert.ok(code.includes('document.querySelector("#dial").append(dial);'));
});

test("React, Vue, Angular and Svelte import the element in the browser only", () => {
  assert.match(embedSnippet("react", spec), /useEffect\(\(\) => \{[\s\S]*void import\("@scope\/dial\/element"\);[\s\S]*<scope-dial value="7"/);
  assert.match(embedSnippet("vue", spec), /onMounted[\s\S]*<template>\n {2}<scope-dial value="7"[^>]*><\/scope-dial>/);
  assert.match(embedSnippet("angular", spec), /CUSTOM_ELEMENTS_SCHEMA[\s\S]*selector: "app-dial"[\s\S]*class DialComponent[\s\S]*typeof window !== "undefined"/);
  assert.match(embedSnippet("svelte", spec), /onMount[\s\S]*<scope-dial value="7"/);
});

test("the iframe way is the embed page at the size chosen", () => {
  assert.equal(embedSnippet("iframe", spec), '<iframe\n  src="https://example.com/embed.html?value=7&amp;look=a"\n  title="Dial"\n  width="240"\n  height="240"\n  loading="lazy"\n  style="border: 0"\n></iframe>');
});

test("tabs and sizes come from a text, once each, and fall back to the family's", () => {
  assert.deepEqual(parseKinds("html, React image html"), ["html", "react", "image"]);
  assert.deepEqual(parseKinds("  "), [...DEFAULT_KINDS]);
  assert.deepEqual(parseKinds("9x !!", ["html"]), ["html"]);
  assert.deepEqual(parseSizes("480 160 240 160"), [160, 240, 480]);
  assert.deepEqual(parseSizes("1 5000 big"), [...DEFAULT_SIZES]);
  assert.deepEqual([...DEFAULT_SIZES], [160, 240, 320, 480]);
});

test("a wish takes the nearest size, 320 where it has no wish", () => {
  assert.equal(nearestSize(240, DEFAULT_SIZES), 240);
  assert.equal(nearestSize("500", DEFAULT_SIZES), 480);
  assert.equal(nearestSize(null, DEFAULT_SIZES), 320);
  assert.equal(nearestSize("", DEFAULT_SIZES), 320);
  assert.equal(nearestSize("abc", [100, 200]), 200);
  assert.equal(nearestSize(1, []), 320);
});

const items: PickItem[] = [
  { id: "mars", label: "Mars", group: "Planets" },
  { id: "deimos", label: "Deimos", group: "Moons", words: "moon of Mars" },
  { id: "venus", label: "Vénus", group: "Planets" },
  { id: "sun", label: "Sun" },
];

test("the picker's groups are listed once each in the order they appear, and an item with none is only under All", () => {
  assert.deepEqual(groupsOf(items), ["Planets", "Moons"]);
  assert.deepEqual(filterItems(items).map((i) => i.id), ["mars", "deimos", "venus", "sun"]);
  assert.deepEqual(filterItems(items, "", "Planets").map((i) => i.id), ["mars", "venus"]);
  assert.deepEqual(filterItems(items, "", "Nope"), []);
});

test("the search needs every word, ignores case and accents, and also reads the extra words", () => {
  assert.deepEqual(filterItems(items, "venus").map((i) => i.id), ["venus"]);
  assert.deepEqual(filterItems(items, "MOON mars").map((i) => i.id), ["deimos"]);
  assert.deepEqual(filterItems(items, "mars", "Planets").map((i) => i.id), ["mars"]);
  assert.deepEqual(filterItems(items, "zzz"), []);
});

test("every label is in English and Japanese, and a tab says the family's word, else the page's, else its id", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(wordsFor("ja", { copy: "写す" }).copy, "写す");
  assert.equal(kindLabel("module", "en"), "ES module");
  assert.equal(kindLabel("module", "ja"), "ESモジュール");
  assert.equal(kindLabel("image", "en", { image: "Image address" }), "Image address");
  assert.equal(kindLabel("png", "en"), "png");
});
