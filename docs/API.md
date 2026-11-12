# @johnmorrisdotca/kazoku-ui API reference

Every export of @johnmorrisdotca/kazoku-ui 0.40.2, one section for each entry point, written by `pnpm docs:api` from the built declarations. Do not edit it by hand: `pnpm docs:check` fails when it is out of date. The guides are in [docs/guides](guides/getting-started.md).

## `@johnmorrisdotca/kazoku-ui`

1 value and 1 type.

```js
import { PARTS } from '@johnmorrisdotca/kazoku-ui';
```

### PARTS

*constant*. The subpaths of the parts, in the order they were added.

```ts
const PARTS: readonly ["view-controls", "theme-switch", "language-picker", "address-state", "save-image", "speed-buttons", "embed-panel", "renderer", "testing", "replay-bar", "options-window", "print", "wide-layout", "page-frame", "interface", "clock", "scene", "body-label"];
```

### Part

*type*

```ts
type Part = (typeof PARTS)[number];
```

## `@johnmorrisdotca/kazoku-ui/view-controls`

60 values and 24 types.

```js
import { between, carryControls, clamp, clampPan, COMMON_ZOOMS, createViewController, DEFAULT_IGNORE, DEFAULT_KEYS, DEFAULT_LIMITS, degreesPerPixel, dragRoll, dragTurn, eulerFromQuat, EVENT, formatAddress, languageOf, LAYOUTS, LEVEL_STORAGE_KEY, MARK_GAP, PACE_FACTOR, PACES, PAN_STEP, parseAddress, parseAxis, parseKeys, parseLayout, parseLevel, parsePace, pendulumTilt, pinchTo, quatFromEuler, quatIdentity, rateSign, readLimits, SLIDER_STEP, SNAP_PX, spinLocal, TAG, TILT_ACROSS, tumbleRates, TURN_ACROSS, upVector, WHEEL_GESTURE_MS, wheelMove, wheelPanPixels, wheelZoomFactor, WIDE, WORDS, wordsFor, wrapYaw, ZOOM_STEP, zoomAbout, zoomAtPosition, ZOOMED, zoomMarks, zoomPosition, zoomSnap, zoomStep, zoomText, zoomToMark } from '@johnmorrisdotca/kazoku-ui/view-controls';
```

### between

*function*. The camera `fraction` of the way (0 to 1) from `from` to `to`, eased out: quick at first, slow at the end.

```ts
function between(from: Camera, to: Camera, fraction: number): Camera;
```

### carryControls

*function*. Give `element` the shared hands, from `connectedCallback`. A drag turns it (and moves it once zoomed), two fingers pinch, Ctrl or Command and the wheel zoom about the pointer, the plain wheel moves it

```ts
function carryControls(element: HTMLElement, options: CarryOptions): ElementControls;
```

### clamp

*constant*

```ts
const clamp: (value: number, low: number, high: number) => number;
```

### clampPan

*function*. Hold the pan so the object cannot be lost. By default the object is the picture, which fills the view at Fit: at zoom z it may move (z - 1) / 2 of the view's size either way, so the picture still covers the view.

```ts
function clampPan(camera: Camera, size: Size | undefined, object?: Size, free?: number): Camera;
```

### COMMON_ZOOMS

*constant*. The zooms a mark goes to, the most wanted first: when two are too close for both labels, the earlier one stays.

```ts
const COMMON_ZOOMS: readonly number[];
```

### createViewController

*function*

```ts
function createViewController(options?: ViewControllerOptions): ViewController;
```

### DEFAULT_IGNORE

*constant*. What `bind` leaves alone by default: the page's own controls inside the view.

```ts
const DEFAULT_IGNORE = "button, a, input, select, textarea, label, [data-kazoku-ignore]";
```

### DEFAULT_KEYS

*constant*

```ts
const DEFAULT_KEYS: AddressKeys;
```

### DEFAULT_LIMITS

*constant*. Zoom draws no more pixels (the canvas is a fixed size), so the default range is wide: from a tenth of Fit to 50 times it. A package passes its own `zoomMax` where its detail runs out.

```ts
const DEFAULT_LIMITS: Limits;
```

### degreesPerPixel

*constant*. Degrees of turn for one pixel of drag when the piece's on-screen radius is `radius` pixels: the pixel that a point at the middle of a sphere's face moves by, so the touched point stays under the pointer.

```ts
const degreesPerPixel: (radius: number) => number;
```

### dragRoll

*function*. A sideways drag that rolls about the view axis. Positive `dx` rolls clockwise, so the surface above the middle moves with the pointer.

```ts
function dragRoll(start: Camera, dx: number, size: Size, grabRadius?: number): number;
```

### dragTurn

*function*. A one-pointer drag that turns: `dx` and `dy` pixels from where it began, in a view of `size`. A finger does not tilt (the page's own scroll keeps the vertical drag). A `step` above 0 rounds the tilt to a multiple of it.

```ts
function dragTurn(start: Camera, dx: number, dy: number, size: Size, tips: boolean, limits?: Limits, step?: number, grabRadius?: number): Pick<Camera, "yaw" | "tilt">;
```

### eulerFromQuat

*function*. The yaw, tilt and roll a quaternion shows on the sliders. Tilt stays within a right angle; the quaternion itself does not flip.

```ts
function eulerFromQuat(q: Quat): {
    yaw: number;
    tilt: number;
    roll: number;
};
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-viewchange";
```

### formatAddress

*function*. The query string (with its `?`, or empty) that keeps `choices` and every other parameter of `search`. A choice at its starting value is left out, so

```ts
function formatAddress(search: string, choices: AddressChoices, keys?: AddressKeys, leaveYaw?: boolean, startZoom?: number, startPace?: number): string;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### LAYOUTS

*constant*

```ts
const LAYOUTS: readonly Layout[];
```

### LEVEL_STORAGE_KEY

*constant*. The localStorage key the level is remembered under, unless `storage` names another.

```ts
const LEVEL_STORAGE_KEY = "kazoku-view-controls";
```

### MARK_GAP

*constant*. The least distance between two marks, as a share of the slider's length, so their labels never touch.

```ts
const MARK_GAP = 0.18;
```

### PACE_FACTOR

*constant*

```ts
const PACE_FACTOR: Record<Pace, number>;
```

### PACES

*constant*

```ts
const PACES: readonly Pace[];
```

### PAN_STEP

*constant*. The arrow pad moves the view by this fraction of the view's size.

```ts
const PAN_STEP = 0.25;
```

### parseAddress

*function*. Read the choices out of a query string (`?yaw=40`, with or without the `?`). Anything missing or not a number is left out of the result.

```ts
function parseAddress(search: string, keys?: AddressKeys, limits?: Limits): Partial<AddressChoices>;
```

### parseAxis

*constant*. An axis from an attribute or the address, in any case and with spaces round it; anything else is `undefined`.

```ts
const parseAxis: (text: string | null | undefined) => TurnAxis | undefined;
```

### parseKeys

*function*. Read `address-keys`: `yaw:a,tilt:b` renames the keys it names and leaves the others.

```ts
function parseKeys(text: string | null): AddressKeys;
```

### parseLayout

*constant*. A layout is one of its words; anything else (or none) is `classic`.

```ts
const parseLayout: (text: string | null | undefined) => Layout;
```

### parseLevel

*constant*

```ts
const parseLevel: (text: string | null | undefined) => Level | undefined;
```

### parsePace

*constant*

```ts
const parsePace: (text: string | null | undefined) => Pace | undefined;
```

### pendulumTilt

*constant*. Tilt swinging inside `amplitude` degrees. `phase` is radians of the swing. At the ends it comes back, so a limited tilt never rolls over.

```ts
const pendulumTilt: (phase: number, amplitude: number) => number;
```

### pinchTo

*function*. The camera for two fingers now at `a` and `b`: zoom by the change of distance about where the pinch began, the middle of the fingers drags the view, and a twist rolls about the view axis. `centre` is the view's middle in client pixels. `free`: the view may move at any zoom, so the fingers drag it zoomed out too.

```ts
function pinchTo(start: PinchStart, a: Point, b: Point, centre: Point, limits?: Limits, free?: boolean): Camera;
```

### quatFromEuler

*function*. Yaw about Y, then tilt about X, then roll about Z, in degrees. Past a right angle the numbers fold, so a tumble that rolls over keeps its quaternion and only shows these for the sliders.

```ts
function quatFromEuler(yaw: number, tilt: number, roll: number): Quat;
```

### quatIdentity

*constant*

```ts
const quatIdentity: () => Quat;
```

### rateSign

*constant*. Which way a signed rate points: -1 or 1. Zero and anything that is not a number count as 1.

```ts
const rateSign: (value: number) => number;
```

### readLimits

*function*. The limits an element's attributes ask for over `base`: `tilt-max`, `roll-max`, `zoom-min` and `zoom-max`, each a positive number or ignored. `zoom-min` is held to 1 or less and `zoom-max` to `zoom-min` or more,

```ts
function readLimits(get: (name: string) => string | null | undefined, base?: Limits): Limits;
```

### SLIDER_STEP

*constant*. One key press on the slider multiplies or divides the zoom by this: finer than a press of + or -.

```ts
const SLIDER_STEP = 1.1;
```

### SNAP_PX

*constant*. How near a mark a drag lets go to it, in pixels: a gentle pull, never a forced step.

```ts
const SNAP_PX = 8;
```

### spinLocal

*function*. Turn `q` by `yaw`, `tilt` and `roll` degrees about its own axes (Y, X, then Z). Small steps stay continuous through the poles: the up vector never jumps.

```ts
function spinLocal(q: Quat, yaw: number, tilt: number, roll: number): Quat;
```

### TAG

*constant*

```ts
const TAG = "kazoku-view-controls";
```

### TILT_ACROSS

*constant*

```ts
const TILT_ACROSS = 60;
```

### tumbleRates

*function*. Degrees a second for a tumble. The three rates differ, and each drifts on its own incommensurate wave, so the motion does not repeat.

```ts
function tumbleRates(seconds: number, speed: number, signs: TumbleSigns): TumbleSigns;
```

### TURN_ACROSS

*constant*. Degrees of turn across the view's whole width (a half turn), and of tilt across its whole height.

```ts
const TURN_ACROSS = 180;
```

### upVector

*function*. The view's up axis after `q`.

```ts
function upVector(q: Quat): Vec3;
```

### WHEEL_GESTURE_MS

*constant*. Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel or one swipe (with its glide).

```ts
const WHEEL_GESTURE_MS = 300;
```

### wheelMove

*function*. What one wheel event asks of the view. Ctrl, Command or Alt zoom about the pointer (a trackpad pinch arrives as Ctrl and small steps).

```ts
function wheelMove(event: {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
}, page?: number): {
    zoom: boolean;
    panX: number;
    panY: number;
};
```

### wheelPanPixels

*constant*. Pixels one axis of a wheel or a swipe moves the view. A line is 16 pixels and a page is `page` pixels. The sign is the event's own.

```ts
const wheelPanPixels: (delta: number, deltaMode: number, page?: number) => number;
```

### wheelZoomFactor

*constant*. The factor a wheel turn zooms by: up (a negative `deltaY`) zooms in. `deltaMode` 1 is lines and 2 is pages. `kind` `"pinch"` (the default) is a

```ts
const wheelZoomFactor: (deltaY: number, deltaMode: number, kind?: "pinch" | "wheel") => number;
```

### WIDE

*constant*. Over a wide range (`WIDE` times or more from end to end) the marks are the powers of ten first, nearest Fit first, so 0.1 to 100 reads 0.1×, 1×, 10×, 100× and not 1×, 4×, 16×.

```ts
const WIDE = 100;
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, ViewWords>;
```

### wordsFor

*constant*. The words for a language, with any of your own over them.

```ts
const wordsFor: (language: Language, overrides?: Partial<ViewWords>) => ViewWords;
```

### wrapYaw

*constant*. An angle brought into [-180, 180).

```ts
const wrapYaw: (angle: number) => number;
```

### ZOOM_STEP

*constant*. A zoom button multiplies the zoom by this.

```ts
const ZOOM_STEP = 1.4;
```

### zoomAbout

*function*. Zoom to `next` (held between the limits) keeping the point `at` (pixels from the view's middle) where it is. At Fit or below the view goes back to the middle, unless it may move at any zoom (`free`).

```ts
function zoomAbout(camera: Camera, next: number, at: Point, limits?: Limits, free?: boolean): Camera;
```

### zoomAtPosition

*function*. The zoom at a place on the slider, 0 to 1.

```ts
function zoomAtPosition(at: number, min: number, max: number): number;
```

### ZOOMED

*constant*. At or below this zoom the view counts as not zoomed (a drag turns it, the pan pad is hidden).

```ts
const ZOOMED = 1.05;
```

### zoomMarks

*function*. The slider's marks for the range `min` to `max`, in order: both ends, then the common zooms inside that keep `gap` from every other mark. None when there is no range.

```ts
function zoomMarks(min: number, max: number, gap?: number): ZoomMark[];
```

### zoomPosition

*function*. Where a zoom sits on the slider, from 0 at `min` to 1 at `max`, held to that range.

```ts
function zoomPosition(zoom: number, min: number, max: number): number;
```

### zoomSnap

*function*. A drag that ends near a mark goes to it: within `tolerance` of the slider's length (`SNAP_PX` over its length in pixels); anywhere else it stays where it is.

```ts
function zoomSnap(zoom: number, marks: readonly ZoomMark[], min: number, max: number, tolerance: number): number;
```

### zoomStep

*function*. An arrow key: one `SLIDER_STEP` up or down, held to the range, stopping first on a mark it would pass, so 1.9× goes to 2× and the next press goes on past it.

```ts
function zoomStep(zoom: number, marks: readonly ZoomMark[], direction: 1 | -1, min: number, max: number, factor?: number): number;
```

### zoomText

*constant*. The zoom as the readout shows it: `1×`, `2.4×`; below 1, two figures, so a small zoom never reads `0×`.

```ts
const zoomText: (zoom: number) => string;
```

### zoomToMark

*function*. Page Up and Page Down: the next mark above (`direction` 1) or below (-1) the zoom now, else the end.

```ts
function zoomToMark(zoom: number, marks: readonly ZoomMark[], direction: 1 | -1, min: number, max: number): number;
```

### AddressChoices

*interface*

```ts
interface AddressChoices {
    yaw: number;
    tilt: number;
    zoom: number;
    /** The auto-turn speed as a multiple of the element's `speed`: the number of the button that is on. */
    pace?: number;
    /** The way Auto-turn goes. In `formatAddress`: a way is written; `null` leaves it off the address (it is the page's own start); left out, the key is not touched. */
    direction?: Direction | null;
    roll?: number;
    /** Which axis Auto-turn drives. `angle` is the start and leaves the address. Left out, the key is not touched. */
    axis?: TurnAxis | null;
    /** Tilt's own way. `null` leaves it off the address; left out, the key is not touched. */
    tiltDirection?: Direction | null;
    /** Roll's own way. `null` leaves it off the address; left out, the key is not touched. */
    rollDirection?: Direction | null;
}
```

### AddressKeys

*interface*

```ts
interface AddressKeys {
    yaw: string;
    tilt: string;
    zoom: string;
    /** Not used any more: a plain drag always turns, so there is nothing to keep (0.26.0). `formatAddress` removes an old `drag` from the address. */
    drag?: string;
    /** The auto-turn speed, a number (`0.5`, `2`; 1 is the start and leaves the address). `pace` by default, because a page's own `speed` (a clock's, a replay's) is its own. */
    speed?: string;
    /** Which way Auto-turn goes, `left` or `right`; `direction` by default. */
    direction?: string;
    /** The roll, degrees. `roll` by default. */
    roll?: string;
    /** Which axis Auto-turn drives. `axis` by default. */
    axis?: string;
    /** Which way tilt's auto-turn goes. `tiltDirection` by default. */
    tiltDirection?: string;
    /** Which way roll's auto-turn goes. `rollDirection` by default. */
    rollDirection?: string;
}
```

### Camera

*interface*. What a gesture or a control changes. `panX` and `panY` are CSS pixels from the middle of the view.

```ts
interface Camera {
    yaw: number;
    tilt: number;
    /** Degrees about the view's forward axis. Left out, it is 0. */
    roll?: number;
    zoom: number;
    panX: number;
    panY: number;
}
```

### CarryOptions

*interface*

```ts
interface CarryOptions extends Omit<ViewControllerOptions, "onChange"> {
    /** The page's own drawing: apply the state. The element's drag, pinch, wheel and keys all arrive here. */
    onChange: (state: ViewState, info: ChangeInfo) => void;
    /** Whether the element carries its controls when it has no `controls` attribute. True by default; a still picture passes false. `controls="none"` always turns them off. */
    on?: boolean;
}
```

### ChangeInfo

*interface*

```ts
interface ChangeInfo {
    /** False for the steps of a drag, a pinch, a slider or the automatic turn; true when something settled (a button, a release, a key, a wheel step). */
    final: boolean;
    /** What changed it: "set", "auto", "drag", "pinch", "wheel", "key", "zoom", "pan", "front", "fit", "play", "pause", "tap". */
    reason: string;
}
```

### Clock

*interface*

```ts
interface Clock {
    request(callback: (now: number) => void): number;
    cancel(id: number): void;
}
```

### ElementControls

*interface*

```ts
interface ElementControls {
    /** The controller behind the hands, for the element's own `set`, `fit` and `state`. */
    readonly controller: ViewController;
    /** Change the package's own limits after setup, for a view whose detail changes (map tiles found, a body ridden). The attributes `zoom-min`, `zoom-max`, `tilt-max` and `roll-max` still win. A zoom outside the new limits is moved inside them, and a bar bound to the element hears the new limits (`CARRY_EVENT`). */
    setLimits(limits: Partial<Limits>): void;
    /** Let the hands go and destroy the controller. Call it in `disconnectedCallback`. */
    unbind(): void;
}
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### Layout

*type*. How the controls are laid out, the `layout` attribute. `classic` is the default: the bar of 0.10 and before, unchanged. `horizontal` is a tidy bar under the view with the

```ts
type Layout = "classic" | "horizontal" | "vertical" | "compact";
```

### Level

*type*. `basic` is the default: turn, zoom with its readout, Fit and Auto-turn, and the speed while it turns. `advanced` adds tilt, the three speeds, Front and the pan pad.

```ts
type Level = "basic" | "advanced";
```

### Limits

*interface*

```ts
interface Limits {
    tiltMax: number;
    /** How far a hand may roll, in degrees. 180 (the default) is a full turn. */
    rollMax: number;
    zoomMin: number;
    zoomMax: number;
}
```

### Pace

*type*. The three speeds of 0.12 and 0.13 by name: Medium is the element's `speed`, Slow half of it and Fast twice it. A pace is now any number (the `pace` attribute, the `paces` it chooses from); these words still read as 0.5, 1 and 2.

```ts
type Pace = "slow" | "medium" | "fast";
```

### PinchStart

*interface*. What a pinch starts from: the distance between two fingers, their middle, the camera at that moment, and the fingers' angle when a twist should roll.

```ts
interface PinchStart {
    distance: number;
    middle: Point;
    camera: Camera;
    /** `atan2` of the fingers, in radians. Left out, a twist does not roll. */
    angle?: number;
}
```

### Point

*interface*

```ts
interface Point {
    x: number;
    y: number;
}
```

### Quat

*interface*. A rotation. `w` is the real part. The identity is `{ x: 0, y: 0, z: 0, w: 1 }`.

```ts
interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
```

### Size

*interface*

```ts
interface Size {
    width: number;
    height: number;
}
```

### TumbleSigns

*interface*

```ts
interface TumbleSigns {
    yaw: number;
    tilt: number;
    roll: number;
}
```

### TurnAxis

*type*. Which axis Auto-turn drives. `angle` is yaw, the default. `all` is a tumble on yaw, tilt and roll at once.

```ts
type TurnAxis = "angle" | "tilt" | "roll" | "all";
```

### Vec3

*interface*

```ts
interface Vec3 {
    x: number;
    y: number;
    z: number;
}
```

### ViewController

*interface*

```ts
interface ViewController {
    readonly state: ViewState;
    turnable: boolean;
    speed: number;
    /** Which axis `play` turns. `angle` is yaw. `all` tumbles on three axes. */
    turnAxis: TurnAxis;
    /** Tilt's own direction while `turnAxis` is `all` (and the sign of `speed` while it is `tilt`). 1 or -1. */
    tiltSign: number;
    /** Roll's own direction. 1 or -1. */
    rollSign: number;
    readonly limits: Limits;
    /** What a pointer press leaves alone inside the view (see `ViewControllerOptions.ignore`). Can be changed at any time. */
    ignore: string;
    /** The point the buttons and keys zoom about (see `ViewControllerOptions.anchor`); `undefined` for the view's middle. Can be changed at any time. */
    anchor: Point | undefined;
    keyTilt: KeyTilt;
    stopTurn: boolean;
    tiltStep: number;
    /** Exact grab (see `ViewControllerOptions.grabRadius`). Can be changed at any time. */
    grabRadius: number | "fit";
    /** The object's size at Fit (see `ViewControllerOptions.objectSize`). Can be changed at any time. */
    objectSize: Size | undefined;
    /** The share of the view's size it may move at any zoom (see `ViewControllerOptions.freePan`); `undefined` for none. Can be changed at any time. */
    freePan: number | undefined;
    /** What zoom 1 means to the page (see `ViewControllerOptions.fitScale`). */
    readonly fitScale: number;
    /** The `state.zoom` the view opens at: 1 for "fit", else the starting scale divided by `fitScale`. The address leaves a zoom at this value out. */
    readonly startZoom: number;
    /** Tell the controller what zoom 1 means. If the reader has not zoomed since the start, the view moves to the starting zoom for the new scale. */
    setFitScale(scale: number): void;
    /** Start at "fit" or at a scale relative to natural size, and go there now. */
    setStartZoom(zoom: "fit" | number): void;
    set(next: Partial<ViewState>, final?: boolean, reason?: string): void;
    /** Turn by itself (never after `destroy`). With `seconds`, stop by itself (as `pause`) after that many seconds of turning; time spent suspended does not count. `toggle` and a bare `play()` turn without a limit. */
    play(seconds?: number): void;
    pause(): void;
    toggle(): void;
    /** Stop the frame loop while nothing can see the view (it is off screen, the tab is hidden): no frames are asked for and no "auto" change is sent. `state.turning` stays true. Counts, so suspends nest. */
    suspendTurn(): void;
    /** Undo one `suspendTurn`; the turn goes on from where it was when the last one is undone. */
    resumeTurn(): void;
    /** Hold the automatic turn still while a hand (a slider being dragged) has the angle; `releaseTurn` lets it carry on from where the hand left it. Counts, so holds nest. */
    holdTurn(): void;
    releaseTurn(): void;
    front(): void;
    fit(): void;
    /** Put the object back in the middle at Fit and the default angle (yaw and tilt 0). It moves there over a quarter of a second, and at once for `animate` false or for a reader who prefers reduced motion; any hand on the view stops the move where it is. Ends with a change `{ final: true, reason: "centre" }`. */
    centre(animate?: boolean): void;
    /** Zoom to `next` about the point `at` (client pixels); left out, about the `anchor`, else the view's middle. */
    zoomAt(next: number, at?: Point, final?: boolean): void;
    zoomBy(factor: number, at?: Point): void;
    /** Move the view by whole fractions of its size: `panBy(1, 0)` is a quarter of its width to the right. */
    panBy(stepsX: number, stepsY: number): void;
    /** Bind the pointer, pinch, wheel and key hands to `view`, and hold the automatic turn while `view` is off screen or the tab is hidden. Returns a function that unbinds them. */
    bind(view: HTMLElement): () => void;
    destroy(): void;
}
```

### ViewControllerOptions

*interface*

```ts
interface ViewControllerOptions {
    initial?: Partial<ViewState>;
    /** False for a flat view that cannot turn: a drag then always moves it and the angle and tilt never change. */
    turnable?: boolean;
    /** Degrees a second when it turns by itself (`TURN_SPEED`, 12, one turn in 30 seconds, by default). The sign is the active axis's direction. */
    speed?: number;
    /** Which axis turns by itself. `angle` (yaw) by default. */
    turnAxis?: TurnAxis;
    limits?: Partial<Limits>;
    /** The starting zoom: "fit" (the default) or a scale where 1 is the scene's natural size; it opens at that scale divided by `fitScale`. With `fitScale` left at 1 a number is a zoom as `ViewState.zoom` has it. `initial.zoom` is used only when this is left out. */
    zoom?: "fit" | number;
    /** The page's scale when the view is at Fit (`state.zoom` 1): what zoom 1 means. The scene is drawn at `state.zoom * fitScale`. 1 by default. */
    fitScale?: number;
    /** A CSS selector for what inside the view `bind` leaves alone: a press on a match is not captured, so its click goes through. An empty string leaves nothing alone. */
    ignore?: string;
    /** The point the zoom buttons and keys zoom about, in content coordinates: CSS pixels from the view's middle when it is at Fit (zoom 1, no pan). It moves with the picture, so the point stays where it is on screen while the view zooms. Left out, they zoom about the view's middle. */
    anchor?: Point;
    /** Which way Arrow Up tips the view: `"drag"` (the default, as a drag up) or `"wheel"` (the other way, as the wheel turned up tipped it before 0.13.0; the wheel moves now). */
    keyTilt?: KeyTilt;
    /** True to stop the automatic turn when the reader presses the view, uses the wheel on it or presses a key it handles. False (the default) lets it carry on. Buttons and sliders never stop it. */
    stopTurn?: boolean;
    /** Round the tilt of a drag to a multiple of this many degrees; 0 (the default) leaves it unrounded, 1 gives whole degrees. */
    tiltStep?: number;
    /** Exact grab: the on-screen radius, in CSS pixels at Fit, of the globe or turnable piece, or `"fit"` for half the smaller side of the view. A drag then turns it by the angle that keeps the touched point under the pointer (`degreesPerPixel`), and at a zoom the radius grows with it. 0 (the default) keeps the fixed angle across the view. */
    grabRadius?: number | "fit";
    /** The object's size at Fit in CSS pixels, when it is smaller than the view: a pan then keeps at least a quarter of it in view (see `clampPan`). Left out, the object is the picture, which covers the view. */
    objectSize?: Size;
    /** Let the view move at any zoom, zoomed out too, by up to this share of its size either way (0.5: the middle may go to the edge). For a 3D space whose zoom is far below 1. Left out, the view moves only once zoomed in, and only as far as `clampPan` allows. */
    freePan?: number;
    /** The view's size in CSS pixels, for holding the pan; `bind` gives it from the element when this is left out. */
    size?: () => Size | undefined;
    onChange?: (state: ViewState, info: ChangeInfo) => void;
    /** Animation frames; the browser's requestAnimationFrame by default. A test passes its own. */
    clock?: Clock;
}
```

### ViewState

*interface*

```ts
interface ViewState extends Camera {
    /** The pose the page should draw. A tumble keeps this continuous when the slider numbers fold at a pole. */
    orientation: Quat;
    /** True while the view turns by itself. A control never changes this; only play, pause and a grab of the view's own do not either (see `holdTurn`). */
    turning: boolean;
}
```

### ViewWords

*interface*

```ts
interface ViewWords {
    group: string;
    angle: string;
    tilt: string;
    roll: string;
    /** The name of the button that tumbles on all three axes. */
    tumble: string;
    /** The name of the row that chooses which axis Auto-turn drives. */
    axis: string;
    autoTurn: string;
    front: string;
    zoom: string;
    zoomOut: string;
    /** Not shown any more: the bar has no "2×" button since the readout came, as it read like one. Kept so a page's own `words` still type-check. */
    zoomTwo: string;
    zoomIn: string;
    fit: string;
    centre: string;
    pan: string;
    panLeft: string;
    panRight: string;
    panUp: string;
    panDown: string;
    zoomLevel: string;
    zoomReset: string;
    more: string;
    /** The name of the turn speeds: they say how long one turn of the view takes, so they are not read as the speed of time. */
    speed: string;
    /** A turn's time on a button, `{n}` the number: "{n} s", "{n} min". */
    seconds: string;
    minutes: string;
    /** The same, read out: "One turn in {t}", with `{t}` "{n} seconds" or "{n} minutes". */
    turnEvery: string;
    secondsLong: string;
    minutesLong: string;
    /** The same for exactly one: "{n} second", "{n} minute". */
    secondLong: string;
    minuteLong: string;
    /** The name of the pair of buttons that choose which way Auto-turn goes. */
    direction: string;
    turnLeft: string;
    turnRight: string;
    slow: string;
    medium: string;
    fast: string;
    /** How the wheel, a pinch and Space move the view. Read out, not shown. */
    gestures: string;
}
```

### ZoomMark

*interface*. A mark of the slider: its zoom, where it sits from 0 (the least zoom) to 1 (the most), and whether it is an end.

```ts
interface ZoomMark {
    zoom: number;
    at: number;
    end: boolean;
}
```

## `@johnmorrisdotca/kazoku-ui/view-controls/element`

3 values and 1 type.

```js
import { EVENT, TAG, ViewControlsElement } from '@johnmorrisdotca/kazoku-ui/view-controls/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-viewchange";
```

### TAG

*constant*

```ts
const TAG = "kazoku-view-controls";
```

### ViewControlsElement

*class*. Attributes: `for` (the id of the view to bind), `lang` (en or ja; else the page's), `yaw`, `tilt` (the starting view), `zoom` (`fit`, the default, or a scale where 1

```ts
class ViewControlsElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The controller behind the element: the same methods and state a page that wants no element would use. */
    get controller(): ViewController;
    /** The view now (a copy). */
    get state(): ViewState;
    get view(): HTMLElement | undefined;
    /** The element the hands bind to, in place of `for`. */
    set view(element: HTMLElement | undefined);
    /** Your own labels over the language's, for example `{ front: "Home" }`. */
    set words(words: Partial<ViewWords>);
    /** Turn by itself. With `seconds`, stop after that many seconds of turning; else the `autoplay-for` attribute's, if there is one. */
    play(seconds?: number): void;
    pause(): void;
    front(): void;
    /** Put the object back in the middle at Fit and the default angle, with a brief move (at once for a reader who prefers reduced motion, or with `false`). */
    centre(animate?: boolean): void;
    fit(): void;
    set(next: Partial<ViewState>): void;
    /** The share of the view's size it may move at any zoom, zoomed out too (see the `free-pan` attribute); `undefined` for none. */
    get freePan(): number | undefined;
    set freePan(share: number | undefined | null);
    /** The point the zoom buttons and keys zoom about: `{ x, y }` in CSS pixels from the view's middle when it is at Fit, moving with the picture. `undefined` zooms about the view's middle. The `anchor` attribute (`"x,y"`) sets the same. */
    get anchor(): Point | undefined;
    set anchor(point: Point | undefined | null);
    /** What zoom 1 means to the page: the scene is drawn at `state.zoom * fitScale`. */
    get fitScale(): number;
    setFitScale(scale: number): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### ViewChangeDetail

*interface*. What the `kazoku-viewchange` event carries in `detail`.

```ts
interface ViewChangeDetail extends ViewState {
    final: boolean;
    reason: string;
}
```

## `@johnmorrisdotca/kazoku-ui/view-controls/define`

1 value and 0 types.

```js
import { defineViewControls } from '@johnmorrisdotca/kazoku-ui/view-controls/define';
```

### defineViewControls

*function*

```ts
function defineViewControls(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/theme-switch`

15 values and 5 types.

```js
import { applyTheme, EVENT, languageOf, parseModes, parseTheme, readTheme, resolveTheme, TAG, THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY, themeOf, THEMES, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/theme-switch';
```

### applyTheme

*function*. Writes the choice on the target (`data-theme="light"`, `"dark"`, or no attribute for auto).

```ts
function applyTheme(target: Element, choice: Theme): void;
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-themechange";
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### parseModes

*function*. The choices a switch offers, from `modes="light dark"`: the known ones, once each, in the order light, dark, auto. Nothing usable gives all three.

```ts
function parseModes(value: string | null | undefined): Theme[];
```

### parseTheme

*constant*

```ts
const parseTheme: (value: unknown) => Theme | undefined;
```

### readTheme

*function*. The remembered choice: the address first, then the store. `undefined` when neither holds a valid one.

```ts
function readTheme(from: RememberedTheme): Theme | undefined;
```

### resolveTheme

*constant*. The colours a choice gives: light and dark are themselves, auto is the device's.

```ts
const resolveTheme: (choice: Theme, prefersDark: boolean) => Scheme;
```

### TAG

*constant*

```ts
const TAG = "kazoku-theme-switch";
```

### THEME_ADDRESS_KEY

*constant*. The address parameter, with `address`.

```ts
const THEME_ADDRESS_KEY = "theme";
```

### THEME_ATTRIBUTE

*constant*. The attribute the choice is written to on the target. `auto` removes it, so the page's own `prefers-color-scheme` rules decide.

```ts
const THEME_ATTRIBUTE = "data-theme";
```

### THEME_STORAGE_KEY

*constant*. The localStorage key, with a bare `storage`.

```ts
const THEME_STORAGE_KEY = "kazoku-theme";
```

### themeOf

*constant*. What a target holds now: `light` or `dark` when forced, `auto` when it says nothing or something else.

```ts
const themeOf: (target: Element) => Theme;
```

### THEMES

*constant*

```ts
const THEMES: readonly ["light", "dark", "auto"];
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, ThemeWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<ThemeWords>) => ThemeWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### RememberedTheme

*interface*. Where a remembered choice may be read from. A page that keeps nothing passes neither.

```ts
interface RememberedTheme {
    /** An address' search string such as `?theme=dark`, read with `addressKey`. */
    search?: string;
    addressKey?: string;
    /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
    storage?: Pick<Storage, "getItem">;
    storageKey?: string;
}
```

### Scheme

*type*

```ts
type Scheme = "light" | "dark";
```

### Theme

*type*

```ts
type Theme = (typeof THEMES)[number];
```

### ThemeWords

*interface*

```ts
interface ThemeWords {
    group: string;
    light: string;
    dark: string;
    auto: string;
}
```

## `@johnmorrisdotca/kazoku-ui/theme-switch/element`

3 values and 1 type.

```js
import { EVENT, TAG, ThemeSwitchElement } from '@johnmorrisdotca/kazoku-ui/theme-switch/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-themechange";
```

### TAG

*constant*

```ts
const TAG = "kazoku-theme-switch";
```

### ThemeSwitchElement

*class*. Attributes: `value` (`light`, `dark` or `auto`; the choice), `target` (a CSS selector for the element that gets `data-theme`; the page's <html> by default),

```ts
class ThemeSwitchElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The choice now: `light`, `dark` or `auto`. Setting it applies it (event reason `set`). */
    get value(): Theme;
    set value(next: string);
    /** The colours showing now: `light` or `dark`. */
    get scheme(): Scheme;
    /** The element the choice is written on. */
    get target(): Element | undefined;
    set target(element: Element | undefined);
    /** Your own labels over the language's, for example `{ auto: "System" }`. */
    set words(words: Partial<ThemeWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### ThemeChangeDetail

*interface*. What the `kazoku-themechange` event carries in `detail`.

```ts
interface ThemeChangeDetail {
    /** What the reader chose: `light`, `dark` or `auto`. */
    choice: Theme;
    /** The colours now showing: `light` or `dark`. Auto is the device's. */
    scheme: Scheme;
    /** `init`, `user` (a button), `set` (the `value` property or attribute), `system` (the device changed under Auto) or `external` (something else wrote the target's `data-theme`). */
    reason: "init" | "user" | "set" | "system" | "external";
    /** The element the choice is written on. */
    target: Element;
}
```

## `@johnmorrisdotca/kazoku-ui/theme-switch/define`

1 value and 0 types.

```js
import { defineThemeSwitch } from '@johnmorrisdotca/kazoku-ui/theme-switch/define';
```

### defineThemeSwitch

*function*

```ts
function defineThemeSwitch(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/language-picker`

16 values and 3 types.

```js
import { applyLanguage, DEFAULT_LANGUAGES, EVENT, LANGUAGE_ADDRESS_KEY, LANGUAGE_ATTRIBUTE, LANGUAGE_STORAGE_KEY, languageName, languageOf, matchLanguage, normaliseCode, OWN_NAMES, parseLanguages, startingLanguage, TAG, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/language-picker';
```

### applyLanguage

*function*. Writes the choice as `lang` on the target.

```ts
function applyLanguage(target: Element, code: string): void;
```

### DEFAULT_LANGUAGES

*constant*. The codes when a page gives none.

```ts
const DEFAULT_LANGUAGES: readonly string[];
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-languagechange";
```

### LANGUAGE_ADDRESS_KEY

*constant*. The address parameter, with `address`.

```ts
const LANGUAGE_ADDRESS_KEY = "lang";
```

### LANGUAGE_ATTRIBUTE

*constant*. The attribute the choice is written to on the target.

```ts
const LANGUAGE_ATTRIBUTE = "lang";
```

### LANGUAGE_STORAGE_KEY

*constant*. The localStorage key, with a bare `storage`.

```ts
const LANGUAGE_STORAGE_KEY = "kazoku-lang";
```

### languageName

*function*. A language's own name: yours (`names`), the family's table, `Intl.DisplayNames` in that language, else the code.

```ts
function languageName(code: string, names?: Readonly<Record<string, string>>): string;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### matchLanguage

*function*. The entry of `list` that a language tag means: the tag itself, else its main language ("ja-JP" is "ja"). `undefined` if the list has neither.

```ts
function matchLanguage(tag: string | null | undefined, list: readonly string[]): string | undefined;
```

### normaliseCode

*function*. A code as the page may write it ("EN", "ja_JP", " fr ") in the form this part compares: lower case, dashes. `undefined` if it is not a language code.

```ts
function normaliseCode(value: string | null | undefined): string | undefined;
```

### OWN_NAMES

*constant*. Each language's own name, for the codes the family uses. Any other code gets its name from `Intl.DisplayNames`, else the code itself.

```ts
const OWN_NAMES: Readonly<Record<string, string>>;
```

### parseLanguages

*function*. The codes of `languages="en ja fr"`: valid ones, once each, in the order given. Nothing usable gives `en` and `ja`.

```ts
function parseLanguages(value: string | null | undefined): string[];
```

### startingLanguage

*function*. The language to start in: the address, the store, `value`, the reader's languages, what the page holds now, then the first of the list.

```ts
function startingLanguage(from: StartingLanguage): string;
```

### TAG

*constant*

```ts
const TAG = "kazoku-language-picker";
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, PickerWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<PickerWords>) => PickerWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### PickerWords

*interface*

```ts
interface PickerWords {
    group: string;
}
```

### StartingLanguage

*interface*. What may say which language to start in, strongest first. Each is a language tag or `undefined`.

```ts
interface StartingLanguage {
    list: readonly string[];
    /** The address' search string such as `?lang=ja`, read with `addressKey`. */
    search?: string;
    addressKey?: string;
    /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
    storage?: Pick<Storage, "getItem">;
    storageKey?: string;
    /** The page's own start (the `value` attribute). */
    value?: string | null;
    /** The reader's languages, most wanted first (`navigator.languages`). */
    preferred?: readonly string[];
    /** What the target holds now. */
    current?: string | null;
}
```

## `@johnmorrisdotca/kazoku-ui/language-picker/element`

3 values and 1 type.

```js
import { EVENT, LanguagePickerElement, TAG } from '@johnmorrisdotca/kazoku-ui/language-picker/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-languagechange";
```

### LanguagePickerElement

*class*. Attributes: `languages` (the codes, `en ja` by default), `value` (the language to start in), `target` (a CSS selector for the element that gets `lang`; the page's <html>

```ts
class LanguagePickerElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The language now chosen. Setting it applies it (event reason `set`); a code that is not in `languages` is ignored. */
    get value(): string;
    set value(code: string);
    /** The codes the picker offers. */
    get languages(): readonly string[];
    get target(): Element | undefined;
    set target(element: Element | undefined);
    /** Your own names over the family's, for example `{ fr: "Français (Canada)" }`. */
    set names(names: Record<string, string>);
    /** Your own words over the language's, for example `{ group: "Choose a language" }`. */
    set words(words: Partial<PickerWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-language-picker";
```

### LanguageChangeDetail

*interface*. What the `kazoku-languagechange` event carries in `detail`.

```ts
interface LanguageChangeDetail {
    /** The language now chosen: one of the codes the page gave, lower case ("en", "ja"). */
    lang: string;
    /** The one before; `undefined` at `init`. */
    previous: string | undefined;
    /** `init` (once, a moment after it connects), `user` (a button), `set` (the `value` property or attribute) or `external` (something else wrote the target's `lang`). */
    reason: "init" | "user" | "set" | "external";
    /** The element the choice is written on. */
    target: Element;
}
```

## `@johnmorrisdotca/kazoku-ui/language-picker/define`

1 value and 0 types.

```js
import { defineLanguagePicker } from '@johnmorrisdotca/kazoku-ui/language-picker/define';
```

### defineLanguagePicker

*function*

```ts
function defineLanguagePicker(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/address-state`

13 values and 8 types.

```js
import { applyParams, createAddressState, createAddressWriter, keepReadings, parseReadings, READINGS_KEY, READINGS_ON, READINGS_STORAGE_KEY, readingsParams, readingsStorage, readParam, readParams, readReadings } from '@johnmorrisdotca/kazoku-ui/address-state';
```

### applyParams

*function*. A search string with `changes` made to it: a value sets the parameter, `null` or `undefined` takes it off, and a value equal to that key's entry in `defaults` takes it off too

```ts
function applyParams(search: string, changes: Readonly<Record<string, AddressValue>>, defaults?: Readonly<Record<string, string>>): string;
```

### createAddressState

*function*

```ts
function createAddressState(options?: AddressStateOptions): AddressState;
```

### createAddressWriter

*function*. Writes the address in place (`replaceState`), the pathname and hash kept. A write the page refuses is kept and tried once more a second later (a newer write made in

```ts
function createAddressWriter(options?: AddressWriterOptions): AddressWriter;
```

### keepReadings

*function*. Keeps a reader's press of the switch on the device (`on` or `off`), so their next visit starts the same. Only a press is kept, never a link's choice.

```ts
function keepReadings(on: boolean): void;
```

### parseReadings

*function*. What an address value says: on for `on`, `1`, `true`, `yes` or the bare key (`?readings`), off for `off`, `0`, `false` or `no` (any case, spaces round it ignored), and `undefined` for no key or any other value, which says nothing, so the device's kept choice decides, else off.

```ts
function parseReadings(value: string | null | undefined): boolean | undefined;
```

### READINGS_KEY

*constant*. The address key: `?readings=on` turns the readings on.

```ts
const READINGS_KEY = "readings";
```

### READINGS_ON

*constant*. The value the address is given when the readings are on. Off is no key at all.

```ts
const READINGS_ON = "on";
```

### READINGS_STORAGE_KEY

*constant*. The localStorage key for a reader's own press of the switch.

```ts
const READINGS_STORAGE_KEY = "kazoku-readings";
```

### readingsParams

*function*. The address change for a choice, for `applyParams` or an address state's `setMany`: `{ readings: "on" }`, or `{ readings: null }` to take it off.

```ts
function readingsParams(on: boolean): {
    [READINGS_KEY]: string | null;
};
```

### readingsStorage

*constant*. The kept choice from this browser's localStorage, for `readReadings({ search, storage: readingsStorage() })`.

```ts
const readingsStorage: () => Storage | undefined;
```

### readParam

*function*. One parameter of an address' search string, or `null`.

```ts
function readParam(key: string, search?: string): string | null;
```

### readParams

*function*. The parameters of an address' search string. A repeated one keeps its first value.

```ts
function readParams(search?: string): Record<string, string>;
```

### readReadings

*function*. Whether the readings start on: the address first, then a press kept on the device, else off.

```ts
function readReadings(from?: RememberedReadings): boolean;
```

### AddressChange

*interface*. What a subscriber is told.

```ts
interface AddressChange {
    key: string;
    /** What the address holds for the key now: the string, or `null` when it is not there. */
    value: string | null;
    /** What it held before; `null` when it was not there. */
    previous: string | null;
    /** `set` (a `set`, `setMany` or `remove` on a state of this page) or `navigation` (the reader went back or forward to another address). */
    source: "set" | "navigation";
}
```

### AddressHost

*interface*. The part of `window` the address needs: where we are, and how to change it without a history entry.

```ts
interface AddressHost {
    location: {
        search: string;
        pathname: string;
        hash: string;
    };
    history: {
        state: unknown;
        replaceState(state: unknown, unused: string, url: string): void;
    };
    addEventListener?(type: "popstate", listener: () => void): void;
    removeEventListener?(type: "popstate", listener: () => void): void;
}
```

### AddressState

*interface*

```ts
interface AddressState {
    /** The key's value as the page will have it (a change still waiting included), else its default, else `null`. */
    get(key: string): string | null;
    /** Whether the address (or a change waiting) holds the key. */
    has(key: string): boolean;
    /** Every parameter, as `get` sees them. */
    all(): Record<string, string>;
    /** Sets a key; `null`, `undefined` or the key's default takes it off. Subscribers hear it now; the address is written after the delay. */
    set(key: string, value: AddressValue): void;
    setMany(values: Readonly<Record<string, AddressValue>>): void;
    remove(key: string): void;
    /** Hears every change to the address made through a state of this page, and the reader going back or forward. `keys` limits it to those keys. Returns the way to stop. */
    subscribe(listener: (change: AddressChange) => void, keys?: readonly string[]): () => void;
    /** Writes what is waiting. */
    flush(): void;
    /** Writes what is waiting and stops listening for back and forward. */
    destroy(): void;
}
```

### AddressStateOptions

*interface*

```ts
interface AddressStateOptions {
    /** A key's start: a value equal to it is left off the address, and `get` gives it when the address has none. */
    defaults?: Readonly<Record<string, string>>;
    /** As for `createAddressWriter`. */
    delay?: number;
    host?: AddressHost;
}
```

### AddressValue

*type*. What a parameter may be set to. `null` and `undefined` take it off the address.

```ts
type AddressValue = string | number | null | undefined;
```

### AddressWriter

*interface*

```ts
interface AddressWriter {
    /** Asks for the address to become `compute(its search string now)`. Calls inside the delay are one write, and `compute` is the latest, run when the time is up. */
    write(compute: (search: string) => string): void;
    /** Writes now what is waiting. */
    flush(): void;
    /** Drops what is waiting. */
    cancel(): void;
}
```

### AddressWriterOptions

*interface*

```ts
interface AddressWriterOptions {
    /** Milliseconds a write waits so that many changes become one: Safari stops a page that changes its address more than a hundred times in thirty seconds. 250 by default; 0 writes at once. */
    delay?: number;
    host?: AddressHost;
}
```

### RememberedReadings

*interface*. Where a choice may be read from. A page that keeps nothing passes neither.

```ts
interface RememberedReadings {
    /** An address' search string such as `?readings=on`. */
    search?: string;
    /** A localStorage-like object. A store that throws is the same as an empty one. */
    storage?: Pick<Storage, "getItem">;
}
```

## `@johnmorrisdotca/kazoku-ui/save-image`

22 values and 7 types.

```js
import { downloadBlob, ERROR_EVENT, EVENT, filenameFor, FORMATS, formatsFor, kindOf, languageOf, MAX_PIXELS, MAX_SIDE, MIME, parseFormats, pixelSize, renderImage, saveImage, serializeElement, serializeSvg, sizeOf, svgToPng, TAG, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/save-image';
```

### downloadBlob

*function*. Hands the blob to the browser as a download of that name.

```ts
function downloadBlob(blob: Blob, filename: string): void;
```

### ERROR_EVENT

*constant*

```ts
const ERROR_EVENT = "kazoku-saveerror";
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-save";
```

### filenameFor

*function*. A file name that is safe on any system, with the format's extension: no path, no control or reserved characters, at most 80 characters of name.

```ts
function filenameFor(name: string | null | undefined, format: Format): string;
```

### FORMATS

*constant*

```ts
const FORMATS: readonly ["png", "svg"];
```

### formatsFor

*constant*. Which formats a kind of target can give: an SVG both, a canvas and any other element a PNG.

```ts
const formatsFor: (kind: TargetKind) => readonly Format[];
```

### kindOf

*function*. What a target is.

```ts
function kindOf(target: Element): TargetKind;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### MAX_PIXELS

*constant*

```ts
const MAX_PIXELS = 36000000;
```

### MAX_SIDE

*constant*. The most a picture may be on one side, and in all: past these a canvas fails in some browsers, so the scale is lowered instead.

```ts
const MAX_SIDE = 8192;
```

### MIME

*constant*

```ts
const MIME: Record<Format, string>;
```

### parseFormats

*function*. The formats of `formats="png svg"`: the known ones, once each, in the order given. Nothing usable gives `png` and `svg`.

```ts
function parseFormats(value: string | null | undefined): Format[];
```

### pixelSize

*function*. The pixels of a PNG of a target `width` by `height` CSS pixels at `scale`: whole pixels, and the scale lowered so that no side passes MAX_SIDE and the whole stays within MAX_PIXELS.

```ts
function pixelSize(width: number, height: number, scale: number): {
    width: number;
    height: number;
    scale: number;
};
```

### renderImage

*function*. The target as a picture. Rejects for a format the target cannot give (an SVG of a canvas) and when the browser cannot draw it.

```ts
function renderImage(target: Element, options: RenderImageOptions): Promise<Picture>;
```

### saveImage

*function*. Renders the target and downloads it as `name` with the format's extension.

```ts
function saveImage(target: Element, options: RenderImageOptions & {
    name?: string;
}): Promise<Picture & {
    filename: string;
}>;
```

### serializeElement

*function*. Any element as an SVG that draws it (a `foreignObject`), the styles written in.

```ts
function serializeElement(element: Element, options?: RenderOptions): {
    text: string;
    width: number;
    height: number;
};
```

### serializeSvg

*function*. An SVG as text that stands alone: the namespaces, a size, a `viewBox`, and (unless `inlineStyles` is false) the styles it is drawn in.

```ts
function serializeSvg(svg: Element, options?: RenderOptions): {
    text: string;
    width: number;
    height: number;
};
```

### sizeOf

*function*. The target's size in CSS pixels: a canvas' own, else what is drawn on the page, else an SVG's `viewBox`.

```ts
function sizeOf(target: Element): {
    width: number;
    height: number;
};
```

### svgToPng

*function*. SVG text as a PNG `scale` times its size. A browser that will not draw it (or whose canvas would be tainted) rejects.

```ts
function svgToPng(text: string, width: number, height: number, scale: number, background?: string): Promise<{
    blob: Blob;
    width: number;
    height: number;
}>;
```

### TAG

*constant*

```ts
const TAG = "kazoku-save-image";
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, SaveWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<SaveWords>) => SaveWords;
```

### Format

*type*

```ts
type Format = (typeof FORMATS)[number];
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### Picture

*interface*. What a render makes.

```ts
interface Picture {
    blob: Blob;
    format: Format;
    /** The picture's size: pixels for a PNG, CSS pixels for an SVG. */
    width: number;
    height: number;
}
```

### RenderImageOptions

*interface*

```ts
interface RenderImageOptions extends RenderOptions {
    format: Format;
    /** PNG pixels for each CSS pixel of an SVG or element. 2 by default. A canvas is saved at its own size. */
    scale?: number;
    /** A CSS colour painted behind a PNG; the PNG is transparent without it. */
    background?: string;
}
```

### RenderOptions

*interface*

```ts
interface RenderOptions {
    /** Write the computed styles into what is saved, so it looks the same away from the page's stylesheets. On by default. */
    inlineStyles?: boolean;
}
```

### SaveWords

*interface*

```ts
interface SaveWords {
    group: string;
    png: string;
    svg: string;
    saved: string;
    failed: string;
}
```

### TargetKind

*type*. What a target is: a canvas, an SVG, or any other element (drawn through an SVG `foreignObject`).

```ts
type TargetKind = "canvas" | "svg" | "element";
```

## `@johnmorrisdotca/kazoku-ui/save-image/element`

4 values and 2 types.

```js
import { ERROR_EVENT, EVENT, SaveImageElement, TAG } from '@johnmorrisdotca/kazoku-ui/save-image/element';
```

### ERROR_EVENT

*constant*

```ts
const ERROR_EVENT = "kazoku-saveerror";
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-save";
```

### SaveImageElement

*class*. Attributes: `for` (the id of the canvas, SVG or element to save; or set `element.target`), `formats` (`png svg`, the buttons, in order; one the target cannot give is left out),

```ts
class SaveImageElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The element that is saved: the one `for` names, or the one you set. */
    get target(): Element | undefined;
    set target(element: Element | undefined);
    /** Your own labels over the language's, for example `{ png: "Download PNG" }`. */
    set words(words: Partial<SaveWords>);
    /** Saves the target in a format (the first button's by default) and resolves with the picture; rejects with the error the event reports. */
    save(format?: Format): Promise<SaveDetail>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-save-image";
```

### SaveDetail

*interface*. What the `kazoku-save` event carries in `detail`.

```ts
interface SaveDetail extends Picture {
    /** The file name offered to the browser, with the extension. */
    filename: string;
    /** `user` (a button) or `api` (`save()` called by the page). */
    reason: "user" | "api";
}
```

### SaveErrorDetail

*interface*. What the `kazoku-saveerror` event carries in `detail`.

```ts
interface SaveErrorDetail {
    format: Format;
    error: Error;
    reason: "user" | "api";
}
```

## `@johnmorrisdotca/kazoku-ui/save-image/define`

1 value and 0 types.

```js
import { defineSaveImage } from '@johnmorrisdotca/kazoku-ui/save-image/define';
```

### defineSaveImage

*function*

```ts
function defineSaveImage(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/speed-buttons`

14 values and 2 types.

```js
import { DEFAULT_STEPS, DEFAULT_UNIT, EVENT, languageOf, nearestStep, parseSpeed, parseSteps, SPEED_ADDRESS_KEY, speedText, startStep, stepFrom, TAG, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/speed-buttons';
```

### DEFAULT_STEPS

*constant*. The steps when a page names none: half speed, normal and double.

```ts
const DEFAULT_STEPS: readonly number[];
```

### DEFAULT_UNIT

*constant*. The word on each step's button after its number, when the page names none.

```ts
const DEFAULT_UNIT = "\u00D7";
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-speedchange";
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### nearestStep

*function*. The step nearest `value`: by ratio where both are above zero (so 2.5 is nearer 2 than 4), else by plain distance. `undefined` when there are no steps.

```ts
function nearestStep(value: number, steps: readonly number[]): number | undefined;
```

### parseSpeed

*function*. What an address or attribute says: a number that is (or is nearest to) one of the steps. `undefined` when it is not a number at all. The words `slow`, `medium` and `fast` of the first view controls mean 0.5, 1 and 2.

```ts
function parseSpeed(text: string | null | undefined, steps: readonly number[]): number | undefined;
```

### parseSteps

*function*. The steps in a list such as `0.5 1 2` or `1, 10, 100`: finite numbers in the order given, each once. `fallback` when the list holds none. A step may be 0 (Paused) or negative (Back).

```ts
function parseSteps(text: string | null | undefined, fallback?: readonly number[]): number[];
```

### SPEED_ADDRESS_KEY

*constant*. The address key the buttons keep their choice under, unless `address-key` names another.

```ts
const SPEED_ADDRESS_KEY = "speed";
```

### speedText

*function*. The number as a button shows it: `0.5×`, `1×`, `100×`, `−1×` (a real minus sign). At most four significant figures, so 0.333333 reads `0.333×`.

```ts
function speedText(value: number, unit?: string): string;
```

### startStep

*function*. The step the buttons start on: 1 where the steps have it (normal speed), else the first.

```ts
function startStep(steps: readonly number[]): number;
```

### stepFrom

*function*. The step after (`direction` 1) or before (-1) `value`, going round at the ends: one press of a single button that cycles through the speeds.

```ts
function stepFrom(value: number, steps: readonly number[], direction?: 1 | -1): number;
```

### TAG

*constant*

```ts
const TAG = "kazoku-speed-buttons";
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, SpeedWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<SpeedWords>) => SpeedWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### SpeedWords

*interface*

```ts
interface SpeedWords {
    /** The name of the group of buttons, said by a screen reader and shown before them. */
    group: string;
}
```

## `@johnmorrisdotca/kazoku-ui/speed-buttons/element`

3 values and 2 types.

```js
import { EVENT, SpeedButtonsElement, TAG } from '@johnmorrisdotca/kazoku-ui/speed-buttons/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-speedchange";
```

### SpeedButtonsElement

*class*

```ts
class SpeedButtonsElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The speed now. Setting it to a speed that is not a step takes the nearest step. */
    get value(): number;
    set value(next: number | string);
    /** The speeds the buttons stand for. Setting a list (or a text such as `1 10 100`) draws them again, keeping the nearest to the speed now. */
    get steps(): readonly number[];
    set steps(list: readonly number[] | string);
    /** Your own label over the language's, for example `{ group: "Time" }`. */
    set words(words: Partial<SpeedWords>);
    /**
     * Your own words for each step in place of the number and its unit, in the reader's language: `text` is shown on the button and `label`, if given, is what a screen reader
     * says. The view controls use it to show how long one turn takes ("30 s") instead of a bare `1×`. `null` brings the numbers back.
     */
    get format(): StepFormat | null;
    set format(format: StepFormat | null);
    /** One press of a single button that cycles: the next speed (`direction` 1) or the one before (-1), going round at the ends. */
    step(direction?: 1 | -1): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-speed-buttons";
```

### SpeedChangeDetail

*interface*. What the `kazoku-speedchange` event carries in `detail`.

```ts
interface SpeedChangeDetail {
    /** The speed now: one of `steps`. */
    value: number;
    steps: readonly number[];
    /** `init` (once, when it comes up), `user` (a button or `step()`) or `set` (the `value` property or attribute). */
    reason: "init" | "user" | "set";
}
```

### StepFormat

*type*. A step's own words: what its button shows, and what a screen reader says if that differs.

```ts
type StepFormat = (value: number, language: Language) => {
    text: string;
    label?: string;
};
```

## `@johnmorrisdotca/kazoku-ui/speed-buttons/define`

1 value and 0 types.

```js
import { defineSpeedButtons } from '@johnmorrisdotca/kazoku-ui/speed-buttons/define';
```

### defineSpeedButtons

*function*

```ts
function defineSpeedButtons(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/replay-bar`

11 values and 2 types.

```js
import { addressKeys, DEFAULT_STEPS, EVENT, flagOn, languageOf, PLAY_KEY, REPEAT_KEY, SPEED_KEY, TAG, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/replay-bar';
```

### addressKeys

*function*. The address keys for play and repeat. `play:p,repeat:r` renames either; an unknown name is ignored.

```ts
function addressKeys(spec: string | null | undefined): {
    play: string;
    repeat: string;
};
```

### DEFAULT_STEPS

*constant*. A replay's usual speeds. A page sets its own with `steps`.

```ts
const DEFAULT_STEPS = "0.25 0.5 1 2 4";
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-replay";
```

### flagOn

*function*. Whether an address or attribute value means on. Anything else, including nothing, is off.

```ts
function flagOn(value: string | null | undefined): boolean;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### PLAY_KEY

*constant*. The address key for playing, unless `address-keys` names another.

```ts
const PLAY_KEY = "play";
```

### REPEAT_KEY

*constant*. The address key for the repeat loop, unless `address-keys` names another.

```ts
const REPEAT_KEY = "repeat";
```

### SPEED_KEY

*constant*. The address key the bar's speed buttons use, so they do not share a view's `pace`.

```ts
const SPEED_KEY = "replay-speed";
```

### TAG

*constant*

```ts
const TAG = "kazoku-replay-bar";
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, ReplayWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<ReplayWords>) => ReplayWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### ReplayWords

*interface*

```ts
interface ReplayWords {
    /** The name of the bar, said by a screen reader. */
    group: string;
    /** The button that starts playback. */
    play: string;
    /** The same button while playback is going. */
    pause: string;
    /** The button that goes back to the start. */
    start: string;
    /** The button that loops. */
    repeat: string;
}
```

## `@johnmorrisdotca/kazoku-ui/replay-bar/element`

3 values and 1 type.

```js
import { EVENT, ReplayBarElement, TAG } from '@johnmorrisdotca/kazoku-ui/replay-bar/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-replay";
```

### ReplayBarElement

*class*. Attributes: `playing` (present, or `on`, while it plays), `repeat` (the loop), `steps` and `speed` (handed to the speed buttons),

```ts
class ReplayBarElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** Whether playback is going. Reduced motion keeps this false until the reader presses Play. */
    get playing(): boolean;
    set playing(next: boolean);
    /** Whether the page should loop when it reaches the end. */
    get repeat(): boolean;
    set repeat(next: boolean);
    /** Your own labels over the language's. */
    set words(words: Partial<ReplayWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-replay-bar";
```

### ReplayDetail

*interface*. What the `kazoku-replay` event carries in `detail`.

```ts
interface ReplayDetail {
    /** What was pressed. `play` and `pause` are the one button. */
    action: "play" | "pause" | "start" | "repeat";
    playing: boolean;
    repeat: boolean;
    /** `init` (once, when it comes up), `user` (a button) or `set` (a property or attribute). */
    reason: "init" | "user" | "set";
}
```

## `@johnmorrisdotca/kazoku-ui/replay-bar/define`

1 value and 0 types.

```js
import { defineReplayBar } from '@johnmorrisdotca/kazoku-ui/replay-bar/define';
```

### defineReplayBar

*function*

```ts
function defineReplayBar(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/options-window`

15 values and 8 types.

```js
import { addressKeys, frameOf, gestureHelp, languageOf, namedPlace, OPEN_KEY, parsePlace, parseVariant, PLACE_KEY, settle, SNAPS, TAG, VARIANTS, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/options-window';
```

### addressKeys

*function*. `open:ow,place:op` renames either key. A missing half keeps its own name.

```ts
function addressKeys(raw: string | null | undefined): {
    open: string;
    place: string;
};
```

### frameOf

*function*. The same title, help and open state in whichever frame the page picked. Only the presentation changes.

```ts
function frameOf(variant: Variant, content: WindowContent): WindowContent & {
    variant: Variant;
    presentation: "float" | "edge" | "wide";
};
```

### gestureHelp

*constant*. The view's mouse and keyboard, in the reader's language. The same sentence the view controls show.

```ts
const gestureHelp: (language: Language) => string;
```

### languageOf

*constant*. Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### namedPlace

*function*. The top-left of a window sitting on a named corner or edge, held inside the view.

```ts
function namedPlace(view: ViewSize, size: ViewSize, snap: Snap): Point;
```

### OPEN_KEY

*constant*

```ts
const OPEN_KEY = "open";
```

### parsePlace

*function*. A remembered place: a corner or edge name, or `x,y` pixels. Anything else is nothing.

```ts
function parsePlace(value: string | null | undefined): {
    snap: Exclude<Snap, "free">;
} | Point | null;
```

### parseVariant

*function*. The frame a page asked for. Anything else is the card.

```ts
function parseVariant(value: string | null | undefined): Variant;
```

### PLACE_KEY

*constant*

```ts
const PLACE_KEY = "place";
```

### settle

*function*. A window dragged to `at`, held inside the view. Within `snapPx` of an edge it sits on that edge, and on a corner when it is near two.

```ts
function settle(view: ViewSize, size: ViewSize, at: Point, snapPx?: number): Place;
```

### SNAPS

*constant*

```ts
const SNAPS: readonly ["tl", "tr", "bl", "br", "left", "right", "top", "bottom", "free"];
```

### TAG

*constant*

```ts
const TAG = "kazoku-options-window";
```

### VARIANTS

*constant*

```ts
const VARIANTS: readonly ["card", "shelf", "inspector"];
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, OptionsWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<OptionsWords>) => OptionsWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### OptionsWords

*interface*

```ts
interface OptionsWords {
    /** The name of the window when the page gives it none. */
    group: string;
    /** The button that folds the window to its title. */
    collapse: string;
    /** The title chip that opens a folded window. */
    expand: string;
    /** The ? button. */
    help: string;
    /** The same button while help is open. */
    closeHelp: string;
}
```

### Place

*interface*

```ts
interface Place extends Point {
    snap: Snap;
}
```

### Point

*interface*

```ts
interface Point {
    x: number;
    y: number;
}
```

### Snap

*type*

```ts
type Snap = (typeof SNAPS)[number];
```

### Variant

*type*

```ts
type Variant = (typeof VARIANTS)[number];
```

### ViewSize

*interface*

```ts
interface ViewSize {
    width: number;
    height: number;
}
```

### WindowContent

*interface*

```ts
interface WindowContent {
    title: string;
    help: string;
    open: boolean;
}
```

## `@johnmorrisdotca/kazoku-ui/options-window/element`

2 values and 0 types.

```js
import { OptionsWindowElement, TAG } from '@johnmorrisdotca/kazoku-ui/options-window/element';
```

### OptionsWindowElement

*class*. Attributes: `title` (the name in the title bar), `variant` (`card`, `shelf` or `inspector`), `address` (keep open and place in the address),

```ts
class OptionsWindowElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** Whether the window is open. A folded window is its title chip. */
    get open(): boolean;
    set open(next: boolean);
    /** Your own labels over the language's. */
    set words(words: Partial<OptionsWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-options-window";
```

## `@johnmorrisdotca/kazoku-ui/options-window/define`

1 value and 0 types.

```js
import { defineOptionsWindow } from '@johnmorrisdotca/kazoku-ui/options-window/define';
```

### defineOptionsWindow

*function*. Registers the options window. Returns false when the tag is already taken.

```ts
function defineOptionsWindow(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/embed-panel`

20 values and 5 types.

```js
import { attrText, DEFAULT_KINDS, DEFAULT_SIZE, DEFAULT_SIZES, EMBED_KINDS, embedSnippet, EVENT, filterItems, groupsOf, KIND_ADDRESS_KEY, kindLabel, languageOf, nearestSize, parseKinds, parseSizes, SEARCH_FROM, SIZE_ADDRESS_KEY, TAG, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/embed-panel';
```

### attrText

*function*. The attributes as they are written in a tag: `body="mars" moons`.

```ts
function attrText(attrs: SnippetSpec["attrs"]): string;
```

### DEFAULT_KINDS

*constant*. The tabs the panel shows when the page names none: the seven ways a page is made.

```ts
const DEFAULT_KINDS: readonly string[];
```

### DEFAULT_SIZE

*constant*. The size the panel starts on when the page names none and it is one of the sizes.

```ts
const DEFAULT_SIZE = 320;
```

### DEFAULT_SIZES

*constant*. The sizes (pixels across) the size buttons offer by default.

```ts
const DEFAULT_SIZES: readonly number[];
```

### EMBED_KINDS

*constant*. The ways `embedSnippet` writes an element into a page, in the order the panel's tabs show them.

```ts
const EMBED_KINDS: readonly ["html", "module", "react", "vue", "angular", "svelte", "iframe"];
```

### embedSnippet

*function*. The text that puts an element in a page, for one way of making the page: a script tag from the CDN, an ES module, a React component, a Vue single-file component, an Angular

```ts
function embedSnippet(kind: EmbedKind, spec: SnippetSpec): string;
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-embedchange";
```

### filterItems

*function*. The items that are in `group` (all of them when it is empty) and have every word of `query` in their label, id, group or words, ignoring case and accents.

```ts
function filterItems(items: readonly PickItem[], query?: string, group?: string): PickItem[];
```

### groupsOf

*function*. The groups of a list, once each, in the order they first appear.

```ts
function groupsOf(items: readonly PickItem[]): string[];
```

### KIND_ADDRESS_KEY

*constant*. The address parameters the panel keeps its two choices in.

```ts
const KIND_ADDRESS_KEY = "embed";
```

### kindLabel

*function*. What a tab says: the family's word for the id, else the page's own `labels`, else the id itself.

```ts
function kindLabel(id: string, language: Language, labels?: Readonly<Record<string, string>>, overrides?: Partial<PanelWords>): string;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### nearestSize

*function*. The size to use for a wish: the wish if it is one of the sizes, else the sizes' nearest to it, else the one nearest `DEFAULT_SIZE`.

```ts
function nearestSize(wish: number | string | null | undefined, sizes: readonly number[]): number;
```

### parseKinds

*function*. The tab ids from a text such as `html module react`: lower case, once each, in order; no usable id is the default list.

```ts
function parseKinds(text: string | null | undefined, fallback?: readonly string[]): string[];
```

### parseSizes

*function*. The sizes from a text such as `160 240 320`: whole numbers from 16 up to 4096, once each, smallest first; no usable number is the default sizes.

```ts
function parseSizes(text: string | null | undefined, fallback?: readonly number[]): number[];
```

### SEARCH_FROM

*constant*. More than this many things to pick from and the picker shows a search box.

```ts
const SEARCH_FROM = 12;
```

### SIZE_ADDRESS_KEY

*constant*

```ts
const SIZE_ADDRESS_KEY = "size";
```

### TAG

*constant*

```ts
const TAG = "kazoku-embed-panel";
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, PanelWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<PanelWords>) => PanelWords;
```

### EmbedKind

*type*. One of the ways in `EMBED_KINDS`.

```ts
type EmbedKind = (typeof EMBED_KINDS)[number];
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### PanelWords

*interface*

```ts
interface PanelWords {
    /** The panel's heading, when it shows one (`heading` attribute). */
    title: string;
    /** The name of the group of size buttons. */
    size: string;
    /** The name of the row of tabs. */
    kinds: string;
    /** The name of the picker. */
    pick: string;
    search: string;
    all: string;
    /** Said under the picker when the search finds nothing. */
    none: string;
    /** The name of the picture beside the code. */
    preview: string;
    /** The name of the code box. */
    code: string;
    copy: string;
    copied: string;
    copyFail: string;
    open: string;
    docs: string;
    credits: string;
    /** Tab names (`kind_<id>`). */
    kind_html: string;
    kind_module: string;
    kind_react: string;
    kind_vue: string;
    kind_angular: string;
    kind_svelte: string;
    kind_iframe: string;
    kind_image: string;
    kind_element: string;
    kind_url: string;
    kind_svg: string;
}
```

### PickItem

*interface*. One thing the compact picker offers: a planet, a jersey, a stadium.

```ts
interface PickItem {
    /** What the page reads back from `value`. */
    id: string;
    /** What the button says. */
    label: string;
    /** The row of choices it is under (chips above the list); items with no group are only under All. */
    group?: string;
    /** More words the search matches (another name, a country). */
    words?: string;
}
```

### SnippetSpec

*interface*. What `embedSnippet` needs to know about an element: where it comes from, what it is called and what it is given.

```ts
interface SnippetSpec {
    /** The npm name, for the `import` lines: `@scope/name`. */
    package: string;
    /** The package on the CDN with its version: `https://cdn.jsdelivr.net/npm/@scope/name@1.2.3`. */
    cdn: string;
    /** The element's tag. */
    tag: string;
    /** The subpath (under the package name) that defines the tag; an empty text is the package's main entry. */
    element: string;
    /** More subpaths to load beside it (data, looks); none is fine. */
    entries: readonly string[];
    /** The attributes, in the order they are written. A value of `""` is written as a bare attribute. */
    attrs: readonly (readonly [string, string])[];
    /** The name the React, Angular and plain module examples use: `planet` gives `Planet`, `PlanetComponent`, `app-planet` and `#planet`. */
    name: string;
    /** The embed page as an iframe. */
    iframe: {
        src: string;
        title: string;
        width: number;
        height: number;
    };
}
```

## `@johnmorrisdotca/kazoku-ui/embed-panel/element`

3 values and 4 types.

```js
import { EmbedPanelElement, EVENT, TAG } from '@johnmorrisdotca/kazoku-ui/embed-panel/element';
```

### EmbedPanelElement

*class*. Attributes: `kinds` (the tabs, `html module react vue angular svelte iframe` by default; add your own such as `image`), `kind` (the tab to start on), `sizes` (`160 240 320 480`) and

```ts
class EmbedPanelElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The tab now: one of `kinds`. Setting one that is not there is ignored. */
    get kind(): string;
    set kind(kind: string);
    /** The size now, in pixels across: one of `sizes`. Setting a number that is not one takes the nearest. */
    get size(): number;
    set size(size: number | string);
    /** The tabs, in order. Setting a list (or a text such as `html react iframe`) draws them again. */
    get kinds(): readonly string[];
    set kinds(list: readonly string[] | string);
    /** The sizes the buttons offer, smallest first. */
    get sizes(): readonly number[];
    set sizes(list: readonly number[] | string);
    /** The picker's choice: an item's `id`. Setting one that is not in `items` is ignored. */
    get value(): string;
    set value(id: string);
    /** The things the built-in picker offers. Leave it empty and give the `picker` slot for a picker of your own. */
    get items(): readonly PickItem[];
    set items(items: readonly PickItem[]);
    /** How a picker button looks inside: a node (a small picture) or a text. The label by default. */
    set renderItem(render: ((item: PickItem) => Node | string) | undefined);
    /** The text of a tab for the choices as they are. Required: without it the code box is empty. Call `update()` after the page's own choices change. */
    set generate(generate: ((context: EmbedContext) => string) | undefined);
    /** The picture the code makes, as a node (or nothing). It is called when the picture's choices change; the iframe tab draws the iframe itself when this returns nothing for it. */
    set preview(preview: ((context: EmbedContext) => Node | undefined) | undefined);
    /**
     * The credit line shown under the code (and read by a screen reader): a text, its pieces with some of them links (the
     * licence and the source each linked, `["Flag: ", { text: "CC BY 2.5", href }, ", ", { text: "Wikimedia Commons", href }]`),
     * or a function of the choices that gives either. Only an http, https or relative address links, in a tab of its own.
     * The credit is the page's, not part of the copied code.
     *
     * @example
     * ```ts
     * const panel = document.querySelector("kazoku-embed-panel")!;
     * panel.credits = ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }];
     * ```
     */
    set credits(credits: Credits);
    /** A line above the code for the tab shown ("The embed page is for a site that cannot run script."): a text, or a function of the choices. */
    set note(note: Text);
    /** The names of the tabs the family has no word for: `{ image: "Image address" }`. */
    set labels(labels: Record<string, string>);
    /** Your own words over the language's. */
    set words(words: Partial<PanelWords>);
    /** Where "Open the embed page" goes. Set it again when the choices change the address. */
    get openHref(): string;
    set openHref(href: string);
    /** Where "Read the docs" goes. */
    get docsHref(): string;
    set docsHref(href: string);
    /** The text of the tab shown: what Copy copies. */
    get code(): string;
    /** Reads the page's choices again: the code, the credit, the note, the links, and the picture if its choices changed. Call it whenever the page's own choices change. It tells no one. */
    update(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-embedchange";
```

### TAG

*constant*

```ts
const TAG = "kazoku-embed-panel";
```

### CreditPart

*type*. One piece of a credit line: a text, or a text that links. A link's `href` is used only where it is http, https or

```ts
type CreditPart = string | {
    text: string;
    href: string;
};
```

### Credits

*type*. The credit line: a text, its pieces (some of them links), or a function of the choices that gives either; a function

```ts
type Credits = string | readonly CreditPart[] | ((context: EmbedContext) => string | readonly CreditPart[]);
```

### EmbedChangeDetail

*interface*. What the `kazoku-embedchange` event carries in `detail`.

```ts
interface EmbedChangeDetail {
    kind: string;
    size: number;
    /** The picker's choice (an item's `id`), or an empty text where there is no built-in picker. */
    value: string;
    /** The text to copy now. */
    code: string;
    /** `init` (once, when it comes up), `kind` (a tab), `size` (a size button), `pick` (the picker) or `set` (a property or attribute). */
    reason: "init" | "kind" | "size" | "pick" | "set";
}
```

### EmbedContext

*interface*. What the page's `generate`, `preview`, `credits` and `note` functions are told.

```ts
interface EmbedContext {
    /** The tab: `html`, `module`, `react`, `vue`, `angular`, `svelte`, `iframe`, or one the page added. */
    kind: string;
    /** The size chosen, in pixels across. */
    size: number;
    /** True when the text is for the picture beside the code, not for the reader to copy: a page may use a relative address there so the picture works from where the page is. */
    preview: boolean;
}
```

## `@johnmorrisdotca/kazoku-ui/embed-panel/define`

1 value and 0 types.

```js
import { defineEmbedPanel } from '@johnmorrisdotca/kazoku-ui/embed-panel/define';
```

### defineEmbedPanel

*function*

```ts
function defineEmbedPanel(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/wide-layout`

15 values and 4 types.

```js
import { applyWide, EVENT, isTyping, languageOf, parseWide, readWide, TAG, WIDE_ADDRESS_KEY, WIDE_ATTRIBUTE, WIDE_MIN_WIDTH_PX, WIDE_STORAGE_KEY, wideCss, wideOf, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/wide-layout';
```

### applyWide

*function*. Writes the choice on the target.

```ts
function applyWide(target: Element, wide: boolean): void;
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-widechange";
```

### isTyping

*function*. Whether a key press is the reader typing: a text field, a select, an editable element, or any key with Ctrl, Command or Alt held. The T key is left to them.

```ts
function isTyping(target: Element | null, event: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
}): boolean;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### parseWide

*function*. `on`, `1`, `true` and `wide` are wide; `off`, `0`, `false` and `normal` are not; anything else is no answer.

```ts
function parseWide(value: unknown): boolean | undefined;
```

### readWide

*function*. The remembered choice: the address first, then the store. `undefined` when neither holds one.

```ts
function readWide(from: RememberedWide): boolean | undefined;
```

### TAG

*constant*

```ts
const TAG = "kazoku-wide-toggle";
```

### WIDE_ADDRESS_KEY

*constant*. The address parameter, with `address`: `?wide=on`.

```ts
const WIDE_ADDRESS_KEY = "wide";
```

### WIDE_ATTRIBUTE

*constant*. The attribute the choice is written to on the target: `data-wide="on"` when wide, none when normal.

```ts
const WIDE_ATTRIBUTE = "data-wide";
```

### WIDE_MIN_WIDTH_PX

*constant*. Below this width the layout is already one column, so the toggle hides and the rule does nothing.

```ts
const WIDE_MIN_WIDTH_PX = 641;
```

### WIDE_STORAGE_KEY

*constant*. The localStorage key, with a bare `storage`.

```ts
const WIDE_STORAGE_KEY = "kazoku-wide";
```

### wideCss

*function*. The layout rule, as CSS for the page. A `.kazoku-stage` holds a `.kazoku-view` and a `.kazoku-side`. In Normal the panel is a column beside the view. When an ancestor (the page's <html> by

```ts
function wideCss(options?: WideCssOptions): string;
```

### wideOf

*constant*. What a target holds now.

```ts
const wideOf: (target: Element) => boolean;
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, WideWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<WideWords>) => WideWords;
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### RememberedWide

*interface*. Where a remembered choice may be read from. A page that keeps nothing passes neither.

```ts
interface RememberedWide {
    /** An address' search string such as `?wide=on`, read with `addressKey`. */
    search?: string;
    addressKey?: string;
    /** A localStorage-like object and the key in it. A store that throws is the same as an empty one. */
    storage?: Pick<Storage, "getItem">;
    storageKey?: string;
}
```

### WideCssOptions

*interface*

```ts
interface WideCssOptions {
    /** The width of the side panel beside the view in Normal. 320px by default. */
    side?: string;
    /** The tallest the view gets in Wide, with its 16:9 shape kept. 80vh by default. */
    maxHeight?: string;
}
```

### WideWords

*interface*

```ts
interface WideWords {
    /** The group's name for a screen reader. */
    group: string;
    /** The button in Normal: press for wide. */
    wide: string;
    /** The button in Wide: press for normal. */
    normal: string;
}
```

## `@johnmorrisdotca/kazoku-ui/wide-layout/element`

3 values and 1 type.

```js
import { EVENT, TAG, WideToggleElement } from '@johnmorrisdotca/kazoku-ui/wide-layout/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-widechange";
```

### TAG

*constant*

```ts
const TAG = "kazoku-wide-toggle";
```

### WideToggleElement

*class*. Attributes: `value` (`on` or `off`; the choice), `target` (a CSS selector for the element that gets `data-wide`; the page's <html> by default), `address` (keep the choice in `?wide=`, or the key

```ts
class WideToggleElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** Whether the page is wide now. Setting it applies it (event reason `set`). */
    get wide(): boolean;
    set wide(next: boolean);
    /** The element the choice is written on. */
    get target(): Element | undefined;
    set target(element: Element | undefined);
    /** Your own labels over the language's, for example `{ wide: "Theatre" }`. */
    set words(words: Partial<WideWords>);
    /** Switch between Normal and Wide, as the button does. */
    toggle(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _old: string | null, value: string | null): void;
}
```

### WideChangeDetail

*interface*. What the `kazoku-widechange` event carries in `detail`.

```ts
interface WideChangeDetail {
    /** Whether the page is wide now. */
    wide: boolean;
    /** `init`, `user` (the button), `key` (the T key), `set` (the `value` property or attribute) or `external` (something else wrote the target's `data-wide`). */
    reason: "init" | "user" | "key" | "set" | "external";
    /** The element the choice is written on. */
    target: Element;
}
```

## `@johnmorrisdotca/kazoku-ui/wide-layout/define`

1 value and 0 types.

```js
import { defineWideToggle } from '@johnmorrisdotca/kazoku-ui/wide-layout/define';
```

### defineWideToggle

*function*

```ts
function defineWideToggle(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/page-frame`

19 values and 12 types.

```js
import { applyPageMeta, CREDITS_TAG, creditsText, escapeHtml, FOOTER_TAG, languageOf, licenceText, pageCreditsHtml, pageFooterHtml, pageHeaderHtml, pageHeadHtml, pageProblems, pageTitle, pickText, samePage, TAG, watchPageMeta, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/page-frame';
```

### applyPageMeta

*function*. Sets `document.title` and the description (and the Open Graph pair, when the page has them) from the page's words in `language`. Returns what it set.

```ts
function applyPageMeta(doc: Document, texts: PageTexts, language: Language): {
    title: string;
    description: string;
};
```

### CREDITS_TAG

*constant*

```ts
const CREDITS_TAG = "kazoku-page-credits";
```

### creditsText

*function*. A credit line from a view's `credits()`: each source's credit with its licence, the package's own first, joined with semicolons and ending in a full stop (in Japanese the licence goes in one pair of `（）` and the sources are joined with `／`, with no full stop). An empty list is an empty string.

```ts
function creditsText(credits: readonly DoorCredit[], language: Language, words: {
    nonCommercial: string;
    shareAlike: string;
}): string;
```

### escapeHtml

*constant*. Text as it is written into HTML, between tags or inside a double-quoted attribute.

```ts
const escapeHtml: (text: string) => string;
```

### FOOTER_TAG

*constant*

```ts
const FOOTER_TAG = "kazoku-page-footer";
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### licenceText

*function*. The terms of a source in words: its licence name, with "non-commercial" or "share-alike" when it says so, so a page cannot hide the terms of the data it draws. In Japanese the terms follow the

```ts
function licenceText(info: DoorSourceInfo, words: {
    nonCommercial: string;
    shareAlike: string;
}, language?: Language): string;
```

### pageCreditsHtml

*function*. `<kazoku-page-credits>` as a string, for a build. Give the page's own credit line, or a `href` to a credits page, or both. A line given

```ts
function pageCreditsHtml(credits: PageCredits | undefined, options?: PageCreditsOptions): string;
```

### pageFooterHtml

*function*. `<kazoku-page-footer>` as a string, for a build: the links, with the same words inside as the no-script fallback.

```ts
function pageFooterHtml(options?: PageFooterOptions): string;
```

### pageHeaderHtml

*function*. `<kazoku-page-header>` as a string, for a build: the package's name, what this page shows, the page's description (kept for `meta`), and the links, with the same words

```ts
function pageHeaderHtml(texts: PageTexts, options?: PageHeaderOptions): string;
```

### pageHeadHtml

*function*. The lines of `<head>` that name the page: `<title>`, the description, and the same two for a shared link (Open Graph). Write them at build time, so the built HTML carries them

```ts
function pageHeadHtml(texts: PageTexts, language?: Language): string;
```

### pageProblems

*function*. What is wrong with one page's HTML, as lines of text; an empty list means the page is fine. A page needs a real `<title>` and description in the HTML itself, a

```ts
function pageProblems(html: string, options?: PageCheckOptions): string[];
```

### pageTitle

*function*. The page's `<title>`: the package's name, then what the page shows ("Hoshi Stars: The 88 constellations"; in Japanese a full-width colon).

```ts
function pageTitle(text: Pick<PageText, "name" | "what">, language?: Language): string;
```

### pickText

*constant*. The words for `language`: its own table, else English.

```ts
const pickText: (texts: PageTexts, language: Language) => PageText;
```

### samePage

*function*. True when `href` (relative to `base`) is the page at `base`: `index.html`, `./` and `/demo/` are one page, and a search or hash does not make another.

```ts
function samePage(href: string, base: string): boolean;
```

### TAG

*constant*

```ts
const TAG = "kazoku-page-header";
```

### watchPageMeta

*function*. Sets the title and description now, and again whenever the page's `lang` changes (the language picker writes it on `<html>`). Returns a function that stops watching.

```ts
function watchPageMeta(doc: Document, texts: PageTexts): () => void;
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, PageFrameWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<PageFrameWords>) => PageFrameWords;
```

### CreditPart

*type*. One piece of a credit line: a text, or a text that links. A link's `href` is used only where it is http, https or

```ts
type CreditPart = string | {
    text: string;
    href: string;
};
```

### DoorCredit

*interface*. What a view's `credits()` returns for each source that drew something in the last frame.

```ts
interface DoorCredit {
    source: DoorSourceInfo;
    /** True for the package's own data: bundled, never switched off from the layers panel. */
    own: boolean;
    /** Marks or tiles drawn from it. */
    used: number;
}
```

### DoorSourceInfo

*interface*. The data door's description of a source: its name, its credit line, its licence and its page.

```ts
interface DoorSourceInfo {
    id: string;
    name: Bilingual;
    credit: Bilingual;
    /** `nameJa` is the name in Japanese for a Japanese line (a source's own terms, `"UCAC4の利用条件"`); left out, a plain phrase is translated and an identifier stays. */
    licence: {
        name: string;
        nameJa?: string;
        url: string;
        nonCommercial?: boolean;
        shareAlike?: boolean;
    };
    url: string;
}
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### PageCheckOptions

*interface*. What a page must have. An embed page (made for someone else's site) needs the credit line only.

```ts
interface PageCheckOptions {
    /** True for a page that sits inside another site: the credit line, in its small form, and no header. */
    embed?: boolean;
}
```

### PageCredits

*interface*. What the page says in each language about its credits: the line itself, or its pieces (a text or `{ text, href }`) so a

```ts
interface PageCredits {
    en: string | readonly CreditPart[];
    ja?: string | readonly CreditPart[];
}
```

### PageCreditsOptions

*interface*. How the credit line is made.

```ts
interface PageCreditsOptions {
    /** A link to the NOTICE or credits page ("Data and credits"). With a line of credits too, the link follows it. */
    href?: string;
    /** The small form for a page that sits inside someone else's site: the credit line only. */
    embed?: boolean;
    /** The language of the words written inside the tag. Default `en`. */
    language?: Language;
    /** Your own words, over the family's. */
    words?: Partial<PageFrameWords>;
}
```

### PageFooterOptions

*interface*. How the footer is made.

```ts
interface PageFooterOptions {
    /** `view` (the default): one quiet line; `page`: the reading page's footer. */
    variant?: "view" | "page";
    /** The page of data and credits. */
    href?: string;
    /** The package's name, for "Drawn with …", and where it links. */
    package?: string;
    packageHref?: string;
    /** How to cite, and the sheets to print. Left out, there is no link. */
    citeHref?: string;
    sheetsHref?: string;
    /** A link home; `index.html` by default. */
    home?: string;
    /** The language of the words written inside the tag. Default `en`. */
    language?: Language;
    /** Your own words, over the family's. */
    words?: Partial<PageFrameWords>;
}
```

### PageFrameWords

*interface*

```ts
interface PageFrameWords {
    /** The link to the demo's home page. */
    home: string;
    /** The link to the printable sheets. */
    sheets: string;
    /** The link to the credits page, and the lead-in to a page's own credit line. */
    credits: string;
    /** The name of the header's links for a screen reader. */
    site: string;
    /** What stands between the package's name and what the page shows: a colon. */
    colon: string;
    /** The footer line of a view: what is true of the positions drawn. */
    positions: string;
    /** The footer's "Drawn with <package>". */
    drawnWith: string;
    /** The footer's lead-in to the link to every source. */
    sourcesLead: string;
    /** The footer's link to how to cite the page. */
    cite: string;
    /** The footer's link to the printable sheets. */
    sheetsToPrint: string;
    /** The terms a credit line names, after a licence. */
    nonCommercial: string;
    shareAlike: string;
}
```

### PageHeaderOptions

*interface*. Where the links go and how the header is made.

```ts
interface PageHeaderOptions {
    /** The demo's home page, as an address the page can use. Default `index.html`. */
    home?: string;
    /** The printable sheets, when the package has them. Left out, the header has no Sheets link. */
    sheets?: string;
    /** The language of the words written inside the tag. Default `en`; the element changes it with the reader's. */
    language?: Language;
    /** Also set the document's title and description from these words when the language changes (the element's `meta` attribute). */
    meta?: boolean;
    /** Your own words for Home and the sheets link, over the family's. */
    words?: Partial<PageFrameWords>;
}
```

### PageText

*interface*. One language's words for one page.

```ts
interface PageText {
    /** The package's name as that language writes it: "Hoshi Stars". */
    name: string;
    /** What this page shows, in plain words for a person who has never heard of the package: "Every one of the 88 constellations, pictured". */
    what: string;
    /** The page's description, for a search result and a shared link: one or two sentences. */
    description: string;
}
```

### PageTexts

*interface*. A page's words in each language. English is required, and stands in for a language that is left out.

```ts
interface PageTexts {
    en: PageText;
    ja?: PageText;
}
```

## `@johnmorrisdotca/kazoku-ui/page-frame/element`

6 values and 0 types.

```js
import { CREDITS_TAG, FOOTER_TAG, PageCreditsElement, PageFooterElement, PageHeaderElement, TAG } from '@johnmorrisdotca/kazoku-ui/page-frame/element';
```

### CREDITS_TAG

*constant*

```ts
const CREDITS_TAG = "kazoku-page-credits";
```

### FOOTER_TAG

*constant*

```ts
const FOOTER_TAG = "kazoku-page-footer";
```

### PageCreditsElement

*class*. Attributes: `credits` (this page's credit line, for example "Stars: Yale Bright Star Catalogue, public domain"), `credits-ja`, `credit-parts` and `credit-parts-ja` (the line in

```ts
class PageCreditsElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** Your own words over the family's, for example `{ credits: "Sources" }`. */
    set words(words: Partial<PageFrameWords>);
    /**
     * The credit line in pieces, over the `credits` attributes: one list for every language, or one for each
     * (`{ en: [...], ja: [...] }`). A piece is a text or `{ text, href }`; only an http, https or relative address links.
     *
     * @example
     * ```ts
     * document.querySelector("kazoku-page-credits")!.credits = {
     *   en: ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
     *   ja: ["旗：", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
     * };
     * ```
     */
    set credits(pieces: readonly CreditPart[] | Partial<Record<Language, readonly CreditPart[]>> | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
}
```

### PageFooterElement

*class*. Attributes: `variant` (`view`, the default: the quiet line of a view; or `page`: the reading page's footer), `note` and `note-ja` (the view line's first words, "Positions computed for the time shown" by default),

```ts
class PageFooterElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** Your own words over the family's, for example `{ cite: "Cite this page" }`. */
    set words(words: Partial<PageFrameWords>);
    /** What the view drew from: its `credits()`. */
    get sources(): readonly DoorCredit[];
    set sources(next: readonly DoorCredit[]);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
}
```

### PageHeaderElement

*class*. Attributes: `name` (the package's name), `what` (what this page shows, in plain words), `home` (the demo's home page; `index.html` by default), `sheets` (the printable sheets; no

```ts
class PageHeaderElement extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The page's words as one table, over the attributes. */
    get texts(): PageTexts | undefined;
    set texts(texts: PageTexts | undefined);
    /** Your own words for Home and the sheets link over the family's, for example `{ sheets: "Sheets to print" }`. */
    set words(words: Partial<PageFrameWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
}
```

### TAG

*constant*

```ts
const TAG = "kazoku-page-header";
```

## `@johnmorrisdotca/kazoku-ui/page-frame/define`

1 value and 0 types.

```js
import { definePageFrame } from '@johnmorrisdotca/kazoku-ui/page-frame/define';
```

### definePageFrame

*function*. Registers the three tags on `registry`; true if it registered at least one.

```ts
function definePageFrame(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/interface`

55 values and 27 types.

```js
import { canStep, cardProblems, COLOURS, contrastRatio, CONTROL_ORDER, cultureSegments, FONTS, formatMoment, formatValue, fromInputValue, hasValue, ICON_NAMES, ICON_STROKE, ICONS, iconSvg, installTokens, isIconName, isScaleStep, kui, LANGUAGE_SEGMENTS, languageOf, licenceText, lookName, LOOKS, luminance, nextLook, parseControls, parseLooks, parseScaleSteps, parseSegments, RADII, READABLE_PAIRS, readingProblems, say, SCALE_STEPS, scaleName, scientificParts, SIZES, sourcesFromCredits, SPEED_LADDER, speedWords, stepSpeed, superscript, TAG, TAGS, TIME_CONTROLS, toInputValue, TOKEN_PROPERTIES, tokensCss, trailText, unreadablePairs, VIEW_CONTROLS, WORDS, wordsFor, zoneName } from '@johnmorrisdotca/kazoku-ui/interface';
```

### canStep

*function*. Whether Faster or Slower still has a step to go to from `speed`.

```ts
function canStep(speed: number, direction: 1 | -1, ladder?: readonly number[]): boolean;
```

### cardProblems

*function*. What is wrong with a card, in words, for a test or a page's own check: a number with no source, a number that is computed and shows nothing, a card with no name or no stats, a second action with no first.

```ts
function cardProblems(data: ObjectCardData): string[];
```

### COLOURS

*constant*. The colours, as the design gives them. Text and icons on every ground below pass 4.5:1 (a test holds that).

```ts
const COLOURS: {
    /** Behind a 3D or sky view. */
    readonly space: "#070A10";
    /** Behind a reading page. */
    readonly page: "#0B0E14";
    /** Bars, cards, panels and fields. */
    readonly panel: "#121722";
    /** 1 px borders, dividers, and the fill of an active or pressed control. */
    readonly line: "#232B3A";
    /** The border of an outlined button, and orbit lines. */
    readonly "line-strong": "#3A4860";
    /** Main text and icons. */
    readonly text: "#E8ECF2";
    /** Reading paragraphs, and labels on a view. */
    readonly "text-soft": "#C9D2E0";
    /** Labels, secondary lines, inactive items. */
    readonly "text-quiet": "#9AA6B8";
    /** The one action colour: the filled button, the active marker, the speed readout, checked boxes. */
    readonly sun: "#F2B84B";
    /** Text on `sun`. */
    readonly "on-sun": "#141413";
    /** Links. */
    readonly sky: "#8EC2FF";
    /** A link on hover. */
    readonly "sky-hover": "#B9D9FF";
};
```

### contrastRatio

*function*. The contrast ratio of two `#rrggbb` colours, 1 to 21, as WCAG 2 reckons it.

```ts
function contrastRatio(a: string, b: string): number;
```

### CONTROL_ORDER

*constant*. The controls in the design's order: slower, play or pause, faster, the clock, back to now, a divider, your place, layers, look, free flight.

```ts
const CONTROL_ORDER: readonly ["slower", "play", "faster", "clock", "now", "place", "layers", "look", "flight"];
```

### cultureSegments

*function*. The sky culture switch, in the reader's language.

```ts
function cultureSegments(words: Pick<InterfaceWords, "western" | "japanese" | "chinese">): Segment[];
```

### FONTS

*constant*. The type: Plex Sans for words, Plex Sans JP behind it for Japanese, Plex Mono for every number, date, time and unit. The system faces are the fallback while a font loads.

```ts
const FONTS: {
    readonly sans: "\"IBM Plex Sans\", \"IBM Plex Sans JP\", system-ui, -apple-system, \"Hiragino Sans\", \"Noto Sans JP\", \"Segoe UI\", sans-serif";
    readonly mono: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, \"Noto Sans Mono CJK JP\", monospace";
};
```

### formatMoment

*function*. The moment as the clock shows it: "10 Nov 2026 · 21:14", in Japanese "2026`年`11`月`10`日` · 21:14". A moment that is not a date reads "—".

```ts
function formatMoment(ms: number, language: Language, zone?: "utc" | "local", withZone?: boolean): string;
```

### formatValue

*function*. A number as the card writes it: up to six significant figures with thousands separated, and for the very large and the very small a power of ten with a real superscript ("1.898 × 10²⁷", never "1.898e27").

```ts
function formatValue(value: string | number | null | undefined): string;
```

### fromInputValue

*function*. The moment a `datetime-local` value names, or `NaN` when it names none.

```ts
function fromInputValue(text: string, zone?: "utc" | "local"): number;
```

### hasValue

*constant*. Whether a stat has a value to show.

```ts
const hasValue: (stat: CardStat) => boolean;
```

### ICON_NAMES

*constant*. The names of the built-in icons.

```ts
const ICON_NAMES: readonly ["slower", "play", "pause", "faster", "now", "place", "layers", "look", "flight", "close", "search", "menu"];
```

### ICON_STROKE

*constant*. The stroke width of every icon, in the 24-unit grid.

```ts
const ICON_STROKE = 1.75;
```

### ICONS

*constant*. The path data of each icon.

```ts
const ICONS: Readonly<Record<IconName, readonly string[]>>;
```

### iconSvg

*function*. An icon as SVG markup, for a page written as plain HTML: `iconSvg("play")`. It is hidden from a screen reader; the button carries the name.

```ts
function iconSvg(name: IconName): string;
```

### installTokens

*function*. Puts the tokens on a document's `:root`, once, as an adopted stylesheet where the browser has one (no inline style, so a strict Content-Security-Policy allows it),

```ts
function installTokens(doc?: Document, nonce?: string): void;
```

### isIconName

*constant*. Whether a string is the name of a built-in icon.

```ts
const isIconName: (name: string | null | undefined) => name is IconName;
```

### isScaleStep

*constant*. Whether a string is one of the steps.

```ts
const isScaleStep: (value: string | null | undefined) => value is ScaleStep;
```

### kui

*constant*. The value of a token as the CSS reads it, with the design's own value as the fallback: `kui("panel")` is `var(--kui-panel, #121722)`.

```ts
const kui: (name: ColourName) => string;
```

### LANGUAGE_SEGMENTS

*constant*. The language switch: each language in its own name, never translated.

```ts
const LANGUAGE_SEGMENTS: readonly Segment[];
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### licenceText

*function*. The terms of a source in words: its licence name, with "non-commercial" or "share-alike" when it says so, so a page cannot hide the terms of the data it draws. In Japanese the terms follow the

```ts
function licenceText(info: DoorSourceInfo, words: {
    nonCommercial: string;
    shareAlike: string;
}, language?: Language): string;
```

### lookName

*constant*. The look's name in the words' language.

```ts
const lookName: (look: Look, words: Pick<InterfaceWords, "lookLine" | "lookRealistic" | "lookPainted">) => string;
```

### LOOKS

*constant*. The ways a view can be drawn, which the Look button goes through: lines, realistic, painted.

```ts
const LOOKS: readonly ["line", "realistic", "painted"];
```

### luminance

*function*. The relative luminance of a `#rrggbb` colour, as WCAG 2 reckons it.

```ts
function luminance(hex: string): number;
```

### nextLook

*function*. The look after `current` in `looks`, going round.

```ts
function nextLook(current: string | null | undefined, looks?: readonly Look[]): Look;
```

### parseControls

*function*. The controls a view offers, from a list such as `play clock layers`: only the nine names, each once, always in the design's order. A missing list is all nine.

```ts
function parseControls(text: string | null | undefined): ControlName[];
```

### parseLooks

*function*. The looks a view offers, from a list such as `realistic painted`, in the design's order; all three when it is empty.

```ts
function parseLooks(text: string | null | undefined): Look[];
```

### parseScaleSteps

*function*. The steps a view offers, from a list such as `surface solar stars`: only the five names, each once, always in the design's order whatever order the list is in. An empty or missing list is all five.

```ts
function parseScaleSteps(text: string | null | undefined): ScaleStep[];
```

### parseSegments

*function*. The segments in an `options` attribute: `western:Western|japanese:Japanese`. A segment with no colon is its own value and label. Empty values and repeats are left out.

```ts
function parseSegments(text: string | null | undefined): Segment[];
```

### RADII

*constant*. The radii, in px: controls, panels and cards, and the top corners of a phone sheet.

```ts
const RADII: {
    readonly control: 8;
    readonly panel: 12;
    readonly sheet: 16;
};
```

### READABLE_PAIRS

*constant*. The pairs of text or icon colour and ground the design promises at 4.5:1 or better: `[foreground, ground]`.

```ts
const READABLE_PAIRS: readonly (readonly [ColourName, ColourName])[];
```

### readingProblems

*function*. What is wrong with a reading page's data, in words: a number with no source, a "Right now" row that is not three tiles or has a blank, no actions, no summary.

```ts
function readingProblems(data: ReadingPageData): string[];
```

### say

*constant*. `text` in the language, or its English when the other is empty.

```ts
const say: (text: string | Bilingual, language: Language) => string;
```

### SCALE_STEPS

*constant*. The five steps of scale, from the nearest to the farthest.

```ts
const SCALE_STEPS: readonly ["surface", "moons", "solar", "stars", "galaxy"];
```

### scaleName

*constant*. What a step is called, in the words' language.

```ts
const scaleName: (step: ScaleStep, words: Pick<InterfaceWords, ScaleStep>) => string;
```

### scientificParts

*function*. The pieces of a very large or very small number (a size of a billion or more, or under a thousandth): "1.898" and 27 for 1.898e27. `undefined` for any number that is written in full, and for text.

```ts
function scientificParts(value: string | number | null | undefined): ScientificParts | undefined;
```

### SIZES

*constant*. The sizes, in px, the design names.

```ts
const SIZES: {
    /** The least a touch target is, each way. */
    readonly touch: 44;
    /** An icon, and on a phone. */
    readonly icon: 18;
    readonly iconPhone: 20;
    /** Label type: capitals, 0.08em apart, `text-quiet`. */
    readonly label: 11;
    readonly control: 14;
    readonly reading: 16;
    readonly nameDesk: 56;
    readonly namePhone: 40;
    readonly nameCard: 26;
    readonly nameCardPhone: 24;
    readonly topBar: 64;
    readonly topBarPhone: 56;
    readonly controlBarPhone: 116;
    readonly scaleSwitch: 148;
    readonly panel: 320;
    readonly page: 1120;
};
```

### sourcesFromCredits

*function*. The outside sources among a view's credits, ready for the panel; the package's own data is left out, since it is not for switching off. `enabled` says which are on (all, by default).

```ts
function sourcesFromCredits(credits: readonly DoorCredit[], enabled?: (id: string) => boolean): LayerSource[];
```

### SPEED_LADDER

*constant*. The speeds Slower and Faster step through: real time, a minute, ten minutes, an hour, a day, a week, a month and a year each second.

```ts
const SPEED_LADDER: readonly number[];
```

### speedWords

*function*. A speed in plain words: "1 hour each second", "Real time", "Paused", "2 days each second, backwards"; in Japanese "1`秒で`1`時間`".

```ts
function speedWords(speed: number, language: Language, running: boolean, words: Pick<InterfaceWords, "paused" | "realTime" | "backwards">): string;
```

### stepSpeed

*function*. The speed one press of Faster (`direction` 1) or Slower (-1) gives: the next step of `ladder` in the direction the clock runs, never past an end. A paused clock at 0 starts from the first step.

```ts
function stepSpeed(speed: number, direction: 1 | -1, ladder?: readonly number[]): number;
```

### superscript

*constant*. An exponent as superscript characters: 27 is "²⁷", -5 is "⁻⁵".

```ts
const superscript: (exponent: number) => string;
```

### TAG

*constant*

```ts
const TAG: "kazoku-control-bar";
```

### TAGS

*constant*

```ts
const TAGS: {
    readonly iconButton: "kazoku-icon-button";
    readonly controlBar: "kazoku-control-bar";
    readonly scaleSwitch: "kazoku-scale-switch";
    readonly objectCard: "kazoku-object-card";
    readonly layersPanel: "kazoku-layers-panel";
    readonly segmentedSwitch: "kazoku-segmented-switch";
    readonly button: "kazoku-button";
    readonly topBar: "kazoku-top-bar";
    readonly readingPage: "kazoku-reading-page";
};
```

### TIME_CONTROLS

*constant*. The controls on the near side of the divider, and on the far side of it.

```ts
const TIME_CONTROLS: readonly ControlName[];
```

### toInputValue

*function*. The value a `<input type="datetime-local">` takes for a moment: "2026-11-10T21:14".

```ts
function toInputValue(ms: number, zone?: "utc" | "local"): string;
```

### TOKEN_PROPERTIES

*constant*. Every token as `--kui-<name>: value`, the one list the CSS below and the parts' fallbacks are written from.

```ts
const TOKEN_PROPERTIES: Readonly<Record<string, string>>;
```

### tokensCss

*function*. The tokens as one CSS rule, for a `<style>` in the page, a build or `installTokens`.

```ts
function tokensCss(selector?: string): string;
```

### trailText

*function*. The trail as plain text, for a title or a test: "Solar system / Jupiter `木星`".

```ts
function trailText(items: readonly TrailItem[]): string;
```

### unreadablePairs

*function*. The pairs that fail 4.5:1, from `READABLE_PAIRS`: none, while the design is kept.

```ts
function unreadablePairs(colours?: Readonly<Record<string, string>>): string[];
```

### VIEW_CONTROLS

*constant*

```ts
const VIEW_CONTROLS: readonly ControlName[];
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, InterfaceWords>;
```

### wordsFor

*constant*. The words in a language, with a page's own over them: `wordsFor("en", { layers: "Show" })`.

```ts
const wordsFor: (language: Language, overrides?: Partial<InterfaceWords>) => InterfaceWords;
```

### zoneName

*function*. The short name of the time zone a moment is shown in: "UTC", or the device's own ("MST", "JST", "GMT+1"), which the browser names for that moment (so summer time is right).

```ts
function zoneName(ms: number, language: Language, zone?: "utc" | "local"): string;
```

### BarClock

*interface*. The clock the control bar drives: a moment (milliseconds since 1970, UTC), a speed (moment seconds each real second; negative runs back; kept while paused) and a running flag.

```ts
interface BarClock {
    readonly time: number;
    readonly speed: number;
    readonly running: boolean;
    set(time: number | "now"): void;
    setSpeed(speed: number): void;
    play(): void;
    pause(): void;
    /** Calls `fn` on every change; returns the function that stops listening. */
    onChange(fn: (change: BarClockChange) => void): () => void;
}
```

### BarClockChange

*interface*. What a clock tells its listeners. `reason` is why: `tick` is the clock moving on by itself, the others are somebody asking.

```ts
interface BarClockChange {
    time: number;
    speed: number;
    running: boolean;
    reason: "tick" | "set" | "speed" | "play" | "pause";
}
```

### Bilingual

*interface*. A word or name in both languages.

```ts
interface Bilingual {
    en: string;
    ja: string;
}
```

### CardAction

*interface*. A button on the card: a link. The first is the filled one ("Open page"), the second outlined.

```ts
interface CardAction {
    label: Bilingual;
    href: string;
}
```

### CardStat

*interface*. One number on the card: a label over a value.

```ts
interface CardStat {
    id: string;
    label: Bilingual;
    /** The value. A number is written for you (`formatValue`); text is shown as given. */
    value: string | number | null | undefined;
    /** The unit, shown after the value in the same mono type: "km", "K", "AU". */
    unit?: string;
    /** True when the page works it out for the time shown (a distance now, a phase). Such a value is never blank. */
    computed?: boolean;
    /** Where the number comes from. Every number has one. */
    source: SourceLink | undefined;
}
```

### ColourName

*type*

```ts
type ColourName = keyof typeof COLOURS;
```

### ControlName

*type*

```ts
type ControlName = (typeof CONTROL_ORDER)[number];
```

### DoorCredit

*interface*. What a view's `credits()` returns for each source that drew something in the last frame.

```ts
interface DoorCredit {
    source: DoorSourceInfo;
    /** True for the package's own data: bundled, never switched off from the layers panel. */
    own: boolean;
    /** Marks or tiles drawn from it. */
    used: number;
}
```

### DoorSourceInfo

*interface*. The data door's description of a source: its name, its credit line, its licence and its page.

```ts
interface DoorSourceInfo {
    id: string;
    name: Bilingual;
    credit: Bilingual;
    /** `nameJa` is the name in Japanese for a Japanese line (a source's own terms, `"UCAC4の利用条件"`); left out, a plain phrase is translated and an identifier stays. */
    licence: {
        name: string;
        nameJa?: string;
        url: string;
        nonCommercial?: boolean;
        shareAlike?: boolean;
    };
    url: string;
}
```

### IconName

*type*

```ts
type IconName = (typeof ICON_NAMES)[number];
```

### InterfaceWords

*interface*

```ts
interface InterfaceWords {
    slower: string;
    play: string;
    pause: string;
    faster: string;
    now: string;
    place: string;
    layers: string;
    look: string;
    flight: string;
    close: string;
    search: string;
    menu: string;
    lookLine: string;
    lookRealistic: string;
    lookPainted: string;
    controlBar: string;
    clockButton: string;
    pickerTitle: string;
    pickerField: string;
    pickerSet: string;
    pickerCancel: string;
    paused: string;
    realTime: string;
    backwards: string;
    scale: string;
    surface: string;
    moons: string;
    solar: string;
    stars: string;
    galaxy: string;
    card: string;
    everyNumber: string;
    everyNumberLink: string;
    everyNumberTail: string;
    source: string;
    noValue: string;
    computed: string;
    layersTitle: string;
    dataSources: string;
    nonCommercial: string;
    shareAlike: string;
    languageGroup: string;
    cultureGroup: string;
    western: string;
    japanese: string;
    chinese: string;
    topBar: string;
    trail: string;
    searchField: string;
    home: string;
    readings: string;
    rightNow: string;
    theNumbers: string;
    measure: string;
    value: string;
    comparison: string;
    related: string;
    sourceWord: string;
    tapNote: string;
}
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### LayerItem

*interface*. One layer a view offers: Orbits, Names, Moons, Spacecraft, Constellations, Black holes, and whatever else the view has.

```ts
interface LayerItem {
    id: string;
    label: Bilingual;
    checked: boolean;
}
```

### LayerSource

*interface*. One outside data source in the panel, with whether it is switched on.

```ts
interface LayerSource {
    info: DoorSourceInfo;
    enabled: boolean;
}
```

### Look

*type*

```ts
type Look = (typeof LOOKS)[number];
```

### ObjectCardData

*interface*. Everything the card shows.

```ts
interface ObjectCardData {
    /** The label line: the kind, such as "Planet · gas giant". */
    kind: Bilingual;
    /** The name, with its Japanese name beside it: "Mars 火星". */
    name: Bilingual;
    stats: readonly CardStat[];
    primary?: CardAction;
    secondary?: CardAction;
}
```

### ReadingGroup

*interface*. A group of related objects under a heading: "Its moons", "Places to land".

```ts
interface ReadingGroup {
    title: Bilingual;
    items: readonly ReadingRelated[];
}
```

### ReadingPageData

*interface*. Everything the reading page shows.

```ts
interface ReadingPageData {
    picture?: {
        src: string;
        alt: Bilingual;
    };
    /** Where this page sits: Atlas / Planets / Mars. */
    breadcrumb?: readonly TrailItem[];
    kind: Bilingual;
    name: Bilingual;
    /** One sentence. */
    summary: Bilingual;
    /** The buttons: the first is filled ("See it in the Universe"), the rest outlined. */
    actions: readonly CardAction[];
    /** Three tiles. */
    now: readonly ReadingTile[];
    numbers: readonly ReadingRow[];
    related: readonly ReadingGroup[];
}
```

### ReadingRelated

*interface*. A link tile to a related object.

```ts
interface ReadingRelated {
    label: Bilingual;
    /** What kind of thing it is, or a short line of numbers in mono: "about 22 km across · orbits in 7 h 39 min". */
    kind?: Bilingual;
    /** A small picture, as an address. */
    picture?: string;
    href: string;
}
```

### ReadingRow

*interface*. One row of "The numbers": the measure, its value, a comparison, and where the number comes from.

```ts
interface ReadingRow {
    label: Bilingual;
    value: string | number | null | undefined;
    unit?: string;
    /** What it is compared with: "11 times Earth's radius". */
    comparison?: Bilingual;
    source: SourceLink | undefined;
}
```

### ReadingTile

*interface*. One of the three "Right now" tiles: a label over a mono value, worked out for the time shown.

```ts
interface ReadingTile {
    label: Bilingual;
    value: string | number | null | undefined;
    unit?: string;
    /** A small line under the value: "Light takes 43 minutes to arrive". */
    note?: Bilingual;
    /** A link at the foot of the tile: "Show my sky". */
    link?: CardAction;
    source: SourceLink | undefined;
}
```

### ScaleStep

*type*

```ts
type ScaleStep = (typeof SCALE_STEPS)[number];
```

### ScientificParts

*interface*. A number in two pieces, for a part that draws the exponent as a real superscript: `1.898 × 10` and `27`.

```ts
interface ScientificParts {
    mantissa: string;
    exponent: number;
}
```

### SectionLink

*interface*. One link in the top bar's sections: a site's Now, Universe, Atlas, with the current one marked.

```ts
interface SectionLink {
    label: string;
    href: string;
    current?: boolean;
}
```

### Segment

*interface*. One segment: the value it stands for and what it says.

```ts
interface Segment {
    value: string;
    label: string;
}
```

### SourceLink

*interface*. The place a number comes from.

```ts
interface SourceLink {
    /** What the link says, such as "NASA Planetary Fact Sheet". */
    label: string | Bilingual;
    href: string;
}
```

### TrailItem

*interface*. One step of where you are. A word is shown as it is; a pair is shown side by side, English and Japanese. Every step but the last can be a link.

```ts
interface TrailItem {
    label: string | Bilingual;
    href?: string;
}
```

## `@johnmorrisdotca/kazoku-ui/interface/element`

27 values and 5 types.

```js
import { BUTTON_TAG, ButtonElement, CARD_CLOSE_EVENT, CONTROL_BAR_TAG, CONTROL_EVENT, ControlBarElement, filledButtonCount, ICON_BUTTON_TAG, IconButtonElement, InterfacePart, LAYER_EVENT, LAYERS_PANEL_TAG, LayersPanelElement, OBJECT_CARD_TAG, ObjectCardElement, READING_PAGE_TAG, ReadingPageElement, SCALE_EVENT, SCALE_SWITCH_TAG, ScaleSwitchElement, SEGMENT_EVENT, SEGMENTED_SWITCH_TAG, SegmentedSwitchElement, TAG, TOP_BAR_EVENT, TOP_BAR_TAG, TopBarElement } from '@johnmorrisdotca/kazoku-ui/interface/element';
```

### BUTTON_TAG

*constant*

```ts
const BUTTON_TAG = "kazoku-button";
```

### ButtonElement

*class*. A button for the main thing to do (`variant="filled"`, in `sun`; one a screen) or for anything else (outlined, the default).

```ts
class ButtonElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The real button or link inside. */
    get control(): HTMLButtonElement | HTMLAnchorElement | undefined;
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### CARD_CLOSE_EVENT

*constant*

```ts
const CARD_CLOSE_EVENT = "kazoku-cardclose";
```

### CONTROL_BAR_TAG

*constant*

```ts
const CONTROL_BAR_TAG = "kazoku-control-bar";
```

### CONTROL_EVENT

*constant*

```ts
const CONTROL_EVENT = "kazoku-control";
```

### ControlBarElement

*class*. Give it the family clock in the `clock` property (a `BarClock`: a moment, a speed, play and pause). It drives that clock and shows it; with no clock it still tells the page what was pressed.

```ts
class ControlBarElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The clock this bar drives. */
    get clock(): BarClock | undefined;
    set clock(next: BarClock | undefined);
    /** Whether the date and time picker is open. */
    get pickerOpen(): boolean;
    /** The look now chosen. */
    get look(): Look;
    set look(next: Look);
    protected styles(): string;
    protected build(): void;
    protected listen(): (() => void)[];
    protected paint(): void;
}
```

### filledButtonCount

*function*. How many filled buttons are showing in `scope` (the page, or the nearest `[data-screen]` around a button), in the light DOM. The design allows one a screen.

```ts
function filledButtonCount(scope: ParentNode): number;
```

### ICON_BUTTON_TAG

*constant*

```ts
const ICON_BUTTON_TAG = "kazoku-icon-button";
```

### IconButtonElement

*class*. An icon you press. It is a real `<button>` with an accessible name, 44 by 44 px.

```ts
class IconButtonElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    constructor();
    /** The real button inside, for a test or a page that wants to focus it. */
    get button(): HTMLButtonElement;
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### InterfacePart

*class*

```ts
abstract class InterfacePart extends HTMLElement {
    #private;
    protected readonly root: ShadowRoot;
    protected ready: boolean;
    protected words: InterfaceWords;
    protected language: Language;
    constructor();
    /** The CSS of the part. */
    protected abstract styles(): string;
    /** Builds the tree, once, when the part first connects. */
    protected abstract build(): void;
    /** Brings the tree in line with the attributes, the properties, the language and the words; called again on every change. */
    protected abstract paint(): void;
    /** Called after the first paint, for listeners a part needs while it is connected; returns what stops them. */
    protected listen(): (() => void)[];
    /** Your own words over the language's, for example `{ close: "Dismiss" }`. */
    set labels(own: Partial<InterfaceWords>);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /** Reads the language and the words again, then paints. */
    protected refresh(): void;
    /** Says something happened: a bubbling, composed `CustomEvent` with the part's own name. */
    protected emit<T>(name: string, detail: T): boolean;
}
```

### LAYER_EVENT

*constant*

```ts
const LAYER_EVENT = "kazoku-layerchange";
```

### LAYERS_PANEL_TAG

*constant*

```ts
const LAYERS_PANEL_TAG = "kazoku-layers-panel";
```

### LayersPanelElement

*class*. Give it `layers` (each `{ id, label, checked }`) and, when the data door has outside sources, `sources` (from `sourcesFromCredits`). Each is a real `<input type="checkbox">` with a `<label>`.

```ts
class LayersPanelElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The view's own layers. */
    get layers(): readonly LayerItem[];
    set layers(next: readonly LayerItem[]);
    /** The outside data sources, and whether each is on. */
    get sources(): readonly LayerSource[];
    set sources(next: readonly LayerSource[]);
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### OBJECT_CARD_TAG

*constant*

```ts
const OBJECT_CARD_TAG = "kazoku-object-card";
```

### ObjectCardElement

*class*. Give it its data in the `data` property (an `ObjectCardData`: the kind, the name in English and Japanese, the numbers each with a source link, and the two buttons). Setting `data` shows the card.

```ts
class ObjectCardElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** What the card shows. */
    get data(): ObjectCardData | undefined;
    set data(next: ObjectCardData | undefined);
    /** Redraws the numbers that are computed for the time shown: call it after the clock moves, with the same `data` object changed in place. */
    refreshValues(): void;
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### READING_PAGE_TAG

*constant*

```ts
const READING_PAGE_TAG = "kazoku-reading-page";
```

### ReadingPageElement

*class*. Give it its data in the `data` property (a `ReadingPageData`) and put the page footer in the `footer` slot. `readingProblems(data)` says what is wrong with a page before it is shown.

```ts
class ReadingPageElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** What the page shows. */
    get data(): ReadingPageData | undefined;
    set data(next: ReadingPageData | undefined);
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### SCALE_EVENT

*constant*

```ts
const SCALE_EVENT = "kazoku-scalechange";
```

### SCALE_SWITCH_TAG

*constant*

```ts
const SCALE_SWITCH_TAG = "kazoku-scale-switch";
```

### ScaleSwitchElement

*class*. Attributes: `value` (the step now: surface, moons, solar, stars or galaxy), `steps` (the ones this view offers, for example `solar stars galaxy`; all five when it is left off; they always keep the

```ts
class ScaleSwitchElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The step now. Setting it to one this view does not offer is ignored. */
    get value(): ScaleStep;
    set value(next: ScaleStep);
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### SEGMENT_EVENT

*constant*

```ts
const SEGMENT_EVENT = "kazoku-segmentchange";
```

### SEGMENTED_SWITCH_TAG

*constant*

```ts
const SEGMENTED_SWITCH_TAG = "kazoku-segmented-switch";
```

### SegmentedSwitchElement

*class*. Attributes: `kind` (`language`: EN and `日本語`, which also writes the choice as `lang` on the page's <html> unless `no-apply` is there; `culture`: Western, Japanese, Chinese; or leave it off and give

```ts
class SegmentedSwitchElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The value chosen now; for the language switch, it follows the page's own `lang`. */
    get value(): string;
    set value(next: string);
    /** The segments, when the page gives them as objects over the `options` attribute. */
    get options(): readonly Segment[];
    set options(list: readonly Segment[]);
    protected styles(): string;
    protected build(): void;
    protected paint(): void;
}
```

### TAG

*constant*

```ts
const CONTROL_BAR_TAG = "kazoku-control-bar";
```

### TOP_BAR_EVENT

*constant*

```ts
const TOP_BAR_EVENT = "kazoku-topbar";
```

### TOP_BAR_TAG

*constant*

```ts
const TOP_BAR_TAG = "kazoku-top-bar";
```

### TopBarElement

*class*. Attributes: `brand` (the name at the left), `home` (where the brand links; `/` by default), `culture` (the sky culture now, `western`, `japanese` or `chinese`; its presence shows the culture switch, which a sky view has),

```ts
class TopBarElement extends InterfacePart {
    #private;
    static observedAttributes: string[];
    /** The site's sections as links in the bar (a reading page's Now, Universe, Atlas), the current one marked; a sky view uses the trail instead. */
    get sections(): readonly SectionLink[];
    set sections(next: readonly SectionLink[]);
    /** Where you are. */
    get trail(): readonly TrailItem[];
    set trail(next: readonly TrailItem[]);
    protected styles(): string;
    protected build(): void;
    protected listen(): (() => void)[];
    protected paint(): void;
}
```

### ControlDetail

*interface*. What `kazoku-control` carries in `detail`: which control was pressed, and what it now stands for.

```ts
interface ControlDetail {
    action: ControlName;
    /** For `look` the look now chosen; for `layers`, `place` and `flight` whether they are on; for `play` whether the clock is running; for `slower` and `faster` the speed; for `clock` the moment set. */
    value: string | number | boolean | undefined;
}
```

### LayerChangeDetail

*interface*. What `kazoku-layerchange` carries in `detail`.

```ts
interface LayerChangeDetail {
    /** `layer` for one of the view's own layers, `source` for an outside data source. */
    kind: "layer" | "source";
    id: string;
    checked: boolean;
}
```

### ScaleChangeDetail

*interface*. What `kazoku-scalechange` carries in `detail`.

```ts
interface ScaleChangeDetail {
    value: ScaleStep;
    previous: ScaleStep | undefined;
    /** `user` (a press) or `set` (the `value` property or attribute). */
    reason: "user" | "set";
}
```

### SegmentChangeDetail

*interface*. What `kazoku-segmentchange` carries in `detail`.

```ts
interface SegmentChangeDetail {
    /** The value now chosen. */
    value: string;
    /** The one before; `undefined` the first time. */
    previous: string | undefined;
    /** `user` (a press) or `set` (the `value` property or attribute). */
    reason: "user" | "set";
}
```

### TopBarDetail

*interface*. What `kazoku-topbar` carries in `detail`.

```ts
interface TopBarDetail {
    /** `search` (the field was submitted; `value` is the text), `culture` (the sky culture changed; `value` is it), `language` (the language changed), or `menu` (the menu button; `value` is whether it is open). */
    action: "search" | "culture" | "language" | "menu";
    value: string | boolean;
}
```

## `@johnmorrisdotca/kazoku-ui/interface/define`

1 value and 0 types.

```js
import { defineInterface } from '@johnmorrisdotca/kazoku-ui/interface/define';
```

### defineInterface

*function*. Registers the nine tags on `registry`, each only if it is free; true if it registered at least one.

```ts
function defineInterface(registry?: CustomElementRegistry): boolean;
```

## `@johnmorrisdotca/kazoku-ui/clock`

7 values and 6 types.

```js
import { browserSource, CLOCK_KEYS, clockAddress, createClockSlot, createFamilyClock, prefersReducedMotion, readClockAddress } from '@johnmorrisdotca/kazoku-ui/clock';
```

### browserSource

*function*. The browser's clocks.

```ts
function browserSource(): ClockSource;
```

### CLOCK_KEYS

*constant*. The address keys for the moment, the speed and playing.

```ts
const CLOCK_KEYS: {
    readonly time: "time";
    readonly speed: "speed";
    readonly play: "play";
};
```

### clockAddress

*function*. The address keys that say where a clock is, for `applyParams` or an address writer: the moment as a date and time, the speed, and `on` or `off`.

```ts
function clockAddress(clock: Pick<FamilyClock, "time" | "speed" | "running">): Record<string, string>;
```

### createClockSlot

*function*. The holder of a view's clock. A view asks `slot.clock` at each draw, asks to be drawn again when `onChange` fires, and a page that wants one clock for many views calls `attach` on each.

```ts
function createClockSlot(options?: FamilyClockOptions): ClockSlot;
```

### createFamilyClock

*function*. The family's clock. It advances by the time that really passed between two looks, never by a frame's step: at 86,400 times real time it moves a day for every real second on any machine,

```ts
function createFamilyClock(options?: FamilyClockOptions): FamilyClock;
```

### prefersReducedMotion

*function*. Whether the reader asked their system for reduced motion. False where there is no `matchMedia` (a server, a test).

```ts
function prefersReducedMotion(): boolean;
```

### readClockAddress

*function*. What an address says about the clock, as the options `createFamilyClock` takes. `time` is `now`, a number of milliseconds since 1970, or a date and time (`2026-11-10T12:00:00Z`);

```ts
function readClockAddress(search: string | URLSearchParams): FamilyClockOptions;
```

### ClockChange

*interface*. What a listener is told.

```ts
interface ClockChange {
    /** The moment, in milliseconds since 1970. */
    time: number;
    speed: number;
    running: boolean;
    reason: ClockReason;
}
```

### ClockReason

*type*. Why a clock told its listeners.

```ts
type ClockReason = "tick" | "set" | "speed" | "play" | "pause";
```

### ClockSlot

*interface*. What `createClockSlot` returns.

```ts
interface ClockSlot {
    /** The clock to read the moment from: the outside clock while one is attached, else the view's own. */
    readonly clock: FamilyClock;
    /** True while an outside clock is attached. */
    readonly attached: boolean;
    /** Follow an outside clock. The view's own clock is let go; its listeners now hear the outside one. */
    attach(outside: FamilyClock): void;
    /** Let go of the outside clock and make an own clock that starts from the moment, the speed and the pause the outside one had. Returns it. Nothing happens when none is attached. */
    detach(): FamilyClock;
    /** Hear changes of whichever clock is in use, one subscription for the life of the slot. Returns the way to stop. */
    onChange(listener: (change: ClockChange) => void): () => void;
    /** Stop hearing the clock in use. */
    dispose(): void;
}
```

### ClockSource

*interface*. A clock's sources of time: the page's monotonic clock (`performance.now()`) and the wall clock (`Date.now()`), both in milliseconds.

```ts
interface ClockSource {
    /** The page's monotonic clock, from which the time that has passed is taken. */
    now(): number;
    /** The wall clock, for a clock that follows the real time (`"now"` at speed 1). */
    wall(): number;
    /** True while the tab is hidden: a hidden tab sends no `"tick"`. Left out, the document's `visibilityState` is read when there is one. */
    hidden?(): boolean;
}
```

### FamilyClock

*interface*. The clock `createFamilyClock` returns.

```ts
interface FamilyClock {
    /** The moment as of the last look, in milliseconds since 1970 (UTC, as JavaScript counts). */
    readonly time: number;
    /** Game seconds for each real second: 1 is real time, negative runs backwards. Kept while paused. */
    readonly speed: number;
    /** True while the moment moves: not paused, and the speed is not 0. */
    readonly running: boolean;
    /** True once the reader (or a link) has chosen the speed: from then on `openAt` leaves it alone. */
    readonly touched: boolean;
    /** Bring the moment up to the page's clock at `now` and return it: the time that really passed since the last look, at the speed it ran at, however few frames were drawn. A paused clock keeps its moment. */
    advance(now?: number): number;
    /** Set the moment: milliseconds since 1970, or `"now"` to follow the wall clock. Starts the count again from there. */
    set(time: number | "now", now?: number): void;
    /** The reader chooses the speed. The time up to this moment is worked out at the old speed first. From now on `openAt` leaves the speed alone. */
    setSpeed(speed: number, now?: number): void;
    /** Run from the moment held. A speed of 0 comes back to the speed the clock opened at (1 if it had none). */
    play(now?: number): void;
    /** Hold the moment; the speed is kept. */
    pause(now?: number): void;
    /**
     * The speed a body first shows its motion at: the speed that the body in focus asks for. It is taken only while the reader has not touched the speed, so moving the focus from the Earth to Mars
     * changes the pace of a clock nobody has set, and never of one somebody has. Returns whether it was taken. It does not start or stop the clock.
     */
    openAt(speed: number, now?: number): boolean;
    /** Hear every change: a tick at most 4 a second (none while paused or in a hidden tab), and each `set`, speed change, play and pause at once. Returns the way to stop. */
    onChange(listener: (change: ClockChange) => void): () => void;
}
```

### FamilyClockOptions

*interface*. What `createFamilyClock` starts from. Every part is optional: with none, the clock starts at the real time, running, at speed 1.

```ts
interface FamilyClockOptions {
    /** The moment to start from, in milliseconds since 1970, or `"now"` (the default) to follow the wall clock. A link that names a time is obeyed. */
    start?: number | "now";
    /** The speed the reader or a link chose. Left out, the clock opens at `openingSpeed` and the speed is still the reader's to choose. */
    speed?: number;
    /** The speed the body in focus opens at, in game seconds for each real second (1). */
    openingSpeed?: number;
    /** Start paused (a link that names a pause). Left out, the clock runs, unless `reducedMotion` says to wait. */
    paused?: boolean;
    /** The reader asked for reduced motion: open paused with Play ready (the speed is the opening speed, kept for Play). Left out, the browser's `prefers-reduced-motion` is read. A link's `paused` wins. */
    reducedMotion?: boolean;
    /** The page's clocks; the browser's by default (a test passes its own, such as one that gives five frames a second). */
    source?: ClockSource;
    /** Most often a `"tick"` is sent, in milliseconds (250, which is 4 a second). */
    tickMs?: number;
}
```

## `@johnmorrisdotca/kazoku-ui/body-label`

8 values and 11 types.

```js
import { BODY_LABEL_FONT, BODY_LABEL_FONT_BYTES, BODY_LABEL_HEIGHTS, BODY_LABEL_MAX_LATITUDE, bodyLabelFacing, bodyLabelLayout, createBodyLabel, loadBodyLabelFont } from '@johnmorrisdotca/kazoku-ui/body-label';
```

### BODY_LABEL_FONT

*constant*. The family's default font for a name on a globe, Michroma (SIL Open Font License 1.1), loaded by `loadBodyLabelFont`.

```ts
const BODY_LABEL_FONT = "Michroma";
```

### BODY_LABEL_FONT_BYTES

*constant*. The font file's size in bytes, for a page that weighs what it loads.

```ts
const BODY_LABEL_FONT_BYTES = 64344;
```

### BODY_LABEL_HEIGHTS

*constant*. The letters' height in degrees of latitude for each size.

```ts
const BODY_LABEL_HEIGHTS: Readonly<Record<BodyLabelSize, number>>;
```

### BODY_LABEL_MAX_LATITUDE

*constant*. The farthest from the equator a name is written, in degrees: beyond it the letters would be stretched too far along a short circle.

```ts
const BODY_LABEL_MAX_LATITUDE = 70;
```

### bodyLabelFacing

*function*. For a name that keeps facing the reader: the turn about the body's axis, in radians, that brings the name's middle (`longitude`) round to the camera, given the camera's

```ts
function bodyLabelFacing(x: number, z: number, longitude?: number): number;
```

### bodyLabelLayout

*function*. Lay the name out on the globe. A name too long for its share of the circle is made smaller until it fits, so two copies never meet.

```ts
function bodyLabelLayout(input: BodyLabelLayoutInput): BodyLabelLayout;
```

### createBodyLabel

*function*. Write a body's name on its globe. The label is a child of the globe, so it turns with it; with `facing` it turns back to the reader in `update`.

```ts
function createBodyLabel(three: BodyLabelThree, options: BodyLabelOptions): BodyLabel;
```

### loadBodyLabelFont

*function*. Load Michroma into the page (once; again does nothing) and resolve its family name, for `createBodyLabel`'s `font`. Give `url` to load it from your own copy.

```ts
function loadBodyLabelFont(url?: string | URL): Promise<string>;
```

### BodyLabel

*interface*. The label `createBodyLabel` returns.

```ts
interface BodyLabel {
    /** The mesh: add it to the body's turning globe (`globe.add(label.object)`). */
    readonly object: BodyLabelObject;
    /** Resolves once the name is drawn in its own font (at once when the font is already loaded). Draw the view again then. */
    readonly ready: Promise<void>;
    /** The layout now: the band and each copy's place. */
    readonly layout: BodyLabelLayout;
    /** The settings now. */
    readonly options: Readonly<Required<BodyLabelOptions>>;
    /**
     * Call it before a draw, with the camera and the body's radius on screen in CSS pixels (left out: always shown). It hides the label below `minRadiusPx` and, with
     * `facing`, turns it to the camera. Returns true when something changed, so the host knows the view needs drawing. It allocates nothing and redraws no texture.
     */
    update(camera: BodyLabelCamera, radiusPx?: number): boolean;
    /** Change settings. The texture is drawn again only when the text, font, look, size, repeat, latitude or longitude changed; strength alone does not. */
    set(options: Partial<BodyLabelOptions>): void;
    /** Free the texture, the material and the geometry. Take the object out of the scene first. */
    dispose(): void;
}
```

### BodyLabelCamera

*interface*. A camera, as `update` reads it.

```ts
interface BodyLabelCamera {
    getWorldPosition(target: never): unknown;
}
```

### BodyLabelLayout

*interface*. The band and the copies in it.

```ts
interface BodyLabelLayout {
    /** The band's middle, degrees. */
    latitude: number;
    /** The letters' height, degrees of latitude (an em: the font size). */
    height: number;
    /** How much wider than on the equator a degree of text is drawn here, so the letters keep their shape on the shorter circle: 1 / cos(latitude). */
    stretch: number;
    spans: BodyLabelSpan[];
}
```

### BodyLabelLayoutInput

*interface*. What the layout needs: the text's width in ems (from the page's font), and the settings.

```ts
interface BodyLabelLayoutInput {
    /** The text's width over its font size, as the font draws it (`measureText(text).width / fontPx`). */
    widthEm: number;
    /** The middle of the band, degrees; 0 is the equator. Kept within ±70. */
    latitude?: number;
    /** Where the (first) name is centred, degrees east. */
    longitude?: number;
    repeat?: BodyLabelRepeat;
    size?: BodyLabelSize;
}
```

### BodyLabelLook

*type*. How the letters lie on the surface: pale paint (the default), a lightening etch, an outline, or burned in (darker).

```ts
type BodyLabelLook = "painted" | "etched" | "outline" | "burned";
```

### BodyLabelObject

*interface*. What of the label's three `Mesh` a host touches.

```ts
interface BodyLabelObject {
    visible: boolean;
    name: string;
    renderOrder: number;
    rotation: {
        y: number;
    };
    parent: {
        updateWorldMatrix(parents: boolean, children: boolean): void;
        worldToLocal(vector: never): unknown;
    } | null;
    geometry: unknown;
}
```

### BodyLabelOptions

*interface*. What a name on a globe looks like and where it sits. Every setting is optional but `text`.

```ts
interface BodyLabelOptions {
    /** The name as it is to be written (pass capitals for the family's look: `EARTH`, `地球`). */
    text: string;
    /** A CSS font family the page has loaded. Default Michroma. */
    font?: string;
    /** The family for the letters `font` has none of (Japanese: `"Noto Sans JP"`). Default none: the page's sans (`system-ui`). */
    fallbackFont?: string;
    look?: BodyLabelLook;
    /** How strongly it shows, 0 to 1. Default 0.5. */
    strength?: number;
    repeat?: BodyLabelRepeat;
    /** The band's latitude in degrees; 0, the equator, is the default. */
    latitude?: number;
    /** Where the (first) name is centred, degrees east in the body's own frame. */
    longitude?: number;
    size?: BodyLabelSize;
    /** True: the name keeps facing the reader while the body turns under it. */
    facing?: boolean;
    /** The globe's radius in its mesh's own units. Default 1. */
    radius?: number;
    /** No label while the body is drawn smaller than this many CSS pixels in radius. Default 24. */
    minRadiusPx?: number;
}
```

### BodyLabelRepeat

*type*. How many times the name is written: once, twice on opposite sides, or as many times as fit all round.

```ts
type BodyLabelRepeat = "once" | "both" | "around";
```

### BodyLabelSize

*type*. The letters' height: small, medium (the default) or large.

```ts
type BodyLabelSize = "small" | "medium" | "large";
```

### BodyLabelSpan

*interface*. One copy of the name on the globe.

```ts
interface BodyLabelSpan {
    /** Its middle, degrees east, within [0, 360). */
    centre: number;
    /** How far it runs along the band, degrees of longitude. */
    width: number;
}
```

### BodyLabelThree

*interface*. The few shapes of three.js the label uses. Any three of the right shape fits; nothing here imports it.

```ts
interface BodyLabelThree {
    CanvasTexture: new (canvas: never) => {
        colorSpace: string;
        anisotropy: number;
        needsUpdate: boolean;
        dispose(): void;
    };
    SphereGeometry: new (radius: number, widthSegments: number, heightSegments: number, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number) => {
        dispose(): void;
    };
    MeshLambertMaterial: new (parameters: Record<string, unknown>) => {
        opacity: number;
        blending: number;
        needsUpdate: boolean;
        dispose(): void;
    };
    Mesh: new (geometry: never, material: never) => BodyLabelObject;
    Vector3: new () => {
        x: number;
        y: number;
        z: number;
    };
    SRGBColorSpace: string;
    NormalBlending: number;
    AdditiveBlending: number;
}
```

## `@johnmorrisdotca/kazoku-ui/scene`

12 values and 18 types.

```js
import { AU_KM, composeScene, fitDistanceKm, lengthKm, lowPrecisionSun, orbitOffsetKm, placeInFrame, planSlices, SKY_FAR, SKY_NEAR, SKY_RADIUS, subKm } from '@johnmorrisdotca/kazoku-ui/scene';
```

### AU_KM

*constant*. The astronomical unit in kilometres.

```ts
const AU_KM = 149597870.7;
```

### composeScene

*function*. One scene, one camera and one clock from many packages' layers, on the shared renderer's one WebGL context (one context for the page, not one for each package).

```ts
function composeScene(three: SceneThree, options: ComposeOptions): ComposedScene;
```

### fitDistanceKm

*function*. How far from a body's centre a camera must be for the whole body to fill the view across, in kilometres (a little beyond, so it does not touch the edge).

```ts
function fitDistanceKm(radiusKm: number, fovDeg: number, margin?: number): number;
```

### lengthKm

*constant*. The length of an offset.

```ts
const lengthKm: (a: Vec3Km) => number;
```

### lowPrecisionSun

*function*. Where the Sun is, geocentric, in the SPX frame, in kilometres: the Astronomical Almanac's low-precision formula (about 0.01 degrees from 1950 to 2050). A host with wakusei-planets' `frameAt`

```ts
function lowPrecisionSun(ms: number): Vec3Km;
```

### orbitOffsetKm

*function*. Where the camera is, as an offset from what it looks at: `distanceKm` away, `yaw` degrees round the north axis (0 looks from +z), `tilt` degrees above the equator.

```ts
function orbitOffsetKm(distanceKm: number, yawDeg: number, tiltDeg: number): Vec3Km;
```

### placeInFrame

*function*. Put an object where a body is, relative to the frame's floating origin: `position = (place - focus) / unit`, `scale = sizeKm / unit`. The one line each layer writes, so none of them

```ts
function placeInFrame(object: Object3DLike, placeKm: Vec3Km, frame: Pick<SceneFrame, "focusKm" | "unitKm">, sizeKm?: number): Vec3Km;
```

### planSlices

*function*. Two depth slices, not a logarithmic depth buffer (which a custom shader does not follow without editing). The bodies are dealt into a near slice (those whose nearest surface is within `ratio`

```ts
function planSlices(bodies: readonly SliceBody[], options?: SliceOptions): DepthSlice[];
```

### SKY_FAR

*constant*

```ts
const SKY_FAR = 1000;
```

### SKY_NEAR

*constant*. The sky camera's near and far planes.

```ts
const SKY_NEAR = 1;
```

### SKY_RADIUS

*constant*. Where a layer's sky sits, in scene units from the origin (the host's sky camera sees 1 to 1000).

```ts
const SKY_RADIUS = 100;
```

### subKm

*constant*. `a - b`.

```ts
const subKm: (a: Vec3Km, b: Vec3Km) => Vec3Km;
```

### CameraLike

*interface*. What of a three `PerspectiveCamera` the host uses.

```ts
interface CameraLike {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    position: {
        set(x: number, y: number, z: number): unknown;
    };
    up: {
        set(x: number, y: number, z: number): unknown;
    };
    quaternion: {
        copy(other: unknown): unknown;
    };
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
}
```

### ComposedScene

*interface*. An item for the shared renderer, with the camera, the clock and the layers a page drives it with.

```ts
interface ComposedScene extends Item3D {
    readonly clock: FamilyClock;
    readonly layers: readonly SceneLayer[];
    /** Every layer's bodies. */
    readonly bodies: readonly SceneBody[];
    readonly camera: SceneCamera;
    /** The last frame every layer was told, if one was drawn. */
    readonly frame: SceneFrame | undefined;
    readonly stats: SceneStats;
    /** Draw again when the clock is set, played, paused or its speed changes, and when the camera moves. Give it the renderer's `View`. Returns the way to stop. */
    bind(view: {
        invalidate(): void;
    }): () => void;
    /** The layers' credits, each once. */
    credits(): readonly Credit[];
    /** Let go of every layer. The renderer lets go of the scenes it built; the layers are the page's to dispose, once, here. */
    dispose(): void;
}
```

### ComposeOptions

*interface*. What `composeScene` is made from.

```ts
interface ComposeOptions {
    /** The layers, in the order they are added: each package's `create…Layer`. */
    layers: readonly SceneLayer[];
    /** The one clock. Every layer reads its moment from here. */
    clock: FamilyClock;
    /** The body in focus at first (the first body of the first layer). */
    focus?: string;
    /** Where the camera starts (the distance that fits the focused body, yaw 0, tilt 15, a field of view of 40 degrees). */
    camera?: Partial<Omit<SceneCameraState, "focus">>;
    /** Where the Sun is at a moment, in the SPX frame, in kilometres: wakusei-planets' `frameAt` times the astronomical unit. `lowPrecisionSun` when left out. */
    sun?: (ms: number) => Vec3Km;
    /** Kilometres to a scene unit: a number, or a function of the focused body (its radius by default, so the focused body is about a unit across and the camera a few units away). */
    unitKm?: number | ((focus: SceneBody) => number);
    /** See `planSlices` (1000). */
    ratio?: number;
    /** See `planSlices` (0.00001 km). */
    minNearKm?: number;
    /** What the renderer shares a still by. */
    key?: string;
}
```

### Credit

*interface*. One credit for the page's credit line: what data or work the layer draws on.

```ts
interface Credit {
    /** The credit, in English. */
    text: string;
    /** The same in Japanese, when there is one. */
    textJa?: string;
    /** Where to read more. */
    href?: string;
}
```

### DepthSlice

*interface*. A range of the camera's depth that some bodies are drawn in, with the depth buffer cleared before it.

```ts
interface DepthSlice {
    ids: readonly string[];
    /** The near and far planes of this pass, in kilometres. */
    nearKm: number;
    farKm: number;
}
```

### Object3DLike

*interface*. What of a three `Object3D` the host touches.

```ts
interface Object3DLike {
    visible: boolean;
    parent: unknown;
    position: {
        set(x: number, y: number, z: number): unknown;
    };
    scale: {
        setScalar(scale: number): unknown;
    };
}
```

### SceneBody

*interface*. One body a layer draws: a star, a planet, a rocket.

```ts
interface SceneBody {
    /** A name that is the layer's own and unique on the page (`"earth"`, `"moon"`, `"mars"`). */
    readonly id: string;
    /** The body's own axes, +y its north pole, with everything of the body inside it (its lights too). The layer places and turns it in `update`; the host adds it to the scene and switches `visible` for each depth slice. */
    readonly root: Object3DLike;
    /** The body's bounding radius in kilometres, atmosphere included: the host slices depth with it and finds the nearest surface. */
    readonly radiusKm: number;
    /** The speed, in game seconds for each real second, at which this body's motion first shows. The clock opens at it while this body is in focus, until the reader sets a speed. */
    readonly openingSpeed: number;
    /** Where the body's centre is at the moment `ms` (milliseconds since 1970), in the SPX frame, in kilometres. Pure: the host asks it once a frame for the focus and the depth slices. */
    placeKm(ms: number): Vec3Km;
}
```

### SceneCamera

*interface*. The camera of a composed scene, kept outside any one built scene so it survives the renderer's rebuilds (a still, a view that lets go and comes back).

```ts
interface SceneCamera {
    /** A copy of where the camera is. */
    readonly state: Readonly<SceneCameraState>;
    /** Change any of it. The bound view is drawn again; nothing is drawn if nothing changed. */
    set(change: Partial<SceneCameraState>): void;
    /** Put another body in focus: the origin moves to it, the camera takes the distance that fits it unless `change` says another, and the clock opens at that body's opening speed if the reader has not set one. */
    focusOn(id: string, change?: Partial<Omit<SceneCameraState, "focus">>): void;
    /** Turn, tip and zoom from the view controls' state (`event.detail` of `kazoku-viewchange`). Zoom 1 fits the focused body in the view; the camera never goes inside it. */
    look(look: SceneLook): void;
    /** The distance at which the body fills the view (the focused body's by default), in kilometres. */
    fitKm(id?: string): number;
    /** Hear every change of the camera. Returns the way to stop. */
    onChange(listener: (state: Readonly<SceneCameraState>) => void): () => void;
}
```

### SceneCameraState

*interface*. Where the camera is: orbiting the centre of the focused body.

```ts
interface SceneCameraState {
    /** The id of the body in focus: the scene's origin is held on its centre. */
    focus: string;
    /** From the body's centre to the camera, in kilometres. */
    distanceKm: number;
    /** Degrees round the north axis. */
    yaw: number;
    /** Degrees above the equator. */
    tilt: number;
    /** The vertical field of view, in degrees. */
    fovDeg: number;
}
```

### SceneFrame

*interface*. What the host tells every layer each frame.

```ts
interface SceneFrame {
    /** The clock's moment, in milliseconds since 1970: the same number for every layer in one draw. */
    ms: number;
    /** The point the scene's origin is held on, in kilometres: the focused body's centre. Layers set `position = (place - focusKm) / unitKm`. */
    focusKm: Vec3Km;
    /** Kilometres to a scene unit this frame. A layer sets `scale` to a size in kilometres over this. */
    unitKm: number;
    /** Where the Sun is, in kilometres, for whoever needs light. */
    sunKm: Vec3Km;
    /** Where every body's centre is at `ms`, by id (the host asked each body's `placeKm` once). */
    positionsKm: ReadonlyMap<string, Vec3Km>;
    /** The camera. `heightPx` is the view's height in device pixels, for a marker a few pixels across. */
    camera: {
        positionKm: Vec3Km;
        fovDeg: number;
        heightPx: number;
    };
    pixelRatio: number;
}
```

### SceneLayer

*interface*. What a package gives a host: its bodies, an optional sky, and how to move them to a frame.

```ts
interface SceneLayer {
    readonly id: string;
    readonly bodies: readonly SceneBody[];
    /** Drawn at infinity, first, with no depth (the stars): points at `SKY_RADIUS` scene units from the origin. The host draws it with a camera at the origin that turns with the view and never moves. */
    readonly sky?: Object3DLike;
    /** Place and turn the bodies for this frame. Return true while something still moves on its own (a clock-driven layer returns false: the host redraws while the clock runs). */
    update(frame: SceneFrame): boolean;
    /** What the layer draws on, for the page's credit line. */
    credits(): readonly Credit[];
    dispose(): void;
}
```

### SceneLike

*interface*. What of a three `Scene` the host uses.

```ts
interface SceneLike {
    add(object: Object3DLike): unknown;
    remove(object: Object3DLike): unknown;
}
```

### SceneLook

*interface*. What the view controls (or a test) say about the look: `yaw`, `tilt` and `zoom` as `<kazoku-view-controls>` reports them.

```ts
interface SceneLook {
    /** Degrees the body is turned about its north axis, as the view controls count them: a drag to the right turns the near face to the right, so the camera goes round the other way. */
    yaw?: number;
    tilt?: number;
    /** 1 fits the focused body in the view; 2 is twice as close. */
    zoom?: number;
}
```

### SceneStats

*interface*. What the composed scene counted, for a test or a page's numbers.

```ts
interface SceneStats {
    /** Frames computed and told to the layers. */
    frames: number;
    /** Passes drawn: the sky, then each slice. */
    passes: number;
    /** The depth slices of the last frame, far first. */
    slices: readonly DepthSlice[];
}
```

### SceneThree

*interface*. What of the `three` module the host uses.

```ts
interface SceneThree {
    Scene: new () => SceneLike;
    PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => CameraLike;
}
```

### SliceBody

*interface*. One body as the depth planner sees it.

```ts
interface SliceBody {
    id: string;
    /** From the camera to the body's centre, in kilometres. */
    distanceKm: number;
    radiusKm: number;
}
```

### SliceOptions

*interface*. What `planSlices` is held to.

```ts
interface SliceOptions {
    /** A body belongs to the near slice when its nearest surface is within this many times the nearest surface of all (1000). */
    ratio?: number;
    /** The nearest a near plane may be, in kilometres (0.00001, a centimetre). */
    minNearKm?: number;
}
```

### Vec3Km

*type*. A place or an offset in the SPX frame, in kilometres, as float64 numbers (never float32 scene units): J2000 equatorial, x to the vernal equinox, y to the celestial north pole, z = minus the equatorial y.

```ts
type Vec3Km = readonly [number, number, number];
```

## `@johnmorrisdotca/kazoku-ui/print`

28 values and 23 types.

```js
import { buildSheet, cutMarks, DEFAULT_LAYOUT, DEFAULT_MARGIN_MM, fitToPage, isoDate, languageOf, LAYOUT_ATTRIBUTES, layoutFromSheet, layoutOf, MAX_BYTES, MIN_MARGIN_MM, openPrintView, PAGE_NAMES, pageOf, PAGES, pageSize, printableSize, printCss, printSheet, qrMatrix, qrSvg, ROOT_ATTRIBUTE, ROOT_CLASS, tilePoster, TYPE_PRESETS, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/print';
```

### buildSheet

*function*. The sheet: one `.kazoku-sheet` holding a `.kazoku-page` for each page (or each tile of a poster). It carries its layout in data attributes. Add `printCss(layout)` once to the page and the sheet looks the same on screen and on paper.

```ts
function buildSheet(options: SheetOptions, doc?: Document): HTMLElement;
```

### cutMarks

*function*. The cut marks of one page, in millimetres from the page's top left: at each corner of the printable window, one line along each edge pointing out into the margin, kept off the window by `gapMm`.

```ts
function cutMarks(page: PageName, orientation?: Orientation, marginMm?: number, lengthMm?: number, gapMm?: number): Segment[];
```

### DEFAULT_LAYOUT

*constant*

```ts
const DEFAULT_LAYOUT: Layout;
```

### DEFAULT_MARGIN_MM

*constant*. Half an inch. Home printers cannot print right to the edge (most stop 3 to 6 mm short), so nothing the sheet needs sits nearer than this.

```ts
const DEFAULT_MARGIN_MM = 12.7;
```

### fitToPage

*function*. Scales a picture to the printable area of a page, keeping its shape, and says which turn of the page suits it. Throws a RangeError for a picture of no size or margins that leave no area.

```ts
function fitToPage(options: FitOptions): Fit;
```

### isoDate

*constant*

```ts
const isoDate: (date: Date) => string;
```

### languageOf

*constant*. The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else.

```ts
const languageOf: (lang: string | null | undefined) => Language;
```

### LAYOUT_ATTRIBUTES

*constant*. The attributes that record the layout on a sheet, so `printSheet` can read it back.

```ts
const LAYOUT_ATTRIBUTES: {
    readonly page: "data-page";
    readonly orientation: "data-orientation";
    readonly marginMm: "data-margin-mm";
    readonly type: "data-type";
    readonly language: "data-language";
};
```

### layoutFromSheet

*function*. The layout a sheet was built with, read back from its data attributes.

```ts
function layoutFromSheet(sheet: Element): Layout;
```

### layoutOf

*function*. A layout from whatever was given: a name that is not a page, an orientation or a type that is not one, or a margin under the least falls back.

```ts
function layoutOf(given?: Partial<Layout>): Layout;
```

### MAX_BYTES

*constant*. The most bytes of text one code holds at level M.

```ts
const MAX_BYTES: number;
```

### MIN_MARGIN_MM

*constant*. The least margin allowed; a smaller one is raised to it, so a sheet never loses its edge on a home printer.

```ts
const MIN_MARGIN_MM = 8;
```

### openPrintView

*function*. Makes the print-only view of a sheet (a copy of it) and the page rules for its paper. Call `close` when done; a view already open is closed first.

```ts
function openPrintView(sheet: HTMLElement, doc?: Document): PrintView;
```

### PAGE_NAMES

*constant*

```ts
const PAGE_NAMES: PageName[];
```

### pageOf

*constant*. "Page 2 of 6" (or "2 / 6 `ページ`").

```ts
const pageOf: (words: PrintWords, n: number, total: number) => string;
```

### PAGES

*constant*. The sizes a sheet is printed on, in millimetres, in portrait.

```ts
const PAGES: Record<PageName, PageSize>;
```

### pageSize

*function*. The whole page, turned for the orientation.

```ts
function pageSize(page: PageName, orientation?: Orientation): PageSize;
```

### printableSize

*function*. What is left inside the margins.

```ts
function printableSize(page: PageName, orientation?: Orientation, marginMm?: number): PageSize;
```

### printCss

*function*. The CSS for a sheet: the page size, the print-only view (everything else on the page hidden on paper, the copy hidden on screen) and the look of the header, info box, footer and poster tiles.

```ts
function printCss(given?: Partial<Layout>): string;
```

### printSheet

*function*. Prints a sheet: opens the print-only view, calls `window.print()` (the dialog's "Save as PDF" makes the file), and removes the view when the dialog is done.

```ts
function printSheet(sheet: HTMLElement, options?: PrintOptions, doc?: Document): PrintView;
```

### qrMatrix

*function*. The modules of a QR code for some text (UTF-8, level M, the smallest version that holds it): `true` is dark. Throws a RangeError for more than `MAX_BYTES` bytes.

```ts
function qrMatrix(text: string, options?: QrOptions): boolean[][];
```

### qrSvg

*function*. A QR code as an SVG string: one path for every dark module, a light square behind it, `viewBox` in modules so any CSS size works.

```ts
function qrSvg(text: string, options?: QrSvgOptions): string;
```

### ROOT_ATTRIBUTE

*constant*

```ts
const ROOT_ATTRIBUTE = "data-kazoku-print";
```

### ROOT_CLASS

*constant*. The `.kazoku-print-root` class of the print-only copy, and the attribute on `<html>` while it is open.

```ts
const ROOT_CLASS = "kazoku-print-root";
```

### tilePoster

*function*. How many pages a poster needs and which part of it each page prints. Throws a RangeError for a poster of no size or an overlap as big as a page's window.

```ts
function tilePoster(options: PosterOptions): PosterPlan;
```

### TYPE_PRESETS

*constant*

```ts
const TYPE_PRESETS: Record<TypeName, TypePreset>;
```

### WORDS

*constant*

```ts
const WORDS: Record<Language, PrintWords>;
```

### wordsFor

*constant*

```ts
const wordsFor: (language: Language, overrides?: Partial<PrintWords>) => PrintWords;
```

### Fit

*interface*

```ts
interface Fit {
    orientation: Orientation;
    /** The picture's size once scaled: the largest that fits the printable area with its shape kept. */
    widthMm: number;
    heightMm: number;
    /** The scaled size over the given size. */
    scale: number;
    /** Where the scaled picture sits to be centred in the printable area, from the area's top left. */
    offsetXMm: number;
    offsetYMm: number;
}
```

### FitOptions

*interface*

```ts
interface FitOptions {
    page: PageName;
    /** The picture's size, in any one unit (only its shape and, for `scale`, its millimetre size matter). */
    widthMm: number;
    heightMm: number;
    /** `"auto"` (the default) takes the turn that makes the picture larger. */
    orientation?: Orientation | "auto";
    marginMm?: number;
}
```

### Language

*type*

```ts
type Language = "en" | "ja";
```

### Layout

*interface*

```ts
interface Layout {
    page: PageName;
    orientation: Orientation;
    marginMm: number;
    type: TypeName;
    language: Language;
}
```

### Orientation

*type*

```ts
type Orientation = "portrait" | "landscape";
```

### PageName

*type*

```ts
type PageName = "a4" | "letter" | "a3" | "tabloid";
```

### PageNumber

*type*. `"always"` (the default); `"many"`: only a sheet of more than one page; `"never"`.

```ts
type PageNumber = "always" | "many" | "never";
```

### PageSize

*interface*

```ts
interface PageSize {
    widthMm: number;
    heightMm: number;
}
```

### Poster

*interface*

```ts
interface Poster {
    /** What is printed: any node (an SVG is best; a canvas does not survive being copied). Copied once for each page. */
    content: Node;
    widthMm: number;
    heightMm: number;
    /** The repeat between pages, in millimetres (10 by default). */
    overlapMm?: number;
}
```

### PosterOptions

*interface*

```ts
interface PosterOptions {
    /** The poster's size, in millimetres. */
    widthMm: number;
    heightMm: number;
    page: PageName;
    orientation?: Orientation;
    marginMm?: number;
    /** How much of one page's picture is repeated on the next, so the pages can be glued over each other. 10 mm by default. */
    overlapMm?: number;
}
```

### PosterPlan

*interface*

```ts
interface PosterPlan {
    columns: number;
    rows: number;
    pages: number;
    /** The window on each page: the printable area, which shows this much of the poster. */
    windowMm: {
        widthMm: number;
        heightMm: number;
    };
    tiles: Tile[];
}
```

### PrintOptions

*interface*

```ts
interface PrintOptions {
    /** What to call instead of `window.print`, for tests. */
    print?: () => void;
}
```

### PrintView

*interface*

```ts
interface PrintView {
    /** The print-only copy, a child of `<body>`: hidden on screen, the only thing on paper. */
    root: HTMLElement;
    /** Removes the copy, the style and the mark on `<html>`. */
    close(): void;
}
```

### PrintWords

*interface*

```ts
interface PrintWords {
    /** The label before the underline a child writes a name on. */
    name: string;
    region: string;
    flag: string;
    latitudeBand: string;
    season: string;
    level: string;
    language: string;
    version: string;
    date: string;
    address: string;
    /** "Page {n} of {total}" with the numbers filled in by `pageOf`. */
    page: string;
    glue: string;
    cut: string;
    tileOf: string;
    button: string;
    qr: string;
}
```

### QrOptions

*interface*

```ts
interface QrOptions {
    /** Use this mask (0 to 7) instead of the best one; for tests. */
    mask?: number;
}
```

### QrSvgOptions

*interface*

```ts
interface QrSvgOptions {
    /** Light modules around the code, in modules (the standard asks for 4). */
    quiet?: number;
    dark?: string;
    light?: string;
}
```

### Segment

*interface*

```ts
interface Segment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
```

### SheetInfo

*interface*

```ts
interface SheetInfo {
    region?: string;
    /** The address of the flag's picture (a path or a data: address) and what it shows. */
    flagSrc?: string;
    flagAlt?: string;
    latitudeBand?: string;
    season?: string;
    level?: string;
    language?: string;
    /** More boxes after those, each a label and a value. */
    more?: {
        label: string;
        value: string;
    }[];
}
```

### SheetOptions

*interface*

```ts
interface SheetOptions extends Partial<Layout> {
    /** The header's first line, such as the family's name; passed in, never built in. */
    brand?: string;
    packageName?: string;
    title: string;
    /** The "Name: ____" label and underline in the header (on by default; the name is `nameBox` for history, it is a line, not a box). */
    nameBox?: boolean;
    /** The info box under the header of the first page. */
    info?: SheetInfo;
    credits?: string;
    version?: string;
    /** A Date is written as YYYY-MM-DD; a string is written as it is. */
    date?: Date | string;
    /** The address to print: as a QR code and as text. Too long for a QR code, it is printed as text only. */
    address?: string;
    /** What each page holds, one node for each page. */
    pages?: Node[];
    /** A poster to tile over pages instead. */
    poster?: Poster;
    /** On a poster, the address as text and a small QR code in the bottom margin of the tile pages: all of them, or the first and the last. Needs `address`. Off by default. */
    tileFooter?: TileFooter;
    /** Whether the page number is printed (on sheet pages and tile pages alike). `"many"` leaves it off a one-page sheet, such as a certificate. */
    pageNumber?: PageNumber;
    /** Words to use instead of the built-in ones, for one or more keys. */
    words?: Partial<PrintWords>;
}
```

### Tile

*interface*

```ts
interface Tile {
    /** 1 for the first page, row by row from the top left. */
    index: number;
    column: number;
    row: number;
    /** Where this page's window starts on the poster, in millimetres from its top left. */
    xMm: number;
    yMm: number;
    /** How much of this page's picture is repeated on the page to its right, and the page below (0 for the last column and row): the glue strips. */
    overlapRightMm: number;
    overlapBottomMm: number;
}
```

### TileFooter

*type*. `"all"`: every tile page carries the address and its QR code in the bottom margin; `"ends"`: the first and the last only; `"none"` (the default): neither.

```ts
type TileFooter = "none" | "ends" | "all";
```

### TypeName

*type*

```ts
type TypeName = "kid" | "normal";
```

### TypePreset

*interface*

```ts
interface TypePreset {
    /** The sheet's title. */
    titlePt: number;
    /** The names a sheet prints (a planet, a country), in `.kazoku-name`. Never under 24 pt for `kid`. */
    namePt: number;
    bodyPt: number;
    /** Credits, version, address: the fine print. */
    smallPt: number;
    /** How thick the sheet's own lines are (the header's rule, the info box, the Name underline). `kid` is 1.2 mm: clearly drawn for a child's eye, and light enough that the page is not dominated by black; `normal` is 0.4 mm. */
    lineMm: number;
    fontFamily: string;
}
```

## `@johnmorrisdotca/kazoku-ui/renderer`

12 values and 25 types.

```js
import { browserClock, createAssetCache, createScheduler, createSharedRenderer, createStillCache, disposeDeep, MAX_FPS, MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor, STILL_BYTES } from '@johnmorrisdotca/kazoku-ui/renderer';
```

### browserClock

*constant*

```ts
const browserClock: () => FrameClock;
```

### createAssetCache

*function*

```ts
function createAssetCache(options?: AssetCacheOptions): AssetCache;
```

### createScheduler

*function*

```ts
function createScheduler(options?: SchedulerOptions): Scheduler;
```

### createSharedRenderer

*function*

```ts
function createSharedRenderer<T extends ThreeLike = ThreeLike>(options: SharedRendererOptions<T>): SharedRenderer<T>;
```

### createStillCache

*function*

```ts
function createStillCache(options?: StillCacheOptions): StillCache;
```

### disposeDeep

*function*. Free what a loaded model holds (its geometries, materials and the textures of those), for a `dispose` that frees a whole scene. Duck-typed, so it needs no three.js import.

```ts
function disposeDeep(root: unknown): void;
```

### MAX_FPS

*constant*. Most draws of one job in a second (30): the family's rule for live 3D. A 60 Hz screen draws every second frame, a 120 Hz screen every fourth.

```ts
const MAX_FPS = 30;
```

### MAX_PIXELS

*constant*. Most pixels a canvas may hold.

```ts
const MAX_PIXELS = 6000000;
```

### MAX_RATIO

*constant*. Most device pixels to a CSS pixel; a ratio of 3 or 4 adds detail nobody sees on a moving 3D view.

```ts
const MAX_RATIO = 2;
```

### MAX_SIDE

*constant*. Most pixels along one side (a common GPU texture limit).

```ts
const MAX_SIDE = 4096;
```

### pixelRatioFor

*function*. The pixel ratio to draw a `width` by `height` CSS pixel canvas at: the device's, held to `maxRatio`, then lowered until the canvas fits `maxPixels` and

```ts
function pixelRatioFor(width: number, height: number, deviceRatio: number, limits?: PixelLimits): number;
```

### STILL_BYTES

*constant*

```ts
const STILL_BYTES: number;
```

### AssetCache

*interface*

```ts
interface AssetCache {
    /** The asset for `key`, made by `make` the first time. Every `acquire` needs a `release` of the same key (a scope does that for you). `dispose` is kept from the first ask. */
    acquire<T>(key: string, make: () => T, dispose?: (value: T) => void): T;
    release(key: string): void;
    scope(): AssetScope;
    /** Dispose every asset now, used or not (the page is done with the renderer). */
    clear(): void;
    stats(): AssetCacheStats;
}
```

### AssetCacheOptions

*interface*

```ts
interface AssetCacheOptions {
    /** Milliseconds an asset with no users is kept before it is disposed (1000). 0 disposes at once. */
    lingerMs?: number;
    timers?: Timers;
}
```

### AssetCacheStats

*interface*

```ts
interface AssetCacheStats {
    /** Assets held, with or without users. */
    entries: number;
    /** Users of assets, in all. */
    refs: number;
    /** Asks answered from the cache. */
    hits: number;
    /** Asks that made the asset. */
    misses: number;
    /** Assets disposed. */
    disposed: number;
}
```

### AssetScope

*interface*. What one view takes: it asks for assets through its scope and lets all of them go with one `release()`.

```ts
interface AssetScope {
    acquire<T>(key: string, make: () => T, dispose?: (value: T) => void): T;
    release(): void;
}
```

### BuildContext

*interface*

```ts
interface BuildContext<T extends ThreeLike = ThreeLike> {
    three: T;
    /** Take every geometry, material, texture and model through here: they are shared by key and released when the view lets go. */
    assets: AssetScope;
    width: number;
    height: number;
}
```

### FrameClock

*interface*

```ts
interface FrameClock {
    request(callback: (now: number) => void): number;
    cancel(id: number): void;
    now(): number;
}
```

### GLRenderer

*interface*. What of three's `WebGLRenderer` the renderer uses.

```ts
interface GLRenderer {
    readonly domElement: HTMLCanvasElement;
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: unknown, camera: unknown): void;
    /** Whether `render` clears the canvas first (three's `autoClear`, true). A scene that draws its own passes (`Scene3D.render`) turns it off after the first and puts it back. */
    autoClear?: boolean;
    /** Clear the depth buffer only, so a later pass draws over an earlier one whatever its depth. */
    clearDepth?(): void;
    dispose(): void;
    forceContextLoss(): void;
}
```

### Item3D

*interface*. The package's adapter for one kind of thing: the scene for it and its framing.

```ts
interface Item3D<T extends ThreeLike = ThreeLike> {
    /** What the item looks like, for its still and for the cache: items with the same key share one picture. */
    key: string;
    build(context: BuildContext<T>): Scene3D | Promise<Scene3D>;
}
```

### Job

*interface*

```ts
interface Job {
    /** Draw once. `dt` is seconds since this job's last draw while it kept animating, else 0. A job is drawn at most `MAX_FPS` times a second: one asked for sooner waits for the frame that is a gap after its last draw. Return true to be drawn again next frame (an animation); anything else leaves it at rest. */
    draw(now: number, dt: number): boolean | void;
}
```

### PixelLimits

*interface*

```ts
interface PixelLimits {
    maxPixels?: number;
    maxSide?: number;
    maxRatio?: number;
}
```

### Priority

*type*

```ts
type Priority = "focus" | "ambient";
```

### RendererStats

*interface*

```ts
interface RendererStats {
    /** WebGL contexts made over the page's life: 1, unless the page let it go while hidden. */
    contexts: number;
    /** Draws of live views. */
    draws: number;
    /** Stills made. */
    snapshots: number;
    live: boolean;
    lost: boolean;
    /** The canvas's size in device pixels now. */
    canvas: {
        width: number;
        height: number;
        pixels: number;
    };
    frames: Scheduler["stats"];
    assets: ReturnType<AssetCache["stats"]>;
    stills: {
        count: number;
        bytes: number;
    };
}
```

### Scene3D

*interface*. A scene ready to draw, made by an item's `build`. Everything but `scene` and `camera` is optional.

```ts
interface Scene3D {
    scene: unknown;
    camera: unknown;
    /**
     * Draw the view yourself, in as many passes as it takes (a sky, then far bodies, then near ones with the depth cleared between). Left out, the renderer draws `scene` with `camera` in one pass.
     * It is called for each draw of the live view and for the view's still, after `update`; use `gl.autoClear` and `gl.clearDepth()` between passes and put `autoClear` back.
     */
    render?(gl: GLRenderer): void;
    /** Called before each draw while the view is live. Return true while something is moving; the view is then drawn again next frame, else it rests. */
    update?(dt: number, now: number): boolean | void;
    /** The view's size in CSS pixels changed (set the camera's aspect). */
    resize?(width: number, height: number): void;
    /** Free what only this scene owns. Shared assets are freed by the cache. */
    dispose?(): void;
}
```

### Scheduler

*interface*

```ts
interface Scheduler {
    /** Ask for a draw. Asking again before it happens changes nothing. */
    invalidate(job: Job, priority?: Priority): void;
    /** Forget a job (a view that is gone). */
    remove(job: Job): void;
    /** Stop asking for frames (nothing can see the views). Counts, so pauses nest. Drawing resumes when the last is undone. */
    pause(): void;
    resume(): void;
    readonly paused: boolean;
    /** True while a frame is requested and has not run yet. */
    readonly pending: boolean;
    readonly stats: SchedulerStats;
}
```

### SchedulerOptions

*interface*

```ts
interface SchedulerOptions {
    clock?: FrameClock;
    /** Most jobs drawn in one frame (2). */
    maxDraws?: number;
    /** Milliseconds after which no further job is started in a frame (10). A job already started is finished. */
    budgetMs?: number;
}
```

### SchedulerStats

*interface*

```ts
interface SchedulerStats {
    /** Animation frames asked for. */
    requests: number;
    /** Frames that ran. */
    frames: number;
    /** Jobs drawn. */
    draws: number;
    /** Jobs left for the next frame because the budget was spent. */
    deferred: number;
}
```

### SharedRenderer

*interface*

```ts
interface SharedRenderer<T extends ThreeLike = ThreeLike> {
    view(host: HTMLElement, item: Item3D<T>, options?: ViewOptions): View;
    /** The view that is live, if any. */
    readonly focused: View | undefined;
    readonly stats: RendererStats;
    readonly assets: AssetCache;
    readonly stills: StillCache;
    readonly scheduler: Scheduler;
    /** Let go of everything: views, the context, the assets and the stills. */
    dispose(): void;
}
```

### SharedRendererOptions

*interface*

```ts
interface SharedRendererOptions<T extends ThreeLike = ThreeLike> {
    /** `() => import("three")`: where three is loaded from, once, when a view first goes live or a still is first made. */
    load: () => Promise<T>;
    maxPixels?: number;
    maxSide?: number;
    maxRatio?: number;
    /** Longest side of a still, in pixels (320). */
    stillSize?: number;
    /** Decoded bytes the stills may hold (32 MB). */
    stillBytes?: number;
    /** Milliseconds an unused shared asset is kept (1000). */
    lingerMs?: number;
    /** Milliseconds out of sight, in a hidden tab, after which the context is let go and the views show stills (30000). It comes back when the view does. */
    releaseMs?: number;
    antialias?: boolean;
    /** Called when the context is lost or restored, or WebGL is not available. */
    onContext?: (state: "lost" | "restored" | "unavailable") => void;
    clock?: FrameClock;
    document?: Document;
    /** Your own cache or scheduler, for a test or to share them. */
    assets?: AssetCache;
    scheduler?: Scheduler;
}
```

### Still

*interface*

```ts
interface Still {
    /** An object URL (or any image URL) for an `<img>`. */
    url: string;
    width: number;
    height: number;
    /** What it costs in memory once decoded: width x height x 4. */
    bytes: number;
}
```

### StillCache

*interface*

```ts
interface StillCache {
    /** The picture for `key`, marked as just used. */
    get(key: string): Still | undefined;
    set(key: string, still: Still): void;
    delete(key: string): void;
    clear(): void;
    readonly bytes: number;
    readonly size: number;
    keys(): string[];
}
```

### StillCacheOptions

*interface*

```ts
interface StillCacheOptions {
    /** The most decoded bytes the list may hold (32 MB). The picture just set is always kept. */
    maxBytes?: number;
    /** Called with a picture that leaves the list, to revoke its URL (`URL.revokeObjectURL` by default). */
    free?: (still: Still) => void;
    onEvict?: (key: string, still: Still) => void;
}
```

### ThreeLike

*interface*. What of the `three` module the renderer uses; the whole module is handed to `build`, so an adapter can use all of it.

```ts
interface ThreeLike {
    WebGLRenderer: new (...args: never[]) => GLRenderer;
}
```

### Timers

*interface*

```ts
interface Timers {
    set(callback: () => void, ms: number): unknown;
    clear(handle: unknown): void;
}
```

### View

*interface*

```ts
interface View {
    readonly host: HTMLElement;
    readonly item: Item3D;
    /** True while this view has the renderer's canvas and a scene. */
    readonly live: boolean;
    /** The scene while live. */
    readonly scene: Scene3D | undefined;
    /** Take the renderer. The view that had it goes back to its still. Resolves true when this view is live, false if another took it meanwhile or WebGL is not available. */
    focus(): Promise<boolean>;
    /** Give the renderer back (the view shows its still). */
    blur(): void;
    /** Draw this view at the next frame. Call it when the camera or the scene changed; nothing is drawn without it. */
    invalidate(): void;
    /** Make the view's still if there is none (one at a time, from the same renderer) and show it. Call it when the view comes into sight. */
    showStill(): Promise<Still | undefined>;
    dispose(): void;
}
```

### ViewOptions

*interface*

```ts
interface ViewOptions {
    /** The `<img>` that shows the still. Left out, one is made inside the host. `null` shows no still. */
    still?: HTMLImageElement | null;
}
```

## `@johnmorrisdotca/kazoku-ui/testing`

21 values and 17 types.

```js
import { acquireBrowserLock, bestShift, browserLockStatus, browserQueueStatus, canvasSize, checkGestures, clearBrowserLock, COUNT_SCRIPT, drainGpu, drawCounts, GESTURE_NAMES, GESTURES, GPU_KINDS, gpuObjects, orderBrowserQueue, readCounts, setBrowserPriority, SOFTWARE_GL_ARGS, untilStill, withBrowserLock, withinPixelBudget } from '@johnmorrisdotca/kazoku-ui/testing';
```

### acquireBrowserLock

*function*. Take the browser lock, waiting while another run holds it. Only one headless browser should run at a time on a machine: with software GL, two at once make heavy

```ts
function acquireBrowserLock(options?: BrowserLockOptions): Promise<BrowserLock>;
```

### bestShift

*function*. The best shift of `after` against `before` (grey values, row by row, `w` by `h`): slide a window of `before` over `after` up to `reach` pixels each way. `zero` is how different they are with no shift.

```ts
function bestShift(before: ArrayLike<number>, after: ArrayLike<number>, w: number, h: number, reach: number, window?: [number, number, number, number]): {
    x: number;
    y: number;
    error: number;
    zero: number;
};
```

### browserLockStatus

*function*. Who holds the browser lock now, if anyone, and whether it is stale.

```ts
function browserLockStatus(options?: Pick<BrowserLockOptions, "maxAgeMs">): BrowserLockStatus;
```

### browserQueueStatus

*function*. The whole picture: who holds the lock and for how long, the waiters in the order they will be served, the priority if one is set, and a warning when a holder has had

```ts
function browserQueueStatus(options?: Pick<BrowserLockOptions, "maxAgeMs"> & {
    now?: number;
    alive?: (pid: number) => boolean;
}): BrowserQueueStatus;
```

### canvasSize

*function*. The biggest canvas on the page, in device pixels.

```ts
function canvasSize(page: PageLike): Promise<CanvasSize>;
```

### checkGestures

*function*. Run the family's gesture check on one view. Each gesture is done with a real mouse and keyboard (two fingers with pointer events) and must change the view as the family's rule says;

```ts
function checkGestures(page: GesturePage, view: string, options?: GestureOptions): Promise<GestureReport[]>;
```

### clearBrowserLock

*function*. Remove a stale browser lock by hand. A lock whose holder is still running stays unless `force` is true. Returns true when a lock file was removed.

```ts
function clearBrowserLock(options?: Pick<BrowserLockOptions, "maxAgeMs"> & {
    force?: boolean;
}): boolean;
```

### COUNT_SCRIPT

*constant*. Install the counters in a page, before its own scripts run. A string, so `page.addInitScript(COUNT_SCRIPT)` takes it as it is.

```ts
const COUNT_SCRIPT: string;
```

### drainGpu

*function*. Wait until the graphics processor has finished everything the page asked it to draw, and say how long that took (ms). Software drawing (SwiftShader) is far slower

```ts
function drainGpu(page: PageLike): Promise<number>;
```

### drawCounts

*function*. The draw count and the animation-frame request count now, as the pair to hand `untilStill`: nothing is drawn or asked for while both stay the same.

```ts
function drawCounts(page: PageLike): Promise<readonly [number, number]>;
```

### GESTURE_NAMES

*constant*. The names in the order the check runs them.

```ts
const GESTURE_NAMES: GestureName[];
```

### GESTURES

*constant*. Every gesture the check does, and what it asks of the view.

```ts
const GESTURES: {
    readonly turn: "a plain drag turns the view (yaw) at Fit and zoomed in, and does not roll or move it";
    readonly roll: "Shift and a drag rolls it";
    readonly "key-turn": "the arrow keys turn and tip it";
    readonly "key-zoom": "+ and - zoom in and out";
    readonly "wheel-zoom": "Ctrl, Command or Alt with the wheel zooms about the pointer (up is in, down is out)";
    readonly "pinch-zoom": "two fingers moving apart zoom in and moving together zoom out";
    readonly "wheel-pan": "the wheel, and Shift and the wheel, move a zoomed view";
    readonly "ctrl-drag-pan": "Ctrl or Command and a left drag moves a zoomed view, and the browser's menu stays out of it";
    readonly "space-drag-pan": "Space and a drag moves a zoomed view";
    readonly "middle-drag-pan": "the middle button and a drag moves a zoomed view";
    readonly "right-drag-pan": "the right button and a drag moves a zoomed view, and the browser's menu stays out of it";
    readonly "touch-pan": "two fingers dragging together move a zoomed view";
    readonly fit: "a double-click on a zoomed view, and Home, fit it";
};
```

### GPU_KINDS

*constant*. The GL object kinds counted.

```ts
const GPU_KINDS: readonly ["Buffer", "Texture", "VertexArray", "Program", "Framebuffer", "Renderbuffer"];
```

### gpuObjects

*function*. GPU objects alive: made minus deleted, over every kind. Flat across a run of changes means nothing leaks.

```ts
function gpuObjects(counts: GlCounts): number;
```

### orderBrowserQueue

*function*. The order a line is served in: oldest ticket first, and the first ticket whose folder is the `priority` folder (or inside it) moved to the front. Pure: it reads

```ts
function orderBrowserQueue(tickets: readonly BrowserQueueTicket[], priority?: string | null): BrowserQueueTicket[];
```

### readCounts

*function*. The counters now, as a copy.

```ts
function readCounts(page: PageLike): Promise<GlCounts>;
```

### setBrowserPriority

*function*. Put one waiting run first: the oldest waiter whose folder is `cwd` (or inside it) is served before the rest. It does not take the lock from the run that holds it,

```ts
function setBrowserPriority(cwd: string | null): void;
```

### SOFTWARE_GL_ARGS

*constant*. The launch arguments that make headless Chromium draw in software, never on the machine's graphics card: WebGL on ANGLE and SwiftShader, and the page's own

```ts
const SOFTWARE_GL_ARGS: readonly string[];
```

### untilStill

*function*. Wait until what `read` reports has stayed the same for `quietMs`: nothing is drawn or asked for any more. Holding a clock or stopping the controls' turn leaves one

```ts
function untilStill<P extends PageLike>(page: P, read: (page: P) => Promise<number | readonly number[]>, options?: UntilStillOptions): Promise<void>;
```

### withBrowserLock

*function*. Run `fn` under the browser lock and let go of it afterwards, whether `fn` returns or throws. For a script that launches Chromium itself.

```ts
function withBrowserLock<T>(fn: () => Promise<T> | T, options?: BrowserLockOptions): Promise<T>;
```

### withinPixelBudget

*function*. True when a canvas is within the budget (the renderer's own: 6 million pixels, 4096 a side).

```ts
function withinPixelBudget(size: CanvasSize, maxPixels?: number, maxSide?: number): boolean;
```

### BrowserLock

*interface*. A taken lock.

```ts
interface BrowserLock {
    /** Let go of the lock. Safe to call twice. */
    release(): void;
}
```

### BrowserLockHolder

*interface*. Who holds the browser lock.

```ts
interface BrowserLockHolder {
    /** Handed to child processes in `KAZOKU_BROWSER_LOCK`, so they may run under the lock without waiting for it. */
    token: string;
    pid: number;
    /** The package name from the holder's `package.json`, else the folder name. */
    repo: string;
    cwd: string;
    command: string;
    /** The npm script that started the run (`test:demo`), when there is one. A holder from an older kazoku-ui has none. */
    script?: string;
    /** ISO time the lock was taken. */
    startedAt: string;
}
```

### BrowserLockOptions

*interface*

```ts
interface BrowserLockOptions {
    /** How often to look again while waiting. 500 ms. */
    pollMs?: number;
    /** How often to say who is holding it and how far back in line the run is, while waiting. 60 000 ms. */
    reportMs?: number;
    /** A lock older than this is taken over even if its pid is alive. Three hours. */
    maxAgeMs?: number;
    /** Where the waiting line goes. Standard error. */
    log?: (line: string) => void;
}
```

### BrowserLockStatus

*interface*

```ts
interface BrowserLockStatus {
    /** The lock file's path. */
    file: string;
    /** Who holds it, or null when it is free. */
    holder: BrowserLockHolder | null;
    /** True when the holder's pid is gone or the lock is older than `maxAgeMs`: the next run takes it over. */
    stale: boolean;
}
```

### BrowserQueueEntry

*interface*. One waiter in the line, as the status shows it.

```ts
interface BrowserQueueEntry {
    /** 1 is next. */
    place: number;
    ticket: BrowserQueueTicket;
    /** Whole minutes since it joined. */
    waitedMinutes: number;
    /** True when the priority file put it first. */
    byPriority: boolean;
}
```

### BrowserQueueStatus

*interface*

```ts
interface BrowserQueueStatus extends BrowserLockStatus {
    /** Whole minutes the holder has had the lock, or null when it is free. */
    heldMinutes: number | null;
    /** The waiters, in the order they are served. Tickets of dead pids are left out. */
    queue: BrowserQueueEntry[];
    /** The folder the priority file names, or null. */
    priority: string | null;
    /** Lines to show a person: a holder over `LONG_HOLD_MINUTES`, a stale lock. */
    warnings: string[];
}
```

### BrowserQueueTicket

*interface*. A waiting run's place in the line: one small file in the queue folder, next to the lock.

```ts
interface BrowserQueueTicket {
    /** Tells this ticket from every other, and from the lock's own token. */
    token: string;
    pid: number;
    /** The package name from the waiter's `package.json`, else the folder name. */
    repo: string;
    cwd: string;
    command: string;
    /** The npm script that started the run (`test:demo`), when there is one. */
    script?: string;
    /** ISO time the run joined the line. The oldest live ticket goes next. */
    queuedAt: string;
}
```

### CanvasSize

*interface*

```ts
interface CanvasSize {
    /** The most pixels any canvas on the page holds, and the longest side of any. */
    pixels: number;
    side: number;
    count: number;
}
```

### GestureLocator

*interface*. What the check needs of a Playwright locator.

```ts
interface GestureLocator {
    boundingBox(): Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>;
    screenshot(options?: {
        scale?: "css" | "device";
    }): Promise<Uint8Array>;
    focus(): Promise<void>;
}
```

### GestureName

*type*

```ts
type GestureName = keyof typeof GESTURES;
```

### GestureOptions

*interface*

```ts
interface GestureOptions {
    /** The selector of the `<kazoku-view-controls>` whose events and controller are read. `"kazoku-view-controls"`. */
    controls?: string;
    /** The selector of what is photographed (the view by default; the canvas or the picture itself when the view is bigger than it). */
    picture?: string;
    /**
     * The gestures this view intentionally does not have, each with the reason, for example `{ roll: "a flat map has no roll" }`. A gesture not named here is checked, and one named
     * here is reported as skipped with its reason. `"picture"` stands for the picture check of the moves: a view whose picture cannot be photographed says why.
     */
    lacks?: Partial<Record<GestureName | "picture", string>>;
    /** The part of the picture that is followed, as shares `[left, right, top, bottom]` (the middle 40%). Give the part that holds the object when it is small. */
    window?: [number, number, number, number];
    /** The package's own signal that its draw is done, awaited before each picture. */
    ready?: () => Promise<unknown>;
    /** The longest wait, in ms, for the view or its picture to come to rest (5000). */
    timeout?: number;
    /** The zoom the moves are made at (3). */
    zoom?: number;
}
```

### GesturePage

*interface*. What the check needs of a Playwright page: `Page` fits.

```ts
interface GesturePage {
    evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
    locator(selector: string): GestureLocator;
    waitForTimeout(ms: number): Promise<void>;
    mouse: {
        move(x: number, y: number): Promise<void>;
        down(options?: {
            button?: "left" | "right" | "middle";
        }): Promise<void>;
        up(options?: {
            button?: "left" | "right" | "middle";
        }): Promise<void>;
        wheel(deltaX: number, deltaY: number): Promise<void>;
        dblclick(x: number, y: number): Promise<void>;
    };
    keyboard: {
        down(key: string): Promise<void>;
        up(key: string): Promise<void>;
        press(key: string): Promise<void>;
    };
}
```

### GestureReport

*interface*

```ts
interface GestureReport {
    gesture: GestureName | "picture";
    result: "checked" | "lacks";
    /** The reason given for a gesture the view lacks. */
    reason?: string;
}
```

### GlCounts

*interface*

```ts
interface GlCounts {
    /** WebGL contexts made. */
    contexts: number;
    /** Draw calls (drawArrays, drawElements and their instanced forms). */
    draws: number;
    /** `requestAnimationFrame` calls made, and the callbacks that ran. */
    rafRequests: number;
    rafCallbacks: number;
    created: Record<GpuKind, number>;
    deleted: Record<GpuKind, number>;
}
```

### GpuKind

*type*

```ts
type GpuKind = (typeof GPU_KINDS)[number];
```

### PageLike

*interface*. What the page needs to be: Playwright's `Page` fits.

```ts
interface PageLike {
    evaluate<R>(fn: () => R): Promise<R>;
}
```

### UntilStillOptions

*interface*

```ts
interface UntilStillOptions {
    /** How long the reading must stay the same, in ms. Default 1000. */
    quietMs?: number;
    /** How long to wait for that before failing, in ms. Default 20000. */
    timeoutMs?: number;
}
```

## `@johnmorrisdotca/kazoku-ui/testing/global-setup`

1 value and 0 types.

```js
import { default } from '@johnmorrisdotca/kazoku-ui/testing/global-setup';
```

### default

*function*. A Playwright `globalSetup` that takes the browser lock before any test starts and returns the teardown that lets it go. Name it in `playwright.config`; the

```ts
default function globalSetup(): Promise<() => void>;
```
