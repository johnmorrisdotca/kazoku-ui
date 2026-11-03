---
title: アップグレード
section: upgrading
order: 14
description: 0.7から0.13まで、各バージョンで対応が必要な変更、既定値が変わったもの、削除されたもの、今も使えるものをまとめます。
---

[English](../upgrading.md)

このパッケージは初期開発中（0.x）なので、マイナーバージョンでインターフェースが増えることがあります。このページには、対応が必要なものを、新しいものから順に書きます。日付つきの完全な記録は、[変更履歴](../../../CHANGELOG.md)にあります。

## 0.13へ

- **ホイールでズームします。** ビューの上でふつうのホイールを回すと、地図と同じように、ポインターを中心にズームします。ホイールが、フォーカスのあるビューを傾けることは、もうありません。Shiftを押しながらのホイール、または横へのスワイプでは、これまでどおり回転します。ポインターがビューの外にあるときは、ホイールでページがスクロールします。ズームがその向きの端に達しているときに、ホイールを新たに回し始めた場合も、ページがスクロールします。ページで「Ctrlキーを押しながらズーム」と案内している場合は、「ホイールでズーム」と書けます。Ctrlを押しながらのホイールも、引き続き使えます。
- `wheelZoomFactor`は3つ目の引数を取ります。`"pinch"`（既定。これまでと同じ）か`"wheel"`です。`WHEEL_GESTURE_MS`が加わりました。`key-tilt="wheel"`は、今も上下の矢印キーの向きを入れ替えます。

## 0.12へ

対応は不要です。新しい`layout`属性（`horizontal`、`vertical`、`compact`）とズームスライダーは、使うと決めたときだけ働き、レイアウトを指定しないページは、これまでとまったく同じに見えます。スライダーの計算はエクスポートされています（`zoomMarks`、`zoomPosition`、`zoomAtPosition`、`zoomStep`、`zoomToMark`、`zoomSnap`、`COMMON_ZOOMS`、`MARK_GAP`、`SLIDER_STEP`、`SNAP_PX`）。[レイアウトとズームスライダー](layouts-and-zoom.md)を参照してください。

## 0.11へ

- ズームしたり動かしたりすると、**中央**ボタンが現れます。`element.centre()`と`controller.centre(animate)`、両方の言語の`centre`の言葉です。ラベルをすべて自前の表に置き換えている場合は、これを加えてください。
- **正確なつかみ**は、指定したときだけ働きます。`grab-radius`と`grabRadius`です。`degreesPerPixel`が新しく、`dragTurn`は`grabRadius`の引数を受け取ります。
- **ドラッグの決まり**が文書化され、共有のブラウザー検査が`templates/e2e-ground.mjs`にあります。

## 0.10.1へ

- `onContext("restored")`は、ドキュメントに書かれていたとおり、ブラウザーがWebGLコンテキストを返したときに呼ばれるようになりました。`"lost"`と`"unavailable"`だけを扱っていたページは影響を受けません。
- ローカルのポートが8400から8499に移りました（デモは8400、テストは8401、画像のスクリプトは8402）。
- `reusable-release.yml`に`require-ci-workflow`の入力が加わりました。

## 0.10へ

- **`2×`ボタンはなくなりました。** あれは数値表示のように見えるプリセットでした。ズームの縮小と拡大の間にある数値表示が、バーにある唯一の本当のズーム値で、押すと全体表示に戻ります。古いボタンを待ち受けていたページも、対応は要りません。
- ビューが回っているあいだ、basicには、自動回転の横に小さな**速さ**ボタンが出ます。
- 数値表示は、下げた`zoom-max`や上げた`zoom-min`に従います。要素を移動しても2つ目のループが動き続けることはなくなり、自動回転は、ビューが見えないあいだ、要素をどう使っていても、フレームを要求しません。
- `templates/check-standard.mjs`は、必須項目の一覧を検査にしたもので、各パッケージにそのままコピーされます。

## 0.9へ

- **共有レンダラー**（`/renderer`）と**フリーズ検査**（`/testing`）が新しくなりました。three.jsは省略可能なピア依存で、バンドルされることはありません。
- 0.9.1：フリーズテストのない3Dのリリースはしないこと、そして、すべてのパッケージのPlaywrightの設定向けの`SOFTWARE_GL_ARGS`。

## 0.8へ

- **既定のバーが簡潔になりました。** 傾き、正面、移動パッド、移動か回転の切り替えは、「詳細」の奥にあります。最初から出したいページは`controls="advanced"`にします。ユーザーの選択は`localStorage`に記憶されます。
- ズームの数値表示と、自動回転の速さ（ゆっくり、ふつう、はやい）が新しくなりました。新しい純粋なエクスポート：`parseLevel`、`parsePace`、`zoomText`、`PACES`、`PACE_FACTOR`、`LEVEL_STORAGE_KEY`。
- 新しいラベル`zoomLevel`、`zoomReset`、`more`、`speed`、`slow`、`medium`、`fast`。ラベルをすべて置き換えている場合は、これらを加えてください。

## アップグレードの確認

```js
import { LAYOUTS, LEVEL_STORAGE_KEY, PACES, parseLayout, parseLevel } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(LAYOUTS.join(" "));
console.log(parseLayout(undefined), parseLevel("basic"), PACES.join(" "), LEVEL_STORAGE_KEY);
// classic horizontal vertical compact
// classic basic slow medium fast kazoku-view-controls
```

## バージョンの固定

1.0までは、テストしたマイナーバージョン（`~0.13.0`）に固定し、アップグレードのたびに、このページと変更履歴を読んでください。あとから加わる部品（画像タイルの選択、ヘルプ、GitHubとnpmのピル、ファミリーの背景）は、新しいサブパスで、すでにあるものは何も変えません。
