---
title: Architecture
section: explanation
order: 12
description: How the package is split into parts, what each part holds, why pure code, element and define are three files, and the rules the repository keeps.
---

Kazoku UI is plain TypeScript compiled to ES modules, with no runtime dependency. Its rule is **one part, one subpath**: each part of the family's interface lives in `src/<part>/` and is exported as `@johnmorrisdotca/kazoku-ui/<part>`, so a page loads only what it uses.

## The parts

| Part | Source | Subpaths |
|---|---|---|
| View controls | `src/view-controls/` | `/view-controls`, `/view-controls/element`, `/view-controls/define` |
| Theme switch | `src/theme-switch/` | `/theme-switch`, `/theme-switch/element`, `/theme-switch/define` |
| Language picker | `src/language-picker/` | `/language-picker`, `/language-picker/element`, `/language-picker/define` |
| Save image | `src/save-image/` | `/save-image`, `/save-image/element`, `/save-image/define` |
| Speed buttons | `src/speed-buttons/` | `/speed-buttons`, `/speed-buttons/element`, `/speed-buttons/define` |
| Shared renderer | `src/renderer/` | `/renderer` |
| Freeze checks | `src/testing/` | `/testing` |
| Address state | `src/address-state/` | `/address-state` |
| Shared internals | `src/shared/` | used by the parts; not exported |

The main entry, `@johnmorrisdotca/kazoku-ui`, exports only `PARTS`, the subpaths of the parts in the order they were added, and the type `Part`.

## Three files to a part

Each part with an element is three files, and the split is the point:

1. **The pure code** (`index.ts`): the maths, the labels, the parsing and the functions. No DOM at import, so it imports on a server and tests run it in Node.
2. **The element** (`element.ts`): the class (`ViewControlsElement`, `ThemeSwitchElement`, `LanguagePickerElement`, `SaveImageElement`). It needs a browser, and importing it registers nothing.
3. **The registration** (`define.ts`): calls `customElements.get` first and defines the tag only when it is free.

A part never draws the page's scene or applies the page's choice: it reports what the reader chose, and the page applies it. The theme switch writes `data-theme`; the language picker writes `lang`; the view controls dispatch `kazoku-viewchange`.

## The shared internals

`src/shared/` is what the elements have in common and is not exported: `base.ts` (the styles every part starts from: the colours as custom properties, light and dark, the 48 px button and the focus ring), `adopt.ts` (putting the styles into the shadow root in a way a strict policy allows: a constructable stylesheet, or a `<style>` with the nonce where there is none), `scheme.ts` (keeping `data-scheme` the same as the colours the page is in: its forced `data-theme` or else the device's), `store.ts` (a `localStorage` that may throw, so a private window or a sandboxed frame is the same as an empty store) and `target.ts` (finding the element a part writes to by selector, in the element's own tree first, then the document, with no selector meaning `<html>`).

## How the view controls work

The controller (`controller.ts`) owns the camera `{ yaw, tilt, zoom, panX, panY }` and the hands: pointer, pinch, wheel and keys. It is a state machine over the pure arithmetic of `math.ts` and `zoomScale.ts`, with its clock passed in, so a test turns it by hand. The element draws the bar, binds the controller to the view and dispatches the event. `sight.ts` watches whether the view can be seen, so the automatic turn asks for no frame while it cannot. `address.ts` reads and writes the choices, `levels.ts` holds the levels, the paces and the layouts, `zoomScale.ts` the slider's scale, and `words.ts` the labels.

## Rules the repository keeps

- **No runtime dependencies.** A dependency is not added for convenience.
- **Registering a tag leaves a taken tag alone.**
- **Controls are on or right beside the view and visible without scrolling; changing a control never stops or resets the turn; a compact bar on phones; reduced motion respected; light and dark; 48 px touch targets; no browser-default controls.**
- **Labels in English and Japanese,** every key in both (a test holds that).
- **No marks.** No brand, league, federation or sponsor mark.
- **Test what you change.** Unit tests in `test/` (the maths, the address, the controller with a clock the test turns by hand), and the demo in a real browser in `e2e/`, in Chromium and WebKit at a phone's width and a desk's, Chromium drawing in software.
- **No 3D release without a freeze test.** See [The shared renderer](renderer.md).

## What the family copies

`templates/` holds files the family's other package repositories copy unchanged: `AGENTS.md`, `check-standard.mjs` (the must-have list as a check) and `e2e-ground.mjs` with its types (the shared browser check of the drag rule). `.github/workflows/reusable-release.yml` is the release written once. They are changed here, with a new version, and then in every repository's copy; a package never edits its copy.

## Tests

`pnpm test` runs the unit tests with `node --test` on the TypeScript source. `pnpm test:package` packs the package as npm does, installs it in an empty project and imports every entry. `pnpm test:demo` builds the demo and plays it in Chromium and WebKit. `pnpm test:readme` runs every example in the README and the guides, in Node and in a browser, and `pnpm docs:check` holds the reference and the guides to the code.
