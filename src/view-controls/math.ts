// The view's arithmetic: pure functions, no DOM, no clock. The controller and the tests both use them.

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** What a gesture or a control changes. `panX` and `panY` are CSS pixels from the middle of the view. */
export interface Camera {
  yaw: number;
  tilt: number;
  /** Degrees about the view's forward axis. Left out, it is 0. */
  roll?: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface Limits {
  tiltMax: number;
  /** How far a hand may roll, in degrees. 180 (the default) is a full turn. */
  rollMax: number;
  zoomMin: number;
  zoomMax: number;
}

/** Zoom draws no more pixels (the canvas is a fixed size), so the default range is wide: from a tenth of Fit to 50 times it. A package passes its own `zoomMax` where its detail runs out. */
export const DEFAULT_LIMITS: Limits = { tiltMax: 30, rollMax: 180, zoomMin: 0.1, zoomMax: 50 };

/**
 * The limits an element's attributes ask for over `base`: `tilt-max`, `roll-max`, `zoom-min` and `zoom-max`, each a positive number or ignored. `zoom-min` is held to 1 or less and `zoom-max` to `zoom-min` or more,
 * so Fit is always inside the range.
 */
export function readLimits(get: (name: string) => string | null | undefined, base: Limits = DEFAULT_LIMITS): Limits {
  const read = (name: string, fallback: number): number => {
    const value = Number(get(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const zoomMin = Math.min(1, read("zoom-min", base.zoomMin));
  return { tiltMax: read("tilt-max", base.tiltMax), rollMax: read("roll-max", base.rollMax), zoomMin, zoomMax: Math.max(zoomMin, read("zoom-max", base.zoomMax)) };
}

/** Degrees of turn across the view's whole width (a half turn), and of tilt across its whole height. */
export const TURN_ACROSS = 180;
export const TILT_ACROSS = 60;
/** The arrow pad moves the view by this fraction of the view's size. */
export const PAN_STEP = 0.25;
/** A zoom button multiplies the zoom by this. */
export const ZOOM_STEP = 1.4;
/** At or below this zoom the view counts as not zoomed (a drag turns it, the pan pad is hidden). */
export const ZOOMED = 1.05;

export const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** An angle brought into [-180, 180). */
export const wrapYaw = (angle: number): number => ((((angle + 180) % 360) + 360) % 360) - 180;

/** Zoom to `next` (held between the limits) keeping the point `at` (pixels from the view's middle) where it is. At Fit or below the view goes back to the middle, unless it may move at any zoom (`free`). */
export function zoomAbout(camera: Camera, next: number, at: Point, limits: Limits = DEFAULT_LIMITS, free = false): Camera {
  const zoom = clamp(next, limits.zoomMin, limits.zoomMax);
  const k = zoom / camera.zoom;
  const atOne = zoom <= 1 && !free;
  return { ...camera, zoom, panX: atOne ? 0 : at.x - (at.x - camera.panX) * k, panY: atOne ? 0 : at.y - (at.y - camera.panY) * k };
}

/**
 * Hold the pan so the object cannot be lost. By default the object is the picture, which fills the view at Fit: at zoom z it may move (z - 1) / 2 of the view's size either way, so the picture still covers the view.
 * A page whose object is smaller than the view gives its `object` (its size at Fit, in CSS pixels): it may then move until a quarter of it is still in view, in a view of any size, so it can never be dragged out.
 * A page that may be moved at any zoom (a 3D space whose zoom is far below 1) gives `free`, a share of the view's size: the view may then move that share of its width and height either way at
 * every zoom, zoomed out too, and never less than the room above.
 */
export function clampPan(camera: Camera, size: Size | undefined, object?: Size, free?: number): Camera {
  const loose = free !== undefined && free > 0 && Number.isFinite(free);
  if (camera.zoom <= 1 && !loose) return { ...camera, panX: 0, panY: 0 };
  if (size === undefined) return camera;
  const zoomed = camera.zoom > 1;
  const roomX = Math.max(zoomed ? (object === undefined ? (size.width * (camera.zoom - 1)) / 2 : size.width / 2 + (object.width * camera.zoom) / 4) : 0, loose ? size.width * free : 0);
  const roomY = Math.max(zoomed ? (object === undefined ? (size.height * (camera.zoom - 1)) / 2 : size.height / 2 + (object.height * camera.zoom) / 4) : 0, loose ? size.height * free : 0);
  return { ...camera, panX: clamp(camera.panX, -roomX, roomX), panY: clamp(camera.panY, -roomY, roomY) };
}

/** What a pinch starts from: the distance between two fingers, their middle, the camera at that moment, and the fingers' angle when a twist should roll. */
export interface PinchStart {
  distance: number;
  middle: Point;
  camera: Camera;
  /** `atan2` of the fingers, in radians. Left out, a twist does not roll. */
  angle?: number;
}

/** The camera for two fingers now at `a` and `b`: zoom by the change of distance about where the pinch began, the middle of the fingers drags the view, and a twist rolls about the view axis. `centre` is the view's middle in client pixels. `free`: the view may move at any zoom, so the fingers drag it zoomed out too. */
export function pinchTo(start: PinchStart, a: Point, b: Point, centre: Point, limits: Limits = DEFAULT_LIMITS, free = false): Camera {
  const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const zoomed = zoomAbout(start.camera, start.camera.zoom * (distance / start.distance), { x: start.middle.x - centre.x, y: start.middle.y - centre.y }, limits, free);
  const placed = zoomed.zoom <= 1 && !free ? zoomed : { ...zoomed, panX: zoomed.panX + (middle.x - start.middle.x), panY: zoomed.panY + (middle.y - start.middle.y) };
  if (start.angle === undefined) return placed;
  let turned = Math.atan2(b.y - a.y, b.x - a.x) - start.angle;
  if (turned > Math.PI) turned -= 2 * Math.PI;
  if (turned < -Math.PI) turned += 2 * Math.PI;
  return { ...placed, roll: wrapYaw((start.camera.roll ?? 0) + (turned * 180) / Math.PI) };
}

/** Degrees of turn for one pixel of drag when the piece's on-screen radius is `radius` pixels: the pixel that a point at the middle of a sphere's face moves by, so the touched point stays under the pointer. */
export const degreesPerPixel = (radius: number): number => (180 / Math.PI) / radius;

/**
 * A one-pointer drag that turns: `dx` and `dy` pixels from where it began, in a view of `size`. A finger does not tilt (the page's own scroll keeps the vertical drag). A `step` above 0 rounds the tilt to a multiple of it.
 * A `grabRadius` above 0 is the on-screen radius, in pixels, of a globe or any turnable piece: both axes then turn by the angle that carries a point at the middle of its face by the pixels dragged (`degreesPerPixel`), instead of a fixed angle across the view.
 */
export function dragTurn(start: Camera, dx: number, dy: number, size: Size, tips: boolean, limits: Limits = DEFAULT_LIMITS, step = 0, grabRadius = 0): Pick<Camera, "yaw" | "tilt"> {
  const exact = grabRadius > 0 && Number.isFinite(grabRadius) ? degreesPerPixel(grabRadius) : 0;
  const yaw = wrapYaw(start.yaw + (exact > 0 ? dx * exact : (dx / (size.width || 360)) * TURN_ACROSS));
  const raw = start.tilt - (exact > 0 ? dy * exact : (dy / (size.height || 360)) * TILT_ACROSS);
  const tilt = tips ? clamp(step > 0 ? Math.round(raw / step) * step : raw, -limits.tiltMax, limits.tiltMax) : start.tilt;
  return { yaw, tilt };
}

/**
 * A sideways drag that rolls about the view axis. Positive `dx` rolls clockwise, so the surface above the middle moves with the pointer.
 * The degrees per pixel are the same as a turn (`dragTurn`).
 */
export function dragRoll(start: Camera, dx: number, size: Size, grabRadius = 0): number {
  const exact = grabRadius > 0 && Number.isFinite(grabRadius) ? degreesPerPixel(grabRadius) : 0;
  const turned = exact > 0 ? dx * exact : (dx / (size.width || 360)) * TURN_ACROSS;
  return wrapYaw((start.roll ?? 0) + turned);
}

/** The camera `fraction` of the way (0 to 1) from `from` to `to`, eased out: quick at first, slow at the end. */
export function between(from: Camera, to: Camera, fraction: number): Camera {
  const t = 1 - (1 - clamp(fraction, 0, 1)) ** 3;
  const mix = (a: number, b: number): number => a + (b - a) * t;
  return { yaw: mix(from.yaw, to.yaw), tilt: mix(from.tilt, to.tilt), roll: mix(from.roll ?? 0, to.roll ?? 0), zoom: mix(from.zoom, to.zoom), panX: mix(from.panX, to.panX), panY: mix(from.panY, to.panY) };
}

/**
 * The factor a wheel turn zooms by: up (a negative `deltaY`) zooms in. `deltaMode` 1 is lines and 2 is pages. `kind` `"pinch"` (the default) is a
 * trackpad's pinch, which arrives as Ctrl and the wheel in small steps; `"wheel"` is Alt and a mouse wheel, whose steps are larger
 * (about 100 pixels a notch), so one notch zooms about 1.2 times, close to the + key, and one such event never zooms more than 2 times either way.
 */
export const wheelZoomFactor = (deltaY: number, deltaMode: number, kind: "pinch" | "wheel" = "pinch"): number => {
  const pixels = deltaMode === 1 ? deltaY * (kind === "pinch" ? 5 : 33) : deltaMode === 2 ? deltaY * 800 : deltaY;
  return kind === "pinch" ? Math.exp(-pixels * 0.01) : clamp(Math.exp(-pixels * 0.002), 0.5, 2);
};

/** Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel or one swipe (with its glide). */
export const WHEEL_GESTURE_MS = 300;

/** Pixels one axis of a wheel or a swipe moves the view. A line is 16 pixels and a page is `page` pixels. The sign is the event's own. */
export const wheelPanPixels = (delta: number, deltaMode: number, page = 800): number =>
  deltaMode === 1 ? delta * 16 : deltaMode === 2 ? delta * page : delta;

/**
 * What one wheel event asks of the view. Ctrl, Command or Alt zoom about the pointer (a trackpad pinch arrives as Ctrl and small steps).
 * A plain wheel moves the view, and Shift and the wheel moves it sideways. A positive delta moves the picture up or to the left, the way a page scrolls.
 */
export function wheelMove(
  event: { deltaX: number; deltaY: number; deltaMode: number; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean },
  page = 800,
): { zoom: boolean; panX: number; panY: number } {
  if (event.ctrlKey || event.metaKey || event.altKey) return { zoom: true, panX: 0, panY: 0 };
  const dx = wheelPanPixels(event.shiftKey ? event.deltaY + event.deltaX : event.deltaX, event.deltaMode, page);
  const dy = event.shiftKey ? 0 : wheelPanPixels(event.deltaY, event.deltaMode, page);
  return { zoom: false, panX: -dx, panY: -dy };
}

/** A rotation. `w` is the real part. The identity is `{ x: 0, y: 0, z: 0, w: 1 }`. */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const DEG = Math.PI / 180;

export const quatIdentity = (): Quat => ({ x: 0, y: 0, z: 0, w: 1 });

/** Which way a signed rate points: -1 or 1. Zero and anything that is not a number count as 1. */
export const rateSign = (value: number): number => (value < 0 ? -1 : 1);

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

export const normalizeQuat = (q: Quat): Quat => {
  const n = Math.hypot(finite(q.x), finite(q.y), finite(q.z), finite(q.w)) || 1;
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
};

const axisQuat = (x: number, y: number, z: number, radians: number): Quat => {
  const half = finite(radians) / 2;
  const s = Math.sin(half);
  return { x: x * s, y: y * s, z: z * s, w: Math.cos(half) };
};

const mulQuat = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});

/**
 * Yaw about Y, then tilt about X, then roll about Z, in degrees. Past a right angle the numbers fold, so a tumble that rolls over keeps its quaternion and only shows these for the sliders.
 */
export function quatFromEuler(yaw: number, tilt: number, roll: number): Quat {
  const qy = axisQuat(0, 1, 0, finite(yaw) * DEG);
  const qx = axisQuat(1, 0, 0, finite(tilt) * DEG);
  const qz = axisQuat(0, 0, 1, finite(roll) * DEG);
  return normalizeQuat(mulQuat(mulQuat(qy, qx), qz));
}

/** The yaw, tilt and roll a quaternion shows on the sliders. Tilt stays within a right angle; the quaternion itself does not flip. */
export function eulerFromQuat(q: Quat): { yaw: number; tilt: number; roll: number } {
  const { x, y, z, w } = normalizeQuat(q);
  const tilt = Math.asin(clamp(2 * (w * x - y * z), -1, 1)) / DEG;
  const yaw = Math.atan2(2 * (w * y + z * x), 1 - 2 * (x * x + y * y)) / DEG;
  const roll = Math.atan2(2 * (w * z + x * y), 1 - 2 * (x * x + z * z)) / DEG;
  return { yaw: wrapYaw(yaw), tilt, roll: wrapYaw(roll) };
}

/**
 * Turn `q` by `yaw`, `tilt` and `roll` degrees about its own axes (Y, X, then Z). Small steps stay continuous through the poles: the up vector never jumps.
 */
export function spinLocal(q: Quat, yaw: number, tilt: number, roll: number): Quat {
  const turn = mulQuat(mulQuat(axisQuat(0, 1, 0, finite(yaw) * DEG), axisQuat(1, 0, 0, finite(tilt) * DEG)), axisQuat(0, 0, 1, finite(roll) * DEG));
  return normalizeQuat(mulQuat(normalizeQuat(q), turn));
}

/** The view's up axis after `q`. */
export function upVector(q: Quat): Vec3 {
  const { x, y, z, w } = normalizeQuat(q);
  return {
    x: 2 * (x * y - w * z),
    y: 1 - 2 * (x * x + z * z),
    z: 2 * (y * z + w * x),
  };
}

/**
 * Tilt swinging inside `amplitude` degrees. `phase` is radians of the swing. At the ends it comes back, so a limited tilt never rolls over.
 */
export const pendulumTilt = (phase: number, amplitude: number): number => finite(amplitude) * Math.sin(finite(phase));

export interface TumbleSigns {
  yaw: number;
  tilt: number;
  roll: number;
}

/**
 * Degrees a second for a tumble. The three rates differ, and each drifts on its own incommensurate wave, so the motion does not repeat.
 * `speed` is the size of the angle's rate. A sign below 0 reverses that axis.
 */
export function tumbleRates(seconds: number, speed: number, signs: TumbleSigns): TumbleSigns {
  const t = finite(seconds);
  const base = finite(speed);
  const wave = (hz: number, phase: number): number => 1 + 0.08 * Math.sin(t * hz + phase);
  return {
    yaw: base * rateSign(signs.yaw) * wave(0.17 * Math.PI, 0.4),
    tilt: base * rateSign(signs.tilt) * 0.61 * wave(0.13 * Math.E, 1.7),
    roll: base * rateSign(signs.roll) * 0.43 * wave(0.11 * Math.SQRT2, 2.5),
  };
}
