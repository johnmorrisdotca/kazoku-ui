---
title: 検索ボックス
section: how-to
order: 29
description: いろいろな種類のものを1つのボックスでまとめて検索します。種類ごとに数行ずつ出し、種類の絞り込みチップと、各結果につき最大3つの操作を備え、キーボードで使えます。英語と日本語に対応しています。
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
- **行**は`{ id, label, detail, actions }`です。`label`は名前で、検索に一致した部分に印が付きます。`detail`は2行目です。
- **操作**は`{ id, label, pressed }`です。1行に最大3つで、それより多いものは無視します。`pressed`を省くと普通のボタンです。`true`か`false`を入れるとトグルで、`aria-pressed`つきのボタンとして描きます。操作のない行には`open`が1つあり、行を押すとそれが働きます。
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

## スクリーンリーダーへの対応

入力欄は`aria-haspopup="grid"`のコンボボックスで、候補はグリッドです。各グループは、見出しの行（`星 5`）で名前が付いた`rowgroup`、各結果は`row`で、文字用と操作ごとの`gridcell`があります。フォーカスはずっと入力欄にあり、`aria-activedescendant`が選択中の行を、矢印で操作へ移ったあとはその操作のボタンを指します。選択中の行には`aria-selected`が付きます。リストボックスではなくグリッドなのは、オプションの中にボタンを入れられないからです。答えが届くと、件数を控えめに読み上げます（`15件：星1件、惑星・衛星1件、…`、絞り込み後は`都市、49件`のような形）。

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
| `shortcut` | ボックスにフォーカスするキー。`/`、`mod+k`（ControlまたはCommand）、`ctrl+k`、`meta+k`、`alt+s`。空白で区切って複数指定できる。ほかの入力欄に入力しているときは、キーを取らない |

`close()`は候補を閉じ、`clear()`は欄を空にし、`focus()`はフォーカスします。色はファミリー共通の`--kazoku-ink`、`--kazoku-surface`、`--kazoku-line`、`--kazoku-accent`で決まり、ライトとダークに対応します。スマホでは候補がボックスの幅いっぱいに広がり、行の操作は名前の下に並び、どのボタンも44px以上です。動くものはないので、動きを止める設定は要りません。

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

ほかに、`planLines`（答えに対して描くもの）、`chipsOf`、`announcement`、`actionsOf`、`stepIndex`、`MAX_ACTIONS`、`countPhrase`、`languageOf`、`EVENT`、`TAG`も公開しています。クラスは`SearchBoxElement`で、`defineSearchBox`がタグを登録し、すでに登録されていれば何もしません。
