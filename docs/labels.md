# Labels

The labels of the view controls, the theme switch, the language picker and the save-image buttons, in English and Japanese. `lang="ja"` (on the element or on a parent) chooses Japanese; anything else is English. Every key is in both
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
| `slow` | Slow | ゆっくり | yukkuri, slowly |
| `medium` | Medium | ふつう | futsū, normal |
| `fast` | Fast | はやい | hayai, fast |

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
