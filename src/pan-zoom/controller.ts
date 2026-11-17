// A flat pan and zoom for a chart or a map: one finger or the mouse drags the content any way, two fingers pinch about their middle, the wheel zooms about the pointer, and the keys pan and zoom.
// The controller holds a view ({ x, y, zoom }) and tells the page when it changes; the page maps it onto its own projection. It draws nothing.
import { clampZoom, distance, panBy, wheelFactor, zoomAbout, type PanZoomView } from "./math.ts";

/** Why the view changed: `"drag"`, `"pinch"`, `"wheel"`, `"key"`, or `"api"` (a call to `set`, `panBy`, `zoomBy` or `reset`). */
export type PanZoomReason = "drag" | "pinch" | "wheel" | "key" | "api";

/** What the plain wheel does: `"zoom"` zooms about the pointer, as a map page does; `"modifier"` zooms only with Ctrl or Command held (a trackpad's pinch always arrives so) and lets the page scroll otherwise, as the 3D parts do; `"none"` leaves the wheel alone. */
export type PanZoomWheel = "zoom" | "modifier" | "none";

export interface PanZoomOptions {
  /** The smallest zoom (default 0.1). */
  minZoom?: number;
  /** The largest zoom (default 50). A sky wants 0.6 to 60. */
  maxZoom?: number;
  /** The view to start from and to go back to on `reset` (default `{ x: 0, y: 0, zoom: 1 }`). */
  home?: Partial<PanZoomView>;
  /** The plain wheel (default `"zoom"`). */
  wheel?: PanZoomWheel;
  /** Called after every change with the new view. */
  onChange?: (view: Readonly<PanZoomView>, reason: PanZoomReason) => void;
}

export interface PanZoomController {
  /** The view now (a copy). */
  readonly view: Readonly<PanZoomView>;
  readonly minZoom: number;
  readonly maxZoom: number;
  /** Change part of the view; the zoom is held inside the limits. */
  set(view: Partial<PanZoomView>): void;
  /** Move the content by pixels. */
  panBy(dx: number, dy: number): void;
  /** Multiply the zoom by `factor` about a point in CSS pixels from the middle of the element (the middle if left out). */
  zoomBy(factor: number, about?: { x: number; y: number }): void;
  /** Go back to the home view. */
  reset(): void;
  /** Listen on `element`. It sets `touch-action: none` on it (put back by the returned function) so a finger pans instead of scrolling the page. Returns a function that takes the listeners off. */
  bind(element: HTMLElement): () => void;
}

/** Arrow keys move the content by this share of the element's smaller side. */
const KEY_PAN = 0.1;
/** A zoom key multiplies the zoom by this. */
const KEY_ZOOM = 1.25;

/**
 * Make a pan and zoom controller.
 *
 * @example
 * ```ts no-check
 * const pz = createPanZoomController({ minZoom: 0.6, maxZoom: 60, onChange: (view) => draw(view) });
 * const unbind = pz.bind(canvas);
 * ```
 */
export function createPanZoomController(options: PanZoomOptions = {}): PanZoomController {
  const minZoom = options.minZoom !== undefined && options.minZoom > 0 ? options.minZoom : 0.1;
  const maxZoom = options.maxZoom !== undefined && options.maxZoom >= minZoom ? options.maxZoom : Math.max(50, minZoom);
  const home: PanZoomView = { x: options.home?.x ?? 0, y: options.home?.y ?? 0, zoom: clampZoom(options.home?.zoom ?? 1, minZoom, maxZoom) };
  const wheelRule = options.wheel ?? "zoom";
  let view: PanZoomView = { ...home };

  const apply = (next: PanZoomView, reason: PanZoomReason): void => {
    if (next.x === view.x && next.y === view.y && next.zoom === view.zoom) return;
    view = next;
    options.onChange?.({ ...view }, reason);
  };

  const controller: PanZoomController = {
    get view() {
      return { ...view };
    },
    minZoom,
    maxZoom,
    set(part) {
      const x = part.x !== undefined && Number.isFinite(part.x) ? part.x : view.x;
      const y = part.y !== undefined && Number.isFinite(part.y) ? part.y : view.y;
      const zoom = part.zoom !== undefined && part.zoom > 0 ? clampZoom(part.zoom, minZoom, maxZoom) : view.zoom;
      apply({ x, y, zoom }, "api");
    },
    panBy(dx, dy) {
      apply(panBy(view, dx, dy), "api");
    },
    zoomBy(factor, about = { x: 0, y: 0 }) {
      apply(zoomAbout(view, factor, about.x, about.y, minZoom, maxZoom), "api");
    },
    reset() {
      apply({ ...home }, "api");
    },
    bind(element) {
      const pointers = new Map<number, { x: number; y: number }>();
      const before = element.style.touchAction;
      element.style.touchAction = "none";

      /** A client point as CSS pixels from the element's middle. */
      const local = (clientX: number, clientY: number): { x: number; y: number } => {
        const box = element.getBoundingClientRect();
        return { x: clientX - (box.left + box.width / 2), y: clientY - (box.top + box.height / 2) };
      };
      const middle = (): { x: number; y: number } | null => {
        const [a, b] = [...pointers.values()];
        return a === undefined || b === undefined ? null : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      };
      const gap = (): number => {
        const [a, b] = [...pointers.values()];
        return a === undefined || b === undefined ? 0 : distance(a, b);
      };

      const down = (event: PointerEvent): void => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        
        if (pointers.size >= 2) return;
        pointers.set(event.pointerId, local(event.clientX, event.clientY));
        element.setPointerCapture?.(event.pointerId);
      };
      const move = (event: PointerEvent): void => {
        const old = pointers.get(event.pointerId);
        if (old === undefined) return;
        const now = local(event.clientX, event.clientY);
        if (pointers.size === 1) {
          pointers.set(event.pointerId, now);
          apply(panBy(view, now.x - old.x, now.y - old.y), "drag");
          return;
        }
        const startMiddle = middle();
        const startGap = gap();
        pointers.set(event.pointerId, now);
        const endMiddle = middle();
        const endGap = gap();
        if (startMiddle === null || endMiddle === null) return;
        // the content follows the fingers' middle, and the zoom follows how far apart they are, about that middle
        const moved = panBy(view, endMiddle.x - startMiddle.x, endMiddle.y - startMiddle.y);
        apply(startGap > 0 ? zoomAbout(moved, endGap / startGap, endMiddle.x, endMiddle.y, minZoom, maxZoom) : moved, "pinch");
      };
      const up = (event: PointerEvent): void => {
        pointers.delete(event.pointerId);
        element.releasePointerCapture?.(event.pointerId);
      };
      const wheel = (event: WheelEvent): void => {
        if (wheelRule === "none" || (wheelRule === "modifier" && !event.ctrlKey && !event.metaKey)) return;
        event.preventDefault();
        const at = local(event.clientX, event.clientY);
        apply(zoomAbout(view, wheelFactor(event.deltaY, event.deltaMode, element.getBoundingClientRect().height), at.x, at.y, minZoom, maxZoom), "wheel");
      };
      const key = (event: KeyboardEvent): void => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const box = element.getBoundingClientRect();
        const step = Math.min(box.width, box.height) * KEY_PAN;
        let next: PanZoomView | null = null;
        // an arrow moves the content the way the key points: ArrowLeft shows more to the left, so the content goes right
        if (event.key === "ArrowLeft") next = panBy(view, step, 0);
        else if (event.key === "ArrowRight") next = panBy(view, -step, 0);
        else if (event.key === "ArrowUp") next = panBy(view, 0, step);
        else if (event.key === "ArrowDown") next = panBy(view, 0, -step);
        else if (event.key === "+" || event.key === "=") next = zoomAbout(view, KEY_ZOOM, 0, 0, minZoom, maxZoom);
        else if (event.key === "-" || event.key === "_") next = zoomAbout(view, 1 / KEY_ZOOM, 0, 0, minZoom, maxZoom);
        else if (event.key === "Home") next = { ...home };
        if (next === null) return;
        event.preventDefault();
        apply(next, "key");
      };

      element.addEventListener("pointerdown", down);
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", up);
      element.addEventListener("wheel", wheel, { passive: false });
      element.addEventListener("keydown", key);
      return () => {
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", up);
        element.removeEventListener("wheel", wheel);
        element.removeEventListener("keydown", key);
        element.style.touchAction = before;
        pointers.clear();
      };
    },
  };
  return controller;
}
