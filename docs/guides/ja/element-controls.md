---
title: 要素が自分で操作を持つ
section: how-to
order: 20
description: パッケージ自身のカスタム要素が、1回の呼び出しでドラッグ、ピンチ、ホイール、キーを受けられるようにする方法、操作を切ったり範囲を決めたりする属性、ズームの範囲を広くした理由を説明します。
---

[English](../element-controls.md)

パッケージのタグをページに置いた読者は、絵がズームしたり動いたりすることを期待します。要素は、自分でそれをします。つながったときに`carryControls`を呼ぶと、共通の操作が要素に付きます。`<kazoku-view-controls>`も、ページ側の配線も要りません。ボタンがほしいページは、これまでどおりバーを足します。

## 呼び出し

```html
<my-card id="card" zoom-max="20"></my-card>

<script type="module">
  import { carryControls } from "@johnmorrisdotca/kazoku-ui/view-controls";

  class MyCard extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot === null) this.attachShadow({ mode: "open" }).innerHTML = "<div id=card>Card</div>";
      this.controls = carryControls(this, { onChange: (state) => this.draw(state) });
      this.draw(this.controls.controller.state);
    }
    disconnectedCallback() {
      this.controls.unbind();
    }
    draw({ yaw, tilt, zoom, panX, panY }) {
      this.shadowRoot.getElementById("card").style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${-tilt}deg) rotateY(${yaw}deg)`;
    }
  }
  customElements.define("my-card", MyCard);
</script>
```

`carryControls(element, options)`は`{ controller, setLimits, unbind }`を返します。必須のオプションは`onChange(state, info)`だけです。バーの`kazoku-viewchange`イベントを受けたときと同じように、要素が状態を絵に反映します。ほかは[コントローラーのオプション](view-controller.md)（`turnable`、`grabRadius`、`objectSize`、`fitScale`、`zoom`、`limits`など）と、`on`です。`controller`は、要素自身の`set`、`fit`、`state`のために使います。`unbind`は、すべての操作を外し、コントローラーを破棄します。要素を移してもう一度つなぐときは、`carryControls`をもう一度呼びます。そのときは全体表示から始まります（`initial`を渡せば、そこから始められます）。

## 一度だけ決めてあること

- **ドラッグとピンチ。** 全体表示のときドラッグは絵を回し、ズームしているときは絵を動かします。2本指で、ピンチ、移動、ひねりができます。ダブルタップで2倍に、もう一度で戻ります。
- **ホイール。** 全体表示のとき、ふつうのホイールはページをスクロールします。絵がページのわなになることはありません。Ctrl、Command、またはAltを押しながらのホイールは、ポインターを中心にズームし、ズームしているあいだは、ふつうのホイールがビューを動かします。
- **キー。** 矢印で回し、+と−でズームし、0とHomeで元に戻します。ページが`tabindex`を付けていなければ、要素に`tabindex="0"`が付きます。要素が始まる前にバーが先につながっていたときも付くので、バーのキーの受け先がなくなることはありません。
- **`touch-action`。** 全体表示のときは`pan-y`で、指でページをスクロールできます。ズームしているときは`none`です。カスタム要素は、何も指定しないとインラインです。インライン要素では`touch-action`が効かないので、操作を持っているあいだ、インライン要素はブロックにされます。
- **動きを減らす設定。** 自分で動き出すものはないので、止めるものがありません。中央に戻すときは、すぐに戻ります。
- **画面の外。** ページが自動回転を始めた場合も、要素が見えないあいだは止まります。

## 属性

| 属性 | |
|---|---|
| `controls` | 書かなければ、操作は入っています（静止画なら、オプションの`on: false`で、最初は切っておけます）。`controls="none"`で操作を外します。見張っているので、実行中に入れたり切ったりできます。 |
| `zoom-min`、`zoom-max` | ズームの範囲です。オプションの`limits`より優先され、`limits`は既定値より優先されます。`zoom-min`は1以下に、`zoom-max`は`zoom-min`以上に抑えられるので、全体表示は必ず範囲の中にあります。これも見張っています。 |
| `tilt-max`、`roll-max` | 傾き（30）とロール（180）の限度です。単位は度です。 |

## あとから変わる範囲

細かさが変わる絵があります（タイルが見つかって増える地図、乗りものに乗ったときの天体など）。そのときは、自分の範囲を`setLimits`で変えます。`zoomMin`、`zoomMax`、`tiltMax`、`rollMax`のどれでも渡せます。

```js no-check
const { setLimits } = carryControls(this, { onChange, limits: { zoomMax: 5 } });
setLimits({ zoomMax: 20 });
```

新しい数は、パッケージが渡した`limits`のかわりになります。ですから順番は変わらず、属性、パッケージ、既定値の順です。要素の`zoom-max`属性があれば、`setLimits`より優先されます。渡さなかった数は、そのままです。新しい範囲の外にあるズームは、中に戻されます。つながっているバーは、`kazoku-viewcarry`で新しい範囲を知り、目盛りとスライダーを描きなおします。要素自身の`zoom-min`と`zoom-max`属性を書いても、これまでどおり動きます。ただ、それはパッケージではなく、ページがするものです。

## バーがあるとき

同じ要素に`<kazoku-view-controls for="card">`があると、バーがいるあいだは、バーが操作を引き受けます。バーは要素に`data-kazoku-bar`という印を付け、`kazoku-viewbar`イベントで知らせます。要素自身の操作は引っ込むので、ドラッグが二重に処理されることはありません。ページは、これまでどおりバーの`kazoku-viewchange`イベントを反映します。バーがなくなると、要素の操作が全体表示から戻ります。このときのズームの範囲は、バー自身の`zoom-min`、`zoom-max`、`tilt-max`、`roll-max`があればそれで決まり、なければ要素の範囲（要素の属性、次にパッケージが渡した`limits`）になります。要素は、範囲が変わるたびに`kazoku-viewcarry`イベント（`detail.limits`）でバーに知らせます。

## ズームの範囲と、広くした理由

既定は**0.1倍から50倍**です（`DEFAULT_LIMITS`。0.21より前は1倍から5倍でした）。ズームは、描くピクセルを増やしません。キャンバスの大きさは決まっていて（レンダラーの上限は、1辺4096ピクセル、600万ピクセルです）、ズームは、すでに描いたものを拡大縮小するだけです。ですから下限に決まった理由はありません。全体表示の10分の1にすれば、全体を小さく見渡せます。上限を決めるのは、絵の細かさがどこまで保てるかだけです。

細かさが尽きる場所があるパッケージは、`limits`か、タグの`zoom-max`で、自分の範囲を渡します。

- 線画、SVG、星図、3Dモデルは、どの大きさでも細かさがあります。50倍、またはそれ以上にできます。
- 色を塗った地図は、2048ピクセルの地図で約1.5倍まで、4096ピクセルの地図で約3倍までくっきりしていて、それを超えるとぼやけます。その要素は、もっと細かいタイルを読み込めるようになるまで、小さい`zoomMax`を使います。
- 桁がいくつも違う範囲を見せるビュー（惑星とその距離など）は、`zoomMin: 1e-6`のように、自分の下限を決めます。

ズームのスライダーも、この広さについていきます。スライダーは対数の目盛りなので、−や+を1回押すと、どこでも同じ距離だけ動きます。両端の比が100倍以上の広い範囲では、目盛りの印は、まず10の累乗になります。0.1倍から50倍なら0.1×、1×、10×、50×で、0.1倍から1000倍なら0.1×、1×、10×、100×、1000×です。狭い範囲では、これまでの印（1×、2×、3×、5×）のままです。

```js
import { DEFAULT_LIMITS, readLimits, zoomMarks } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(JSON.stringify(DEFAULT_LIMITS));
console.log(JSON.stringify(readLimits((name) => ({ "zoom-max": "8" })[name] ?? null, { ...DEFAULT_LIMITS, zoomMin: 0.5 })));
console.log(zoomMarks(0.1, 50).map((mark) => mark.zoom).join(" "));
console.log(zoomMarks(0.1, 1000).map((mark) => mark.zoom).join(" "));
// {"tiltMax":30,"rollMax":180,"zoomMin":0.1,"zoomMax":50}
// {"tiltMax":30,"rollMax":180,"zoomMin":0.5,"zoomMax":8}
// 0.1 1 10 50
// 0.1 1 10 100 1000
```

以前の範囲がよいページは、バーか要素に`zoom-min="1" zoom-max="5"`を付ければ、ほかは何も変わりません。新しい既定値で何が変わるかは、[アップグレード](upgrading.md)にあります。
