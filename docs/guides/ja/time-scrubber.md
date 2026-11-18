---
title: 時間スクラバー
section: how-to
order: 31
description: 年から日まで動かせる日付スライダーと、日付の入力欄です。リプレイバーや、時間とともに動くビューに使えます。矢印キー、Page Up / Page Down、マウス、指で操作でき、英語と日本語に対応します。
---

[English](../time-scrubber.md)

`<kazoku-time-scrubber>`は、範囲の中から日付を選ぶスライダーと、日付の入力欄です。要素自身は何も動かしません。ページが`kazoku-timechange`イベントを受け取り、その日を表示します。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/time-scrubber/define";
</script>

<kazoku-time-scrubber from="1957-10-04" to="2030-12-31" value="2026-11-17" address></kazoku-time-scrubber>
```

## 年から日まで

70年にわたる範囲を、スマートフォンで1日単位までドラッグして合わせるのは無理があります。そこでスライダーには3つの刻みがあり、「年」「月」「日」のボタンで選びます。

| 刻み | トラックに表示される範囲 | 矢印キー1回 | Page Up / Page Down |
| --- | --- | --- | --- |
| 年 | 範囲全体 | 1年 | 10年 |
| 月 | 選んだ日付の年 | 1か月 | 1年 |
| 日 | 選んだ日付の月 | 1日 | 1か月 |

トラックを押すかドラッグすると、ポインターの位置にある年、月、または日が選ばれ、それより細かい部分は保たれます（「月」の刻みでドラッグしても日は変わりません）。HomeとEndで、範囲の最初の日と最後の日へ移ります。月末を越える移動は、移動先の月の最終日になります（1月31日の1か月後は2月の最終日）。ホバーが必要な操作はなく、ドラッグはマウス、指、ペンのどれでもできます。

## 日付の入力欄

`2026-11-17`、`2026/11/17`、`2026年11月17日`、`2026-11`（1日として）、`2026`（1月1日として）を読み取ります。全角の数字も使えます。Enterを押すか欄を離れると反映されます。存在しない日付（`2026-02-30`）は、メッセージを出して受け付けず、入力した文字はそのまま残ります。Escapeで元の日付に戻ります。範囲の外の日付は、いちばん近い端に寄せられます。`no-field`で入力欄を省けます。

## 属性とイベント

`from`と`to`が範囲です（省くと1900-01-01から2100-12-31）。`value`がその日、`scale`は`year`、`month`、`day`のどれかです。`address`を付けると、日が`date=2026-11-17`、刻みが`date-scale=day`としてアドレスに残ります（`address-key`で前者の名前を変えられ、刻みは`<キー>-scale`になります）。`label`は全体の名前です。プロパティの`value`（ミリ秒、UTCの0時）と`scale`、自分のラベルを渡す`words`もあります。

`kazoku-timechange`イベントは`{ value, date, scale, reason }`を持ちます。`reason`は`init`、`user`、`set`のどれかです。イベントはバブリングし、シャドウルートも越えます。

スライダーは`role="slider"`で、`aria-valuemin`、`aria-valuemax`、`aria-valuenow`はミリ秒です。`aria-valuetext`は選択中の刻みに合わせた日付を読み上げます（`2026年`、`2026年11月`、`2026年11月17日`）。

## リプレイバーの中で

`<kazoku-replay-bar>`に`scrub`を付けると、ボタンの下の行にスライダーが入ります。`range-from`と`range-to`が範囲、`date`がその日、`date-scale`が刻みです。動かしても、再生も一時停止も最初に戻ることも起こらず、ページは同じ`kazoku-timechange`を受け取ります。

```html
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/replay-bar/define";
</script>

<kazoku-replay-bar scrub range-from="1957-10-04" range-to="2030-12-31" date="2026-11-17" address></kazoku-replay-bar>
```

## 部品

| インポート | 中身 |
| --- | --- |
| `time-scrubber/define` | `defineTimeScrubber()`を実行します。名前が空いているときだけ`<kazoku-time-scrubber>`を登録します。 |
| `time-scrubber/element` | クラス`TimeScrubberElement`。自分で登録したいときに使います。 |
| `time-scrubber` | DOMを使わない部分：日付の読み書き（`parseDate`、`isoDate`、`fieldText`、`valueText`、`partsOf`、`daysIn`）、日付の移動（`stepBy`、`keyMove`、`applyMove`、`coarserOf`）、トラック（`windowFor`、`fractionOf`、`momentAt`、`ticksFor`）、刻み（`SCALES`、`scaleOf`）、既定値（`DATE_KEY`は`date`、`DEFAULT_FROM`、`DEFAULT_TO`、`DAY_MS`）と、ラベル。 |
