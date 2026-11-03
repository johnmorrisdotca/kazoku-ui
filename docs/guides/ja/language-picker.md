---
title: 言語の選択
section: how-to
order: 6
description: 言語ごとに、その言語自身の名前のボタンを出し、ページにlangを書き込み、アドレスと記憶に残して、ページに知らせます。
---

[English](../language-picker.md)

`<kazoku-language-picker>`は、ページが挙げた言語ごとに、その言語自身の名前（`English`、`日本語`、`Français`）のボタンを出します。選択を、対象（名前を指定しなければページの`<html>`）の`lang`として書き込み、アドレスに残し、頼まれれば`localStorage`にも残して、イベントでページに知らせます。何も翻訳しません。イベントを読んで、自分の言葉を出すのはページです。

![デモのヘッダー。言語の選択とテーマの切り替え](../../images/switches-light.webp)

## 使い方

```html
<kazoku-language-picker languages="en ja" address storage></kazoku-language-picker>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/language-picker/define";

  document.addEventListener("kazoku-languagechange", ({ detail }) => console.log(detail.lang));
</script>
```

## 属性

| 属性 | |
|---|---|
| `languages` | 言語コード。空白かカンマで区切ります。例：`en ja fr`。有効なものだけが、重複なく、指定した順に並びます。既定は`en ja`。コードは小文字とダッシュで書きます（`pt-br`）。`ja_JP`や`EN`は`ja-jp`、`en`として読まれます。 |
| `value` | 開始時の言語。あとから設定すると、それが適用されます。 |
| `target` | `lang`を受け取る要素のCSSセレクター。既定はページの`<html>`。まず言語の選択自身のツリーの中を探します。`element.target = someElement`でも指定できます。 |
| `address` | 選択をアドレスに残します（`?lang=ja`）。`address-key`でパラメーター名を変えられます。 |
| `storage` | `localStorage`にも記憶します。`storage`だけならキーは`kazoku-lang`、`storage="my-key"`で名前を指定します。 |
| `theme` | `light`か`dark`：自分自身の見た目。なければページのもの。 |

**どの言語で始まるか**は、優先度の高い順に、アドレス、記憶、`value`、ユーザーの言語（`navigator.languages`。`ja-JP`を求めるブラウザーは`ja`になります）、対象の`lang`がいま示すもの、`languages`の最初のコード、です。タグは、それが示すコード、またはその主言語に一致します（`ja-JP`は`ja`）。ページが挙げなかったコードは、選ばれません。

`element.value`で読み書きでき、`element.languages`は一覧、`element.names = { fr: "Français (Canada)" }`は名前の置き換え、`element.words = { group: "Choose a language" }`はグループのラベルの置き換えです。各ボタンは自分の`lang`を持つので、スクリーンリーダーは`日本語`を日本語で読みます。

## イベント

`kazoku-languagechange`は要素から送られ、シャドウルートを越えてバブリングします。`event.detail`：

| フィールド | 意味 |
|---|---|
| `lang` | いま選ばれている言語。コードのひとつで、小文字。 |
| `previous` | ひとつ前の言語。`init`のときは`undefined`。 |
| `reason` | `init`（接続の少しあと）、`user`（ボタン）、`set`（`value`のプロパティか属性、または一覧がその言語を含まなくなった）、`external`（ほかの処理が対象の`lang`を書いた）。 |
| `target` | 選択を書き込む要素。 |

ほかの処理が対象に`lang`を書いたときも、新しい値がそのコードのひとつなら、言語の選択はそれに合わせて動きます。

## 要素なしで

```js
import { DEFAULT_LANGUAGES, LANGUAGE_ADDRESS_KEY, LANGUAGE_ATTRIBUTE, LANGUAGE_STORAGE_KEY, OWN_NAMES, languageName, matchLanguage, normaliseCode, parseLanguages, startingLanguage } from "@johnmorrisdotca/kazoku-ui/language-picker";

console.log(DEFAULT_LANGUAGES.join(" "), LANGUAGE_ADDRESS_KEY, LANGUAGE_ATTRIBUTE, LANGUAGE_STORAGE_KEY);
console.log(parseLanguages("en ja pt_BR").join(" "), normaliseCode("ja_JP"), normaliseCode("not a code"));
console.log(languageName("ja"), languageName("fr"), languageName("en", { en: "English (CA)" }));
console.log(matchLanguage("ja-JP", ["en", "ja"]), matchLanguage("fr", ["en", "ja"]));
console.log(startingLanguage({ list: ["en", "ja"], search: "?lang=ja" }));
console.log(startingLanguage({ list: ["en", "ja"], preferred: ["ja-JP"] }), Object.keys(OWN_NAMES).includes("ja"));
// en ja lang lang kazoku-lang
// en ja pt-br ja-jp undefined
// 日本語 Français English (CA)
// ja undefined
// ja
// ja true
```

- `startingLanguage({ list, search, storage, value, preferred, current })`は、上の順序を適用して、開始するコードを返します。
- `applyLanguage(target, lang)`は、対象に`lang`を書きます。
- `languageName(code, names?)`は、その言語自身の名前です。自分で渡した名前、ファミリーの表（`OWN_NAMES`）、その言語での`Intl.DisplayNames`、なければコードの順に使います。
- `parseLanguages`、`matchLanguage`、`normaliseCode`は、コードを読みます。どれもサーバーでインポートできます。タグとイベントの名前は`TAG`と`EVENT`、ラベルは`WORDS`と`wordsFor`です。

## 言語の選択に応える

言語の選択が伝えるのは、どの言語が選ばれたかだけです。そのあとは、ページが自分の言葉の表から出します。同じ表は、ほかの部品にも使えます。表示の操作や画像の保存のボタンには`lang`を渡すか、すぐ上の`lang`（言語の選択がいま書いたもの）をそのまま使わせます。
