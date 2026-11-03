---
title: Theme switch
section: how-to
order: 5
description: Light, Dark and Auto as one row of buttons that writes data-theme on the page, keeps the choice in the address and in storage, and sends one event.
---

`<kazoku-theme-switch>` is Light, Dark and Auto as a row of 48 px buttons. It writes the choice as `data-theme` on a target (the page's `<html>` unless you name another), keeps it in the address and, if asked, in `localStorage`, and tells the page with an event. It never draws the page: your CSS reads `data-theme`.

![The demo's header: the language picker and the theme switch](../images/switches-light.webp)

## Use it

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
</script>
```

Write your colours the family's way: no `data-theme` means the device decides, `light` and `dark` force it. **Auto takes the attribute off**, so a page written like this needs nothing else:

```css
:root { color-scheme: light dark; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #121317; } }
:root[data-theme="dark"] { --bg: #121317; color-scheme: dark; }
```

## Attributes

| Attribute | |
|---|---|
| `value` | `light`, `dark` or `auto`: the choice. Setting it later applies it. |
| `target` | A CSS selector for the element that gets `data-theme`. The page's `<html>` by default. Found in the switch's own tree first, so it works inside another element's shadow root. Or set `element.target = someElement`. |
| `modes` | Which buttons: `light dark` leaves Auto out. All three by default. |
| `address` | Keep the choice in the address (`?theme=dark`). Auto leaves the address. `address-key` renames the parameter. |
| `storage` | Also remember it in `localStorage`. A bare `storage` uses the key `kazoku-theme`; `storage="my-key"` names it. A browser that keeps nothing still switches. |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `theme` | `light` or `dark`: its own look, otherwise the page's. |

The choice is read in this order: the address, the store, `value`, then what the target already holds, else Auto. `element.value` reads and sets it; `element.scheme` is the colours showing now (`light` or `dark`, Auto being the device's). `element.words = { auto: "System" }` replaces labels. The colours are the custom properties `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line` and `--kazoku-accent`; the parts are `group` and `button`.

## The event

`kazoku-themechange` is dispatched on the element and bubbles across shadow roots. `event.detail`:

| Field | Meaning |
|---|---|
| `choice` | `light`, `dark` or `auto`. |
| `scheme` | `light` or `dark`: the colours now showing. |
| `reason` | `init` (a moment after it connects), `user` (a button), `set` (the `value` property or attribute), `system` (the device changed while on Auto) or `external` (something else wrote the target's `data-theme`: a page's own button, another switch). |
| `target` | The element the choice is written on. |

Something else writing `data-theme` on the target moves the switch with it, so two switches on one page agree.

## Other family parts

A part that draws itself from the page's colours (a canvas, an SVG background) listens to the event and redraws. The view controls follow the device by themselves; to have them follow a forced Light or Dark too, pass it on:

```html
<kazoku-theme-switch id="switch"></kazoku-theme-switch>
<kazoku-view-controls id="controls" for="scene"></kazoku-view-controls>
<div id="scene" tabindex="0">Your scene</div>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  document.getElementById("switch").addEventListener("kazoku-themechange", ({ detail }) => {
    const controls = document.getElementById("controls");
    if (detail.choice === "auto") controls.removeAttribute("theme");
    else controls.setAttribute("theme", detail.choice);
  });
</script>
```

## Without the element

Everything the element does is in plain functions that import on a server. To avoid a flash of the wrong colours, read what was remembered and apply it as early as you can, from a script in the head:

```js
import { THEMES, THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY, applyTheme, parseModes, parseTheme, readTheme, resolveTheme, themeOf } from "@johnmorrisdotca/kazoku-ui/theme-switch";

console.log(THEMES.join(" "), THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY);
console.log(readTheme({ search: "?theme=dark" }), readTheme({ search: "?x=1" }));
console.log(resolveTheme("auto", true), resolveTheme("light", true));
console.log(parseTheme("dark"), parseTheme("sepia"), parseModes("light dark"), parseModes("nonsense"));

const target = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute(name) { delete this.attributes[name]; }, getAttribute(name) { return this.attributes[name] ?? null; } };
applyTheme(target, "dark");
console.log(JSON.stringify(target.attributes), themeOf(target));
applyTheme(target, "auto");
console.log(JSON.stringify(target.attributes), themeOf(target));
// light dark auto theme data-theme kazoku-theme
// dark undefined
// dark light
// dark undefined [ 'light', 'dark' ] [ 'light', 'dark', 'auto' ]
// {"data-theme":"dark"} dark
// {} auto
```

`readTheme({ search, addressKey, storage, storageKey })` reads the address first, then the store (a store that throws is an empty one). `applyTheme(target, choice)` writes or removes `data-theme`. `resolveTheme(choice, prefersDark)` gives `light` or `dark`. `themeOf(target)` reads what a target holds. `parseModes(text)` and `parseTheme(text)` read attributes. The tag and the event names are `TAG` and `EVENT`, and the labels `WORDS` and `wordsFor`.

## Strict policies

The styles are adopted as a constructable stylesheet, so a page with `style-src 'self'` needs no allowance: see [Frameworks and CSP](frameworks-and-csp.md).
