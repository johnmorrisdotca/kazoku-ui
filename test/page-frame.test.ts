import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { pageProblems } from "../src/page-frame/check.ts";
import { pageCreditsHtml, pageHeaderHtml } from "../src/page-frame/html.ts";
import { samePage } from "../src/page-frame/link.ts";
import { pageHeadHtml } from "../src/page-frame/meta.ts";
import { escapeHtml, pageTitle, pickText, type PageTexts } from "../src/page-frame/text.ts";
import { languageOf, WORDS, wordsFor } from "../src/page-frame/words.ts";

const TEXTS: PageTexts = {
  en: { name: "Hoshi Stars", what: "The 88 constellations", description: "A picture of each of the 88 constellations, with its neighbours." },
  ja: { name: "星 Hoshi Stars", what: "88の星座", description: "88の星座を、それぞれ絵で見られます。" },
};

test("every label is in both languages", () => {
  assert.deepEqual(Object.keys(WORDS.en).sort(), Object.keys(WORDS.ja).sort());
  for (const language of ["en", "ja"] as const) for (const text of Object.values(WORDS[language])) assert.notEqual(text, "");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(languageOf(null), "en");
  assert.equal(wordsFor("en", { home: "Start" }).home, "Start");
});

test("the title is the name, then what the page shows, in the language's colon", () => {
  assert.equal(pageTitle(TEXTS.en), "Hoshi Stars: The 88 constellations");
  assert.equal(pageTitle(TEXTS.ja!, "ja"), "星 Hoshi Stars：88の星座");
  assert.equal(pageTitle({ name: "Hoshi Stars", what: "" }), "Hoshi Stars");
  assert.equal(pickText({ en: TEXTS.en }, "ja"), TEXTS.en, "a language left out gets the English");
});

test("the head the build writes carries the title and the description, escaped", () => {
  const head = pageHeadHtml({ en: { name: "A & B", what: 'say "hi"', description: "x < y" } });
  assert.match(head, /<title>A &amp; B: say &quot;hi&quot;<\/title>/);
  assert.match(head, /<meta name="description" content="x &lt; y" \/>/);
  assert.match(head, /og:title/);
  assert.match(pageHeadHtml(TEXTS, "ja"), /<title>星 Hoshi Stars：88の星座<\/title>/);
});

test("the header and the credit line are written with the words inside as the no-script fallback", () => {
  const header = pageHeaderHtml(TEXTS, { sheets: "kids.html", meta: true });
  assert.match(header, /^<kazoku-page-header name="Hoshi Stars" what="The 88 constellations" description="[^"]+" name-ja="[^"]+" what-ja="88の星座" description-ja="[^"]+" home="index.html" sheets="kids.html" meta>/);
  assert.match(header, /<a href="index.html">Home<\/a> <a href="kids.html">Printable sheets<\/a>/);
  assert.doesNotMatch(pageHeaderHtml({ en: TEXTS.en }), /sheets=|Printable/);
  const credits = pageCreditsHtml({ en: "Stars: Yale.", ja: "星：イェール。" }, { href: "NOTICE.html", embed: true });
  assert.match(credits, /^<kazoku-page-credits credits="Stars: Yale\." credits-ja="星：イェール。" href="NOTICE.html" embed>/);
  assert.match(credits, /<a href="NOTICE.html">Data and credits<\/a>/);
  assert.match(pageCreditsHtml({ en: "x", ja: "y" }, { language: "ja" }), /<p>y<\/p>/);
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("a link to the page it is on is the current page", () => {
  assert.equal(samePage("index.html", "https://example.org/demo/"), true);
  assert.equal(samePage("./", "https://example.org/demo/index.html?lang=ja#x"), true);
  assert.equal(samePage("kids.html", "https://example.org/demo/"), false);
  assert.equal(samePage("https://other.org/demo/", "https://example.org/demo/"), false);
  assert.equal(samePage("index.html", "not a url"), false);
});

test("pageProblems names what a page lacks", () => {
  const good = `<!doctype html><title>Hoshi Stars: Gallery</title><meta name="description" content="A picture of each of the 88 constellations."/>${pageHeaderHtml(TEXTS)}${pageCreditsHtml({ en: "Stars: Yale." })}`;
  assert.deepEqual(pageProblems(good), []);
  assert.deepEqual(pageProblems(`<!doctype html><title>T</title><meta name="description" content="A sentence about the embedded page."/>${pageCreditsHtml({ en: "Yale." }, { embed: true })}`, { embed: true }), []);
  const named = (html: string, options?: { embed?: boolean }) => pageProblems(html, options).join("|");
  assert.match(named(good.replace(/<title>.*?<\/title>/, "")), /no <title>/);
  assert.match(named(good.replace(/<title>.*?<\/title>/, "<title> </title>")), /no <title>/);
  assert.match(named(good.replace(/<meta name="description"[^>]*>/, "")), /description/);
  assert.match(named(good.replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="short"')), /description/);
  assert.match(named(good.replace(/<kazoku-page-header.*<\/kazoku-page-header>/, "")), /no <kazoku-page-header>/);
  assert.match(named(good.replace(' what="The 88 constellations"', "")), /no what=/);
  assert.match(named(good.replace(/<kazoku-page-credits.*<\/kazoku-page-credits>/, "")), /no <kazoku-page-credits>/);
  assert.match(named(good.replace(' credits="Stars: Yale."', "")), /neither credits= nor href=/);
  assert.match(named(good, { embed: true }), /needs the embed attribute/);
});

test("every page of this package's own demo has the header and the credit line, or is the embed page", () => {
  const demo = new URL("../demo/", import.meta.url);
  for (const name of readdirSync(demo).filter((file) => file.endsWith(".html"))) {
    const html = readFileSync(new URL(name, demo), "utf8");
    assert.deepEqual(pageProblems(html, { embed: name === "embed.html" }), [], name);
    if (name === "embed.html") continue;
    // The title is the header's own words: name, then what the page shows.
    const header = /<kazoku-page-header[^>]*>/.exec(html)![0];
    const attribute = (tag: string, key: string): string => new RegExp(`\\s${key}="([^"]*)"`).exec(tag)![1]!;
    assert.equal(/<title>(.*?)<\/title>/.exec(html)![1], pageTitle({ name: attribute(header, "name"), what: attribute(header, "what") }), `${name}'s title is name: what`);
    assert.equal(/<meta name="description" content="([^"]*)"/.exec(html)![1], attribute(header, "description"), `${name}'s description is the header's`);
    assert.ok(attribute(header, "what-ja") !== "" && attribute(header, "description-ja") !== "", `${name} has its Japanese`);
    assert.match(html, /src="frame\.js"/, `${name} loads the elements`);
  }
});

test("pageCreditsHtml writes a line given in pieces with its links, for the element and without script, and never an unsafe address", () => {
  const html = pageCreditsHtml(
    {
      en: ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }, ", ", { text: "a trick", href: "JavaScript:alert(1)" }],
      ja: ["旗：", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
    },
    { embed: true },
  );
  assert.match(html, / credits="Flag: CC BY 2\.5, a trick"/);
  assert.match(html, / credits-ja="旗：CC BY 2\.5"/);
  assert.match(html, / credit-parts="\[&quot;Flag: &quot;,\{&quot;text&quot;:&quot;CC BY 2\.5&quot;/);
  assert.match(html, /<a href="https:\/\/creativecommons\.org\/licenses\/by\/2\.5\/" target="_blank" rel="noopener noreferrer">CC BY 2\.5<\/a>/);
  assert.doesNotMatch(html, /href="JavaScript/i, "an unsafe address is never a link");
  assert.match(html, /, a trick<\/p>/);
  assert.deepEqual(pageProblems(`<!doctype html><title>T</title><meta name="description" content="A sentence about the embedded page."/>${html}`, { embed: true }), []);
});
