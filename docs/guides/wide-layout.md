---
title: Wide layout
section: how-to
order: 22
description: A Wide and Normal button (theatre mode, as YouTube has it) that gives the view the page's whole width and moves the side panel below it, kept in the address and on the device, with the T key and a resize so the view draws again.
---

`<kazoku-wide-toggle>` is one button that switches a page between **Normal** and **Wide**. In Normal the side panel is a column beside the view. In Wide the view takes the page's whole width and the panel moves below it, as a row of boxes. The button says the layout a press gives: "Wide" in Normal and "Normal" in Wide (ワイド and ふつう in Japanese), with an icon, 48 px tall. The **T** key does the same, as YouTube's does.

The element writes `data-wide="on"` on a target (the page's `<html>` unless you name another), keeps the choice in the address (`?wide=on`) and, if asked, in localStorage, and tells the page with a `kazoku-widechange` event. The layout is the page's CSS: `wideCss()` is the rule, ready to use.

## Use it

```html
<kazoku-wide-toggle address storage></kazoku-wide-toggle>
<div class="kazoku-stage">
  <div class="kazoku-view" style="height: 320px">The view</div>
  <aside class="kazoku-side"><section>One box</section><section>Another box</section></aside>
</div>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/wide-layout/define";
  import { wideCss } from "@johnmorrisdotca/kazoku-ui/wide-layout";

  const style = document.createElement("style");
  style.textContent = wideCss();
  document.head.append(style);
</script>
```

Under a strict Content-Security-Policy, give the style element the page's nonce, or copy the CSS into your own stylesheet: `wideCss()` is a plain string.

## The rule

A `.kazoku-stage` holds a `.kazoku-view` and a `.kazoku-side`.

| | Normal | Wide (`data-wide="on"` on any ancestor) |
|---|---|---|
| The stage | Two columns: the view, then the panel (320 px, or `side`) | One column |
| The view | Your own height | The full width, 16:9, no taller than `maxHeight` (80vh) |
| The panel | A column of boxes beside the view | A grid below the view: as many boxes in a row as fit 260 px each |
| On a phone (640 px and under) | One column; the button is hidden | The same: one column |

`wideCss({ side: "20rem", maxHeight: "70vh" })` changes the panel's width and the view's greatest height. The page's own container must not cap its width in Wide: if your page has `main { max-width: 760px }`, add `[data-wide="on"] main { max-width: none }`. A phone is already one column, so the rule does nothing there, and the toggle hides itself.

## The view draws again

A view that draws to its size (a canvas, WebGL, an SVG) must draw again when the layout changes. After each change the element sends the window's `resize` event on the next frame, once the layout has moved, so a page that already listens for `resize` redraws with no new code. A view that uses a `ResizeObserver` hears the change by itself. `resize="off"` stops the event. Keep to the renderer's caps when you draw at the new size: 4096 pixels a side and 6 million pixels (`pixelRatioFor` in [the renderer](renderer.md) works it out).

## Attributes and the event

| Attribute | |
|---|---|
| `value` | `on` or `off`: the choice to start from. |
| `target` | A CSS selector for the element that gets `data-wide`; the page's `<html>` by default. |
| `address` | Keep the choice in `?wide=on` (or the key `address-key` names). Normal takes the parameter out. |
| `storage` | Also remember it on this device, in localStorage (a bare `storage` uses `kazoku-wide`). |
| `keys` | `keys="off"` turns the T key off. |
| `resize` | `resize="off"` stops the window's `resize` event. |
| `lang` | `en` or `ja`; otherwise the page's `lang`. |
| `theme` | `light` or `dark` for its own look; otherwise it follows the page. |

The start is read from the address, then the store, then `value`, then what the target already holds. In code, `toggle.wide` is the choice (set it to change it), `toggle.toggle()` switches, `toggle.words = { wide: "Theatre" }` changes the labels, and `toggle.target` is the element written on.

`kazoku-widechange` bubbles, and its `detail` is `{ wide, reason, target }`. `reason` is `init`, `user` (the button), `key` (the T key), `set` (the property or attribute) or `external` (something else wrote the target's `data-wide`, and the button follows it).

Importing `wide-layout/define` registers the tag, leaving a taken tag alone. `defineWideToggle(registry)` does the same for a registry you pass, and `WideToggleElement` (from `wide-layout/element`) is the class, to extend or to register under your own name. `WideChangeDetail` is the event's type.

## The T key

T switches the layout from anywhere on the page, as it does on YouTube, unless the reader is typing: a focused text field, textarea, select or editable element keeps its own T, and so does any press with Ctrl, Command or Alt held. A held key does not repeat the switch. `isTyping(target, event)` is that rule, if your own code needs it.

## The parts without the element

`parseWide`, `wideOf`, `applyWide` and `readWide` are the choice, the target and the memory, with no DOM until given an element. `WIDE_ATTRIBUTE`, `WIDE_ADDRESS_KEY` and `WIDE_STORAGE_KEY` name the three places it is kept, and `WIDE_MIN_WIDTH_PX` is where a phone ends. `WORDS`, `wordsFor` and `languageOf` are the labels. See the [labels](../labels.md).

## Tested

The choice, the address, the store and the key rule are in unit tests. The demo, `wide.html`, is tested in Chromium and WebKit: the panel beside the view in Normal and below it in Wide, in a row; the view's width and shape; the address and the device keeping the choice; the T key and the places it is left alone; the view drawing again at its new size inside the caps; Japanese; and a phone, where the toggle is hidden and the page is one column.
