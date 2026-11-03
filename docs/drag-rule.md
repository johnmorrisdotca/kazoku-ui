# The drag rule: the surface follows the pointer

In every 3D or turnable view of the family (a globe, a garment, a rocket, a card, a device), **the surface under the pointer follows the pointer**:

- Drag right and the surface under the pointer moves right. Drag up and it moves up.
- The arrow keys agree: Arrow Right moves the surface right, and Arrow Up moves it up (the way a drag up does; `key-tilt="wheel"` swaps only the up and down keys). The wheel zooms about the pointer and never tips; Shift and the wheel, or a sideways swipe, turns.
- Auto-turn goes the object's real way: a globe turns west to east, so its surface moves left to right.
- On a globe, or any piece with a known on-screen radius, the point you touch **stays under the pointer**: a drag of 40 pixels moves the ground at the middle of the globe by 40 pixels. That is *exact grab*.

The shared controls' numbers (`yaw` goes up as the hand goes right, `tilt` goes up as the hand goes up) are the same in every package; the package decides what they mean in its scene. A package whose scene moves the other way when `yaw` goes up has the drawing's sign wrong, not the controls: change the drawing, never the key or the drag.

A view that has been dragged away is put right with **Centre** (`element.centre()`, and the key Home): the object in the middle at Fit and the default angle.

## Exact grab

By default a drag turns the view by a fixed angle across its size: a half turn (180 degrees) across the width and 60 degrees down the height. On a round object that is not what the hand expects: in a view 300 pixels wide the ground of a globe moves about 1.5 pixels for each pixel of drag sideways and half a pixel up and down, and in a wide view much less. Give the controls the object's radius and the angle comes from it instead:

```html
<kazoku-view-controls for="globe" grab-radius="120"></kazoku-view-controls>
<kazoku-view-controls for="globe" grab-radius="fit"></kazoku-view-controls>
```

- `grab-radius` is the on-screen radius of the globe, in CSS pixels, at Fit (zoom 1). `fit` takes half the smaller side of the view, for a globe that fills it.
- A drag of *d* pixels then turns the view by *d / radius* radians on both axes, the angle that carries a point at the middle of the face by *d* pixels. At a zoom of *z* the radius is *z* times larger, so the same pixels turn it less.
- Left out (the default), nothing changes: the fixed angle across the view, as before.
- In code: `createViewController({ grabRadius: 120 })` and `view.grabRadius = "fit"` (a member that can change at any time), and `dragTurn(..., grabRadius)` and `degreesPerPixel(radius)` in the maths.
- A finger still does not tilt (the page's own scroll keeps the vertical drag), and the tilt limit holds.

The exact angle is exact at the middle of the face; near the edge of a sphere the surface moves less than the pointer (the sphere is turning away), which is how a real ball under a finger behaves.

The demo's `grab.html` draws a globe and turns it this way; `?grab=off` shows the fixed angle beside it.

## The shared browser check

`templates/e2e-ground.mjs` is a Playwright helper, copied unchanged into a package's `e2e/` folder as `ground.mjs` (with `e2e-ground.d.mts` as `ground.d.mts` where the tests are TypeScript). It moves a real pointer and real keys, takes a picture of the view before and after, and finds how far the ground moved by sliding the middle of the first picture over the second.

```js
import { checkExactGrab, checkFollowsTheHand } from "./ground.mjs";

test("the globe follows the hand", async ({ page }) => {
  await page.goto("/?look=thick&speed=0");
  await checkFollowsTheHand(page, { view: "#globe", controls: "kazoku-view-controls", autoTurn: "right" });
  await checkExactGrab(page, { view: "#globe", radius: 120 });
});
```

| Function | What it does |
|---|---|
| `checkFollowsTheHand(page, { view, picture, window, controls, min, settle, keys, autoTurn, distance })` | A drag right moves the ground right and not up or down, a drag up moves it up and not sideways, Arrow Right and Arrow Up agree, and with `autoTurn: "right"` (or `"left"`) Auto-turn moves the ground that way. The view is put back after each step. |
| `checkExactGrab(page, { view, picture, radius, tolerance })` | A drag of a few pixels moves the ground at the middle of the view by as many pixels, sideways and up, within `tolerance` (0.2) of the drag. |
| `movedBy(page, view, act)`, `groundShift(page, before, after)`, `dragBy(page, target, dx, dy)` | The parts, for a check of your own: how far the ground moved while `act` ran; the best shift between two PNGs; a real drag from the middle of an element. |
| `bestShift(before, after, w, h, reach)` | The finder itself, on grey values; it runs in Node and has its own unit test. |

`view` is the element the hands are bound to and `picture` what is photographed (the view unless you name another): when the view is much wider than the globe, name the globe's own canvas so that the middle of the picture is ground. `window` is the part of the picture that is followed, `[left, right, top, bottom]` as shares (the middle 40% by default): for a thin object such as a rocket, give the part that holds it. Use a picture with texture in the middle: a plain colour has no ground to follow, and the check says it could not find one. The pictures are taken at CSS pixel scale, so a screen with a pixel ratio of 2 gives the same numbers. Hold the scene still before the first picture (stop Auto-turn, fix the clock), and draw in software (`SOFTWARE_GL_ARGS`) when the view is WebGL.

Run it in every package with a turnable view. A package that fails files a ticket on its board saying which of the checks fails, and fixes the sign in its drawing, never in the controls.
