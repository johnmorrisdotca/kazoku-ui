---
title: ブラウザロック
section: how-to
order: 19
description: ユーザーのキャッシュフォルダにロックと先着順の待ち行列を置いて、1台のマシンでヘッドレスブラウザを同時に1つしか動かさないようにします。パッケージのPlaywright設定でも、Chromiumを起動するスクリプトでも使えます。
---

[English](../browser-lock.md)

# ブラウザロック

1台のマシンでヘッドレスブラウザを2つ同時に動かし、WebGLをソフトウェアで描くと、重いテストがタイムアウトします。そのタイムアウトは本物の失敗のように見えます。`@johnmorrisdotca/kazoku-ui/testing`のロックは、2つ目の実行を、1つ目が終わるまで待たせます。待っている実行は、来た順に動かします。

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

## しくみ

- **ファイル。** ユーザーのキャッシュフォルダの中の`kazoku-ui`にある`browser.lock`です。Macでは`~/Library/Caches`、それ以外では`$XDG_CACHE_HOME`か`~/.cache`です。ロックを持っている実行のpid、パッケージ名、フォルダ、コマンド、npmスクリプト、開始時刻がJSONで入っています。`KAZOKU_BROWSER_LOCK_DIR`を指定すると、ロック、待ち行列、優先ファイルをまとめて別のフォルダに置けます。ロック自体のテストはこれを使い、本物のロックには触れません。
- **取れるのは1つだけ。** ファイルは書き終えてからハードリンクで置くので、同時に来た2つのうち取れるのは必ず1つで、書きかけのファイルを読むこともありません。
- **待ち行列。** ロックが使用中のとき、実行は他の実行と競ってロックを何度も確かめることはしません。ロックの隣の`queue`フォルダに整理券（pid、パッケージ、フォルダ、コマンド、時刻）を書きます。ロックが空いたとき取れるのは、有効な整理券のうち一番古いものだけです。確かめる間隔を短くしても得はしません。整理券は、ロックを取ったとき、または実行が終わったときに消えます。
- **待つとき。** 待っている実行は1分に1回、今の順番を表示します。`waiting for the browser: 2nd in line, holder hoshi-stars test:demo for 12 min`のような行です。
- **落ちた実行は自動で片づく。** pidのプロセスがもう無い整理券、または2分間更新されていない整理券（待っている実行は10秒ごとに更新します）は、次に確認した実行が消します。pidのプロセスがもう無いロック、または3時間より古いロックは、引き継いで使います。プロセスを強制終了することは一切ありません。
- **手放すとき。** 普通に終わったとき、エラーのとき、SIGINT、SIGTERM、SIGHUPのときです。
- **同じプロセスの仲間。** ロックを持っている実行は`KAZOKU_BROWSER_LOCK`にトークンを入れます。それを引き継いだ子プロセス（Playwrightのワーカーや、スクリプトが起動したスクリプト）はすぐ中に入れ、ロックを手放すことはありません。
- **CI。** `CI`変数があるときは、ロックは何もしません。CIのジョブは1台のマシンで1回の実行だからです。
- **古いバージョン。** 待ち行列のない以前のロックのコードのままのパッケージも、併用できます。そのパッケージはロックが空くたびに取りに行くので、列に割り込むことはありますが、ロックや整理券を壊すことはありません。そのパッケージがこのバージョンに更新すると、列に並ぶようになります。

## 状況を見る

```sh
npx kazoku-browser-queue status
```

ブラウザを持っている実行（パッケージ、npmスクリプト、pid、経過した分数）、待っている実行（次に動く順）、優先の設定（あれば）、マシンの負荷（ロードアベレージ：1分・5分・15分の平均と、コアの数）を表示します。ロックを持っている実行が45分より長く持ち続けているときは、`WARNING:`の行も出ます。見るだけで何も変えないので、いつ実行しても安全です。このリポジトリの中では`node src/testing/cli.ts status`です。

## 待っている1つを先にする

```sh
npx kazoku-browser-queue first ~/Projects/hoshi-stars   # そのフォルダ（またはその中）の一番古い待っている実行が次に動く
npx kazoku-browser-queue first --clear                  # 優先を外す
```

このコマンドは、ロックの隣の`priority`ファイルにフォルダを書きます（コードからは`setBrowserPriority(folder)`と`setBrowserPriority(null)`が同じことをします。`orderBrowserQueue(tickets, priority)`は、整理券の一覧を動く順に並べる純粋な関数です）。ロックを持っている実行は止めません。指名した待っている実行が、次に動きます。優先は1回限りで、その実行がロックを取ると消えます。次の1つを先にしたいときは、もう一度設定します。誰も待っていないフォルダを指名しても、何も起きません。

## 誰が持っているか

`browserQueueStatus()`は同じ内容をオブジェクトで返します。`{ file, holder, stale, heldMinutes, queue, priority, warnings }`です。`browserLockStatus()`は`{ file, holder, stale }`を返します。`clearBrowserLock({ force })`は古いロックを消し、`force: true`なら、どんなロックでも消します。これらはコマンドにもなっています。

```sh
npx kazoku-browser-lock status          # free, or who holds it and who waits; exit 1 while a live run holds it
npx kazoku-browser-lock clear           # remove a stale lock; refuses while the holder is running
npx kazoku-browser-lock clear --force   # remove it anyway
```

`kazoku-browser-queue`と`kazoku-browser-lock`は同じコマンドです。
