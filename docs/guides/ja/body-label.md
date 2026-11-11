---
title: 天体に書く名前
section: how-to
order: 27
description: 天体の名前をその球の表面に書いて、いっしょに回します。初期設定は Michroma、ペイント、強さ0.5です。見た目は4種類から選べます。名前は1回・2回・ぐるりと一周、場所は赤道か極の近くにでき、いつも見る人のほうを向けることもできます。
---

`@johnmorrisdotca/kazoku-ui/body-label` は、天体の名前をその天体の球に書きます。映画で、映っているものの上にその名前を大きく重ねるような見せ方です。文字は表面にのって天体といっしょに回り、文字の下の表面も透けて見えます。wakusei-planets の天体と chikyu-earth の地球の両方がこれを使うので、ファミリーのどこでも同じ見た目になります。three.js はページで読みこんだものをわたしてください。このパッケージ自身は three.js を import しません。

ファミリーの初期設定は、John が選んだ **Michroma、ペイント、強さ半分、名前は1回、天体といっしょに回る、赤道の上** です。

```ts no-check
import * as THREE from "three";
import { createBodyLabel, loadBodyLabelFont } from "@johnmorrisdotca/kazoku-ui/body-label";

await loadBodyLabelFont();                       // Michroma (64 kB) を1回だけ読みこむ。ページにすでにあるフォントを使うなら不要
const label = createBodyLabel(THREE, { text: "EARTH" });
globe.add(label.object);                         // 回転する球 (半径1) の子にするので、いっしょに回る
label.ready.then(() => view.invalidate());       // フォントが読みこまれたら名前を描き直す

// 何かが動いたフレームだけ: 小さいときは隠し、facing のときは見る人のほうへ回す
if (label.update(camera, radiusPx)) view.invalidate();

label.set({ look: "etched", repeat: "both" });   // テクスチャ1枚を描き直す
label.dispose();                                 // テクスチャ、マテリアル、ジオメトリを解放
```

## 設定

| 設定 | 内容 | 初期値 |
|---|---|---|
| `text` | 書く名前。ファミリーの見た目にするなら大文字で (`EARTH`)。どの言語でも書けます (`地球`)。 | (必須) |
| `font` | ページで読みこみ済みの CSS フォントファミリー。 | `"Michroma"` |
| `fallbackFont` | `font` にない文字 (日本語など) に使うファミリー (`"Noto Sans JP"`)。 | ページのゴシック体 (sans-serif) |
| `look` | `painted` (表面の上に薄い色の文字)、`etched` (文字の形に表面が明るくなる)、`outline` (文字のふちだけ)、`burned` (表面より暗い文字)。 | `painted` |
| `strength` | 見え方の強さ、0〜1。 | `0.5` |
| `repeat` | `once` (1回)、`both` (反対側にもう1つ。どちらかがいつも見える)、`around` (一周に入るだけ並べる)。 | `once` |
| `latitude` | 帯の緯度 (度)。0 が赤道、55 や -55 で極の近くの帯。赤道から70度までにおさえます (`BODY_LABEL_MAX_LATITUDE`)。 | `0` |
| `longitude` | (最初の) 名前の真ん中を置く経度。天体自身の座標で、東向きに測った度数。 | `0` |
| `size` | `small`、`medium`、`large` のどれか。文字の高さは、緯度でそれぞれ 9度、14度、20度です (`BODY_LABEL_HEIGHTS`)。一周のうちその名前に使える長さに入らないときは、入るまで小さくします。 | `medium` |
| `facing` | true にすると、天体が下で回っても名前はいつも見る人のほうを向きます。 | `false` |
| `radius` | メッシュの単位での球の半径。 | `1` |
| `minRadiusPx` | 天体の画面上の半径がこの値 (CSS ピクセル) より小さいときは、名前を出しません。 | `24` |

経度 0 は three の `+x` で、three の `SphereGeometry` にはった地図の真ん中です。東は `-z` の向きです。ふつうの向きで地図をはった球なら、名前は地図のとおりの場所に出ます。

## 描き方

ラベルは、表面のすぐ上 (半径の1.004倍) にある球の帯1つです。そこにキャンバスのテクスチャを1枚はり、名前のコピーはすべてその1枚に入ります。ラベル1つにつき、テクスチャ、マテリアル、ジオメトリが1つずつで、`dispose` で解放します。赤道からはなれると経度1度が短くなるので、文字を横に 1 / cos(緯度) 倍に広げて描き、文字の形を保ちます。マテリアルは球と同じように光が当たるので、夜の側では名前も暗くなります。

`update(camera, radiusPx)` は、何も変わっていないときは、ほとんど負担がかかりません。メモリを新しく取らず、テクスチャも描き直さず、false を返します。ラベルを隠したり出したりしたとき、または facing のラベルを回したときは true を返すので、描き直しが必要かがわかります。`set` がテクスチャを描き直すのは、文字、フォント、見た目、大きさ、くり返し、位置が変わったときだけです。強さだけなら描き直しません。

レイアウトの計算は DOM も three も使わないので、それだけで使うこともできます。自分で作るラベルやテストに使えます。

```ts
import { bodyLabelFacing, bodyLabelLayout } from "@johnmorrisdotca/kazoku-ui/body-label";

const layout = bodyLabelLayout({ widthEm: 4.2, repeat: "both" });
console.log(layout.height, JSON.stringify(layout.spans.map((span) => span.centre)));
// カメラは -z の方向 (東へ90度) にある。0 を真ん中にした名前は、そちらを向くように4分の1回る
console.log(Math.round((bodyLabelFacing(0, -5, 0) * 180) / Math.PI));
// 14 [0,180]
// 90
```

## フォント

Michroma は Vernon Adams のフォントで、"Copyright 2011 The Michroma Project Authors"、SIL Open Font License 1.1 (予約フォント名なし) です。パッケージには `dist/body-label/fonts/Michroma-Regular.ttf` (`BODY_LABEL_FONT_BYTES`、64,344 バイト) として手を加えずに入っていて、ライセンス `OFL.txt` がとなりにあります。読みこむのはページが `loadBodyLabelFont()` を呼んだときだけです (モジュールのとなりの URL を `FontFace` で読みこみます)。`BODY_LABEL_FONT` がそのファミリー名です。Michroma にはラテン文字しかないので、日本語などは `fallbackFont` で、それがなければページのゴシック体 (sans-serif) で描きます。

## ファミリー共通の名前

球を描くパッケージは、ラベルをふつうの HTML 属性で用意するので、設定パネルから設定できます。同じ設定をまとめたプロパティも1つあります。wakusei-planets と chikyu-earth は、次の名前をそのまま使っています。

| 属性 | 値 |
|---|---|
| `body-label` | `painted`、`etched`、`outline`、`burned` のどれか (見た目)。属性がなければラベルなし。 |
| `body-label-strength` | 0〜1 |
| `body-label-repeat` | `once`、`both`、`around` |
| `body-label-latitude` | 度 (`0` や `55` など) |
| `body-label-facing` | あれば、いつも見る人のほうを向く |
| `body-label-font` | ページで読みこみ済みの CSS フォントファミリー |
| `body-label-fallback-font` | そのフォントにない文字に使うファミリー |

プロパティは `bodyLabel` です。`createBodyLabel` にわたすのと同じ設定のオブジェクト (`{ look: "painted", strength: 0.5, repeat: "once", latitude: 0, facing: false, font: "Michroma", fallbackFont: "" }`)、またはラベルなしなら `null` です。文字は天体自身の名前を、ページの言語で書きます。

## デモ

[天体に書く名前](https://johnmorrisdotca.github.io/kazoku-ui/body-label.html) では、球を1つ表示し、見た目4種類、数、場所、名前3つ、「Always facing you」(いつも見る人のほうを向ける) のボタンを1列に並べています。選んだものはページの URL に残ります。動きを減らす設定 (`prefers-reduced-motion`) をしていなければ、開くと回り始めます。止まっているあいだは何も描きません。
