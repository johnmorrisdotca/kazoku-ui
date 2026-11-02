import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { adoptStyles, canAdopt } from "../src/shared/adopt.ts";

const g = globalThis as Record<string, unknown>;
const saved = g.CSSStyleSheet;
afterEach(() => {
  g.CSSStyleSheet = saved;
});

class FakeSheet {
  css = "";
  replaceSync(css: string): void {
    this.css = css;
  }
}

/** A stand-in shadow root: adoptedStyleSheets when asked, and a document that makes <style> elements. */
function fakeRoot(adopting: boolean) {
  const prepended: { tag: string; nonce: string; textContent: string }[] = [];
  const root: Record<string, unknown> = {
    ownerDocument: {
      createElement: (tag: string) => {
        const el = { tag, nonce: "", textContent: "", setAttribute: (name: string, value: string) => { if (name === "nonce") el.nonce = value; } };
        return el;
      },
    },
    prepend: (el: { tag: string; nonce: string; textContent: string }) => prepended.push(el),
  };
  if (adopting) root.adoptedStyleSheets = [];
  return { root: root as unknown as ShadowRoot, prepended, sheets: () => root.adoptedStyleSheets as unknown[] };
}

test("with constructable stylesheets the styles are adopted and no <style> is written", () => {
  g.CSSStyleSheet = FakeSheet;
  const { root, prepended, sheets } = fakeRoot(true);
  assert.equal(canAdopt(root), true);
  adoptStyles(root, ".a{color:red}", "n");
  assert.equal(prepended.length, 0);
  assert.equal(sheets().length, 1);
  assert.equal((sheets()[0] as FakeSheet).css, ".a{color:red}");
});

test("the same text is one shared sheet, adopted once per root", () => {
  g.CSSStyleSheet = FakeSheet;
  const one = fakeRoot(true);
  const two = fakeRoot(true);
  adoptStyles(one.root, ".b{}");
  adoptStyles(one.root, ".b{}");
  adoptStyles(two.root, ".b{}");
  assert.equal(one.sheets().length, 1);
  assert.equal(one.sheets()[0], two.sheets()[0]);
});

test("without the API the styles go into a <style> carrying the nonce", () => {
  g.CSSStyleSheet = class {};
  const { root, prepended } = fakeRoot(false);
  assert.equal(canAdopt(root), false);
  adoptStyles(root, ".c{}", "abc");
  assert.equal(prepended.length, 1);
  assert.equal(prepended[0]?.tag, "style");
  assert.equal(prepended[0]?.nonce, "abc");
  assert.equal(prepended[0]?.textContent, ".c{}");
});

test("no nonce, no nonce attribute", () => {
  g.CSSStyleSheet = undefined;
  const { root, prepended } = fakeRoot(false);
  adoptStyles(root, ".d{}");
  assert.equal(prepended[0]?.nonce, "");
});

test("a browser that has the API and refuses it falls back to the <style>", () => {
  g.CSSStyleSheet = class { replaceSync(): void { throw new Error("no"); } };
  const { root, prepended } = fakeRoot(true);
  adoptStyles(root, ".e{}", "z");
  assert.equal(prepended.length, 1);
});
