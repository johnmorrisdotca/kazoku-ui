---
title: リプレイバー
section: how-to
order: 17
description: 再生、一時停止、最初に戻る、くり返しのボタンと、ファミリー共通の速さのボタンを1列に並べます。状態はアドレスに残ります。バーは押されたボタンを知らせるだけで、動かすのはページです。
---

[English](../replay-bar.md)

再生、一時停止、最初に戻る、くり返しのボタンと、ファミリー共通の速さのボタンが同じ列に並びます。バーは何が押されたかを知らせます。ものを動かすのはページです。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/replay-bar/define";
</script>

<kazoku-replay-bar address steps="1 60 600"></kazoku-replay-bar>
```

`kazoku-replay`イベントは`{ action, playing, repeat, reason }`を持ちます。`action`は`play`、`pause`、`start`、`repeat`のどれかです。`playing`と`repeat`は属性で、`address`があると`play=on`、`repeat=on`としてアドレスに残ります。`address-keys="play:p,repeat:r"`で名前を変えられます。

速さのボタンは同じ`<kazoku-speed-buttons>`です。`steps`が速さの一覧、`speed`が選ばれている速さです。アドレスのキーは`speed-key`で変えない限り`replay-speed`なので、ビューの`pace`には触りません。変わったときは、いつもの`kazoku-speedchange`イベントが出ます。

「動きを減らす」設定のときは、再生は始まりません。ボタンはありますが何もしません。アドレスに`play=on`とあっても始まりません。

```ts
import { flagOn, addressKeys } from "@johnmorrisdotca/kazoku-ui/replay-bar";

console.log(flagOn("on"), addressKeys("play:p").play);
```

## 部品

| インポート | 中身 |
| --- | --- |
| `replay-bar/define` | `defineReplayBar()`を実行します。名前が空いているときだけ`<kazoku-replay-bar>`を登録します。 |
| `replay-bar/element` | クラス`ReplayBarElement`。自分で登録したいときに使います。 |
| `replay-bar` | DOMを使わない部分：`flagOn`、`addressKeys`と、アドレスのキー`PLAY_KEY`（`play`）、`REPEAT_KEY`（`repeat`）、`SPEED_KEY`（`replay-speed`）。 |
