---
title: A name on the globe
section: how-to
order: 27
description: Write a body's name on its globe so it turns with it, in Michroma, painted at half strength by default, with four looks, once, twice or all round, at the equator or near a pole, or always facing the reader.
---

`@johnmorrisdotca/kazoku-ui/body-label` writes a body's name on its own globe, as a film puts a large title over the thing it names: the letters lie on the surface and turn with the body, and the surface shows through them. wakusei-planets' bodies and chikyu-earth's Earth both use it, so the look is the same across the family. three.js is your page's own: you pass it in, and nothing here imports it.

The family's default is John's pick: **Michroma, painted, at half strength, the name once, turning with the body, on the equator**.

```ts no-check
import * as THREE from "three";
import { createBodyLabel, loadBodyLabelFont } from "@johnmorrisdotca/kazoku-ui/body-label";

await loadBodyLabelFont();                       // fetches Michroma (64 kB) once; skip it to use a font your page already has
const label = createBodyLabel(THREE, { text: "EARTH" });
globe.add(label.object);                         // a child of the TURNING globe (a radius-1 sphere), so it turns with it
label.ready.then(() => view.invalidate());       // the name is drawn again once its font is in

// in your frame, only when something moved: hides it when small, turns it to the reader when `facing`
if (label.update(camera, radiusPx)) view.invalidate();

label.set({ look: "etched", repeat: "both" });   // the one texture is drawn again
label.dispose();                                 // texture, material and geometry
```

## The settings

| Setting | What | Default |
|---|---|---|
| `text` | The name as it is written. Pass capitals for the family's look (`EARTH`); any language (`地球`). | (required) |
| `font` | A CSS font family the page has loaded. | `"Michroma"` |
| `fallbackFont` | The family for letters `font` has none of, such as Japanese (`"Noto Sans JP"`). | the page's sans |
| `look` | `painted` (pale letters over the surface), `etched` (the letters lighten the surface), `outline` (only the letters' edges), `burned` (darker letters). | `painted` |
| `strength` | How strongly it shows, 0 to 1. | `0.5` |
| `repeat` | `once`, `both` (two, on opposite sides, so one is always in view), `around` (as many as fit all round). | `once` |
| `latitude` | The band's latitude in degrees: 0 is the equator; 55 or -55 is a band near a pole. Kept within 70 of the equator (`BODY_LABEL_MAX_LATITUDE`). | `0` |
| `longitude` | Where the (first) name is centred, degrees east in the body's own frame. | `0` |
| `size` | `small`, `medium` or `large`: the letters' height, 9, 14 or 20 degrees of latitude (`BODY_LABEL_HEIGHTS`). A name too long for its share of the circle is made smaller until it fits. | `medium` |
| `facing` | True: the name keeps facing the reader while the body turns under it. | `false` |
| `radius` | The globe's radius in its mesh's own units. | `1` |
| `minRadiusPx` | No label while the body is drawn smaller than this, in CSS pixels of radius. | `24` |

Longitude 0 is three's `+x`, the middle of a map on three's `SphereGeometry`, and east runs towards `-z`: a globe whose map is laid the usual way has its names where its map says.

## How it is drawn

The label is one band of a sphere shell just above the surface (1.004 of the radius), with one canvas texture that holds every copy of the name: one texture, one material and one geometry per label, freed by `dispose`. Off the equator a degree of longitude is shorter, so the text is drawn wider by 1 / cos(latitude) and the letters keep their shape. The material is lit like the globe, so a name on the night side is dark too.

`update(camera, radiusPx)` costs nothing when nothing changed: it allocates nothing, redraws no texture, and returns false. It returns true when it hid or showed the label, or turned a facing one, so you know to draw. `set` draws the texture again only when the text, the fonts, the look, the size, the repeat or the place changed; strength alone does not.

The layout is pure and can be used on its own, for a label of your own or a test:

```ts
import { bodyLabelFacing, bodyLabelLayout } from "@johnmorrisdotca/kazoku-ui/body-label";

const layout = bodyLabelLayout({ widthEm: 4.2, repeat: "both" });
console.log(layout.height, JSON.stringify(layout.spans.map((span) => span.centre)));
// the camera out along -z, 90 degrees east: a name centred at 0 turns a quarter round to face it
console.log(Math.round((bodyLabelFacing(0, -5, 0) * 180) / Math.PI));
// 14 [0,180]
// 90
```

## The font

Michroma is by Vernon Adams, "Copyright 2011 The Michroma Project Authors", under the SIL Open Font License 1.1 with no reserved font name. It ships unchanged in the package as `dist/body-label/fonts/Michroma-Regular.ttf` (`BODY_LABEL_FONT_BYTES`, 64,344 bytes) with its licence beside it, `OFL.txt`, and is fetched only when a page calls `loadBodyLabelFont()` (a URL next to the module, loaded with `FontFace`). `BODY_LABEL_FONT` is its family name. Michroma has Latin letters only: Japanese and other scripts are drawn in `fallbackFont`, else the page's sans.

## The family's standard names

A package that draws globes offers the label as plain attributes, which a settings panel can set, and one property with the same options. wakusei-planets and chikyu-earth use exactly these names:

| Attribute | Value |
|---|---|
| `body-label` | `painted`, `etched`, `outline` or `burned`: the look. Absent: no label. |
| `body-label-strength` | 0 to 1 |
| `body-label-repeat` | `once`, `both` or `around` |
| `body-label-latitude` | degrees, such as `0` or `55` |
| `body-label-facing` | present: always facing the reader |
| `body-label-font` | a CSS font family the page has loaded |
| `body-label-fallback-font` | the family for letters the font has none of |

The property is `bodyLabel`: an object with the same options as `createBodyLabel` takes (`{ look: "painted", strength: 0.5, repeat: "once", latitude: 0, facing: false, font: "Michroma", fallbackFont: "" }`), or `null` for none. The text is the body's own name, in the page's language.

## On the demo

[A name on the globe](https://johnmorrisdotca.github.io/kazoku-ui/body-label.html) shows one globe with the four looks, how many, where, three names and Always facing you, in one row, kept in the address. It opens turning unless the reader prefers reduced motion, and draws nothing at rest.
