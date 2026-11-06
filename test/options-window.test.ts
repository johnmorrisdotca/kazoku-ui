import assert from "node:assert/strict";
import { test } from "node:test";

import { addressKeys, frameOf, namedPlace, OPEN_KEY, parsePlace, parseVariant, PLACE_KEY, settle } from "../src/options-window/place.ts";
import { gestureHelp, languageOf, WORDS, wordsFor } from "../src/options-window/words.ts";

const view = { width: 800, height: 600 };
const size = { width: 280, height: 160 };

test("a card is the frame when the name is missing, and the content is the same in every frame", () => {
  assert.equal(parseVariant(null), "card");
  assert.equal(parseVariant("shelf"), "shelf");
  assert.equal(parseVariant("nope"), "card");
  const content = { title: "Planet options", help: "Turn speed", open: true };
  const card = frameOf("card", content);
  const shelf = frameOf("shelf", content);
  assert.equal(card.title, shelf.title);
  assert.equal(card.help, shelf.help);
  assert.equal(card.open, shelf.open);
  assert.equal(card.presentation, "float");
  assert.equal(shelf.presentation, "edge");
  assert.equal(frameOf("inspector", content).presentation, "wide");
});

test("a drag near a corner snaps to it, and the window stays inside the view", () => {
  assert.equal(settle(view, size, { x: 4, y: 4 }).snap, "tl");
  assert.deepEqual(settle(view, size, { x: 4, y: 4 }), { x: 0, y: 0, snap: "tl" });
  assert.equal(settle(view, size, { x: 900, y: 900 }).snap, "br");
  assert.equal(settle(view, size, { x: 200, y: 4 }).snap, "top");
  const held = settle(view, size, { x: -40, y: 200 }, 0);
  assert.equal(held.x, 0);
  assert.equal(held.y, 200);
  assert.deepEqual(namedPlace(view, size, "tr"), { x: 520, y: 0 });
});

test("a remembered place is a corner or a pair of pixels", () => {
  assert.deepEqual(parsePlace("bl"), { snap: "bl" });
  assert.deepEqual(parsePlace("120,40"), { x: 120, y: 40 });
  assert.equal(parsePlace("free"), null);
  assert.equal(parsePlace("nope"), null);
  assert.equal(OPEN_KEY, "open");
  assert.equal(PLACE_KEY, "place");
  assert.deepEqual(addressKeys(null), { open: "open", place: "place" });
  assert.deepEqual(addressKeys("open:ow,place:op"), { open: "ow", place: "op" });
});

test("every label is in English and Japanese, and the gesture line is the view's", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("fr"), "en");
  assert.equal(wordsFor("en", { group: "Planet options" }).group, "Planet options");
  assert.equal(wordsFor("en", { group: "Planet options" }).collapse, "Collapse");
  assert.match(gestureHelp("en"), /Shift and a drag/);
  assert.match(gestureHelp("ja"), /ひねり/);
});
