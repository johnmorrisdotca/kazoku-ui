---
title: Upgrading
section: upgrading
order: 14
description: What each version from 0.7 to 0.13 asks of you, which defaults changed, what was removed, and what still works.
---

The package is in early development (0.x), so a minor version can add to the interface. This page lists what asks something of you, newest first. The complete, dated record is the [changelog](../../CHANGELOG.md).

## To 0.13

- **The wheel zooms.** The plain wheel over the view now zooms it about the pointer, as a map does, and no longer tips a focused view. Shift and the wheel, or a sideways swipe, turns it, as before. With the pointer elsewhere the wheel scrolls the page, and a wheel that starts while the zoom is at its end that way scrolls the page too. If your page tells readers to hold Ctrl to zoom, it can now say that the wheel zooms; Ctrl and the wheel still work.
- `wheelZoomFactor` takes a third argument, `"pinch"` (the default, as before) or `"wheel"`, and `WHEEL_GESTURE_MS` is new. `key-tilt="wheel"` still swaps the up and down keys.

## To 0.12

Nothing is asked of you. The new `layout` attribute (`horizontal`, `vertical`, `compact`) and the zoom slider are opt-in, and a page that names no layout looks exactly as before. The slider's arithmetic is exported (`zoomMarks`, `zoomPosition`, `zoomAtPosition`, `zoomStep`, `zoomToMark`, `zoomSnap`, `COMMON_ZOOMS`, `MARK_GAP`, `SLIDER_STEP`, `SNAP_PX`). See [Layouts and the zoom slider](layouts-and-zoom.md).

## To 0.11

- **A Centre button** appears once the view is zoomed or moved: `element.centre()` and `controller.centre(animate)`, and the `centre` word in both languages. If you replaced all labels with your own table, add it.
- **Exact grab** is opt-in: `grab-radius` and `grabRadius`. `degreesPerPixel` is new, and `dragTurn` takes a `grabRadius` argument.
- **The drag rule** is written down, with a shared browser check in `templates/e2e-ground.mjs`.

## To 0.10.1

- `onContext("restored")` is now called when the browser gives the WebGL context back, as the documentation always said. A page that only handled `"lost"` and `"unavailable"` is unaffected.
- The local ports moved to 8400 to 8499 (the demo on 8400, the tests on 8401, the picture script on 8402).
- `reusable-release.yml` has a `require-ci-workflow` input.

## To 0.10

- **The `2×` button is gone.** It was a preset that read like a readout. The readout between zoom out and zoom in is the one zoom number, always the true one, and a press on it goes back to Fit. A page that listened for the old button needs nothing.
- While the view turns, basic shows a small **speed** button beside Auto-turn.
- The readout follows a lowered `zoom-max` or raised `zoom-min`. A moved element no longer leaves a second loop running, and the automatic turn asks for no frame while nothing can see the view, in every way an element can be used.
- `templates/check-standard.mjs` is the must-have list as a check, copied unchanged into each package.

## To 0.9

- **The shared renderer** (`/renderer`) and the **freeze checks** (`/testing`) are new. three.js is an optional peer dependency and is never bundled.
- 0.9.1: no 3D release without a freeze test, and `SOFTWARE_GL_ARGS` for every package's Playwright config.

## To 0.8

- **The default bar is simpler.** Tilt, Front, the pan pad and Move or Turn are behind More. A page that wants them from the start sets `controls="advanced"`. The reader's choice is remembered in `localStorage`.
- A zoom readout and the auto-turn speed (Slow, Medium, Fast) are new. New pure exports: `parseLevel`, `parsePace`, `zoomText`, `PACES`, `PACE_FACTOR`, `LEVEL_STORAGE_KEY`.
- New labels `zoomLevel`, `zoomReset`, `more`, `speed`, `slow`, `medium` and `fast`. If you replaced all labels, add them.

## Checking an upgrade

```js
import { LAYOUTS, LEVEL_STORAGE_KEY, PACES, parseLayout, parseLevel } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(LAYOUTS.join(" "));
console.log(parseLayout(undefined), parseLevel("basic"), PACES.join(" "), LEVEL_STORAGE_KEY);
// classic horizontal vertical compact
// classic basic slow medium fast kazoku-view-controls
```

## Pinning

Pin the minor you test against (`~0.13.0`) until 1.0, and read this page and the changelog on each upgrade. Parts that arrive later (picture-tile pickers, Help, GitHub and npm pills, the family's backgrounds) are new subpaths and change nothing that exists.
