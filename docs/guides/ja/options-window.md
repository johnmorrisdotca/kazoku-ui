---
title: オプションの窓
section: how-to
order: 18
description: パッケージが自分の操作を入れる、浮かぶ小さな窓です。枠は属性1つで選ぶので、後から棚やインスペクターに替えても、窓を作り直す必要はありません。
---

[English](../options-window.md)

# オプションの窓

`<kazoku-options-window>`は、ビューの上に浮かぶ小さな窓です。ページは既定のスロットに中身を入れます。窓は、その操作が何をするかを知りません。

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

## 枠を選ぶ

`variant`は`card`、`shelf`、`inspector`です。`parseVariant`が読み、それ以外は`card`になります。`VARIANTS`がその一覧です。

カードが、できあがった枠です。タイトルをドラッグすると、角か辺に吸い付き、ビューの中に収まります。棚は右端に付きます。インスペクターは、幅の広いカードです。タイトルとスロットとヘルプは、1か所で決まります。`frameOf`はそれをコピーし、見た目だけが変わります（`float`、`edge`、`wide`）。だから後の枠は、設定の変更です。

```ts
import { addressKeys, frameOf, gestureHelp, namedPlace, OPEN_KEY, parsePlace, parseVariant, PLACE_KEY, settle, SNAPS, WORDS, wordsFor, languageOf, TAG } from "@johnmorrisdotca/kazoku-ui/options-window";

const view = { width: 800, height: 600 };
const size = { width: 280, height: 160 };
const placed = settle(view, size, { x: 4, y: 4 });
const frame = frameOf(parseVariant("shelf"), { title: "Planet options", help: gestureHelp("en"), open: true });
console.log(placed.snap, frame.presentation, frame.title, addressKeys("open:ow").open, namedPlace(view, size, "tr").x, parsePlace("bl") !== null, SNAPS.includes("tl"), WORDS.en.collapse, wordsFor("ja").help, languageOf("ja"), OPEN_KEY, PLACE_KEY, TAG);
// tl edge Planet options ow 520 true true Collapse ヘルプ ja open place kazoku-options-window
```

`settle`は窓をビューの中に収め、辺から28ピクセル以内ならその辺に寄せます。`namedPlace`は、名前を付けた角の位置です。`SNAPS`は名前の一覧で、`parsePlace`は名前か`x,y`を読みます。

## 動かす、折りたたむ、ヘルプ

タイトルをドラッグします。Escapeでタイトルのチップに折りたたみ、チップを押すと開きます。折りたたむボタンも同じです。タイトルにフォーカスがあるとき、矢印キーで窓が動きます。

?ボタンでヘルプが開きます。最初の行は`gestureHelp`で、表示の操作と同じ文なので、1か所にだけ書いてあります。その後に`help`スロットが続き、パッケージが足す行です。ページ自身のヘルプボタンも、`gestureHelp`を出せます。

幅が700ピクセルまでの画面では、ビューの下端にシートとして付きます。

## 覚えていること

`address`があると、しまった窓は`open=off`、右上以外の位置は`place`（`tl`、または`120,40`）になります。右上ならアドレスはそのままです。`addressKeys`でキーの名前を変えられます（`open:ow,place:op`）。`OPEN_KEY`は`open`、`PLACE_KEY`は`place`です。

`address`がなければ、同じ組を端末に残します。キーは`storage`で、既定は`kazoku-options-window`です。1ページに窓が2つあるときは、キーも2つ要ります。

`WORDS`、`wordsFor`、`languageOf`がラベルです。`TAG`は`kazoku-options-window`です。クラスは`OptionsWindowElement`、登録は`defineOptionsWindow`です。
