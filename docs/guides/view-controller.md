---
title: The view controller and its arithmetic
section: how-to
order: 4
description: Use the controller without the element for a page that draws its own buttons, keep buttons and links working inside the view, and call the camera arithmetic directly.
---

`createViewController` is the same hands and state as the element, with no markup of its own, for a page that draws its own buttons. It touches the DOM only in `bind`, so you can create it, drive it and test it without a page.

![The demo's bar: angle slider, Auto-turn, zoom, Fit and More](../images/hero-light.webp)

## Use it

```js
import { createViewController } from "@johnmorrisdotca/kazoku-ui/view-controls";

const seen = [];
const view = createViewController({
  speed: 30, // degrees a second for Auto-turn
  clock: { request: () => 0, cancel() {} }, // the one place time comes in: a test turns it by hand
  onChange(state, { final, reason }) {
    seen.push(`${reason}${final ? "!" : ""}`);
  },
});
view.set({ yaw: 40, tilt: 10 });
view.zoomBy(1.4);
console.log(view.state.yaw, view.state.tilt, view.state.zoom);
view.front();
console.log(view.state.yaw, view.state.tilt, view.state.turning);
console.log(seen.join(" "));
view.destroy();
// 40 10 1.4
// 0 0 false
// set! zoom! front!
```

In a page, `bind` gives the controller the pointer, pinch, wheel and key hands of an element and returns the function that unbinds them:

```js no-run
import { createViewController } from "@johnmorrisdotca/kazoku-ui/view-controls";

const view = createViewController({ onChange: (state) => draw(state) }); // { yaw, tilt, zoom, panX, panY, turning, drag }
const unbind = view.bind(document.getElementById("scene")); // pointer, pinch, wheel, keys
myPlayButton.onclick = () => view.toggle();
myZoomIn.onclick = () => view.zoomBy(1.4);
```

The automatic turn is idle whenever nothing can see the view: while the element is scrolled out of sight and while the tab is hidden. Its frame loop is stopped, so no animation frame is asked for; `state.turning` stays true, and the turn goes on from where it was when the view is back.

## Options and members

`createViewController` takes `initial`, `turnable`, `speed`, `limits`, `zoom` (`"fit"` or a number), `fitScale`, `ignore`, `anchor`, `keyTilt`, `stopTurn`, `tiltStep`, `grabRadius`, `objectSize`, `size`, `onChange` and `clock`. The `clock` is the one place time comes in: a test passes its own, so it turns the controller by hand.

| Member | |
|---|---|
| `state` | The current `{ yaw, tilt, zoom, panX, panY, turning, drag }`. |
| `set(next, final?, reason?)` | Change any of the state. |
| `play(seconds?)`, `pause()`, `toggle()` | Auto-turn, with an optional limit in seconds. |
| `front()`, `fit()`, `centre(animate?)` | The angle back to 0, zoom back to Fit, the object back to the middle. |
| `zoomAt(next, at?, final?)`, `zoomBy(factor, at?)` | Zoom about a point, the anchor or the view's middle. |
| `panBy(stepsX, stepsY)` | Move by whole fractions of the view's size. |
| `suspendTurn()`, `resumeTurn()`, `holdTurn()`, `releaseTurn()` | Pause the turn for a reason, counted, so they nest. |
| `bind(view)`, `destroy()` | Attach the hands; let everything go. |
| `anchor`, `ignore`, `keyTilt`, `stopTurn`, `tiltStep`, `grabRadius`, `objectSize` | Options you can also change at any time. |
| `fitScale`, `startZoom`, `setFitScale(n)`, `setStartZoom(zoom)` | What zoom 1 means, and where the view opens. |

## Buttons and links inside the view

The hands capture the pointer on the view, so a press on a button or link placed inside it would be taken for a drag and its click lost. A press on anything that matches `ignore` is left alone (no capture, no drag, no double-tap) and the click goes through. `DEFAULT_IGNORE` is the default selector, `button, a, input, select, textarea, label, [data-kazoku-ignore]`; mark any other child with `data-kazoku-ignore`.

`ignore` sees through shadow DOM: it tests every element on the event's path, so a button inside a component's open shadow root is left alone even though the event's target is the component. A closed shadow root hides its inside, so only the component itself can be matched: mark the host.

```js
import { DEFAULT_IGNORE, DEFAULT_KEYS, DEFAULT_LIMITS, EVENT, LEVEL_STORAGE_KEY, TAG } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(DEFAULT_IGNORE);
console.log(JSON.stringify(DEFAULT_LIMITS));
console.log(TAG, EVENT, LEVEL_STORAGE_KEY);
console.log(Object.keys(DEFAULT_KEYS).join(" "));
// button, a, input, select, textarea, label, [data-kazoku-ignore]
// {"tiltMax":30,"rollMax":180,"zoomMin":0.1,"zoomMax":50}
// kazoku-view-controls kazoku-viewchange kazoku-view-controls
// yaw tilt zoom speed direction roll axis tiltDirection rollDirection
```

## Zooming about a point of your own

The zoom buttons and keys have no pointer, so they zoom about the view's middle. If your scene's middle is not the view's, tell the controls where it is, in pixels from the view's middle when it is at Fit (`controls.anchor = { x: 60, y: -30 }`, or `anchor` on the controller). Zoom is about that point of the picture, so it stays put on screen however far in the reader is.

## The arithmetic

The camera is `{ yaw, tilt, zoom, panX, panY }` and every gesture is a pure function of it. They import on a server and are what the controller itself uses:

| Function or constant | What it does |
|---|---|
| `clamp(value, low, high)` | Hold a number between two. |
| `wrapYaw(angle)` | An angle brought into [-180, 180). |
| `between(from, to, fraction)` | The camera part of the way from one to another, eased out; the Centre move. |
| `zoomAbout(camera, next, at, limits?)` | Zoom to `next` keeping the point `at` where it is. |
| `clampPan(camera, size, object?)` | Hold the pan so the object cannot be lost. |
| `pinchTo(start, a, b, centre, limits?)` | The camera for two fingers now at `a` and `b`. |
| `dragTurn(start, dx, dy, size, tips, limits?, step?, grabRadius?)` | A one-pointer drag that turns. A finger does not tilt. |
| `dragRoll(start, dx, size, grabRadius?)` | A sideways drag that rolls. Positive `dx` is clockwise, and the degrees per pixel match a turn. |
| `degreesPerPixel(radius)` | Degrees of turn for one pixel of drag on a sphere of that on-screen radius. |
| `wheelMove(event, page?)` | What one wheel event asks: Ctrl, Command or Alt zoom; a plain wheel moves; Shift moves sideways. A positive delta moves the picture up or to the left. |
| `wheelPanPixels(delta, deltaMode, page?)` | Pixels one axis of a wheel moves. A line is 16 pixels and a page is `page` pixels. |
| `wheelZoomFactor(deltaY, deltaMode, kind)` | The factor a zooming wheel turns by: `kind` `"pinch"` (the default, Ctrl or Command and the wheel) or `"wheel"` (Alt and a mouse wheel, about 1.2 times a notch). |
| `WHEEL_GESTURE_MS` | Wheel steps closer together than this (300 ms) are one turn of the wheel or one swipe. |
| `TURN_ACROSS`, `TILT_ACROSS` | Degrees of turn across the view's width (180) and of tilt across its height (60). |
| `ZOOM_STEP`, `PAN_STEP`, `ZOOMED` | A zoom button's factor (1.4), the arrow pad's step (a quarter of the view) and the zoom at or below which the view counts as not zoomed. |
| `PACES`, `PACE_FACTOR`, `parsePace`, `parseLevel` | Auto-turn speeds (Slow, Medium, Fast) and the levels (`basic`, `advanced`), and how an attribute is read. |

```js
import { PACE_FACTOR, PACES, PAN_STEP, TILT_ACROSS, TURN_ACROSS, ZOOMED, ZOOM_STEP, between, clamp, clampPan, degreesPerPixel, dragTurn, parseLevel, parsePace, pinchTo, wheelZoomFactor, wrapYaw, zoomAbout } from "@johnmorrisdotca/kazoku-ui/view-controls";

const camera = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };
console.log(clamp(7, 0, 5), wrapYaw(190), wrapYaw(-190));
const zoomed = zoomAbout(camera, 2, { x: 50, y: 0 });
console.log(zoomed.zoom, zoomed.panX);
console.log(JSON.stringify(dragTurn(camera, 90, 0, { width: 360, height: 240 }, false)));
console.log(JSON.stringify(clampPan({ ...camera, zoom: 2, panX: 999 }, { width: 400, height: 300 })));
console.log(degreesPerPixel(100).toFixed(3), TURN_ACROSS, TILT_ACROSS, ZOOM_STEP, PAN_STEP, ZOOMED);
console.log(between(camera, { ...camera, yaw: 90 }, 1).yaw, typeof pinchTo, wheelZoomFactor(-100, 0) > 1);
console.log(PACES.join(" "), JSON.stringify(PACE_FACTOR), parsePace("fast"), parseLevel("advanced"), parseLevel("x"));
// 5 -170 170
// 2 -50
// {"yaw":45,"tilt":0}
// {"yaw":0,"tilt":0,"zoom":2,"panX":200,"panY":0}
// 0.573 180 60 1.4 0.25 1.05
// 90 function true
// slow medium fast {"slow":0.5,"medium":1,"fast":2} fast advanced undefined
```

The words the element uses are `WORDS` (English and Japanese) and `wordsFor(language, over?)` gives them with any of your own over them; `languageOf("ja-JP")` is `ja` and anything else is English. See [Accessibility and labels](accessibility-and-labels.md).
