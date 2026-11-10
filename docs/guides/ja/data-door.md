---
title: データの入口
section: how-to
order: 25
description: パッケージが外のデータ（星、天体、地図、小天体）を、ライセンスと出典つきの「ソース」として受け取るしくみです。確認、出典の表示、読み込み、タイルの容量管理を受け持つ、全パッケージ共通の4つの小さな関数も説明します。
---

[English](../data-door.md)

パッケージは描くだけで、データは呼び出す側が用意します。外のデータは「ソース」という入口から入ります。ソースは小さな型つきのオブジェクトで、自分のライセンスと出典を持っています。そのため、いま画面にあるのは誰のデータなのかを、ページはいつでも言えます。ソースがなければ、パッケージはこれまでと同じものを、同梱のデータから描きます。

入口は1つのファイル、[`templates/data-door.ts`](../../../templates/data-door.ts)です。型と4つの小さな関数だけで、DOMもthree.jsも使いません。外のデータを受け取るパッケージは、これを**そのまま**`src/data-door.ts`にコピーします。コピーが違っていると、`scripts/check-standard.mjs`が`pnpm check`を失敗させます。importではなくコピーにしているのは、実行時の依存を持たないパッケージが、これからも持たずにいられるようにするためです。

## 2種類のソース

**records**は、メモリに収まるリストです。1つのソースに入れられるのは20万件までで、ソースを追加するときに1度だけ読み、そのあと凍結します。**tiles**は、場所と細かさで切り分けたデータで、画面に出す分だけ取ってきます。`need(place, detail)`はタイルのキーを返します（純粋で、取得はしません）。`load(key, signal)`は1つ取得し、`bytes(tile)`はメモリ上の大きさを返します。場所と細かさの型は、パッケージ自身のものです。地図の1枚（星空の絵、惑星の表面、地球の昼の絵）は、全パッケージで同じ形を使います。度で表した`MapPlace`、全周のピクセル数で表す細かさ、そして`ImageTile`です。

どのソースも、`info`で自分が何者かを伝えます。`id`（小文字の英字、数字、ハイフン。1つのビューで重複しません）、日本語と英語の`name`と`credit`、`licence`（名前とリンク。非営利のみ、または同一条件の共有ならそのフラグ）、ソース自身のページ、取得した日です。

```ts
import type { RecordSource } from "./data-door.ts";

const mine: RecordSource<{ ra: number; dec: number; mag: number }> = {
  kind: "records",
  info: {
    id: "my-catalogue",
    name: { en: "My catalogue", ja: "私のカタログ" },
    credit: { en: "My catalogue, A. Person (2026)", ja: "私のカタログ（A. Person、2026年）" },
    licence: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    url: "https://example.org/my-catalogue",
    retrieved: "2026-11-10",
  },
  records: () => fetch("/my-catalogue.json").then((response) => response.json()),
};
```

## 4つの関数

- **`validateSource(source, taken)`**は、次のどれかなら`TypeError`を投げます。出典が空（どちらの言語でも）、ライセンスの名前かリンクがない、idが不正、idが`taken`にすでにある、日付かページがない、必要な関数がない。ビューは`addSource`の中でこれを呼ぶので、不正なソースは最初の描画ではなく、すぐに断られます。
- **`creditLine(credits, language)`**は、ビューが描いたものの出典の行を書きます。例は「Yale Bright Star Catalogue (Public domain); UCAC4 (CC0 1.0).」です。パッケージ自身のソースが先に並びます。ライセンス名は必ず書き、ソースが非営利のみ、または同一条件の共有なら、その旨も書きます。だから、使っているデータの条件をページが隠すことはできません。日本語では、ライセンスを（）に入れ、ソースを／でつなぎます。
- **`loadRecords(source, signal, finite)`**は、リストを1度だけ読み、決して例外を投げません。リストを凍結し、20万件を超えるものは断ります（それより大きいデータはタイルにします）。`finite`が指す数のどれかに`NaN`か無限大がある件は、読み飛ばして数えます。ソースが例外を投げたり拒否したりすれば読み込みの失敗、中断された読み込みは`aborted`になります。
- **`createTileStore(options)`**は、タイルをキーで読み込み、1つの容量の中に収めます。既定は全ソース合わせて48MBで、画像はミップマップ込み（バイト数の4/3）で数えます。1つのソースで同時に動く読み込みは6つまでです。読み込みが始まるのは、キーが変わったときだけです。静止中にもう一度頼んでも、何も送りません。失敗したタイルは、次の変化のときに再び試し、タイマーでは試しません。最も長く使われていないタイルから手放しますが、ビューがいま必要としているタイルは手放しません。それでも収まらないタイルは断って数えるので、保持するバイト数が容量を超えることはありません。例外を投げた、空で返った、大きさが数でないタイルは、`failed`に数えて保持せず、描きません。`drop(id)`は、そのソースの読み込みを中断し、タイルを解放します。

```ts
import { createTileStore, creditLine, validateSource } from "./data-door.ts";

const store = createTileStore<Tile>({ onChange: draw });
const sources: StarSource[] = [];

function addSource(source: StarSource): () => void {
  validateSource(source, sources.map((one) => one.info.id)); // throws at once
  sources.push(source);
  draw();
  return () => {
    sources.splice(sources.indexOf(source), 1);
    store.drop(source.info.id); // aborts its loads, frees its tiles
    draw();
  };
}

function draw(): void {
  for (const source of sources) {
    const held = store.want(source, source.need(place, detail)); // draws what is held; the rest arrives through onChange
    // draw `held`, skipping and counting any non-finite number in a tile
  }
  footer.textContent = creditLine(creditsOfLastFrame(), language);
}
```

## ビューの側でやること

どのビューも`sources`（データは文字ではないので、属性ではなくプロパティ）と、`remove()`を返す`addSource(source)`を持ちます。止めるには`remove()`、`removeSource(id)`、`enableSource(id, false)`を使い、`data="own"`なら外のソースをまとめて無視します。止めると、そのソースの読み込みを中断し、タイルを解放して描き直し、出典も消えます。`view.credits()`は、直前に描いたフレームに、印かタイルを1つでも出したソースを、パッケージ自身のものを先にして返します。その集まりが変わると、`{ credits }`つきのイベントが起きます。

パッケージ自身のデータもソースの1つなので、出典の行は、自分のデータにも外のデータにも同じ道で書かれます。パッケージに同梱するソースは、そのまま渡せるものでなければならず、非営利のみか同一条件の共有のものがあればテストが失敗します。呼び出す側のソースはどちらでもかまわず、出典の行がそれを伝えます。

## 取り入れ方

1. テンプレートをコピーします。`cp ../kazoku-ui/templates/data-door.ts src/data-door.ts`
2. `pnpm check`を実行します。標準の確認（一覧の`data-door`）が、コピーをテンプレートの記録済みのハッシュと比べます。
3. 設計がすべてのパッケージに求めるテストを足します。ソースなしなら以前と同じ絵になること。偽のソースでより多く描かれ、日本語と英語の出典が出ること。止めると最初の絵に戻り、メモリが解放されること。不正な入力は断られるか数えられ、描かれないこと。静止中は何も要求しないこと。容量が守られること。同梱のソースが条件なしで渡せること。コピーがテンプレートと同じであること。

```sh
cp ../kazoku-ui/templates/data-door.ts src/data-door.ts
pnpm check
```

テンプレートを変えるときは、このリポジトリで変え、`templates/check-standard.mjs`に新しいハッシュを書きます（kazoku-uiのテストが、その2つを一致させます）。そのあと、すべてのパッケージに新しいコピーを入れます。
