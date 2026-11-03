---
title: Frameworks and CSP
section: how-to
order: 10
description: Use the parts in plain HTML, React, Vue, Svelte and Angular, render on a server safely, register a tag yourself, and run under a strict Content-Security-Policy.
---

Every part is a standard custom element, so any framework that can render a custom tag can use it. The element is plain DOM: give it a ref, listen for one event, and let it draw its own buttons. The pure modules beside the elements (`view-controls`, `theme-switch`, `language-picker`, `save-image` and `address-state`) have no DOM at import, so they are safe on a server.

## Plain HTML

```html
<div id="scene" tabindex="0" style="height: 200px">Your scene</div>
<kazoku-view-controls for="scene" address></kazoku-view-controls>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  document.querySelector("kazoku-view-controls").addEventListener("kazoku-viewchange", (event) => {
    document.getElementById("scene").dataset.yaw = String(event.detail.yaw);
  });
</script>
```

Without a bundler, the browser needs to find the package by name. An import map says where each subpath lives:

```html
<script type="importmap">
{ "imports": {
  "@johnmorrisdotca/kazoku-ui/view-controls/define": "/node_modules/@johnmorrisdotca/kazoku-ui/dist/view-controls/define.js",
  "@johnmorrisdotca/kazoku-ui/theme-switch/define": "/node_modules/@johnmorrisdotca/kazoku-ui/dist/theme-switch/define.js"
} }
</script>
<kazoku-theme-switch address></kazoku-theme-switch>
<script type="module">import "@johnmorrisdotca/kazoku-ui/theme-switch/define";</script>
```

Each `define` file imports the files it needs by relative path, so only the names you write need a mapping. The same files are served by every bundler from `node_modules` with no mapping at all.

## React

```jsx
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { useEffect, useRef } from "react";

export function Viewer({ draw }) {
  const view = useRef(null);
  const controls = useRef(null);
  useEffect(() => {
    const bar = controls.current;
    bar.view = view.current;
    const on = (event) => draw(event.detail);
    bar.addEventListener("kazoku-viewchange", on);
    return () => bar.removeEventListener("kazoku-viewchange", on);
  }, [draw]);
  return (
    <>
      <div ref={view} tabIndex={0} style={{ height: 320 }} />
      <kazoku-view-controls ref={controls} lang="en" />
    </>
  );
}
```

## Vue 3

Tell the compiler the tags are custom elements (`isCustomElement` for `kazoku-`), then use a ref and one listener:

```vue
<script setup>
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { onMounted, ref } from "vue";

const emit = defineEmits(["change"]);
const view = ref(null);
const bar = ref(null);
onMounted(() => {
  bar.value.view = view.value;
  bar.value.addEventListener("kazoku-viewchange", (event) => emit("change", event.detail));
});
</script>
<template>
  <div ref="view" tabindex="0" style="height: 320px" />
  <kazoku-view-controls ref="bar" />
</template>
```

## Svelte

```svelte
<script>
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import { onMount } from "svelte";
  let choice = "auto";
  let switcher;
  onMount(() => switcher.addEventListener("kazoku-themechange", (event) => (choice = event.detail.choice)));
</script>
<kazoku-theme-switch bind:this={switcher} address></kazoku-theme-switch>
<p>The choice is {choice}.</p>
```

## Angular

```ts no-check
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit } from "@angular/core";
import "@johnmorrisdotca/kazoku-ui/language-picker/define";

@Component({
  selector: "app-language",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<kazoku-language-picker #picker languages="en ja" address></kazoku-language-picker>`,
})
export class LanguageComponent implements AfterViewInit {
  @ViewChild("picker") picker!: ElementRef<HTMLElement>;
  ngAfterViewInit() {
    this.picker.nativeElement.addEventListener("kazoku-languagechange", (event) => console.log((event as CustomEvent).detail.lang));
  }
}
```

## On a server

The elements extend `HTMLElement` when their module is evaluated, so a `define` or `element` import fails on a server with "HTMLElement is not defined". Import those only in the browser (in React, inside an effect or a dynamic import with server rendering off). The pure modules are safe anywhere:

```js
import { applyTheme, themeOf } from "@johnmorrisdotca/kazoku-ui/theme-switch";
import { startingLanguage } from "@johnmorrisdotca/kazoku-ui/language-picker";
import { formatAddress } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { PARTS } from "@johnmorrisdotca/kazoku-ui";

console.log(typeof document, typeof applyTheme, typeof themeOf);
console.log(startingLanguage({ list: ["en", "ja"], preferred: ["ja-JP", "en"] }));
console.log(formatAddress("", { yaw: 0, tilt: 0, zoom: 2, drag: "move" }));
console.log(PARTS.length > 5);
// undefined function function
// ja
// ?zoom=2
// true
```

`PARTS` lists the subpaths of the parts in the order they were added. To render the right language and colours on the server before the page loads, read the request's address and cookies with `startingLanguage` and `readTheme`, and write `lang` and `data-theme` on the `<html>` in the markup.

## Registering a tag yourself

`define` files register a tag once and only if it is free: they call `customElements.get` first. The function a `define` import runs is exported from it too: `defineViewControls`, `defineThemeSwitch`, `defineLanguagePicker` and `defineSaveImage`. Calling one registers its tag if it is free. A page that wants to register a tag itself, or under another name, imports the class from the `element` path and registers it:

```html
<script type="module">
  import { ThemeSwitchElement } from "@johnmorrisdotca/kazoku-ui/theme-switch/element";

  class SiteTheme extends ThemeSwitchElement {}
  customElements.define("site-theme", SiteTheme);
</script>
<site-theme></site-theme>
```

## Content-Security-Policy

The package works on a page with a strict `style-src`: no `'unsafe-inline'`, no style hashes. Each element keeps its styles in its shadow root, written once as a constructable stylesheet and adopted with `adoptedStyleSheets`. That is not inline markup, so `style-src` has nothing to block. Chrome, Edge, Firefox and Safari 16.4 or later have it.

Where a browser has no constructable stylesheets (older Safari), the element writes the same text into a `<style>` in its shadow root, which a strict `style-src` blocks unless it carries the page's nonce. So the element copies its own `nonce` onto that `<style>`: give the element the nonce your server sends.

```html no-check
<meta http-equiv="content-security-policy" content="style-src 'self' 'nonce-r4nd0m'">
<kazoku-view-controls for="scene" nonce="r4nd0m"></kazoku-view-controls>
<div id="scene" tabindex="0">Your scene</div>
<script type="module">import "@johnmorrisdotca/kazoku-ui/view-controls/define";</script>
```

A page that sets the nonce from a script uses `element.nonce = "r4nd0m"` before the element connects.

| Directive | Value | Why |
|---|---|---|
| `script-src` | `'self'` (or where you serve the package from) | the package is plain modules; it never uses `eval` or inline script |
| `style-src` | `'self'`, and `'nonce-...'` only to support browsers without constructable stylesheets | the elements add no external stylesheet and no inline style of their own |
| `img-src` | `data:`, only to save an SVG or an element as a PNG | the picture is drawn through an image with a `data:` URL; a canvas needs nothing |
| `connect-src`, `font-src` | nothing | the package loads nothing from the network |

No part sets a `style` attribute through markup. The controller sets `touch-action` on the view through the CSSOM, which a strict `style-src` allows. The demo's `csp.html` runs under `style-src 'self'` and `csp-nonce.html` under a nonce; add `?fallback` to either to see the `<style>` route. The repository's [CSP notes](../csp.md) and the demos are played in Chromium and WebKit by `pnpm test:demo`.
