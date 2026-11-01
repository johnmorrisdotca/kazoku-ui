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

/** Hold the pan so the picture still covers the view: at zoom z the picture may move (z - 1) / 2 of the view's size either way. */
export function clampPan(camera: Camera, size: Size | undefined): Camera {
  if (camera.zoom <= 1) return { ...camera, panX: 0, panY: 0 };
  if (size === undefined) return camera;
  const roomX = (size.width * (camera.zoom - 1)) / 2;
  const roomY = (size.height * (camera.zoom - 1)) / 2;
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

/** A one-pointer drag that turns: `dx` and `dy` pixels from where it began, in a view of `size`. A finger does not tilt (the page's own scroll keeps the vertical drag). */
export function dragTurn(start: Camera, dx: number, dy: number, size: Size, tips: boolean, limits: Limits = DEFAULT_LIMITS): Pick<Camera, "yaw" | "tilt"> {
  const yaw = wrapYaw(start.yaw + (dx / (size.width || 360)) * TURN_ACROSS);
  const tilt = tips ? clamp(start.tilt - (dy / (size.height || 360)) * TILT_ACROSS, -limits.tiltMax, limits.tiltMax) : start.tilt;
  return { yaw, tilt };
}

/** The factor a Ctrl or Command wheel turn zooms by (a trackpad's pinch arrives that way). `deltaMode` 1 is lines. */
export const wheelZoomFactor = (deltaY: number, deltaMode: number): number => Math.exp(-deltaY * (deltaMode === 1 ? 0.05 : 0.01));
