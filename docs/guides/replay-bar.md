---
title: Replay bar
section: how-to
order: 17
description: Play, pause, back to the start and repeat, with the family's speed buttons on the same row, kept in the address; the bar reports what was pressed and the page moves the thing.
---

Play, pause, back to the start and repeat, with the family's speed buttons on the same row. The bar reports what was pressed. The page moves the thing.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/replay-bar/define";
</script>

<kazoku-replay-bar address steps="1 60 600"></kazoku-replay-bar>
```

`kazoku-replay` carries `{ action, playing, repeat, reason }`. `action` is `play`, `pause`, `start` or `repeat`. `playing` and `repeat` are attributes, and with `address` they are kept as `play=on` and `repeat=on`. `address-keys="play:p,repeat:r"` renames either.

The speed buttons are the same `<kazoku-speed-buttons>`. `steps` is the list, `speed` is the one that is on, and their address key is `replay-speed` unless `speed-key` says otherwise, so a view's `pace` is left alone. A change is the usual `kazoku-speedchange`.

Reduced motion leaves play off: the button is there and does nothing, and an address that says `play=on` does not start it. Add `user-play` and a reader's own press on Play is honoured even then (nothing starts by itself, and an address that says `play=on` still does not start it), which is what [the family clock](clock.md) needs for a still view with Play ready.

```ts
import { flagOn, addressKeys } from "@johnmorrisdotca/kazoku-ui/replay-bar";

console.log(flagOn("on"), addressKeys("play:p").play);
```

## The parts

| Import | What it is |
| --- | --- |
| `replay-bar/define` | Runs `defineReplayBar()`, which registers `<kazoku-replay-bar>` only when the name is free. |
| `replay-bar/element` | The class `ReplayBarElement`, to register it yourself. |
| `replay-bar` | The pure side, with no DOM: `flagOn`, `addressKeys`, and the address keys `PLAY_KEY` (`play`), `REPEAT_KEY` (`repeat`) and `SPEED_KEY` (`replay-speed`). |
