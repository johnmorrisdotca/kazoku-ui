# Content-Security-Policy

Kazoku UI works on a page with a strict `style-src`: no `'unsafe-inline'`, no style hashes.

## What the elements do

Each element keeps its styles in its shadow root. They are written once as a constructable stylesheet and adopted with `adoptedStyleSheets`. That is not inline markup, so
`style-src` has nothing to block and the page needs no allowance for it. Elements with the same styles share one sheet. Chrome, Edge, Firefox and Safari 16.4 or later have it.

Where a browser has no constructable stylesheets (older Safari), the element writes the same text into a `<style>` in its shadow root. A strict `style-src` blocks an inline
`<style>` unless it carries the page's nonce, so the element copies its own `nonce` onto that `<style>`. Give the element the nonce your server sends:

```html
<meta http-equiv="content-security-policy" content="style-src 'self' 'nonce-r4nd0m'">
<kazoku-view-controls for="scene" nonce="r4nd0m"></kazoku-view-controls>
```

A page that sets the nonce from a script uses `element.nonce = "r4nd0m"` before the element connects. Without a nonce, the fallback is blocked in such a browser and the browser
reports a `securitypolicyviolation`; the controls then show unstyled.

## What a page needs

| Directive | Value | Why |
|---|---|---|
| `script-src` | `'self'` (or where you serve the package from) | the package is plain modules; it never uses `eval` or inline script |
| `style-src` | `'self'`, and `'nonce-...'` only to support browsers without constructable stylesheets | the elements add no external stylesheet and no inline style of their own |
| `img-src` | `data:`, only to save an SVG or an element as a PNG | the picture is drawn through an image with a `data:` URL ([save-image.md](save-image.md)); a canvas needs nothing |
| `connect-src`, `font-src` | nothing | the package loads nothing from the network |

No part sets a `style` attribute through markup. The controller sets `touch-action` on the view through the CSSOM (`element.style.touchAction`), which a strict `style-src` allows;
only `style="..."` in markup and `setAttribute("style", ...)` are blocked.

## The demo

`demo/csp.html` runs under `style-src 'self'` (a `<meta>` policy). `demo/csp-nonce.html` runs under `style-src 'self' 'nonce-kazoku'` with the nonce on the element.
Add `?fallback` to either to hide `CSSStyleSheet.prototype.replaceSync` and see the `<style>` route: it is styled with the nonce and blocked without it.
`pnpm test:demo` plays all of this in Chromium and WebKit (`e2e/csp.demo.mjs`): the buttons are 48 px tall, and no `securitypolicyviolation` event is raised.
