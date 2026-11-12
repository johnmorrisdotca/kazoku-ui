---
title: View controls
section: how-to
order: 2
description: "The view-controls element in full: what the reader gets, every attribute, the event it sends, the keys and gestures, the address and what to do with each."
---

`<kazoku-view-controls>` gives any 3D or zoomable view a turn, a tilt, a zoom and a way to move it. It draws no scene of its own. It reports what the reader chose, in one event, and your page applies it to a canvas, WebGL, SVG or CSS 3D.

![The demo at a desk's width: a card turned a little and tipped, with the bar under it](../images/hero-light.webp)

## What the reader gets

- **Two levels, so the bar stays simple.** The default, `controls="basic"`, shows one slider and the Auto-turn axis (Angle, Tilt, Roll or All). The slider sets the axis the chips name, and All keeps the angle. Then Auto-turn, zoom out and in with a **zoom readout** (`2.4×`; tap it to go back to Fit), Fit and a small More button. More adds the speed buttons (0.5×, 1×, 2×), which way the turn goes, Front and the arrow pad, and the choice is remembered.
- A plain left drag, and one finger, turn the view at every zoom (a finger does not tilt, so the page can still scroll at Fit); the hand never changes with the zoom. Shift and a drag rolls, and a two-finger twist rolls. The wheel moves the view, and Shift and the wheel moves it sideways; a two-finger swipe moves it too. Ctrl, Command or Alt with the wheel, or a pinch, zooms about the pointer. Ctrl or Command and a left drag, the middle or right button and a drag, or Space and a drag, moves it, and two fingers dragging together move it too; the pointer is a hand while Space is held. A plain left drag leaves roll alone. At Fit, with nothing to move to, the wheel scrolls the page; once zoomed in, the wheel moves the view, and a new turn that starts at the edge of that move scrolls the page again. With `free-pan` every one of these moves the view at any zoom, zoomed out too, and the view takes every touch.
- **The turn speeds say how long one turn of the view takes.** They are the family's [speed buttons](speed-buttons.md) at paces of 0.125, 0.25, 0.5 and 1 times `speed`, and each shows its turn's time: 4 min, 2 min, 1 min, 30 s (4分 … 30秒 under 1周 in Japanese), and "The view turns once in 30 seconds" to a screen reader, so they cannot be taken for a clock's speed buttons and their `1×`. While the view turns in the basic level, one small button shows "One turn in" over the time and a press steps to the next. The choice is kept in the `pace` attribute and in the address as `?pace=0.5`. A page that wants faster turns names them in `paces` (`paces="1 4 8"`), and each still shows its time.
- **A control never stops or resets the turn.** Zoom, tilt, pan, Fit and Front all leave Auto-turn running.
- Keys on the view: arrows turn and tip it, Shift and Left or Right rolls, `+` and `-` zoom, `0` or Home is Front and Fit.
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
| `tilt` | Degrees, held to plus or minus `tilt-max` (30): the top tips away as it gets larger (dragging up). Within that limit Auto-turn swings it back and forth. At 90 or more it rolls over, and `orientation` stays continuous. |
| `roll` | Degrees about the forward axis, held to plus or minus `roll-max` (180). |
| `orientation` | The pose as a quaternion `{ x, y, z, w }`. Draw this when a tumble rolls past a right angle, so the up axis does not flip. |
| `zoom` | 0.1 to 50 (`zoom-min`, `zoom-max`): 1 is Fit. The scene is drawn at `zoom * fitScale`. |
| `panX`, `panY` | CSS pixels the picture is moved from the middle of the view; 0 at 1x and below, unless `free-pan` is on. |
| `turning` | True while Auto-turn is running. |
| `final` | False for the steps of a drag, a pinch, a slider and the automatic turn; true when something settled. Do the costly drawing on `final`, the cheap transform on every event. |
| `reason` | What changed it: `init`, `auto`, `drag`, `pinch`, `wheel`, `key`, `slider`, `zoom`, `pan`, `front`, `fit`, `fit-scale`, `play`, `pause` or `set`. |

An `init` event is sent once, a moment after the element connects, with the starting view (from the attributes and the address). `element.state` is the current view at any time. The constants `TAG` and `EVENT` name the tag and the event.

## Attributes

| Attribute | What it does |
|---|---|
| `for` | The id of the view the hands bind to. Or set `element.view = someElement`. |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `yaw`, `tilt`, `roll` | The starting angle, tilt and roll. |
| `zoom` | The starting zoom: `fit` (the default) or a scale where 1 is the scene's natural size; it opens at that number divided by `fit-scale`. |
| `fit-scale` | The scale your page draws the scene at when it is at Fit (event `zoom` 1). 1 by default. Or call `element.setFitScale(n)` once the scene is measured. |
| `ignore` | A CSS selector for what inside the view a press leaves alone, so its click goes through: `button, a, input, select, textarea, label, [data-kazoku-ignore]` by default. |
| `anchor` | `x,y`: the point the + and - buttons, the 2x button and the keys zoom about, in CSS pixels from the middle of the view at Fit. |
| `key-tilt` | `drag` (the default: Arrow Up tips like a drag up) or `wheel` (the other way, as the wheel turned up tipped it before 0.13.0; the wheel moves now). |
| `stop-turn` | A press, the wheel or a key stops the automatic turn. Off by default; buttons and sliders never stop it. |
| `tilt-step` | Round the tilt of a drag to a multiple of this many degrees. 0 by default: not rounded. |
| `object-size` | `w,h`: the object's size at Fit in CSS pixels when it is smaller than the view; a pan then keeps at least a quarter of it in view. |
| `free-pan` | The view moves at any zoom, zoomed out too, by up to this share of its size either way (bare is 0.5: the middle may go to the edge). Values above 0 up to 4; bare or anything else is 0.5. For a 3D space whose zoom is far below 1, where the view would otherwise never move. The view then takes every touch: a middle-button drag, Ctrl or Command and a drag, Space and a drag, and the wheel then move it at every zoom, and the pan pad is shown. Or set `element.freePan` (the controller's `freePan`). |
| `grab-radius` | Exact grab for a globe or any turnable piece: its on-screen radius in CSS pixels at Fit, or `fit`. A drag then keeps the touched point under the pointer. |
| `autoplay` | Turn by itself from the start, unless the reader prefers reduced motion. |
| `autoplay-for` | Seconds of turning after which a turn stops by itself: the one `autoplay` starts, and one the Auto-turn button or `play()` starts. `play(seconds)` takes its own limit. |
| `speed` | Degrees a second at a pace of 1: 12, one turn in 30 seconds, when left out (it was 30 before 0.33). A negative number starts the turn to the left. |
| `direction` | Which way the angle's Auto-turn goes, `left` or `right`. The Left and Right buttons set the axis that is on (all three when All is on). Kept in the address as `direction`. The reader's choice, from the buttons or from the address the page opened with, is written here. Left out, the sign of `speed` decides. |
| `axis` | Which axis Auto-turn drives: `angle` (the default), `tilt`, `roll` or `all`. `all` is a tumble, three rates that drift so the motion does not repeat. The four buttons are always on the bar. Kept in the address as `axis` (`angle` leaves it off). The reader's choice, from the buttons or from the address the page opened with, is written here. |
| `tilt-direction`, `roll-direction` | Which way those axes turn, `left` or `right`. Kept as `tiltDirection` and `rollDirection` when they are not to the right. The reader's choice, from the buttons or from the address the page opened with, is written here. |
| `pace` | The Auto-turn speed as a multiple of `speed`: 1 by default, 0.125, 0.25 and 0.5 on the default buttons. The reader's choice, from the buttons or from the address the page opened with (`?pace=2`), is written here and kept in the address as `pace`, so a page that reads the attribute has the pace the reader sees. The page's own start is the value it last set itself. The buttons are the family's [speed buttons](speed-buttons.md). |
| `paces` | The speeds the buttons stand for: `0.125 0.25 0.5 1` by default; any numbers (`paces="1 4 8"`), each shown as its turn's time. |
| `controls` | `basic` (the default) or `advanced`. What the reader chose with More is remembered in `localStorage` and wins. |
| `layout` | `classic` (the default), `horizontal`, `vertical` or `compact`: see [Layouts and the zoom slider](layouts-and-zoom.md). |
| `storage` | The `localStorage` key the level is remembered under (`kazoku-view-controls`). |
| `flat` | The view cannot turn: no angle, tilt, Auto-turn or Front, and a drag moves it. |
| `tilt-max`, `roll-max`, `zoom-min`, `zoom-max` | The limits (30, 180, 0.1, 50). Tilt auto-turns as a pendulum under 90, and rolls over at 90 or more. |
| `address` | Keep the choices in the page's address (`?yaw=40&tilt=10&zoom=2&pace=0.5&direction=left`). |
| `address-keys` | Other keys: `yaw:a,zoom:z`. |
| `theme` | `light` or `dark`; otherwise the page's colour scheme. |
| `overlay` | Sit over the bottom of a positioned parent. |

Methods are `play()`, `pause()`, `front()`, `fit()`, `centre()`, `set({ yaw, tilt, zoom, panX, panY })`, `setFitScale(n)`, and `controller`, the [controller](view-controller.md) behind it. `element.words = { front: "Home" }` replaces labels. The colours are the custom properties `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line` and `--kazoku-accent`, and the parts are `bar`, `field`, `slider` and `button`.

## The address

Only what a reader chose is kept: angle, tilt, zoom, the auto-turn speed (`pace=0.5` or `pace=0.125`; the page's own start pace leaves the address: 1, unless the page's `pace` attribute starts elsewhere, and then a chosen 1 is kept as `pace=1`) and the way it turns (`direction=left` or `direction=right`; the page's own start leaves the address). A page's own `speed` parameter is never touched. The pan is in pixels of one screen and the turning is of a moment, so neither is. A value at its start leaves the address.

```js
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "@johnmorrisdotca/kazoku-ui/view-controls";

const choices = { yaw: 40, tilt: 10, zoom: 2 };
console.log(formatAddress("?x=1", choices));
console.log(JSON.stringify(parseAddress("?yaw=40&tilt=x&zoom=2")));
console.log(JSON.stringify(DEFAULT_KEYS));
console.log(JSON.stringify(parseKeys("yaw:a,zoom:z")));
// ?x=1&yaw=40&tilt=10&zoom=2
// {"yaw":40,"zoom":2}
// {"yaw":"yaw","tilt":"tilt","zoom":"zoom","speed":"pace","direction":"direction","roll":"roll","axis":"axis","tiltDirection":"tiltDirection","rollDirection":"rollDirection"}
// {"yaw":"a","tilt":"tilt","zoom":"z","speed":"pace","direction":"direction","roll":"roll","axis":"axis","tiltDirection":"tiltDirection","rollDirection":"rollDirection"}
```

## Opening at the scene's natural size

Zoom 1 is Fit, whatever size that is on the page. A page that draws its scene at `fitScale` (0.4 of natural size when it fits the view, say) and wants to open at natural size sets `zoom="1"` and tells the controls the scale:

```js no-run
const controls = document.querySelector("kazoku-view-controls");
controls.setAttribute("zoom", "1"); // natural size
controls.setFitScale(0.4); // the scale the scene is drawn at when it fits
// the event's zoom is now 2.5; draw at event.detail.zoom * controls.fitScale
```

## The pose maths

The element's turning is plain functions in `view-controls`, with no DOM, for a page or a test that needs the same numbers.

| Export | What it gives |
| --- | --- |
| `quatIdentity()` | The pose at rest, `{ x: 0, y: 0, z: 0, w: 1 }`. |
| `quatFromEuler(yaw, tilt, roll)` | A pose from degrees: yaw about Y, then tilt about X, then roll about Z. |
| `eulerFromQuat(q)` | The yaw, tilt and roll a pose shows on the sliders; the tilt stays within a right angle. |
| `spinLocal(q, yaw, tilt, roll)` | `q` turned by those degrees about its own axes; small steps pass through the poles without a jump. |
| `upVector(q)` | The view's up axis after `q`. |
| `pendulumTilt(phase, amplitude)` | The tilt of Auto-turn's swing inside `amplitude` degrees, so a limited tilt never rolls over. |
| `tumbleRates(seconds, speed, signs)` | Degrees a second on each axis for a tumble (`turn-axis="all"`), each on its own drifting wave so it does not repeat. |
| `rateSign(value)` | -1 or 1: which way a rate points (0 counts as 1). |
| `parseAxis(text)` | `angle`, `tilt`, `roll` or `all` from an attribute, else `undefined`. |

## Why the tag is only defined when it is free

`customElements.define` throws when a name is taken, and a page can meet that without any fault: two copies of this package, the script loaded twice, or a page that registered the tag to supply its own element. So `defineViewControls` (what the `define` import runs) calls `customElements.get` first, and the first one wins. The class, `ViewControlsElement`, is in `view-controls/element` if you want to register it yourself.

## Gestures, and the check every package runs

Every interactive view in the family answers the same gestures, so a reader never has to learn a page.

| Gesture | Action |
|---|---|
| Drag | Turn (yaw), and tilt for a mouse, at every zoom; a flat view (it cannot turn) moves instead |
| Shift and a drag, or a two-finger twist | Roll |
| Ctrl or Command and a left drag, Space and a drag, the middle or right button and a drag, two fingers dragging together | Move (pan) a zoomed view, or with `free-pan` a view at any zoom |
| The wheel, Shift and the wheel, a two-finger swipe | Move a zoomed view (at Fit the page scrolls) |
| Ctrl, Command or Alt with the wheel, a trackpad pinch, two fingers apart or together | Zoom about the pointer |
| Arrows, `+` and `-` | Turn and tip, zoom |
| A double-click on a zoomed view, Home or `0` | Fit (Home and `0` also go to the front) |

The controller does all of it, so a page that binds `<kazoku-view-controls>` (or calls `carryControls`) has every row and only has to draw `panX`, `panY`, `zoom`, `yaw`, `tilt` and `roll` from the change event. `panX` and `panY` are CSS pixels from the middle of the view: the picture must move by that many. On a Mac, Ctrl and a click opens the browser's context menu; the controller holds the menu back while a Ctrl or right-button drag is moving the view, and leaves it alone otherwise.

`checkGestures` in `@johnmorrisdotca/kazoku-ui/testing` proves a page does. It takes Playwright's `page` and the selector of the view the hands are bound to, does each gesture with a real mouse and keyboard (two fingers with pointer events), reads the view from the controls' own change events, and checks each gesture changed the view as the table says. For the moves it also photographs the view and checks the picture moved by as many pixels as the controls say, so a page that ignores the move fails. The view needs a `tabindex` for the key rows. Every failing gesture is named in one error.

A view that intentionally has no turn or roll, such as a flat map, says so, with the reason; nothing is skipped silently. `GESTURES` lists the names, `GESTURE_NAMES` their order, and `bestShift` is the picture check's search.

```js no-run
import { checkGestures } from "@johnmorrisdotca/kazoku-ui/testing";

await checkGestures(page, "#view");
await checkGestures(page, "#map", { lacks: { turn: "a flat map", roll: "a flat map", "key-turn": "a flat map" } });
```

## Related

Everything that moves a view without the element: [The view controller and its arithmetic](view-controller.md). The rule that the surface under the pointer follows the pointer is in the repository's [drag rule](../drag-rule.md).
