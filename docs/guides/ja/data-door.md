---
title: データの入口
section: how-to
order: 25
description: パッケージが外のデータ（星、天体、地図、小天体）を、ライセンスと出典つきの「ソース」として受け取るしくみです。検証、出典の表示、読み込み、タイルの容量管理を受け持つ、全パッケージ共通の4つの小さな関数も説明します。
---

[English](../data-door.md)

パッケージは描くだけで、データは呼び出す側が用意します。外のデータは「ソース」という入口から入ります。ソースは小さな型つきのオブジェクトで、自分のライセンスと出典を持っています。そのため、いま画面にあるのは誰のデータなのかを、ページはいつでも示せます。ソースがなければ、パッケージはこれまでと同じものを、同梱のデータから描きます。

入口は1つのファイル、[`templates/data-door.ts`](../../../templates/data-door.ts)です。型と4つの小さな関数だけでできていて、DOMもthree.jsも使いません。外のデータを受け取るパッケージは、これを**そのまま**`src/data-door.ts`にコピーします。コピーがテンプレートと違っていると、`scripts/check-standard.mjs`が`pnpm check`を失敗させます。`import`ではなくコピーにしているのは、実行時の依存を持たないパッケージが、これからも持たずにいられるようにするためです。

## 2種類のソース

**records**は、メモリに収まるリストです。1つのソースに入れられるのは20万件までで、ソースを追加するときに1度だけ読み、そのあと凍結します。**tiles**は、場所と詳細度で切り分けたデータで、画面に出す分だけ取ってきます。`need(place, detail)`はタイルのキーを返します（純粋関数で、取得はしません）。`load(key, signal)`はタイルを1つ取得し、`bytes(tile)`はそのメモリ上の大きさを返します。場所と詳細度の型は、パッケージ自身のものです。地図状のデータ（星空の画像、惑星の表面、地球の昼の画像）は、全パッケージで同じ形を使います。度で表した`MapPlace`、全周のピクセル数で表す詳細度、そして`ImageTile`です。

どのソースも、`info`で自分が何者かを伝えます。`id`（小文字の英字、数字、ハイフン。1つのビューの中で重複しません）、日本語と英語の`name`と`credit`、`licence`（名前とリンク。非営利のみ、または同一条件で共有のときは、そのフラグも）、ソース自身のページ、取得した日です。

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

- `validateSource(source, taken)`は、次のどれかなら`TypeError`を投げます。出典が空（どちらの言語でも）、ライセンスの名前かリンクがない、`id`が不正、`id`が`taken`にすでにある、日付かページがない、必要な関数がない。ビューは`addSource`の中でこれを呼ぶので、不正なソースは、最初の描画まで待たずにすぐ拒否されます。
- `creditLine(credits, language)`は、ビューが描いたものの出典の行を作ります。例は「イェール輝星カタログ（パブリックドメイン）／UCAC4（CC0 1.0）」です。パッケージ自身のソースが先に並びます。ライセンス名は必ず書き、ソースのライセンスが非営利のみ、または同一条件で共有の場合は、その旨も書きます。そのため、ページが、使っているデータの条件を隠すことはできません。日本語の行では、ライセンスを（）に入れ、ソースを／でつなぎます。
- `loadRecords(source, signal, finite)`は、リストを1度だけ読み、例外は投げません。リストを凍結し、20万件を超えるものは拒否します（それより大きいデータはタイルにします）。`finite`で指定した数値のどれかが`NaN`か無限大のレコードは、読み飛ばして数えます。ソースが例外を投げるか拒否した場合は読み込みの失敗（`failed`）、中断した場合は`aborted`として返します。
- `createTileStore(options)`は、タイルをキーで読み込み、メモリの上限の中に収めます。既定の上限は全ソース合わせて48MBで、画像はミップマップ込み（バイト数の4/3）で数えます。1つのソースで同時に動く読み込みは6つまでです。読み込みが始まるのは、キーが変わったときだけです。静止中にもう一度要求しても、何も送りません。失敗したタイルは、次の変化のときにもう一度試し、タイマーでは試しません（同じキーで未取得のタイルをもう一度試したい呼び出し側は、`again`を渡します）。最も長く使われていないタイルから手放しますが、ビューがいま必要としているタイルは手放しません。それでも収まらないタイルは拒否して数えるので、保持するバイト数が上限を超えることはありません。例外を投げたタイル、空で返ったタイル、大きさが数値でないタイルは、`failed`に数えて保持せず、描画もしません。`drop(id)`は、そのソースの読み込みを中断し、タイルを解放します。

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

## ビュー側でやること

どのビューも`sources`（データは文字列ではないので、属性ではなくプロパティ）と、`remove()`を返す`addSource(source)`を持ちます。止めるには`remove()`、`removeSource(id)`、`enableSource(id, false)`を使います。`data="own"`にすると、外のソースをまとめて無視します。止めると、そのソースの読み込みが中断され、タイルが解放され、描き直されて、出典も消えます。`view.credits()`は、直前に描いたフレームに印かタイルを1つでも提供したソースを、パッケージ自身のものを先にして返します。その組み合わせが変わると、`{ credits }`を持つイベントが発生します。

パッケージ自身のデータもソースの1つなので、出典の行は、自分のデータも外のデータも同じ経路で作られます。パッケージに同梱するソースは、そのまま再配布できるものでなければなりません。非営利のみ、または同一条件で共有のものが1つでもあれば、テストが失敗します。呼び出す側のソースは、どちらでもかまいません。出典の行がそれを伝えます。

## 導入手順

1. テンプレートをコピーします。`cp ../kazoku-ui/templates/data-door.ts src/data-door.ts`
2. `pnpm check`を実行します。標準チェック（一覧の`data-door`）が、コピーをテンプレートに記録されたハッシュと照合します。
3. 設計で全パッケージに求められているテストを追加します。ソースなしなら以前と同じ描画になること。ダミーのソースで描かれるものが増え、日本語と英語の出典が表示されること。止めると最初の描画に戻り、メモリが解放されること。不正な入力は拒否されるか数えられ、描かれないこと。静止中は何も要求しないこと。容量の上限が守られること。同梱のソースがすべて問題なく再配布できること。コピーがテンプレートと同じであること。

```sh
cp ../kazoku-ui/templates/data-door.ts src/data-door.ts
pnpm check
```

テンプレートを変えるときは、このリポジトリで変え、`templates/check-standard.mjs`に新しいハッシュを書きます（kazoku-uiのテストが、その2つが一致していることを確かめます）。そのあと、すべてのパッケージのコピーを差し替えます。
