---
title: Upgrading
section: upgrading
order: 14
description: What each version from 0.7 to 0.14 asks of you, which defaults changed, what was removed, and what still works.
---

The package is in early development (0.x), so a minor version can add to the interface. This page lists what asks something of you, newest first. The complete, dated record is the [changelog](../../CHANGELOG.md).

## To 0.18

- **The wheel moves.** The plain wheel over the view moves it, and no longer zooms. Shift and the wheel moves sideways, and a two-finger swipe moves too. Ctrl, Command or Alt with the wheel, and a pinch, zoom about the pointer. Space and a drag, or the middle button, moves the view, and the pointer is a hand while Space is held. A plain left drag still turns. At Fit, with nothing to move to, the wheel scrolls the page. A page that tells readers the wheel zooms should now say the wheel moves, and that Ctrl, Command or Alt with the wheel zooms. `wheelMove` and `wheelPanPixels` are the new arithmetic. `key-tilt="wheel"` still swaps the up and down keys.

## To 0.16

Two things can change what a page does; neither asks for anything.

- **Auto-turn has a direction.** Under More, beside the speed buttons, Left and Right choose which way it goes, kept in the new `direction` attribute and in the address as `?direction=left`. A page that has its own Reverse button or its own `?dir=` can drop it. A negative `speed` still starts the turn to the left.
- **`autoplay-for` limits every turn, not only the one `autoplay` starts.** A turn the Auto-turn button or `play()` starts now stops after those seconds of turning too. A page that sets `autoplay-for` and wants its button unlimited should leave the attribute off and keep its own timer.

The family's `templates/docs-site.demo.mjs` is the documentation site's browser test, with the Tab test made to work on WebKit on a Mac; chikyu-earth and wakusei-planets take it, with its new hash, when they are next touched.

## To 0.15

Nothing is asked of you. A new part, `<kazoku-embed-panel>` from `@johnmorrisdotca/kazoku-ui/embed-panel/define`, is the family's one "Put it in your page" panel; see [The embed panel](embed-panel.md). The family's must-have list has a new item, `embed-panel`, in `templates/check-standard.mjs`: a package that copies the new check into its repository needs the panel in its demo (or a reason in `family.notApplicable`). The demo server, `scripts/dev.mjs`, no longer stops on a missing file.

## To 0.14

- **The Auto-turn speeds are numbers: 0.5×, 1×, 2×.** The buttons that said Slow, Medium and Fast are now the family's [speed buttons](speed-buttons.md), and say `0.5×`, `1×` and `2×`. The speed is the new `pace` attribute (a multiple of `speed`, 1 by default) and the address key is now `pace` (`?pace=2`), not `speed`: `speed` is a page's own parameter, such as a clock's, and the controls no longer read or write it. A link made with `?speed=fast` shows Medium; `?pace=fast` and `?pace=slow` still read as 2 and 0.5. `paces` (for example `paces="1 4 8"`) names other buttons.
- **A new part, `<kazoku-speed-buttons>`**, from `@johnmorrisdotca/kazoku-ui/speed-buttons/define`, for any speed: a solar system's days a second, a replay bar. The view controls use it; a page that styled the old buttons by their `data-b` names inside the view controls (`slow`, `medium`, `fast`) now styles `::part(button)` of `kazoku-speed-buttons` instead, or leaves them alone.
- The address default `DEFAULT_KEYS.speed` is `"pace"`, `AddressChoices.pace` is a number, and `parsePace`, `PACES` and `PACE_FACTOR` still exist for the three words.

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
