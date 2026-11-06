# Labels

The labels of the view controls, the theme switch, the language picker, the save-image buttons, the speed buttons and the embed panel, in English and Japanese. `lang="ja"` (on the element or on a parent) chooses Japanese; anything else is English. Every key is in both
languages, and `test/controller.test.ts` holds that. Your own words go over either set: `element.words = { front: "Home" }`, or `wordsFor("ja", { front: "ホーム" })`.

The Japanese is written for the interface and has not yet been read by a native speaker.

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | View controls | 表示の操作 | hyōji no sōsa, controls of the view |
| `angle` | Angle | 角度 | kakudo, angle |
| `tilt` | Tilt | 傾き | katamuki, tilt |
| `autoTurn` | Auto-turn | 自動回転 | jidō kaiten, automatic turning |
| `front` | Front | 正面 | shōmen, front |
| `zoom` | Zoom | ズーム | zūmu, zoom |
| `zoomOut` | Zoom out | 縮小 | shukushō, make smaller |
| `zoomTwo` | Zoom to 2 times | 2倍にする | nibai ni suru, make it 2 times (not shown any more; kept for a page's own `words`) |
| `zoomIn` | Zoom in | 拡大 | kakudai, make larger |
| `fit` | Fit | 全体 | zentai, the whole |
| `centre` | Centre | 中央 | chūō, the middle |
| `pan` | Move the view | 表示を動かす | hyōji o ugokasu, move the view |
| `panLeft` | Move left | 左へ | hidari e, to the left |
| `panRight` | Move right | 右へ | migi e, to the right |
| `panUp` | Move up | 上へ | ue e, up |
| `panDown` | Move down | 下へ | shita e, down |
| `drag` | What a drag does | ドラッグの動作 | doraggu no dōsa, what dragging does |
| `dragMove` | Move | 移動 | idō, move |
| `dragTurn` | Turn | 回転 | kaiten, turn |
| `zoomLevel` | Zoom level | ズーム倍率 | zūmu bairitsu, zoom ratio |
| `zoomReset` | back to Fit | 全体に戻す | zentai ni modosu, put back to the whole |
| `more` | More | 詳細 | shōsai, details |
| `speed` | Speed | 速さ | hayasa, speed |
| `direction` | Turn direction | 回る向き | mawaru muki, the way it turns (the Left and Right buttons' group) |
| `turnLeft` | Left | 左へ | hidari e, to the left |
| `turnRight` | Right | 右へ | migi e, to the right |
| `slow` | Slow | ゆっくり | yukkuri, slowly |
| `medium` | Medium | ふつう | futsū, normal |
| `fast` | Fast | はやい | hayai, fast |
| `gestures` | Turn: drag. Tilt: drag up or down. Roll: Shift and a drag, or a two-finger twist. Move: the wheel, Shift and the wheel, Space and a drag, or the middle button. Zoom: Ctrl, Command or Alt with the wheel, or a pinch. Front and Fit: Home or 0. | 回転：ドラッグ。傾き：上下のドラッグ。ロール：Shiftを押しながらのドラッグ、または2本指のひねり。移動：ホイール、Shiftとホイール、Spaceを押しながらのドラッグ、またはマウスの中ボタン。ズーム：Ctrl、Command、またはAltを押しながらのホイール、あるいはピンチ。正面と全体表示：Homeまたは0。 | kaiten, drag. The gesture list a screen reader reads. Not shown. |

## Theme switch

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Colour theme | テーマ | tēma, theme |
| `light` | Light | ライト | raito, light |
| `dark` | Dark | ダーク | dāku, dark |
| `auto` | Auto | 自動 | jidō, automatic (the device decides) |

## Language picker

One label. The languages themselves are never translated: each is written in its own language (English, 日本語, Français).

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Language | 言語 | gengo, language |

## Save image

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Save image | 画像を保存 | gazō o hozon, save the picture |
| `png` | Save PNG | PNGで保存 | PNG de hozon, save as PNG |
| `svg` | Save SVG | SVGで保存 | SVG de hozon, save as SVG |
| `saved` | Saved | 保存しました | hozon shimashita, it was saved |
| `failed` | Could not save | 保存できませんでした | hozon dekimasen deshita, it could not be saved |

## Speed buttons

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Speed | 速さ | hayasa, speed (the group's name; a `label` attribute replaces it) |

The buttons themselves say their numbers (`0.5×`, `1×`, `2×`), which need no translation.

## Replay bar

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Playback | 再生の操作 | saisei no sōsa, controls of playback (the bar's name) |
| `play` | Play | 再生 | saisei, play |
| `pause` | Pause | 一時停止 | ichiji teishi, pause |
| `start` | Start | 最初へ | saisho e, to the start |
| `repeat` | Repeat | 繰り返し | kurikaeshi, repeat |

## Options window

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `group` | Options | オプション | opushon, options (the window's name when the page gives it none) |
| `collapse` | Collapse | しまう | shimau, to fold it away |
| `expand` | Open | 開く | hiraku, to open |
| `help` | Help | ヘルプ | herupu, help |
| `closeHelp` | Close help | ヘルプを閉じる | herupu o tojiru, close the help |

The gesture line in the help is the view controls' `gestures` sentence, not a second copy.

## Embed panel

| Key | English | 日本語 | Reading and meaning |
|---|---|---|---|
| `title` | Put it in your page | 自分のページに入れる | jibun no pēji ni ireru, put it in your own page |
| `size` | Size | 大きさ | ōkisa, size |
| `kinds` | How your page is made | ページの作り方 | pēji no tsukurikata, how the page is made |
| `pick` | What to put in | 入れるもの | ireru mono, the thing to put in |
| `search` | Search | さがす | sagasu, to look for |
| `all` | All | すべて | subete, all |
| `none` | Nothing matches | 見つかりません | mitsukarimasen, nothing was found |
| `preview` | Preview | プレビュー | purebyū, preview |
| `code` | Code | コード | kōdo, code |
| `copy` | Copy code | コードをコピー | kōdo o kopī, copy the code |
| `copied` | Copied | コピーしました | kopī shimashita, it was copied |
| `copyFail` | Select the code and copy it by hand. | コードを選んで、手でコピーしてください。 | kōdo o erande, te de kopī shite kudasai, select the code and copy it by hand |
| `open` | Open the embed page | 埋め込みページを開く | umekomi pēji o hiraku, open the embed page |
| `docs` | Read the docs | ドキュメントを読む | dokyumento o yomu, read the documents |
| `credits` | Credit | クレジット | kurejitto, credit |
| `kind_module` | ES module | ESモジュール | ES mojūru, ES module |
| `kind_image` | Image | 画像 | gazō, picture |
| `kind_element` | Custom element | カスタム要素 | kasutamu yōso, custom element |

The other tabs (`kind_url` (an iframe address), `kind_html`, `kind_react`, `kind_vue`, `kind_angular`, `kind_svelte`, `kind_iframe`, `kind_svg`) are product and format names and read the same in both languages. A package's own tab names go in `element.labels`.
