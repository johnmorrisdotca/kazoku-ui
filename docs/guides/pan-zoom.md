---
title: A flat pan and zoom
section: how-to
order: 30
description: A pan and zoom for a chart or a map that is drawn flat. One finger drags both ways, two fingers pinch about their middle, the wheel zooms about the pointer, the keys pan and zoom, and the zoom limits are yours.
---

`@johnmorrisdotca/kazoku-ui/pan-zoom` is for a view that is drawn flat: a star chart, a country map, a bracket. The [view controls](view-controls.md) are made for turning a 3D object (a finger drag never tilts, the zoom has a short range and the page keeps the plain wheel). A flat chart wants the opposite, so this part holds only a **view** and tells your page when it changes. It draws nothing and sends nothing, and it has no DOM of its own, so it imports on a server.

```ts no-check
import { createPanZoomController } from "@johnmorrisdotca/kazoku-ui/pan-zoom";

const pz = createPanZoomController({
  minZoom: 0.6,
  maxZoom: 60,
  onChange: ({ x, y, zoom }, reason) => draw(x, y, zoom),
});
const unbind = pz.bind(canvas); // canvas needs tabindex="0" to hear the keys
```

## The view

A view is `{ x, y, zoom }`. `x` and `y` are the CSS pixels the content has moved right of and below the middle of the element; `zoom` is 1 at Fit and 2 draws the content twice as big. Your page maps the three numbers onto its own projection (a centre and a scale, a transform). `pz.view` is the view now, and `onChange(view, reason)` hears each change with a `reason` of `"drag"`, `"pinch"`, `"wheel"`, `"key"` or `"api"`.

## What `bind(element)` does

| Hand | Result |
| --- | --- |
| One finger, a pen or the left mouse button | Drags the content any way (both axes). |
| Two fingers | Pinch zooms about the fingers' middle, and the middle's movement pans. |
| The wheel | Zooms about the pointer (see below). A trackpad's pinch arrives as a wheel with Ctrl held. |
| Arrow keys | Move the content by a tenth of the element's smaller side, the way the key points. |
| `+` and `-` (also `=` and `_`) | Zoom by 1.25 about the middle. |
| `Home` | Goes back to the home view. |

It sets `touch-action: none` on the element, so a finger pans the chart instead of scrolling the page, and `unbind()` puts the old value back. A click that ends a drag still arrives; if your chart reacts to a click, ignore one that follows a `"drag"` change. The element is not given a tab stop or a role: your page does that, with a name that says what the chart is.

## The plain wheel

Pages with a map zoom with the plain wheel; the 3D parts zoom only with Ctrl or Command, so that the page still scrolls. A flat chart chooses, with `wheel`:

- `"zoom"` (the default): the plain wheel zooms about the pointer. Use it for a chart that fills its page or its own panel.
- `"modifier"`: only Ctrl or Command with the wheel zooms, and the plain wheel scrolls the page. Use it for a chart in the middle of a long page.
- `"none"`: the wheel is left alone.

## Limits and the home view

`minZoom` (default 0.1) and `maxZoom` (default 50) are not tied to the view controls' limits, so a sky can ask for 0.6 to 60. `home` is the view to start from and for `reset()` and `Home` to go back to. `pz.set({ x, y, zoom })`, `pz.panBy(dx, dy)`, `pz.zoomBy(factor, about)` and `pz.reset()` change the view from your own buttons, and say nothing if nothing changed. The arithmetic is also exported on its own: `zoomAbout(view, factor, px, py, min, max)` keeps the content under (`px`, `py`) where it was, `panBy`, `clampZoom`, `wheelFactor` and `distance`.

## Not included

The view is not written to the address; a page that wants `?x=&y=&zoom=` reads `pz.view` and calls `pz.set` itself (the [address state](address-state.md) part writes any keys you give it).

## The parts

| Import | What it is |
| --- | --- |
| `pan-zoom` | `createPanZoomController`, `zoomAbout`, `panBy`, `clampZoom`, `wheelFactor` and `distance`, with their types. No DOM until you call `bind`. |
