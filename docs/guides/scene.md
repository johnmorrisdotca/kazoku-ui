---
title: The shared scene
section: how-to
order: 25
description: One scene, one camera and one clock from the layers of many packages on the renderer's one WebGL context, in one frame of kilometres in float64, with a floating origin and two depth slices.
---

`@johnmorrisdotca/kazoku-ui/scene` lets a page draw the layers of several packages (stars, an Earth, planets, a rocket) in **one scene, with one camera and one clock, on the shared renderer's one WebGL context**. Before it, a page shared a context but every view was its own scene with its own camera. three.js stays the page's own: the host passes its copy of `three`, and nothing here imports it. The part has no DOM and imports on a server.

The host owns the scene and the camera. A package owns a **layer**: it gives the host bodies, an optional sky, and a way to place and turn them for a moment.

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

## The frame: the SPX frame, in kilometres, in float64

Every position that crosses a package's border is a `Vec3Km`: three float64 numbers in **kilometres** in the SPX frame, which is J2000 equatorial turned so that y is up, as three.js wants it: **x to the vernal equinox, y to the celestial north pole, z = minus the equatorial y** (a star is x = cos dec cos ra, y = sin dec, z = minus cos dec sin ra). The origin is the Earth's centre, with no aberration or light time. It is not ecliptic. Never float32 scene units.

**True scale only.** A body too small to see is not inflated: the layer draws a marker of a few pixels (`frame.camera.heightPx` says how many device pixels the view is tall), and its real geometry stays true.

**A floating origin.** Float32 cannot hold Neptune and a rocket's rivet in one number. Each frame the host gives every layer `focusKm` (the focused body's centre, float64) and `unitKm` (kilometres to a scene unit, the focused body's radius by default). A layer sets `object.position = (placeKm - focusKm) / unitKm` and `object.scale = sizeKm / unitKm`; `placeInFrame(object, placeKm, frame, sizeKm)` is that one line. No layer bakes an absolute coordinate into geometry. The camera orbits the origin.

## What a layer is

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

- `sky` (optional) is an object drawn at infinity, first, with no depth: a star sphere with its points `SKY_RADIUS` (100) scene units from the origin. The host draws it with a camera at the origin that turns with the view and never moves (`SKY_NEAR` 1, `SKY_FAR` 1000).
- `placeKm(ms)` is on the body, which the design this part follows did not have: the host needs the focused body's place **before** it tells the layers where the origin is. The host works every body's place once a frame and hands them all in `frame.positionsKm`.
- Everything a body draws, its lights included, is inside its `root`: the host switches `root.visible` for each depth slice and puts the layer's own value back.
- `frame.ms` is the clock's moment: the same number for every layer in one draw. `frame.sunKm` is where the Sun is, for whoever needs light; `composeScene` takes a `sun(ms)` function (wakusei-planets' `frameAt` times the astronomical unit), and `lowPrecisionSun(ms)` (about 0.01 degrees, 1950 to 2050) is the default. Packages do not import each other: the host reads the Sun and hands it on.

## Two depth slices

The surfaces of the family's planets are custom shaders, which a logarithmic depth buffer does not cover without editing each one. Instead the host draws the sky first, with no depth; clears the depth buffer; draws the **far** bodies; clears it again; and draws the **near** bodies over them (`planSlices` makes the plan each frame). A body is in the near slice when its nearest surface is within 1000 times the nearest surface of all; each slice's near plane is half its nearest surface and its far plane is just past its farthest edge, so no body is cut and the ratio stays within what a 24-bit buffer resolves. From 400 km above the Earth with the camera close to a rocket, the rocket is the near slice and the Earth and the Moon are the far one; at the Moon, the Earth is whole inside its slice. A body is drawn whole in one slice, so the near slice always draws over the far one.

The renderer change this needed is small and optional: `Scene3D` has an optional `render(gl)`, and `GLRenderer` the optional `autoClear` and `clearDepth()`, so a scene may draw its own passes. A renderer without `clearDepth` draws everything once over the whole range. The proof page decides whether two slices are enough; this part's own demo, `scene.html`, draws a sphere at the Earth's size, one at the Moon's distance, a satellite and the stars, and the freeze test (`pnpm test:freeze`) checks there is one context, nothing is drawn at rest, at most 30 frames a second, the GPU objects stay flat over twenty changes of focus, every body is whole inside its slice, and two frames at rest are the same picture.

## The camera and the clock

- `scene.camera` is kept outside any one built scene, so it survives the renderer's rebuilds (a still, a view that lets go and comes back). It orbits the focused body: `state` is `{ focus, distanceKm, yaw, tilt, fovDeg }`; `set` changes any of it; `focusOn(id)` moves the origin to a body and takes the distance that fits it; `look({ yaw, tilt, zoom })` takes the view controls' state straight from `kazoku-viewchange` (zoom 1 fits the body; the camera never goes inside it); `fitKm(id)` is the fitting distance; `onChange` hears every change.
- **One clock.** Each frame the clock is advanced once and every layer gets the same `ms`. `focusOn` calls `clock.openAt(body.openingSpeed)`, so the opening speed follows the body in focus until the reader sets a speed (see [the clock](clock.md)).
- **It rests.** The built scene asks to be drawn again only while the clock runs or a layer still moves. `scene.bind(view)` draws again when the clock is set, played, paused or sped, and when the camera moves, and not on a tick. A paused clock is a view at rest: no frame is requested. The renderer's own cap of 30 frames a second holds.
- `scene.credits()` is each layer's credits once, for the page's credit line; `scene.stats` counts frames and passes and gives the last frame's slices; `scene.dispose()` lets every layer go (the renderer lets go of the scenes it built; the layers are the page's to dispose, once).

## The parts

| Import | What it is |
| --- | --- |
| `scene` | `composeScene`, `placeInFrame`, `planSlices`, `orbitOffsetKm`, `fitDistanceKm`, `lowPrecisionSun`, `subKm`, `lengthKm`, `AU_KM`, `SKY_RADIUS`, `SKY_NEAR`, `SKY_FAR` and the types of a layer. No DOM. |
