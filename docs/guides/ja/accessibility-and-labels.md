---
title: アクセシビリティとラベル
section: explanation
order: 11
description: すべての部品が守る、キーボード、タッチ、スクリーンリーダー、動きの軽減、色の決まりと、置き換えられる英語と日本語のラベルを説明します。
---

[English](../accessibility-and-labels.md)

決まりは、リポジトリのコントリビューションのガイドに一度だけ書かれ、テストかデモの検査がそれぞれを守らせます。どの部品もそれに従うので、部品を使うページはそれを受け継ぎます。

## どの部品もすること

- **操作はビューの上か、すぐそばに。** スクロールしなくても見え、操作を変えても回転を止めたり、リセットしたりしません。
- **48 pxのタッチターゲット**で、ブラウザー標準のコントロールはありません。スマートフォンではバーが小さくなり、言葉はスクリーンリーダーに任され、アイコンが残ります。
- **キーボード。** テーマの切り替えと言語の選択はラジオグループで、タブ停止は1つ、矢印キーで選択が動きます。ビューは、フォーカスがあるとき（`tabindex`を付けてください）、矢印キーで回転と傾き、Shiftと左右の矢印でロール、`+`と`-`でズーム、`0`かHomeで正面と全体表示です。ズームスライダーには自分のキーがあり、Page UpとPage Downで目盛りから目盛りへ移ります。
- **動きの軽減。** 動きの軽減を求めるユーザーには、自動回転も、中央に戻す動きのアニメーションもありません。
- **スクリーンリーダー。** ズームは、値が落ち着いたあとに、ほかの読み上げをさえぎらない形（`polite`）で一度だけ読み上げられます（「Zoom level 2.4×」）。読み込み時や、ピンチの各段階では読まれません。各言語のボタンは自分の`lang`を持つので、スクリーンリーダーは`日本語`を日本語で読みます。保存のボタンには、状態の行（Saved、Could not save）があります。
- **ライトとダーク。** どの部品も、ページの`data-theme`（強制）か端末の設定に従うので、明るい端末で強制ダークのページなら、ダークになります。1つの要素に`theme="light"`か`theme="dark"`を付けると、その要素だけの見た目になります。
- **マークなし。** ブランド、リーグ、連盟、スポンサーのマークは、パッケージに入っていません。

## 英語と日本語のラベル

`lang="ja"`（要素か親要素）で日本語になり、それ以外は英語です。すべてのキーが両方の言語にあり、単体テストがそれを守らせます。部品ごとに表`WORDS`があり、`wordsFor(language, over?)`は、自分の言葉を重ねた表を返します。

```js
import { WORDS as viewWords, languageOf, wordsFor } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { WORDS as themeWords, wordsFor as themeWordsFor } from "@johnmorrisdotca/kazoku-ui/theme-switch";
import { WORDS as languageWords, wordsFor as languageWordsFor } from "@johnmorrisdotca/kazoku-ui/language-picker";
import { WORDS as saveWords, wordsFor as saveWordsFor } from "@johnmorrisdotca/kazoku-ui/save-image";

console.log(languageOf("ja-JP"), languageOf("en-CA"), languageOf("fr"));
console.log(Object.keys(viewWords.en).length === Object.keys(viewWords.ja).length);
console.log(wordsFor("en").front, wordsFor("en", { front: "Home" }).front, wordsFor("ja").front);
console.log(themeWordsFor("en").auto, themeWordsFor("en", { auto: "System" }).auto);
console.log(languageWordsFor("en").group.length > 0, saveWordsFor("en").png);
console.log(Object.keys(themeWords.en).join(" "), "|", Object.keys(languageWords.en).join(" "), "|", Object.keys(saveWords.en).join(" "));
// ja en en
// true
// Front Home 正面
// Auto System
// true Save PNG
// group light dark auto | group | group png svg saved failed
```

1つの要素のラベルを置き換えるには、`element.words = { front: "Home" }`と代入します。表示の操作には23のキーがあり、`group`、`angle`、`tilt`、`autoTurn`、`front`、`zoom`、`zoomOut`、`zoomIn`、`fit`、`centre`、`pan`、`zoomLevel`、`zoomReset`、`more`、`speed`、`slow`、`medium`、`fast`などです。テーマの切り替えには`group`、`light`、`dark`、`auto`があります。言語の選択のラベルはグループの1つだけです。言語そのものは翻訳せず、それぞれの言語自身で書くからです。保存のボタンには`group`、`png`、`svg`、`saved`、`failed`があります。日本語の読みと意味を添えた全表は、リポジトリの[ラベルのページ](../../labels.md)にあります。両方の言語を並べて見せる、唯一のページです。

## 日本語はインターフェース用に書いたもの

日本語のラベルは、インターフェースのために書かれたもので、まだネイティブの話者には読まれていません。日本語のユーザー向けに公開するときは、文脈の中で言葉を読み、必要なものを`words`で置き換えてください。置き換えても、ほかのラベルには影響しません。

## ドラッグの決まり

回せるどのビューでも、ポインターの下の面はポインターに付いてきて、矢印キーもそれに一致し、自動回転はオブジェクトの実際の向きに回ります。`grab-radius`は、地球儀で、ドラッグ中に触れた点をポインターの下に保ちます。決まり、オプション、共有のブラウザー検査は、リポジトリの[ドラッグの決まり](../../drag-rule.md)にあります（英語）。

## 関連

全属性は[表示の操作](view-controls.md)、厳格なポリシーは[フレームワークとCSP](frameworks-and-csp.md)を参照してください。
