---
title: The interface parts
section: how-to
order: 24
description: The family's interface parts (tokens, icon button, control bar, scale switch, object card, layers panel, segmented switch, buttons, top bar, the footer and the reading page), how a page puts them together, and the fonts they use.
---

Four packages draw a sky, a solar system, an Earth and a rocket. A reader who moves between them should meet the same controls every time: one control bar, one layers panel, one object card, in the same places, with the same words in English and Japanese. These are those parts, built once. A package does not keep its own copy of any of them.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/interface/define";
  import "@johnmorrisdotca/kazoku-ui/page-frame/define";
  import { createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock"; // arrives with the shared scene; until then any object with the clock's four methods will do
  bar.clock = createFamilyClock();
  card.data = { kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" }, name: { en: "Jupiter", ja: "木星" }, stats: [/* each with a source */] };
</script>
<kazoku-top-bar brand="Hoshi Stars" home="index.html"></kazoku-top-bar>
<kazoku-scale-switch value="solar"></kazoku-scale-switch>
<kazoku-object-card id="card"></kazoku-object-card>
<kazoku-control-bar id="bar"></kazoku-control-bar>
<kazoku-page-footer href="credits.html"></kazoku-page-footer>
```


The page owns the view, the clock and the data. Every part reports what the reader did, in a `kazoku-*` event, and the page applies it. A part never draws the page's scene. The demo's [interface.html](https://johnmorrisdotca.github.io/kazoku-ui/interface.html) puts them all over a view, [interface-parts.html](https://johnmorrisdotca.github.io/kazoku-ui/interface-parts.html) shows each on its own, and [interface-page.html](https://johnmorrisdotca.github.io/kazoku-ui/interface-page.html) is a reading page.

## Entries

| Entry | What it is |
|---|---|
| `@johnmorrisdotca/kazoku-ui/interface` | The tokens, the words, the icons and every pure rule (no DOM; it imports on a server and in a build). |
| `@johnmorrisdotca/kazoku-ui/interface/element` | The element classes and their tags (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/interface/define` | Registers the nine tags, each only if it is free, and puts the tokens on the page. |
| `@johnmorrisdotca/kazoku-ui/page-frame/define` | Also registers `<kazoku-page-footer>`, part 9, which extends the page frame. |

## The tokens

Dark is the default, and the parts are dark whatever the device prefers. A light theme for reading and print is not here yet; the family's `data-theme` mechanism does not reach these parts. Every part reads its colours as `var(--kui-name, the design's value)`, so a page that installs nothing still gets them and a page that sets one changes it.

| Token | Value | For |
|---|---|---|
| `--kui-space` | `#070A10` | behind a 3D or sky view |
| `--kui-page` | `#0B0E14` | behind a reading page |
| `--kui-panel` | `#121722` | bars, cards, panels and fields |
| `--kui-line` | `#232B3A` | 1 px borders, and the fill of an active control |
| `--kui-line-strong` | `#3A4860` | the border of an outlined button |
| `--kui-text` | `#E8ECF2` | main text and icons |
| `--kui-text-soft` | `#C9D2E0` | reading paragraphs |
| `--kui-text-quiet` | `#9AA6B8` | labels and inactive items |
| `--kui-sun` | `#F2B84B` | the one action colour (text on it is `--kui-on-sun`, `#141413`) |
| `--kui-sky` | `#8EC2FF` | links (`--kui-sky-hover`, `#B9D9FF`, on hover) |

`COLOURS`, `FONTS`, `RADII`, `SIZES` and `TOKEN_PROPERTIES` hold them as data; `tokensCss()` writes them as a rule and `installTokens(document)` puts that rule on the page once, as an adopted stylesheet (no inline style, so a strict Content-Security-Policy allows it). Importing `interface/define` does that for you. `kui("panel")` writes `var(--kui-panel, #121722)` for your own styles. Every text and icon colour keeps 4.5:1 on its grounds: `READABLE_PAIRS` lists the pairs, `contrastRatio` measures one (from `luminance`) and `unreadablePairs()` returns the ones that fail (none). The outlined button's border, `--kui-line-strong` on `--kui-panel`, is 1.9:1: the label, not the border, is what a reader needs to find it, and it passes.

Type: IBM Plex Sans for words, IBM Plex Sans JP behind it for Japanese, and IBM Plex Mono for every number, date, time and unit. The radii are 8 px for controls, 12 for panels and cards, and 16 for the top corners of a phone sheet.

## Fonts

IBM Plex is licensed under the SIL Open Font License 1.1, which allows use, copying and serving with software, so long as the licence text goes with the font files. The package does not contain the fonts and never loads them from Google or from any other site. A page serves them from its own address, as the family serves its pictures: copy the files you need from the `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-sans-jp` and `@fontsource/ibm-plex-mono` packages (each carries the OFL text, copy it beside them) and link their stylesheet. `scripts/fonts.mjs` in this repository does exactly that for the demo, Plex Sans and Sans JP at 400 and 600 and Mono at 400 and 500, into `fonts/`; a page that loads no font gets the system faces named after Plex in `FONTS`, and the parts still work.

## The parts

Each part is a custom element with a plain `data` or property, real controls (`<button>`, `<a href>`, `<input>` with a `<label>`), a name for a screen reader in English and Japanese, and a 44 px touch target. `placement` is `fixed` (to the screen, the default), `absolute` (to the nearest positioned ancestor) or `static` (in the flow).

1. **Icon button, `<kazoku-icon-button>`** (`IconButtonElement`). 44 by 44 px, an 18 px icon (20 on a phone) stroked 1.75 with round caps; clear at rest, filled `--kui-line` on hover and when on. `icon` names one of the built-in icons (`ICON_NAMES`, drawn from `ICONS` or written with `iconSvg`; `isIconName` tests a name; `ICON_STROKE` is 1.75) or put your own `<svg>` inside. It always has an `aria-label`: yours in `label`, else the icon's own word in the page's language. `pressed` and `expanded` say so to a screen reader; `on` only shows it.
2. **Control bar, `<kazoku-control-bar>`** (`ControlBarElement`). One floating panel, in the design's fixed order: Slower, Play or Pause, Faster, the clock, Back to now, a divider, Your place, Layers, Look and Free flight (`CONTROL_ORDER`; the first five are `TIME_CONTROLS`, the last four `VIEW_CONTROLS`). `controls="play clock layers"` leaves out what a view cannot do, and `parseControls` keeps the order of the rest. On a phone it is fixed full width at the bottom, 116 px tall, the clock on one line over one row of buttons. The clock shows the moment, always in the device\'s own time zone with the zone named ("10 Nov 2026 · 21:14 MST", `zoneName`; `timezone="utc"` shows UTC, and addresses stay in UTC), and, under it, the speed in plain words (`formatMoment`, `speedWords`: "1 hour each second", "1秒で1時間"), and is a button that opens a date and time picker (`toInputValue`, `fromInputValue`). It drives the family clock, given as the `clock` property: a `BarClock` (the moment, the speed, `running`, `set`, `setSpeed`, `play`, `pause`, `onChange`, which a `FamilyClock` already is). Slower and Faster step through `SPEED_LADDER` with `stepSpeed` and `canStep`. It opens as the clock opens: moving from now, or still with Play ready for a reader who asked for reduced motion; the bar starts nothing itself. The Look button goes through `LOOKS` (`parseLooks`, `nextLook`, `lookName`). Every press also fires `kazoku-control` with `{ action, value }`.
3. **Scale switch, `<kazoku-scale-switch>`** (`ScaleSwitchElement`). Surface, Moons, Solar system, Stars, Galaxy (`SCALE_STEPS`), always in that order; `steps="solar stars"` offers fewer (`parseScaleSteps`, `isScaleStep`, `scaleName`). A 148 px panel at the left on a desk, each step 44 px tall, the current one filled with a 2 px `sun` mark; a row of pills under the top bar on a phone, scrolling sideways, the current one with a `sun` border. `kazoku-scalechange`.
4. **Object card, `<kazoku-object-card>`** (`ObjectCardElement`). One layout for a star, planet, moon, galaxy, black hole or rocket: the kind, the name with its Japanese name beside it, a close button, a grid of numbers (a label over a mono value), the line "Every number links to its source", and two buttons, the filled one first. Give it `ObjectCardData` in `data` (`CardStat`, `CardAction`, `SourceLink`, `Bilingual`; `say` picks a language). Every number is a link to its source, and `cardProblems(data)` names a number with no source and a computed number that shows nothing; `formatValue` writes a number (`—` for none; a very large or small one as "1.898 × 10²⁷", never "1.898e27", and the parts draw the exponent in a real `<sup>` from `scientificParts` and `superscript`), `hasValue` tests one. `refreshValues()` repaints the computed ones after the clock moves. On a phone it is a sheet that rises from above the control bar, with a handle, three columns of numbers and two buttons side by side. `kazoku-cardclose`.
5. **Layers panel, `<kazoku-layers-panel>`** (`LayersPanelElement`). A 320 px panel above the control bar: the label "Layers", then real checkboxes in two columns, checked in `sun` (`LayerItem`). It also lists the data door's outside sources, each with its credit and its licence (`licenceText` spells out "non-commercial" and "share-alike"), so one can be switched off (`LayerSource`). Hand it a view's `credits()` through `sourcesFromCredits(credits, enabled)`; the package's own data is left out, and the page keeps the list of sources, because a source switched off leaves `credits()` and must stay here to be switched back on. `DoorCredit` and `DoorSourceInfo` are the data door's shapes, kept to what the panel reads. `kazoku-layerchange` with `{ kind, id, checked }`.
6. **Segmented switch, `<kazoku-segmented-switch>`** (`SegmentedSwitchElement`). `kind="language"` is EN and 日本語 (`LANGUAGE_SEGMENTS`) and writes the choice as `lang` on the page; `kind="culture"` is Western, Japanese, Chinese (`cultureSegments`); or give `options="a:Label|b:Label"` (`parseSegments`, `Segment`). Each segment is a button with `aria-pressed`; 40 px tall on a desk, 44 on a phone. `kazoku-segmentchange`.
7. **Buttons, `<kazoku-button>`** (`ButtonElement`). One filled `sun` button a screen, for the main thing to do; everything else is `variant="outlined"` (the default) or an icon. A real `<a href>` with a `href`, else a real `<button>`; 48 px tall on a desk, 44 on a phone; `icon` draws a built-in icon before the words. A second filled button in one screen writes a console warning once (`filledButtonCount` counts them; mark a gallery's screens with `data-screen`).
8. **Top bar, `<kazoku-top-bar>`** (`TopBarElement`). The brand linking home, then where you are as a trail (`TrailItem`, `trailText`), or the site's sections (`SectionLink`); on the right a search field (a search icon on a phone), the language switch and, on a phone, a menu button whose links go in the `menu` slot. 64 px on a desk, 56 on a phone. A sky view's culture switch (`culture="western"`) is in the bar, beside the language switch on a desk and on a second line of the bar on a phone, never in a menu. "/" goes to the search field. While it is on the page it publishes its height as `--kui-top-offset` on the document. `kazoku-topbar`.
9. **Page footer, `<kazoku-page-footer>`** (`PageFooterElement`, `FOOTER_TAG`, `pageFooterHtml`, `PageFooterOptions`). The page frame's third part. On a view, one quiet line at the bottom left, "Positions computed for the time shown · Data and credits". With `variant="page"`, the reading page's footer: "Drawn with <package>", "Sources for every number on this page: data and credits", "How to cite", "Sheets to print" and a link home. Give its `sources` property a view's `credits()` and it writes the credit line with each licence (`creditsText`).
10. **Reading page, `<kazoku-reading-page>`** (`ReadingPageElement`). An object's own page, 1,120 px at most: the picture beside the kind, the name, one sentence and the buttons; "Right now" as three tiles; "The numbers" as a table of measure, value and a comparison with its source; related objects as link tiles in groups; and the footer in the `footer` slot. On a phone it is one column and the table keeps measure and value. `ReadingPageData` (`ReadingTile`, `ReadingRow`, `ReadingRelated`, `ReadingGroup`); `readingProblems(data)` names what is missing.

`TAGS` lists the nine tags, `TAG` is the control bar's, `defineBasics` and `defineInterface` register them, `InterfacePart` is the class they share, and `WORDS`, `wordsFor` and `languageOf` are the words in both languages (a page covers any with the `labels` property). `BarClockChange` is what a clock tells a listener. The element entry also names each tag (`ICON_BUTTON_TAG`, `CONTROL_BAR_TAG`, `SCALE_SWITCH_TAG`, `OBJECT_CARD_TAG`, `LAYERS_PANEL_TAG`, `SEGMENTED_SWITCH_TAG`, `BUTTON_TAG`, `TOP_BAR_TAG`, `READING_PAGE_TAG`) and each event (`CONTROL_EVENT`, `SCALE_EVENT`, `CARD_CLOSE_EVENT`, `LAYER_EVENT`, `SEGMENT_EVENT`, `TOP_BAR_EVENT`).

## The clock

The control bar is built against the family clock's shape (`createFamilyClock` of the shared scene). Until `@johnmorrisdotca/kazoku-ui/clock` is released, `src/interface/clock-adapter.ts` holds the one place the two meet: it has a small stand-in clock the demo and the tests use, with a TODO to delete it when the real one lands. The stand-in counts passed time, keeps its speed while paused, says "tick" at most four times a second and not at all while paused or in a hidden tab, and opens still when the reader asked for reduced motion. Nothing but the demo and the tests uses it, and it is not exported.

## Checking a page

Hold each page to the rules: `cardProblems` and `readingProblems` in a test, `unreadablePairs` for the tokens, one filled button a screen, 44 px targets, real controls. `e2e/interface.demo.mjs` in this repository does the same in a real browser at 390 and at a desk's width, in English and Japanese.
