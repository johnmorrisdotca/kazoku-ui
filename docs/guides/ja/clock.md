---
title: ファミリーの時計
section: how-to
order: 24
description: ページ上のすべてのビューに、1つの時刻、1つの速さ、動いているか止まっているかを持たせます。実際に経過した時間を数え、注目している天体の速さで最初から動いていて、「動きを減らす」設定では再生を待ち、ビューは外部の時計に従えます。
---

[English](../clock.md)

`@johnmorrisdotca/kazoku-ui/clock`は、ファミリー共通の時計です。**時刻**（1970年からのミリ秒、UTC）、**速さ**（実際の1秒あたりのゲーム内の秒数）、そして**動いているか**を持ちます。もとはwakusei-planetsの`GameClock`で、すべてのパッケージと共有シーンが同じ時刻を読めるように、ここへ移しました。DOMを使わないので、サーバーでもインポートできます。

```ts no-check
import { createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock";

const clock = createFamilyClock({ start: Date.UTC(2026, 0, 1), speed: 3600 });
clock.advance();      // the moment as of this look: an hour of game time for each real second
clock.pause();        // the moment is held; the speed (3600) is kept
clock.play();         // runs on from the moment held
clock.set("now");     // follow the wall clock again
const stop = clock.onChange(({ time, running, reason }) => console.log(reason, new Date(time).toISOString(), running));
stop();
```

## 守る決まり

- **フレームごとの刻みではなく、実際に経過した時間を数えます。** `advance(now)`は、前に見たときから実際に経過した時間を、そのときの速さで足します。実時間の86,400倍なら、どの機械でも実際の1秒ごとに1日進みます。そのため、1秒に5回描くビューも、60回描くビューと（1%以内で）同じ時刻を保ちます。時計自身には上限がありません。画面の外にあったページは、その速さで進んだはずの時刻になっています。
- **一時停止は時刻を保ちます。** `pause`は時刻と速さを保ち、`play`はその時刻から進みます。止まっていた時間は数えません（実時間に従っていた時計も、再生したときに実時間へ飛びません）。速さ0でも止まります。そのあと`play`すると、時計が持っていた速さに戻ります。
- **`running`**は、一時停止でも速さ0でもないときに真になります。
- **`onChange`**は、`"tick"`を1秒に4回まで受け取ります（時計が止まっているときや、タブが非表示のときは来ません）。`"set"`、`"speed"`、`"play"`、`"pause"`はすぐ届きます。tickは`advance`から送られるので、フレームを描かないページには届きません。

## 最初から動いています

`createFamilyClock()`をオプションなしで呼ぶと、実時間から、**動いている状態**で、速さ1で始まります。注目している天体があるページは、その天体の**開始時の速さ**（その天体の動きが最初に見えてくる速さ）を`openAt(speed)`で伝えます。フォーカスが変わると`composeScene`が代わりに呼びます。`openAt`が受け入れられるのは、読む人が速さにまだ触れていない間だけです。`setSpeed`（速さのボタンで読む人が選んだ速さ）やリンクの`speed`で`touched`になり、それ以降`openAt`は速さを変えません。つまり、フォーカスを地球から火星へ移すと、誰も設定していない時計の速さは変わりますが、誰かが設定した時計は変わりません。

- **リンクに従います。** `readClockAddress("?time=2026-11-10T12:00:00Z&speed=3600&play=off")`は、`createFamilyClock`に渡す`{ start, speed, paused }`を返します。`time`は`now`、ミリ秒の数、または日時で、`play`は`on`か`off`です。`clockAddress(clock)`は、時計の状態を表すキー（`time`、`speed`、`play`）を返します。`applyParams`や、アドレスを書き込む処理に使え、`CLOCK_KEYS`がそのキーの名前です。
- **「動きを減らす」設定では、止まった表示で、再生が使える状態です。** システムが動きを減らすよう求めている読む人（`prefersReducedMotion()`が既定で読みます。オプションの`reducedMotion`で上書きできます）には、時計は開始時の速さのまま**一時停止**で始まり、再生で動き出します。リンクの`play=on`や`play=off`が優先されます。リプレイバーの`user-play`属性を付けると、動きを減らす設定でも再生ボタンが働きます。自動では何も始まらないからです。

## ビューは外部の時計に従えます

パッケージの要素は、`createClockSlot(options)`の`ClockSlot`を持ちます。要素は描くたびに`slot.clock`を読み、`slot.onChange`が呼ばれたら、もう一度描くよう求めます。1つの時計を多くのビューで共有したいページは、各ビューで`slot.attach(sharedClock)`を呼びます。すると要素は自分の`time`属性と`speed`属性を無視します（どちらへの書き込みも`slot.clock`に行きます）。`slot.detach()`は、共有の時計が持っていた時刻、速さ、一時停止の状態から始まる自分の時計をつくって返します。

```ts no-check
import { createClockSlot, createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock";

const shared = createFamilyClock();
const slot = createClockSlot({ start: Date.UTC(2026, 0, 1) });   // the view's own clock until it is handed another
const stop = slot.onChange(() => requestDraw());
slot.attach(shared);
slot.clock.time;    // shared's moment
slot.detach();      // an own clock, from that moment, at that speed
stop();
```

## テスト用の時計

`createFamilyClock({ source })`は、ページの2つの時計を`{ now, wall, hidden? }`として受け取ります。そのため、テストでは1秒に5フレームしか進まない時計や、非表示のタブを渡せます。既定は`browserSource()`です。

## 部品

| インポート | 内容 |
| --- | --- |
| `clock` | `createFamilyClock`、`createClockSlot`、`readClockAddress`、`clockAddress`、`CLOCK_KEYS`、`prefersReducedMotion`、`browserSource`と、その型。DOMなし。 |
