---
title: View controls
section: how-to
order: 2
description: The view-controls element in full: what the reader gets, every attribute, the event it sends, the keys and gestures, the address and what to do with each.
---

`<kazoku-view-controls>` gives any 3D or zoomable view a turn, a tilt, a zoom and a way to move it. It draws no scene of its own. It reports what the reader chose, in one event, and your page applies it to a canvas, WebGL, SVG or CSS 3D.

![The demo at a desk's width: a card turned a little and tipped, with the bar under it](../images/hero-light.webp)

## What the reader gets

- **Two levels, so the bar stays simple.** The default, `controls="basic"`, shows the angle slider, Auto-turn, zoom out and in with a **zoom readout** (`2.4×`; tap it to go back to Fit), Fit and a small More button. More adds tilt, the speed buttons (0.5×, 1×, 2×), Front and the arrow pad, and the choice is remembered.
- A drag turns the view (at 1x; a finger does not tilt, so the page can still scroll). Zoomed in, a drag moves it. The wheel over the view, a pinch, or Ctrl or Command with the wheel zooms about the pointer; Shift and the wheel, or a sideways swipe, turns it. Elsewhere the wheel scrolls the page, and so does a new turn of the wheel once the zoom is at its end that way.
- **A control never stops or resets the turn.** Zoom, tilt, pan, Fit and Front all leave Auto-turn running.
- Keys on the view: arrows turn and tip it, `+` and `-` zoom, `0` or Home is Front and Fit.
- English and Japanese labels, light and dark, 48 px touch targets, a compact bar on a phone, and no automatic turn for a reader who prefers reduced motion.
- Once the view is zoomed or moved, a **Centre** button (`中央`) puts the object back in the middle at Fit.

## Use it

```html
<div id="scene" tabindex="0" style="height: 260px">Your scene</div>
<kazoku-view-controls for="scene" address controls="basic"></kazoku-view-controls>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  const scene = document.getElementById("scene");
  const bar = document.querySelector("kazoku-view-controls");
  bar.addEventListener("kazoku-viewchange", (event) => {
    const { yaw, tilt, zoom, panX, panY, final } = event.detail;
    scene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${tilt}deg) rotateY(${yaw}deg)`;
    if (final) scene.dataset.settled = "yes";
  });
</script>
```

Put the element on the view or right beside it, so it is on screen with the view. `for` names the element the hands bind to (the pointer, pinch, wheel and keys); give that element a `tabindex` if you want the keys to work, or set `element.view = someElement`.

## The event

`kazoku-viewchange` is dispatched on the element; it bubbles and crosses shadow roots. `event.detail` is the same object the controller's `onChange` gets:

| Field | Meaning |
|---|---|
| `yaw` | Degrees, -180 up to 180: the turn about the vertical. Dragging right makes it larger. |
| `tilt` | Degrees, held to plus or minus `tilt-max` (30): the top tips away as it gets larger (dragging up). |
| `zoom` | 1 to 5 (`zoom-min`, `zoom-max`): 1 is Fit. The scene is drawn at `zoom * fitScale`. |
| `panX`, `panY` | CSS pixels the zoomed picture is moved from the middle of the view; 0 at 1x. |
| `turning` | True while Auto-turn is running. |
| `drag` | `"move"` or `"turn"`: what a plain drag does while zoomed in. |
| `final` | False for the steps of a drag, a pinch, a slider and the automatic turn; true when something settled. Do the costly drawing on `final`, the cheap transform on every event. |
| `reason` | What changed it: `init`, `auto`, `drag`, `pinch`, `wheel`, `key`, `slider`, `zoom`, `pan`, `front`, `fit`, `fit-scale`, `play`, `pause` or `set`. |

An `init` event is sent once, a moment after the element connects, with the starting view (from the attributes and the address). `element.state` is the current view at any time. The constants `TAG` and `EVENT` name the tag and the event.

## Attributes

| Attribute | What it does |
|---|---|
| `for` | The id of the view the hands bind to. Or set `element.view = someElement`. |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `yaw`, `tilt` | The starting angle and tilt. |
| `zoom` | The starting zoom: `fit` (the default) or a scale where 1 is the scene's natural size; it opens at that number divided by `fit-scale`. |
| `fit-scale` | The scale your page draws the scene at when it is at Fit (event `zoom` 1). 1 by default. Or call `element.setFitScale(n)` once the scene is measured. |
| `ignore` | A CSS selector for what inside the view a press leaves alone, so its click goes through: `button, a, input, select, textarea, label, [data-kazoku-ignore]` by default. |
| `anchor` | `x,y`: the point the + and - buttons, the 2x button and the keys zoom about, in CSS pixels from the middle of the view at Fit. |
| `key-tilt` | `drag` (the default: Arrow Up tips like a drag up) or `wheel` (the other way, as the wheel turned up tipped it before 0.13.0; the wheel zooms now). |
| `stop-turn` | A press, the wheel or a key stops the automatic turn. Off by default; buttons and sliders never stop it. |
| `tilt-step` | Round the tilt of a drag to a multiple of this many degrees. 0 by default: not rounded. |
| `object-size` | `w,h`: the object's size at Fit in CSS pixels when it is smaller than the view; a pan then keeps at least a quarter of it in view. |
| `grab-radius` | Exact grab for a globe or any turnable piece: its on-screen radius in CSS pixels at Fit, or `fit`. A drag then keeps the touched point under the pointer. |
| `autoplay` | Turn by itself from the start, unless the reader prefers reduced motion. |
| `autoplay-for` | Seconds of turning after which the `autoplay` turn stops by itself. |
| `speed` | Degrees a second at a pace of 1 (30). |
| `pace` | The Auto-turn speed as a multiple of `speed`: 1 by default, 0.5 and 2 on the default buttons. The reader's choice is written here and kept in the address as `pace`. The buttons are the family's [speed buttons](speed-buttons.md). |
| `paces` | The speeds the buttons stand for: `0.5 1 2` by default; any numbers (`paces="1 4 8"`). |
| `controls` | `basic` (the default) or `advanced`. What the reader chose with More is remembered in `localStorage` and wins. |
| `layout` | `classic` (the default), `horizontal`, `vertical` or `compact`: see [Layouts and the zoom slider](layouts-and-zoom.md). |
| `storage` | The `localStorage` key the level is remembered under (`kazoku-view-controls`). |
| `flat` | The view cannot turn: no angle, tilt, Auto-turn or Front, and a drag moves it. |
| `tilt-max`, `zoom-min`, `zoom-max` | The limits (30, 1, 5). |
| `address` | Keep the choices in the page's address (`?yaw=40&tilt=10&zoom=2&drag=turn&pace=2`). |
| `address-keys` | Other keys: `yaw:a,zoom:z`. |
| `theme` | `light` or `dark`; otherwise the page's colour scheme. |
| `overlay` | Sit over the bottom of a positioned parent. |

Methods are `play()`, `pause()`, `front()`, `fit()`, `centre()`, `set({ yaw, tilt, zoom, panX, panY, drag })`, `setFitScale(n)`, and `controller`, the [controller](view-controller.md) behind it. `element.words = { front: "Home" }` replaces labels. The colours are the custom properties `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line` and `--kazoku-accent`, and the parts are `bar`, `field`, `slider` and `button`.

## The address

Only what a reader chose is kept: angle, tilt, zoom, the drag choice and the auto-turn speed (`pace=0.5` or `pace=2`; 1 leaves the address, and a page's own `speed` parameter is never touched). The pan is in pixels of one screen and the turning is of a moment, so neither is. A value at its start leaves the address.

```js
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "@johnmorrisdotca/kazoku-ui/view-controls";

const choices = { yaw: 40, tilt: 10, zoom: 2, drag: "turn" };
console.log(formatAddress("?x=1", choices));
console.log(JSON.stringify(parseAddress("?yaw=40&tilt=x&zoom=2")));
console.log(JSON.stringify(DEFAULT_KEYS));
console.log(JSON.stringify(parseKeys("yaw:a,zoom:z")));
// ?x=1&yaw=40&tilt=10&zoom=2&drag=turn
// {"yaw":40,"zoom":2}
// {"yaw":"yaw","tilt":"tilt","zoom":"zoom","drag":"drag","speed":"pace"}
// {"yaw":"a","tilt":"tilt","zoom":"z","drag":"drag","speed":"pace"}
```

## Opening at the scene's natural size

Zoom 1 is Fit, whatever size that is on the page. A page that draws its scene at `fitScale` (0.4 of natural size when it fits the view, say) and wants to open at natural size sets `zoom="1"` and tells the controls the scale:

```js no-run
const controls = document.querySelector("kazoku-view-controls");
controls.setAttribute("zoom", "1"); // natural size
controls.setFitScale(0.4); // the scale the scene is drawn at when it fits
// the event's zoom is now 2.5; draw at event.detail.zoom * controls.fitScale
```

## Why the tag is only defined when it is free

`customElements.define` throws when a name is taken, and a page can meet that without any fault: two copies of this package, the script loaded twice, or a page that registered the tag to supply its own element. So `defineViewControls` (what the `define` import runs) calls `customElements.get` first, and the first one wins. The class, `ViewControlsElement`, is in `view-controls/element` if you want to register it yourself.

## Related

Everything that moves a view without the element: [The view controller and its arithmetic](view-controller.md). The rule that the surface under the pointer follows the pointer is in the repository's [drag rule](../drag-rule.md).
