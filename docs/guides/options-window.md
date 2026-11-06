---
title: Options window
section: how-to
order: 18
description: A small floating window a package fills with its own controls. The frame is one attribute, so a later shelf or inspector is a setting, not a new window.
---

# Options window

`<kazoku-options-window>` is a small window over a view. The page fills the default slot. The window does not know what those controls do.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/options-window/define";
</script>

<div style="position: relative; height: 420px">
  <kazoku-options-window title="Planet options" address variant="card">
    <p>Turn speed</p>
    <p slot="help">How fast it spins.</p>
  </kazoku-options-window>
</div>
```

## Pick the frame

`variant` is `card`, `shelf` or `inspector`. `parseVariant` reads it, and anything else is `card`. `VARIANTS` is that list.

Card is the finished frame: drag the title, and it snaps to a corner or an edge and stays inside the view. Shelf docks to the right edge. Inspector is a wider card. The title, the slot and the help are defined once. `frameOf` copies them and only the presentation changes (`float`, `edge` or `wide`), so a later frame is a setting.

```ts
import { addressKeys, frameOf, gestureHelp, namedPlace, OPEN_KEY, parsePlace, parseVariant, PLACE_KEY, settle, SNAPS, WORDS, wordsFor, languageOf, TAG } from "@johnmorrisdotca/kazoku-ui/options-window";

const view = { width: 800, height: 600 };
const size = { width: 280, height: 160 };
const placed = settle(view, size, { x: 4, y: 4 });
const frame = frameOf(parseVariant("shelf"), { title: "Planet options", help: gestureHelp("en"), open: true });
console.log(placed.snap, frame.presentation, frame.title, addressKeys("open:ow").open, namedPlace(view, size, "tr").x, parsePlace("bl") !== null, SNAPS.includes("tl"), WORDS.en.collapse, wordsFor("ja").help, languageOf("ja"), OPEN_KEY, PLACE_KEY, TAG);
// tl edge Planet options ow 520 true true Collapse ヘルプ ja open place kazoku-options-window
```

`settle` holds the window inside the view and, within 28 pixels of an edge, sits it on that edge. `namedPlace` is the point for a named corner. `SNAPS` lists the names, and `parsePlace` reads a name or `x,y`.

## Move, fold, help

Drag the title. Escape folds the window to its title chip, and a click on the chip opens it. Collapse does the same. Arrow keys move it while the title has focus.

The ? button opens help. The first line is `gestureHelp`, the view controls' gesture sentence, so it is written once. The `help` slot follows it, for the lines a package adds. A page's own Help button can show `gestureHelp` too.

On a screen up to 700 pixels wide the window is a sheet at the bottom of the view.

## Remembered

With `address`, a folded window is `open=off` and a place other than the top-right corner is `place` (`tl`, or `120,40`). The top-right corner leaves the address plain. `addressKeys` renames the keys (`open:ow,place:op`). `OPEN_KEY` is `open` and `PLACE_KEY` is `place`.

Without `address`, the same pair is kept on the device under `storage`. The default key is `kazoku-options-window`. Two windows on one page need two keys.

`WORDS`, `wordsFor` and `languageOf` are the labels. `TAG` is `kazoku-options-window`. The class is `OptionsWindowElement`, and `defineOptionsWindow` registers it.
