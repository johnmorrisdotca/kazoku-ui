---
title: Page header and credits
section: how-to
order: 23
description: The header line and the credit line every demo page shows without opening a menu (what the page is, a way home, the printable sheets, who is credited), and the helpers that write a real title and description from the same words.
---

A visitor does not always arrive at a demo's home page. A search, a shared link or a README can drop them on any page. So every page of every family demo shows five things, on a desk and on a phone, with no menu to open:

1. one line saying what it is: the package's name and what this page shows;
2. a way home;
3. a way to the printable sheets, when the package has them;
4. its credits: this page's data credits, or one link to them;
5. a real `<title>` and description, so a search result or a shared link reads properly.

This part is those five, built once. `<kazoku-page-header>` is the first three, `<kazoku-page-credits>` is the fourth, and `pageHeadHtml`, `applyPageMeta` and `watchPageMeta` are the fifth.

## Use it

Put the header inside the page's top bar, as one more row of it (it has no background and no bar of its own), and the credit line last on the page, above the family footer.

```html
<header class="top">
  <h1>Hoshi Stars</h1>
  <kazoku-language-picker address></kazoku-language-picker>
  <kazoku-page-header name="Hoshi Stars" what="The 88 constellations" what-ja="88の星座"
    description="A picture of each of the 88 constellations, with its neighbours."
    description-ja="88の星座それぞれの絵を、となりの星座といっしょに見られます。" sheets="kids.html" meta></kazoku-page-header>
</header>

<kazoku-page-credits credits="Stars: Yale Bright Star Catalogue, public domain. Constellation lines: our own drawing."
  credits-ja="星：イェール輝星星表（パブリックドメイン）。星座線：自作の図です。" href="NOTICE.html"></kazoku-page-credits>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/page-frame/define";
</script>
```

Both elements read the page's `lang` (the language picker writes it on `<html>`) and say their words again when it changes. An attribute with `-ja` after its name (`what-ja`) is the Japanese; a language without one gets the English.

## The header line

| Attribute | What it is |
|---|---|
| `name` | The package's name: "Hoshi Stars". |
| `what` | What this page shows, in plain words for a person who has never heard of the package. A few words: it is also the end of the page's title. |
| `description` | The page's description, one or two sentences. Used by `meta`. |
| `home` | The demo's home page. `index.html` unless you say. Home is marked as the current page on the home page (`aria-current="page"`). |
| `sheets` | The printable sheets. Without it there is no Sheets link. |
| `meta` | Also set the document's `<title>` and description from these words, in the reader's language, each time it changes. |

The line reads "Hoshi Stars: The 88 constellations" (a full-width colon in Japanese). The links are a 48 px row; on a phone the line takes the width and the links go under it. `element.texts = { en: { name, what, description }, ja: { … } }` takes the same words as one table, and `element.words = { sheets: "Sheets to print" }` changes the words of Home and the sheets link.

## The credit line

`credits` is this page's own line, `href` is a link to the NOTICE or credits page, and you can give both: the line, then the link "Data and credits". A line alone is led by "Data and credits:". It is always shown, never in a fold, at 15 px in the page's ink colour (never a pale grey).

`embed` is the form for a page that sits inside someone else's site: the credit only, at 13 px, with the link inline and underlined. An embed page has the credit line and no header.

| Attribute | What it is |
|---|---|
| `credits`, `credits-ja` | This page's credit line. |
| `href` | A link to the full credits. |
| `embed` | The small form. |

## A real title and description

The title, the description and the header line are made from the same words, so they cannot disagree. A build writes them into the HTML, so the built file carries them before any script runs:

```js
import { pageHeadHtml, pageHeaderHtml, pageCreditsHtml } from "@johnmorrisdotca/kazoku-ui/page-frame";

const TEXTS = {
  en: { name: "Hoshi Stars", what: "The 88 constellations", description: "A picture of each of the 88 constellations." },
  ja: { name: "星 Hoshi Stars", what: "88の星座", description: "88の星座を、それぞれ絵で見られます。" },
};
const head = pageHeadHtml(TEXTS); // <title>Hoshi Stars: The 88 constellations</title><meta name="description" …>
const header = pageHeaderHtml(TEXTS, { sheets: "kids.html", meta: true });
const credits = pageCreditsHtml({ en: "Stars: Yale Bright Star Catalogue." }, { href: "NOTICE.html" });
```

`pageHeaderHtml` and `pageCreditsHtml` write the tags with their attributes and the same words inside, which show until the script loads and without script. `pageTitle(text, language)` is the title on its own. In the browser, `applyPageMeta(document, TEXTS, "ja")` sets the title and description once, and `watchPageMeta(document, TEXTS)` keeps them in step with `<html lang>` and returns a function that stops it. `pickText(TEXTS, "ja")` is the table's words for a language, else the English, and `escapeHtml` writes text into HTML.

## Check a built page

`pageProblems(html, { embed })` reads one page's HTML and returns what is wrong with it, as lines of text: no `<title>` in the HTML, no description of a sentence, no header, a header with no `what`, no credit line, a credit line with neither `credits` nor `href`, or an embed page whose credit line is not the `embed` form. A package's own test runs it over every page its build wrote (`site/*.html`), leaving out test pages:

```js
import { readFileSync, readdirSync } from "node:fs";
import { pageProblems } from "@johnmorrisdotca/kazoku-ui/page-frame";

for (const name of readdirSync("site").filter((file) => file.endsWith(".html"))) {
  const problems = pageProblems(readFileSync(`site/${name}`, "utf8"), { embed: /^embed/.test(name) });
  if (problems.length > 0) throw new Error(`${name}: ${problems.join("; ")}`);
}
```

`templates/check-standard.mjs` holds the same rule at the source: its `page-frame` item asks that every `demo/*.html` page, other than embed and test pages, uses the header and the credit line (the tags, or the placeholders `<!--frame:header-->` and `<!--frame:credits-->` that a build replaces with `pageHeaderHtml` and `pageCreditsHtml`) and has a title (or `<!--frame:head-->`). [The package standard](../package-standard.md) says how a package adopts it.

## Registering the tags

Importing `page-frame/define` registers both tags, leaving a taken tag alone. `definePageFrame(registry)` does the same for a registry you pass, and `PageHeaderElement` and `PageCreditsElement` (from `page-frame/element`) are the classes, to extend or define under your own tag. `TAG` is `kazoku-page-header` and `CREDITS_TAG` is `kazoku-page-credits`. `samePage(href, base)` is the rule for "this link is the page it is on".

Under a strict Content-Security-Policy the styles are adopted as a constructable stylesheet, so `style-src 'self'` is enough; a browser that cannot adopt one uses a `<style>` carrying the element's `nonce`. The look follows the family's variables (`--kazoku-ink`, `--kazoku-surface`, `--kazoku-line`, `--kazoku-accent`) and one more, `--kazoku-muted`, for the embed form's colour.

## What it does not do

It does not draw the page's heading (the page has its own `<h1>`), it does not choose where the sheets or the credits live, and it never hides the credit line in a fold. [The demo](https://johnmorrisdotca.github.io/kazoku-ui/page-frame.html) shows the three forms of the credit line.
