---
title: 検索ボックス
section: how-to
order: 29
description: いろいろな種類のものを1つのボックスでまとめて検索します。種類ごとに数行ずつ出し、種類の絞り込みチップ、各結果のアイコンと最大3つの操作を備え、選択中の結果のプレビューをリストの横かシートで表示します。キーボードで使えます。英語と日本語に対応しています。
---

[English](../search-box.md)

`<kazoku-search-box>`は、探すものが何種類もあるページ（星、惑星、宇宙機、場所、都市など）のための、検索用のコンボボックスです。ページが渡す`source`が、種類ごとのグループで答えます。ボックスは各グループを件数つきで数行ずつ出し、種類のチップで1つのグループに絞り込め、各行には最大3つの操作（表示、移動、お気に入りなど）を付けられます。データは持たず、自分では取りに行きません。`source`に尋ね、最新の答え以外は捨て、読む人が選んだものをページに知らせるだけです。

これは[コレクションピッカー](collection-picker.md)を広げたものではなく、別の要素です。ピッカーは、ページが一度渡した一覧をブラウザで検索し、読む人が編集する「選んだ一覧」を持ちます。このボックスは3つの点で逆です。答えは非同期でグループごとに届き、ここでは何も検索せず、選ぶのではなく「行と操作を一度だけ知らせる」だけです。1つの要素に両方を詰めると、片方にしか意味のない設定が残ってしまいます。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async (query) => [
    { id: "planets", label: "惑星", total: 1, rows: [{ id: "mars", label: "火星", detail: "惑星", actions: [{ id: "show", label: "表示" }, { id: "fav", label: "お気に入り", pressed: false }] }] },
  ];
  box.addEventListener("kazoku-search-pick", (event) => console.log(event.detail.id, event.detail.group, event.detail.action));
</script>

<kazoku-search-box lang="ja"></kazoku-search-box>
```

## ソース

`source`は`(query, { signal, group }) => groups`という関数か、その結果を返すプロミスです。ボックスが呼ぶのはこれだけで、読む人が入力したときか、絞り込んだときだけです。

- **グループ**は`{ id, label, total, rows }`です。`label`は、読む人の言語で書いた種類の名前です。`total`は、その種類の結果の総数で、`rows`より多くてかまいません。件数、チップ、「{n}件すべてを見る」はこの数を言います。
- **行**は`{ id, label, detail, icon, preview, actions }`です。`label`は名前で、検索に一致した部分に印が付きます。`detail`は2行目です。`icon`と`preview`は、下の「行のアイコン」と「プレビューのパネル」を参照してください。
- **操作**は`{ id, label, icon, pressed, disabled, title }`です。1行に最大3つで、それより多いものは無視します。`icon`はボタンに描く絵です（下の「操作のアイコン」を参照）。省くと、小さな文字のボタンになります。`pressed`を省くと普通のボタンです。`true`か`false`を入れるとトグルで、`aria-pressed`つきのボタンとして描きます（アイコンのボタンは、オンのとき絵が塗りつぶされます）。まだ実行できない操作（する事のない種類）には`disabled`を`true`にし、`title`で理由を伝えます（下の「使えない操作」を参照）。操作のない行には`open`が1つあり、行を押すとそれが働きます。
- `group`は、すべてのグループなら`""`、読む人が絞り込んだグループ（チップか「{n}件すべてを見る」）ならそのidです。グループが指定されたら、そのグループの全件で答えてください（ボックスは20件ずつ描きます）。ほかのグループは`rows: []`と`total`だけで送ると、チップの件数が保たれます。
- `signal`は、新しい呼び出しがこの呼び出しに取って代わるときに中断されます。リクエストを止められるソースはこれを渡します。止められないソースでも、遅れた答えは捨てるので問題ありません。

欄が空のときは、ソースを呼びません。待ち時間（`debounce`、120ミリ秒）のあとの新しい呼び出しは、前の呼び出しを中断します。新しい呼び出しが始まったあとに戻ってきた答えは、ソースが中断を聞いたかどうかにかかわらず捨てます。

## 読む人の操作

| キー | 動き |
|---|---|
| 入力 | 待ち時間のあとソースに尋ね、候補を開く |
| 下、上 | 選択中の行を動かす。最後の行（上向きなら最初の行）の先はボックスに戻る |
| 右、左 | 行を選んでいるとき、その行の操作の間を動く。端では、ふつうの入力欄と同じようにカーソルが動く |
| Enter | 選択中の行か操作を実行する。普通の操作は候補を閉じ、トグルは開いたままにする |
| Escape | 候補を閉じる。もう一度押すと欄を空にする |
| Home、End | ボックスのカーソルを動かす。一覧は動かさない |
| Tab | ボックスから種類のチップ（押した状態をもつ本物のボタン）へ、さらにその先へ |
| `/`、ControlまたはCommandとK | `shortcut`で指定したときだけ、ボックスにフォーカスする（初期状態ではオフ） |

選択中の行は、その行の**最初の**操作を表します。Enterでそれが実行され、行の文字を押しても同じです。右キーで2つ目、3つ目の操作へ移り、Enterは今いる操作を実行します。ですから、最後に置いたお気に入りは、行から右キーを2回押した位置です。お気に入りを最初に置くページでは、Enterがそれを切り替えます。

`kazoku-search-pick`は`detail`に`{ id, group, action }`を持ち、トグルのときは新しい状態`pressed`も持ちます。ボックスはトグルの`aria-pressed`をすぐ切り替えます。本当の状態はページが持ち、次の答えがそれを伝えます。新しい呼び出しなしで合わせたいときは`setPressed(group, id, action, pressed)`を使います。

## コンパクトな見た目

ボックスは初期状態でコンパクトな見た目です。ゆったりしたモードはありません。大きく表示したいページ向けの設定もなく、読む人のポインター（指やマウス）に応じて、ボックスが自分で大きくなります。

- **結果は1行**で、高さは約40pxです。名前（一致した部分に印）の下に、小さく控えめな`detail`が付きます。名前や`detail`が長すぎるときは、折り返さず、末尾を「…」で省略します。
- **操作はアイコンのボタン**で、行の右に、すべて同じ大きさ（30px）で並び、名前の下に回り込みません。ボタンにはツールチップ（操作の`label`、使えない操作なら`title`）と、操作の`label`と行の名前をつなげたアクセシブルな名前（`お気に入り 火星`）が付きます。トグルの星は、オフでは輪郭だけで、オンでは塗りつぶされ、アクセントの色になります。`icon`のない操作は、小さな文字のボタン（28px。角は少し丸いだけで、ピル型ではありません）になります。
- **操作が収まらない狭い行**は、収まる分の操作を並べ、残りは1つの**その他の操作**ボタンにまとめます。これを押すと、行の下に小さなボタンの1行として開きます。キーボードにこのボタンは要りません。右矢印キーは、奥にある操作も含めてすべての操作の間を動きます。矢印キーでその操作の1つに移っている間は、行がそのボタンの1行を開いています。
- **種類のチップ**は小さなチップ（24px）の1行です。収まらないときは横にスクロールし、続きがある側の端はぼかして示します。件数は細い字で描きます。Tabでチップの間を動くのは従来どおりです。
- **グループの見出し**は小さく、件数が付き、「{n}件すべてを見る」は行の下ではなく、見出しと同じ高さの右端にあります。
- **指で触れるとき**（`pointer: coarse`）は、行、アイコンのボタン、チップ、「{n}件すべてを見る」がすべて44pxのタップ対象に広がります。

## 操作のアイコン

操作の`icon`には、組み込みの名前か、ページ自身のパスデータを指定します。

| `icon` | 描くもの |
|---|---|
| `"star"` | 星の輪郭。トグルがオンのとき塗りつぶされる |
| `"show"`（または`"eye"`） | 目 |
| `"go"`（または`"arrow"`） | 矢印 |
| `"dot"` | 小さな点。自分用の絵がない操作向け |
| `{ path: "M4 12h16" }` | ページ自身の絵。24×24の格子の上のSVGパスデータで、1つの文字列か、6つまでの配列 |

独自の絵も、組み込みのものと同じく、線の太さ1.75、先が丸い線で描き、オンのトグルは塗りつぶします。未登録の名前や安全でないパスデータは点として描くので、間違いに気づけますし、ほかの表示が消えることもありません。ボックスは、マークアップの文字列からではなく、パスデータから1つずつノードを作って絵を描きます。受け付けるのはパスのコマンド（`MLHVCSQTAZ`、大文字小文字とも）、数字、符号、カンマ、空白だけで、800文字までです。ですから、ページのアイコンに要素、属性、スクリプトを加えることはできません。絵はスクリーンリーダーには隠し、ボタンの名前は`label`から付きます。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "planets", label: "惑星", total: 1, rows: [{ id: "mars", label: "火星", detail: "惑星", actions: [
      { id: "show", label: "表示", icon: "show" },
      { id: "go", label: "移動", icon: { path: ["M4.5 12h14", "M13 6.5l5.5 5.5-5.5 5.5"] } },
      { id: "fav", label: "お気に入り", icon: "star", pressed: false },
    ] }] },
  ];
</script>

<kazoku-search-box lang="ja"></kazoku-search-box>
```

## 使えない操作

`{ id: "go", label: "移動", disabled: true, title: "場所の地図はまだ使えません" }`は、ボタンを薄く描き、`aria-disabled="true"`を付けます（`disabled`属性は使いません。ツールチップを残すためです）。`title`はツールチップになります。同じ文はアクセシブルな説明にもなるので、矢印でそのボタンに移った読む人は、操作、行、そして理由の順に聞けます。Enter、押すこと、行の文字を押すこと（それがその行の最初の操作のとき）は、何もせず`kazoku-search-pick`も送りません。候補は開いたままです。矢印キーはそのボタンに届くので、理由を聞けます。`disabled`を省くか`false`にすると普通の操作で、`title`だけならツールチップと説明が付くだけです。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "places", label: "場所", total: 1, rows: [{ id: "gale", label: "ゲイルクレーター", actions: [{ id: "go", label: "移動", disabled: true, title: "場所の地図はまだ使えません" }] }] },
  ];
</script>

<kazoku-search-box lang="ja" placeholder="星、惑星、宇宙機、都市を検索"></kazoku-search-box>
```

## トグルの変化を読み上げる

フォーカスは入力欄にあり、スクリーンリーダーは操作対象の子孫に付いた`aria-pressed`をほとんど読み上げません。そこでボックス自身が、トグルの新しい状態を、自分のステータス行で控えめに読み上げます。操作、行、そして`オン`か`オフ`の順です（`Favourite Mars, on`、`お気に入り 火星、オン`）。読む人がキーか押下で切り替えたときに読み上げ、ページが`setPressed`を呼んだときは読み上げません。ことばは下の表の`on`と`off`で、`wordsFor`で置き換えられます。

## 行のアイコン

行の`icon`は、名前の前に20px四方で描きます。大きさが決まった箱に入れるので、名前の位置がそろい、画像を読み込んでもほかの部分は動きません。答えのどれかの行にアイコンがあれば、ない行もその分の場所を空けます。アイコンは飾りで、スクリーンリーダーには隠し、読み上げるのは名前です。

| `icon` | 描くもの |
|---|---|
| `"disc"`、`"ring"`、`"star"`、`"dot"`、`"square"` | 行の文字色で描く組み込みの形。disc、star、dot、squareは塗りつぶし、ringは輪郭 |
| `{ name: "disc", color: "#c1440e" }` | ページが決めた色で描く組み込みの形。惑星はその惑星の色、星はその星の色 |
| `{ path: ["M12 3.5l4.5 13-4.5-2.8-4.5 2.8z"], filled: true, color: "#7a8a99" }` | ページ自前のパスデータ（24×24の格子上、文字列1つか最大6つ）。線で描き、`filled`がtrueなら塗りつぶす |
| `{ text: "🇯🇵" }` | 数文字（最大8文字）。国旗、文字、記号など。ここでも`color`が使えます |
| `{ src: "/flags/jp.svg" }` | 画像のアドレス。同じ20pxの枠に遅延読み込みする。読み込めなければ取り除き、箱は空になる |

色は検証します。使えるのは16進の色、色名、数値だけの`rgb()`、`hsl()`、`hwb()`、`lab()`、`lch()`、`oklab()`、`oklch()`です。それ以外（`var()`、`url()`、セミコロンを含むもの）は無視し、文字色を使います。アドレスは相対アドレス、`https:`、`http:`、または小さな`data:`のPNG、JPEG、WebP、GIF、AVIFに限ります。それ以外のスキームは捨て、その行はアイコンなしになります。色は要素のスタイルオブジェクトで設定し、絵はマークアップの文字列ではなくノードを1つずつ組み立てて作るので、厳格なContent-Security-Policyの下でも影響はありません。`rowIconSpec(icon)`、`isSafeColor`、`isSafeImageUrl`も公開しています。

## プレビューのパネル

行は`preview`を持てます。持たない行のために、ページは`loadPreview`を設定できます。どちらかがあれば、選択中の行のプレビューをリストの隣に描きます。行が選択中になるのは、矢印キーを使うか、行の上にマウスを置いたときです。どちらもなければボックスは従来どおりで、設定があっても`preview="off"`でパネルをオフにできます。

**プレビュー**は`{ title, kind, facts, picture, pictureAlt, element }`で、どれも省略できます。パネルは、まず画像の枠（16対10で固定。画像を読み込んでも動かない）、次にアイコン、名前、種類、そして最大8つの`facts`（`{ label, value }`。項目名と値の組（`dl`）として描き、値はテキストとして扱い、マークアップとしては解釈しない）、最後にその行の操作をラベル付きのボタンとして描きます。名前は行の`label`、種類はグループのラベルですが、プレビューが自分の値を持っていればそちらを使います。`picture`は、行のアイコンと同じ検証を通すアドレスで、プレビューを表示したときに読み込みます。`element`はページが作ったノードで、画像の代わりに同じ箱に描き、その行をまた選択したときのために保持します。ノードはボックス自身のシャドウツリーの中に描くので、ページのスタイルシートは届きません。大きさや見た目はノード自身に持たせてください（canvas、SVG、またはスタイルオブジェクトで設定した要素。厳格なContent-Security-Policyでも使えます）。中身が何もないプレビューは、行の名前、アイコン、種類だけを出します。

行にプレビューを持たせる方法は2つです。

- **行が持つ**：`row.preview`がオブジェクト。すぐに描きます。保持はしません。ページが次の答えで新しいものを送るかもしれないからです。答えにすでに情報が入っているときに使います。
- **尋ねる**：`row.preview`が関数、またはページが`box.loadPreview`（関数`(row, { signal, group }) => preview`、またはそのプロミス）を設定した場合です。取得するのはこれだけで、その動きは次のように抑えられています。
  - 選択中でない行については何も尋ねません。1000行のリストでも、尋ねるのは0件です。
  - 行が選択中になったあと、ボックスは待ち時間（`preview-delay`、150ミリ秒）を置きます。矢印キーで行を通り過ぎるときは、止まった行だけを尋ね、通り過ぎた行は尋ねません。
  - 別の行へ移ると、呼び出しを中断します（`signal`）。リクエストを止められない関数でも問題ありません。遅れて届いた答えは捨てます。
  - 答えは、行のグループ、id、言語ごとに最大200件まで保持し、いちばん長く使われていないものから捨てます。そのため、もう一度選択した行はすぐに表示され、何も尋ねません。`clearPreviews()`は保持したものをすべて忘れます（データが変わったときに呼びます）。
  - 呼び出し中、パネルは前のプレビューを保ち、空白になりません。300ミリ秒を超えると、パネルは表示中のものを薄くし、前の行のものだと分かるようにします。まだ何も出していないときは`読み込み中…`と出します。
  - 失敗した呼び出しは、行の名前と種類に`プレビューを読み込めませんでした。`を添えて出し、保持はしません。その行をもう一度選ぶと、また尋ねます。
  - 答えはそのまま使います。`undefined`は、これ以上分かることがないという意味です。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/search-box/define";
  const box = document.querySelector("kazoku-search-box");
  box.source = async () => [
    { id: "planets", label: "惑星", total: 2, rows: [
      { id: "mars", label: "火星", detail: "惑星", icon: { name: "disc", color: "#c1440e" }, actions: [{ id: "show", label: "表示", icon: "show" }] },
      // こちらは自分でプレビューを持つ：すぐに表示し、何も尋ねない
      { id: "venus", label: "金星", detail: "惑星", icon: { name: "disc", color: "#e6c27a" }, preview: { facts: [{ label: "衛星", value: "0" }] } },
    ] },
  ];
  // それ以外は、選択したときに1回だけ、中断できる形で尋ねる
  box.loadPreview = async (row, { signal }) => ({
    kind: "惑星",
    facts: [{ label: "衛星", value: row.id === "mars" ? "2" : "?" }, { label: "1日", value: "24.6時間" }],
  });
</script>

<kazoku-search-box lang="ja"></kazoku-search-box>
```

### 配置

| 候補の幅 | プレビューは | 読む人は |
|---|---|---|
| 540px以上 | リストの隣の2つ目の列。リストをスクロールしても、その位置に留まる（sticky）。これより狭いボックスでは、ボックスの右に余裕があれば候補を約672pxまで広げる | 矢印キー、または行の上にマウスを置いて選択する。パネルがそれに合わせて変わる。タッチ画面（`pointer: coarse`）では各行に「詳細」の操作も付き、これで行を選択できる |
| それより狭い | パネルなし。各行の末尾に「詳細」（`i`のアイコン）の操作が付き、これを押すと、リストの代わりにプレビューがシートとして開き、「結果に戻る」ボタンが出る | 「詳細」を押す。または矢印キーで操作をたどってそこへ行き、Enterを押す。Escapeは先にシートを閉じ、次に候補を閉じる。シートを開くまでは何も尋ねない |

詳細は、ページ自前の操作と同じ扱い（グリッドのセルなので、右キーで届く）ですが、`kazoku-search-pick`は送りません。配置は、ボックス自身の幅と右側の余裕から決め、どちらかが変わると決め直します。切り替わっても、選んでいる行はそのまま保ちます。幅のしきい値は設定ではありません。小さなボックスでパネルを使いたいページは、ボックスを広くしてください。

### スクリーンリーダーとキーボードの扱い

フォーカスは入力欄から動かず、パネルがフォーカストラップになることもありません。パネルは`Preview`（日本語では`プレビュー`）という名前の`region`です。行（またはその操作）がアクティブな子孫である間、パネルはそのセルの説明（`aria-describedby`）になるので、スクリーンリーダーは行を読み上げたあとにプレビューを読み上げます。リクエスト中は`aria-busy`を付けます。パネル内のボタン（操作の再掲で、ポインター用）はタブ順の外にあり、スクリーンリーダーには隠します。同じ操作はグリッドにあるからです。トグルの状態は行の状態と同期します。シートを開いている間は、リストが表示されていないため、ボックスはアクティブな子孫を指さず、`プレビュー、火星`と控えめに（`polite`で）読み上げます。パネルは、選択するまでその行について何も描かず、候補を閉じたときや新しい答えが届いたときに、ヒント（`結果にポインターを合わせるか、矢印キーで選ぶと、プレビューが表示されます。`）に戻ります。

### DOMなしのローダー

`createPreviewLoader`は同じ仕組みからDOMを除いたものです。キーと行を渡して`highlight`を呼ぶと、待ち時間のあと、行、キャッシュ、関数のどれかから得たプレビューを`onShow`に渡し、古い答えは捨てます。テストでは`timers`で時計を手で進めます。`previewView(row, groupLabel, preview)`は、パネルが描く、検証済みの形です。

```ts
import { createPreviewLoader } from "@johnmorrisdotca/kazoku-ui/search-box";

const loader = createPreviewLoader({
  debounceMs: 0,
  staleMs: 300,
  cacheSize: 100,
  fallback: () => async (row) => ({ facts: [{ label: "ID", value: row.id }] }),
  onShow: (target, preview) => console.log("show", target.row.id, preview?.facts?.[0]?.value),
});
loader.highlight("planets\u0000mars", { id: "mars", label: "火星" }, "planets");
```

## スクリーンリーダーへの対応

入力欄は`aria-haspopup="grid"`のコンボボックスで、候補はグリッドです。各グループは、種類と件数（`星5件`）で名前が付いた`rowgroup`で、その先頭に見出しの行があります。各結果は`row`で、文字用と操作ごとの`gridcell`があります。フォーカスはずっと入力欄にあり、`aria-activedescendant`は常に`gridcell`を指します。選択中の行の文字用のセル（その行の最初の操作を表します）か、矢印で操作へ移ったあとはその操作のセルです。選択中の行とそのセルには`aria-selected`が付きます。入力方式で文字を変換している間は、矢印キーとEnterは入力方式のものとして、ボックスは何もしません。リストボックスではなくグリッドなのは、オプションの中にボタンを入れられないからです。答えが届くと、件数を控えめに読み上げます（`15件：星1件、惑星・衛星1件、…`、絞り込み後は`都市、49件`のような形）。

選択中の行を動かしても属性を変えるだけで、行は描き直しません。行は答えごとに1度だけ、見せる分だけを描きます。グループごとに数行、絞り込んだグループなら1回に出す分です。ですから、ソースが何千行返しても、ページが持つのは画面1つ分のノードだけです。

## 絞り込み

チップは`すべて`と、答えにあるグループごとに1つのボタンで、それぞれ件数が付き、選んだものに`aria-pressed`が付きます。チップか、グループの「{n}件すべてを見る」の行を押すと、そのグループを指定してソースに再び尋ねます。絞り込んだグループは20件を出し、「もっと見る」の行で次の20件を出します。選んだチップをもう一度押すか`すべて`を押すと、すべてのグループに戻ります。

## 属性とプロパティ

| | |
|---|---|
| `source` | ページの検索関数 |
| `value` | 欄の中身。設定するとソースに尋ねる |
| `lang` | `en`か`ja`。省くとページの言語 |
| `theme` | `light`、`dark`、または省略 |
| `debounce` | 呼び出しまでの待ち時間（ミリ秒、120） |
| `per-group` | 各グループが出す行数（3） |
| `window` | 絞り込んだグループが一度に出す行数（20） |
| `preview` | `off`でプレビューのパネルと「詳細」の操作をオフにする。省くと、行がプレビューを持つか`loadPreview`が設定されていればオン |
| `preview-delay` | 行を選択してからプレビューを尋ねるまでの待ち時間（ミリ秒、150） |
| `placeholder` | 空の欄に出すヒント。省くか空なら、ボックスの言語の「検索」（`Search`、`検索`）。指定すると、どの言語でも書いたとおりに出す。プロパティでもあり、読むと表示中の文字列で、設定すると属性に書く。ボックスのアクセシブルな名前は`検索`のまま |
| `shortcut` | ボックスにフォーカスするキー。`/`、`mod+k`（ControlまたはCommand）、`ctrl+k`、`meta+k`、`alt+s`。空白で区切って複数指定できる。ほかの入力欄に入力しているときは、キーを取らない |

`close()`は候補を閉じ、`clear()`は欄を空にし、`focus()`はフォーカスします。色はファミリー共通の`--kazoku-ink`、`--kazoku-surface`、`--kazoku-line`、`--kazoku-accent`で決まり、ライトとダークに対応します。候補はボックスの幅いっぱいに広がり、指で触れるときはタップできる部分はどれも44px以上です（「コンパクトな見た目」を参照）。動くものはないので、動きを止める設定は要りません。

## ことば

ことばは英語と日本語で、どのキーも両方にあります（`WORDS`、`wordsFor(language, overrides)`）。

| キー | English | 日本語 |
|---|---|---|
| `search` | Search | 検索 |
| `kinds` | Kinds | 種類 |
| `all` | All | すべて |
| `seeAll` | See all {n} | {n}件すべてを見る |
| `showMore` | Show more | もっと見る |
| `empty` | No matches | 一致するものはありません |
| `searching` | Searching… | 検索中… |
| `failed` | The search failed | 検索できませんでした |
| `results` | Results | 検索結果 |
| `countOne`、`countMany` | {n} result、{n} results | {n}件 |
| `announce` | {count}: {kinds} | {count}：{kinds} |
| `kindCount` | {label} {n} | {label}{n}件 |
| `join` | , | 、 |
| `open` | Open | 開く |
| `more` | More actions | その他の操作 |
| `on` | on | オン |
| `off` | off | オフ |
| `preview` | Preview | プレビュー |
| `previewHint` | Point at a result, or move to one with the arrow keys, to preview it. | 結果にポインターを合わせるか、矢印キーで選ぶと、プレビューが表示されます。 |
| `previewLoading` | Loading… | 読み込み中… |
| `previewFailed` | The preview could not be loaded. | プレビューを読み込めませんでした。 |
| `details` | Details | 詳細 |
| `back` | Back to results | 結果に戻る |

結果の名前はここにはありません。ソースが、読む人の言語で返します。

## 順位づけと印を付ける部分

要素を使わなくても、純粋な関数で、ページが持つ一覧に順位をつけたり、一致した部分で名前を切り分けたりできます。`rank(query, name, aliases)`は、`RANK.exact`（4）、`RANK.prefix`（3）、`RANK.wordStart`（2）、`RANK.contains`（1）、`RANK.none`（0）のどれかで、名前と別名のうち最も良いものを返します。大文字小文字、アクセント、全角と半角、カタカナとひらがなは区別しないので、`ｍａｒｓ`で`Mars`が、`とうきょう`で`トウキョウ`が見つかります。`highlight(text, query)`は、`text`を一致した部分に印を付けて切り分けます。ボックスはそれを`<mark>`で描きます。

```ts
import { createSearchRunner, highlight, rank, RANK } from "@johnmorrisdotca/kazoku-ui/search-box";

console.log(rank("mar", "Mars"), rank("ｍａｒｓ", "Mars") === RANK.exact, rank("かた", "カタカナ"));
console.log(highlight("Mars Orbiter", "orb").map((piece) => (piece.match ? `[${piece.text}]` : piece.text)).join(""));

const runner = createSearchRunner({
  debounceMs: 0,
  source: () => (query) => [{ id: "stars", label: "星", total: 1, rows: [{ id: query, label: query }] }],
  onAnswer: (groups) => console.log("answered", groups[0]?.rows[0]?.id),
});
runner.request("vega");
```

ほかに、`createPreviewLoader`、`previewView`、`rowIconSpec`、`isSafeColor`、`isSafeImageUrl`、`MAX_FACTS`、`MAX_ICON_TEXT`、`ROW_ICON_NAMES`、`PREVIEW_ACTION_ID`、`iconPaths`、`isSafePath`、`MAX_ICON_PATH`（800）、`SEARCH_ICONS`、`SEARCH_ICON_NAMES`、`actionsFit`（行の操作がその行に何個収まるか）、`planLines`（答えに対して描くもの）、`chipsOf`、`announcement`、`toggleAnnouncement`、`isActionEnabled`、`actionsOf`、`stepIndex`、`MAX_ACTIONS`、`countPhrase`、`languageOf`、`EVENT`、`TAG`も公開しています。クラスは`SearchBoxElement`で、`defineSearchBox`がタグを登録し、すでに登録されていれば何もしません。
