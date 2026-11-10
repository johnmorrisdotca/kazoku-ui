---
title: インターフェース部品
section: how-to
order: 24
description: ファミリー共通のインターフェース部品（トークン、アイコンボタン、操作バー、スケール切り替え、天体カード、レイヤーパネル、切り替えスイッチ、ボタン、トップバー、フッター、読むためのページ）と、その組み合わせ方、使うフォントについて説明します。
---

[English](../interface.md)

4つのパッケージが、星空、太陽系、地球、ロケットを描きます。パッケージの間を行き来する人には、毎回同じ操作に出会えるようにしたいのです。操作バー、レイヤーパネル、天体カードがそれぞれ1つずつ、いつも同じ場所にあり、日本語と英語で同じ言葉を使います。ここにあるのは、そのために1度だけ作った部品です。パッケージが自分用のコピーを持つことはありません。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/interface/define";
  import "@johnmorrisdotca/kazoku-ui/page-frame/define";
</script>
<kazoku-top-bar brand="Hoshi Stars" home="index.html"></kazoku-top-bar>
<kazoku-scale-switch value="solar"></kazoku-scale-switch>
<kazoku-object-card id="card"></kazoku-object-card>
<kazoku-control-bar id="bar"></kazoku-control-bar>
<kazoku-page-footer href="credits.html"></kazoku-page-footer>
```

```js
import { createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock"; // 共有シーンと一緒に公開されます。それまでは、時計の4つのメソッドを持つオブジェクトなら使えます
bar.clock = createFamilyClock();
card.data = { kind: { en: "Planet · gas giant", ja: "惑星・ガス惑星" }, name: { en: "Jupiter", ja: "木星" }, stats: [/* 数値には、それぞれ出典をつけます */] };
```

ビュー、時計、データを持つのはページです。部品は、読み手がしたことを`kazoku-*`イベントで知らせ、ページがそれを反映します。部品がページのシーンを描くことはありません。デモの[interface.html](https://johnmorrisdotca.github.io/kazoku-ui/interface.html)はすべての部品をビューの上に並べ、[interface-parts.html](https://johnmorrisdotca.github.io/kazoku-ui/interface-parts.html)は部品を1つずつ見せ、[interface-page.html](https://johnmorrisdotca.github.io/kazoku-ui/interface-page.html)は読むためのページです。

## エントリ

| エントリ | 内容 |
|---|---|
| `@johnmorrisdotca/kazoku-ui/interface` | トークン、言葉、アイコン、そして純粋な規則すべて（DOMなし。サーバーやビルドでも読み込めます）。 |
| `@johnmorrisdotca/kazoku-ui/interface/element` | 要素のクラスとタグ名（ブラウザが必要です）。 |
| `@johnmorrisdotca/kazoku-ui/interface/define` | 9つのタグを、空いているものだけ登録し、トークンをページに適用します。 |
| `@johnmorrisdotca/kazoku-ui/page-frame/define` | 部品9の`<kazoku-page-footer>`も登録します。ページフレームを拡張したものです。 |

## トークン

基本はダークで、端末の設定にかかわらず、部品はダークです。読書や印刷向けのライトテーマは、まだありません。ファミリーの`data-theme`の仕組みは、これらの部品には届きません。どの部品も、色を`var(--kui-名前, デザインの値)`として読むので、何もインストールしなくてもデザインどおりに表示され、ページが1つ設定すればその色に変わります。

| トークン | 値 | 用途 |
|---|---|---|
| `--kui-space` | `#070A10` | 3Dや星空のビューの背景 |
| `--kui-page` | `#0B0E14` | 読むページの背景 |
| `--kui-panel` | `#121722` | バー、カード、パネル、入力欄 |
| `--kui-line` | `#232B3A` | 1pxの罫線と、有効な操作の塗り |
| `--kui-line-strong` | `#3A4860` | 枠線ボタンの縁 |
| `--kui-text` | `#E8ECF2` | 本文とアイコン |
| `--kui-text-soft` | `#C9D2E0` | 読み物の段落 |
| `--kui-text-quiet` | `#9AA6B8` | ラベルと無効な項目 |
| `--kui-sun` | `#F2B84B` | 操作を示す唯一の色（この上の文字は`--kui-on-sun`、`#141413`） |
| `--kui-sky` | `#8EC2FF` | リンク（ホバー時は`--kui-sky-hover`、`#B9D9FF`） |

トークンは`COLOURS`、`FONTS`、`RADII`、`SIZES`、`TOKEN_PROPERTIES`にデータとして入っており、`tokensCss()`が1つの規則として書き出し、`installTokens(document)`がその規則をページに1度だけ適用します（`adoptedStyleSheets`で適用するので、インラインスタイルはなく、厳格なContent-Security-Policyでも通ります）。`interface/define`を読み込むと、これは自動で行われます。自分のスタイルには、`kui("panel")`が`var(--kui-panel, #121722)`を書きます。文字とアイコンの色は、どの背景の上でも4.5:1を保ちます。組み合わせは`READABLE_PAIRS`に並び、`contrastRatio`（`luminance`から計算します）が1組を測り、`unreadablePairs()`が基準を満たさない組を返します（現在は0組）。枠線ボタンの縁（`--kui-panel`の上の`--kui-line-strong`）は1.9:1ですが、読み手が見つけるのは縁ではなくラベルで、ラベルは基準を満たします。

文字は、言葉にIBM Plex Sans、日本語にはそれに続けてIBM Plex Sans JP、数字、日付、時刻、単位にはIBM Plex Monoです。角丸は、操作が8px、パネルとカードが12px、スマホのシートの上の角が16pxです。

## フォント

IBM PlexはSIL Open Font License 1.1で提供されており、フォントのファイルとともにライセンス文を添えれば、ソフトウェアとともに使い、複製し、配信できます。パッケージにフォントは含まれず、Googleなど他のサイトから読み込むこともありません。ページが自分のアドレスから配信します。ファミリーが画像を配信するのと同じやり方です。`@fontsource/ibm-plex-sans`、`@fontsource/ibm-plex-sans-jp`、`@fontsource/ibm-plex-mono`から必要なファイルをコピーし（どれにもOFLの文面が入っているので、横に置いてください）、そのスタイルシートを読み込みます。このリポジトリの`scripts/fonts.mjs`が、デモのために、Plex SansとSans JPの400と600、Monoの400と500を`fonts/`にまとめます。フォントを読み込まないページでは、`FONTS`に書かれたシステムフォントが使われ、部品は問題なく動きます。

## 部品

どの部品もカスタム要素で、プレーンな`data`やプロパティを持ち、本物のコントロール（`<button>`、`<a href>`、`<label>`つきの`<input>`）を使い、スクリーンリーダー向けの名前を英語と日本語で持ち、タッチ対象は44pxです。`placement`は、`fixed`（画面に固定。既定）、`absolute`（最も近い位置指定の祖先に対して）、`static`（通常のフロー）のどれかです。

1. **アイコンボタン`<kazoku-icon-button>`**（`IconButtonElement`）。44×44px、アイコンは18px（スマホでは20px）、線の太さ1.75で端は丸め、ふだんは透明で、ホバー時とオン時に`--kui-line`で塗られます。`icon`には組み込みアイコンの名前（`ICON_NAMES`。`ICONS`にあり、`iconSvg`で書き出せます。`isIconName`が名前を確かめ、`ICON_STROKE`は1.75です）を指定するか、タグの中に自分の`<svg>`を入れます。いつも`aria-label`を持ち、`label`で指定した名前、なければページの言語でのアイコンの名前になります。`pressed`と`expanded`はスクリーンリーダーにも伝わり、`on`は見た目だけを変えます。
2. **操作バー`<kazoku-control-bar>`**（`ControlBarElement`）。浮かぶパネルが1つで、順番は固定です。「ゆっくり」、「再生/一時停止」、「速く」、時計、「現在に戻す」、区切り線、「現在地」、「レイヤー」、「見た目」、「自由飛行」の順です（`CONTROL_ORDER`。前の5つが`TIME_CONTROLS`、後ろの4つが`VIEW_CONTROLS`）。`controls="play clock layers"`で、そのビューにできないものを省けます。残りの順番は`parseControls`が保ちます。スマホでは、画面の下に幅いっぱいで固定され、高さは116px、時計は1行、その下にボタンが1列に並びます。時計には、端末のタイムゾーンでの時刻（いつも端末の現地時間で、ゾーン名を添えます：「10 Nov 2026 · 21:14 MST」、`zoneName`。`timezone="utc"`ならUTCで表示し、アドレスはUTCのままです）と、その下にやさしい言葉での速さが出て（`formatMoment`、`speedWords`：「1 hour each second」、「1秒で1時間」）、押すと日付と時刻の選択が開くボタンです（`toInputValue`、`fromInputValue`）。操作するのはファミリーの時計で、`clock`プロパティに渡します。型は`BarClock`（時刻、速さ、`running`、`set`、`setSpeed`、`play`、`pause`、`onChange`。`FamilyClock`はすでにこれを満たしています）です。「ゆっくり」と「速く」は、`stepSpeed`と`canStep`で`SPEED_LADDER`をたどります。開くときは、時計が開く状態に従い、「今から動いている」状態、または動きを減らす設定の読み手には「止まっていて再生が押せる」状態です。バー自身は何も始めません。「見た目」ボタンは`LOOKS`を順に切り替えます（`parseLooks`、`nextLook`、`lookName`）。押すたびに、`kazoku-control`が`{ action, value }`とともに発火します。
3. **スケール切り替え`<kazoku-scale-switch>`**（`ScaleSwitchElement`）。地表、衛星、太陽系、恒星、銀河（`SCALE_STEPS`）の5段階が、いつもこの順番で並びます。`steps="solar stars"`で段階を減らせます（`parseScaleSteps`、`isScaleStep`、`scaleName`）。パソコンでは左端の幅148pxのパネルで、各段階の高さは44px、現在の段階は塗られて左端に2pxの`sun`の印がつきます。スマホでは、トップバーの下に横に並ぶ丸みのあるボタンで、横にスクロールでき、現在の段階には`sun`の枠がつきます。`kazoku-scalechange`が発火します。
4. **天体カード`<kazoku-object-card>`**（`ObjectCardElement`）。星、惑星、衛星、銀河、ブラックホール、ロケットのどれも同じ形式です。種類、日本語名を横に添えた名前、閉じるボタン、数値の格子（ラベルの下に等幅の値）、「すべての数値は出典にリンクしています」の1行、そして2つのボタン（塗りが先）が並びます。`data`に`ObjectCardData`（`CardStat`、`CardAction`、`SourceLink`、`Bilingual`。`say`が言語を選びます）を渡します。数値はすべて出典へのリンクで、`cardProblems(data)`が、出典のない数値や、計算値なのに何も表示しない数値を知らせます。`formatValue`は数値を書き（ないときは`—`）、`hasValue`は値があるかを確かめます。`refreshValues()`は、時計が進んだあとに計算値を描き直します。スマホでは、操作バーの上にせり上がるシートになり、つまみがつき、数値は3列、ボタンは横に2つ並びます。`kazoku-cardclose`が発火します。
5. **レイヤーパネル`<kazoku-layers-panel>`**（`LayersPanelElement`）。操作バーの上に出る幅320pxのパネルで、「レイヤー」のラベルの下に本物のチェックボックスが2列に並び、チェックは`sun`の色です（`LayerItem`）。データの入り口がもつ外部の出典も、クレジットとライセンスとともに並び（`licenceText`が「非営利のみ」や「同一条件で共有」を明記します）、1つずつオフにできます（`LayerSource`）。ビューの`credits()`は`sourcesFromCredits(credits, enabled)`で渡します。パッケージ自身のデータは含まれません。出典の一覧はページが持ってください。オフにした出典は`credits()`から消えますが、オンに戻せるよう、この一覧には残しておく必要があるからです。`DoorCredit`と`DoorSourceInfo`は、データの入り口の型のうち、パネルが読む部分です。`kazoku-layerchange`が`{ kind, id, checked }`とともに発火します。
6. **切り替えスイッチ`<kazoku-segmented-switch>`**（`SegmentedSwitchElement`）。`kind="language"`はENと日本語（`LANGUAGE_SEGMENTS`）で、選んだ結果をページの`lang`に書きます。`kind="culture"`は西洋、日本、中国（`cultureSegments`）です。それ以外は`options="a:Label|b:Label"`で指定します（`parseSegments`、`Segment`）。各項目は`aria-pressed`を持つボタンで、高さはパソコンで40px、スマホで44pxです。`kazoku-segmentchange`が発火します。
7. **ボタン`<kazoku-button>`**（`ButtonElement`）。1画面に`sun`の塗りのボタンは1つだけで、いちばん大事な操作に使います。それ以外は`variant="outlined"`（既定）かアイコンです。`href`があれば本物の`<a href>`、なければ本物の`<button>`で、高さはパソコンで48px、スマホで44pxです。`icon`は、言葉の前に組み込みアイコンを描きます。1画面に2つめの塗りのボタンがあると、コンソールに警告を1度だけ出します（`filledButtonCount`が数えます。ギャラリーのように複数の画面を並べるページでは、各画面に`data-screen`をつけてください）。
8. **トップバー`<kazoku-top-bar>`**（`TopBarElement`）。ホームへのリンクになったブランド名、現在の場所を示すトレイル（`TrailItem`、`trailText`）またはサイトの各セクション（`SectionLink`）が並び、右側には検索欄（スマホでは検索アイコン）、言語の切り替え、スマホではメニューボタンがあり、メニューのリンクは`menu`スロットに入れます。高さはパソコンで64px、スマホで56pxです。星空のビューの文化の切り替え（`culture="western"`）は、メニューの中ではなくバーの中にあり、パソコンでは言語の切り替えの横、スマホではバーの2行めです。「/」で検索欄に移ります。ページ上にある間は、自分の高さを`--kui-top-offset`としてドキュメントに公開します。`kazoku-topbar`が発火します。
9. **ページフッター`<kazoku-page-footer>`**（`PageFooterElement`、`FOOTER_TAG`、`pageFooterHtml`、`PageFooterOptions`）。ページフレームの3つめの部品です。ビューでは、左下の目立たない1行で、「位置は表示中の時刻で計算しています · データと出典」と出ます。`variant="page"`では読むページのフッターで、「描画に使用：<パッケージ>」、「このページのすべての数値の出典：データと出典」、「引用のしかた」、「印刷用シート」、ホームへのリンクが並びます。`sources`プロパティにビューの`credits()`を渡すと、各ライセンスを添えた出典の行を書きます（`creditsText`）。
10. **読むためのページ`<kazoku-reading-page>`**（`ReadingPageElement`）。天体それぞれのページで、幅は最大1,120pxです。種類、名前、ひとこと説明、ボタンの横に絵が置かれ、続いて3つのタイルの「いま」、項目、値、出典つきの比較を並べた表の「数値」、グループごとの関連する天体のリンクのタイル、最後に`footer`スロットのフッターが並びます。スマホでは1列になり、表は項目と値の2列になります。`ReadingPageData`（`ReadingTile`、`ReadingRow`、`ReadingRelated`、`ReadingGroup`）を渡し、`readingProblems(data)`が足りないものを知らせます。

`TAGS`は9つのタグを並べ、`TAG`は操作バーのタグ名、`defineBasics`と`defineInterface`がそれらを登録し、`InterfacePart`は共通のクラス、`WORDS`、`wordsFor`、`languageOf`は日本語と英語の言葉です（`labels`プロパティで、どれでもページが上書きできます）。`BarClockChange`は、時計がリスナーに伝える内容です。elementのエントリは、各タグ名（`ICON_BUTTON_TAG`、`CONTROL_BAR_TAG`、`SCALE_SWITCH_TAG`、`OBJECT_CARD_TAG`、`LAYERS_PANEL_TAG`、`SEGMENTED_SWITCH_TAG`、`BUTTON_TAG`、`TOP_BAR_TAG`、`READING_PAGE_TAG`）と、各イベント名（`CONTROL_EVENT`、`SCALE_EVENT`、`CARD_CLOSE_EVENT`、`LAYER_EVENT`、`SEGMENT_EVENT`、`TOP_BAR_EVENT`）も公開します。

## 時計

操作バーは、ファミリーの時計（共有シーンの`createFamilyClock`）の形に合わせて作られています。`@johnmorrisdotca/kazoku-ui/clock`が公開されるまでは、両者がつながる場所は`src/interface/clock-adapter.ts`の1か所だけで、デモとテストが使う小さな代用の時計があり、本物が入ったら削除するというTODOがついています。代用の時計は、実際に経過した時間を数え、停止中も速さを保ち、「tick」は1秒に4回まで、停止中や隠れたタブでは出さず、動きを減らす設定の読み手には止まった状態で開きます。使うのはデモとテストだけで、パッケージからはエクスポートされません。

## ページを確かめる

各ページが次の規則を満たすようにします。テストでは`cardProblems`と`readingProblems`、トークンには`unreadablePairs`、1画面に塗りのボタンは1つ、タッチ対象は44px、本物のコントロールを使うこと、です。このリポジトリの`e2e/interface.demo.mjs`は、実際のブラウザで、390pxの幅とパソコンの幅、英語と日本語のそれぞれで、同じことを確かめます。
