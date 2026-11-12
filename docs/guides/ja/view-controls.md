---
title: 表示の操作
section: how-to
order: 2
description: view-controls要素のすべて。ユーザーが得られるもの、全属性、送られるイベント、キーとジェスチャー、アドレスの扱いを説明します。
---

[English](../view-controls.md)

`<kazoku-view-controls>`は、3Dやズームできるビューに、回転、傾き、ズーム、移動の操作を与えます。シーンそのものは描きません。ユーザーが選んだことをひとつのイベントで知らせ、ページ側が、キャンバス、WebGL、SVG、CSS 3Dのどれかにそれを反映します。

![デスクトップ幅のデモ。少し回して傾けたカードの下にバーがある](../../images/hero-light.webp)

## ユーザーが得られるもの

- **2つのレベルで、バーを簡潔に保ちます。** 既定の`controls="basic"`では、スライダーが1つと、自動回転の軸（角度、傾き、ロール、すべて）が表示されます。スライダーは、選んだ軸の値を変えます（すべてのときは角度です）。そのあと、自動回転、ズームの縮小と拡大（**数値表示**つき。`2.4×`のように表示され、押すと全体表示に戻ります）、全体表示、小さな「詳細」ボタンが表示されます。「詳細」を押すと、速さのボタン（0.5×、1×、2×）、回る向き（左へ、右へ）、正面、矢印パッドが加わり、その選択は記憶されます。
- 左ボタンのふつうのドラッグと1本指は、どの拡大率でもビューを回します（指では傾かないので、全体表示ではページのスクロールが使えます）。拡大率によってドラッグの働きが変わることはありません。ホイールでビューが動き、Shiftとホイールでは横へ動きます。2本指のスワイプでも動きます。Ctrl、Command、またはAltを押しながらのホイール、あるいはピンチで、ポインターを中心にズームします。CtrlまたはCommandを押しながらの左ドラッグ、マウスの中ボタンか右ボタンを押したままのドラッグ、またはSpaceを押しながらのドラッグでビューが動き、2本指をそろえて動かしても動きます。Spaceを押しているあいだポインターは手の形です。左ボタンのふつうのドラッグでは、ロールは変わりません。Shiftを押しながらのドラッグ、または2本指のひねりでロールします。全体表示で動かす余地がないときは、ホイールでページがスクロールします。ズームしているときはホイールでビューが動き、移動がその向きの端に達しているときにホイールを新たに回し始めると、またページがスクロールします。`free-pan`があると、上のどの操作も、縮小していてもどのズームでもビューを動かします。またビューはタッチをすべて受け取ります。
- **ピンチは常にビューのものです。** 操作を結びつけたビューの上では、トラックパッドのピンチ（CtrlまたはCommandを押しながらのホイール）は、ズームの上限と下限を含め、どのズームでも、ビューが受け取ります。そのため、ブラウザーがページ全体を拡大することはありません。Safari独自のピンチ（`gesturestart`、`gesturechange`、`gestureend`）も同じように受け取り、そのスケールに合わせてビューがズームします。ズームの上限や下限では、ふつうのホイールとAltを押しながらのホイールは、ページに渡ることがあります。
- **回転の速さのボタンは、表示が1周するのにかかる時間を表します。** ファミリー共通の[速さのボタン](speed-buttons.md)を使い、`speed`の0.125倍、0.25倍、0.5倍、1倍を選べます。ボタンには1周にかかる時間（4分、2分、1分、30秒）が出て、画面読み上げでは「30秒で1周します」のように読まれます。時間の速さのボタン（`1×`）と見分けやすくするためです。基本のレベルで回っている間は、小さなボタンが1つあり、押すたびに次の速さになります。選んだ速さは`pace`属性に書き戻され、アドレスにも`?pace=0.5`のように残ります。もっと速く回したいときは、`paces`で速さを決められます（`paces="1 4 8"`）。そのときも各ボタンには1周の時間が表示されます。
- **どの操作も、回転を止めたり、リセットしたりしません。** ズーム、傾き、移動、全体表示、正面のどれでも、自動回転は続きます（正面は角度を0にするだけで、回転はそこから続きます）。スライダーを操作している間や、ビューをドラッグしている間は、回転がいったん止まり、手を離すとその位置から続きます。回転を一時停止するのは、自動回転のボタンだけです。
- ビュー上のキー：矢印キーで回転と傾き、Shiftと左右の矢印でロール、`+`と`-`でズーム、`0`かHomeで正面と全体表示です。
- 英語と日本語のラベル、ライトとダーク、48 pxのタッチターゲット、スマートフォンでは小さなバー、動きの軽減を求めるユーザーには自動回転なし。
- ズームしたり動かしたりすると、**中央**ボタン（`中央`）が現れ、押すとオブジェクトが全体表示と既定の角度で真ん中に戻ります。戻る動きは0.25秒で、動きの軽減を求めるユーザーにはすぐに戻ります。ビューに手を触れると、動きはその場で止まります。コードからは`element.centre()`で同じことができます。最後に、`reason`が`centre`の変化イベントが送られます。オブジェクトを見失わないよう、移動には限りがあります。`object-size`がなければ絵がビューを覆ったままになり、あればオブジェクトの4分の1がビューに残ります。
- ズームの数値表示はビューの`zoom`（1×が全体表示）で、バーにあるズームの数値はこれだけです。ズームの変わり方によらず、いつも今の値を表示します。画面読み上げには、ズームが止まって少したってから「ズーム倍率 2.4×」のように伝え、ピンチの途中では伝えません。1回のホイール操作でズームしている間は、途中でズームの上限や下限に達しても、その操作の最後までビューが受け取るので、ページが急に動くことはありません。その限界でホイールを新たに回し始めると、ページがスクロールします。

## 使い方

```html
<div id="scene" tabindex="0" style="height: 260px">Your scene</div>
<kazoku-view-controls for="scene" address controls="basic"></kazoku-view-controls>

<script type="module">
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  const scene = document.getElementById("scene");
  const bar = document.querySelector("kazoku-view-controls");
  bar.addEventListener("kazoku-viewchange", (event) => {
    const { yaw, tilt, zoom, panX, panY, final } = event.detail;
    scene.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${tilt}deg) rotateY(${yaw}deg)`;
    if (final) scene.dataset.settled = "yes";
  });
</script>
```

要素は、ビューの上か、すぐそばに置いて、ビューといっしょに画面に出るようにします。`for`は、操作（ポインター、ピンチ、ホイール、キー）を結びつける要素を指します。キーを使うには、その要素に`tabindex`を付けてください。`element.view = someElement`で指定することもできます。

## イベント

`kazoku-viewchange`は要素から送られ、バブリングして、シャドウルートも越えます。`event.detail`は、コントローラーの`onChange`が受け取るものと同じオブジェクトです。

| フィールド | 意味 |
|---|---|
| `yaw` | 度。-180から180。垂直軸のまわりの回転。右にドラッグすると大きくなります。 |
| `tilt` | 度。`tilt-max`（30）の正負に制限。大きいほど上側が奥へ傾きます（上にドラッグ）。制限の内側では自動回転が振り子のように往復し、90以上では回転し続け、`orientation`は連続したままです。 |
| `roll` | 前方向の軸の周りの度。`roll-max`（180）の正負に制限。 |
| `orientation` | 姿勢を表す四元数 `{ x, y, z, w }`。直角を超えて転がるときはこちらを描くと、上方向が反転しません。 |
| `zoom` | 0.1から50（`zoom-min`、`zoom-max`）。1が全体表示。シーンは`zoom * fitScale`で描きます。 |
| `panX`、`panY` | 絵を、ビューの中心から動かしたCSSピクセル。等倍以下では0です（`free-pan`があるときを除きます）。 |
| `turning` | 自動回転が動いている間は真。 |
| `final` | ドラッグ、ピンチ、スライダー、自動回転の途中の段階では偽、確定したときは真。重い描画は`final`のときに、軽い変形はイベントのたびに行います。 |
| `reason` | 変化の原因：`init`、`auto`、`drag`、`pinch`、`wheel`、`key`、`slider`、`zoom`、`pan`、`front`、`fit`、`centre`、`fit-scale`、`play`、`pause`、`set`。 |

`init`イベントは、要素が接続された少しあとに1回だけ送られ、開始時のビュー（属性とアドレスから決まったもの）を伝えます。`element.state`は、いつでも現在のビューです。定数`TAG`と`EVENT`が、タグとイベントの名前です。

## 属性

| 属性 | 働き |
|---|---|
| `for` | 操作を結びつけるビューのid。`element.view = someElement`でも指定できます。 |
| `lang` | `en`か`ja`。なければ、いちばん近い上位の`lang`、それもなければ英語。 |
| `yaw`、`tilt` | 開始時の角度と傾き。 |
| `zoom` | 開始時のズーム。`fit`（既定）か、1がシーンの自然な大きさになる倍率。その数を`fit-scale`で割った値で開きます。 |
| `fit-scale` | 全体表示のとき（イベントの`zoom`が1のとき）にページがシーンを描く倍率。既定は1。シーンを測ったあとで`element.setFitScale(n)`を呼んでも指定できます。 |
| `ignore` | ビューの中で、押してもドラッグにせず、クリックをそのまま通す対象のCSSセレクター。既定は`button, a, input, select, textarea, label, [data-kazoku-ignore]`。 |
| `anchor` | `x,y`：`+`、`-`のボタン、2倍ボタン、キーがズームの中心にする点。全体表示のときのビューの中心からのCSSピクセルで指定します。 |
| `key-tilt` | `drag`（既定：上矢印は、上へのドラッグと同じ向きにビューを傾けます）か`wheel`（上矢印は、それと逆の向きにビューを傾けます。0.13.0より前にホイールを上に回したときの傾きと同じ向きです。現在、ホイールはビューを動かします）。 |
| `stop-turn` | 押す、ホイール、キーのどれかで自動回転を止めます。既定ではオフで、ボタンとスライダーは回転を止めません。 |
| `double-press` | ダブルクリックかダブルタップで、その点を中心に2倍へズームし、もう一度すると1倍に戻します。`off`でこれを止めます。ズームの前に、ビューが`kazoku-doublepress`（`DOUBLE_PRESS_EVENT`）を送ります。このイベントはキャンセルできます。`detail`は`{ x, y, zoom, next }`で、ダブルクリックした点、今のズーム、標準の動作が使うズームです。`preventDefault`でその標準の動作を省けるので、ページ独自のズーム段階を使えます。`off`以外ならオンです（既定はオン）。コントローラーの`doublePress`も同じ切り替えです。 |
| `immersive` | 画面いっぱいに表示するビュー向けです。ふつうのホイールは、ポインターを中心にズームします。指のドラッグは、ページをスクロールする代わりに、ビューを回して傾けます。Ctrl、Command、Alt、Shiftのどれかを押しながらのホイールは、変わりません。この属性を付けるか、`carryControls`に`immersive: true`を渡すか、コントローラーの`immersive`を設定します。`checkGestures(page, view, { immersive: true })`は、ふつうのホイールをズームとして確かめ、Shiftを押しながらのホイールは移動として確かめます。そのため、テストで`wheel-pan`を`lacks`に挙げて申告する必要はありません。 |
| `tilt-step` | ドラッグの傾きを、この度数の倍数に丸めます。既定は0で、丸めません。 |
| `object-size` | `w,h`：ビューより小さいとき、全体表示でのオブジェクトの大きさ（CSSピクセル）。移動しても、オブジェクトの少なくとも4分の1は見えたままです。 |
| `free-pan` | どのズームでも、縮小していても、ビューの大きさのこの割合まで上下左右に動かせます（値なしは0.5：中心がビューの端まで動けます）。ズームが1よりずっと小さい3Dの空間向けです。ふつうは、そのズームではビューが動きません。値は0より大きく4までで、値なしやそれ以外は0.5になります。ビューはタッチをすべて受け取ります。中ボタンでのドラッグ、CtrlかCommandを押してのドラッグ、Spaceを押してのドラッグ、ホイールでどのズームでも動かせ、移動パッドも表示されます。`element.freePan`（コントローラーの`freePan`）でも指定できます。 |
| `grab-radius` | 地球儀など回せるものを正確につかむための設定。全体表示での画面上の半径（CSSピクセル）か`fit`。ドラッグすると、触れた点がポインターの下に保たれます。 |
| `autoplay` | 最初から自動で回します。動きの軽減を求めるユーザーには回しません。 |
| `autoplay-for` | 回転が、この秒数だけ回ったあと自分で止まります。`autoplay`で始まる回転にも、「自動回転」ボタンや`play()`で始まる回転にも効きます。`play(seconds)`は、その回だけの秒数を決められます。 |
| `speed` | `pace`が1のときの、1秒あたりの度数。書かなければ12で、30秒で1周します（0.33より前は30）。負の数なら、最初は左へ回ります。 |
| `direction` | 角度の自動回転の向き：`left`（左へ）か`right`（右へ）。「左へ」「右へ」は、今選んでいる軸の向きを変えます（「すべて」のときは3軸とも）。アドレスの`direction`に残ります。書かなければ、`speed`の正負で決まります。ユーザーの選択は、ボタンで選んだものも、開いたアドレスから読んだものも、ここに書き戻されます。 |
| `axis` | 自動回転が回す軸：`angle`（既定）、`tilt`、`roll`、`all`。`all`は3つの速さが少しずつずれて、同じ動きを繰り返さない回転です。4つのボタンは常にバーに表示されます。アドレスの`axis`に残ります（`angle`は残しません）。ユーザーの選択は、ボタンで選んだものも、開いたアドレスから読んだものも、ここに書き戻されます。 |
| `tilt-direction`, `roll-direction` | その軸の向き。右以外のとき、アドレスの`tiltDirection`と`rollDirection`に残ります。ユーザーの選択は、ボタンで選んだものも、開いたアドレスから読んだものも、ここに書き戻されます。 |
| `pace` | 自動回転の速さを、`speed`に対する倍率で表します。最初は1で、ボタンでは0.125、0.25、0.5も選べます。ユーザーの選択は、ボタンで選んだものも、開いたアドレス（`?pace=2`）から読んだものも、ここに書き戻され、アドレスの`pace`にも残ります。そのため、この属性を読むページは、ユーザーに見えている速さを受け取れます。ページ自身の最初の速さは、ページが最後に設定した値です。ボタンは、ファミリー共通の[速さのボタン](speed-buttons.md)です。 |
| `paces` | ボタンで選べる速さです。既定は`0.125 0.25 0.5 1`で、数字は自由に決められます（`paces="1 4 8"`）。各ボタンには1周の時間が表示されます。 |
| `controls` | `basic`（既定）か`advanced`。ユーザーが「詳細」で選んだ内容は`localStorage`に記憶され、優先されます。属性を後から変えると、すぐにそのレベルになります。ホスト要素には、今のレベルが`data-level`属性で付きます。 |
| `layout` | `classic`（既定）、`horizontal`、`vertical`、`compact`：[レイアウトとズームスライダー](layouts-and-zoom.md)を参照。 |
| `storage` | レベルを記憶する`localStorage`のキー（`kazoku-view-controls`）。 |
| `flat` | ビューは回りません。角度、傾き、自動回転、正面はなく、ドラッグは移動になります。 |
| `tilt-max`、`roll-max`、`zoom-min`、`zoom-max` | 上限と下限（30、180、0.1、50）。傾きの自動回転は90未満で振り子、90以上で回転し続けます。 |
| `address` | 選んだ内容をページのアドレスに残します（`?yaw=40&tilt=10&zoom=2&pace=0.5&direction=left`）。 |
| `address-keys` | 別のキー名：`yaw:a,zoom:z`。 |
| `theme` | `light`か`dark`。なければページの配色。 |
| `overlay` | 位置を指定した親の下部に重ねます。 |

メソッドは、`play()`、`pause()`、`front()`、`fit()`、`centre()`、`set({ yaw, tilt, zoom, panX, panY })`、`setFitScale(n)`、そして裏にある[コントローラー](view-controller.md)の`controller`です。`element.words = { front: "Home" }`でラベルを置き換えられます。色はカスタムプロパティ`--kazoku-ink`、`--kazoku-surface`、`--kazoku-line`、`--kazoku-accent`で、パーツは`bar`、`field`、`slider`、`button`、そしてズームスライダー用の`zoom-slider`（そのフィールドと入力欄に付きます）です。

## アドレス

残るのは、ユーザーが選んだものだけです。角度、傾き、ズーム、自動回転の速さ（`pace=0.5`か`pace=0.125`。ページ自身の最初の速さはアドレスに残りません。最初の速さはふつう1ですが、ページの`pace`属性で別の値にしているときは、その値です。その場合、ユーザーが1を選ぶと`pace=1`が残ります）、自動回転の向き（`direction=left`か`direction=right`。ページ自身の最初の向きはアドレスに残りません。ページ自身の`speed`パラメーターには触れません）。移動はその画面のピクセルで、回転はその瞬間のものなので、どちらも残りません。開始時の値は、アドレスに残りません。

```js
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "@johnmorrisdotca/kazoku-ui/view-controls";

const choices = { yaw: 40, tilt: 10, zoom: 2 };
console.log(formatAddress("?x=1", choices));
console.log(JSON.stringify(parseAddress("?yaw=40&tilt=x&zoom=2")));
console.log(JSON.stringify(DEFAULT_KEYS));
console.log(JSON.stringify(parseKeys("yaw:a,zoom:z")));
// ?x=1&yaw=40&tilt=10&zoom=2
// {"yaw":40,"zoom":2}
// {"yaw":"yaw","tilt":"tilt","zoom":"zoom","speed":"pace","direction":"direction","roll":"roll","axis":"axis","tiltDirection":"tiltDirection","rollDirection":"rollDirection"}
// {"yaw":"a","tilt":"tilt","zoom":"z","speed":"pace","direction":"direction","roll":"roll","axis":"axis","tiltDirection":"tiltDirection","rollDirection":"rollDirection"}
```

## シーンの自然な大きさで開く

ズーム1は、ページ上でそれがどんな大きさでも、全体表示です。シーンを`fitScale`で描いていて（ビューに収まるときの自然な大きさの0.4倍など）、自然な大きさで開きたいページは、`zoom="1"`にして、要素に倍率を教えます。

```js no-run
const controls = document.querySelector("kazoku-view-controls");
controls.setAttribute("zoom", "1"); // natural size
controls.setFitScale(0.4); // the scale the scene is drawn at when it fits
// the event's zoom is now 2.5; draw at event.detail.zoom * controls.fitScale
```

## 姿勢の計算

要素の回転は、DOMを使わない普通の関数として`view-controls`にあります。同じ数字が必要なページやテストで使えます。

| エクスポート | 返すもの |
| --- | --- |
| `quatIdentity()` | 何も回していない姿勢、`{ x: 0, y: 0, z: 0, w: 1 }`。 |
| `quatFromEuler(yaw, tilt, roll)` | 度で指定した姿勢。Y軸でyaw、次にX軸でtilt、最後にZ軸でroll。 |
| `eulerFromQuat(q)` | 姿勢をスライダーに出すときのyaw、tilt、roll。tiltは直角の内側に収まります。 |
| `spinLocal(q, yaw, tilt, roll)` | `q`を自分の軸のまわりにその度数だけ回したもの。小さい動きなら極を通っても飛びません。 |
| `upVector(q)` | `q`のあとのビューの上向きの軸。 |
| `pendulumTilt(phase, amplitude)` | 自動回転で`amplitude`度の中を行き来するtilt。範囲のあるtiltがひっくり返りません。 |
| `tumbleRates(seconds, speed, signs)` | 全軸の回転（`turn-axis="all"`）での各軸の1秒あたりの度数。軸ごとに別の波でゆれるので、同じ動きをくり返しません。 |
| `rateSign(value)` | -1か1。速さの向き（0は1とみなします）。 |
| `parseAxis(text)` | 属性から`angle`、`tilt`、`roll`、`all`のどれか。それ以外は`undefined`。 |

## タグは空いているときだけ定義する理由

`customElements.define`は、名前がすでに使われていると例外を投げます。ページに非がなくても起こります。このパッケージのコピーが2つある場合、スクリプトが2回読み込まれた場合、ページが自前の要素のために先にタグを登録していた場合などです。そこで`defineViewControls`（`define`のインポートが実行するもの）は、先に`customElements.get`を呼び、最初に登録されたものが優先されます。自分で登録したいときのために、クラス`ViewControlsElement`は`view-controls/element`にあります。

## 操作と、すべてのパッケージが行う確認

ファミリーのどのビューも、同じ操作に同じように応えます。ページごとに覚え直す必要はありません。

| 操作 | 動作 |
|---|---|
| ドラッグ | 回転（ヨー）。マウスなら傾きも。どの拡大率でも同じです。回転できない平らなビューでは、代わりに動きます |
| Shiftを押しながらのドラッグ、または2本指のひねり | ロール |
| CtrlまたはCommandを押しながらの左ドラッグ、Spaceを押しながらのドラッグ、中ボタンか右ボタンのドラッグ、2本指をそろえて動かす | ズーム中のビューを動かす（移動）。`free-pan`があれば、どのズームでも |
| ホイール、Shiftとホイール、2本指のスワイプ | ズーム中のビューを動かす（全体表示ではページがスクロールします） |
| Ctrl、Command、またはAltを押しながらのホイール、トラックパッドのピンチ、2本指を広げる・狭める | ポインターを中心にズーム |
| 矢印、`+`、`-` | 回転と傾き、ズーム |
| ズーム中のダブルクリック、Home、`0` | 全体表示（Homeと`0`は正面にも戻します） |

操作はすべてコントローラーが行います。`<kazoku-view-controls>`をつなぐページ（または`carryControls`を呼ぶページ）は、すべての行がそのまま使えます。変更イベントの`panX`、`panY`、`zoom`、`yaw`、`tilt`、`roll`を描くだけです。`panX`と`panY`はビューの中心からのCSSピクセルで、絵はその分だけ動かします。Macでは、Ctrlを押しながらのクリックでブラウザーのメニューが開きます。コントローラーは、CtrlまたはCommandを押しながらのドラッグや右ボタンのドラッグでビューを動かしているあいだだけメニューを止め、それ以外では何もしません。

`@johnmorrisdotca/kazoku-ui/testing`の`checkGestures`で、ページがそのとおり動くことを確かめます。Playwrightの`page`と、操作をつないだビューのセレクターを渡すと、実際のマウスとキーボード（2本指はポインターイベント）で各操作を行い、操作部自身の変更イベントからビューを読み取って、表のとおり変わったかを調べます。移動では、ビューを撮影して、操作部が示すピクセル数だけ絵が動いたかも調べるので、移動を無視するページは失敗します。キーの行には、ビューに`tabindex`が必要です。失敗した操作は、すべて1つのエラーに名前が出ます。

平らな地図のように、回転やロールがないビューは、その理由を書いて申告します。黙って飛ばすことはできません。`GESTURES`は名前の一覧、`GESTURE_NAMES`はその順番、`bestShift`は絵の確認で使う探索です。

```js no-run
import { checkGestures } from "@johnmorrisdotca/kazoku-ui/testing";

await checkGestures(page, "#view");
await checkGestures(page, "#map", { lacks: { turn: "a flat map", roll: "a flat map", "key-turn": "a flat map" } });
```

## 関連

要素なしでビューを動かす方法：[ビューのコントローラーと計算](view-controller.md)。ポインターの下の面がポインターに付いてくるという決まりは、リポジトリの[ドラッグの決まり](../../drag-rule.md)にあります（英語）。
