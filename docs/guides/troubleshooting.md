---
title: Troubleshooting and FAQ
section: troubleshooting
order: 13
description: Fixes for a bar that does nothing, a tag that is unknown, a theme that flashes, controls that stop the turn, a missing address and the other things that go wrong.
---

## The bar shows but nothing moves

The bar tells your page what the reader chose; your page applies it. Listen for `kazoku-viewchange` on the element and apply `event.detail` (`yaw`, `tilt`, `zoom`, `panX`, `panY`) to your scene. If the page draws on every event, do the costly drawing only when `final` is true.

## A drag or the keys do nothing on the view

`for` must name an element that exists when the bar connects, or set `element.view = someElement`. The keys need the view to take focus: give it a `tabindex`. A press on a button, link or input inside the view is left alone on purpose (`ignore`); mark any other child that should not start a drag with `data-kazoku-ignore`.

## The tag is unknown, or the element is not upgraded

The `define` file was not imported, or ran before the DOM existed. Import `@johnmorrisdotca/kazoku-ui/<part>/define` once, in code that runs in the browser. A page that already registered the tag keeps its own: the `define` files leave a taken tag alone, and the first one wins.

## "HTMLElement is not defined"

You imported an `element` or `define` file on a server. Import those only in the browser; the pure paths (`/view-controls`, `/theme-switch`, `/language-picker`, `/save-image`, `/address-state`, `/renderer`, `/testing`) are safe anywhere. See [Frameworks and CSP](frameworks-and-csp.md#on-a-server).

## The controls are unstyled under a strict policy

A browser without constructable stylesheets (an older Safari) writes the styles into a `<style>`, which a strict `style-src` blocks unless it has the page's nonce. Put `nonce="..."` on the element, or set `element.nonce` before it connects.

## The page flashes the wrong colours

The theme switch applies the choice when its script runs, which is after the first paint. To avoid the flash, apply the remembered theme from a script in the head, before the body: `applyTheme(document.documentElement, readTheme({ search: location.search, storage: localStorage }) ?? "auto")`. See [Theme switch](theme-switch.md#without-the-element).

## The theme switch does nothing to my page

It writes `data-theme` on the target; your CSS must read it. Use the family's convention (no `data-theme` means the device decides, `light` and `dark` force it) or your own selectors for `[data-theme="dark"]`. If your styles are on another element, name it with `target`.

## The address does not change

`address` writes with `replaceState` after a quarter of a second, so a change shows a moment later; `flush()` writes at once. A sandboxed frame cannot change its address, and nothing throws. A value at its default leaves the address on purpose.

## The language picker starts in the wrong language

The order is the address, the store, `value`, the reader's languages, what the target's `lang` says, then the first code of `languages`. A language the page did not list is never chosen. Check the `languages` attribute and any `?lang=` in the link or `kazoku-lang` in storage.

## Auto-turn stops by itself

A reader who prefers reduced motion gets no automatic turn. The turn also stops while the view is scrolled out of sight or the tab is hidden, and goes on when it is back. `autoplay-for` ends the turn after that many seconds, and `stop-turn` stops it when the reader takes hold of the view.

## A button I put in the view is taken for a drag

Add the button to `ignore` (the default already covers `button`, `a`, `input`, `select`, `textarea` and `label`), or mark it `data-kazoku-ignore`. A button inside a closed shadow root cannot be seen: mark the host.

## Save image comes out blank or without fonts

A canvas is saved as it is. An SVG or an element is drawn by the browser through an image, which has no network and no page behind it: web fonts are not in it, `::before` and `::after` are not drawn, and a cross-origin `<img>` is left out. Draw that into a canvas and save the canvas. Under a strict `img-src`, allow `data:`.

## More than one WebGL context, or a growing GPU

Use the shared renderer and its freeze checks: one context for the page, shared assets, stills for the rest. See [The shared renderer](renderer.md).

## Questions

**Does it need a framework?** No. **Does it draw my scene?** Never. **Does it store anything?** Only if you ask: `storage` on the theme switch and the language picker, and the view controls remember the More level. **Is it on a CDN?** It is plain ES modules on npm; any CDN that serves npm files works. **Is the Japanese reviewed?** Not yet by a native speaker; see [Accessibility and labels](accessibility-and-labels.md).
