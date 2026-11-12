---
title: 設定メニュー
section: how-to
order: 28
description: ページ自身の操作のパネルを開くボタンが1つです。スマホでは、パネルは下から出るシートです。
---

[English](../menu.md)

`<kazoku-menu>`は、48pxのボタン1つです。ページは、言語の選択、テーマの切り替え、ヘルプの切り替え、またはリンクといった自分の操作を、その中に置きます。ボタンを押すと、パネルの中に出ます。それらの操作は、自分のアドレスと自分のストアをそのまま使います。`MenuElement`がクラスで、`defineMenu`がタグを登録します。Escape、閉じるボタン、または外を押すと、パネルが閉じて、フォーカスがボタンに戻ります。スマホでは、パネルは下から出るシートです。

## 使い方

```html
<kazoku-menu>
  <p>Language, theme and help</p>
</kazoku-menu>
<kazoku-menu which="resources">
  <a href="https://github.com/johnmorrisdotca/kazoku-ui">GitHub</a>
</kazoku-menu>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/menu/define";
</script>
```

`which="resources"`は、2つ目のメニューの名前です。`which`がなければ、ボタンは「設定」と言います。パネルが開くか閉じると`kazoku-menutoggle`が発火し、`detail`は`{ open, which }`です。

```ts
import { parseWhich } from "@johnmorrisdotca/kazoku-ui/menu";

parseWhich("resources");
```

## 属性

| 属性 | |
|---|---|
| `which` | `settings`（既定）または`resources`。 |
| `lang` | `en`または`ja`。なければページの言語、それもなければ英語。 |
| `open` | パネルは開いた状態で始まります。属性を外すと閉じます。 |
