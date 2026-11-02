# Theme switch

`<kazoku-theme-switch>`: Light, Dark and Auto as a row of buttons. It writes the choice as `data-theme` on a target (the page's `<html>` unless you name another), keeps it in the
address and, if asked, in `localStorage`, and tells the page with an event. It never draws the page: your CSS reads `data-theme`.

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
</script>
```

```css
:root { color-scheme: light dark; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #121317; } }
:root[data-theme="dark"] { --bg: #121317; color-scheme: dark; }
```

That is the family's convention (see each demo's `family.css`): no `data-theme` means the device decides, `light` and `dark` force it. **Auto takes the attribute off**,
so a page written this way needs nothing else.

## Attributes

| Attribute | |
|---|---|
| `value` | `light`, `dark` or `auto`: the choice. Setting it later applies it. |
| `target` | A CSS selector for the element that gets `data-theme`. The page's `<html>` by default. Found in the switch's own tree first, so it works inside another element's shadow root. Or set `element.target = someElement`. |
| `modes` | Which buttons: `light dark` leaves Auto out. All three by default. |
| `address` | Keep the choice in the address (`?theme=dark`). Auto leaves the address. `address-key` renames the parameter. |
| `storage` | Also remember it in `localStorage`. A bare `storage` uses the key `kazoku-theme`; `storage="my-key"` names it. A browser that keeps nothing still switches. |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `theme` | `light` or `dark`: its own look, otherwise the page's (see below). |

The choice is read in this order: the address, the store, `value`, then what the target already holds (`data-theme` of the page), else Auto.
`element.value` reads and sets it; `element.scheme` is the colours showing now (`light` or `dark`, Auto being the device's).
`element.words = { auto: "System" }` replaces labels. Colours are custom properties on the element: `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line`, `--kazoku-accent`; the parts are `group` and `button`.

## The event

`kazoku-themechange` is dispatched on the element (it bubbles and crosses shadow roots). `event.detail`:

| Field | Meaning |
|---|---|
| `choice` | `light`, `dark` or `auto`. |
| `scheme` | `light` or `dark`: the colours now showing. |
| `reason` | `init` (once, a moment after it connects), `user` (a button), `set` (the `value` property or attribute), `system` (the device changed while on Auto) or `external` (something else wrote the target's `data-theme`: a page's own button, another switch). |
| `target` | The element the choice is written on. |

Something else writing `data-theme` on the target moves the switch with it, so two switches on one page agree.

## Other family parts

A part that draws itself from the page's colours (a canvas, an SVG background) listens to the event and redraws. The view controls follow the device by themselves; to have them
follow a forced Light or Dark too, pass it on:

```js
themeSwitch.addEventListener("kazoku-themechange", ({ detail }) => {
  if (detail.choice === "auto") controls.removeAttribute("theme");
  else controls.setAttribute("theme", detail.choice);
});
```

The theme switch itself, and every part added after it, takes its colours from the page's `data-theme` (forced) or the device's, so it is dark in a page forced dark on a light device.

## Without the element

```js
import { applyTheme, readTheme, resolveTheme } from "@johnmorrisdotca/kazoku-ui/theme-switch";

// As early as you can, to avoid a flash of the wrong colours: read what was remembered and apply it.
applyTheme(document.documentElement, readTheme({ search: location.search, storage: localStorage }) ?? "auto");
```

`readTheme({ search, addressKey, storage, storageKey })` reads the address first, then the store (a store that throws is an empty one); `applyTheme(target, choice)` writes or removes `data-theme`;
`resolveTheme(choice, prefersDark)` gives `light` or `dark`; `themeOf(target)` reads what a target holds; `parseModes(text)` and `parseTheme(text)` read attributes. All of it imports on a server.

## Content-Security-Policy

The styles are adopted as a constructable stylesheet (see [csp.md](csp.md)); `demo/csp.html` and `demo/csp-nonce.html` carry a theme switch under a strict `style-src`.

## Looking at it

48 px buttons; on a phone the words are left to a screen reader and the icons stay. Labels in English and Japanese ([labels.md](labels.md)). `pnpm test:demo` plays it in Chromium and WebKit
at a phone's width and a desk's (`e2e/theme-switch.demo.mjs`): each button, the page's colours changing, the event for each reason, the address, the store, a browser with no store,
another writer of `data-theme`, a switch inside another element's shadow root.
