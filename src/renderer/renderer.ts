// The family's shared 3D renderer: ONE WebGL context for the page, handed to the view that has the focus. Every other view shows a still. A browser keeps
// about 16 contexts and silently kills the older ones, so a page of 40 live views is a page of broken ones; one context moved between hosts has no such limit.
//
// three.js is never imported here: the page passes `load: () => import("three")`, so three stays the page's own (peer) dependency, loads only when a view first
// goes live, and a page of stills ships no 3D code at all. What a view shows is an adapter the package supplies (`Item3D`): it builds a scene from shared assets.
import { createAssetCache, type AssetScope } from "./cache.ts";
import { MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor, stillKeyFor, stillSideFor } from "./pixels.ts";
import { createScheduler, type Job } from "./scheduler.ts";
import { createStillCache, type Still } from "./stills.ts";
import type { BuildContext, GLRenderer, Item3D, RendererStats, Scene3D, SharedRenderer, SharedRendererOptions, ThreeLike, View, ViewOptions } from "./types.ts";

export type { BuildContext, GLRenderer, Item3D, RendererStats, Scene3D, SharedRenderer, SharedRendererOptions, ThreeLike, View, ViewOptions };

/** How many times a context that never came back is made again before the page is told `"unavailable"`. */
const MAX_REBUILDS = 3;

interface Internal {
  host: HTMLElement;
  item: Item3D;
  img: HTMLImageElement | null;
  ownImg: boolean;
  scene: Scene3D | undefined;
  assets: AssetScope | undefined;
  live: boolean;
  wantsLive: boolean;
  disposed: boolean;
  seen: boolean;
  job: Job;
  watchers: { resize: ResizeObserver | undefined; sight: IntersectionObserver | undefined };
  api: View;
}

export function createSharedRenderer<T extends ThreeLike = ThreeLike>(options: SharedRendererOptions<T>): SharedRenderer<T> {
  const limits = { maxPixels: options.maxPixels ?? MAX_PIXELS, maxSide: options.maxSide ?? MAX_SIDE, maxRatio: options.maxRatio ?? MAX_RATIO };
  const stillSize = options.stillSize ?? 320;
  const releaseMs = options.releaseMs ?? 30_000;
  const restoreMs = options.restoreMs ?? 3000;
  const doc = (): Document => options.document ?? globalThis.document;
  const scheduler = options.scheduler ?? createScheduler(options.clock === undefined ? {} : { clock: options.clock });
  const assets = options.assets ?? createAssetCache(options.lingerMs === undefined ? {} : { lingerMs: options.lingerMs });
  const views = new Set<Internal>();
  /** The side a view's still is made at: the host's `data-still-size` (device pixels, long side), else the renderer's own. Read when the still is asked for, so a page may change it. */
  const sideOf = (v: Internal): number => stillSideFor(v.host.getAttribute("data-still-size"), stillSize, limits);
  /** What a view's still is kept under: its item's key, with the size when it is not the renderer's own. */
  const keyOf = (v: Internal): string => stillKeyFor(v.item.key, sideOf(v), stillSize);
  const byKey = (key: string): Internal[] => [...views].filter((v) => keyOf(v) === key);
  const stills = createStillCache({
    ...(options.stillBytes === undefined ? {} : { maxBytes: options.stillBytes }),
    onEvict: (key) => {
      for (const v of byKey(key)) if (v.img !== null && !v.live) v.img.removeAttribute("src");
    },
  });
  const counts = { contexts: 0, draws: 0, snapshots: 0 };

  let three: T | undefined;
  let gl: GLRenderer | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let creating: Promise<GLRenderer> | undefined;
  let focused: Internal | undefined;
  let token = 0;
  let lost = false;
  let rebuilding = false;
  let lostPause = false;
  let sightPause = false;
  let onScreen = true;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let listening = false;
  let queue: Promise<unknown> = Promise.resolve();
  const shooting = new Map<string, Promise<Still | undefined>>();
  let sized = "";

  // --- the one context ---------------------------------------------------------------------------------------------------------------------------------

  const onLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
    if (!lostPause) {
      lostPause = true;
      scheduler.pause();
    }
    if (canvas !== undefined) canvas.style.visibility = "hidden";
    if (focused?.img) focused.img.style.visibility = "";
    options.onContext?.("lost");
    waitForRestore();
  };
  const onRestored = (): void => {
    clearTimeout(restoreTimer);
    lost = false;
    if (lostPause) {
      lostPause = false;
      scheduler.resume();
    }
    if (canvas !== undefined) canvas.style.visibility = "";
    sized = "";
    if (focused?.live) {
      applySize(focused);
      scheduler.invalidate(focused.job);
    }
    options.onContext?.("restored");
  };

  /** A browser that does not give a lost context back (iOS Safari under memory pressure) leaves the view black for good: after `restoreMs` the context is made again, a few times, then the page is told `"unavailable"`. */
  function waitForRestore(): void {
    clearTimeout(restoreTimer);
    if (!lost || focused === undefined || !focused.wantsLive) return;
    restoreTimer = setTimeout(() => {
      // A hidden tab is rebuilt when it is seen again (`sight`).
      if (lost && doc().visibilityState !== "hidden") void rebuild();
    }, restoreMs);
  }

  async function rebuild(): Promise<void> {
    const v = focused;
    if (v === undefined || !v.wantsLive || v.disposed) return;
    rebuilding = true;
    releaseGL();
    const mine = ++token;
    try {
      for (let attempt = 0; attempt < MAX_REBUILDS; attempt += 1) {
        if (await goLive(v, mine, true)) {
          options.onContext?.("restored");
          return;
        }
        if (mine !== token || v.disposed) return;
        if (attempt < MAX_REBUILDS - 1) await new Promise((resolve) => setTimeout(resolve, restoreMs * 2 ** attempt));
        if (mine !== token || v.disposed) return;
      }
      options.onContext?.("unavailable");
    } finally {
      rebuilding = false;
    }
  }

  function ensureGL(): Promise<GLRenderer> {
    if (gl !== undefined && !lost) return Promise.resolve(gl);
    if (gl !== undefined && lost) releaseGL();
    // Cleared after the promise is stored: with three already loaded, a context that cannot be made throws before the first await, and clearing inside would leave the failed promise here for good.
    creating ??= (async () => {
      three ??= await options.load();
      const element = doc().createElement("canvas");
      element.addEventListener("webglcontextlost", onLost);
      element.addEventListener("webglcontextrestored", onRestored);
      const Renderer = three.WebGLRenderer as unknown as new (parameters: Record<string, unknown>) => GLRenderer;
      const made = new Renderer({ canvas: element, antialias: options.antialias ?? true, alpha: true, powerPreference: "default" });
      canvas = element;
      gl = made;
      counts.contexts += 1;
      sized = "";
      return made;
    })().finally(() => {
      creating = undefined;
    });
    return creating;
  }

  /** Let go of the context (forced, so the GPU memory is free now) and of the scene using it. The views keep their stills. */
  function releaseGL(): void {
    clearTimeout(restoreTimer);
    if (focused?.live) detach(focused, true);
    if (canvas !== undefined) {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      canvas.remove();
    }
    try {
      gl?.dispose();
      gl?.forceContextLoss();
    } catch {
      /* already gone */
    }
    gl = undefined;
    canvas = undefined;
    lost = false;
    if (lostPause) {
      lostPause = false;
      scheduler.resume();
    }
    sized = "";
  }

  // --- size: the pixel budget ----------------------------------------------------------------------------------------------------------------------------

  /** The size the canvas will fill: the host's padding box (the canvas is laid inside its border), whole CSS pixels. */
  function measure(host: HTMLElement): { width: number; height: number } {
    const r = host.getBoundingClientRect();
    return { width: Math.max(1, Math.floor(host.clientWidth || r.width)), height: Math.max(1, Math.floor(host.clientHeight || r.height)) };
  }

  function applySize(v: Internal): void {
    if (gl === undefined || canvas === undefined) return;
    const { width, height } = measure(v.host);
    const ratio = pixelRatioFor(width, height, globalThis.devicePixelRatio || 1, limits);
    const mark = `${width}x${height}@${ratio}`;
    if (mark === sized) return;
    sized = mark;
    gl.setPixelRatio(ratio);
    gl.setSize(width, height, false);
    v.scene?.resize?.(width, height);
  }

  // --- going live and back to a still --------------------------------------------------------------------------------------------------------------------

  function showImage(v: Internal, shown: boolean): void {
    if (v.img !== null) v.img.style.visibility = shown ? "" : "hidden";
  }

  function paintStill(v: Internal): Still | undefined {
    const still = stills.get(keyOf(v));
    if (v.img !== null && still !== undefined && v.img.getAttribute("src") !== still.url) v.img.src = still.url;
    return still;
  }

  async function build(v: Internal, scope: AssetScope, width: number, height: number): Promise<Scene3D> {
    return v.item.build({ three: three as T, assets: scope, width, height });
  }

  /** Take the canvas, with a scene, into the host. */
  async function goLive(v: Internal, mine: number, quiet = false): Promise<boolean> {
    let renderer: GLRenderer;
    try {
      renderer = await ensureGL();
    } catch {
      if (mine === token && !quiet) options.onContext?.("unavailable");
      return false;
    }
    if (mine !== token || v.disposed) return false;
    const scope = assets.scope();
    const size = measure(v.host);
    let scene: Scene3D;
    try {
      scene = await build(v, scope, size.width, size.height);
    } catch {
      scope.release();
      return false;
    }
    if (mine !== token || v.disposed || gl !== renderer || canvas === undefined) {
      scene.dispose?.();
      scope.release();
      return false;
    }
    v.scene = scene;
    v.assets = scope;
    v.live = true;
    v.seen = false;
    if (globalThis.getComputedStyle(v.host).position === "static") v.host.style.position = "relative";
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    v.host.append(canvas);
    sized = "";
    applySize(v);
    watch(v);
    scheduler.invalidate(v.job);
    return true;
  }

  /** Take the canvas out of the host and let the scene go; the host shows its still. `keep` leaves the wish to be live (the context is being let go). */
  function detach(v: Internal, keep = false): void {
    if (!keep) unwatch(v);
    scheduler.remove(v.job);
    if (canvas !== undefined && canvas.parentElement === v.host) canvas.remove();
    v.scene?.dispose?.();
    v.assets?.release();
    v.scene = undefined;
    v.assets = undefined;
    v.live = false;
    if (!keep) v.wantsLive = false;
    if (sightPause) {
      sightPause = false;
      scheduler.resume();
    }
    clearTimeout(idleTimer);
    idleTimer = undefined;
    showImage(v, true);
    if (v.img !== null) void showStill(v);
  }

  // --- out of sight: no frames, then no context ----------------------------------------------------------------------------------------------------------

  /** Whether `host` meets the window. A view with no size, or one scrolled away, is not on screen. */
  function seen(host: HTMLElement): boolean {
    const rect = host.getBoundingClientRect?.();
    const view = host.ownerDocument?.defaultView;
    if (rect === undefined || view === null || view === undefined) return true;
    if (rect.width <= 0 || rect.height <= 0) return false;
    return rect.bottom > 0 && rect.right > 0 && rect.top < view.innerHeight && rect.left < view.innerWidth;
  }

  function watch(v: Internal): void {
    unwatch(v);
    // Out of sight until the rect says otherwise. The observer's first answer used to arrive after one frame had already been drawn.
    onScreen = typeof IntersectionObserver === "function" ? seen(v.host) : true;
    if (typeof ResizeObserver === "function") {
      v.watchers.resize = new ResizeObserver(() => {
        if (!v.live) return;
        sized = "";
        applySize(v);
        scheduler.invalidate(v.job);
      });
      v.watchers.resize.observe(v.host);
    }
    if (typeof IntersectionObserver === "function") {
      v.watchers.sight = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (last === undefined) return;
        onScreen = last.isIntersecting;
        sight();
      });
      v.watchers.sight.observe(v.host);
    }
    if (!listening) {
      listening = true;
      doc().addEventListener("visibilitychange", sight);
    }
    sight();
  }

  function unwatch(v: Internal): void {
    v.watchers.resize?.disconnect();
    v.watchers.sight?.disconnect();
    v.watchers.resize = undefined;
    v.watchers.sight = undefined;
  }

  function sight(): void {
    const v = focused;
    if (v === undefined || !v.wantsLive) return;
    const idle = !onScreen || doc().visibilityState === "hidden";
    if (idle && !sightPause && gl !== undefined) {
      sightPause = true;
      scheduler.pause();
      idleTimer = setTimeout(() => {
        // Out of sight for good: free the GPU. The view keeps its still, and goes live again when it is seen.
        if (focused === v) releaseGL();
      }, releaseMs);
    } else if (!idle && sightPause) {
      sightPause = false;
      scheduler.resume();
      clearTimeout(idleTimer);
      idleTimer = undefined;
      if (gl === undefined && v.wantsLive) void goLive(v, ++token);
      else {
        scheduler.invalidate(v.job);
        waitForRestore();
      }
    } else if (!idle && gl === undefined && v.wantsLive && !v.live) void goLive(v, ++token);
  }

  // --- stills --------------------------------------------------------------------------------------------------------------------------------------------

  function showStill(v: Internal): Promise<Still | undefined> {
    const have = paintStill(v);
    if (have !== undefined) return Promise.resolve(have);
    const key = keyOf(v);
    let pending = shooting.get(key);
    if (pending === undefined) {
      pending = (queue = queue.then(() => shoot(v)).catch(() => undefined)) as Promise<Still | undefined>;
      shooting.set(key, pending);
      void pending.finally(() => shooting.delete(key));
    }
    return pending.then((still) => {
      if (still !== undefined && !v.disposed) paintStill(v);
      return still;
    });
  }

  /** One still, made now, from the same renderer, then the canvas is put back as it was (all in one task, so nothing is shown at the wrong size). */
  async function shoot(v: Internal): Promise<Still | undefined> {
    const key = keyOf(v);
    const have = stills.get(key);
    if (have !== undefined) return have;
    // A lost context is left for its owner to restore or rebuild; a still waits for it.
    if (lost || rebuilding || v.disposed) return undefined;
    let renderer: GLRenderer;
    try {
      renderer = await ensureGL();
    } catch {
      options.onContext?.("unavailable");
      return undefined;
    }
    if (lost) return undefined;
    const host = measure(v.host);
    const scale = sideOf(v) / Math.max(host.width, host.height);
    const width = Math.max(1, Math.round(host.width * scale));
    const height = Math.max(1, Math.round(host.height * scale));
    const scope = assets.scope();
    let scene: Scene3D | undefined;
    try {
      scene = await build(v, scope, width, height);
      if (gl !== renderer || canvas === undefined || lost) return undefined;
      const element = canvas;
      scene.resize?.(width, height);
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      if (scene.render === undefined) renderer.render(scene.scene, scene.camera);
      else scene.render(renderer);
      const blob = new Promise<Blob | null>((resolve) => element.toBlob(resolve, "image/png"));
      sized = "";
      if (focused?.live) {
        applySize(focused);
        scheduler.invalidate(focused.job);
      }
      const made = await blob;
      if (made === null) return undefined;
      const still: Still = { url: URL.createObjectURL(made), width, height, bytes: width * height * 4 };
      stills.set(key, still);
      counts.snapshots += 1;
      return still;
    } catch {
      return undefined;
    } finally {
      scene?.dispose?.();
      scope.release();
    }
  }

  // --- views ---------------------------------------------------------------------------------------------------------------------------------------------

  const renderer: SharedRenderer<T> = {
    view(host, item, viewOptions = {}) {
      const own = viewOptions.still === undefined;
      let img: HTMLImageElement | null = viewOptions.still ?? null;
      if (own) {
        img = doc().createElement("img");
        img.alt = "";
        img.decoding = "async";
        img.className = "kazoku-still";
        img.style.cssText = "display:block;width:100%;height:100%;object-fit:contain";
        host.append(img);
      }
      const v: Internal = {
        host,
        item: item as Item3D,
        img,
        ownImg: own,
        scene: undefined,
        assets: undefined,
        live: false,
        wantsLive: false,
        disposed: false,
        seen: false,
        watchers: { resize: undefined, sight: undefined },
        job: {
          draw: (now, dt) => {
            const scene = v.scene;
            if (scene === undefined || gl === undefined || lost) return;
            const moving = scene.update?.(dt, now) === true;
            if (scene.render === undefined) gl.render(scene.scene, scene.camera);
            else scene.render(gl);
            counts.draws += 1;
            if (!v.seen) {
              v.seen = true;
              showImage(v, false);
            }
            return moving;
          },
        },
        api: undefined as unknown as View,
      };
      v.api = {
        host,
        item: item as Item3D,
        get live() {
          return v.live;
        },
        get scene() {
          return v.scene;
        },
        async focus() {
          if (v.disposed) return false;
          if (focused === v && v.live) {
            if (!lost) return true;
            detach(v, true);
          }
          const mine = ++token;
          if (focused !== undefined && focused !== v) detach(focused);
          focused = v;
          v.wantsLive = true;
          return goLive(v, mine);
        },
        blur() {
          if (focused !== v) return;
          token += 1;
          detach(v);
          focused = undefined;
        },
        invalidate() {
          if (v.live) scheduler.invalidate(v.job);
        },
        showStill: () => showStill(v),
        dispose() {
          if (v.disposed) return;
          v.api.blur();
          v.disposed = true;
          views.delete(v);
          if (v.ownImg) v.img?.remove();
        },
      };
      views.add(v);
      return v.api;
    },
    get focused() {
      return focused?.api;
    },
    get stats() {
      const width = canvas?.width ?? 0;
      const height = canvas?.height ?? 0;
      return { ...counts, live: focused?.live === true, lost, canvas: { width, height, pixels: width * height }, frames: { ...scheduler.stats }, assets: assets.stats(), stills: { count: stills.size, bytes: stills.bytes } };
    },
    assets,
    stills,
    scheduler,
    dispose() {
      token += 1;
      for (const v of [...views]) v.api.dispose();
      focused = undefined;
      releaseGL();
      if (listening) doc().removeEventListener("visibilitychange", sight);
      listening = false;
      assets.clear();
      stills.clear();
    },
  };
  return renderer;
}
