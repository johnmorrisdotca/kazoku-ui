---
title: テーマの切り替え
section: how-to
order: 5
description: ライト、ダーク、自動を1列のボタンで選び、ページにdata-themeを書き込み、アドレスと記憶に残し、イベントをひとつ送ります。
---

[English](../theme-switch.md)

`<kazoku-theme-switch>`は、ライト、ダーク、自動を、48 pxのボタンの1列で選ばせます。選択を、対象（名前を指定しなければページの`<html>`）の`data-theme`として書き込み、アドレスに残し、頼まれれば`localStorage`にも残して、イベントでページに知らせます。ページ自体は描きません。`data-theme`を読むのは、ページのCSSです。

![デモのヘッダー。言語の選択とテーマの切り替え](../../images/switches-light.webp)

## 使い方

```html
<kazoku-theme-switch address storage></kazoku-theme-switch>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
</script>
```

色はファミリーの流儀で書きます。`data-theme`がなければ端末が決め、`light`と`dark`が強制します。**自動は属性を外す**ので、こう書いたページには、ほかに何も要りません。

```css
:root { color-scheme: light dark; --bg: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #121317; } }
:root[data-theme="dark"] { --bg: #121317; color-scheme: dark; }
```

## 属性

| 属性 | |
|---|---|
| `value` | `light`、`dark`、`auto`：選択。あとから設定すると、それが適用されます。 |
| `target` | `data-theme`を受け取る要素のCSSセレクター。既定はページの`<html>`。まずこの切り替え自身のツリーの中を探すので、ほかの要素のシャドウルートの中でも動きます。`element.target = someElement`でも指定できます。 |
| `modes` | ボタンの種類。`light dark`なら自動を省きます。既定は3つとも。 |
| `address` | 選択をアドレスに残します（`?theme=dark`）。自動はアドレスに残りません。`address-key`でパラメーター名を変えられます。 |
| `storage` | `localStorage`にも記憶します。`storage`だけならキーは`kazoku-theme`、`storage="my-key"`で名前を指定します。何も保存できないブラウザーでも切り替わります。 |
| `lang` | `en`か`ja`。なければ、いちばん近い上位の`lang`、それもなければ英語。 |
| `theme` | `light`か`dark`：自分自身の見た目。なければページのもの。 |

選択は、アドレス、記憶、`value`、対象がすでに持っている値、の順で読まれ、どれもなければ自動です。`element.value`で読み書きでき、`element.scheme`は、いま表示している色（`light`か`dark`。自動なら端末のもの）です。`element.words = { auto: "System" }`でラベルを置き換えられます。色はカスタムプロパティ`--kazoku-ink`、`--kazoku-surface`、`--kazoku-line`、`--kazoku-accent`で、パーツは`group`と`button`です。

## イベント

`kazoku-themechange`は要素から送られ、シャドウルートを越えてバブリングします。`event.detail`：

| フィールド | 意味 |
|---|---|
| `choice` | `light`、`dark`、`auto`。 |
| `scheme` | `light`か`dark`：いま表示している色。 |
| `reason` | `init`（接続の少しあと）、`user`（ボタン）、`set`（`value`のプロパティか属性）、`system`（自動のときに端末の設定が変わった）、`external`（ほかの処理が対象の`data-theme`を書いた。ページ独自のボタンや、別の切り替えなど）。 |
| `target` | 選択を書き込む要素。 |

ほかの処理が対象に`data-theme`を書いたときも、切り替えはそれに合わせて動くので、1ページに切り替えが2つあっても一致します。

## ファミリーのほかの部品

ページの色から自分を描く部品（キャンバスやSVGの背景など）は、このイベントを待ち受けて描き直します。表示の操作は端末には自分で従いますが、強制されたライトやダークにも従わせるには、次のように渡します。

```html
<kazoku-theme-switch id="switch"></kazoku-theme-switch>
<kazoku-view-controls id="controls" for="scene"></kazoku-view-controls>
<div id="scene" tabindex="0">Your scene</div>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/theme-switch/define";
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  document.getElementById("switch").addEventListener("kazoku-themechange", ({ detail }) => {
    const controls = document.getElementById("controls");
    if (detail.choice === "auto") controls.removeAttribute("theme");
    else controls.setAttribute("theme", detail.choice);
  });
</script>
```

## 要素なしで

要素がすることはすべて、サーバーでもインポートできる、ふつうの関数になっています。間違った色が一瞬見えるのを避けるには、記憶された選択を読んで、できるだけ早く、`<head>`内のスクリプトから適用します。

```js
import { THEMES, THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY, applyTheme, parseModes, parseTheme, readTheme, resolveTheme, themeOf } from "@johnmorrisdotca/kazoku-ui/theme-switch";

console.log(THEMES.join(" "), THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY);
console.log(readTheme({ search: "?theme=dark" }), readTheme({ search: "?x=1" }));
console.log(resolveTheme("auto", true), resolveTheme("light", true));
console.log(parseTheme("dark"), parseTheme("sepia"), parseModes("light dark"), parseModes("nonsense"));

const target = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute(name) { delete this.attributes[name]; }, getAttribute(name) { return this.attributes[name] ?? null; } };
applyTheme(target, "dark");
console.log(JSON.stringify(target.attributes), themeOf(target));
applyTheme(target, "auto");
console.log(JSON.stringify(target.attributes), themeOf(target));
// light dark auto theme data-theme kazoku-theme
// dark undefined
// dark light
// dark undefined [ 'light', 'dark' ] [ 'light', 'dark', 'auto' ]
// {"data-theme":"dark"} dark
// {} auto
```

`readTheme({ search, addressKey, storage, storageKey })`は、まずアドレス、次に記憶を読みます（例外を投げる記憶は、空と同じ扱いです）。`applyTheme(target, choice)`は`data-theme`を書くか外すかします。`resolveTheme(choice, prefersDark)`は`light`か`dark`を返します。`themeOf(target)`は、対象がいま持っている値を読みます。`parseModes(text)`と`parseTheme(text)`は属性を読みます。タグとイベントの名前は`TAG`と`EVENT`、ラベルは`WORDS`と`wordsFor`です。

## 厳格なポリシー

スタイルは構築可能なスタイルシートとして適用されるので、`style-src 'self'`のページでも許可は要りません。[フレームワークとCSP](frameworks-and-csp.md)を参照してください。
