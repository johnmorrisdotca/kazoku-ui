# Shared 3D renderer

`@johnmorrisdotca/kazoku-ui/renderer`: one WebGL context for a whole page, handed to the view that has the focus, with every other view showing a still. For a page that
holds many 3D views (a wall of cards, a binder, a list of devices). three.js stays the page's own dependency; this part never imports it.

Why one context: a browser keeps about 16 WebGL contexts and silently kills the older ones, so 40 live views is 24 broken ones and 36,000 draws a second (measured in
headless Chromium on 40 cards). Before this part, three packages each solved it alone and got it wrong in three ways: a draw loop that asked for two frames for every
one it drew, GPU buffers never given back, and a canvas with no pixel cap (24 MP on a 5K screen at ratio 2).

## How a package uses it

three.js is a **peer dependency** (optional: a page of stills ships no 3D code, because three loads only when the first view goes live). The page, not this part, does the
`import("three")`, so its bundler resolves its own copy and nothing is bundled twice:

```ts
import { createSharedRenderer, type Item3D } from "@johnmorrisdotca/kazoku-ui/renderer";

const renderer = createSharedRenderer({ load: () => import("three") });   // nothing is loaded yet

// The package's adapter: what one kind of item looks like.
const cube = (colour: string): Item3D<typeof import("three")> => ({
  key: `cube:${colour}`,                       // items with the same key share one still
  build({ three, assets, width, height }) {
    const geometry = assets.acquire("geometry:cube", () => new three.BoxGeometry(1, 1, 1), (g) => g.dispose());
    const material = assets.acquire(`material:${colour}`, () => new three.MeshStandardMaterial({ color: colour }), (m) => m.dispose());
    const scene = new three.Scene();
    scene.add(new three.Mesh(geometry, material), new three.AmbientLight(0xffffff, 2));
    const camera = new three.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.z = 5;
    return { scene, camera, resize: (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); } };
  },
});

const view = renderer.view(hostElement, cube("#2457d6"));   // the host shows a still; no GL yet
view.showStill();                                           // make the still when the host comes into sight
hostElement.addEventListener("focus", () => view.focus());  // the focus policy is the package's
```

A package that imports `/renderer` from its own element lists `@johnmorrisdotca/kazoku-ui` as a dependency and `three` as a `peerDependency` (marked optional in
`peerDependenciesMeta` if it works without 3D); a package that uses it only in its demo makes both devDependencies. Say which in the hand-off.

The camera: `view.invalidate()` draws the view at the next frame. Nothing is drawn without it, so connect it to whatever moves the view, for example `<kazoku-view-controls>`:

```ts
controls.view = view.host;                                                      // bind the hands to the live host
controls.addEventListener("kazoku-viewchange", (e) => { view.scene.pose(e.detail); view.invalidate(); });
```

## What it does for you

| | |
|---|---|
| One renderer | `view.focus()` moves the single canvas into that view's host and builds its scene; the view that had it goes back to its still. Resolves `true` when the view is live, `false` if another view took the focus meanwhile or WebGL is not available. |
| Shared assets | Everything a scene needs goes through `assets.acquire(key, make, dispose)`: made once for the first asker, shared by key, counted, disposed `lingerMs` (1 s) after the last view lets go (a view that lets go just before the next takes the same shape does not rebuild it). `disposeDeep(model)` frees a loaded model's geometries, materials and textures. |
| Stills | `view.showStill()` renders the item once from the same renderer (one at a time, at `stillSize` pixels) into a PNG blob and shows it in an `<img>` the part makes in the host (or the one you pass as `still`). Items with the same `key` share a picture. They sit in a least-recently-used list with a byte budget (`stillBytes`, 32 MB decoded); a picture that falls out is made again when its view next needs it. |
| Drawing on demand | One scheduler for every view. A page at rest asks the browser for nothing: no animation frame, no draw. Exactly one frame is requested at a time, whoever asks and whenever, including from inside a draw. A frame has a budget: at most 2 draws and 10 ms before a new draw starts, the focused view first. |
| Out of sight | The live view's host is watched (`IntersectionObserver`) and the tab's visibility too: out of sight or in a hidden tab no frame is requested. After `releaseMs` (30 s) out of sight the context itself is let go (`forceContextLoss`), so the GPU memory is free; the views keep their stills, and the context is made again when the view is seen. |
| Pixel budget | `pixelRatioFor(width, height, deviceRatio)`: at most 6 million pixels, 4096 on a side, ratio 2. A 5K screen at ratio 2 is drawn at about 1.5 and scaled up by CSS, not at 24 MP. All three limits are options. |
| Context loss | `webglcontextlost` is prevented (so the browser may restore it), drawing stops, the still is shown, and `onContext("lost")` is called; on `webglcontextrestored` the view draws again. Calling `view.focus()` on a view whose context never came back builds a new one. |

## API

- `createSharedRenderer({ load, maxPixels, maxSide, maxRatio, stillSize, stillBytes, lingerMs, releaseMs, antialias, onContext, clock, document, assets, scheduler })`.
- `renderer.view(host, item, { still })` returns a view: `focus()`, `blur()`, `invalidate()`, `showStill()`, `dispose()`, `live`, `scene`, `host`, `item`.
- `renderer.focused`, `renderer.stats` (`contexts`, `draws`, `snapshots`, `live`, `lost`, `canvas`, `frames`, `assets`, `stills`), `renderer.assets`, `renderer.stills`, `renderer.scheduler`, `renderer.dispose()`.
- An item is `{ key, build({ three, assets, width, height }) }` returning `{ scene, camera, update?, resize?, dispose? }`; `update(dt, now)` returns true while something moves, and the view is then drawn again next frame.
- The parts alone, with no DOM: `createScheduler`, `createAssetCache`, `createStillCache`, `pixelRatioFor`, `disposeDeep`.

The host needs a size (CSS) and is made `position: relative` if it is static; the canvas fills its padding box. Several visible live views at once are not supported
(that is the point); a package that needs them renders to the one canvas and copies into each host's own 2D canvas.

## The freeze checks (`@johnmorrisdotca/kazoku-ui/testing`)

The same assertions for every 3D package's e2e. The kit names no test framework; Playwright's `page` fits.

```js
import { COUNT_SCRIPT, canvasSize, gpuObjects, readCounts, withinPixelBudget } from "@johnmorrisdotca/kazoku-ui/testing";

await page.addInitScript(COUNT_SCRIPT);           // before page.goto: counts contexts, GL objects, draws and animation frames
await page.goto(url);
const before = await readCounts(page);
// ... focus thirty views, fifty times ...
const after = await readCounts(page);
expect(after.contexts).toBe(1);                                  // one WebGL context
expect(gpuObjects(after)).toBe(gpuObjects(before));              // created minus deleted: flat over the run
expect(withinPixelBudget(await canvasSize(page))).toBe(true);    // at 5120x2880, ratio 2: within 6 MP and 4096 a side
// and at rest: wait, read again, and expect draws and rafRequests not to have moved.
```

This repository's own check is `e2e/renderer.demo.mjs`, on `demo/renderer.html` (thirty views on one renderer): contexts = 1 over fifty focus changes with at most one canvas in
the page, 0 draws and 0 frame requests at rest, the GPU objects, the cache and the stills flat (and the JS heap within 3 MB in Chromium) over fifty more, the canvas within
budget when the focused view fills a 5K screen at ratio 2, no frame while out of sight and the context let go after `releaseMs`, a lost and restored context, the stills
within their byte budget, and one frame request at a time while turning.

## The rule: no 3D release without a freeze test

John, 2026-11-02, after a kernel panic in a Mac's graphics driver during a test run: every package and app with live 3D (WebGL) has both of these, and a release does not go out without them.

1. **A freeze test**, in its release: `e2e/freeze.demo.*` and a `test:freeze` script. It plays the page in headless Chromium and fails on: more than one animation frame asked for at a time, a draw when nothing moves or the view is out of sight, WebGL contexts (live ones) or GPU objects (buffers, vertex arrays, textures, programs) that grow over a run of changes, and a canvas past 6 million pixels or 4096 a side on a 5K screen at a ratio of 2. Count live contexts, not contexts ever made (a context let go takes what it held with it). Examples to copy: uchusen-rockets and hako-devices `e2e/freeze.demo.ts`, senshu-jerseys `e2e/freeze.demo.mjs`, and this repo's `e2e/renderer.demo.mjs`. The release workflow runs it before publishing when the repo's `release.yml` passes `freeze-command: pnpm test:freeze` to `reusable-release.yml`.
2. **Tests draw in software, never on the machine's graphics card.** Every Chromium project in `playwright.config` has `launchOptions: { args: [...SOFTWARE_GL_ARGS] }` (this kit exports it). WebKit has no software switch: off CI its projects `testIgnore` the pages that draw WebGL, and CI plays them. One browser at a time on a developer's machine, closed when finished.

A package with no WebGL (CSS 3D transforms and SVG are not WebGL) needs neither.

## Not in this part

The focus policy (which view is live: one focused card, none when many are on screen) and each item's scene and still framing stay in the package. Models (GLB) are loaded by the
package's `build` and cached through `assets.acquire(key, () => loader.loadAsync(url), (p) => p.then(disposeDeep))`.
