// The host glue, written once: one scene, one camera and one clock for the layers of many packages, drawn on the shared renderer's one WebGL context.
// The renderer asks an `Item3D` for a scene when a view goes live; this makes that item from layers. Each frame it moves the clock on, finds the focused body (the floating origin), tells every layer
// the same frame, then draws in passes: the sky at infinity, the far slice of bodies, the near slice (see `planSlices`). Nothing here imports three.js: the page passes its own copy.
import { pixelRatioFor } from "../renderer/pixels.ts";
import type { GLRenderer, Item3D, Scene3D } from "../renderer/renderer.ts";
import type { FamilyClock } from "../clock/clock.ts";
import { fitDistanceKm, lengthKm, lowPrecisionSun, orbitOffsetKm, planSlices, subKm, type DepthSlice } from "./frame.ts";
import type { CameraLike, Credit, Object3DLike, SceneBody, SceneFrame, SceneLayer, SceneLike, SceneThree, Vec3Km } from "./types.ts";

/** Where the camera is: orbiting the centre of the focused body. */
export interface SceneCameraState {
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

/** What the view controls (or a test) say about the look: `yaw`, `tilt` and `zoom` as `<kazoku-view-controls>` reports them. */
export interface SceneLook {
  /** Degrees the body is turned about its north axis, as the view controls count them: a drag to the right turns the near face to the right, so the camera goes round the other way. */
  yaw?: number;
  tilt?: number;
  /** 1 fits the focused body in the view; 2 is twice as close. */
  zoom?: number;
}

/** The camera of a composed scene, kept outside any one built scene so it survives the renderer's rebuilds (a still, a view that lets go and comes back). */
export interface SceneCamera {
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

/** What `composeScene` is made from. */
export interface ComposeOptions {
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

/** What the composed scene counted, for a test or a page's numbers. */
export interface SceneStats {
  /** Frames computed and told to the layers. */
  frames: number;
  /** Passes drawn: the sky, then each slice. */
  passes: number;
  /** The depth slices of the last frame, far first. */
  slices: readonly DepthSlice[];
}

/** An item for the shared renderer, with the camera, the clock and the layers a page drives it with. */
export interface ComposedScene extends Item3D {
  readonly clock: FamilyClock;
  readonly layers: readonly SceneLayer[];
  /** Every layer's bodies. */
  readonly bodies: readonly SceneBody[];
  readonly camera: SceneCamera;
  /** The last frame every layer was told, if one was drawn. */
  readonly frame: SceneFrame | undefined;
  readonly stats: SceneStats;
  /** Draw again when the clock is set, played, paused or its speed changes, and when the camera moves. Give it the renderer's `View`. Returns the way to stop. */
  bind(view: { invalidate(): void }): () => void;
  /** The layers' credits, each once. */
  credits(): readonly Credit[];
  /** Let go of every layer. The renderer lets go of the scenes it built; the layers are the page's to dispose, once, here. */
  dispose(): void;
}

const DEFAULT_FOV = 40;
const DEFAULT_TILT = 15;

/**
 * One scene, one camera and one clock from many packages' layers, on the shared renderer's one WebGL context (one context for the page, not one for each package).
 * Give the result to `renderer.view(host, scene)`, call `scene.bind(view)` so the view draws when the clock or the camera changes, and drive the camera from the view controls with `scene.camera.look(state)`.
 *
 * - **One frame.** Each frame the clock is advanced once and every layer is told the same `ms`, the same `focusKm` (the floating origin, float64) and the same `unitKm`.
 * - **True scale only.** A body too small to see is not inflated; a layer draws a marker of a few pixels for it (`frame.camera.heightPx` says how big a pixel is).
 * - **Two depth slices.** The sky (`layer.sky`) is drawn first with no depth; the far bodies next; the depth buffer is cleared; the near bodies last (`planSlices`). This needs the renderer's `clearDepth` and
 *   `autoClear`; on a renderer without them the scene is drawn in one pass over the whole range.
 * - **Rests.** The scene asks to be drawn again only while the clock runs or a layer still moves, so a paused clock is a view at rest: no frame is requested (the renderer's own 30 a second cap holds).
 *
 * @param three - The page's own `three` module (the `Scene` and the `PerspectiveCamera` are used).
 * @param options - The layers, the clock and where to start.
 * @returns The item for the renderer, with the camera, the clock and the layers.
 * @example
 * const three = await import("three");
 * const clock = createFamilyClock();
 * const scene = composeScene(three, { layers: [starLayer, earthLayer, planetsLayer], clock, focus: "earth" });
 * const view = renderer.view(host, scene);
 * scene.bind(view);
 * await view.focus();
 * scene.camera.focusOn("moon");            // the origin moves to the Moon; the clock opens at the Moon's speed unless the reader chose one
 * controls.addEventListener("kazoku-viewchange", (event) => scene.camera.look(event.detail));
 */
export function composeScene(three: SceneThree, options: ComposeOptions): ComposedScene {
  const { layers, clock } = options;
  const bodies = layers.flatMap((layer) => [...layer.bodies]);
  if (bodies.length === 0) throw new Error("composeScene needs at least one body");
  const byId = new Map<string, SceneBody>();
  for (const body of bodies) {
    if (byId.has(body.id)) throw new Error(`two bodies are called "${body.id}"`);
    byId.set(body.id, body);
  }
  const sun = options.sun ?? lowPrecisionSun;
  const skies = layers.flatMap((layer) => (layer.sky === undefined ? [] : [layer.sky]));
  const bodyOf = (id: string): SceneBody => {
    const body = byId.get(id);
    if (body === undefined) throw new Error(`no body called "${id}"`);
    return body;
  };
  const unitFor = (body: SceneBody): number => {
    const unit = typeof options.unitKm === "function" ? options.unitKm(body) : (options.unitKm ?? body.radiusKm);
    return Number.isFinite(unit) && unit > 0 ? unit : 1;
  };

  // --- the camera, held outside any one built scene ----------------------------------------------------------------------------------------------------
  const first = options.focus ?? bodies[0]?.id ?? "";
  const fovDeg = options.camera?.fovDeg ?? DEFAULT_FOV;
  const state: SceneCameraState = { focus: first, distanceKm: options.camera?.distanceKm ?? fitDistanceKm(bodyOf(first).radiusKm, fovDeg), yaw: options.camera?.yaw ?? 0, tilt: options.camera?.tilt ?? DEFAULT_TILT, fovDeg };
  const cameraListeners = new Set<(state: Readonly<SceneCameraState>) => void>();
  const copy = (): Readonly<SceneCameraState> => ({ ...state });
  const fit = (id: string = state.focus): number => fitDistanceKm(bodyOf(id).radiusKm, state.fovDeg);
  const changed = (): void => {
    for (const listener of [...cameraListeners]) listener(copy());
  };
  const camera: SceneCamera = {
    get state() {
      return copy();
    },
    set(change) {
      if (change.focus !== undefined) bodyOf(change.focus);
      const before = JSON.stringify(state);
      if (change.focus !== undefined) state.focus = change.focus;
      if (change.distanceKm !== undefined && Number.isFinite(change.distanceKm) && change.distanceKm > 0) state.distanceKm = change.distanceKm;
      if (change.yaw !== undefined && Number.isFinite(change.yaw)) state.yaw = change.yaw;
      if (change.tilt !== undefined && Number.isFinite(change.tilt)) state.tilt = Math.max(-89, Math.min(89, change.tilt));
      if (change.fovDeg !== undefined && Number.isFinite(change.fovDeg) && change.fovDeg > 0 && change.fovDeg < 150) state.fovDeg = change.fovDeg;
      state.distanceKm = Math.max(state.distanceKm, bodyOf(state.focus).radiusKm * 1.0001);
      if (JSON.stringify(state) !== before) changed();
    },
    focusOn(id, change = {}) {
      const body = bodyOf(id);
      camera.set({ distanceKm: fitDistanceKm(body.radiusKm, change.fovDeg ?? state.fovDeg), ...change, focus: id });
      clock.openAt(body.openingSpeed);
    },
    look(look) {
      const zoom = look.zoom !== undefined && Number.isFinite(look.zoom) && look.zoom > 0 ? look.zoom : 1;
      camera.set({ distanceKm: fit() / zoom, ...(look.yaw === undefined ? {} : { yaw: -look.yaw }), ...(look.tilt === undefined ? {} : { tilt: look.tilt }) });
    },
    fitKm: fit,
    onChange(listener) {
      cameraListeners.add(listener);
      return () => {
        cameraListeners.delete(listener);
      };
    },
  };
  clock.openAt(bodyOf(first).openingSpeed);

  const stats: { frames: number; passes: number; slices: readonly DepthSlice[] } = { frames: 0, passes: 0, slices: [] };
  let lastFrame: SceneFrame | undefined;
  const bindings = new Set<() => void>();
  let hearClock: (() => void) | undefined;

  const item: ComposedScene = {
    key: options.key ?? `scene:${layers.map((layer) => layer.id).join("+")}`,
    clock,
    layers,
    bodies,
    camera,
    get frame() {
      return lastFrame;
    },
    get stats() {
      return { ...stats };
    },
    build({ width, height }): Scene3D {
      const scene = new three.Scene();
      const sky = new three.Scene();
      const eye = new three.PerspectiveCamera(state.fovDeg, width / height, 0.001, 1000);
      const skyEye = new three.PerspectiveCamera(state.fovDeg, width / height, 1, 1000);
      let size = { width, height };
      let fresh = false;
      const attach = (): void => {
        for (const body of bodies) if (body.root.parent !== scene) scene.add(body.root);
        for (const object of skies) if (object.parent !== sky) sky.add(object);
      };

      /** The frame: advance the clock once, find the origin, tell every layer the same thing, point the cameras, plan the slices. Returns true while a layer still moves. */
      const compute = (): boolean => {
        const ms = clock.advance();
        const focus = bodyOf(state.focus);
        const positions = new Map<string, Vec3Km>();
        for (const body of bodies) positions.set(body.id, body.placeKm(ms));
        const focusKm = positions.get(focus.id) as Vec3Km;
        const unitKm = unitFor(focus);
        const offset = orbitOffsetKm(state.distanceKm, state.yaw, state.tilt);
        const positionKm: Vec3Km = [focusKm[0] + offset[0], focusKm[1] + offset[1], focusKm[2] + offset[2]];
        const pixelRatio = pixelRatioFor(size.width, size.height, globalThis.devicePixelRatio || 1);
        const frame: SceneFrame = { ms, focusKm, unitKm, sunKm: sun(ms), positionsKm: positions, camera: { positionKm, fovDeg: state.fovDeg, heightPx: Math.round(size.height * pixelRatio) }, pixelRatio };
        let moving = false;
        for (const layer of layers) if (layer.update(frame)) moving = true;
        eye.fov = state.fovDeg;
        eye.aspect = size.width / size.height;
        eye.position.set(offset[0] / unitKm, offset[1] / unitKm, offset[2] / unitKm);
        eye.up.set(0, 1, 0);
        eye.lookAt(0, 0, 0);
        skyEye.fov = state.fovDeg;
        skyEye.aspect = eye.aspect;
        skyEye.quaternion.copy(eye.quaternion);
        skyEye.updateProjectionMatrix();
        stats.slices = planSlices(
          bodies.map((body) => ({ id: body.id, distanceKm: lengthKm(subKm(positions.get(body.id) as Vec3Km, positionKm)), radiusKm: body.radiusKm })),
          { ...(options.ratio === undefined ? {} : { ratio: options.ratio }), ...(options.minNearKm === undefined ? {} : { minNearKm: options.minNearKm }) },
        );
        stats.frames += 1;
        lastFrame = frame;
        return moving;
      };

      const render = (gl: GLRenderer): void => {
        if (!fresh) compute();
        fresh = false;
        attach();
        const unitKm = lastFrame?.unitKm ?? 1;
        const was = bodies.map((body) => body.root.visible);
        const autoClear = gl.autoClear;
        let first = true;
        const pass = (target: SceneLike, view: CameraLike): void => {
          gl.autoClear = first;
          if (!first) gl.clearDepth?.();
          gl.render(target, view);
          first = false;
          stats.passes += 1;
        };
        try {
          if (skies.length > 0) pass(sky, skyEye);
          // Without `clearDepth` the passes cannot be told apart: draw everything once over the whole range.
          const slices: readonly DepthSlice[] = typeof gl.clearDepth === "function" || stats.slices.length < 2 ? stats.slices : [{ ids: bodies.map((body) => body.id), nearKm: Math.min(...stats.slices.map((s) => s.nearKm)), farKm: Math.max(...stats.slices.map((s) => s.farKm)) }];
          for (const slice of slices) {
            const ids = new Set(slice.ids);
            bodies.forEach((body, i) => {
              body.root.visible = (was[i] as boolean) && ids.has(body.id);
            });
            eye.near = slice.nearKm / unitKm;
            eye.far = slice.farKm / unitKm;
            eye.updateProjectionMatrix();
            pass(scene, eye);
          }
        } finally {
          bodies.forEach((body, i) => {
            body.root.visible = was[i] as boolean;
          });
          gl.autoClear = autoClear ?? true;
        }
      };

      attach();
      return {
        scene,
        camera: eye,
        update() {
          const moving = compute();
          fresh = true;
          return clock.running || moving;
        },
        resize(w, h) {
          size = { width: Math.max(1, w), height: Math.max(1, h) };
          eye.aspect = size.width / size.height;
          skyEye.aspect = eye.aspect;
          eye.updateProjectionMatrix();
          skyEye.updateProjectionMatrix();
          fresh = false;
        },
        render,
        dispose() {
          for (const body of bodies) if (body.root.parent === scene) scene.remove(body.root);
          for (const object of skies) if (object.parent === sky) sky.remove(object as Object3DLike);
        },
      };
    },
    bind(view) {
      const draw = (): void => view.invalidate();
      bindings.add(draw);
      const stopCamera = camera.onChange(draw);
      hearClock ??= clock.onChange((change) => {
        if (change.reason === "tick") return;
        for (const redraw of [...bindings]) redraw();
      });
      return () => {
        bindings.delete(draw);
        stopCamera();
        if (bindings.size === 0) {
          hearClock?.();
          hearClock = undefined;
        }
      };
    },
    credits() {
      const seen = new Set<string>();
      const out: Credit[] = [];
      for (const layer of layers)
        for (const credit of layer.credits()) {
          if (seen.has(credit.text)) continue;
          seen.add(credit.text);
          out.push(credit);
        }
      return out;
    },
    dispose() {
      hearClock?.();
      hearClock = undefined;
      bindings.clear();
      for (const layer of layers) layer.dispose();
    },
  };
  return item;
}
