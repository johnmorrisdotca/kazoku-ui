// The shared renderer's types: what of three it uses, the scene and item an adapter supplies, the options and what a view and the renderer give back. Moved out of renderer.ts as they were; renderer.ts re-exports them.
import type { AssetCache, AssetScope } from "./cache.ts";
import type { FrameClock, Scheduler } from "./scheduler.ts";
import type { Still, StillCache } from "./stills.ts";

/** What of three's `WebGLRenderer` the renderer uses. */
export interface GLRenderer {
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

/** What of the `three` module the renderer uses; the whole module is handed to `build`, so an adapter can use all of it. */
export interface ThreeLike {
  WebGLRenderer: new (...args: never[]) => GLRenderer;
}

/** A scene ready to draw, made by an item's `build`. Everything but `scene` and `camera` is optional. */
export interface Scene3D {
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

export interface BuildContext<T extends ThreeLike = ThreeLike> {
  three: T;
  /** Take every geometry, material, texture and model through here: they are shared by key and released when the view lets go. */
  assets: AssetScope;
  width: number;
  height: number;
}

/** The package's adapter for one kind of thing: the scene for it and its framing. */
export interface Item3D<T extends ThreeLike = ThreeLike> {
  /** What the item looks like, for its still and for the cache: items with the same key share one picture. */
  key: string;
  build(context: BuildContext<T>): Scene3D | Promise<Scene3D>;
}

export interface SharedRendererOptions<T extends ThreeLike = ThreeLike> {
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
  /** Milliseconds a lost context is waited for before a new one is made (3000). A browser that never gives it back (iOS Safari under memory pressure) would leave the view black for good. A new context that cannot be made is tried again after twice as long, up to three times, then `onContext("unavailable")`. A rebuilt context is told as `"restored"`. */
  restoreMs?: number;
  antialias?: boolean;
  /** Called when the context is lost or restored, or WebGL is not available. */
  onContext?: (state: "lost" | "restored" | "unavailable") => void;
  clock?: FrameClock;
  document?: Document;
  /** Your own cache or scheduler, for a test or to share them. */
  assets?: AssetCache;
  scheduler?: Scheduler;
}

export interface ViewOptions {
  /** The `<img>` that shows the still. Left out, one is made inside the host. `null` shows no still. */
  still?: HTMLImageElement | null;
}

export interface View {
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

export interface RendererStats {
  /** WebGL contexts made over the page's life: 1, unless the page let it go while hidden. */
  contexts: number;
  /** Draws of live views. */
  draws: number;
  /** Stills made. */
  snapshots: number;
  live: boolean;
  lost: boolean;
  /** The canvas's size in device pixels now. */
  canvas: { width: number; height: number; pixels: number };
  frames: Scheduler["stats"];
  assets: ReturnType<AssetCache["stats"]>;
  stills: { count: number; bytes: number };
}

export interface SharedRenderer<T extends ThreeLike = ThreeLike> {
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
