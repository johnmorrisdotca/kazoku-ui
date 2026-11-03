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
  zoom: number;
  panX: number;
  panY: number;
}

export interface Limits {
  tiltMax: number;
  zoomMin: number;
  zoomMax: number;
}

export const DEFAULT_LIMITS: Limits = { tiltMax: 30, zoomMin: 1, zoomMax: 5 };

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

/** Zoom to `next` (held between the limits) keeping the point `at` (pixels from the view's middle) where it is. */
export function zoomAbout(camera: Camera, next: number, at: Point, limits: Limits = DEFAULT_LIMITS): Camera {
  const zoom = clamp(next, limits.zoomMin, limits.zoomMax);
  const k = zoom / camera.zoom;
  const atOne = zoom <= 1;
  return { ...camera, zoom, panX: atOne ? 0 : at.x - (at.x - camera.panX) * k, panY: atOne ? 0 : at.y - (at.y - camera.panY) * k };
}

/**
 * Hold the pan so the object cannot be lost. By default the object is the picture, which fills the view at Fit: at zoom z it may move (z - 1) / 2 of the view's size either way, so the picture still covers the view.
 * A page whose object is smaller than the view gives its `object` (its size at Fit, in CSS pixels): it may then move until a quarter of it is still in view, in a view of any size, so it can never be dragged out.
 */
export function clampPan(camera: Camera, size: Size | undefined, object?: Size): Camera {
  if (camera.zoom <= 1) return { ...camera, panX: 0, panY: 0 };
  if (size === undefined) return camera;
  const roomX = object === undefined ? (size.width * (camera.zoom - 1)) / 2 : size.width / 2 + (object.width * camera.zoom) / 4;
  const roomY = object === undefined ? (size.height * (camera.zoom - 1)) / 2 : size.height / 2 + (object.height * camera.zoom) / 4;
  return { ...camera, panX: clamp(camera.panX, -roomX, roomX), panY: clamp(camera.panY, -roomY, roomY) };
}

/** What a pinch starts from: the distance between two fingers, their middle, and the camera at that moment. */
export interface PinchStart {
  distance: number;
  middle: Point;
  camera: Camera;
}

/** The camera for two fingers now at `a` and `b`: zoom by the change of distance about where the pinch began, and the middle of the fingers also drags the view. `centre` is the view's middle in client pixels. */
export function pinchTo(start: PinchStart, a: Point, b: Point, centre: Point, limits: Limits = DEFAULT_LIMITS): Camera {
  const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const zoomed = zoomAbout(start.camera, start.camera.zoom * (distance / start.distance), { x: start.middle.x - centre.x, y: start.middle.y - centre.y }, limits);
  if (zoomed.zoom <= 1) return zoomed;
  return { ...zoomed, panX: zoomed.panX + (middle.x - start.middle.x), panY: zoomed.panY + (middle.y - start.middle.y) };
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

/** The camera `fraction` of the way (0 to 1) from `from` to `to`, eased out: quick at first, slow at the end. */
export function between(from: Camera, to: Camera, fraction: number): Camera {
  const t = 1 - (1 - clamp(fraction, 0, 1)) ** 3;
  const mix = (a: number, b: number): number => a + (b - a) * t;
  return { yaw: mix(from.yaw, to.yaw), tilt: mix(from.tilt, to.tilt), zoom: mix(from.zoom, to.zoom), panX: mix(from.panX, to.panX), panY: mix(from.panY, to.panY) };
}

/**
 * The factor a wheel turn zooms by: up (a negative `deltaY`) zooms in. `deltaMode` 1 is lines and 2 is pages. `kind` `"pinch"` (the default) is a
 * trackpad's pinch, which arrives as Ctrl and the wheel in small steps; `"wheel"` is a plain wheel or two-finger scroll, whose steps are larger
 * (about 100 pixels a notch), so one notch zooms about 1.2 times, close to the + key, and one such event never zooms more than 2 times either way.
 */
export const wheelZoomFactor = (deltaY: number, deltaMode: number, kind: "pinch" | "wheel" = "pinch"): number => {
  const pixels = deltaMode === 1 ? deltaY * (kind === "pinch" ? 5 : 33) : deltaMode === 2 ? deltaY * 800 : deltaY;
  return kind === "pinch" ? Math.exp(-pixels * 0.01) : clamp(Math.exp(-pixels * 0.002), 0.5, 2);
};

/** Wheel steps closer together than this, in milliseconds, belong to one turn of the wheel or one swipe (with its glide). */
export const WHEEL_GESTURE_MS = 300;
