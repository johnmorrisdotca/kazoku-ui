# @johnmorrisdotca/kazoku-ui API reference

Every export of @johnmorrisdotca/kazoku-ui 0.13.1, one section for each entry point, written by `pnpm docs:api` from the built declarations. Do not edit it by hand: `pnpm docs:check` fails when it is out of date. The guides are in [docs/guides](guides/getting-started.md).

## `@johnmorrisdotca/kazoku-ui`

1 value and 1 type.

```js
import { PARTS } from '@johnmorrisdotca/kazoku-ui';
```

### PARTS

*constant*. The subpaths of the parts, in the order they were added.

```ts
const PARTS: readonly ["view-controls", "theme-switch", "language-picker", "address-state", "save-image", "renderer", "testing"];
```

### Part

*type*

```ts
type Part = (typeof PARTS)[number];
```

## `@johnmorrisdotca/kazoku-ui/view-controls`

45 values and 19 types.

```js
import { between, clamp, clampPan, COMMON_ZOOMS, createViewController, DEFAULT_IGNORE, DEFAULT_KEYS, DEFAULT_LIMITS, degreesPerPixel, dragTurn, EVENT, formatAddress, languageOf, LAYOUTS, LEVEL_STORAGE_KEY, MARK_GAP, PACE_FACTOR, PACES, PAN_STEP, parseAddress, parseKeys, parseLayout, parseLevel, parsePace, pinchTo, SLIDER_STEP, SNAP_PX, TAG, TILT_ACROSS, TURN_ACROSS, WHEEL_GESTURE_MS, wheelZoomFactor, WORDS, wordsFor, wrapYaw, ZOOM_STEP, zoomAbout, zoomAtPosition, ZOOMED, zoomMarks, zoomPosition, zoomSnap, zoomStep, zoomText, zoomToMark } from '@johnmorrisdotca/kazoku-ui/view-controls';
```

### between

*function*. The camera `fraction` of the way (0 to 1) from `from` to `to`, eased out: quick at first, slow at the end.

```ts
function between(from: Camera, to: Camera, fraction: number): Camera;
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

*constant*

```ts
const DEFAULT_LIMITS: Limits;
```

### degreesPerPixel

*constant*. Degrees of turn for one pixel of drag when the piece's on-screen radius is `radius` pixels: the pixel that a point at the middle of a sphere's face moves by, so the touched point stays under the pointer.

```ts
const degreesPerPixel: (radius: number) => number;
```

### dragTurn

*function*. A one-pointer drag that turns: `dx` and `dy` pixels from where it began, in a view of `size`. A finger does not tilt (the page's own scroll keeps the vertical drag). A `step` above 0 rounds the tilt to a multiple of it.

```ts
function dragTurn(start: Camera, dx: number, dy: number, size: Size, tips: boolean, limits?: Limits, step?: number, grabRadius?: number): Pick<Camera, "yaw" | "tilt">;
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

### pinchTo

*function*. The camera for two fingers now at `a` and `b`: zoom by the change of distance about where the pinch began, and the middle of the fingers also drags the view. `centre` is the view's middle in client pixels.

```ts
function pinchTo(start: PinchStart, a: Point, b: Point, centre: Point, limits?: Limits): Camera;
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

### TURN_ACROSS

*constant*. Degrees of turn across the view's whole width (a half turn), and of tilt across its whole height.

```ts
const TURN_ACROSS = 180;
```

### WHEEL_GESTURE_MS

*constant*. Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel or one swipe (with its glide).

```ts
const WHEEL_GESTURE_MS = 300;
```

### wheelZoomFactor

*constant*. The factor a wheel turn zooms by: up (a negative `deltaY`) zooms in. `deltaMode` 1 is lines and 2 is pages. `kind` `"pinch"` (the default) is a

```ts
const wheelZoomFactor: (deltaY: number, deltaMode: number, kind?: "pinch" | "wheel") => number;
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
    pace?: Pace;
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
    /** The auto-turn speed (`slow` or `fast`; Medium is the start and leaves the address). */
    speed?: string;
}
```

### Camera

*interface*. What a gesture or a control changes. `panX` and `panY` are CSS pixels from the middle of the view.

```ts
interface Camera {
    yaw: number;
    tilt: number;
    zoom: number;
    panX: number;
    panY: number;
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
    zoomMin: number;
    zoomMax: number;
}
```

### Pace

*type*. Auto-turn speed: Medium is the element's `speed`, Slow half of it and Fast twice it.

```ts
type Pace = "slow" | "medium" | "fast";
```

### PinchStart

*interface*. What a pinch starts from: the distance between two fingers, their middle, and the camera at that moment.

```ts
interface PinchStart {
    distance: number;
    middle: Point;
    camera: Camera;
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

### Size

*interface*

```ts
interface Size {
    width: number;
    height: number;
}
```

### ViewController

*interface*

```ts
interface ViewController {
    readonly state: ViewState;
    turnable: boolean;
    speed: number;
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
    /** Degrees a second when it turns by itself. */
    speed?: number;
    limits?: Partial<Limits>;
    /** The starting zoom: "fit" (the default) or a scale where 1 is the scene's natural size; it opens at that scale divided by `fitScale`. With `fitScale` left at 1 a number is a zoom as `ViewState.zoom` has it. `initial.zoom` is used only when this is left out. */
    zoom?: "fit" | number;
    /** The page's scale when the view is at Fit (`state.zoom` 1): what zoom 1 means. The scene is drawn at `state.zoom * fitScale`. 1 by default. */
    fitScale?: number;
    /** A CSS selector for what inside the view `bind` leaves alone: a press on a match is not captured, so its click goes through. An empty string leaves nothing alone. */
    ignore?: string;
    /** The point the zoom buttons and keys zoom about, in content coordinates: CSS pixels from the view's middle when it is at Fit (zoom 1, no pan). It moves with the picture, so the point stays where it is on screen while the view zooms. Left out, they zoom about the view's middle. */
    anchor?: Point;
    /** Which way Arrow Up tips the view: `"drag"` (the default, as a drag up) or `"wheel"` (the other way, as the wheel turned up tipped it before 0.13.0; the wheel zooms now). */
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
    slow: string;
    medium: string;
    fast: string;
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
    play(): void;
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

7 values and 4 types.

```js
import { canvasSize, COUNT_SCRIPT, GPU_KINDS, gpuObjects, readCounts, SOFTWARE_GL_ARGS, withinPixelBudget } from '@johnmorrisdotca/kazoku-ui/testing';
```

### canvasSize

*function*. The biggest canvas on the page, in device pixels.

```ts
function canvasSize(page: PageLike): Promise<CanvasSize>;
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

### withinPixelBudget

*function*. True when a canvas is within the budget (the renderer's own: 6 million pixels, 4096 a side).

```ts
function withinPixelBudget(size: CanvasSize, maxPixels?: number, maxSide?: number): boolean;
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
