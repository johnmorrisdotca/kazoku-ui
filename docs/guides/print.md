---
title: Print layout
section: how-to
order: 21
description: A printable sheet for any package: A4, US Letter, A3 and Tabloid pages with safe margins, a header, an info box and a footer with a QR code, a poster tiled over pages with cut marks, large type for children, and a Print / save PDF button that needs no PDF library.
---

The print part builds a printable sheet: pages of exactly the paper's size with home-printer-safe margins, a header (the brand, the package, the title and a "Name:" box), an info box, a footer (credits, version, date, the address as a QR code and as text, the page number), and a poster cut over several pages with cut marks. It has two type presets, `kid` (large and round) and `normal`. It never draws a package's picture: the page puts its own picture (an SVG is best) into the sheet.

The brand text is passed in. The part has no name of its own on the paper, so each package prints its own.

## Use it

```js no-check
import { buildSheet, printCss, printSheet } from "@johnmorrisdotca/kazoku-ui/print";

const style = document.createElement("style");
style.textContent = printCss({ page: "a4", type: "kid", language: "en" });
document.head.append(style);

const sheet = buildSheet({
  page: "a4",
  type: "kid",
  language: "en",
  brand: "Space Program X",
  packageName: "My planets",
  title: "The planets",
  info: { region: "The Solar System", season: "All year", level: "Grades 1 to 6", language: "English" },
  credits: "Pictures and facts: public domain.",
  version: "1.2.0",
  date: new Date(),
  address: "https://example.com/planets/",
  pages: [pictureForPageOne],
});
document.querySelector("#preview").append(sheet);
document.querySelector("#print").addEventListener("click", () => printSheet(sheet));
```

`buildSheet` returns one `.kazoku-sheet` holding a `.kazoku-page` for each page. Each page is a box exactly the size of the paper, so the preview on screen is the page on paper. The sheet is built from plain DOM calls and `textContent`: the strings you pass are never read as HTML.

## Page sizes

| Name | Size in millimetres (tall) |
|---|---|
| `a4` | 210 × 297 |
| `letter` (US Letter) | 215.9 × 279.4 |
| `a3` | 297 × 420 |
| `tabloid` (A3's US cousin, 11 × 17 in) | 279.4 × 431.8 |

`PAGES` holds the sizes, `PAGE_NAMES` the names, `pageSize(page, orientation)` the whole page and `printableSize(page, orientation, marginMm)` what is left inside the margins. `orientation` is `"portrait"` (tall, the default) or `"landscape"` (wide).

## Margins

Home printers cannot print right to the edge: most stop 3 to 6 mm short. The margin is `DEFAULT_MARGIN_MM`, 12.7 mm (half an inch), on every side, and nothing the sheet needs sits nearer the edge. A smaller `marginMm` is raised to `MIN_MARGIN_MM`, 8 mm. The page rule is `@page { size: ...; margin: 0 }` and the margin is the page box's own padding, so Chrome, Safari and Firefox agree.

`layoutOf(options)` turns whatever it is given into a full layout (`DEFAULT_LAYOUT` is the starting point): an unknown paper becomes A4, an unknown orientation tall, an unknown type `kid`.

## The header, the info box and the footer

| Option | Where | What |
|---|---|---|
| `brand` | Header | The first line, such as the family's name. Passed in, never built in. |
| `packageName` | Header | The package's name, under the brand. |
| `title` | Header | The sheet's title, as an `h1`. |
| `nameBox` | Header | The "Name:" box a child writes in (on by default; `false` leaves it out). The box has a thick line. |
| `info` | Under the header of page 1 | `region`, `flagSrc` and `flagAlt` (a picture), `latitudeBand`, `season`, `level`, `language`, and `more` for boxes of your own. A box with no value is left out. |
| `credits`, `version`, `date` | Footer | The credits line, the version and the date. A `Date` is written as `YYYY-MM-DD` by `isoDate`; a string is written as it is. |
| `address` | Footer | The address, as a QR code and as text under the credits. |
| `pages` | Body | One node for each page. |
| `poster` | Body | A poster to tile instead of `pages`. |
| `tileFooter` | Tile pages | `"none"` (the default), `"ends"` or `"all"`: the address as text and a small QR code in the bottom margin of a poster's tile pages. See below. |
| `pageNumber` | Footer, tile pages | `"always"` (the default), `"many"` or `"never"`: whether the page number is printed. |
| `words` | | Your own words for any label. |

The footer of every page has its page number: "Page 2 of 3" in English, "2 / 3 ページ" in Japanese, from `pageOf`. A one-page sheet, such as a certificate, does not need "Page 1 of 1": `pageNumber: "many"` prints the number only when there is more than one page, and `pageNumber: "never"` leaves it off always. It applies to a poster's tile pages too.

## Type for children

`TYPE_PRESETS` holds two presets. They are CSS custom properties on the sheet (`--kz-name`, `--kz-body`, `--kz-line`), so your own pictures can use them.

| | `kid` | `normal` |
|---|---|---|
| Title | 40 pt | 24 pt |
| Names (`.kazoku-name`) | 28 pt (never under 24) | 14 pt |
| Body | 18 pt | 11 pt |
| Fine print (credits, address) | 10 pt | 8 pt |
| The sheet's lines | 3 mm (never under 2.5) | 0.4 mm |
| Font | Rounded system fonts, with Hiragino Maru Gothic for Japanese | The system font |

Put a name in an element with the class `kazoku-name` and it is as large as the preset says. Draw your own lines at `var(--kz-line)` thick in the same way.

## A poster over several pages

```js
import { tilePoster } from "@johnmorrisdotca/kazoku-ui/print";

const plan = tilePoster({ widthMm: 400, heightMm: 300, page: "a4", overlapMm: 10 });
console.log(plan.pages, plan.columns, plan.rows);
// 6 3 2
```

```js no-check
const sheet = buildSheet({ page: "a4", title: "Big planet poster", poster: { content: posterSvg, widthMm: 400, heightMm: 300 } });
```

`tilePoster` says how many pages the poster needs and which part each page prints. Each page's window is the printable area. The pages step by the window less `overlapMm` (10 mm by default), so every page repeats exactly that much of the one before it. That strip is the glue strip: it is shaded and dashed, and labelled "Glue strip" (のりしろ). The last column and row are cut off at the poster's edge. A poster that fits in one window is one page. A poster of no size, or an overlap as big as a window, throws a `RangeError`.

Every tile page has cut marks, one line along each edge at each corner of the window pointing out into the margin, made by `cutMarks(page, orientation, marginMm)`, and a line of words on how to cut and glue. The poster's `content` is copied once for each page, so use an SVG or HTML. A canvas does not survive being copied: draw it to an SVG `<image>` first.

A tile page has no footer, only its margin, so the address and the QR code are an option: `tileFooter: "all"` puts them in the bottom margin of every tile (it needs `address`), and `tileFooter: "ends"` only on the first and the last tile. The code is as tall as the margin allows less 2 mm (10.7 mm at the default margin) with a quiet zone of 1 module, so it is small: it scans from a hand's length, not from across the room. The cut instruction on those tiles is set smaller to make room. The window, and so the tiling, does not change.

## Fit a picture to a page

```js
import { fitToPage } from "@johnmorrisdotca/kazoku-ui/print";

const fit = fitToPage({ page: "a3", widthMm: 1200, heightMm: 800 });
console.log(fit.orientation, fit.widthMm, fit.heightMm);
// landscape 394.6 263.067
```

`fitToPage({ page, widthMm, heightMm, orientation, marginMm })` scales a picture to the printable area of a paper size, keeping its shape. It returns the `orientation`, the scaled `widthMm` and `heightMm`, the `scale` (it is more than 1 for a picture smaller than the page) and `offsetXMm` and `offsetYMm`, which centre the picture in the printable area. `orientation` is `"auto"` by default and takes the turn that makes the picture larger (a square or a tie stays tall); `"portrait"` or `"landscape"` keeps the turn you give. Pass the result to `buildSheet` and a poster is one page: `buildSheet({ page: "a3", orientation: fit.orientation, poster: { content, widthMm: fit.widthMm, heightMm: fit.heightMm } })`. A picture of no size, or margins that leave no area, throw a `RangeError`.

## The QR code

`qrMatrix(text)` is a QR code encoder written for this package, with no dependency: byte mode (UTF-8), error-correction level M, versions 1 to 20, so up to `MAX_BYTES` (666) bytes, and the mask chosen by the standard's four penalty rules. It gives the modules as rows of booleans, `true` being dark. `qrSvg(text, { quiet, dark, light })` gives an SVG string, in modules, with a quiet zone of 4. Text too long throws a `RangeError`; `buildSheet` then prints the address as text only.

The encoder is held by known answers: the Reed-Solomon codewords of the standard's "HELLO WORLD" example, a full 21 × 21 code, the hashes of codes drawn by a reference encoder from version 2 to version 20 (all eight masks too), and a decoder written in the test from the standard that reads the format, unmasks, checks every block's error correction and returns the text.

## Print / save PDF

```js no-check
import { openPrintView, printSheet } from "@johnmorrisdotca/kazoku-ui/print";

printSheet(sheet);                      // the print-only copy, then window.print()
const view = openPrintView(sheet);      // the copy alone, to drive the print yourself
view.close();
```

`printSheet` makes a print-only copy of the sheet, a child of `<body>` with the class `ROOT_CLASS` (`kazoku-print-root`), hides it on screen, puts `ROOT_ATTRIBUTE` (`data-kazoku-print`) on `<html>` so that on paper everything else is hidden, calls `window.print()` and removes the copy when `afterprint` comes. The browser's print dialog saves a PDF too ("Save as PDF"), so there is no PDF library. `openPrintView` makes the copy and the page rules without printing, and its `close()` removes them. `layoutFromSheet` reads the layout back from the data attributes the sheet carries (`LAYOUT_ATTRIBUTES` names them). `printCss(layout)` is all the CSS: the page rule, the print-only rules and the look of the sheet.

## The words

`WORDS` has the labels in English and Japanese, every key in both: the Name label, the info box's labels, version, date, address, the page number, the glue strip, the cut instruction and the button's text (`wordsFor("ja").button` is "いんさつ / PDFで ほぞん"). The Japanese is plain, mostly hiragana, for children. `languageOf("ja-JP")` is `"ja"`, anything else `"en"`. The part is import-safe on a server: nothing touches the DOM until `buildSheet`, `openPrintView` or `printSheet` is called.

## Tested

The maths is in unit tests (the sizes, the margins, the tiling, the cut marks, the QR code). The demo, `print.html`, is tested in Chromium and WebKit; in Chromium it is also printed to a PDF with `page.pdf()` for A4, US Letter, A3 and Tabloid, and the PDF is read for its paper size and its page count (one page for the sheet, the tile count for the poster).
