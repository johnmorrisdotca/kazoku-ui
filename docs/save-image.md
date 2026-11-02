# Save image

`<kazoku-save-image>`: Save PNG and Save SVG buttons for a canvas, an SVG or any element on the page. It never draws the scene: it saves what the target shows, hands the picture to the browser
as a download, and tells the page with an event.

```html
<canvas id="art" width="360" height="200"></canvas>
<kazoku-save-image for="art" name="my-picture"></kazoku-save-image>
<script type="module">
  import "@johnmorrisdotca/kazoku-ui/save-image/define";
</script>
```

| Target | Buttons | How |
|---|---|---|
| A `<canvas>` | Save PNG | The canvas' own pixels, at its own size. |
| An `<svg>` | Save PNG, Save SVG | The SVG is written out standing alone (namespaces, size, `viewBox`, and the styles it is drawn in), as SVG, or drawn as a PNG. |
| Any other element | Save PNG | Drawn through an SVG `foreignObject`, with every computed style written in: layout, colours, borders, radii, text, inline SVG. A `<canvas>` inside it is drawn in as a picture. |

## Attributes

| Attribute | |
|---|---|
| `for` | The id of the target; found in the button's own tree first, so it works inside a shadow root. Or set `element.target = someElement`. |
| `formats` | `png svg`: which buttons, in order. One the target cannot give (SVG of a canvas) is left out. |
| `name` | The file name without its extension: `image` by default. Anything unsafe in a file name (`/ \ : * ? " < > |`, control characters) becomes `-`. |
| `scale` | PNG pixels for each CSS pixel of an SVG or element: 2 by default. Held so that no side passes 8192 pixels and the whole stays within 36 million, whatever you ask. A canvas is saved at its own pixel size (size it for a sharper picture). |
| `background` | A CSS colour painted behind a PNG. Transparent without it. |
| `manual` | Make the picture and send the event, but download nothing (the page keeps the blob). |
| `no-inline-styles` | Leave the computed styles out of what is saved (a page whose SVG already carries its own attributes, and wants a smaller file). |
| `lang` | `en` or `ja`. Otherwise the nearest `lang` above it, else English. |
| `theme` | `light` or `dark`: its own look, otherwise the page's `data-theme` or the device's. |

`element.save(format?)` saves as a button would and resolves with the same detail as the event (the first button's format by default); `element.words = { png: "Download PNG" }` replaces labels.
Colours are custom properties: `--kazoku-ink`, `--kazoku-surface`, `--kazoku-line`, `--kazoku-accent`; the parts are `group` and `button`.

## Events

`kazoku-save` (bubbles, crosses shadow roots), after the picture is made. `event.detail`:

| Field | Meaning |
|---|---|
| `blob` | The picture. |
| `format` | `png` or `svg`. |
| `width`, `height` | Pixels for a PNG, CSS pixels for an SVG. |
| `filename` | What the browser was offered, with the extension. |
| `reason` | `user` (a button) or `api` (`save()`). |

`kazoku-saveerror` carries `{ format, error, reason }` when it could not (no target, a format the target cannot give, the browser would not draw it). The group also has a status line for a screen reader (Saved, Could not save).

## What a picture of an element cannot carry

The picture is made by the browser drawing an SVG image of the element, and an image has no network and no page behind it. So: web fonts are not in it (the system's fonts are used), `::before` and `::after` are
not drawn, an `<img>` is carried only as a `data:` URL (one whose pixels the page may read is converted; a cross-origin one is left out), and `<use href="#id">` of something outside the element is not found.
Draw such a thing into a canvas and save the canvas.

## Content-Security-Policy

The buttons' styles are adopted as a constructable stylesheet (see [csp.md](csp.md)). A canvas is saved with no request. An SVG or element is drawn through an image with a `data:` URL, so a page that sets `img-src`
must allow `data:` for those two; `demo/csp.html` runs with `img-src data:` and a strict `style-src`.

## Without the element

```js
import { renderImage, downloadBlob, saveImage, filenameFor } from "@johnmorrisdotca/kazoku-ui/save-image";

const { blob, width, height } = await renderImage(document.getElementById("art"), { format: "png", scale: 2, background: "#fff" });
downloadBlob(blob, filenameFor("my picture", "png")); // "my picture.png"
await saveImage(svgElement, { format: "svg", name: "jersey" }); // both in one
```

`serializeSvg(svg)`, `serializeElement(element)`, `svgToPng(text, width, height, scale, background?)`, `kindOf`, `sizeOf`, `parseFormats`, `formatsFor`, `pixelSize` and the words are there too. Nothing touches the DOM at import,
so the entry imports on a server.

## Looking at it

48 px buttons; on a phone the words are left to a screen reader and the download icon stays. Labels in English and Japanese ([labels.md](labels.md)). `demo/save-image.html` saves a canvas, an SVG and a piece of the page and
shows what came back. `pnpm test:demo` plays it in Chromium and WebKit at a phone's width and a desk's (`e2e/save-image.demo.mjs`): each file read from disk (the PNG header and size, pixels drawn back from the saved file, the SVG
drawn with none of the page's styles), the colour asked for, the scale and its limits, `manual`, the error event, Japanese, a target inside a shadow root, and the same under a strict policy.
