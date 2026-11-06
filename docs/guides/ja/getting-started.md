---
title: はじめに
section: tutorial
order: 1
description: ファミリー共通の表示の操作、テーマの切り替え、言語の選択を、フレームワークも追加のビルドもなしで、数分でページに置きます。
---

[English](../getting-started.md)

Kazoku UI 家族は、ファミリー共通のインターフェース部品を、バージョン管理された1つのパッケージにまとめたものです。部品ごとに1つのサブパスがあるので、ページは使うものだけを読み込みます。実行時の依存はありません。どの部品も、ふつうのカスタム要素と、その隣にある純粋なモジュールでできているので、同じコードがページでも、フレームワークでも、サーバーでも動きます。

![デモ。ヘッダーに言語の選択とテーマの切り替えがあり、その下に少し回したカードと表示の操作がある](../../images/hero-light.webp)

## インストール

```sh
npm install @johnmorrisdotca/kazoku-ui
```

部品ごとに専用のサブパスがあります。`define`ファイルがタグを登録します。登録は1回だけで、そのタグが空いているときだけです。

| 部品 | タグ | 登録するためのインポート |
|---|---|---|
| 表示の操作 | `<kazoku-view-controls>` | `@johnmorrisdotca/kazoku-ui/view-controls/define` |
| テーマの切り替え | `<kazoku-theme-switch>` | `@johnmorrisdotca/kazoku-ui/theme-switch/define` |
| 言語の選択 | `<kazoku-language-picker>` | `@johnmorrisdotca/kazoku-ui/language-picker/define` |
| 画像の保存 | `<kazoku-save-image>` | `@johnmorrisdotca/kazoku-ui/save-image/define` |
| 速さのボタン | `<kazoku-speed-buttons>` | `@johnmorrisdotca/kazoku-ui/speed-buttons/define` |
| 埋め込みパネル | `<kazoku-embed-panel>` | `@johnmorrisdotca/kazoku-ui/embed-panel/define` |

共有レンダラー（`/renderer`）、フリーズ検査（`/testing`）、アドレスの状態（`/address-state`）には、要素がありません。

## ビューに表示の操作を付ける

表示の操作は、ページのシーンを自分で描くことはありません。ユーザーが選んだことをページに伝え、キャンバス、WebGL、SVG、CSS 3Dのどれで描いていても、ページ側がそれを反映します。要素をビューのそばに置き、`for`でビューを指定し、イベントをひとつ待ち受けます。

```html
<div id="scene" tabindex="0" style="height: 260px">Your scene</div>
<kazoku-view-controls for="scene" address></kazoku-view-controls>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  const scene = document.getElementById("scene");
  document.querySelector("kazoku-view-controls").addEventListener("kazoku-viewchange", (event) => {
    const { yaw, tilt, zoom, panX, panY } = event.detail;
    scene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${tilt}deg) rotateY(${yaw}deg)`;
  });
</script>
```

バーには、角度のスライダー、自動回転、ズームの縮小と拡大（数値表示つき）、全体表示、そして「詳細」ボタンがあります。ドラッグで回り、ホイールでビューが動き、ピンチ、またはCtrl、Command、Altを押しながらのホイールでポインターを中心にズームし、矢印キーで回り、Shiftと左右の矢印でロールします。`address`を付けると、選んだ内容がリンクに残ります。詳しくは[表示の操作](view-controls.md)にあります。

## テーマの切り替えと言語の選択

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import "@johnmorrisdotca/kazoku-ui/language-picker/define";

  document.addEventListener("kazoku-languagechange", ({ detail }) => console.log("language", detail.lang));
</script>
```

テーマの切り替えは`<html>`に`data-theme`を書き込み、CSSがそれを読みます。言語の選択は`lang`を書き込んでページに知らせ、言葉はページ自身が決めます。[テーマの切り替え](theme-switch.md)と[言語の選択](language-picker.md)を参照してください。

## 要素なしで、アドレスに選択を残す

```js
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";

const where = { search: "", pathname: "/", hash: "", written: [] };
const host = {
  location: where,
  history: { state: null, replaceState(_state, _unused, url) { where.search = url.includes("?") ? url.slice(url.indexOf("?")) : ""; where.written.push(url); } },
};
const state = createAddressState({ defaults: { size: "m" }, delay: 0, host });
state.set("size", "l");
console.log(where.search, state.get("size"));
state.set("size", "m");
console.log(JSON.stringify(where.search), state.get("size"));
// ?size=l l
// "" m
```

既定値のままの値はアドレスに残らず、ページのほかのパラメーターと`#hash`は保たれ、選択で履歴が増えることもありません。[アドレスの状態](address-state.md)を参照してください。

## 次に読むもの

- キャンバス、SVG、任意の要素を画像にする：[画像の保存](save-image.md)
- 速さを1列のボタンで選ぶ（0.5×、1×、2×、または自由なステップ）：[速さのボタン](speed-buttons.md)
- パッケージのデモに置く、共通の「自分のページに入れる」パネル：[埋め込みパネル](embed-panel.md)
- 多数の3Dビューを1つのWebGLコンテキストで：[共有レンダラー](renderer.md)
- React、Vue、Svelte、Angular、厳格なContent-Security-Policy：[フレームワークとCSP](frameworks-and-csp.md)
- 全体の作り：[アーキテクチャ](architecture.md)
- 動くものを試す：[デモ](https://johnmorrisdotca.github.io/kazoku-ui/)と[ビルダー](https://johnmorrisdotca.github.io/kazoku-ui/builder.html)
