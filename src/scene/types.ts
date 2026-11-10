// The contract between a host that owns one scene, one camera and one clock, and the packages that each own a layer of it. three.js stays the page's own: these are the few
// shapes of three's objects a layer and the host agree on, so nothing here imports it and any three of the right shape fits.

/** A place or an offset in the SPX frame, in kilometres, as float64 numbers (never float32 scene units): J2000 equatorial, x to the vernal equinox, y to the celestial north pole, z = minus the equatorial y. */
export type Vec3Km = readonly [number, number, number];

/** What of a three `Object3D` the host touches. */
export interface Object3DLike {
  visible: boolean;
  parent: unknown;
  position: { set(x: number, y: number, z: number): unknown };
  scale: { setScalar(scale: number): unknown };
}

/** What of a three `Scene` the host uses. */
export interface SceneLike {
  add(object: Object3DLike): unknown;
  remove(object: Object3DLike): unknown;
}

/** What of a three `PerspectiveCamera` the host uses. */
export interface CameraLike {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  position: { set(x: number, y: number, z: number): unknown };
  up: { set(x: number, y: number, z: number): unknown };
  quaternion: { copy(other: unknown): unknown };
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
}

/** What of the `three` module the host uses. */
export interface SceneThree {
  Scene: new () => SceneLike;
  PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => CameraLike;
}

/** One credit for the page's credit line: what data or work the layer draws on. */
export interface Credit {
  /** The credit, in English. */
  text: string;
  /** The same in Japanese, when there is one. */
  textJa?: string;
  /** Where to read more. */
  href?: string;
}

/** One body a layer draws: a star, a planet, a rocket. */
export interface SceneBody {
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

/** What the host tells every layer each frame. */
export interface SceneFrame {
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
  camera: { positionKm: Vec3Km; fovDeg: number; heightPx: number };
  pixelRatio: number;
}

/** What a package gives a host: its bodies, an optional sky, and how to move them to a frame. */
export interface SceneLayer {
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
