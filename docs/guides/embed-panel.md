---
title: The embed panel
section: how-to
order: 16
description: One "Put it in your page" panel for every package of the family, with a compact picker, a size, a tab for each way a page is made, a live picture that fits its box, Copy, the embed page, the docs and the credit line.
---

`<kazoku-embed-panel>` is the family's one "Put it in your page" panel. A package gives it the things a reader can embed, the code for each way a page is made and the picture that code makes; the panel supplies everything around them, so every package's panel looks, reads and works the same. It draws nothing of the package's own.

![The panel in the demo: a picker of fourteen badges in three groups with a search box, the size buttons, the ring choice, eight tabs from HTML to Image address, the picture of the badge beside its code, Copy, Open the embed page, Read the docs, Download the SVG and the credit line](../images/embed-panel-light.webp)

What is in it, top to bottom:

- **A compact picker** for the thing being embedded: chips for the groups, a search box (from twelve things up) and a wrapping list of buttons that scrolls inside its own box. Or your own picker, in the `picker` slot.
- **A size**: 160, 240, 320 or 480 pixels by default, as buttons.
- **Your own choices**, in the `options` slot: a package's "Turning", "Look" or "Ring" sits here, so nothing a package had is lost.
- **A tab for each way a page is made**: HTML (a script tag from a CDN), ES module, React, Vue, Angular, Svelte and iframe, and any tab you add (an image address, an SVG).
- **The picture beside the code**, built from the same choices, scaled to fit its box at every size and on every screen.
- **Copy**, with its name written on it, and a polite "Copied" beside it. **Open the embed page**. **Read the docs**. Your own buttons (Download, Save PNG) in the `actions` slot.
- **The credit line** the picture needs.

## Use it

```html
<kazoku-embed-panel id="panel" kinds="html module react vue angular svelte iframe" open-href="embed.html" docs-href="docs/"></kazoku-embed-panel>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
  import { embedSnippet } from "@johnmorrisdotca/kazoku-ui/embed-panel";

  const panel = document.getElementById("panel");
  const spec = (size, preview) => ({
    package: "@scope/dial",
    cdn: "https://cdn.jsdelivr.net/npm/@scope/dial@1.0.0",
    tag: "scope-dial",
    element: "element",
    entries: [],
    attrs: [["value", "7"], ...(size === 320 ? [] : [["size", String(size)]])],
    name: "dial",
    iframe: { src: `${preview ? "" : "https://example.com/dial/"}embed.html?value=7`, title: "Dial", width: size, height: size },
  });
  panel.generate = ({ kind, size, preview }) => embedSnippet(kind, spec(size, preview));
  panel.preview = ({ kind }) => {
    if (kind === "iframe") return undefined;
    const box = document.createElement("div");
    box.textContent = "7";
    box.style.cssText = "width: 100%; height: 100%; display: grid; place-items: center; font-size: 4rem";
    return box;
  };
  panel.credits = "Dial drawn by the package's author (MIT).";
</script>
```

The credit line can link what it names: give `credits` its pieces, a text or `{ text, href }`, or a function of the choices that returns them. A licence and its source can then each be a link, as CC BY asks:

```js no-check
panel.credits = [
  "Flag: ",
  { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" },
  ", ",
  { text: "Wikimedia Commons", href: "https://commons.wikimedia.org/wiki/File:Flag_of_Saint_Barthelemy_(local).svg" },
];
```

A link is kept only when its address is http, https or on the page's own site; any other address shows as its text. The links are the `credit-link` part, and the credit is never in the code the reader copies.

`generate` is the one thing the panel cannot do without: it is the text of the tab shown. `preview` returns the picture (a node), or nothing: the iframe tab then draws the iframe of the text, so a package need only write its live picture. Call `panel.update()` whenever the package's own choices change (a look, a colour, a toggle); the panel reads everything again and rebuilds the picture only when what it shows has changed.

## The code for each way a page is made

`embedSnippet(kind, spec)` writes all seven from one description of the element, so a package does not write seven generators:

| `kind` | What it writes |
|---|---|
| `html` | A `<script type="module">` for the element and each entry from jsDelivr (`+esm`), then the tag. |
| `module` | `import` lines, then the element made with `document.createElement` and its attributes set. |
| `react` | A component that imports the element in an effect (never at the top, so a server render is safe) and returns the tag. |
| `vue` | A single-file component that imports it in `onMounted`. |
| `angular` | A standalone component with `CUSTOM_ELEMENTS_SCHEMA` that imports it in the browser only. |
| `svelte` | A component that imports it in `onMount`. |
| `iframe` | The embed page as an `<iframe>` at the size chosen, lazy and without a border. |

`EMBED_KINDS` lists them in the order the tabs show. `SnippetSpec` is the description: `package` and `cdn` (with its version), `tag`, `element` (the subpath that defines the tag, or an empty text for the main entry), `entries` (more subpaths, for data or looks), `attrs` (a value of `""` is a bare attribute), `name` (for `Dial`, `DialComponent` and `#dial`) and `iframe`. `attrText(attrs)` writes the attributes as they stand in a tag. A tab that is not one of the seven (an image address, an SVG) is the package's own: put its id in `kinds`, give its words in `labels`, and `generate` answers for it.

Leave a choice out of the code when it is the element's own default (the demo above leaves `size` out at 320): the code stays short and a later default change reaches the reader.

The text for the **picture** (`preview: true`) may differ from the text the reader copies: write the iframe's address relative there (`embed.html?…`) so the picture works from wherever the demo is served, and the full address in the copied code.

## The compact picker

```html
<kazoku-embed-panel id="things" no-preview no-size kinds="html"></kazoku-embed-panel>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
  const panel = document.getElementById("things");
  panel.items = [
    { id: "mars", label: "Mars", group: "Planets" },
    { id: "deimos", label: "Deimos", group: "Moons", words: "moon of Mars" },
    { id: "sun", label: "Sun" },
  ];
  panel.generate = () => `<scope-dial thing="${panel.value}"></scope-dial>`;
  panel.addEventListener("kazoku-embedchange", ({ detail }) => console.log(detail.reason, detail.value));
</script>
```

`items` is a list of `PickItem`: an `id`, a `label`, an optional `group` (the chips above the list; an item with none is only under All) and optional `words` the search also reads. There is one button per item, pressed when it is the `value`; the chips and the search narrow the list without choosing anything, and a press changes `value`, the code and the picture and tells the page (`reason: "pick"`). The search ignores case and accents and needs every word typed. It shows from twelve items (`SEARCH_FROM`); `search` and `no-search` override that. `renderItem` puts a small picture inside a button. `filterItems` and `groupsOf` are the same logic without the element. A package with a richer picker of its own (tiles with live thumbnails) puts it in the `picker` slot and keeps it.

## A package's own choices and buttons

```html
<kazoku-embed-panel id="own" no-preview>
  <div slot="options"><button type="button" id="turn">Turning</button></div>
  <button slot="actions" type="button" id="save">Download the SVG</button>
</kazoku-embed-panel>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
  const panel = document.getElementById("own");
  let turning = false;
  panel.generate = () => `<scope-dial${turning ? " turn" : ""}></scope-dial>`;
  document.getElementById("turn").addEventListener("click", () => {
    turning = !turning;
    panel.update();
  });
</script>
```

The slots keep what a package had before the shared panel. `options` sits between the size and the tabs (a Look, Turning or Ring choice, with its own state: call `update()` after it changes); `actions` sits beside Copy (Save SVG, Save PNG, Download); `lede` is a line under the heading; `picker` replaces the built-in picker. A line above the code for the tab shown ("The embed page is for a site that cannot run script.") is `note`, a text or a function of the choices; the credit is `credits`, the same.

## A package that draws nothing

A package with no picture (a table of data, a calculator with no element) adds `no-preview` and `no-size`, lists the tabs that make sense (`kinds="html module"`), and says so in its README. It still gets the picker, Copy, the docs link and the credit. A panel is never left out of a package's demo because it has nothing to draw.

## Attributes and properties

| Attribute | |
|---|---|
| `kinds` | The tabs, `html module react vue angular svelte iframe` by default. Add your own ids (`image`). The property `kinds` takes a list or a text. |
| `kind` | The tab to start on (the first by default). |
| `sizes`, `size` | The size buttons (whole numbers from 16 to 4096, `160 240 320 480` by default) and the one to start on (320). `no-size` leaves the choice out. A size that is not a button takes the nearest. |
| `value` | The picker's choice (an item's `id`). It follows the reader's choice, so the attribute is always true. |
| `open-href`, `docs-href` | Where Open the embed page and Read the docs go. An empty one hides its button. `panel.openHref` follows the choices (set it when they change). |
| `aspect` | The picture's height over its width: 1 by default. |
| `no-preview` | No picture. |
| `heading` | Shows the shared heading, "Put it in your page" (自分のページに入れる). |
| `search`, `no-search` | Force the picker's search box on or off. `pick-label` names the picker. |
| `address`, `kind-key`, `size-key` | Keep the tab and the size in the address (`?embed=react&size=240`; the starts leave it) and read them back; other parameters are kept. |
| `lang`, `theme` | `en` or `ja`; `light` or `dark`. Otherwise the nearest `lang` and the page's own colours. |

Properties: `generate`, `preview`, `credits`, `note` (as described), `items`, `renderItem`, `labels` (names for tabs the family has no word for), `words` (your own words over the language's), `kind`, `size`, `value`, `kinds`, `sizes`, `openHref`, `docsHref`, `code` (the text of the tab shown) and `update()`. A property set before the tag is defined still reaches the element. Colours are the family's custom properties (`--kazoku-ink`, `--kazoku-surface`, `--kazoku-line`, `--kazoku-accent`); `--kazoku-preview-bg` is the colour behind the picture (the surface by default; a dark sky for a planet) and `--kazoku-preview-width` the picture's column (260px). The parts are `panel`, `title`, `picker`, `chip`, `search`, `items`, `item`, `size`, `size-button`, `tabs`, `tab`, `preview`, `note`, `code`, `copy`, `open`, `docs` and `credits`.

## The events

`kazoku-embedchange` (bubbles, crosses shadow roots) says what the reader chose: `detail.kind`, `detail.size`, `detail.value`, `detail.code` and `detail.reason`, one of `init` (once, when it comes up), `kind`, `size`, `pick` or `set` (a property or an attribute). `update()` tells no one, because the page called it. `kazoku-embedcopy` is sent after Copy, with the kind, the size and the code. When the browser will not copy (a blocked clipboard), the code is selected and the panel says to copy it by hand.

## The picture always fits

The picture is laid out at the size chosen and then scaled down to the width its box has, so it is never cut off: a 480 pixel picture in a narrow box, or on a phone, is the whole picture, smaller. A picture wider than its size (a planet with its moons, a ring) is measured and fitted whole. The box follows the panel's own width, not the window's: under 640 px the picture sits above the code.

## Without the element

```ts
import { embedSnippet, filterItems, groupsOf, parseKinds, parseSizes, nearestSize, EMBED_KINDS } from "@johnmorrisdotca/kazoku-ui/embed-panel";

console.log(EMBED_KINDS.length);
console.log(parseKinds("html, React image"));
console.log(parseSizes("480 160 160"));
console.log(nearestSize(500, [160, 240, 320, 480]));
console.log(groupsOf([{ id: "a", label: "A", group: "One" }, { id: "b", label: "B", group: "Two" }]));
console.log(filterItems([{ id: "mars", label: "Mars" }, { id: "sun", label: "Sun" }], "ma").length);
console.log(embedSnippet("iframe", { package: "p", cdn: "c", tag: "x-y", element: "", entries: [], attrs: [], name: "y", iframe: { src: "e.html", title: "T", width: 160, height: 160 } }).includes('width="160"'));
// 7
// [ 'html', 'react', 'image' ]
// [ 160, 480 ]
// 480
// [ 'One', 'Two' ]
// 1
// true
```

The module imports on a server: nothing in it touches the page. The labels (`WORDS`, `wordsFor`, `languageOf`, `kindLabel`) are in English and Japanese, every key in both. Their table is in [Labels](../labels.md). `DEFAULT_KINDS`, `DEFAULT_SIZES`, `DEFAULT_SIZE`, `KIND_ADDRESS_KEY` (`embed`) and `SIZE_ADDRESS_KEY` (`size`) are the defaults.

## Accessibility

The tabs are a tab list: Left and Right move between them (round at the ends), Home and End go to the first and last, and only the tab shown is in the tab order. The size buttons and the picker's buttons are buttons with a pressed state, never a menu; every one is at least 48 px square. The code box can be focused and scrolled by keyboard. "Copied" and "Nothing matches" are announced politely. Colours come from the family's, in light and dark, and the pressed and Copy buttons keep a contrast of at least 4.5 to 1 in both.

## Adopting it in a package

1. `npm install --save-dev @johnmorrisdotca/kazoku-ui` (a dependency only if the package's own element imports it).
2. Replace the demo's "Put it in your page" with `<kazoku-embed-panel>`, keep every choice the old one had (`options`, `actions`, `picker`, `note`, `credits`) and fill `generate` and `preview`.
3. List what the old panel had before you start and check every item is still there afterwards: the choice of the best part of each in [the survey](../embed-panel-survey.md).
4. Run kazoku-ui's `check-standard.mjs`: the `embed-panel` item is on the family's must-have list.

## A package's builder page

The family's shared files hold the builder page that most packages have (`builder.html`, "The code"): `familyEmbedBuilder` in `scripts/family-template.mjs`. Its source is kazoku-ui's `templates/family-template.mjs` (FAMILY_TEMPLATE_VERSION 2026-11-11), copied unchanged into each package. When the builder page holds the panel, the builder fills it: a tab for each way a page is made that the maker offers, with the builder's own names (Custom element, iframe, ES module, React 19, Vue, Svelte, Angular, Plain HTML, iframe URL), the code of the choices that differ from the defaults, Copy, Open the embed page with the choices, the note that only differing choices are in the code, and the builder config's `docsHref` and `credits`. The panel shows no picture and no size of its own: the builder's preview and its choices (a size among them) are the package's. The tab shown is kept in the address as before (`show=`). A builder page without the panel keeps its own code section, so a package moves when it is ready.

The code section of `builder.html` becomes the panel, with the builder's two buttons in its `actions` slot:

```html no-check
<section class="more family-bld-code" aria-labelledby="bld-code-title">
  <h2 id="bld-code-title" data-say="codeTitle"></h2>
  <p data-say="codeText"></p>
  <kazoku-embed-panel id="bld-embed" data-testid="bld-embed">
    <button class="fam-button" slot="actions" id="bld-link" type="button" data-say="copyLink" data-testid="bld-link"></button>
    <button class="fam-button" slot="actions" id="bld-reset" type="button" data-say="startAgain" data-testid="bld-reset"></button>
  </kazoku-embed-panel>
  <p class="fam-fine" id="bld-copied" data-testid="bld-copied" aria-live="polite"></p>
</section>
```

The page's script defines the panel (`import "@johnmorrisdotca/kazoku-ui/embed-panel/define"`, or the site's copy of kazoku-ui's `dist/embed-panel/define.js`) before it mounts the builder.
