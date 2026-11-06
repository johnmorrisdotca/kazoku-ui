---
title: Getting started
section: tutorial
order: 1
description: Put the family's view controls, theme switch and language picker on a page in a few minutes, with no framework and no build step beyond your own.
---

Kazoku UI 家族 is the family's shared interface parts as one versioned package: one part per subpath, so a page loads only what it uses. There are no runtime dependencies. Every part is a plain custom element with a pure module beside it, so the same code works in a page, a framework or a server.

![The demo: the header holds the language picker and the theme switch; below, a card turned a little with the view controls under it](../images/hero-light.webp)

## Install

```sh
npm install @johnmorrisdotca/kazoku-ui
```

Each part has its own subpath. The `define` file registers the tag, once, and only if the tag is free:

| Part | Tag | Import to register it |
|---|---|---|
| View controls | `<kazoku-view-controls>` | `@johnmorrisdotca/kazoku-ui/view-controls/define` |
| Theme switch | `<kazoku-theme-switch>` | `@johnmorrisdotca/kazoku-ui/theme-switch/define` |
| Language picker | `<kazoku-language-picker>` | `@johnmorrisdotca/kazoku-ui/language-picker/define` |
| Save image | `<kazoku-save-image>` | `@johnmorrisdotca/kazoku-ui/save-image/define` |
| Speed buttons | `<kazoku-speed-buttons>` | `@johnmorrisdotca/kazoku-ui/speed-buttons/define` |
| Embed panel | `<kazoku-embed-panel>` | `@johnmorrisdotca/kazoku-ui/embed-panel/define` |

The shared renderer (`/renderer`), the freeze checks (`/testing`) and the address state (`/address-state`) have no element.

## Controls for a view

The view controls never draw your scene. They tell your page what the reader chose, and your canvas, WebGL, SVG or CSS 3D applies it. Put the element next to the view, name the view with `for`, and listen for one event:

```html
<div id="scene" tabindex="0" style="height: 260px">Your scene</div>
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

The bar has an angle slider, Auto-turn, zoom out and in with a readout, Fit and a More button. A drag turns the view, the wheel moves it, and a pinch or Ctrl, Command or Alt with the wheel zooms about the pointer. The arrow keys turn it, and `address` keeps the choices in the link. The whole story is in [View controls](view-controls.md).

## A theme switch and a language picker

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import "@johnmorrisdotca/kazoku-ui/language-picker/define";

  document.addEventListener("kazoku-languagechange", ({ detail }) => console.log("language", detail.lang));
</script>
```

The theme switch writes `data-theme` on `<html>` and your CSS reads it; the language picker writes `lang` and tells the page, which says its own words. See [Theme switch](theme-switch.md) and [Language picker](language-picker.md).

## Choices in the address, without an element

```js
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";

const where = { search: "", pathname: "/", hash: "", written: [] };
const host = {
  location: where,
  history: { state: null, replaceState(_state, _unused, url) { where.search = url.includes("?") ? url.slice(url.indexOf("?")) : ""; where.written.push(url); } },
};
const state = createAddressState({ defaults: { size: "m" }, delay: 0, host });
state.set("size", "l");
console.log(where.search, state.get("size"));
state.set("size", "m");
console.log(JSON.stringify(where.search), state.get("size"));
// ?size=l l
// "" m
```

A value at its default leaves the address, the page's other parameters and its `#hash` are kept, and a choice adds nothing to the history. See [Address state](address-state.md).

## Where to go next

- A canvas, an SVG or any element as a picture: [Save image](save-image.md).
- One row of 0.5×, 1×, 2× (or your own steps) for any speed: [Speed buttons](speed-buttons.md).
- One "Put it in your page" panel for a package's demo: [The embed panel](embed-panel.md).
- Many 3D views, one WebGL context: [The shared renderer](renderer.md).
- React, Vue, Svelte, Angular and a strict Content-Security-Policy: [Frameworks and CSP](frameworks-and-csp.md).
- How it is put together: [Architecture](architecture.md).
- Try everything live: the [demo](https://johnmorrisdotca.github.io/kazoku-ui/) and the [builder](https://johnmorrisdotca.github.io/kazoku-ui/builder.html).
