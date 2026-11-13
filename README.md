<p align="center"><a href="https://johnmorrisdotca.github.io/kazoku-ui/"><picture><source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/thumbnail-dark.png"><img src="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/thumbnail.png" alt="Kazoku UI: a card with a blue circle and a black triangle, turned and tipped in 3D, over the view controls that turn it." width="1200"></picture></a></p>

# Kazoku UI 家族

<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/hero-dark.webp">
<img alt="The demo: in its header the English and 日本語 choice and the Light, Dark and Auto switch; below, a white card with a blue circle and a black triangle, turned a little and tipped, in a frame with a dotted floor. Under it the view controls: an Angle slider, an Auto-turn button, zoom out, the zoom readout, zoom in and Fit, and a small More button." src="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/hero-light.webp" width="720">
</picture>

The family's shared interface parts, as their own versioned package: one part per subpath, so a page loads only what it uses. No runtime dependencies, MIT.
The first part is the **view controls** for any 3D or zoomable view. They never draw the scene: they tell your page what the reader chose, and your canvas, WebGL,
SVG or CSS 3D applies it.

[Demo](https://johnmorrisdotca.github.io/kazoku-ui/) · [Layouts demo](https://johnmorrisdotca.github.io/kazoku-ui/layouts.html) · [Strict-CSP demo](https://johnmorrisdotca.github.io/kazoku-ui/csp.html) · [Theme switch](docs/theme-switch.md) · [Language picker](docs/language-picker.md) · [Address state](docs/address-state.md) · [Save image](docs/save-image.md) · [Speed buttons](docs/guides/speed-buttons.md) · [Options window](docs/guides/options-window.md) · [Wide layout](docs/guides/wide-layout.md) · [Page header and credits](docs/guides/page-frame.md) · [The interface parts](docs/guides/interface.md) · [The data door](docs/guides/data-door.md) · [Embed panel](docs/guides/embed-panel.md) · [Print layout](docs/guides/print.md) · [Collection picker](docs/guides/collection-picker.md) · [Search box](docs/guides/search-box.md) · [Shared 3D renderer](docs/renderer.md) · [The drag rule](docs/drag-rule.md) · [Content-Security-Policy](docs/csp.md) · [Labels, English and 日本語](docs/labels.md) · [Changelog](CHANGELOG.md) · [Builder](https://johnmorrisdotca.github.io/kazoku-ui/builder.html) · [API reference](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/API.md) · [Guides](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides) · [Family clock](docs/guides/clock.md) · [Shared scene](docs/guides/scene.md)
## In 30 seconds

```sh
npm install @johnmorrisdotca/kazoku-ui
```

```html
<div id="scene" tabindex="0" style="height: 200px">Your scene</div>
<kazoku-view-controls for="scene" address></kazoku-view-controls>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  document.querySelector("kazoku-view-controls").addEventListener("kazoku-viewchange", (event) => {
    const { yaw, tilt, zoom, panX, panY } = event.detail;
    document.getElementById("scene").style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${tilt}deg) rotateY(${yaw}deg)`;
  });
</script>
```

And the pure functions, with no page at all:

```js
import { formatAddress, parseAddress, zoomMarks, zoomText } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(formatAddress("?x=1", { yaw: 40, tilt: 10, zoom: 2 })); // ?x=1&yaw=40&tilt=10&zoom=2
console.log(JSON.stringify(parseAddress("?yaw=40&zoom=2"))); // {"yaw":40,"zoom":2}
console.log(zoomMarks(1, 5).map((mark) => mark.zoom).join(" ")); // 1 2 3 5
console.log(zoomText(2.44)); // 2.4×
```

## Who it is for

- A page or a package that shows a 3D or zoomable view (a card, a globe, a rocket, a map) and wants the reader to turn, tip, zoom and move it, without writing the controls again.
- A site with a language choice and a Light, Dark or Auto switch that should look and behave the same across every page and every package of a family.
- A page that wants Save PNG and Save SVG for a canvas, an SVG or a piece of the page.
- A page of many 3D views that must stay inside one WebGL context and a pixel budget.
- A framework app: the parts are plain custom elements with plain modules beside them.

## Features

- **No runtime dependencies, one part to a subpath.** A page loads only what it uses.
- **View controls** in four layouts, with a zoom slider, a readout, Auto-turn, Centre, keys, touch and the address.
- **Theme switch** (Light, Dark, Auto) and **language picker** (each language in its own name) that write `data-theme` and `lang` and tell the page.
- **Save image** for a canvas, an SVG or any element, as PNG or SVG.
- **Speed buttons**: one row of 0.5×, 1×, 2× (or the steps you name: a solar system's days a second, a replay's speeds) for the whole family, kept in an attribute and the address.
- **Embed panel**: the family's one "Put it in your page" panel: a compact picker, a size, a tab for HTML, ES module, React, Vue, Angular, Svelte and iframe (and your own, such as an image), a live picture that always fits its box, Copy, the embed page, the docs and the credit line.
- **Print layout**: printable sheets for any package on A4, US Letter, A3 or Tabloid, with safe margins, a header, an info box, a footer with a QR code, a poster tiled over pages with cut marks, large type for children, and a Print / save PDF button. No element, no PDF library.
- **Address state**, with no element: choices kept in the link with `replaceState`.
- **A shared 3D renderer** and its **freeze checks**: one WebGL context, shared assets, stills, a pixel budget.
- **A family clock** and **a shared scene**: one moment, speed and play for every view, and one scene, camera and clock from many packages' layers on the one context.
- **Labels in English and Japanese**, light and dark, 48 px touch targets, reduced motion respected.
- **A strict Content-Security-Policy is fine:** styles are adopted as constructable stylesheets.

## Install

```sh
npm install @johnmorrisdotca/kazoku-ui
```

```sh
pnpm add @johnmorrisdotca/kazoku-ui
```

Node 22 or later builds and tests it; the parts run in any current browser. Each part is its own subpath, and the `define` file of an element registers its tag, once, and only if the tag is free.

## Use it in your project

In a bundler or a framework, import the `define` file of each element you use once, in code that runs in the browser, and import the pure modules wherever you like:

```ts no-run
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import type { ViewChangeDetail } from "@johnmorrisdotca/kazoku-ui/view-controls/element";

export const state = createAddressState({ defaults: { size: "m" } });
export const draw = (detail: ViewChangeDetail) => console.log(detail.yaw, detail.zoom);
```

## Use it anywhere

On a page with no bundler, an import map tells the browser where each subpath lives, and the `dist` folder is served as it is:

```html
<script type="importmap">
{ "imports": {
  "@johnmorrisdotca/kazoku-ui/theme-switch/define": "/node_modules/@johnmorrisdotca/kazoku-ui/dist/theme-switch/define.js"
} }
</script>
<kazoku-theme-switch address storage></kazoku-theme-switch>
<script type="module">import "@johnmorrisdotca/kazoku-ui/theme-switch/define";</script>
```

## Examples

A theme switch and a language picker side by side, with the page answering their events:

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import "@johnmorrisdotca/kazoku-ui/language-picker/define";

  document.addEventListener("kazoku-themechange", ({ detail }) => console.log(detail.choice, detail.scheme));
  document.addEventListener("kazoku-languagechange", ({ detail }) => console.log(detail.lang));
</script>
```

Save a canvas as a PNG:

```html
<canvas id="art" width="360" height="200"></canvas>
<kazoku-save-image for="art" name="my-picture"></kazoku-save-image>
<script type="module">import "@johnmorrisdotca/kazoku-ui/save-image/define";</script>
```

The same idea in code, with the address and the theme as plain functions:

```js
import { applyParams } from "@johnmorrisdotca/kazoku-ui/address-state";
import { resolveTheme } from "@johnmorrisdotca/kazoku-ui/theme-switch";
import { filenameFor } from "@johnmorrisdotca/kazoku-ui/save-image";

console.log(applyParams("?a=1&size=m", { size: "l", a: null }, { size: "m" })); // ?size=l
console.log(resolveTheme("auto", true)); // dark
console.log(filenameFor("My Card/x", "png")); // My Card-x.png
```

## Parts

Each its own subpath; later ones: picture-tile pickers, Help, GitHub and npm pills, the family's backgrounds.

| Subpath | What it is |
|---|---|
| `@johnmorrisdotca/kazoku-ui/view-controls` | The controller, the arithmetic, the address and the labels. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/view-controls/element` | The `ViewControlsElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/view-controls/define` | Registers `<kazoku-view-controls>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/theme-switch` | The theme choices, how one is applied and remembered. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/theme-switch/element` | The `ThemeSwitchElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/theme-switch/define` | Registers `<kazoku-theme-switch>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/language-picker` | The language codes, each language's own name, which one to start in, how one is applied. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/language-picker/element` | The `LanguagePickerElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/language-picker/define` | Registers `<kazoku-language-picker>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/save-image` | The formats, the file name, the size and the functions that render and download a canvas, an SVG or an element as PNG or SVG. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/save-image/element` | The `SaveImageElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/save-image/define` | Registers `<kazoku-save-image>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/speed-buttons` | The steps, how a speed reads, the nearest step and the address key of the speed buttons. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/speed-buttons/element` | The `SpeedButtonsElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/speed-buttons/define` | Registers `<kazoku-speed-buttons>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/embed-panel` | The seven ways a page is made and their text (`embedSnippet`), the sizes, the picker's search and the labels of the embed panel. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/embed-panel/element` | The `EmbedPanelElement` class (needs a browser). |
| `@johnmorrisdotca/kazoku-ui/embed-panel/define` | Registers `<kazoku-embed-panel>` (once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/page-frame` | The words of a page and what is made from them: the `<title>` and description a build writes (`pageHeadHtml`), the header and credit line as HTML (`pageHeaderHtml`, `pageCreditsHtml`) and `pageProblems`, a check of a built page. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/page-frame/element` | The `PageHeaderElement` and `PageCreditsElement` classes (need a browser). |
| `@johnmorrisdotca/kazoku-ui/page-frame/define` | Registers `<kazoku-page-header>`, `<kazoku-page-credits>` and `<kazoku-page-footer>` (each once, and only if the tag is free). |
| `@johnmorrisdotca/kazoku-ui/interface` | The tokens, the words, the icons and the rules of the interface parts: the control bar, scale switch, object card, layers panel, segmented switch, buttons, top bar and reading page. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/interface/element` | The interface parts' element classes (need a browser). |
| `@johnmorrisdotca/kazoku-ui/interface/define` | Registers the nine interface tags and puts the tokens on the page. |
| `@johnmorrisdotca/kazoku-ui/print` | Page sizes and margins, the header, info box and footer of a printable sheet, a poster tiled over pages with cut marks, kid and normal type, a QR code encoder (byte mode, level M, versions 1 to 20, no dependency) and the Print / save PDF helper. No element; imports on a server. |
| `@johnmorrisdotca/kazoku-ui/renderer` | The shared 3D renderer: one WebGL context for the focused view, shared assets, stills, drawing on demand, a pixel budget. three.js is an optional peer, loaded by your `import("three")`. Imports on a server. |
| `@johnmorrisdotca/kazoku-ui/clock` | The family's clock: a moment, a speed and running or paused (`createFamilyClock`), one that opens moving at the focused body's speed and waits for Play under reduced motion, the clock a view follows from outside (`createClockSlot`) and the clock in the address (`readClockAddress`, `clockAddress`). No DOM; imports on a server. |
| `@johnmorrisdotca/kazoku-ui/scene` | One scene, one camera and one clock from the layers of many packages (`composeScene`), on the renderer's one WebGL context: the SPX frame in float64 kilometres, a floating origin (`placeInFrame`), two depth slices (`planSlices`). three.js is the page's own. No DOM; imports on a server. |
| `@johnmorrisdotca/kazoku-ui/testing` | The gesture check (`checkGestures`: every gesture of the view controls, on any view) and the freeze checks for a 3D package's e2e: count contexts, GPU objects, draws and frames; the canvas size against the budget; and the browser lock (`withBrowserLock`, `acquireBrowserLock`, a Playwright `globalSetup`, `kazoku-browser-lock status`) so one headless browser runs at a time on a machine, with `kazoku-ci-image` for runs in CI's own Playwright image, several at once. No test framework named. |
| `@johnmorrisdotca/kazoku-ui/address-state` | Choices kept in the address: read, write and subscribe to URL parameters with `replaceState`. No element; imports on a server. |

## View controls

`<kazoku-view-controls>` turns, tilts, zooms and moves a view your page draws: it reports the view, and the page draws it. The [view controls guide](docs/guides/view-controls.md) has every attribute, the event, the address and the gesture check.

- **Two levels, so the bar stays simple.** `controls="basic"` (the default) shows the angle slider, Auto-turn, zoom out and in with a **zoom readout** (`2.4×`; tap it for Fit), Fit and More. More, or `controls="advanced"`, adds the tilt slider, the turn speeds, Left and Right, Front and, once zoomed in, the pan pad. The reader's choice with More is remembered and beats the attribute.
- **Auto-turn** says how long one turn takes (4 min to 30 s). Its speed (`pace`) and its way (`direction`) are the reader's choices, kept in the attributes and the address. A control never stops or resets the turn: only the Auto-turn button pauses it. Nothing is drawn while the view is out of sight or the tab is hidden.
- **The wheel moves the view** once it is zoomed in; at Fit it scrolls the page.

  | Gesture | How |
  |---|---|
  | Turn | Drag |
  | Tilt | Drag up or down |
  | Roll | Shift and a drag, or a two-finger twist |
  | Move | The wheel, Shift and the wheel, Ctrl or Command and a drag, Space and a drag, the middle or right button and a drag, or two fingers dragging together |
  | Zoom | Ctrl, Command or Alt with the wheel, or a pinch |
  | Keys | The arrows turn and tip, `+` and `-` zoom |
  | Fit | A double-click when zoomed in, or Home or 0 |

  Every page that binds the controls answers every row the same way; a package proves it with `await checkGestures(page, "#view")` from `@johnmorrisdotca/kazoku-ui/testing` ([the check](docs/guides/view-controls.md#gestures-and-the-check-every-package-runs)).
- **Four layouts** (`layout`: classic, horizontal, vertical, compact) and a **zoom slider** with marks: see [Layouts and the zoom slider](docs/guides/layouts-and-zoom.md) and the [layouts demo](https://johnmorrisdotca.github.io/kazoku-ui/layouts.html).
- Labels in English and Japanese; light and dark; 48 px touch targets; a compact bar on a phone; no automatic turn for a reader who prefers reduced motion.

<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/layouts-dark.webp">
<img alt="The four layouts side by side, each under a turned card. Horizontal: an Angle slider with Auto-turn and More on one row, and under it a Zoom slider marked 0.1×, 1×, 10× and 50× with zoom out, the readout 1.6×, zoom in and Fit. Vertical: a column beside the view with Auto-turn and More at the top, then the Angle slider, the Zoom slider with its marks, and zoom out, 1.6×, zoom in and Fit. Compact: one short row of Auto-turn, zoom out, 1.6×, zoom in and More, here opened to show the zoom slider and Fit, the angle and tilt, the three speeds, Front and the pan pad. Classic: the bar as before. Each has its code and a Copy button." src="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/layouts-light.webp" width="720">
</picture>

### In plain HTML

```html
<div id="scene" tabindex="0" style="height: 320px">...your scene...</div>
<kazoku-view-controls for="scene" address></kazoku-view-controls>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  const scene = document.getElementById("scene");
  document.querySelector("kazoku-view-controls").addEventListener("kazoku-viewchange", (event) => {
    const { yaw, tilt, zoom, panX, panY } = event.detail;
    scene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${tilt}deg) rotateY(${yaw}deg)`;
  });
</script>
```

Put the element on the view or beside it. `for` names the element the hands bind to (pointer, pinch, wheel and keys): give it a `tabindex` for the keys, and size it to the view. With `overlay` the bar sits over the bottom of its positioned parent.

More in the guides: [in a framework](docs/guides/frameworks-and-csp.md) (a ref and one listener); [without the element](docs/guides/view-controller.md) (`createViewController`: the same hands with no markup, buttons inside the view, zooming about a point of your own, Centre, keys and the wheel); [an element that carries the controls itself](docs/guides/element-controls.md) (`carryControls`); [the drag rule and exact grab](docs/drag-rule.md); [opening at the scene's natural size](docs/guides/view-controls.md#opening-at-the-scenes-natural-size).

## The event API

`kazoku-viewchange` is dispatched on the element (it bubbles and crosses shadow roots). `event.detail`, and the first argument of `onChange`, is:

| Field | Meaning |
|---|---|
| `yaw` | Degrees, -180 up to 180: the turn about the vertical. Dragging right makes it larger. |
| `tilt` | Degrees, held to plus or minus `tilt-max` (30): the top tips away as it gets larger (dragging up). |
| `zoom` | 0.1 to 50 (`zoom-min`, `zoom-max`): 1 is Fit. The scene is drawn at `zoom * fitScale`. |
| `panX`, `panY` | CSS pixels the zoomed picture is moved from the middle of the view; 0 at 1x. |
| `turning` | True while Auto-turn is running. |
| `final` | False for the steps of a drag, a pinch, a slider and the automatic turn; true when something settled. Do the costly drawing on `final`, the cheap transform on every event. |
| `reason` | What changed it: `init`, `auto`, `drag`, `pinch`, `wheel`, `key`, `slider`, `zoom`, `pan`, `front`, `fit`, `centre`, `fit-scale`, `play`, `pause` or `set`. |

An `init` event is sent once, a moment after the element connects, with the starting view (from the attributes and the address). `element.state` is the current view at any time.

### Attributes

The essentials; the [guide](docs/guides/view-controls.md#attributes) has them all (`ignore`, `anchor`, `key-tilt`, `stop-turn`, `tilt-step`, `object-size`, `grab-radius`, `autoplay-for`, `storage` and the rest), the methods, the colours and the parts.

| Attribute | |
|---|---|
| `for` | The id of the view the hands bind to. Or set `element.view = someElement`. |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `yaw`, `tilt`, `zoom` | Where it starts: the angle, the tilt and the zoom (`fit`, the default, or a number where 1 is the scene's natural size, with `fit-scale`). |
| `speed` | Degrees a second at a pace of 1 (12). A negative number starts the turn to the left. |
| `direction`, `pace` | Which way Auto-turn goes (`left` or `right`) and its speed as a multiple of `speed` (1). The reader's choice, from the buttons or from the address the page opened with, is written here and kept in the address; it is never taken for the page's own start. |
| `paces` | The speeds the buttons stand for, `0.125 0.25 0.5 1` by default. |
| `controls`, `layout` | `basic` or `advanced`; `classic`, `horizontal`, `vertical` or `compact`. |
| `autoplay` | Turn by itself from the start, unless the reader prefers reduced motion. |
| `flat` | The view cannot turn: a drag moves it. |
| `tilt-max`, `zoom-min`, `zoom-max` | The limits (30, 0.1, 50). |
| `address`, `address-keys` | Keep the reader's choices in the page's address (`?yaw=40&zoom=2&pace=0.5&direction=left`), under other keys if you like (`yaw:a,zoom:z`). Only what the reader chose is kept: [the address](docs/guides/view-controls.md#the-address). |
| `theme`, `overlay` | `light` or `dark`; sit over the bottom of a positioned parent. |

`define` registers the tag only when it is free, so two copies of the package on one page never throw: [why](docs/guides/view-controls.md#why-the-tag-is-only-defined-when-it-is-free).

## Theme switch

`<kazoku-theme-switch>` is Light, Dark and Auto as one row of 48 px buttons. It writes `data-theme` on the page's `<html>` (or a `target` you name; Auto takes it off, so the device decides), keeps the choice in the address (`address`) and optionally in `localStorage` (`storage`), and sends `kazoku-themechange`.

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<script type="module">import "@johnmorrisdotca/kazoku-ui/theme-switch/define";</script>
```

The attributes, the event, the early-apply function for a server or a head script and the CSS to write are in [docs/theme-switch.md](docs/theme-switch.md). The demo has one in its header.

## Language picker

`<kazoku-language-picker languages="en ja">` is a button for each language the page lists, each in its own name (English, 日本語). It writes `lang` on the page's `<html>` (or a `target`), keeps the choice in the address (`address`, `?lang=ja`) and optionally in `localStorage` (`storage`), and sends `kazoku-languagechange` with `{ lang, previous, reason, target }`. It starts in the address' language, then the remembered one, then the page's `value`, then the reader's browser languages, then the first code. It translates nothing; the page answers the event.

```html
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>
<script type="module">import "@johnmorrisdotca/kazoku-ui/language-picker/define";</script>
```

See [docs/language-picker.md](docs/language-picker.md). The demo's own English and 日本語 choice is one.

## Address state

Choices kept in the address, without an element: `createAddressState({ defaults })` with `get`, `set`, `remove`, `subscribe` and `flush`, writing with `replaceState` (no history entry, one write for the changes of a quarter of a second, a value at its default leaves the address, other parameters and the hash kept), and hearing back and forward. The theme switch, the language picker and the view controls keep their choices through it.

```js no-run
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";

const state = createAddressState({ defaults: { size: "m" } });
state.set("size", "l"); // ?size=l
state.subscribe(({ key, value }) => redraw(key, value));
```

See [docs/address-state.md](docs/address-state.md); the demo's `address.html` shows it.

## Save image

`<kazoku-save-image for="art">` is Save PNG and Save SVG for a canvas, an SVG or any element: a canvas at its own pixel size; an SVG as a stand-alone SVG (the styles it is drawn in written into it) or a PNG at `scale` (2 by default); any other element as a PNG, drawn with its computed styles. `name` is the file name, `background` the colour behind a PNG, `manual` makes the picture and the `kazoku-save` event (`{ blob, format, width, height, filename, reason }`) but downloads nothing. `kazoku-saveerror` says why it could not.

```html
<kazoku-save-image for="jersey" name="senshu-jersey"></kazoku-save-image>
<script type="module">import "@johnmorrisdotca/kazoku-ui/save-image/define";</script>
```

What a picture of an element cannot carry (web fonts, `::before`, cross-origin images), the element-free `renderImage` and `saveImage`, and the one `img-src data:` a strict policy needs are in [docs/save-image.md](docs/save-image.md); the demo's `save-image.html` saves all three kinds.

## Speed buttons

`<kazoku-speed-buttons>` is one button for each speed (0.5×, 1×, 2× by default, no menu): the same element for Auto-turn in the view controls, a solar system's days a second (`steps="1 10 100"`) and a replay bar. The chosen speed is the `value` attribute, can be kept in the address, and is announced as `kazoku-speedchange`.

```html
<kazoku-speed-buttons steps="0.5 1 2" value="1" address></kazoku-speed-buttons>
<script type="module">import "@johnmorrisdotca/kazoku-ui/speed-buttons/define";</script>
```

See [the guide](docs/guides/speed-buttons.md) for the attributes, the event and the functions without the element.

## Embed panel

`<kazoku-embed-panel>` is the "Put it in your page" panel every package of the family shares: a compact picker for the thing being embedded, a size, a tab for each way a page is made, the picture the code makes (scaled to fit its box), Copy with its name on it, Open the embed page, Read the docs and the credit line. The package gives it `generate` (the code of a tab) and `preview` (the picture); `embedSnippet` writes all seven tabs from one description of the element.

```html
<kazoku-embed-panel id="panel" kinds="html module react vue angular svelte iframe" docs-href="docs/"></kazoku-embed-panel>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
  import { embedSnippet } from "@johnmorrisdotca/kazoku-ui/embed-panel";
  document.getElementById("panel").generate = ({ kind, size }) =>
    embedSnippet(kind, { package: "@scope/dial", cdn: "https://cdn.jsdelivr.net/npm/@scope/dial@1.0.0", tag: "scope-dial", element: "element", entries: [], attrs: [["size", String(size)]], name: "dial", iframe: { src: "https://example.com/embed.html", title: "Dial", width: size, height: size } });
</script>
```

See [the guide](docs/guides/embed-panel.md) for the slots (a package's own choices and buttons), the picker, the events and a package that draws nothing, and [the survey](docs/embed-panel-survey.md) for which package's panel does each part best.

## Print layout

`buildSheet` makes a printable sheet: pages exactly the paper's size (`a4`, `letter`, `a3`, `tabloid`, tall or wide) with margins a home printer will not clip (12.7 mm), a header (the brand text you pass in, the package, the title, a "Name:" label and underline), an info box (region, flag, latitude band, season, level, language), a footer (credits, version, date, the address as a QR code and as text, the page number), type for children (names at 28 pt, lines 1.2 mm thick) or normal type, and a poster tiled over several pages with cut marks and glue strips. `printSheet` prints a print-only copy through the browser's own dialog, which saves a PDF too. The QR code is encoded by a small encoder in the package (byte mode, level M, versions 1 to 20), held by known answers and a decoder in the tests.

```js no-check
import { buildSheet, printCss, printSheet, tilePoster } from "@johnmorrisdotca/kazoku-ui/print";

document.head.append(Object.assign(document.createElement("style"), { textContent: printCss({ page: "a4", type: "kid" }) }));
const sheet = buildSheet({ page: "a4", type: "kid", language: "en", brand: "Space Program X", packageName: "My planets", title: "The planets", address: "https://example.com/planets/", pages: [picture] });
document.querySelector("#preview").append(sheet);
document.querySelector("#print").addEventListener("click", () => printSheet(sheet));
console.log(tilePoster({ widthMm: 400, heightMm: 300, page: "a4" }).pages); // 6
```

See [the guide](docs/guides/print.md) for every option and the demo's `print.html` for a sample sheet and a poster.

## Page header and credits

A visitor can land on any page of a demo, from a search, a shared link or a README. `<kazoku-page-header>` is one line in the page's top bar saying what the page is (the package's name, then what this page shows), with a Home link and a link to the printable sheets; `<kazoku-page-credits>` is the page's data credits, or one "Data and credits" link, above the footer, with a small form for a page that sits inside someone else's site. `pageHeadHtml` writes the `<title>` and description from the same words, and `pageProblems` checks a built page for all of it. English and Japanese, light and dark, 390 px wide, nothing to open. See [the guide](docs/guides/page-frame.md) and the demo's `page-frame.html`.

## Shared 3D renderer

A page with many 3D views gets one WebGL context, handed to the focused view; the others are stills made once from the same renderer, kept in a budgeted list. Shared geometries,
materials, textures and models are counted and freed when the last view lets go. Nothing is drawn while the page rests or the view is out of sight, one animation frame is
requested at a time, and a canvas never passes 6 million pixels or 4096 a side. Context loss is handled in one place. **three.js is a peer dependency and is never bundled**:
your page passes `load: () => import("three")`, so it loads only when the first view goes live. How a package uses it, the API and the freeze checks: [docs/renderer.md](docs/renderer.md). Demo: `renderer.html`.

```ts no-check
import { createSharedRenderer } from "@johnmorrisdotca/kazoku-ui/renderer";
const renderer = createSharedRenderer({ load: () => import("three") });
const view = renderer.view(host, item);   // item: { key, build({ three, assets, width, height }) => { scene, camera } }
host.addEventListener("focus", () => view.focus());
```

## One release workflow for the family's packages

`.github/workflows/reusable-release.yml` is the release written once: from main, the tag must equal `package.json`'s version, the repo's check script runs, a version already on npm is skipped, the `v<version>` tag is made if missing, and `npm publish --provenance` runs by trusted publishing (no token). A package repo's `release.yml` calls it:

```yaml
jobs:
  release:
    uses: johnmorrisdotca/kazoku-ui/.github/workflows/reusable-release.yml@v0.7.2
```

npm accepts a called workflow: the trusted-publisher entry on npmjs.com names the **calling** file (`release.yml`), and `id-token: write` goes on both. To move a repo over, keep its file name `release.yml`, replace the body with the call, and pin to a released tag. The inputs, the sources and the steps are in [docs/release-workflow.md](docs/release-workflow.md).

## One AGENTS.md for the family's package repos

`templates/AGENTS.md` is the agent-instruction file every package repo can start from: the family rules (read spx-stats `docs/package-work.md` first, the board and ticket prefix, ports, checks, release, hand-off) above a marker, and the repo's own facts below it. See [docs/agents-template.md](docs/agents-template.md).

## Content-Security-Policy

The styles are adopted as a constructable stylesheet (`adoptedStyleSheets`), so a page with `style-src 'self'` and no `'unsafe-inline'` needs no hash and no allowance. A browser without it gets a `<style>` carrying the element's `nonce`. What a page needs is in [docs/csp.md](docs/csp.md), and the demo's `csp.html` runs under a strict policy.

## Size

Gzipped, unbundled. View controls: the element and its definition about 9.3 KB, the controller 5.0 KB, the sight watch 0.6 KB, the maths 2.1 KB, the address 1.4 KB, the levels and layouts 0.6 KB, the zoom scale 1.5 KB, the labels 0.9 KB and the styles 4.0 KB (the four layouts and the slider). Theme switch: the element and its definition 3.3 KB, the choices 1.0 KB, the labels 0.3 KB and the styles 0.3 KB. Language picker: the element and its definition 2.8 KB, the codes and names 1.7 KB, the labels 0.3 KB. Save image: the element and its definition 3.0 KB, the rendering 3.6 KB, the formats and file names 1.0 KB, the labels 0.4 KB. Address state: 2.1 KB. Shared 3D renderer: 9.3 KB (the renderer 4.5, the scheduler 1.6, the assets 1.4, the stills 0.6, the pixel budget 0.8, the index 0.4), the test kit 1.6 KB; three.js is the page's own and is not counted. Shared by parts: the style adoption 0.8 KB, the base styles 1.0 KB, the page's colours 0.5 KB and the target and the store 0.6 KB. `pnpm test:package` prints them. Nothing is loaded from the network.

## Checks

`pnpm check` (lint, types, 122 unit tests of the maths, the address, the controller and the package, the build and the packed package), and `pnpm test:demo` (the demo in Chromium and WebKit at a phone's width and a desk's: the controls in the first screen, a toggle during Auto-turn leaves the angle advancing, the frame loop counted at `requestAnimationFrame` (nothing out of sight or hidden, one callback a page frame otherwise, a moved element too), the zoom readout against the state after every way of zooming, the speed button adding no row, each layout's controls, rows and sizes (compact one row on a phone, turning adding no row), the zoom slider by keys, mouse and touch, its marks for several ranges and always the true zoom, the layouts page, a button or link inside the view still clicks while a drag turns it, the opening zoom and fit scale, zoom about the pointer, zoom about an anchor (`?anchor=pin`), Arrow Up either way (`?key-tilt=wheel`), `?stop-turn`, `?tilt-step=1`, pan when zoomed, touch, the address, the labels, reduced motion, the controls styled under a strict `style-src` with no violation, `demo/csp.html`, the theme switch and the language picker in each browser and size, the address state, back and forward and no history added, on `demo/address.html`, and the save buttons: each file read back from disk, on `demo/save-image.html`, and the shared 3D renderer on `demo/renderer.html`: one WebGL context over fifty focus changes, nothing drawn or requested at rest, the GPU objects and heap flat, the canvas within budget at 5K, context loss, out of sight, the stills' byte budget, and three.js fetched only when a view goes live).

## Theming

Every part follows the page's colours: `data-theme="light"` or `"dark"` on the page forces them, and without it the device decides. `theme="light"` or `theme="dark"` on one element gives it a look of its own. The colours are custom properties on the element: `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line` and `--kazoku-accent`; the parts are `bar`, `field`, `slider` and `button` (and `group` for the others).

```html
<style>
  kazoku-theme-switch, kazoku-language-picker { --kazoku-accent: #2457d6; --kazoku-line: #c9cdd6; }
</style>
<kazoku-theme-switch></kazoku-theme-switch>
<script type="module">import "@johnmorrisdotca/kazoku-ui/theme-switch/define";</script>
```

## Accessibility

Controls are on or right beside the view and visible without scrolling; changing a control never stops or resets the turn; every control is 48 px; the choices are radio groups with one tab stop and the arrow keys; the zoom is announced politely once it has settled; each language button carries its own `lang`; reduced motion gets no automatic turn. The rules and the labels are in [Accessibility and labels](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/accessibility-and-labels.md).

## Limits

- **The Japanese labels have not yet been read by a native speaker.**
- **The demo's scene is a CSS 3D card;** the package has no opinion about what draws.
- **A picture of an element** (save image) cannot carry web fonts, `::before` or `::after`, or a cross-origin image: draw those into a canvas and save the canvas.
- **Several visible live 3D views at once are not supported** by the shared renderer: that is its point.
- **WebKit has no software GL switch,** so off CI its tests skip the pages that draw WebGL.
- **Early development (0.x):** a minor version can add to the interface. [Upgrading](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/upgrading.md) lists what asks something of you.

## Browser and runtime support

The elements need custom elements, shadow DOM and constructable stylesheets (Chrome, Edge, Firefox and Safari 16.4 or later; older Safari falls back to a `<style>` that carries the element's `nonce`). The demo is played in Chromium and WebKit, at a phone's width and a desk's. Node 22 or later builds and tests it (22.18 or later to run the TypeScript tests directly); the pure modules import on a server. To load an element only where it can run:

```js no-run
if ("customElements" in window) {
  await import("@johnmorrisdotca/kazoku-ui/theme-switch/define");
}
```

## Languages

Every label is in English and in Japanese, and a unit test holds that every key is in both. `lang="ja"` (on the element or on a parent) chooses Japanese; anything else is English. Your own words go over either set: `element.words = { front: "Home" }`, or `wordsFor("ja", { front: "ホーム" })`. The language picker names each language in its own language. The guides have a Japanese page each, in [docs/guides/ja](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/ja).

## Roadmap

Parts that arrive later: picture-tile pickers, Help, GitHub and npm pills and the family's backgrounds, each a new subpath that changes nothing that exists. Next for what is here: the Japanese labels read by a native speaker, and the family's other packages moving to the shared parts.

## Architecture

One part, one subpath; the pure code, the element and the registration are three files; a part never draws the page's scene; the shared internals (styles, adoption, scheme, store, target) are not exported. See the [architecture guide](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/architecture.md).

## Demos

[The demo](https://johnmorrisdotca.github.io/kazoku-ui/) has the view controls, the language picker and the theme switch in its header. Beside it: [speed buttons](https://johnmorrisdotca.github.io/kazoku-ui/speed.html), [the replay bar](https://johnmorrisdotca.github.io/kazoku-ui/replay.html), [the options window](https://johnmorrisdotca.github.io/kazoku-ui/options.html), [the wide layout](https://johnmorrisdotca.github.io/kazoku-ui/wide.html), [the page header and credits](https://johnmorrisdotca.github.io/kazoku-ui/page-frame.html), [layouts](https://johnmorrisdotca.github.io/kazoku-ui/layouts.html), [an element that carries the controls](https://johnmorrisdotca.github.io/kazoku-ui/carry.html), [the builder](https://johnmorrisdotca.github.io/kazoku-ui/builder.html), [address state](https://johnmorrisdotca.github.io/kazoku-ui/address.html), [save image](https://johnmorrisdotca.github.io/kazoku-ui/save-image.html), [print layout](https://johnmorrisdotca.github.io/kazoku-ui/print.html), [the shared renderer](https://johnmorrisdotca.github.io/kazoku-ui/renderer.html), [the shared scene](https://johnmorrisdotca.github.io/kazoku-ui/scene.html), [exact grab](https://johnmorrisdotca.github.io/kazoku-ui/grab.html) and [a strict Content-Security-Policy](https://johnmorrisdotca.github.io/kazoku-ui/csp.html).

<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/builder-dark.webp">
<img alt="The builder: the part chosen in a row of buttons, its options beside the live preview, and the code to copy under them" src="https://raw.githubusercontent.com/johnmorrisdotca/kazoku-ui/main/docs/images/builder-light.webp">
</picture>

## Documentation

| Guide | What it covers |
|---|---|
| [Getting started](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/getting-started.md) | The parts in a few minutes |
| [View controls](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/view-controls.md) | Every attribute, the event, the keys, the address |
| [Layouts and the zoom slider](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/layouts-and-zoom.md) | The four layouts and the slider's scale |
| [The view controller and its arithmetic](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/view-controller.md) | The controller without the element |
| [An element that carries the controls](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/element-controls.md) | One call that gives a package's own element the hands, and the zoom range |
| [Theme switch](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/theme-switch.md) | Light, Dark and Auto |
| [A settings menu](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/menu.md) | One button for the page's own controls |
| [Language picker](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/language-picker.md) | Each language in its own name |
| [Address state](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/address-state.md) | Choices kept in the link |
| [Save image](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/save-image.md) | A canvas, an SVG or an element as a picture |
| [Print layout](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/print.md) | Printable sheets, a poster over pages, a QR code, Print / save PDF |
| [Collection picker](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/collection-picker.md) | Search a list, and a chosen list to add, remove and reorder |
| [Search box](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/search-box.md) | One box for several kinds of result: groups, kind chips, an icon and actions on each row, and a preview of the highlighted result beside the list or in a sheet |
| [Speed buttons](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/speed-buttons.md) | 0.5×, 1×, 2× or your own steps, kept in an attribute and the address |
| [The shared renderer](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/renderer.md) | One WebGL context, and the freeze checks |
| [The family clock](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/clock.md) | One moment, speed and play for every view; opens moving; reduced motion |
| [The shared scene](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/scene.md) | One scene, camera and clock from many packages' layers, the SPX frame, two depth slices |
| [The browser lock](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/browser-lock.md) | One headless browser at a time: a line in `playwright.config`, or `withBrowserLock` in a script; and `kazoku-ci-image`, runs in CI's own image in CPU-fenced slots |
| [Frameworks and CSP](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/frameworks-and-csp.md) | React, Vue, Svelte, Angular, servers, strict policies |
| [Accessibility and labels](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/accessibility-and-labels.md) | The rules and the words |
| [Architecture](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/architecture.md) | The parts and the rules |
| [Troubleshooting and FAQ](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/troubleshooting.md) | A bar that does nothing, an unknown tag |
| [Upgrading](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/upgrading.md) | What each version asks of you |

Each guide has a Japanese page of the same name in [docs/guides/ja](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/guides/ja). The reference for every export is [docs/API.md](https://github.com/johnmorrisdotca/kazoku-ui/blob/main/docs/API.md), written from the built declarations. The repository's own notes: [theme switch](docs/theme-switch.md), [language picker](docs/language-picker.md), [address state](docs/address-state.md), [save image](docs/save-image.md), [renderer](docs/renderer.md), [the drag rule](docs/drag-rule.md), [CSP](docs/csp.md), [labels](docs/labels.md), [the package standard](docs/package-standard.md).

## Development

```sh
pnpm check          # lint, types, tests, the build and the packed package
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:demo      # build the demo and play it in Chromium and WebKit
pnpm test:readme    # every example of the README and the guides, run in Node and in a browser
pnpm docs:api       # rewrite docs/API.md from the built declarations
pnpm docs:check     # the reference is current, every guide has its Japanese page, every link and picture is there
pnpm screenshots    # the pictures of the README and the guides (docs/images)
pnpm dev            # the demo on http://127.0.0.1:8400/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md): no runtime dependencies, one part to a subpath, a part never draws the page's scene, labels in both languages, no marks, and tests for what you change. Add a line to `CHANGELOG.md` under **Unreleased** for a change a user would notice. `templates/` and `docs/package-standard.md` are what the family's other packages copy unchanged.

## Changes

Every release, dated, is in [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT. No brand, league or sponsor mark is in this package.
