# Changelog

## [Unreleased]

## [0.18.0] - 2026-11-06

The wheel moves the view, as in Figma: Ctrl, Command or Alt with the wheel zooms.

- **The wheel moves** (KAZOKU-UI-58). The plain wheel over the view moves it, and Shift and the wheel moves it sideways. A two-finger swipe moves it too. Ctrl, Command or Alt with the wheel, and a pinch, zoom about the pointer. The middle button and a drag, or Space and a drag, moves it, and the pointer is a hand while Space is held. A plain left drag still turns. At Fit, with nothing to move to, the wheel scrolls the page; once zoomed in, the wheel moves the view, and a new turn that starts at the edge of that move scrolls the page again. A turn that reaches the edge part-way through stays with the view. `wheelMove` and `wheelPanPixels` are the arithmetic. The help line is the new `gestures` word, in both languages.
- **Roll follows the hand** (KAZOKU-UI-58). Shift and a left drag rolls about the view axis, clockwise when the drag goes right, so the surface above the middle moves with the pointer. A two-finger twist rolls the same way. Shift and Left or Right rolls by 15 degrees. The Roll slider shows it. A plain drag still turns and leaves roll alone. `dragRoll` is the arithmetic. Reduced motion is unchanged: these are hands, not the automatic turn.
- **The vertical demo sits beside the view.** The axis chips made that column tall enough that Centre's row scrolled the page and Auto-turn left the pointer. On a desk the column stands beside the scene, so Centre adds its row and Auto-turn stays where it was.

## [0.17.0] - 2026-11-05

The view turns on all three axes (KAZOKU-UI-55), and a shared replay bar (KAZOKU-UI-57).

- **Roll, beside Angle and Tilt.** One slider, and chips for Angle, Tilt, Roll and All. The slider sets the axis the chips name (All keeps the angle). `roll` and `roll-max` (180) sit next to `tilt` and `tilt-max`.
- **Auto-turn chooses an axis:** Angle, Tilt, Roll or All. All is a tumble: three rates that drift, so it does not repeat. Each axis has its own direction. Tilt swings inside `tilt-max` and, at 90 or more, rolls over on a quaternion (`orientation` on the event) so the up axis does not flip. Off under reduced motion, as before. The choice is the `axis` attribute and `?axis=all`.
- **`<kazoku-replay-bar>`** (KAZOKU-UI-57). Play, pause, back to the start and repeat, with the family's speed buttons on the same row. The bar reports the choice (`kazoku-replay` with `{ action, playing, repeat, reason }`) and the page moves the thing. `playing` and `repeat` are attributes; `address` keeps them (`play=on`, `repeat=on`), and `address-keys` can rename either. The speed buttons use `steps` and `speed`, and their own address key `replay-speed` (`speed-key` renames it), so they do not share a view's `pace`. Reduced motion leaves play off. New part: `@johnmorrisdotca/kazoku-ui/replay-bar`, `/element` and `/define`.

## [0.16.0] - 2026-11-04

Which way Auto-turn goes is the reader's to choose.

- **Left and Right buttons** (KAZOKU-UI-34 and KAZOKU-UI-22). Under More, beside the speed buttons, a pair of buttons chooses which way Auto-turn goes. The choice is kept in the new `direction` attribute (`left` or `right`) and in the address as `?direction=left`; the angle goes on from where it was, at the same speed. By the drag rule `yaw` goes up as the hand goes right, so right is the positive `speed`. With no `direction`, the sign of `speed` decides (a negative `speed` starts the turn to the left, as before), and the address keeps a way only when it is not the page's own start. `address-keys` can rename the key (`direction:dir`). New words in both languages: `direction` (Turn direction, 回る向き), `turnLeft` (Left, 左へ), `turnRight` (Right, 右へ). A package with its own Reverse button (senshu-jerseys, dougu-sports' old `?dir=cw`) can drop it for these.
- **`autoplay-for` limits every turn** (KAZOKU-UI-22). A turn the Auto-turn button or `element.play()` starts now stops after `autoplay-for` seconds of turning, as the one `autoplay` starts always did; `play(seconds)` takes a limit of its own. Without `autoplay-for` nothing changes. A page that sets `autoplay-for` and wants its Auto-turn button unlimited keeps its own timer instead.
- **Flaky tests fixed at the cause** (KAZOKU-UI-11, 31, 25, 36, 32; tests and a template only, no change to the package's code). `address-state` wrote the page's own choice a quarter of a second after the click and the theme and language at once, so the order of the parameters was the order of the writes, which a slow machine changes: the test compares the parts, not the order (13 of 160 runs failed before, 0 of 160 after). The renderer's "turning draws once a frame" counted the stills' draws as the turn's and a fixed 800 ms of a slow software frame as too few: it now waits for the stills to finish and for the turn to be drawing, and for the last frame after the pause. The autoplay tests' "it turns while the view is on screen" waited a fixed 700 ms: they wait for the changes to arrive. The docs site's Tab test (new family template `templates/docs-site.demo.mjs`, to replace the copy in chikyu-earth and wakusei-planets) presses Alt+Tab where WebKit on a Mac does not Tab to links.

## [0.15.2] - 2026-11-04

The embed panel no longer scrolls the page.

- The family `templates/AGENTS.md` has the rules that keep every `main` green (all of a release's checks before a push; a red main fixed or reverted within the hour; a flaky test ticketed and fixed; a shared file tried in every repo's CI first; machine1's daily check), from KAZOKU-UI-41. A repo takes them with the rest of the family part when it next replaces everything above the marker.
- **Fixed: every draw of the embed panel's picker scrolled the page to the panel.** The picker kept the pressed button in view with `scrollIntoView`, which scrolls the page too, so a page with the panel below the fold jumped to it on load and again each time the language changed. Only the picker's own list scrolls now. New test in `e2e/embed-panel.demo.mjs`.

## [0.15.1] - 2026-11-04

The embed panel asks for one frame at a time.

- **Fixed: the embed panel cancelled its fit frame and asked again**, so a page that counts animation frames (wakusei-planets' freeze test) saw several asked-for frames at once. The panel now asks for one frame and keeps it, reading the choices when it runs. New test in `e2e/embed-panel.demo.mjs`: no frame at rest, and never more than one pending, whatever is pressed.

## [0.15.0] - 2026-11-03

One "Put it in your page" panel for every package of the family.

- **`<kazoku-embed-panel>`** (KAZOKU-UI-40 and KAZOKU-UI-30; John, 2026-11-03: "does every package that has embedded have all these options?", "if we do it better elsewhere then we should also use that as a template"). A package fills it with its own choices and its own code; the panel is the same everywhere: a **compact picker** for the thing being embedded (chips by group, a search box from twelve things up, buttons that scroll in their own box; or the package's own in the `picker` slot), a **size** (160, 240, 320, 480 by default), **a tab for each way a page is made** (HTML, ES module, React, Vue, Angular, Svelte, iframe, and any a package adds, such as an image address), **the picture the code makes**, built from the same choices and scaled to fit its box at every size on every screen (wakusei-planets' Venus was cut off on the right), **Copy** with its name on it and a polite "Copied", **Open the embed page**, **Read the docs** and **the credit line**. Slots keep what a package had: `options` (its own choices, between the size and the tabs), `actions` (Save SVG, Download), `picker` and `lede`; `note` and `credits` are a text or a function of the choices. `address` keeps the tab and the size in the link (`?embed=react&size=240`). `lang` (English and Japanese), `theme`, light and dark, 48 px targets, arrow keys, Home and End on the tabs. A package that draws nothing says `no-preview no-size` and still has the tabs, Copy, the docs link and the credit. New part: `@johnmorrisdotca/kazoku-ui/embed-panel`, `/element` and `/define`; the event is `kazoku-embedchange` with `{ kind, size, value, code, reason }`, and `kazoku-embedcopy` follows Copy.
- **`embedSnippet(kind, spec)`** writes the seven ways from one description of the element (`SnippetSpec`: package, CDN address, tag, entry points, attributes, a name, the iframe), taken from wakusei-planets' generators, byte for byte; with `EMBED_KINDS`, `attrText`, `parseKinds`, `parseSizes`, `nearestSize`, `filterItems`, `groupsOf`, `kindLabel`, the labels in both languages and the defaults. The module imports on a server.
- **The must-have list has a new item, `embed-panel`**: the demo's "Put it in your page" is kazoku-ui's panel (`templates/check-standard.mjs`, `STANDARD_VERSION` 2026-11-03; `docs/package-standard.md`). A package that cannot say why in `family.notApplicable`. A repo takes the new check when it is next touched; its rollout is a ticket on the modules board.
- New demo pages `embed-panel.html` (a made-up badge with every part, then a package that draws nothing) and `embed.html` (the badge's embed page), `e2e/embed-panel.demo.mjs` (Chromium and WebKit, desk and phone, light and dark), `test/embed-panel.test.ts`.
- Fixed: the demo server (`scripts/dev.mjs`) crashed on a file that does not exist after answering 200; it reads first.

### Documentation

- A guide, `embed-panel.md`, with its Japanese page and a picture; [the survey](docs/embed-panel-survey.md) of every package's panel and which does each part best; the README, getting started, architecture, labels and upgrading pages; the API reference lists the new part.

## [0.14.0] - 2026-11-03

One speed control for the whole family: the Auto-turn speeds are 0.5×, 1× and 2×, and the same buttons serve a solar system's days a second and a replay bar.

- **`<kazoku-speed-buttons>`** (KAZOKU-UI-46, John 2026-11-03: "the same controls throughout all apps"). One button for each speed, no menu: `steps="0.5 1 2"` by default, any numbers (`1 10 100` for days a second, `0.25 0.5 1 2 4` for a replay, `0 1 3600 86400 -3600` for a clock that can stop and run back), `unit` (`×`, or none), `label` (the group's name, shown and read), `no-label`, `address` and `address-key` (the choice kept in the address, the start left off), `lang` and `theme`. The chosen speed is the `value`, an attribute that follows the reader's choice, and the property; `steps` and `step(1)` (the next speed, round at the ends) are properties too; the page hears `kazoku-speedchange` with `{ value, steps, reason }`. It is the Auto-turn control in the view controls and a part of its own: `@johnmorrisdotca/kazoku-ui/speed-buttons`, `/element` and `/define`, with the pure `parseSteps`, `speedText`, `nearestStep`, `startStep`, `stepFrom`, `parseSpeed` and `SPEED_ADDRESS_KEY`. Reduced motion changes nothing in it. New demo page `speed.html`, a guide in English and Japanese, `e2e/speed-buttons.demo.mjs`, `test/speed-buttons.test.ts`.
- **The view controls' speeds are 0.5×, 1× and 2×**, not Slow, Medium and Fast. The new `pace` attribute is the speed as a multiple of `speed` (1 by default) and follows the buttons; `paces` names other buttons (`paces="1 4 8"`). The address key is now `pace` (`?pace=2`), no longer `speed`, which is a page's own (a clock's, a replay's) and is never read or written by the controls; `?pace=slow` and `?pace=fast` of 0.12 and 0.13 still read as 0.5 and 2. `DEFAULT_KEYS.speed` is `"pace"`, `AddressChoices.pace` a number. `PACES`, `PACE_FACTOR`, `parsePace` and the type `Pace` remain, for the three words. The small speed button of the basic level while the view turns shows `1×` and steps through the speeds.

### Documentation

- A guide, `speed-buttons.md`, with its Japanese page; the view controls guide, README, getting started, architecture, labels and upgrading pages say `pace`, `paces` and the numbers; the API reference lists the new part; a picture of the buttons three ways (`docs/images/speed-buttons-*.webp`).

## [0.13.1] - 2026-11-03

The layouts hold at a phone's width and in any narrow panel.

- **Every layout works at a phone's width and at a desk's** (KAZOKU-UI-42, from the senshu-jerseys 0.36.0 rollout). `horizontal` in a panel as narrow as a phone's (336 px at a 390 px screen, with the page's margins) put the zoom slider's marks over each other and over the minus button, and squashed the bar; now, under 440 px (a phone, or a face wider than the system's), the slider has a row of its own and the buttons sit under it (Centre beside them). `compact` with More open at 300 px let the speeds and Fit reach past the bar on a wide face; the speeds wrap there now. The one-row form of the horizontal bar began at 900 px, where the angle slider was squeezed to 60 px and met Auto-turn and the speed button; it now begins at 1040 px, and the two rows hold between. `classic` on a phone in a panel under 330 px put the speed button over the minus button; it takes the row under them there.
- `e2e/phone-layouts.demo.mjs`: each layout at both levels (`controls`), still, turning, zoomed and with More pressed, at the phone's width and at forced panel widths from 280 px to 1100 px: no two controls overlap, none is outside the controls, a button is at least 47.5 px tall, a slider at least 60 px wide, and the page never scrolls sideways. `advanced` with `compact` holds in all of them; the two senshu tests that broke on it could not be reproduced here, so if one comes back, send its page and width.

## [0.13.0] - 2026-11-03

The wheel over the view zooms it, in every family package that uses the view controls.

- **The wheel zooms** (KAZOKU-UI-45). The wheel over the view now zooms it about the pointer, like a map, about 1.2 times a notch; before, the plain wheel tipped a focused view and only Ctrl or Command with the wheel zoomed. A trackpad's pinch (Ctrl and the wheel) still zooms. Shift and the wheel, or a sideways swipe, turns the view. Tipping is a drag, the arrow keys or the tilt slider. With the pointer anywhere else the wheel scrolls the page; a wheel that starts while the zoom is already at its end that way (turned down at Fit, or up at the most) scrolls the page as well, so it is never trapped, while the steps of a turn that reaches the end part-way through stay with the view, so the page does not jump. A flat view leaves Shift and the wheel and a sideways swipe to the page. `wheelZoomFactor` takes a third argument, `"pinch"` (the default, as before) or `"wheel"`, and `WHEEL_GESTURE_MS` (300) is exported. `key-tilt="wheel"` still swaps the up and down keys.
- The README opens with the package's thumbnail, and the demo carries it as its link preview (og:image) and publishes the card, a dark card and an icon on Pages at `thumbnail.png`, `thumbnail-dark.png` and `icon.png`.

### Documentation

- **Fourteen guides, each with a Japanese page, and a generated API reference.** `docs/guides/` has getting started, view controls, layouts and the zoom slider, the view controller and its arithmetic, the theme switch, the language picker, address state, save image, the shared renderer, frameworks and CSP, accessibility and labels, architecture, troubleshooting and upgrading; each has its Japanese page of the same name in `docs/guides/ja/`. `docs/API.md` is written from the built declarations (`pnpm docs:api`). The README is rewritten into sections around the same material, and no longer says the package is unpublished.
- **Every example runs, and the documentation is checked.** `pnpm test:readme` runs each `ts`, `js` and `html` block of the README and the guides (Node for the scripts, headless Chromium in software for the HTML); `pnpm docs:check` fails when `docs/API.md` is out of date, a guide has no Japanese page or a different set of code blocks, a link or picture is missing, or an export is named nowhere. Both run in `.github/workflows/docs.yml`.
- **Twelve more pictures** in `docs/images/` (the layouts on a phone, the header's switches, address state, save image, the shared renderer and the builder, light and dark), made by `pnpm screenshots`. The hero and the layouts pictures were taken again, because the demo's links now include the builder.
- New demo page: `demo/builder.html`, to choose a part, set its options, see it live and copy the code, in English and in Japanese, with `e2e/builder.demo.mjs`.

## [0.12.0] - 2026-11-03

The view controls in four layouts, chosen by one attribute, and the zoom as a slider with marks. A page that names no layout looks exactly as before.

- **`layout="horizontal|vertical|compact"`** on `<kazoku-view-controls>` (KAZOKU-UI-29). `horizontal` is a tidy bar under the view: the turn on one row, the zoom slider on the next, one row when the bar is 900 px or wider. `vertical` is a column beside the view (`--kazoku-column-width`, 16rem), Auto-turn and More at the top so More stays put. `compact` is one short row (Auto-turn, −, the readout, +, More) that never takes a second row until More is pressed, and then shows everything else under it. `classic` is the default and the bar of 0.10, unchanged. The level (`controls`, More) still says what is shown, the same way in every layout. The host carries `data-layout`, and `data-flat` on a flat view.
- **The zoom slider** in the horizontal, vertical and compact layouts: `zoom-min` to `zoom-max` on a logarithmic scale, marked and labelled at the ends and at the common zooms between them that have room (1×, 2×, 3×, 5× for the default range). The readout stays beside it and both always show the true zoom. − and + still step. A drag or press within 8 px of a mark goes to it, never further. Keys: arrows step by 1.1× and stop on a mark they would pass, Page Up and Down go from mark to mark, Home and End to the ends. A screen reader hears the value as the readout says it. Part names `zoom-slider`.
- **The scale without the element**: `zoomMarks`, `zoomPosition`, `zoomAtPosition`, `zoomStep`, `zoomToMark`, `zoomSnap`, `COMMON_ZOOMS`, `MARK_GAP`, `SLIDER_STEP`, `SNAP_PX`, and `parseLayout`, `LAYOUTS` and the type `Layout`, from `@johnmorrisdotca/kazoku-ui/view-controls`.
- **The layouts demo** (`demo/layouts.html`, on GitHub Pages as `layouts.html`): every layout live, side by side, each with its code and a Copy button, and a row of zoom ranges that changes every slider's marks and the code; one layout at a time, picked from a row, below 1100 px. The main demo takes `?layout=`, `?zoom-min=` and `?zoom-max=`. The README shows the layouts in a picture (`docs/images/layouts-*.webp`, made by `pnpm screenshots`) and a table of what each shows.
- Tests: `test/zoom-scale.test.ts` (the scale, the marks for eight ranges, the keys' steps, the snap, the layout words) and `e2e/layouts.demo.mjs` (each layout's controls, rows and sizes at a phone's width and a desk's, no row added by turning, compact one row on a phone, More staying put in the vertical column, the marks against the limits and the track, the slider by keys, mouse and touch, the slider and readout true after every way of zooming, the slider's name in both languages, and the layouts page).
- **Centre in every layout**: the Centre button of 0.11.0 sits beside the zoom: in the two-row horizontal bar an icon in More's column, so Auto-turn and More never move; its own column on the one-row bar; its own row in the vertical column; with Fit behind More in compact, which stays one row. `e2e/layouts.demo.mjs` checks each.

## [0.11.0] - 2026-11-03

- **Exact grab** (KAZOKU-UI-28, from chikyu-earth's MODULES-200). `grab-radius` on `<kazoku-view-controls>` (and `grabRadius` on `createViewController`, `degreesPerPixel` and a `grabRadius` argument to `dragTurn`): the on-screen radius of a globe or turnable piece in CSS pixels at Fit, or `fit` for half the smaller side of the view. A drag then turns the view by the angle that keeps the touched point under the pointer, on both axes, and the radius grows with the zoom. Left out, nothing changes: the fixed angle across the view (180 degrees across the width, 60 down the height) that moved a globe's ground about 1.5 pixels for each pixel of drag sideways and half a pixel up and down.
- **A Centre button** (KAZOKU-UI-33). Once the view is zoomed or moved, a Centre button (中央) puts the object back in the middle at Fit and the default angle, with a quarter of a second's move (at once under reduced motion; a hand on the view stops it): `element.centre()`, `controller.centre(animate)`, the `centre` word in both languages, `between()` in the maths. The keys Home and 0 do the same without the move. `object-size` (`objectSize`) holds a pan so that at least a quarter of an object smaller than the view stays in view.
- **The drag rule**, written down in `docs/drag-rule.md`: the surface under the pointer follows the pointer, the arrow keys agree, Auto-turn goes the object's real way.
- **`templates/e2e-ground.mjs`**, the shared browser check of the rule (`checkFollowsTheHand`, `checkExactGrab`, and the parts; `picture` names what is photographed and `window` the part of it that is followed, for a thin object such as a rocket), copied unchanged into a package's `e2e/`; a unit test holds its finder. The demo's `grab.html` draws a globe turned with exact grab and is tested with the helper.

## [0.10.1] - 2026-11-02

- **`onContext("restored")`** (KAZOKU-UI-15, found by chikyu-earth). The shared renderer's `onContext` was told `"lost"` and `"unavailable"` but never `"restored"`, although `docs/renderer.md` and the `SharedRendererOptions` type said it was. It is now called when the browser gives the context back, after the focused view draws again. `e2e/renderer.demo.mjs`'s lost-and-restored check reads the events the demo records (`["lost"]`, then `["lost", "restored"]`); it fails on 0.10.0, where the second list is `["lost"]`.
- **`require-ci-workflow` input of `reusable-release.yml`** (KAZOKU-UI-16, from chizu). A package sets `require-ci-workflow: ci.yml` and its release refuses unless that workflow has succeeded on the exact commit being released, so no package publishes a red commit; chizu can drop its own `ci-green` job. Empty by default, so no existing caller changes. A public repository needs no extra permission (a refused token is retried without it); a private one grants `actions: read`. kazoku-ui's own `release.yml` sets it. `test/reusable-release.test.ts` runs the step's shell against a stand-in `curl`: green, a green rerun after a red run, red, still running, never run, a refused token, and an unreadable answer.
- **Local ports moved to 8400-8499** (KAZOKU-UI-24). The demo server (8400), the tests (8401) and the picture script (8402) used 8100-8102, which are fuda-cards' block in John's port table, so a test run here could land on a fuda-cards session's server. `playwright.config.mjs`, `scripts/dev.mjs`, `scripts/screenshots.mjs`, `CONTRIBUTING.md` and `AGENTS.md` name the new block.

## [0.10.0] - 2026-11-02

The bar has one zoom number, and it is always the true one; the auto-turn speed is in sight whenever the view turns; and the automatic turn asks for a frame only while someone can see the view, in every way an element can be used.

- **The `2×` button is gone.** It was never a readout: it was a preset, "Zoom to 2 times" (`data-b="two"`), and in 0.7 and before it sat between zoom out and zoom in, where it read like one: at the least zoom, with zoom out greyed, the bar said `2×`. Since 0.8 the readout had taken that place, but the preset stayed in advanced, so a bar could show `1×` and `2×` together. A double press on the view still goes to 2 times. The label `zoomTwo` stays for a page's own `words`; a test that presses `[data-b="two"]` has to change.
- **The readout cannot go stale.** It now follows a lowered `zoom-max` or raised `zoom-min` (the view moves inside the new limit and the buttons grey to match; before, the view stayed outside the limit). After an element was moved, the zoom buttons drove the old controller, so the page drew one zoom and the readout said another; that is the move fixed below. Below 1 it keeps two figures, so a small zoom never reads `0×`. A test goes through the buttons, the wheel, a pinch, a double press, Fit, the keys, the address, `set`, the limits, the `zoom` attribute and the fit scale.
- **The speed in basic.** While the view turns, basic shows one small button beside Auto-turn: the word Speed over Slow, Medium or Fast, and a press steps to the next (kept in the address as before). It comes in on Auto-turn's left, so Auto-turn does not move out from under the pointer that pressed it. It adds no row: on a phone it sits in the free room left of the zoom buttons, and on a wider bar the angle's running number makes the room while the view turns (a screen reader still has it). A page with `autoplay` shows it from the start. Advanced keeps the three buttons.
- **A moved element no longer leaves a second loop running.** An element taken off the page and put back (a framework reordering its children, `append` to another parent) got a new controller while its buttons kept driving the old one: Auto-turn then ran a loop nothing suspended, on and off screen, and with `autoplay` a move in the same task started two. The controls now drive the controller in use, a destroyed controller never turns again, and only the controller in use speaks for the element.
- **`element.play()` on an element that is on no page** (never added, or taken off) asks for no frame until it is put on one. It used to run for ever.
- **A plain controller** stops too: `view.bind(element)` holds the turn while that element is off screen or the tab is hidden. It used to take the page's own `suspendTurn()`.
- **A view that opens off screen** asks for no frame until the observer has said it is seen; before, the first frame could be asked for ahead of that answer.
- `e2e/autoplay-loop.demo.mjs` counts at `requestAnimationFrame` itself: 0 callbacks, 0 changes and 0 waiting while out of sight or hidden, at most one callback, one change and one waiting request a page frame otherwise.
- The tests' Chromium runs headless and draws in software (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, in `playwright.config.mjs` and the picture script).
- **The must-have list as a check**: `templates/check-standard.mjs` (copied unchanged into each package as `scripts/check-standard.mjs`) fails when a package lacks its demo on Pages, an embed page, a documentation site with Japanese twins, the family files or tested usage examples (script tag, ES module, bundlers, React, Vue, Svelte, Angular, iframe, TypeScript). An item that cannot apply is named in `package.json` with a reason. [docs/package-standard.md](docs/package-standard.md); the rule is in spx-stats `docs/package-work.md`.

## [0.9.1] - 2026-11-02

No 3D release without a freeze test (John, 2026-11-02, after a graphics-driver kernel panic during a test run). Test kit and release workflow; the parts themselves are unchanged.

- **`SOFTWARE_GL_ARGS`** in `@johnmorrisdotca/kazoku-ui/testing`: the Chromium launch arguments that draw WebGL in software (ANGLE on SwiftShader), for every package's Playwright config. This repository's own config uses them for both Chromium projects, and its WebKit projects skip `renderer.demo.mjs` off CI (WebKit has no software switch).
- **`freeze-command`** input of `reusable-release.yml`: a package with live 3D passes its freeze test (`pnpm test:freeze`), which runs in headless Chromium before anything is published.
- The rule is written in `docs/renderer.md` ("The rule: no 3D release without a freeze test") and in `docs/release-workflow.md`.

## [0.9.0] - 2026-11-02

The sixth and seventh parts: the shared 3D renderer, at `@johnmorrisdotca/kazoku-ui/renderer`, and the freeze checks for a 3D package's e2e, at `@johnmorrisdotca/kazoku-ui/testing`.

- **One WebGL context per page.** `createSharedRenderer({ load: () => import("three") })` makes one renderer and moves its canvas to the focused view's host (`view.focus()`); every other view shows a still. Thirty views and fifty changes of focus make one context and one canvas. three.js is an optional peer (`peerDependencies`, `peerDependenciesMeta`) and is never imported or bundled by this package: the page passes the dynamic import, so three loads only when the first view goes live (a demo page checks it).
- **Shared assets with reference counts** (`createAssetCache`, and `assets.acquire(key, make, dispose)` inside an item's `build`): made once per key, freed after a short linger when the last view lets go; `disposeDeep` frees a loaded model.
- **Stills** (`view.showStill()`): rendered once from the same renderer, one at a time, into a PNG blob in an `<img>`; items with the same key share one; a least-recently-used list with a byte budget (32 MB decoded) frees the rest, and an evicted still is made again when needed.
- **Drawing on demand** (`createScheduler`): one frame loop for every view, nothing drawn or requested at rest, exactly one frame requested at a time (a change event inside a draw adds none), a per-frame budget (2 draws, 10 ms) with the focused view first, and no frames while the view is out of sight or the tab hidden. After `releaseMs` (30 s) out of sight the context is let go and made again when the view is seen.
- **Pixel budget in one place** (`pixelRatioFor`): 6 million pixels, 4096 a side, ratio 2; a 5K screen at ratio 2 is drawn inside it, not at 24 MP.
- **Context loss** (`webglcontextlost` and `webglcontextrestored`) is handled in one place: drawing stops and the still shows, then the view draws again; `onContext` is told.
- **`/testing`**: `COUNT_SCRIPT` (an init script that counts WebGL contexts, GPU objects made and deleted, draws and animation frames), `readCounts`, `gpuObjects`, `canvasSize`, `withinPixelBudget`. It names no test framework.
- Demo `renderer.html` (thirty views on one renderer, Fill the window) and `renderer-lazy.html`; `e2e/renderer.demo.mjs` asserts contexts = 1 over fifty focus changes, 0 draws and 0 frame requests at rest, flat GPU objects, cache and heap over fifty more, the canvas within budget on a 5120x2880 screen at ratio 2, a lost and restored context, out of sight, the stills' byte budget, and three.js fetched only on demand. Docs: `docs/renderer.md`. Size: 8.9 KB gzipped for the renderer and 1.6 KB for the kit.

## [0.8.0] - 2026-11-02

The view controls show the zoom, control the auto-turn speed, and come in two levels so the bar stays simple.

- **Zoom readout.** A button between zoom out and zoom in shows the zoom (`1×`, `2.4×`); tapping it goes back to Fit. A screen reader is told "Zoom level 2.4×" once the zoom has settled (a polite status, not on load, not for every step of a pinch).
- **Auto-turn speed.** Slow, Medium and Fast: half, once and twice the `speed` attribute (30 degrees a second). It never stops or restarts the turn. Kept in the address as `?speed=slow` or `?speed=fast` (key renameable with `address-keys="speed:pace"`); Medium leaves the address, and a page's own `speed` value is left alone. `parseAddress` and `formatAddress` take and give an optional `pace`.
- **`controls="basic|advanced"`.** Basic is the default and shows the angle slider, Auto-turn, zoom out and in with the readout, Fit and a small More button. Advanced (More, or the attribute) adds tilt, speed, Front, 2 times, the pan pad and Move or Turn. The reader's choice is remembered in `localStorage` (`kazoku-view-controls`, or the key `storage` names) and beats the attribute written in the markup; the host carries `data-level`.
- **Changed default.** The default bar is simpler than 0.7: tilt, Front, 2 times, the pan pad and Move or Turn are behind More. A page that wants them from the start sets `controls="advanced"`.
- New pure exports from `view-controls`: `parseLevel`, `parsePace`, `zoomText`, `PACES`, `PACE_FACTOR`, `LEVEL_STORAGE_KEY`. New labels `zoomLevel`, `zoomReset`, `more`, `speed`, `slow`, `medium`, `fast` in English and Japanese (the Japanese is to be read by a native speaker).

## [0.7.3] - 2026-11-02

One agent-instruction template for the family's package repos. Tooling and docs only; the package is unchanged.

- `templates/AGENTS.md`: the family rules above a marker (read spx-stats `docs/package-work.md` first, the board and ticket prefix with `--area`, ports, commits, checks, the release path, hand-off project, reporting) and a Facts table plus a "This repo" section below it for what is true only in one repo. Public: no private host, path or key.
- `docs/agents-template.md`: how to adopt it, and which repos would. `test/template.test.ts` holds the marker, the table and the privacy rule.

## [0.7.2] - 2026-11-02

One release workflow for all the family's packages.

- `.github/workflows/reusable-release.yml` (`workflow_call`): from main, the tag equals `package.json`'s version, the repo's check script runs, a version already on npm is skipped, the `v<version>` tag is made if missing, then `npm publish --provenance` by trusted publishing. Inputs: `node-version`, `install-command`, `check-command`, `github-release`.
- This repo's `release.yml` now only calls it (same file name, so its npmjs.com trusted-publisher entry is unchanged) and still makes the GitHub release with the tarball.
- `docs/release-workflow.md`: npm trusted publishing accepts a called workflow; the publisher entry names the calling file; how to move another repo over.

## [0.7.1] - 2026-11-02

The automatic turn no longer runs when nothing can see the view.

- While the `for` element (else the controls) is scrolled out of sight, or the tab is hidden, the frame loop stops: no animation frame is requested and no `kazoku-viewchange` with reason `auto` is sent. `turning` stays true and the turn resumes where it was. It uses `IntersectionObserver` and `visibilitychange`; without `IntersectionObserver` the view counts as on screen.
- New attribute `autoplay-for` (seconds): the `autoplay` turn stops by itself after that long, counting only time spent turning. Left out, nothing changes.
- The controller gains `suspendTurn()`, `resumeTurn()` (nesting) and `play(seconds)`. A bare `play()` and the Auto-turn button are unchanged.

## [0.7.0] - 2026-11-02

The fifth part: save as an image, at `@johnmorrisdotca/kazoku-ui/save-image` (and `/save-image/element`, `/save-image/define`).

- `<kazoku-save-image for="id">`: Save PNG and Save SVG buttons (48 px, light and dark, English and Japanese) for a canvas, an SVG or any element. A canvas is saved as a PNG at its own pixel size. An SVG is saved as a stand-alone SVG (namespaces, size, `viewBox` and the styles it is drawn in written into it) or as a PNG; any other element as a PNG drawn through a `foreignObject` with its computed styles, a canvas inside it drawn in as a picture.
- Attributes `formats`, `name`, `scale` (2 by default, held to 8192 pixels a side and 36 million in all), `background` (the colour behind a PNG), `manual` (make the picture and the event, download nothing), `no-inline-styles`, `lang`, `theme`. `element.save(format)` and `element.target`.
- Events `kazoku-save` (`{ blob, format, width, height, filename, reason }`) and `kazoku-saveerror` (`{ format, error, reason }`), and a status line for a screen reader.
- The element-free functions (`renderImage`, `saveImage`, `downloadBlob`, `serializeSvg`, `serializeElement`, `svgToPng`, `filenameFor`, `parseFormats`, `pixelSize`) import on a server. Docs: `docs/save-image.md`, with what a picture of an element cannot carry (web fonts, `::before`, cross-origin images).
- Under a strict policy it needs `img-src data:` for an SVG or element PNG (a canvas needs nothing); `demo/csp.html` now has `img-src data:` and a save button.
- The demo has `save-image.html`: a canvas, an SVG and a piece of the page, each saved and shown back. Existing elements are unchanged.

## [0.6.0] - 2026-11-02

The fourth part: choices kept in the address, at `@johnmorrisdotca/kazoku-ui/address-state`. No element.

- `createAddressState({ defaults, delay, host })`: `get`, `has`, `all`, `set`, `setMany`, `remove`, `subscribe(listener, keys?)`, `flush`, `destroy`. It writes with `replaceState` (no history entry; the path, hash and other parameters kept; a value equal to its default leaves the address), as one write for the changes inside `delay` (250 ms by default; 0 writes at once). A subscriber hears each change made through any state on the page, with `{ key, value, previous, source }`, and the reader going back or forward (`source: "navigation"`). A page that cannot change its address still works.
- The smaller pieces: `readParams`, `readParam`, `applyParams(search, changes, defaults?)` and `createAddressWriter({ delay, host })` (`write(compute)`, `flush()`, `cancel()`). All of it imports on a server.
- The view controls now write their address through `createAddressWriter`, the theme switch and the language picker through `createAddressState`: the same addresses, the same quarter-second write for the view controls, nothing changes for a page.
- Docs: `docs/address-state.md`. The demo's `address.html` keeps a name, a size and dots in the address beside the theme switch and the language picker.

## [0.5.0] - 2026-11-02

The third part: the language picker, at `@johnmorrisdotca/kazoku-ui/language-picker` (and `/language-picker/element`, `/language-picker/define`).

- `<kazoku-language-picker languages="en ja">`: a button for each language the page lists, each in its own name (English, 日本語, Français; any other code is named by `Intl.DisplayNames` in its own language). It writes the choice as `lang` on a `target` (the page's `<html>` by default) and sends `kazoku-languagechange` with `{ lang, previous, reason, target }` (reasons `init`, `user`, `set`, `external`). Each button carries its own `lang`.
- It starts in the language of the address (`address`, `?lang=`, `address-key`), else the store (`storage`, in a try/catch), else `value`, else the reader's browser languages (`ja-JP` is `ja`), else what the target's `lang` says, else the first code. Another writer of the target's `lang` moves it with it.
- The pure entry (`parseLanguages`, `matchLanguage`, `languageName`, `startingLanguage`, `applyLanguage`, the words) imports on a server. Docs: `docs/language-picker.md`.
- Under a strict `style-src`, like the others. The demo's English and 日本語 buttons are now a picker, and the view controls and theme switch answer to it.
- The theme switch and the view controls are unchanged (the theme switch shares its target and store code with the picker; same behaviour).

## [0.4.0] - 2026-11-01

The second part: the theme switch, at `@johnmorrisdotca/kazoku-ui/theme-switch` (and `/theme-switch/element`, `/theme-switch/define`).

- `<kazoku-theme-switch>`: Light, Dark and Auto as 48 px buttons. It writes the choice as `data-theme` on a `target` (the page's `<html>` by default; Auto removes the attribute so the device decides), and sends `kazoku-themechange` with `{ choice, scheme, reason, target }` (reasons `init`, `user`, `set`, `system`, `external`).
- It remembers the choice in the address (`address`, `address-key`) and in `localStorage` (`storage`, in a try/catch: a browser that keeps nothing still switches). Read in the order address, store, `value`, the target's own `data-theme`.
- Another writer of the target's `data-theme` moves the switch with it, and a change of the device's colours is an event while on Auto. `modes="light dark"` leaves Auto out. `target` is found in the switch's own tree first, so it works inside a shadow root.
- The element is light or dark with the page's `data-theme`, not only the device's, so it is dark in a page forced dark on a light device. Labels in English and Japanese. Under a strict `style-src`, like the view controls.
- The pure entry (`readTheme`, `applyTheme`, `resolveTheme`, `themeOf`, `parseModes`, `parseTheme`, the words) imports on a server. Docs: `docs/theme-switch.md`. The demo has a switch in its header and tells the view controls.
- The view controls are unchanged.

## [0.3.1] - 2026-11-01

- The styles now pass a strict Content-Security-Policy. `<kazoku-view-controls>` adopts its styles as a constructable stylesheet (`adoptedStyleSheets`), which `style-src 'self'` allows with no `'unsafe-inline'` and no hash; before, it wrote a `<style>` into its shadow root and a strict `style-src` blocked it. Elements with the same styles share one sheet.
- A browser without constructable stylesheets gets the `<style>` as before, now carrying the element's `nonce` (`<kazoku-view-controls nonce="...">` or `element.nonce`), so a page with `style-src 'nonce-...'` allows it.
- What a page needs is in `docs/csp.md`. The demo has `csp.html` (`style-src 'self'`) and `csp-nonce.html`, both with `?fallback` to force the `<style>` route, and `e2e/csp.demo.mjs` plays them in Chromium and WebKit.
- Defaults and the look are unchanged.

## [0.3.0] - 2026-11-01

- Zoom about a point of your own: the `anchor` attribute (`x,y`), the `element.anchor` setter and the controller's `anchor` member and option take a point in CSS pixels from the view's middle at Fit. The + and - buttons, the 2x button and the + and - keys zoom about it, and it stays fixed on screen within a pixel; wheel, pinch and double tap still zoom about the pointer. With no anchor they zoom about the middle, as before. `zoomAt` and `zoomBy` with no point use it.
- Arrow Up the way a wheel goes: `key-tilt="wheel"` (option `keyTilt: "wheel"`) makes Arrow Up tip the way a wheel turned up does. The default, `drag`, still tips like a drag up.
- `stop-turn` (option `stopTurn`) stops the automatic turn on a press, the wheel or a key on the view, with a `pause` event. Off by default; buttons and sliders never stop it.
- `tilt-step` (option `tiltStep`) rounds the tilt of a drag to a multiple of this many degrees; `1` gives whole degrees. `dragTurn` takes it as a seventh argument. 0 by default.
- The demo switches them on in its address: `?anchor=pin`, `?key-tilt=wheel`, `?stop-turn`, `?tilt-step=1`.

## [0.2.1] - 2026-11-01

- `ignore` now sees through shadow DOM: it tests the elements on the event's `composedPath()`, from the innermost up to the view, so a button inside a web component's open shadow root is left alone. Before, only the event's target (the host) was tested. A closed shadow root stays a limit: mark its host with `data-kazoku-ignore`.

## [0.2.0] - 2026-11-01

- A button, link or form control inside the view still works: a pointer press on a child that matches the new `ignore` selector is not captured, so the click goes through and a drag from the empty view still turns it. Attribute `ignore` and `createViewController` option `ignore`; the default is `button, a, input, select, textarea, label, [data-kazoku-ignore]` (`DEFAULT_IGNORE`); `ignore=""` leaves nothing alone.
- Open at a zoom set against the page's fit scale: `zoom` is `fit` (the default, unchanged) or a number where 1 is the scene's natural size, and `fit-scale` / `setFitScale(n)` / the `fitScale` option tell the controls what zoom 1 means. The event's `zoom` stays 1 at Fit. New controller members `fitScale`, `startZoom`, `setStartZoom`; a new `fit-scale` reason in the event. `formatAddress` takes a fifth argument, `startZoom`, so the opening zoom keeps the address plain.

## [0.1.0] - 2026-11-01

The first release, and its first part: view controls, at `@johnmorrisdotca/kazoku-ui/view-controls`.

- `<kazoku-view-controls>`, a framework-free custom element (`/view-controls/element`, registered by `/view-controls/define`, which leaves a tag already taken alone), and `createViewController`, the same hands without an element.
- Angle and tilt sliders, Auto-turn with play and pause, Front; zoom out, 2 times, in and Fit; zoom about the pointer and with Ctrl or Command and the wheel; the four-arrow pan pad and the Move or Turn choice for a drag.
- Touch: one finger turns at 1x and moves the view when zoomed in; two fingers pinch.
- Choices kept in the address, with keys you can rename (`parseAddress`, `formatAddress`).
- It never draws: it reports `{ yaw, tilt, zoom, panX, panY, turning, drag }` in a `kazoku-viewchange` event or an `onChange` callback.
- Labels in English and Japanese; light and dark; 48 px touch targets; a compact bar on a phone; no automatic turn for a reader who prefers reduced motion.
- No runtime dependencies.
