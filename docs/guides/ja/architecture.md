---
title: アーキテクチャ
section: explanation
order: 12
description: パッケージが部品にどう分かれているか、各部品の中身、純粋なコード・要素・登録の3ファイルに分ける理由、リポジトリの決まりを説明します。
---

[English](../architecture.md)

Kazoku UIは、実行時の依存のない、ESモジュールにコンパイルされるふつうのTypeScriptです。決まりは**1つの部品に、1つのサブパス**です。ファミリーのインターフェースの各部品は`src/<part>/`にあり、`@johnmorrisdotca/kazoku-ui/<part>`としてエクスポートされるので、ページは使うものだけを読み込みます。

## 部品

| 部品 | ソース | サブパス |
|---|---|---|
| 表示の操作 | `src/view-controls/` | `/view-controls`、`/view-controls/element`、`/view-controls/define` |
| テーマの切り替え | `src/theme-switch/` | `/theme-switch`、`/theme-switch/element`、`/theme-switch/define` |
| 言語の選択 | `src/language-picker/` | `/language-picker`、`/language-picker/element`、`/language-picker/define` |
| 画像の保存 | `src/save-image/` | `/save-image`、`/save-image/element`、`/save-image/define` |
| 速さのボタン | `src/speed-buttons/` | `/speed-buttons`、`/speed-buttons/element`、`/speed-buttons/define` |
| 埋め込みパネル | `src/embed-panel/` | `/embed-panel`、`/embed-panel/element`、`/embed-panel/define` |
| 共有レンダラー | `src/renderer/` | `/renderer` |
| フリーズ検査 | `src/testing/` | `/testing` |
| アドレスの状態 | `src/address-state/` | `/address-state` |
| 共有の内部 | `src/shared/` | 部品が使います。エクスポートされません |

メインのエントリー`@johnmorrisdotca/kazoku-ui`がエクスポートするのは、部品のサブパスを追加された順に並べた`PARTS`と、型`Part`だけです。

## 部品ごとに3ファイル

要素のある部品は3つのファイルでできていて、この分け方が要点です。

1. **純粋なコード**（`index.ts`）：計算、ラベル、解析、関数。インポート時にDOMがないので、サーバーでもインポートでき、テストはNodeで動かせます。
2. **要素**（`element.ts`）：クラス（`ViewControlsElement`、`ThemeSwitchElement`、`LanguagePickerElement`、`SaveImageElement`）。ブラウザーが必要で、インポートしても何も登録されません。
3. **登録**（`define.ts`）：先に`customElements.get`を呼び、タグが空いているときだけ定義します。

部品は、ページのシーンを描いたり、ページの選択を反映したりすることはありません。ユーザーが選んだことを知らせ、反映するのはページです。テーマの切り替えは`data-theme`を書き、言語の選択は`lang`を書き、表示の操作は`kazoku-viewchange`を送ります。

## 共有の内部

`src/shared/`は、要素に共通のもので、エクスポートされません。`base.ts`（すべての部品のスタイルの土台：カスタムプロパティの色、ライトとダーク、48 pxのボタン、フォーカスリング）、`adopt.ts`（厳格なポリシーが許す方法でスタイルをシャドウルートに入れる：構築可能なスタイルシート、なければnonce付きの`<style>`）、`scheme.ts`（`data-scheme`を、ページの色、つまり強制された`data-theme`か端末のものに合わせて保つ）、`store.ts`（例外を投げることもある`localStorage`。プライベートウィンドウやサンドボックスのフレームは、空の記憶と同じ扱い）、`target.ts`（部品が書き込む要素をセレクターで探す。まず要素自身のツリー、次にドキュメント。セレクターがなければ`<html>`）です。

## 表示の操作の仕組み

コントローラー（`controller.ts`）は、カメラ`{ yaw, tilt, zoom, panX, panY }`と、操作（ポインター、ピンチ、ホイール、キー）を持ちます。`math.ts`と`zoomScale.ts`の純粋な計算の上に作られたステートマシンで、時計は外から渡されるので、テストでは手で回せます。要素は、バーを描き、コントローラーをビューに結びつけ、イベントを送ります。`sight.ts`は、ビューが見えているかを見張り、見えないあいだ自動回転がフレームを要求しないようにします。`address.ts`は選択を読み書きし、`levels.ts`はレベル、速さ、レイアウトを持ち、`zoomScale.ts`はスライダーの目盛り、`words.ts`はラベルを持ちます。

## リポジトリが守る決まり

- **実行時の依存はありません。** 便利だからという理由で依存を加えることはしません。
- **タグを登録するとき、すでに使われているタグには手を出しません。**
- **操作はビューの上かそのそばにあって、スクロールなしで見え、操作を変えても回転を止めたり、リセットしたりしません。スマートフォンでは小さなバーにし、動きの軽減に従い、ライトとダークに対応し、48 pxのタッチターゲットを使い、ブラウザー標準のコントロールは使いません。**
- **ラベルは英語と日本語で、**すべてのキーが両方にあります（テストが守らせます）。
- **マークなし。** ブランド、リーグ、連盟、スポンサーのマークは使いません。
- **変えたものをテストする。** `test/`に単体テスト（計算、アドレス、テストが手で回す時計つきのコントローラー）、`e2e/`に実ブラウザーでのデモのテスト（Chromiumとスマートフォン幅・デスクトップ幅のWebKit。Chromiumはソフトウェアで描画）。
- **フリーズ検査のない3Dのリリースはしない。** [共有レンダラー](renderer.md)を参照。

## ファミリーがコピーするもの

`templates/`には、ファミリーのほかのパッケージのリポジトリが、そのままコピーするファイルがあります。`AGENTS.md`、`check-standard.mjs`（必須項目の一覧を検査にしたもの）、`e2e-ground.mjs`とその型（ドラッグの決まりの共有ブラウザー検査）、`docs-site.demo.mjs`（ドキュメントサイトのブラウザー検査）です。`.github/workflows/reusable-release.yml`は、一度だけ書かれたリリースです。これらは、ここで新しいバージョンとともに変更され、そのあと各リポジトリのコピーに反映されます。パッケージが自分のコピーを編集することはありません。

## テスト

`pnpm test`は、TypeScriptのソースを`node --test`で動かす単体テストを実行します。`pnpm test:package`は、npmと同じようにパッケージをパックし、空のプロジェクトにインストールして、すべてのエントリーをインポートします。`pnpm test:demo`は、デモをビルドして、ChromiumとWebKitで動かします。`pnpm test:readme`は、READMEとガイドのすべての例を、Nodeとブラウザーで実行し、`pnpm docs:check`は、リファレンスとガイドがコードと食い違っていないかを検査します。
