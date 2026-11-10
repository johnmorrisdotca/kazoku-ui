---
title: ページの見出しとクレジット
section: how-to
order: 23
description: どのデモページにも、メニューを開かなくても見える、見出しの行とクレジットの行があります。ページの内容、ホームへのリンク、印刷用シート、出典が分かります。同じ言葉から、検索結果や共有リンクに出るタイトルと説明も書き出します。
---

[English](../page-frame.md)

デモの最初のページから入ってくるとは限りません。検索や共有されたリンク、READMEから、どのページにもたどり着きます。そこで、ファミリーのどのデモのどのページも、パソコンでもスマホでも、メニューを開かずに次の5つを見せます。

1. このページが何かを示す1行：パッケージの名前と、このページが見せるもの
2. ホームへのリンク
3. 印刷用シートへのリンク（パッケージにシートがあるとき）
4. 出典：このページのデータの出典、または出典へのリンク1つ
5. `<title>`と説明：検索結果や共有されたリンクで、きちんと読めるように

この部品は、その5つを一度だけ作っておき、どのデモでも使えるようにしたものです。`<kazoku-page-header>`が1から3を、`<kazoku-page-credits>`が4を、`pageHeadHtml`、`applyPageMeta`、`watchPageMeta`が5を受け持ちます。

## 使い方

見出しは、ページ上部のバーの中に、もう一行として入れます（見出しには背景も、専用のバーもありません）。クレジットの行は、ページの最後に、ファミリーのフッターの上に置きます。

```html
<header class="top">
  <h1>Hoshi Stars</h1>
  <kazoku-language-picker address></kazoku-language-picker>
  <kazoku-page-header name="Hoshi Stars" what="The 88 constellations" what-ja="88の星座"
    description="A picture of each of the 88 constellations, with its neighbours."
    description-ja="88の星座それぞれの絵を、となりの星座といっしょに見られます。" sheets="kids.html" meta></kazoku-page-header>
</header>

<kazoku-page-credits credits="Stars: Yale Bright Star Catalogue, public domain. Constellation lines: our own drawing."
  credits-ja="星：イェール輝星星表（パブリックドメイン）。星座線：自作の図です。" href="NOTICE.html"></kazoku-page-credits>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/page-frame/define";
</script>
```

どちらの要素も、ページの`lang`（言語ピッカーが`<html>`に書きます）を読み、変わると表示する言葉を切り替えます。名前の終わりに`-ja`が付く属性（`what-ja`）が日本語用です。日本語用の属性がないときは、英語が使われます。

## 見出しの行

| 属性 | 内容 |
|---|---|
| `name` | パッケージの名前：「Hoshi Stars」 |
| `what` | このページが見せるもの。パッケージを知らない人にも分かる言葉で、短く。ページのタイトルの後半にもなります。 |
| `description` | ページの説明。1〜2文。`meta`があるとき、これが使われます。 |
| `home` | デモのホームページ。指定がなければ`index.html`です。ホームページでは、ホームが現在のページとして示されます（`aria-current="page"`）。 |
| `sheets` | 印刷用シート。指定がなければ、シートへのリンクは出ません。 |
| `meta` | 読み手の言語に合わせて、ドキュメントの`<title>`と説明も、この言葉から設定します。言語が変わるたびに行います。 |

行は「Hoshi Stars: The 88 constellations」のように読めます（日本語では全角のコロンです）。リンクは高さ48pxの一列で、スマホでは、見出しの文が幅いっぱいに表示され、リンクはその下の行に移ります。`element.texts = { en: { name, what, description }, ja: { … } }`で、同じ言葉を一つの表として渡せます。`element.words = { sheets: "Sheets to print" }`で、ホームとシートのリンクの言葉を変えられます。

## クレジットの行

`credits`はこのページ自身の行、`href`はNOTICEまたは出典のページへのリンクです。両方を渡すこともでき、その場合は行のあとに「データと出典」というリンクが続きます。行だけのときは、先頭に「データと出典：」が付きます。折りたたまれることなく常に見え、大きさは15px、色はページの文字色です（薄い灰色にはなりません）。

`embed`は、他のサイトの中に埋め込まれるページ向けの形です。出典だけを13pxで出し、リンクは行の中に下線つきで置きます。埋め込みページには、クレジットの行があり、見出しはありません。

| 属性 | 内容 |
|---|---|
| `credits`、`credits-ja` | このページのクレジットの行 |
| `href` | 出典の全文へのリンク |
| `embed` | 小さい形 |

## 検索結果に出るタイトルと説明

タイトル、説明、見出しの行は、同じ言葉から作られるので、食い違いません。ビルドがそれをHTMLに書き込むので、できあがったファイルには、スクリプトが動く前から入っています。

```js
import { pageHeadHtml, pageHeaderHtml, pageCreditsHtml } from "@johnmorrisdotca/kazoku-ui/page-frame";

const TEXTS = {
  en: { name: "Hoshi Stars", what: "The 88 constellations", description: "A picture of each of the 88 constellations." },
  ja: { name: "星 Hoshi Stars", what: "88の星座", description: "88の星座を、それぞれ絵で見られます。" },
};
const head = pageHeadHtml(TEXTS); // <title>Hoshi Stars: The 88 constellations</title><meta name="description" …>
const header = pageHeaderHtml(TEXTS, { sheets: "kids.html", meta: true });
const credits = pageCreditsHtml({ en: "Stars: Yale Bright Star Catalogue." }, { href: "NOTICE.html" });
```

`pageHeaderHtml`と`pageCreditsHtml`は、属性つきのタグと、その中の同じ言葉を書き出します。中の言葉は、スクリプトが読み込まれるまで、またスクリプトがなくても見えます。`pageTitle(text, language)`はタイトルだけを返します。ブラウザでは、`applyPageMeta(document, TEXTS, "ja")`がタイトルと説明を一度設定し、`watchPageMeta(document, TEXTS)`は`<html lang>`に合わせて更新し続けます（止めるための関数を返します）。`pickText(TEXTS, "ja")`は、その言語の言葉を返します（なければ英語）。`escapeHtml`は、文字列をHTML用にエスケープします。

## できあがったページを確かめる

`pageProblems(html, { embed })`は、1ページのHTMLを読み、問題を文の一覧で返します。たとえば、HTMLに`<title>`がない、1文の説明がない、見出しがない、見出しに`what`がない、クレジットの行がない、`credits`も`href`もない、埋め込みページなのにクレジットが`embed`の形でない、などです。パッケージ自身のテストが、ビルドが書いた全ページ（`site/*.html`）にこれを実行します。テスト用のページは除きます。

```js
import { readFileSync, readdirSync } from "node:fs";
import { pageProblems } from "@johnmorrisdotca/kazoku-ui/page-frame";

for (const name of readdirSync("site").filter((file) => file.endsWith(".html"))) {
  const problems = pageProblems(readFileSync(`site/${name}`, "utf8"), { embed: /^embed/.test(name) });
  if (problems.length > 0) throw new Error(`${name}: ${problems.join("; ")}`);
}
```

`templates/check-standard.mjs`も、ソースの段階で同じ決まりを確かめます。その`page-frame`の項目は、埋め込みページとテスト用ページを除く`demo/*.html`のすべてが、見出しとクレジットの行を使い（タグそのもの、またはビルドが`pageHeaderHtml`と`pageCreditsHtml`に置き換える目印`<!--frame:header-->`と`<!--frame:credits-->`）、タイトル（または`<!--frame:head-->`）を持つことを求めます。パッケージが取り入れる方法は、[パッケージの基準](../../package-standard.md)にあります。

## タグの登録

`page-frame/define`を読み込むと、両方のタグが登録されます。すでに登録されているタグには手を付けません。渡したレジストリに登録したいときは`definePageFrame(registry)`を使います。`PageHeaderElement`と`PageCreditsElement`（`page-frame/element`から）はクラスで、拡張したり、自分のタグで登録したりできます。`TAG`は`kazoku-page-header`、`CREDITS_TAG`は`kazoku-page-credits`です。`samePage(href, base)`は、「このリンクは今いるページ自身か」を決める規則です。

厳しいContent-Security-Policyのもとでは、スタイルは構築可能なスタイルシートとして取り込まれるので、`style-src 'self'`だけで足ります。取り込めないブラウザは、要素の`nonce`を付けた`<style>`を使います。見た目はファミリーの変数（`--kazoku-ink`、`--kazoku-surface`、`--kazoku-line`、`--kazoku-accent`）に従い、埋め込みの形の色のために`--kazoku-muted`が一つ加わります。

## しないこと

ページの大見出し（ページには自分の`<h1>`があります）は描きません。シートや出典がどこにあるかは決めません。そして、クレジットの行を折りたたみの中に隠すことはありません。[デモ](https://johnmorrisdotca.github.io/kazoku-ui/page-frame.html)で、クレジットの行の3つの形を見られます。
