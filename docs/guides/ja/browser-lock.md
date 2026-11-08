---
title: ブラウザロック
section: how-to
order: 19
description: ユーザーのキャッシュフォルダにロックを置いて、1台のマシンでヘッドレスブラウザを同時に1つしか動かさないようにします。パッケージのPlaywright設定でも、Chromiumを起動するスクリプトでも使えます。
---

[English](../browser-lock.md)

# ブラウザロック

1台のマシンでヘッドレスブラウザを2つ同時に動かし、WebGLをソフトウェアで描くと、重いテストがタイムアウトします。そのタイムアウトは本物の失敗のように見えます。`@johnmorrisdotca/kazoku-ui/testing`のロックは、2つ目の実行を、1つ目が終わるまで待たせます。

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

`withBrowserLock(fn)`は、ロックを取り、`fn`を動かし、`fn`が例外を投げても必ずロックを手放します。取る場所と手放す場所が別のときは、`const lock = await acquireBrowserLock()`と`lock.release()`を使います。どちらも`{ pollMs, reportMs, maxAgeMs, log }`を受け取ります。

## しくみ

- **ファイル。** ユーザーのキャッシュフォルダの中の`kazoku-ui`にある`browser.lock`です。Macでは`~/Library/Caches`、それ以外では`$XDG_CACHE_HOME`か`~/.cache`です。持っている実行のpid、パッケージ名、フォルダ、コマンド、開始時刻がJSONで入っています。
- **同時に取れない。** ファイルは書き終えてからハードリンクで置くので、同時に来た2つのうち取れるのは必ず1つで、書きかけのファイルを読むこともありません。
- **待つとき。** 2つ目の実行は0.5秒ごとにもう一度見に行き、30秒ごとに`waiting for the browser lock: held by <repo> pid <n> since <time>`と表示します。
- **古いロック。** pidがもう無いロック、または3時間より古いロックは、引き継いで使います。
- **手放すとき。** 普通に終わったとき、エラーのとき、SIGINT、SIGTERM、SIGHUPのときです。
- **同じプロセスの仲間。** 持っている実行は`KAZOKU_BROWSER_LOCK`にトークンを入れます。それを引き継いだ子プロセス（Playwrightのワーカーや、スクリプトが起動したスクリプト）はすぐ中に入れ、ロックを手放すことはありません。
- **CI。** `CI`変数があるときは、ロックは何もしません。CIのジョブは1台のマシンで1回の実行だからです。

## 誰が持っているか

`browserLockStatus()`は`{ file, holder, stale }`を返します。`clearBrowserLock({ force })`は古いロックを消し、`force: true`なら、どんなロックでも消します。同じ2つがコマンドにもなっています。

```sh
npx kazoku-browser-lock status          # free, or who holds it; exit 1 while a live run holds it
npx kazoku-browser-lock clear           # remove a stale lock; refuses while the holder is running
npx kazoku-browser-lock clear --force   # remove it anyway
```
