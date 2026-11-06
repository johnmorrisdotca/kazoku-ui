---
title: ビューのコントローラーと計算
section: how-to
order: 4
description: 要素なしでコントローラーを使い、自前のボタンを描くページに対応し、ビューの中のボタンやリンクを生かし、カメラの計算を直接呼びます。
---

[English](../view-controller.md)

`createViewController`は、要素と同じ操作と状態を、マークアップなしで提供します。自前のボタンを描くページ向けです。DOMに触れるのは`bind`だけなので、ページなしで作り、動かし、テストできます。

![デモのバー。角度のスライダー、自動回転、ズーム、全体表示、詳細](../../images/hero-light.webp)

## 使い方

```js
import { createViewController } from "@johnmorrisdotca/kazoku-ui/view-controls";

const seen = [];
const view = createViewController({
  speed: 30, // degrees a second for Auto-turn
  clock: { request: () => 0, cancel() {} }, // the one place time comes in: a test turns it by hand
  onChange(state, { final, reason }) {
    seen.push(`${reason}${final ? "!" : ""}`);
  },
});
view.set({ yaw: 40, tilt: 10 });
view.zoomBy(1.4);
console.log(view.state.yaw, view.state.tilt, view.state.zoom);
view.front();
console.log(view.state.yaw, view.state.tilt, view.state.turning);
console.log(seen.join(" "));
view.destroy();
// 40 10 1.4
// 0 0 false
// set! zoom! front!
```

ページでは、`bind`が、要素のポインター、ピンチ、ホイール、キーの操作をコントローラーに結びつけ、解除する関数を返します。

```js no-run
import { createViewController } from "@johnmorrisdotca/kazoku-ui/view-controls";

const view = createViewController({ onChange: (state) => draw(state) }); // { yaw, tilt, zoom, panX, panY, turning, drag }
const unbind = view.bind(document.getElementById("scene")); // pointer, pinch, wheel, keys
myPlayButton.onclick = () => view.toggle();
myZoomIn.onclick = () => view.zoomBy(1.4);
```

自動回転は、ビューが見えないあいだは止まります。要素が画面の外にスクロールされているとき、タブが非表示のときです。フレームのループが止まるので、アニメーションフレームは要求されません。`state.turning`は真のままで、ビューが戻れば、止まったところから回転が続きます。

## オプションとメンバー

`createViewController`は、`initial`、`turnable`、`speed`、`limits`、`zoom`（`"fit"`か数値）、`fitScale`、`ignore`、`anchor`、`keyTilt`、`stopTurn`、`tiltStep`、`grabRadius`、`objectSize`、`size`、`onChange`、`clock`を受け取ります。`clock`は時間が入ってくる唯一の場所です。テストでは自前のものを渡し、コントローラーを手で回します。

| メンバー | |
|---|---|
| `state` | 現在の`{ yaw, tilt, zoom, panX, panY, turning, drag }`。 |
| `set(next, final?, reason?)` | 状態のどれかを変えます。 |
| `play(seconds?)`、`pause()`、`toggle()` | 自動回転。秒数の上限を付けられます。 |
| `front()`、`fit()`、`centre(animate?)` | 角度を0に、ズームを全体表示に、オブジェクトを中央に戻します。 |
| `zoomAt(next, at?, final?)`、`zoomBy(factor, at?)` | 指定した点（なければアンカー、それもなければビューの中心）を中心にズームします。 |
| `panBy(stepsX, stepsY)` | ビューの大きさの何分の1かずつ動かします。 |
| `setDrag(mode)` | ズーム中のふつうのドラッグの働き：`"move"`か`"turn"`。 |
| `suspendTurn()`、`resumeTurn()`、`holdTurn()`、`releaseTurn()` | 理由ごとに回転を止めます。回数が数えられるので、入れ子にできます。 |
| `bind(view)`、`destroy()` | 操作を結びつけます。すべて手放します。 |
| `anchor`、`ignore`、`keyTilt`、`stopTurn`、`tiltStep`、`grabRadius`、`objectSize` | いつでも変えられるオプションです。 |
| `fitScale`、`startZoom`、`setFitScale(n)`、`setStartZoom(zoom)` | ズーム1が何を意味するか、どこで開くか。 |

## ビューの中のボタンとリンク

操作は、ビューのポインターを捕まえるので、中に置いたボタンやリンクを押すと、ドラッグと見なされてクリックが失われます。`ignore`に一致するものへの押下は、そのままになり（捕捉もドラッグもダブルタップもなし）、クリックが通ります。`DEFAULT_IGNORE`は既定のセレクター`button, a, input, select, textarea, label, [data-kazoku-ignore]`です。ほかの子要素には`data-kazoku-ignore`を付けてください。

`ignore`はシャドウDOMの中も見通します。イベントの経路上のすべての要素を調べるので、コンポーネントの開いたシャドウルートの中のボタンは、イベントの対象がコンポーネントであっても、そのままになります。閉じたシャドウルートは中が見えないので、ホスト要素に印を付けてください。

```js
import { DEFAULT_IGNORE, DEFAULT_KEYS, DEFAULT_LIMITS, EVENT, LEVEL_STORAGE_KEY, TAG } from "@johnmorrisdotca/kazoku-ui/view-controls";

console.log(DEFAULT_IGNORE);
console.log(JSON.stringify(DEFAULT_LIMITS));
console.log(TAG, EVENT, LEVEL_STORAGE_KEY);
console.log(Object.keys(DEFAULT_KEYS).join(" "));
// button, a, input, select, textarea, label, [data-kazoku-ignore]
// {"tiltMax":30,"rollMax":180,"zoomMin":1,"zoomMax":5}
// kazoku-view-controls kazoku-viewchange kazoku-view-controls
// yaw tilt zoom drag speed direction roll axis tiltDirection rollDirection
```

## 自分で決めた点を中心にズームする

ズームのボタンとキーにはポインターがないので、ビューの中心を中心にズームします。シーンの中心がビューの中心と違うときは、全体表示のときのビューの中心からのピクセルで、その位置を教えます（`controls.anchor = { x: 60, y: -30 }`、またはコントローラーの`anchor`）。ズームはシーンのその点を中心に行われるので、ユーザーがどれだけ拡大していても、その点は画面上で動きません。

## 計算

カメラは`{ yaw, tilt, zoom, panX, panY }`で、どのジェスチャーもそれに対する純粋な関数です。サーバーでもインポートでき、コントローラー自身が使っているものです。

| 関数・定数 | 働き |
|---|---|
| `clamp(value, low, high)` | 数を2つの値の間に収めます。 |
| `wrapYaw(angle)` | 角度を[-180, 180)に収めます。 |
| `between(from, to, fraction)` | あるカメラから別のカメラへの途中。ゆるやかに止まります。中央に戻す動きです。 |
| `zoomAbout(camera, next, at, limits?)` | 点`at`を動かさずに`next`へズームします。 |
| `clampPan(camera, size, object?)` | オブジェクトを見失わないよう、移動を制限します。 |
| `pinchTo(start, a, b, centre, limits?)` | 2本の指が`a`と`b`にあるときのカメラ。 |
| `dragTurn(start, dx, dy, size, tips, limits?, step?, grabRadius?)` | 1点のドラッグによる回転。指では傾きません。 |
| `degreesPerPixel(radius)` | 画面上の半径がその値の球で、1ピクセルのドラッグが回す度数。 |
| `wheelMove(event, page?)` | ホイール1回の操作。Ctrl、Command、またはAltではズーム。ふつうのホイールでは移動。Shiftでは横へ移動。正のdeltaは、絵を上または左へ動かします。 |
| `wheelPanPixels(delta, deltaMode, page?)` | ホイールの1軸が動かすピクセル数。1行は16ピクセル、1ページは`page`ピクセルです。 |
| `wheelZoomFactor(deltaY, deltaMode, kind)` | ズームするホイールの倍率。`kind`は`"pinch"`（既定。CtrlかCommandを押したホイール）か`"wheel"`（Altとマウスホイール。1目盛りで約1.2倍）。 |
| `WHEEL_GESTURE_MS` | 間隔が300ミリ秒より短いホイールの動きは、ホイールの1回の回転、または1回のスワイプとして扱います。 |
| `TURN_ACROSS`、`TILT_ACROSS` | ビューの幅いっぱいでの回転の度数（180）と、高さいっぱいでの傾きの度数（60）。 |
| `ZOOM_STEP`、`PAN_STEP`、`ZOOMED` | ズームボタンの倍率（1.4）、矢印パッドの1歩（ビューの4分の1）、これ以下のズームでは「ズームしていない」と見なす値。 |
| `PACES`、`PACE_FACTOR`、`parsePace`、`parseLevel` | 自動回転の速さ（ゆっくり、ふつう、はやい）とレベル（`basic`、`advanced`）、属性の読み方。 |

```js
import { PACE_FACTOR, PACES, PAN_STEP, TILT_ACROSS, TURN_ACROSS, ZOOMED, ZOOM_STEP, between, clamp, clampPan, degreesPerPixel, dragTurn, parseLevel, parsePace, pinchTo, wheelZoomFactor, wrapYaw, zoomAbout } from "@johnmorrisdotca/kazoku-ui/view-controls";

const camera = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 };
console.log(clamp(7, 0, 5), wrapYaw(190), wrapYaw(-190));
const zoomed = zoomAbout(camera, 2, { x: 50, y: 0 });
console.log(zoomed.zoom, zoomed.panX);
console.log(JSON.stringify(dragTurn(camera, 90, 0, { width: 360, height: 240 }, false)));
console.log(JSON.stringify(clampPan({ ...camera, zoom: 2, panX: 999 }, { width: 400, height: 300 })));
console.log(degreesPerPixel(100).toFixed(3), TURN_ACROSS, TILT_ACROSS, ZOOM_STEP, PAN_STEP, ZOOMED);
console.log(between(camera, { ...camera, yaw: 90 }, 1).yaw, typeof pinchTo, wheelZoomFactor(-100, 0) > 1);
console.log(PACES.join(" "), JSON.stringify(PACE_FACTOR), parsePace("fast"), parseLevel("advanced"), parseLevel("x"));
// 5 -170 170
// 2 -50
// {"yaw":45,"tilt":0}
// {"yaw":0,"tilt":0,"zoom":2,"panX":200,"panY":0}
// 0.573 180 60 1.4 0.25 1.05
// 90 function true
// slow medium fast {"slow":0.5,"medium":1,"fast":2} fast advanced undefined
```

要素が使うラベルは`WORDS`（英語と日本語）で、`wordsFor(language, over?)`は、自分の言葉を重ねた表を返します。`languageOf("ja-JP")`は`ja`で、それ以外は英語です。[アクセシビリティとラベル](accessibility-and-labels.md)を参照してください。
