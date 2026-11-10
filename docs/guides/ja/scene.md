---
title: 共有シーン
section: how-to
order: 25
description: 多くのパッケージのレイヤーを、レンダラーの1つのWebGLコンテキスト上で、1つのシーン、1つのカメラ、1つの時計にまとめます。float64のキロメートルによる1つの座標系、浮動原点、2枚の奥行きの層を使います。
---

[English](../scene.md)

`@johnmorrisdotca/kazoku-ui/scene`は、複数のパッケージのレイヤー（星、地球、惑星、ロケットなど）を、**共有レンダラーの1つのWebGLコンテキスト上で、1つのシーン、1つのカメラ、1つの時計**で描けるようにします。これまでは、ページが共有するのはコンテキストだけで、ビューはそれぞれが自分のカメラを持つ自分のシーンでした。three.jsはページ自身のものです。ホストが自分の`three`を渡すので、この部品はthree.jsをインポートしません。この部品はDOMを使わず、サーバーでもインポートできます。

シーンとカメラを持つのはホストです。パッケージが持つのは**レイヤー**で、天体、省略可能な天空、そして、ある時刻に合わせて天体を置いて回す方法をホストに渡します。

```ts no-check
import { createFamilyClock } from "@johnmorrisdotca/kazoku-ui/clock";
import { createSharedRenderer } from "@johnmorrisdotca/kazoku-ui/renderer";
import { composeScene } from "@johnmorrisdotca/kazoku-ui/scene";

const three = await import("three");
const renderer = createSharedRenderer({ load: () => Promise.resolve(three) });
const clock = createFamilyClock();
const scene = composeScene(three, { layers: [stars, earth, planets], clock, focus: "earth" });

const view = renderer.view(host, scene);
scene.bind(view);                       // draw again when the clock or the camera changes
await view.focus();

scene.camera.focusOn("moon");           // the origin moves to the Moon; the clock opens at its speed unless the reader chose one
controls.addEventListener("kazoku-viewchange", (event) => scene.camera.look(event.detail));
```

## 座標系: SPX座標系、キロメートル、float64

パッケージの境界を越える位置は、すべて`Vec3Km`です。SPX座標系のキロメートルで表した3つのfloat64の数です。SPX座標系は、J2000の赤道座標を、three.jsが求めるようにyが上になるよう回したものです。**xは春分点の方向、yは天の北極の方向、z = 赤道座標のyの符号を反転したもの**です（星ならx = cos dec cos ra、y = sin dec、z = −cos dec sin ra）。原点は地球の中心で、光行差も光の伝わる時間も考えません。黄道座標系ではありません。float32のシーン単位は使いません。

**実寸だけ。** 小さくて見えない天体を、大きくして見せることはしません。レイヤーが数ピクセルの印を描き（`frame.camera.heightPx`は、ビューの高さがデバイスピクセルでいくつかを表します）、本物の形状は実寸のままです。

**浮動原点。** float32では、海王星とロケットのリベットを1つの数に収められません。そこでホストは毎フレーム、すべてのレイヤーに`focusKm`（注目している天体の中心、float64）と`unitKm`（シーン単位1つあたりのキロメートル。既定は注目している天体の半径）を渡します。レイヤーは`object.position = (placeKm - focusKm) / unitKm`と`object.scale = sizeKm / unitKm`を設定します。`placeInFrame(object, placeKm, frame, sizeKm)`が、その1行です。どのレイヤーも、形状に絶対座標を埋め込みません。カメラは原点のまわりを回ります。

## レイヤーとは

```ts no-check
import { placeInFrame, SKY_RADIUS, type SceneLayer } from "@johnmorrisdotca/kazoku-ui/scene";

const layer: SceneLayer = {
  id: "moon",
  bodies: [{
    id: "moon",
    root,                                   // the body's own axes, +y its north pole, with its lights inside
    radiusKm: 1737.4,                       // bounding radius, atmosphere included
    openingSpeed: 86_400,                   // the speed at which its motion first shows
    placeKm: (ms) => moonAt(ms),            // pure: where its centre is at a moment, in the SPX frame
  }],
  update(frame) {                           // place and turn for this frame
    placeInFrame(root, frame.positionsKm.get("moon")!, frame, 1737.4);
    return false;                           // true while it still moves on its own
  },
  credits: () => [{ text: "Moon positions: ...", textJa: "月の位置: ..." }],
  dispose() { /* free what the layer made */ },
};
```

- `sky`（省略可）は、無限遠に、最初に、奥行きなしで描くオブジェクトです。たとえば、点が原点から`SKY_RADIUS`（100）シーン単位の距離にある星の球です。ホストは、原点にあって、ビューと一緒に向きを変え、決して動かないカメラで描きます（`SKY_NEAR`は1、`SKY_FAR`は1000）。
- `placeKm(ms)`は天体にあります。この部品のもとになった設計にはありませんでした。ホストは、原点の位置をレイヤーに伝える**前に**、注目している天体の位置を知る必要があるからです。ホストは毎フレーム、すべての天体の位置を1回ずつ求め、`frame.positionsKm`にまとめて渡します。
- 天体が描くものはすべて、照明も含めて`root`の中にあります。ホストは奥行きの層ごとに`root.visible`を切り替え、レイヤー自身の値に戻します。
- `frame.ms`は時計の時刻で、1回の描画の中ではすべてのレイヤーに同じ数が渡ります。`frame.sunKm`は太陽の位置で、光が必要なレイヤーが使います。`composeScene`は`sun(ms)`関数を受け取ります（wakusei-planetsの`frameAt`に天文単位を掛けたもの）。既定は`lowPrecisionSun(ms)`で、1950年から2050年で約0.01度の精度です。パッケージどうしはインポートしません。ホストが太陽を読み、渡します。

## 2枚の奥行きの層

ファミリーの惑星の表面はカスタムシェーダーで、対数の深度バッファでは、1つずつ書き直さないと対応できません。そこでホストは、まず天空を奥行きなしで描き、深度バッファを消去して**遠い**天体を描き、もう一度消去して**近い**天体をその上に描きます（計画は毎フレーム`planSlices`が立てます）。天体が近い層に入るのは、その天体の最も近い表面が、すべての天体の最も近い表面の1000倍以内のときです。各層のニア面は、その層の最も近い表面までの距離の半分、ファー面は最も遠い端のすぐ先にとるので、どの天体も切れず、比は24ビットのバッファで解像できる範囲に収まります。地球の400 km上空で、ロケットのすぐそばにカメラがあるとき、ロケットが近い層で、地球と月が遠い層です。月では、地球は自分の層の中にすべて収まります。天体は1つの層の中にまるごと描かれるので、近い層は常に遠い層の上に描かれます。

このために必要なレンダラーの変更は小さく、省略可能です。`Scene3D`に省略可能な`render(gl)`を、`GLRenderer`に省略可能な`autoClear`と`clearDepth()`を加え、シーンが自分で描画のパスを進められるようにしました。`clearDepth`のないレンダラーでは、全範囲を1回で描きます。2枚の層で足りるかどうかは、実証ページが決めます。この部品自身のデモ`scene.html`は、地球の大きさの球、月の距離にある球、人工衛星、星を描きます。フリーズテスト（`pnpm test:freeze`）は、コンテキストが1つであること、静止中は何も描かれないこと、1秒に30フレームまでであること、注目する天体を20回変えてもGPUオブジェクトが増えないこと、どの天体も自分の層の中にまるごと収まること、静止した2つのフレームが同じ絵であることを確かめます。

## カメラと時計

- `scene.camera`は、作られたどの1つのシーンからも独立して保たれるので、レンダラーが作り直しても（静止画、手放して戻ってきたビュー）残ります。注目している天体のまわりを回り、`state`は`{ focus, distanceKm, yaw, tilt, fovDeg }`です。`set`でどれでも変えられ、`focusOn(id)`は原点をその天体へ移して、その天体が収まる距離にします。`look({ yaw, tilt, zoom })`は、`kazoku-viewchange`のビュー操作の状態をそのまま受け取ります（zoomが1なら天体が収まります。カメラは天体の中には入りません）。`fitKm(id)`は収まる距離で、`onChange`はすべての変化を受け取ります。
- **1つの時計。** 毎フレーム、時計は1回だけ進み、すべてのレイヤーに同じ`ms`が渡ります。`focusOn`は`clock.openAt(body.openingSpeed)`を呼ぶので、読む人が速さを決めるまでは、開始時の速さが注目している天体に従います（[時計](clock.md)を参照）。
- **止まります。** 作られたシーンがもう一度描くよう求めるのは、時計が動いている間か、レイヤーがまだ動いている間だけです。`scene.bind(view)`は、時計を設定したとき、再生や一時停止をしたとき、速さを変えたとき、カメラが動いたときに描き直し、tickでは描き直しません。一時停止中の時計は、止まったビューです。フレームは要求されません。レンダラー自身の1秒に30フレームまでという上限も守られます。
- `scene.credits()`は各レイヤーのクレジットを1回ずつ返し、ページのクレジット行に使います。`scene.stats`はフレームとパスを数え、最後のフレームの層を返します。`scene.dispose()`はすべてのレイヤーを手放します（レンダラーは自分が作ったシーンを手放し、レイヤーはページのもので、ここで1回だけ手放します）。

## 部品

| インポート | 内容 |
| --- | --- |
| `scene` | `composeScene`、`placeInFrame`、`planSlices`、`orbitOffsetKm`、`fitDistanceKm`、`lowPrecisionSun`、`subKm`、`lengthKm`、`AU_KM`、`SKY_RADIUS`、`SKY_NEAR`、`SKY_FAR`と、レイヤーの型。DOMなし。 |
