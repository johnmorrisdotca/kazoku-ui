---
title: 印刷レイアウト
section: how-to
order: 21
description: どのパッケージでも使える印刷用のシートです。A4、USレター、A3、タブロイドの用紙、安全な余白、ヘッダー、情報ボックス、QRコードつきのフッター、切りとり線つきで複数のページに分けるポスター、子ども向けの大きな文字、PDFライブラリなしの「印刷 / PDFで保存」ボタンがあります。
---

[English](../print.md)

印刷パートは、印刷用のシートを作ります。用紙とぴったり同じ大きさのページ、家庭用プリンターでも安全な余白、ヘッダー（ブランド名、パッケージ名、タイトル、「なまえ:」の文字と下線）、情報ボックス、フッター（クレジット、バージョン、日付、QRコードと文字のアドレス、ページ番号）、そして切りとり線つきで複数のページに分けるポスターです。文字の大きさは2つ、`kid`（大きくて丸い）と`normal`から選びます。パッケージの絵は描きません。絵（SVGがおすすめです）は、ページ側でシートに入れます。

ブランド名は外から渡します。このパートは紙に自分の名前を印刷しないので、各パッケージが自分の名前を渡します。

## 使いかた

```js no-check
import { buildSheet, printCss, printSheet } from "@johnmorrisdotca/kazoku-ui/print";

const style = document.createElement("style");
style.textContent = printCss({ page: "a4", type: "kid", language: "en" });
document.head.append(style);

const sheet = buildSheet({
  page: "a4",
  type: "kid",
  language: "en",
  brand: "Space Program X",
  packageName: "My planets",
  title: "The planets",
  info: { region: "The Solar System", season: "All year", level: "Grades 1 to 6", language: "English" },
  credits: "Pictures and facts: public domain.",
  version: "1.2.0",
  date: new Date(),
  address: "https://example.com/planets/",
  pages: [pictureForPageOne],
});
document.querySelector("#preview").append(sheet);
document.querySelector("#print").addEventListener("click", () => printSheet(sheet));
```

`buildSheet`は、1つの`.kazoku-sheet`を返します。中には、ページごとに`.kazoku-page`が入っています。ページは用紙とぴったり同じ大きさの箱なので、画面のプレビューがそのまま紙のページになります。シートは、ふつうのDOMの呼び出しと`textContent`だけで作られます。渡した文字列がHTMLとして読まれることはありません。

## 用紙の大きさ

| 名前 | 大きさ（ミリ、縦長） |
|---|---|
| `a4` | 210 × 297 |
| `letter`（USレター） | 215.9 × 279.4 |
| `a3` | 297 × 420 |
| `tabloid`（タブロイド、11 × 17インチ） | 279.4 × 431.8 |

`PAGES`に大きさ、`PAGE_NAMES`に名前、`pageSize(page, orientation)`にページ全体、`printableSize(page, orientation, marginMm)`に余白の内側の大きさが入っています。`orientation`は`"portrait"`（縦、初期値）か`"landscape"`（横）です。

## 余白

家庭用プリンターは、紙のふちまでは印刷できません。多くは3〜6ミリ手前で止まります。余白は`DEFAULT_MARGIN_MM`の12.7ミリ（半インチ）で、四方すべてに取ります。シートに必要なものは、これよりふちに近い場所に置きません。これより小さい`marginMm`は、`MIN_MARGIN_MM`の8ミリまで引き上げられます。ページの規則は`@page { size: ...; margin: 0 }`で、余白はページの箱のパディングです。ですからChrome、Safari、Firefoxで同じになります。

`layoutOf(options)`は、受け取ったものを完全なレイアウトにします（出発点は`DEFAULT_LAYOUT`です）。知らない用紙はA4、知らない向きは縦、知らない文字の種類は`kid`になります。

## ヘッダー、情報ボックス、フッター

| オプション | 場所 | 内容 |
|---|---|---|
| `brand` | ヘッダー | 最初の行です。家族の名前など。外から渡し、中には入っていません。 |
| `packageName` | ヘッダー | ブランドの下の、パッケージの名前です。 |
| `title` | ヘッダー | シートのタイトルです（`h1`）。 |
| `nameBox` | ヘッダー | 子どもが名前を書く「なまえ:」の文字と下線です（初期値はオン、`false`で外せます）。箱ではなく、下線です。今までのコードが動かなくならないよう、オプション名は`nameBox`のままです。 |
| `info` | 1ページ目のヘッダーの下 | `region`（地域）、`flagSrc`と`flagAlt`（旗の絵）、`latitudeBand`（緯度の帯）、`season`（季節）、`level`（レベル）、`language`（言語）、自分で足す欄の`more`です。値のない欄は出ません。 |
| `credits`、`version`、`date` | フッター | クレジットの行、バージョン、日付です。`Date`は`isoDate`で`YYYY-MM-DD`になります。文字列はそのまま書きます。 |
| `address` | フッター | アドレスを、QRコードと文字の両方で出します。 |
| `pages` | 本文 | ページごとに1つのノードです。 |
| `poster` | 本文 | `pages`のかわりに、分けて印刷するポスターです。 |
| `tileFooter` | 分けたページ | `"none"`（初期値）、`"ends"`、`"all"`。ポスターを分けた各ページの下の余白に、文字のアドレスと小さなQRコードを入れます。下を見てください。 |
| `pageNumber` | フッター、分けたページ | `"always"`（初期値）、`"many"`、`"never"`。ページ番号を印刷するかどうかです。 |
| `words` | | どのラベルも、自分の言葉に変えられます。 |

どのページのフッターにもページ番号があります。英語は「Page 2 of 3」、日本語は「2 / 3 ページ」で、`pageOf`が作ります。しょうじょうのような1ページのシートには「1 / 1 ページ」はいりません。`pageNumber: "many"`にすると、ページが2つ以上のときだけ番号を印刷します。`pageNumber: "never"`にすると、いつも印刷しません。ポスターを分けたページにも使えます。

## 子ども向けの文字

`TYPE_PRESETS`に2つのプリセットがあります。どちらもシートのCSSカスタムプロパティ（`--kz-name`、`--kz-body`、`--kz-line`）なので、自分の絵からも使えます。

| | `kid` | `normal` |
|---|---|---|
| タイトル | 40 pt | 24 pt |
| 名前（`.kazoku-name`） | 28 pt（24 pt未満にはしません） | 14 pt |
| 本文 | 18 pt | 11 pt |
| 小さな文字（クレジット、アドレス） | 10 pt | 8 pt |
| シートの線（ヘッダーの線、情報ボックス、名前の下線） | 1.2ミリ | 0.4ミリ |
| 書体 | 丸い系統のシステムフォント、日本語はヒラギノ丸ゴ | システムフォント |

`kid`の線は1.2ミリです。子どもにはっきり見え、しかもページが太い黒い線でいっぱいにならない太さです（0.24.0までは3ミリでした）。自分の線も、これに近い太さにしてください。

名前を`kazoku-name`というクラスの要素に入れると、プリセットどおりの大きさになります。自分の線も、同じように`var(--kz-line)`の太さで描いてください。

## ポスターを複数のページに分ける

```js
import { tilePoster } from "@johnmorrisdotca/kazoku-ui/print";

const plan = tilePoster({ widthMm: 400, heightMm: 300, page: "a4", overlapMm: 10 });
console.log(plan.pages, plan.columns, plan.rows);
// 6 3 2
```

```js no-check
const sheet = buildSheet({ page: "a4", title: "Big planet poster", poster: { content: posterSvg, widthMm: 400, heightMm: 300 } });
```

`tilePoster`は、ポスターに何ページ必要か、各ページがどの部分を印刷するかを答えます。各ページの窓は、印刷できる範囲です。ページは、窓から`overlapMm`（初期値10ミリ）を引いた分ずつ進みます。ですから、どのページも前のページの絵を、ちょうどその分だけくり返します。このくり返しの帯がのりしろです。うすく色をつけ、点線で囲み、「のりしろ」と書いてあります。最後の列と行は、ポスターのふちで終わります。窓1つに入るポスターは1ページです。大きさのないポスターや、窓と同じ大きさのくり返しは、`RangeError`になります。

どのページにも切りとり線があります。窓の四すみに、ふちに沿った線が1本ずつ、余白の外向きに出ます。`cutMarks(page, orientation, marginMm)`が作ります。切りかたと貼りかたの説明の1行もあります。ポスターの`content`はページごとにコピーされるので、SVGかHTMLを使ってください。canvasはコピーすると絵が消えます。先にSVGの`<image>`に描いてください。

分けたページには、フッターがなく、余白だけがあります。そこで、アドレスとQRコードはオプションにしました。`tileFooter: "all"`にすると、すべてのページの下の余白に入ります（`address`が必要です）。`tileFooter: "ends"`にすると、最初と最後のページだけに入ります。QRコードの高さは、余白から2ミリを引いた大きさです（初期の余白なら10.7ミリ）。まわりの白い部分は1マスです。小さいので、手の長さくらいの近さなら読めますが、遠くからは読めません。場所をあけるため、このページの切りかたの説明は小さい文字になります。窓の大きさは変わらないので、分けかたも変わりません。

## 絵を1ページに合わせる

```js
import { fitToPage } from "@johnmorrisdotca/kazoku-ui/print";

const fit = fitToPage({ page: "a3", widthMm: 1200, heightMm: 800 });
console.log(fit.orientation, fit.widthMm, fit.heightMm);
// landscape 394.6 263.067
```

`fitToPage({ page, widthMm, heightMm, orientation, marginMm })`は、絵の形を変えずに、用紙の印刷できる範囲に合わせて拡大や縮小をします。答えは、`orientation`（向き）、拡大・縮小したあとの`widthMm`と`heightMm`、`scale`（ページより小さい絵なら1より大きくなります）、そして`offsetXMm`と`offsetYMm`（印刷できる範囲の真ん中に置くためのずれ）です。`orientation`の初期値は`"auto"`で、絵が大きくなるほうの向きを選びます（正方形や同じ大きさのときは縦です）。`"portrait"`か`"landscape"`を渡すと、その向きのままです。この答えを`buildSheet`に渡すと、ポスターが1ページになります。`buildSheet({ page: "a3", orientation: fit.orientation, poster: { content, widthMm: fit.widthMm, heightMm: fit.heightMm } })`。大きさのない絵や、範囲がなくなる余白は、`RangeError`になります。

## QRコード

`qrMatrix(text)`は、このパッケージのために書いたQRコードの符号化で、依存はありません。バイトモード（UTF-8）、誤り訂正レベルM、バージョン1〜20で、`MAX_BYTES`（666）バイトまでです。マスクは、規格の4つの減点規則で選びます。結果は、真偽値の行で、`true`が黒です。`qrSvg(text, { quiet, dark, light })`は、モジュール単位のSVGの文字列を返します。まわりの余白は4です。長すぎる文字は`RangeError`になります。そのとき`buildSheet`は、アドレスを文字だけで印刷します。

符号化は、既知の答えで確かめています。規格の「HELLO WORLD」の例のリード・ソロモン符号語、21 × 21の完全なコード、参照用の符号化がバージョン2から20まで（8つのマスクすべても）描いたコードのハッシュ、そして規格から書いた、テスト内の復号器です。復号器は、形式情報を読み、マスクをはずし、すべてのブロックの誤り訂正を調べて、文字を返します。

## 印刷 / PDFで保存

```js no-check
import { openPrintView, printSheet } from "@johnmorrisdotca/kazoku-ui/print";

printSheet(sheet);                      // the print-only copy, then window.print()
const view = openPrintView(sheet);      // the copy alone, to drive the print yourself
view.close();
```

`printSheet`は、シートの印刷専用のコピーを作ります。`<body>`の子で、クラスは`ROOT_CLASS`（`kazoku-print-root`）です。画面では隠し、`<html>`に`ROOT_ATTRIBUTE`（`data-kazoku-print`）をつけて、紙の上では、ほかのものをすべて隠します。そして`window.print()`を呼び、`afterprint`が来たらコピーを消します。ブラウザーの印刷ダイアログは「PDFとして保存」もできるので、PDFライブラリはいりません。`openPrintView`は、印刷せずにコピーとページの規則だけを作ります。`close()`で消えます。`layoutFromSheet`は、シートがもっているdata属性からレイアウトを読み戻します（`LAYOUT_ATTRIBUTES`がその名前です）。`printCss(layout)`は、CSSのすべてです。ページの規則、印刷専用の規則、シートの見た目が入っています。

## 言葉

`WORDS`に、英語と日本語のラベルが入っています。どのキーも両方にあります。「なまえ」のラベル、情報ボックスのラベル、バージョン、日付、アドレス、ページ番号、のりしろ、切りかたの説明、ボタンの文字です（`wordsFor("ja").button`は「いんさつ / PDFで ほぞん」）。日本語はやさしい言葉で、ほとんどひらがなです。子どものためです。`languageOf("ja-JP")`は`"ja"`で、ほかは`"en"`です。このパートはサーバーでも読み込めます。`buildSheet`、`openPrintView`、`printSheet`を呼ぶまで、DOMには触りません。

## テスト

計算は単体テストで確かめています（大きさ、余白、分けかた、切りとり線、QRコード）。デモの`print.html`は、ChromiumとWebKitで確かめています。Chromiumでは、A4、USレター、A3、タブロイドで`page.pdf()`でPDFにして、用紙の大きさとページ数を読みます（シートは1ページ、ポスターは分けた数です）。
