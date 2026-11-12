---
title: ブラウザロック
section: how-to
order: 19
description: ユーザーのキャッシュフォルダにロックと先着順の待ち行列を置いて、1台のマシンでヘッドレスブラウザを同時に1つしか動かさないようにします。パッケージのPlaywright設定でも、Chromiumを起動するスクリプトでも使えます。CIと同じPlaywrightイメージで動かす実行には専用のスロットがあり、CPUとメモリを区切ったうえで、ネイティブの実行と並べて複数を同時に動かせます。
---

[English](../browser-lock.md)

# ブラウザロック

1台のマシンでヘッドレスブラウザを2つ同時に動かし、WebGLをソフトウェアで描くと、重いテストがタイムアウトします。そのタイムアウトは本物の失敗のように見えます。`@johnmorrisdotca/kazoku-ui/testing`のロックは、2つ目の実行を、1つ目が終わるまで待たせます。待っている実行は、来た順に動かします。

CIと同じPlaywrightイメージで動かす実行は例外です。CPUとメモリを区切ったコンテナで動くので、互いに遅くならず、ネイティブの実行も遅くしません。1台のマシンで複数を同時に動かせます。詳しくは[CIと同じイメージで動かす](#ciと同じイメージで動かす)を参照してください。

## Playwright

`playwright.config`に1行足すだけです。

```js no-check
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "@johnmorrisdotca/kazoku-ui/testing/global-setup",
  // ...the projects, with launchOptions: { args: [...SOFTWARE_GL_ARGS] }
});
```

ランナーは最初のテストの前にロックを取り、実行が終わると手放します。ランナーが起動するワーカーはロックを引き継ぐので、待ちません。

## Chromiumを起動するスクリプト

```js no-check
import { chromium } from "@playwright/test";
import { SOFTWARE_GL_ARGS, withBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

await withBrowserLock(async () => {
  const browser = await chromium.launch({ args: [...SOFTWARE_GL_ARGS] });
  try {
    // ...use the browser
  } finally {
    await browser.close();
  }
});
```

`withBrowserLock(fn)`は、ロックを取り、`fn`を動かし、`fn`が例外を投げても必ずロックを手放します。取る場所と手放す場所が別のときは、`const lock = await acquireBrowserLock()`と`lock.release()`を使います。どちらも`{ pollMs, reportMs, maxAgeMs, log }`を受け取ります（`reportMs`は指定しなければ1分です）。

## CIと同じイメージで動かす

```sh
npx kazoku-ci-image -- test e2e/renderer.demo.mjs --project=chromium-desk
npx kazoku-ci-image --cpus 4 --memory 12g -- test --project=webkit-desk --shard=1/2
```

`kazoku-ci-image [--cpus 3] [--memory 8g] [--out dir] [--setup "cmd"] [--node 24] [--dry-run] -- <playwrightの引数>`（`kazoku-browser-queue ci-image ...`でも同じです）は、CIと同じ場所でPlaywrightを動かします。

1. パッケージのロックファイルから`@playwright/test`のバージョンを読み、`mcr.microsoft.com/playwright:v<バージョン>-noble`を使います。イメージの取得は最初の1回だけです。
2. イメージスロット（後述）を取ります。全部使われているときは待ちます。
3. `--ipc=host`、`--cpus`、`--memory`（スワップも含むので、上限は守られます）、`CI=true`を付けてコンテナを起動します。パッケージストアは`kazoku-ci-cache`という名前付きボリュームに残り、次の実行で使われます。
4. gitが追跡しているファイルと、gitが無視しないファイルを、tarのストリームでコンテナにコピーします。tarは先に完成させてから送るので、tarが失敗したときは、中途半端なリポジトリのまま動かさず、実行を止めます。Macの`node_modules`、`dist`、すべての`.env*`ファイルは入らず、バインドマウントもしないので、Linuxは自分用のものをインストールします。
5. コンテナの中で、`packageManager`のバージョンのpnpmを入れ、`pnpm install --frozen-lockfile`を実行し、ビルドし（`pnpm build`、続いて`site`スクリプトがあれば`pnpm site`。`site`スクリプトが先にビルドも行うときは、ビルドを2回しません）、渡された引数で`pnpm exec playwright`を実行します。`--setup "cmd"`はビルドを置き換えます。イメージのNodeがCIと違うときは、`--node 24`で、CIの`setup-node`と同じようにそのNodeを入れます。
6. `test-results`と`playwright-report`を、その実行専用のフォルダ`test-results/ci-image/<時刻>-<pid>`にコピーします（新しいほうから10回分を残します。`--out dir`で別のフォルダを指定できます）。並べて動かした実行が互いの結果を上書きすることはありません。そのあと、Playwrightの終了コードをそのまま返し、コンテナを削除します。Ctrl-Cやkillのときも削除します。いきなり強制終了されて残ったコンテナは、次の実行が削除します。

Playwrightの最初の引数（`test`など）は省けます（`-- e2e/a.demo.mjs`は`test e2e/a.demo.mjs`の意味です）。`--workers`を指定しなければ、ワーカー数はコンテナのCPU数の半分になります。Dockerが動いていないときは、その旨を表示して終了し（終了コード3）、スロットは取りません。`--dry-run`は、イメージ、コンテナのオプション、スクリプトを表示するだけで、何も実行しません。

**使う場面。**

- **CIでしか出ない失敗。** CIのdemoジョブはこのイメージで動きます。ローカルのネイティブ実行は、フォントも、ブラウザのビルドも、グラフィックドライバも違います。
- **システムのフォントに左右される文字の幅やレイアウト。**
- **WebKit。** ネイティブのWebKitにはソフトウェアGLの切り替えがないので、ネイティブ実行はWebGLのページをスキップします。イメージの中では、CIと同じく、そのページも動かします。
- **ソフトウェアGLのスペック**（レンダラー、シーン、ボディラベル）。CIも同じ描き方をします。
- **重い実行を並べて動かす。** 重いスペック2つ（レンダラーとシーン）は、Mac Studioで、順番に動かすと52秒、同時に動かすと27秒でした。それぞれ単独だと、インストールとビルドを含めて約25秒です。

1つのスペックをさっと試すだけなら、ネイティブ実行のほうが始まるのが速く、`pnpm test:demo`もそうしています。

## スロット

マシンには、ネイティブスロットとイメージスロットがあり、数は`~/.config/kazoku-ui/browser-slots.json`に書きます（`KAZOKU_BROWSER_SLOTS_FILE`で別のファイルを指定できます）。

```json
{ "native": 1, "image": 4 }
```

- **`native`**は、ネイティブの実行が同時にブラウザを持てる数です。1未満にはならず、1が適切です。タイミングのテストは互いに邪魔をするからです。ネイティブの実行（`globalSetup`、`withBrowserLock`）は1つ取ります。
- **`image`**は、CIイメージの実行が同時にスロットを持てる数です。マシンに合わせて決めます。Docker DesktopのCPU数を`--cpus`で割った数です（CPUが16個で1実行あたり3個なら5。4にすればネイティブの実行の分に余裕ができます）。コアが20個でDockerのCPUが16個のMac Studioは4、ノートPCは2、余裕のないマシンは0か1です。
- **ファイルがないか、`image`が0のとき**（初期値）は、ネイティブスロットが1つで、イメージスロットはありません。そのマシンは今までと何も変わらず、`kazoku-ci-image`は、設定する場所を書いたメッセージを表示して止まります。どのマシンも、誰かがファイルを書いたときだけ変わります。

2種類のスロットは互いを待ちません。ネイティブの実行がスロットを持っている間も、`image`個までのコンテナがその隣で並んで動きます。同じ種類の中では先着順で、待っている実行は1分に1回、`waiting for an image slot: 1st in line, 4 of 4 slots held, the longest by ...`と表示します。pidのプロセスがもう無い実行が持っていたスロットは、これまでどおり空きます。コードからは`acquireBrowserLock({ kind: "image" })`でイメージスロットを取れます（マシンにイメージスロットがないときは例外を投げます）。`browserSlots()`はファイルを読み、`slotsFile()`はそのファイルの場所を返します。`runCiImage(options)`はこのコマンドを関数にしたもの、`ciImagePlan(options)`はDockerに触れずにイメージ、手順、スクリプトを求めるもの、`playwrightVersion(lockfileText)`はロックファイルの文字列からバージョンを読むものです。

## しくみ

- **ファイル。** ユーザーのキャッシュフォルダ（Macでは`~/Library/Caches`、それ以外では`$XDG_CACHE_HOME`か`~/.cache`）の中の`kazoku-ui`に、`browser.lock`（最初のネイティブスロットです。イメージスロットは`browser.image-1.lock`から始まります）があります。ロックを持っている実行のpid、パッケージ名、フォルダ、コマンド、npmスクリプト、開始時刻がJSONで入っています。`KAZOKU_BROWSER_LOCK_DIR`を指定すると、ロック、待ち行列、優先ファイルをまとめて別のフォルダに置けます。ロック自体のテストはこれを使い、本物のロックには触れません。
- **取れるのは1つだけ。** ファイルは書き終えてからハードリンクで置くので、同時に来た2つのうち取れるのは必ず1つで、書きかけのファイルを読むこともありません。
- **待ち行列。** ロックが使用中のとき、実行は他の実行と競ってロックを何度も確かめることはしません。ロックの隣の`queue`フォルダ（CIイメージの実行は`queue-image`）に整理券（pid、パッケージ、フォルダ、コマンド、時刻）を書きます。ロックが空いたとき取れるのは、有効な整理券のうち一番古いものだけです。確かめる間隔を短くしても得はしません。整理券は、ロックを取ったとき、または実行が終わったときに消えます。
- **待つとき。** 待っている実行は1分に1回、今の順番を表示します。`waiting for the browser: 2nd in line, holder hoshi-stars test:demo for 12 min`のような行です。
- **落ちた実行は自動で片づく。** pidのプロセスがもう無い整理券、または2分間更新されていない整理券（待っている実行は10秒ごとに更新します）は、次に確認した実行が消します。pidのプロセスがもう無いロック、または3時間より古いロックは、引き継いで使います。プロセスを強制終了することは一切ありません。
- **手放すとき。** 普通に終わったとき、エラーのとき、SIGINT、SIGTERM、SIGHUPのときです。
- **同じプロセスの仲間。** ロックを持っている実行は`KAZOKU_BROWSER_LOCK`にトークンを入れます。それを引き継いだ子プロセス（Playwrightのワーカーや、スクリプトが起動したスクリプト）はすぐ中に入れ、ロックを手放すことはありません。
- **CI。** `CI`変数があるときは、ロックは何もしません。CIのジョブは1台のマシンで1回の実行だからです。
- **古いバージョン。** 待ち行列のない以前のロックのコードのままのパッケージも、併用できます。そのパッケージはロックが空くたびに取りに行くので、列に割り込むことはありますが、ロックや整理券を壊すことはありません。そのパッケージがこのバージョンに更新すると、列に並ぶようになります。イメージスロットができる前のバージョンで動く実行は、ネイティブの実行の整理券がある`queue`フォルダだけを読み、イメージスロットは見えません。CIイメージの実行の整理券は`queue-image`に置かれるので、CIイメージの実行がその古い実行の前に並ぶことはなく、古い実行がCIイメージの実行を待つこともありません。

## 状況を見る

```sh
npx kazoku-browser-queue status
```

各スロットとそれを持っている実行（パッケージ、npmスクリプト、pid、経過した分数）、イメージスロットの使用数、待っている実行（次に動く順。ブラウザの待ち行列と、イメージスロットの待ち行列の両方）、優先の設定（あれば）、マシンの負荷（ロードアベレージ：1分・5分・15分の平均と、コアの数）を表示します。ロックを持っている実行が45分を超えて持ち続けているときは、`WARNING:`の行も出ます。見るだけで何も変えないので、いつ実行しても安全です。このリポジトリの中では`node src/testing/cli.ts status`です。

## 待っている1つを先にする

```sh
npx kazoku-browser-queue first ~/Projects/hoshi-stars   # そのフォルダ（またはその中）の一番古い待っている実行が次に動く
npx kazoku-browser-queue first --clear                  # 優先を外す
npx kazoku-browser-queue first ~/Projects/hoshi-stars --image   # 同じことを、イメージスロットの待ち行列で行う
```

このコマンドは、ロックの隣の`priority`ファイル（`--image`のときは`priority-image`。待ち行列も優先も、種類ごとに別です）にフォルダを書きます（コードからは`setBrowserPriority(folder)`と`setBrowserPriority(null)`が同じことをします。`orderBrowserQueue(tickets, priority)`は、整理券の一覧を動く順に並べる純粋な関数です）。ロックを持っている実行は止めません。指名した待っている実行が、次に動きます。優先は1回限りで、その実行がロックを取ると消えます。次の1つを先にしたいときは、もう一度設定します。誰も待っていないフォルダを指名しても、何も起きません。

## 誰が持っているか

`browserQueueStatus()`は同じ内容をオブジェクトで返します。`{ file, holder, stale, heldMinutes, slots, configured, queue, priority, imagePriority, warnings }`です（`file`、`holder`、`stale`、`heldMinutes`は最初のネイティブスロットのもので、`slots`は全スロットです）。`browserSlotStatuses()`はスロットだけを返します。`browserLockStatus()`は`{ file, holder, stale }`を返します。`clearBrowserLock({ force })`はどのスロットの古いロックも消し、`force: true`なら、どんなロックでも消します。これらはコマンドにもなっています。

```sh
npx kazoku-browser-lock status          # 空いているか、誰が持っていて誰が待っているかを表示。動いている実行がネイティブスロットを持っている間は終了コード1。CIイメージの実行は数えない
npx kazoku-browser-lock clear           # 古いロックを消す。持っている実行が動いている間は消さない
npx kazoku-browser-lock clear --force   # それでも消す
```

`kazoku-browser-queue`と`kazoku-browser-lock`は同じコマンドです。
