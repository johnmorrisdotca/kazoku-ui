# @johnmorrisdotca/kazoku-ui API reference

Every export of @johnmorrisdotca/kazoku-ui 0.21.1, one section for each entry point, written by `pnpm docs:api` from the built declarations. Do not edit it by hand: `pnpm docs:check` fails when it is out of date. The guides are in [docs/guides](guides/getting-started.md).

## `@johnmorrisdotca/kazoku-ui`

1 value and 1 type.

```js
import { PARTS } from '@johnmorrisdotca/kazoku-ui';
```

### PARTS

*constant*. The subpaths of the parts, in the order they were added.

```ts
const PARTS: readonly ["view-controls", "theme-switch", "language-picker", "address-state", "save-image", "speed-buttons", "embed-panel", "renderer", "testing", "replay-bar", "options-window", "print"];
```

### Part

*type*

```ts
type Part = (typeof PARTS)[number];
```

## `@johnmorrisdotca/kazoku-ui/view-controls`

60 values and 25 types.

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
function clampPan(camera: Camera, size: Size | undefined, object?: Size): Camera;
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
function formatAddress(search: string, choices: AddressChoices, keys?: AddressKeys, leaveYaw?: boolean, startZoom?: number): string;
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

*constant*

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

*function*. The camera for two fingers now at `a` and `b`: zoom by the change of distance about where the pinch began, the middle of the fingers drags the view, and a twist rolls about the view axis. `centre` is the view's middle in client pixels.

```ts
function pinchTo(start: PinchStart, a: Point, b: Point, centre: Point, limits?: Limits): Camera;
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

*function*. Zoom to `next` (held between the limits) keeping the point `at` (pixels from the view's middle) where it is.

```ts
function zoomAbout(camera: Camera, next: number, at: Point, limits?: Limits): Camera;
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
    drag: DragMode;
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
    drag: string;
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

### DragMode

*type*

```ts
type DragMode = "move" | "turn";
```

### ElementControls

*interface*

```ts
interface ElementControls {
    /** The controller behind the hands, for the element's own `set`, `fit` and `state`. */
    readonly controller: ViewController;
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
    setDrag(drag: DragMode): void;
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
    /** Degrees a second when it turns by itself. The sign is the active axis's direction. */
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
    /** What a plain drag does while zoomed in: move the view, or turn the piece. */
    drag: DragMode;
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
    drag: string;
    dragMove: string;
    dragTurn: string;
    zoomLevel: string;
    zoomReset: string;
    more: string;
    speed: string;
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

5 values and 7 types.

```js
import { applyParams, createAddressState, createAddressWriter, readParam, readParams } from '@johnmorrisdotca/kazoku-ui/address-state';
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

*function*. Writes the address in place (`replaceState`), the pathname and hash kept. A page that cannot change its address (a sandboxed frame) is left as it is: nothing throws.

```ts
function createAddressWriter(options?: AddressWriterOptions): AddressWriter;
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

3 values and 1 type.

```js
import { EVENT, SpeedButtonsElement, TAG } from '@johnmorrisdotca/kazoku-ui/speed-buttons/element';
```

### EVENT

*constant*

```ts
const EVENT = "kazoku-speedchange";
```

### SpeedButtonsElement

*class*. Attributes: `steps` (the speeds, `0.5 1 2` by default; any numbers, `1 10 100`, `0 1 3600 86400 -3600`), `value` (the one that is on; the start, and it follows the reader's choice),

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
    /** Whether playback is going. Reduced motion keeps this false. */
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

3 values and 2 types.

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
    /** The credit line shown under the code (and read by a screen reader): a text, or a function of the choices. */
    set credits(credits: Text);
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

## `@johnmorrisdotca/kazoku-ui/print`

27 values and 19 types.

```js
import { buildSheet, cutMarks, DEFAULT_LAYOUT, DEFAULT_MARGIN_MM, isoDate, languageOf, LAYOUT_ATTRIBUTES, layoutFromSheet, layoutOf, MAX_BYTES, MIN_MARGIN_MM, openPrintView, PAGE_NAMES, pageOf, PAGES, pageSize, printableSize, printCss, printSheet, qrMatrix, qrSvg, ROOT_ATTRIBUTE, ROOT_CLASS, tilePoster, TYPE_PRESETS, WORDS, wordsFor } from '@johnmorrisdotca/kazoku-ui/print';
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
    /** The label before the box a child writes a name in. */
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
    /** The "Name: ____" box in the header (on by default). */
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
    /** How thick the sheet's own lines are (boxes, rules, the Name box). Never under 2.5 mm for `kid`. */
    lineMm: number;
    fontFamily: string;
}
```

## `@johnmorrisdotca/kazoku-ui/renderer`

11 values and 25 types.

```js
import { browserClock, createAssetCache, createScheduler, createSharedRenderer, createStillCache, disposeDeep, MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor, STILL_BYTES } from '@johnmorrisdotca/kazoku-ui/renderer';
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
    /** Draw once. `dt` is seconds since this job's last draw while it kept animating, else 0. Return true to be drawn again next frame (an animation); anything else leaves it at rest. */
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

11 values and 8 types.

```js
import { acquireBrowserLock, browserLockStatus, canvasSize, clearBrowserLock, COUNT_SCRIPT, GPU_KINDS, gpuObjects, readCounts, SOFTWARE_GL_ARGS, withBrowserLock, withinPixelBudget } from '@johnmorrisdotca/kazoku-ui/testing';
```

### acquireBrowserLock

*function*. Take the browser lock, waiting while another run holds it. Only one headless browser should run at a time on a machine: with software GL, two at once make heavy

```ts
function acquireBrowserLock(options?: BrowserLockOptions): Promise<BrowserLock>;
```

### browserLockStatus

*function*. Who holds the browser lock now, if anyone, and whether it is stale.

```ts
function browserLockStatus(options?: Pick<BrowserLockOptions, "maxAgeMs">): BrowserLockStatus;
```

### canvasSize

*function*. The biggest canvas on the page, in device pixels.

```ts
function canvasSize(page: PageLike): Promise<CanvasSize>;
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

### readCounts

*function*. The counters now, as a copy.

```ts
function readCounts(page: PageLike): Promise<GlCounts>;
```

### SOFTWARE_GL_ARGS

*constant*. The launch arguments that make headless Chromium draw WebGL in software (ANGLE on SwiftShader), never on the machine's graphics card. Every package's Playwright

```ts
const SOFTWARE_GL_ARGS: readonly string[];
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
    /** How often to say who is holding it while waiting. 30 000 ms. */
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
