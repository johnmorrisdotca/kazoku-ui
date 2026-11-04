# The embed panel: what each package has today, and which does each part best

Written for KAZOKU-UI-40 and KAZOKU-UI-30 on 2026-11-03 (John: "if we do it better elsewhere then we should also use that as a template", and "KAZOKU-UI-40 has to make things better and not take away"). Every package's published demo and its source on `origin/main` were looked at on that day; the table below says what each package's "Put it in your page" (or its builder's code section) has, so that adopting `<kazoku-embed-panel>` loses nothing. The shared panel is built from the best version of each part, wherever it is done best, and a package whose own panel does something better than the panel does gets the panel changed, not the package brought down.

**Which package is the family's north star is John's call.** This survey takes wakusei-planets as the model, because its panel has the most parts (a size, seven tabs, a picture from the same choices, Copy, the embed page, the docs and the credit line, and a picker of its own), and senshu-jerseys and the family embed builder for the parts they do better. John may name another.

## The best of each part

| Part | Done best by | Why, and what the shared panel took |
|---|---|---|
| The tabs | wakusei-planets: HTML, ES module, React, Vue, Angular, Svelte and iframe as a real tab list (arrow keys, the choice kept in the address as `?embed=`) | The seven the family needs and no others to scroll through. Taken whole, with Home and End added; a package adds its own (an image address, an SVG, an iframe URL). |
| The code for each tab | wakusei-planets' `embedCode` (one description of the element, seven generators, imports only in the browser) | It is the one set that is parsed or built by a test for every tab. Taken byte for byte as `embedSnippet`, so every package has it. |
| The size | wakusei-planets and dougu-sports: a row of buttons (160, 240, 320, 480), the size in the code only when it is not the default | No dropdown, and the picture follows. Taken as `sizes`, kept in the address as `?size=`. |
| The picture | dougu-sports' stage ("the code, running") and wakusei-planets' picture built from the same choices | The picture is the code, not a second drawing. Taken, with the one thing neither does: it is scaled to fit its box (wakusei's Venus overflowed its box and was cut off on the right). |
| The picker | wakusei-planets: group, then planet, then body, as picture tiles | The reader changes the thing without scrolling away from the code. Taken as the built-in picker (chips by group, a search box from twelve things up, buttons that scroll in their own box) and as the `picker` slot, so wakusei's tiles stay. |
| Copy | wakusei-planets, senshu-jerseys, uchusen-rockets: a primary button with its word on it, and a polite status ("Copied") beside it | The blank Copy pill of MODULES-286 is not possible any more: the word is part of the button. "Copy code" (the family builder's word, in 日本語 コードをコピー). When the clipboard is blocked the code is selected and the panel says to copy by hand. |
| Open the embed page | uchusen-rockets and wakusei-planets: a link that follows the choices, in a new tab | The reader sees the page the iframe will show, with their choices. Taken as `open-href`. |
| Read the docs | wakusei-planets | A link beside Copy; hidden when a package has none. Taken as `docs-href`. |
| The credit line | uchusen-rockets: shown only for what is in the picture (a painted rocket's credit from the parts showing); wakusei-planets: the same for the look and the body | A credit that is true to what is drawn. Taken as `credits`, a text or a function of the choices. |
| A note on a tab | senshu-jerseys and uchusen-rockets: one line above the code | "The embed page is for a site that cannot run script." Taken as `note`. |
| A package's own choices | dougu-sports (Turning: Still, By hand, By itself), senshu-jerseys (turnable) | Kept in the `options` slot, with the package's own state: nothing a package had is lost. |
| A package's own buttons | uchusen-rockets (Save SVG, Save PNG), dougu-sports and senshu-jerseys (Download), the family builder (Copy a link to this setup, Start again) | Kept in the `actions` slot beside Copy. |
| Only what differs from the defaults is in the code | The family embed builder ("Only choices that differ from the defaults are included in the code.") and wakusei-planets (320 left out) | A short code that keeps following the package's defaults. A rule for every `generate`, written in the guide. |
| More tabs for a package's own ways | hata and the family builder: `img`, `data`, `url` (an iframe address); uchusen-rockets: `svg`, `data`, `link` | The tab ids are the page's: `kinds="html module react vue angular svelte iframe image"`, with `labels` for the words. |
| The segmented pill look of the tab strip | meigen-sports' builder | A single rounded strip is easy on a phone; the shared tabs are separate pills that scroll sideways, which is what wakusei, dougu and the family builder do, so meigen's strip is a look, not a part. |

## Reading the table of packages

The row for each package says what its "Put it in your page" (or the code section of its builder page) has on 2026-11-03: **where** it is; **tabs** (the ways a page is made it shows); **size**; **picture** (a live picture made from the same choices); **Copy** (what the button says); **links** (Open the embed page, Read the docs); **credit**; and **extras** that must survive the move. A dash is "not there". "Family builder" is the shared embed builder (`familyEmbedBuilder` in each repo's `scripts/family-template.mjs`, the same file in every repository): nine tabs (element, iframe, module, react, vue, svelte, angular, html, url), a live preview, "Copy code", "Copy a link to this setup" and "Start again", and no size and no docs link. Every package that uses it gets the panel when the builder's code section does, so that is one change (a ticket on the kazoku-ui board) and then one pull of the template per package.

## The packages that use the family embed builder

The code section of each builder page (`builder.html`, "The code") is the family embed builder's: an underlined strip of tabs (Custom element, iframe, ES module, React 19, Vue, Svelte, Angular, Plain HTML, iframe URL), the code in a light box, a dark **Copy code** pill, a note ("Only the choices that differ from the defaults are in the code"), and above it, beside the live preview, **Copy a link to this &lt;thing&gt;** and **Start again**. It has no size row (a size is one of the builder's own options), no picker inside the code section (the builder's groups sit beside the preview), no Open the embed page, no docs link in the section (the page header has Docs) and no credit line. To keep when the panel takes the code section: the nine tabs and their words, Copy a link and Start again (the `actions` slot, or beside the preview where they are now), and "only what differs from the defaults".

| Package | Differences from that |
|---|---|
| address-plus, bushu, chizu, hikidashi, hitotsu, jarajara, jirai, karakuri, kazu, korokoro, kotoba, kumimoji, kuni, meikyuu, narabe, sugoroku, suido, tane, tenka, tobiishi, toranpu, tsunagi | none: the nine tabs, Copy code, Copy a link, Start again. Their index pages hold the game or the tool itself, with a Docs link and, in some, a "Build an embed" link to the builder (address-plus, hitotsu, tenka). chizu's index also has "Put this map on your page" with a Copy of the map's SVG. korokoro's and meikyuu's builders have their own tabs for what to build (History, Stats, Odds; Arrows, Labyrinth) above the same code section. |
| fuda-cards | the nine tabs without Plain HTML; Look, Words, Material, Stack, Wear, Motion and Pile are the builder's option tabs; "Copy the code" and "Copy a link to this card". (Not part of this run.) |
| hata | eleven tabs: adds `<img>` and `data: URI` (hata's own image forms); "Copy a link to this flag". |
| kyuubu | only five tabs (ES module, React 19, Vue, Svelte, Angular): no Custom element, iframe, Plain HTML or URL, though it has `demo/embed.html`. |
| domino, gunjin, houseki | domino: "Copy the code", "Copy link to this deal" and "Copy the game" on the index, no tabs and no embed page; gunjin and houseki: no panel and no embed page. |

## The packages with a panel of their own

| Package | Where | Tabs | Size | Picture | Copy | Links | Credit | Extras to keep |
|---|---|---|---|---|---|---|---|---|
| wakusei-planets | index "Put it in your page"; the same on `builder.html` and `portrait.html` | HTML, ES module, React, Vue, Angular, Svelte, iframe (arrow keys; `?embed=`) | 160, 240, 320, 480 (`?size=`) | the body, from the same choices; it overflowed its box (Venus) | "Copy", a dark pill (MODULES-286 reported its word unreadable; a test now holds that it can be read) | Open the embed page, Read the docs | yes, from the look and the body | the body picker (tiles; group, planet, moon) |
| chikyu-earth | index: one iframe; `builder.html` | index: iframe only. Builder: HTML, Module, React, Iframe | builder: 240, 320, 420, 560 | the globe above the code | index: none (no Copy button); builder: Copy | Open the embed page, Read the docs / The documentation | no | the index explains "one iframe, no script of your own" |
| dougu-sports | index; `builder.html` | How: Element, iframe, ES module, Image, SVG. Builder: Script and tag, Tag, Frame, Module, Image, SVG | the page's own size row (32, 64, 128, 256); builder 64 to 256 | "the code, running": the emblem drawn from the code | "Copy it"; builder "Copy the code" | builder: Getting started, Architecture; none in the index | no | Turning (Still, By hand, By itself), Download the SVG |
| senshu-jerseys | index; `builder.html` | Element, Iframe, JavaScript, SVG, Data URI. Builder: Element, Frame, Module, SVG, Data address | none | none beside the code (the jersey is above) | "Copy"; builder "Copy the code" | none in the panel; a Presets link under | no | a note per tab, Turnable, Download |
| uchusen-rockets | index; `builder.html` | CDN script, Iframe, Module, SVG, Data address, Image link | none | none beside the code (the rocket is above) | "Copy"; builder "Copy the code" | Open the embed page; builder also The documentation | yes, hidden when the picture needs none | a note per tab, Save SVG, Save PNG |
| hako-devices | index "Put this on your site" (machine1's; not touched) | element, iframe, module, svg, data | none | none | "Copy", in the tab row | none | no | the note about the embed page |
| kyogijo-stadiums | index; `builder.html` (machine1's; not touched) | Module, Element, Iframe, SVG. Builder: Module, Element, Frame, SVG file | none | none | "Copy" | none | no | Copy link |
| meigen-sports | `builder.html` (the index shows only "Use the same data in your project": import code) | Module, Frame | none | the card above | "Copy the code" | Getting started, Architecture, The embed page | no | the segmented pill look of the tabs |
| taisen-brackets | `builder.html` | The call, In a page | none | the bracket above | "Copy the code" | Getting started, Layouts, API reference | no | |
| koyomi-calendars | `builder.html`; index "Copy the code" | "Code for": A page, One design alone, A file on a server | the builder's own: 64, 96, 160, 256 | the calendar above | "Copy" | Docs | no | |
| jisho | none (`embed.html` only; no panel) | none | none | none | none | Docs | no | |
| kazoku-ui | the new panel's demo, `embed-panel.html` | all of the panel's | 160 to 480 | yes | "Copy code" | yes | yes | the made-up badge's ring and Download |

Where the table says "none" for a package that draws something (senshu, uchusen, hako, kyogijo, meigen, taisen, koyomi, chikyu's index), the panel gives it the picture beside the code and the size. Where it says a package's own thing (a note, Turnable, Save SVG, Copy link, Turning), that goes in a slot.

## What to do for each package

1. **List what the package's panel has today** from the row above and from its page (tabs, size, picker, picture, Copy, links, credit, extras).
2. **Put the panel in**, with every item still there: the package's own choices in `options`, its own buttons in `actions`, a richer picker in `picker`, its notes and credit as `note` and `credits`. If the panel cannot hold something, ask for the panel to grow (a ticket on the kazoku-ui board with the repo and the case); do not drop it.
3. **A test that counts the items** (wakusei-planets' `e2e/embed-builder.demo.ts` has one): the tabs, the sizes, the picker, the picture, Copy, the links, the credit.
4. **Look at it**: desk and phone, light and dark, every tab, before and after pictures for John.
5. A package with no embed page adds `demo/embed.html` (one that draws what its address says); a package that draws nothing says `no-preview no-size` and keeps the tabs that make sense.
6. The family's `check-standard.mjs` item `embed-panel` passes; release.

The family builder is one change, not thirty: its code section moves to `<kazoku-embed-panel>` in `scripts/family-template.mjs` once, and each of its packages pulls the new template (a ticket on the kazoku-ui board). The packages with a panel of their own each have a ticket on their board.
