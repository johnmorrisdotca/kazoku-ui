---
title: フレームワークとCSP
section: how-to
order: 10
description: ふつうのHTML、React、Vue、Svelte、Angularでの使い方、サーバーでの安全な扱い、自分でのタグ登録、厳格なContent-Security-Policyの下での動作を説明します。
---

[English](../frameworks-and-csp.md)

どの部品も標準のカスタム要素なので、カスタムタグを描画できるフレームワークなら使えます。要素はふつうのDOMです。refを渡し、イベントをひとつ待ち受け、ボタンは要素自身に描かせます。要素の隣にある純粋なモジュール（`view-controls`、`theme-switch`、`language-picker`、`save-image`、`address-state`）は、インポート時にDOMが要らないので、サーバーでも安全です。

## ふつうのHTML

```html
<div id="scene" tabindex="0" style="height: 200px">Your scene</div>
<kazoku-view-controls for="scene" address></kazoku-view-controls>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  document.querySelector("kazoku-view-controls").addEventListener("kazoku-viewchange", (event) => {
    document.getElementById("scene").dataset.yaw = String(event.detail.yaw);
  });
</script>
```

バンドラーがないと、ブラウザーはパッケージを名前で見つけなければなりません。インポートマップで、各サブパスの場所を指定します。

```html
<script type="importmap">
{ "imports": {
  "@johnmorrisdotca/kazoku-ui/view-controls/define": "/node_modules/@johnmorrisdotca/kazoku-ui/dist/view-controls/define.js",
  "@johnmorrisdotca/kazoku-ui/theme-switch/define": "/node_modules/@johnmorrisdotca/kazoku-ui/dist/theme-switch/define.js"
} }
</script>
<kazoku-theme-switch address></kazoku-theme-switch>
<script type="module">import "@johnmorrisdotca/kazoku-ui/theme-switch/define";</script>
```

各`define`ファイルは、必要なファイルを相対パスでインポートするので、自分が書く名前だけをマップすれば足ります。バンドラーなら、同じファイルを`node_modules`から、マップなしで配信します。

## React

```jsx
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { useEffect, useRef } from "react";

export function Viewer({ draw }) {
  const view = useRef(null);
  const controls = useRef(null);
  useEffect(() => {
    const bar = controls.current;
    bar.view = view.current;
    const on = (event) => draw(event.detail);
    bar.addEventListener("kazoku-viewchange", on);
    return () => bar.removeEventListener("kazoku-viewchange", on);
  }, [draw]);
  return (
    <>
      <div ref={view} tabIndex={0} style={{ height: 320 }} />
      <kazoku-view-controls ref={controls} lang="en" />
    </>
  );
}
```

## Vue 3

コンパイラーに、これらのタグがカスタム要素であること（`kazoku-`に対する`isCustomElement`）を伝えたうえで、refとリスナーをひとつ使います。

```vue
<script setup>
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { onMounted, ref } from "vue";

const emit = defineEmits(["change"]);
const view = ref(null);
const bar = ref(null);
onMounted(() => {
  bar.value.view = view.value;
  bar.value.addEventListener("kazoku-viewchange", (event) => emit("change", event.detail));
});
</script>
<template>
  <div ref="view" tabindex="0" style="height: 320px" />
  <kazoku-view-controls ref="bar" />
</template>
```

## Svelte

```svelte
<script>
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import { onMount } from "svelte";
  let choice = "auto";
  let switcher;
  onMount(() => switcher.addEventListener("kazoku-themechange", (event) => (choice = event.detail.choice)));
</script>
<kazoku-theme-switch bind:this={switcher} address></kazoku-theme-switch>
<p>The choice is {choice}.</p>
```

## Angular

```ts no-check
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit } from "@angular/core";
import "@johnmorrisdotca/kazoku-ui/language-picker/define";

@Component({
  selector: "app-language",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<kazoku-language-picker #picker languages="en ja" address></kazoku-language-picker>`,
})
export class LanguageComponent implements AfterViewInit {
  @ViewChild("picker") picker!: ElementRef<HTMLElement>;
  ngAfterViewInit() {
    this.picker.nativeElement.addEventListener("kazoku-languagechange", (event) => console.log((event as CustomEvent).detail.lang));
  }
}
```

## サーバーで

要素は、モジュールが評価されるときに`HTMLElement`を継承するので、サーバーで`define`や`element`をインポートすると「HTMLElement is not defined」で失敗します。これらはブラウザーだけでインポートしてください（Reactでは、エフェクトの中か、サーバー描画を無効にした動的インポートで）。純粋なモジュールは、どこでも安全です。

```js
import { applyTheme, themeOf } from "@johnmorrisdotca/kazoku-ui/theme-switch";
import { startingLanguage } from "@johnmorrisdotca/kazoku-ui/language-picker";
import { formatAddress } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { PARTS } from "@johnmorrisdotca/kazoku-ui";

console.log(typeof document, typeof applyTheme, typeof themeOf);
console.log(startingLanguage({ list: ["en", "ja"], preferred: ["ja-JP", "en"] }));
console.log(formatAddress("", { yaw: 0, tilt: 0, zoom: 2, drag: "move" }));
console.log(PARTS.length > 5);
// undefined function function
// ja
// ?zoom=2
// true
```

`PARTS`は、部品のサブパスを、追加された順に並べたものです。ページが読み込まれる前に、サーバーで正しい言語と色を出すには、リクエストのアドレスとクッキーを`startingLanguage`と`readTheme`で読み、マークアップの`<html>`に`lang`と`data-theme`を書きます。

## 自分でタグを登録する

`define`ファイルは、タグを1回だけ、空いているときだけ登録します。先に`customElements.get`を呼ぶからです。`define`のインポートが実行する関数も、そこからエクスポートされています。`defineViewControls`、`defineThemeSwitch`、`defineLanguagePicker`、`defineSaveImage`、`defineSpeedButtons`、`defineEmbedPanel`です。呼ぶと、そのタグが空いている場合に登録されます。タグを自分で、または別の名前で登録したいページは、`element`のパスからクラスをインポートして登録します。

```html
<script type="module">
  import { ThemeSwitchElement } from "@johnmorrisdotca/kazoku-ui/theme-switch/element";

  class SiteTheme extends ThemeSwitchElement {}
  customElements.define("site-theme", SiteTheme);
</script>
<site-theme></site-theme>
```

## Content-Security-Policy

このパッケージは、厳格な`style-src`（`'unsafe-inline'`もスタイルのハッシュもなし）のページで動きます。各要素は、スタイルをシャドウルートの中に持ちます。スタイルは構築可能なスタイルシートとして1回だけ作られ、`adoptedStyleSheets`で適用されます。これはインラインのマークアップではないので、`style-src`が止めるものはありません。Chrome、Edge、Firefox、Safari 16.4以降が対応しています。

構築可能なスタイルシートがないブラウザー（古いSafari）では、要素が同じスタイルのテキストを、シャドウルートの中の`<style>`に書きます。これは、ページのnonceがなければ、厳格な`style-src`に止められます。そのため、要素は自分の`nonce`をその`<style>`にコピーします。サーバーが送るnonceを、要素に渡してください。

```html no-check
<meta http-equiv="content-security-policy" content="style-src 'self' 'nonce-r4nd0m'">
<kazoku-view-controls for="scene" nonce="r4nd0m"></kazoku-view-controls>
<div id="scene" tabindex="0">Your scene</div>
<script type="module">import "@johnmorrisdotca/kazoku-ui/view-controls/define";</script>
```

nonceをスクリプトで設定するページは、要素が接続される前に`element.nonce = "r4nd0m"`とします。

| ディレクティブ | 値 | 理由 |
|---|---|---|
| `script-src` | `'self'`（またはパッケージを配信する場所） | パッケージはふつうのモジュールで、`eval`もインラインスクリプトも使いません |
| `style-src` | `'self'`。構築可能なスタイルシートがないブラウザーに対応するときだけ`'nonce-...'` | 要素は、外部のスタイルシートも、自前のインラインスタイルも加えません |
| `img-src` | `data:`。SVGや要素をPNGで保存するときだけ | この画像は`data:`のURLの画像を通して描かれます。キャンバスには要りません |
| `connect-src`、`font-src` | なし | パッケージは、ネットワークから何も読み込みません |

どの部品も、マークアップで`style`属性を設定しません。コントローラーはビューの`touch-action`をCSSOM経由で設定し、これは厳格な`style-src`でも許されます。デモの`csp.html`は`style-src 'self'`で、`csp-nonce.html`はnonceで動きます。どちらにも`?fallback`を付けると、`<style>`による経路が見えます。リポジトリの[CSPのメモ](../../csp.md)（英語）とデモは、`pnpm test:demo`でChromiumとWebKitで動かします。
