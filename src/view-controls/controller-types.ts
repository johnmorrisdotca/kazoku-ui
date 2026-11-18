// The controller's types: the state it reports, what changed it, its options and its methods. Moved out of controller.ts as they were; controller.ts re-exports them, so nothing that imports them changes.
import type { TurnAxis } from "./levels.ts";
import type { Camera, Limits, Point, Quat, Size } from "./math.ts";
import type { Sway } from "./sway.ts";

export interface ViewState extends Camera {
  /** The pose the page should draw. A tumble keeps this continuous when the slider numbers fold at a pole. */
  orientation: Quat;
  /** True while the view turns by itself. A control never changes this; only play, pause and a grab of the view's own do not either (see `holdTurn`). */
  turning: boolean;
}

export interface ChangeInfo {
  /** False for the steps of a drag, a pinch, a slider or the automatic turn; true when something settled (a button, a release, a key, a wheel step). */
  final: boolean;
  /** What changed it: "set", "auto", "drag", "pinch", "wheel", "key", "zoom", "pan", "front", "fit", "play", "pause", "tap". */
  reason: string;
}

/** Which way Arrow Up tips the view: like a drag up (`"drag"`, the default) or the other way (`"wheel"`, the way the wheel turned up tipped it before 0.13.0; the wheel moves now). */
export type KeyTilt = "drag" | "wheel";

export interface Clock {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export interface ViewControllerOptions {
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
  /** A double press zooms to 2× about that point, and the next one back to 1×. False switches it off. True (the default) fires `kazoku-doublepress` first; a page that calls `preventDefault` does its own zoom. */
  doublePress?: boolean;
  /** A view that fills the screen. A plain wheel zooms about the pointer, and a finger drag turns and tips instead of scrolling the page. Ctrl, Alt and Shift with the wheel stay as they are. False (the default) leaves the plain wheel as a move. */
  immersive?: boolean;
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
  /**
   * A hand-held drift while the view is already moving. `off` (the default) draws the state as it is. With a drift, the state `onChange` gets is the picture to draw, drift and all; the angle is
   * `controller.state`, which a page that adds up the change between frames must read instead. The last frame of a move is drawn without it.
   */
  sway?: Sway;
  /** The time in ms, for the drift. A test passes its own; the browser's clock otherwise. */
  now?: () => number;
}

export interface ViewController {
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
  /** A hand-held drift while the view is already moving (`off`, `gentle` or `more`). Can be changed at any time. `off` by default. */
  sway: Sway;
  /**
   * A double press zooms to 2× and back (see `ViewControllerOptions.doublePress`). Can be changed at any time.
   *
   * @example
   * controller.doublePress = false;
   */
  doublePress: boolean;
  /**
   * A plain wheel zooms and a finger drag turns, for a view that fills the screen (see `ViewControllerOptions.immersive`). Can be changed at any time.
   *
   * @example
   * controller.immersive = true;
   */
  immersive: boolean;
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
