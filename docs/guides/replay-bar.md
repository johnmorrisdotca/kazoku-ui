# Replay bar

Play, pause, back to the start and repeat, with the family's speed buttons on the same row. The bar reports what was pressed. The page moves the thing.

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/replay-bar/define";
</script>

<kazoku-replay-bar address steps="1 60 600"></kazoku-replay-bar>
```

`kazoku-replay` carries `{ action, playing, repeat, reason }`. `action` is `play`, `pause`, `start` or `repeat`. `playing` and `repeat` are attributes, and with `address` they are kept as `play=on` and `repeat=on`. `address-keys="play:p,repeat:r"` renames either.

The speed buttons are the same `<kazoku-speed-buttons>`. `steps` is the list, `speed` is the one that is on, and their address key is `replay-speed` unless `speed-key` says otherwise, so a view's `pace` is left alone. A change is the usual `kazoku-speedchange`.

Reduced motion leaves play off: the button is there and does nothing, and an address that says `play=on` does not start it.

```ts
import { flagOn, addressKeys } from "@johnmorrisdotca/kazoku-ui/replay-bar";

console.log(flagOn("on"), addressKeys("play:p").play);
```
