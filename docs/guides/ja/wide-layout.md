---
title: ワイド表示
section: how-to
order: 22
description: ワイドと標準を切りかえるボタン（YouTubeのシアターモードと同じ）です。ビューがページの幅いっぱいになり、横のパネルがその下に移ります。選びはアドレスと端末に残り、Tキーでも切りかわり、ビューは新しい大きさで描きなおされます。
---

[English](../wide-layout.md)

`<kazoku-wide-toggle>`は、ページを**標準**と**ワイド**に切りかえるボタンです。標準のときは、横のパネルがビューの横に縦に並びます。ワイドのときは、ビューがページの幅いっぱいになり、パネルはその下に、箱が横に並ぶ形で移ります。ボタンには、押したあとの形の名前が書いてあります。ふつうのときは「ワイド」、ワイドのときは「標準」です。アイコンがつき、高さは48pxです。YouTubeと同じで、**T**キーでも切りかわります。

要素は、対象（ふつうはページの`<html>`）に`data-wide="on"`を書き、選びをアドレス（`?wide=on`）に残します。頼まれれば、localStorageにも残します。ページへは`kazoku-widechange`イベントで知らせます。配置はページのCSSです。そのまま使える規則が`wideCss()`です。

## 使いかた

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

厳しいContent-Security-Policyのもとでは、style要素にページのnonceをつけるか、CSSを自分のスタイルシートに写してください。`wideCss()`はふつうの文字列です。

## 規則

`.kazoku-stage`の中に、`.kazoku-view`と`.kazoku-side`を入れます。

| | 標準 | ワイド（祖先に`data-wide="on"`） |
|---|---|---|
| ステージ | 2列。ビューと、パネル（320px、または`side`） | 1列 |
| ビュー | 自分で決めた高さ | 幅いっぱい、16:9、高さは`maxHeight`（80vh）まで |
| パネル | ビューの横に、箱が縦に並ぶ | ビューの下に、箱が格子状に並ぶ。1つ260pxで、入るだけ横に並ぶ |
| スマホ（幅640px以下） | 1列。ボタンは隠れる | 同じ。1列 |

`wideCss({ side: "20rem", maxHeight: "70vh" })`で、パネルの幅とビューの高さの上限を変えられます。ワイドのときは、ページの入れ物が幅を止めてはいけません。たとえば`main { max-width: 760px }`があるなら、`[data-wide="on"] main { max-width: none }`を足してください。スマホは、もともと1列なので、規則は何もせず、ボタンも隠れます。

## ビューを描きなおす

大きさに合わせて描くビュー（canvas、WebGL、SVG）は、配置が変わったら描きなおさなければなりません。要素は、切りかわるたびに、配置が動いたあとの次のフレームで、ウィンドウの`resize`イベントを送ります。ですから、すでに`resize`を聞いているページは、何も足さずに描きなおします。`ResizeObserver`を使うビューは、自分で気づきます。`resize="off"`にすると、このイベントは送りません。新しい大きさで描くときは、レンダラーの上限を守ってください。1辺4096ピクセル、全体で600万ピクセルです（[レンダラー](renderer.md)の`pixelRatioFor`が計算します）。

## 属性とイベント

| 属性 | |
|---|---|
| `value` | `on`か`off`。はじめの選びです。 |
| `target` | `data-wide`を書く要素のCSSセレクターです。ふつうはページの`<html>`です。 |
| `address` | 選びを`?wide=on`に残します（`address-key`でキーを変えられます）。標準に戻すとパラメーターは消えます。 |
| `storage` | この端末のlocalStorageにも残します（`storage`だけなら`kazoku-wide`を使います）。 |
| `keys` | `keys="off"`で、Tキーを使わなくします。 |
| `resize` | `resize="off"`で、ウィンドウの`resize`イベントを送らなくします。 |
| `lang` | `en`か`ja`。ないときはページの`lang`です。 |
| `theme` | `light`か`dark`。自分の見た目を決めます。ないときはページに合わせます。 |

はじめの選びは、アドレス、ストア、`value`、対象がすでに持っているものの順に読みます。コードでは、`toggle.wide`が選びで、代入すると変わります。`toggle.toggle()`で切りかえ、`toggle.words = { wide: "Theatre" }`でラベルを変え、`toggle.target`が書きこむ先の要素です。

`kazoku-widechange`はバブリングし、`detail`は`{ wide, reason, target }`です。`reason`は、`init`、`user`（ボタン）、`key`（Tキー）、`set`（プロパティか属性）、`external`（ほかが対象の`data-wide`を書いた。ボタンはそれに合わせます）のどれかです。

`wide-layout/define`を読み込むと、タグが登録されます。すでに使われているタグは、そのままにします。渡したレジストリに登録したいときは`defineWideToggle(registry)`を使います。`WideToggleElement`（`wide-layout/element`から）はクラスで、拡張したり、自分の名前で登録したりできます。`WideChangeDetail`はイベントの型です。

## Tキー

Tキーは、YouTubeと同じで、ページのどこからでも切りかえます。ただし、入力中は別です。文字入力の欄、textarea、select、編集できる要素にフォーカスがあるときは、そちらのTになります。Ctrl、Command、Altを押しているときも切りかえません。押しっぱなしで切りかえをくり返すこともありません。自分のコードでこの決まりが要るときは、`isTyping(target, event)`を使います。

## 要素なしで使う部分

`parseWide`、`wideOf`、`applyWide`、`readWide`は、選び、対象、記憶の部分で、要素を渡すまでDOMには触りません。`WIDE_ATTRIBUTE`、`WIDE_ADDRESS_KEY`、`WIDE_STORAGE_KEY`は、選びが残る3つの場所の名前です。`WIDE_MIN_WIDTH_PX`は、スマホが終わる幅です。`WORDS`、`wordsFor`、`languageOf`がラベルです。[ラベル](../../labels.md)を見てください。

## テスト

選び、アドレス、ストア、キーの決まりは、単体テストで確かめています。デモの`wide.html`は、ChromiumとWebKitで確かめています。確かめることは次のとおりです。標準ではパネルがビューの横、ワイドではその下に横並びになること。ビューの幅と形。アドレスと端末が選びを覚えていること。Tキーと、効かない場面。新しい大きさへの描きなおしと上限。日本語。スマホではボタンが隠れて1列になること。
