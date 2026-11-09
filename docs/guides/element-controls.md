---
title: An element that carries the controls
section: how-to
order: 20
description: How a package's own custom element takes the drag, the pinch, the wheel and the keys with one call, the attributes that turn them off or set their limits, and the zoom range and why it is wide.
---

A reader who drops a package's tag on a page expects the picture to zoom and pan. The element does that itself: it calls `carryControls` when it is connected and the shared hands are on it, with no `<kazoku-view-controls>` and no wiring on the page. A page that wants buttons adds the bar as before.

## The call

```html
<my-card id="card" zoom-max="20"></my-card>

<script type="module">
  import { carryControls } from "@johnmorrisdotca/kazoku-ui/view-controls";

  class MyCard extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot === null) this.attachShadow({ mode: "open" }).innerHTML = "<div id=card>Card</div>";
      this.controls = carryControls(this, { onChange: (state) => this.draw(state) });
      this.draw(this.controls.controller.state);
    }
    disconnectedCallback() {
      this.controls.unbind();
    }
    draw({ yaw, tilt, zoom, panX, panY }) {
      this.shadowRoot.getElementById("card").style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${-tilt}deg) rotateY(${yaw}deg)`;
    }
  }
  customElements.define("my-card", MyCard);
</script>
```

`carryControls(element, options)` returns `{ controller, setLimits, unbind }`. `onChange(state, info)` is the only required option: the element applies the state, as it would from the bar's `kazoku-viewchange` event. The rest are the [controller's options](view-controller.md) (`turnable`, `grabRadius`, `objectSize`, `fitScale`, `zoom`, `limits` and the others), and `on`. `controller` is for the element's own `set`, `fit` and `state`. `unbind` lets every hand go and destroys the controller; a view that is moved and connected again calls `carryControls` again and starts from Fit, or from the `initial` it is given.

## What it does, once

- **Drag and pinch.** A drag turns the picture at Fit and moves it once zoomed; two fingers pinch, move and twist. A double tap goes to 2× and back.
- **The wheel.** At Fit the plain wheel scrolls the page, so the picture is never a trap. Ctrl, Command or Alt with the wheel zooms about the pointer, and once zoomed the plain wheel moves the view.
- **Keys.** The arrows turn, + and − zoom, 0 and Home put it back. The element gets `tabindex="0"` unless the page gave it one, and also when a bar was bound to it before it started, so the bar's keys always have somewhere to go.
- **`touch-action`.** It is `pan-y` at Fit, so a finger can still scroll the page, and `none` once zoomed. A custom element is inline unless you say otherwise, and `touch-action` does nothing on an inline element, so an inline element is made a block while it carries the hands.
- **Reduced motion.** Nothing starts by itself, so there is nothing to hold back; Centre goes at once.
- **Off screen.** The automatic turn, if the page starts one, is held while the element cannot be seen.

## The attributes

| Attribute | |
|---|---|
| `controls` | Left out, the hands are on (`on: false` in the options makes a still picture start with them off). `controls="none"` takes them off. It is watched, so turning it on and off at run time works. |
| `zoom-min`, `zoom-max` | The zoom range. They win over the `limits` in the options, which win over the defaults. `zoom-min` is held to 1 or less and `zoom-max` to `zoom-min` or more, so Fit is always inside. Watched too. |
| `tilt-max`, `roll-max` | The tilt (30) and roll (180) limits, in degrees. |

## Limits that change

A view whose detail changes (a map that finds more tiles, a body that is ridden) changes its own range: call `setLimits` with any of `zoomMin`, `zoomMax`, `tiltMax` and `rollMax`.

```js no-check
const { setLimits } = carryControls(this, { onChange, limits: { zoomMax: 5 } });
setLimits({ zoomMax: 20 });
```

The new numbers replace the `limits` the package passed, so the order is still the attribute, then the package, then the defaults: a `zoom-max` attribute on the element wins over `setLimits`. A limit you leave out stays as it was. A zoom outside the new range is moved inside it, and a bound bar hears the new limits through `kazoku-viewcarry` and redraws its marks and sliders. Writing the element's own `zoom-min` and `zoom-max` attributes still works, and is for the page rather than the package.

## With a bar

`<kazoku-view-controls for="card">` on the same element takes the hands over while it is there: it marks the element with `data-kazoku-bar` and says so with a `kazoku-viewbar` event, and the element's own hands stand down, so a drag is never handled twice. The page then applies the bar's `kazoku-viewchange` events as before. When the bar goes, the element's hands come back, from Fit. The zoom range then comes from the bar's own `zoom-min`, `zoom-max`, `tilt-max` and `roll-max` where it has them, and from the element's otherwise (its attributes, then the `limits` the package passed): the element tells the bar with a `kazoku-viewcarry` event (`detail.limits`) whenever they change.

## The zoom range and why it is wide

The default is **0.1× to 50×** (`DEFAULT_LIMITS`; before 0.21 it was 1× to 5×). Zoom draws no more pixels: the canvas is a fixed size, inside the renderer's cap of 4096 pixels a side and 6 million pixels, and zooming only scales what is already drawn. So the floor is arbitrary, and a tenth of Fit leaves room to see the whole scene small, and the ceiling is set only by where the picture's detail runs out.

A package passes its own limits where its detail does run out, in `limits` or with `zoom-max` on its tag:

- A line drawing, an SVG, a star chart or a 3D model has detail at any scale: 50× or more.
- A painted map is sharp to about 1.5× for a 2048 pixel map and about 3× for a 4096 pixel one, and then it blurs; its element says so with a lower `zoomMax`, until it loads finer tiles.
- A view that spans many orders of magnitude (the planets and their distances) sets its own floor, such as `zoomMin: 1e-6`.

The zoom slider keeps up. It is logarithmic, so a press of − or + moves it the same distance anywhere, and over a wide range (100× or more from end to end) its marks are the powers of ten first: 0.1× to 50× reads 0.1×, 1×, 10×, 50×, and 0.1× to 1000× reads 0.1×, 1×, 10×, 100×, 1000×. A narrow range keeps its familiar marks (1×, 2×, 3×, 5×).

```js
import { DEFAULT_LIMITS, readLimits, zoomMarks } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(JSON.stringify(DEFAULT_LIMITS));
console.log(JSON.stringify(readLimits((name) => ({ "zoom-max": "8" })[name] ?? null, { ...DEFAULT_LIMITS, zoomMin: 0.5 })));
console.log(zoomMarks(0.1, 50).map((mark) => mark.zoom).join(" "));
console.log(zoomMarks(0.1, 1000).map((mark) => mark.zoom).join(" "));
// {"tiltMax":30,"rollMax":180,"zoomMin":0.1,"zoomMax":50}
// {"tiltMax":30,"rollMax":180,"zoomMin":0.5,"zoomMax":8}
// 0.1 1 10 50
// 0.1 1 10 100 1000
```

A page that wants the old range sets `zoom-min="1" zoom-max="5"` on the bar or the element, and nothing else changes. [Upgrading](upgrading.md) lists what the new default changes.
