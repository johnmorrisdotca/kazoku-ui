// The arithmetic of a flat pan and zoom: pure functions, no DOM. A view is where the content sits (`x`, `y`, CSS pixels from the middle of the element) and how big it is (`zoom`, 1 is Fit).

export interface PanZoomView {
  /** CSS pixels the content has moved right of the element's middle. */
  x: number;
  /** CSS pixels the content has moved below the element's middle. */
  y: number;
  /** 1 is Fit; 2 draws the content twice as big. */
  zoom: number;
}

export const clampZoom = (zoom: number, min: number, max: number): number => Math.min(max, Math.max(min, zoom));

/**
 * The view after multiplying the zoom by `factor` about the point (`px`, `py`), in CSS pixels from the element's middle: the content under that point stays under it. The zoom is held
 * between `min` and `max`, and a held zoom moves the content no more than the held factor says.
 */
export function zoomAbout(view: PanZoomView, factor: number, px: number, py: number, min: number, max: number): PanZoomView {
  if (!(factor > 0) || !Number.isFinite(factor)) return view;
  const zoom = clampZoom(view.zoom * factor, min, max);
  const real = zoom / view.zoom;
  return { x: px - (px - view.x) * real, y: py - (py - view.y) * real, zoom };
}

/** The view moved by (`dx`, `dy`) pixels. */
export const panBy = (view: PanZoomView, dx: number, dy: number): PanZoomView => ({ x: view.x + dx, y: view.y + dy, zoom: view.zoom });

/** A wheel's turn as a zoom factor: 0.2% for each pixel, so a notch of 100 is about 1.22 and the opposite notch undoes it. A wheel that counts in lines (`deltaMode` 1) or pages (2) is scaled to pixels first. */
export function wheelFactor(deltaY: number, deltaMode = 0, height = 800): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * height : deltaY;
  return Math.exp(-pixels * 0.002);
}

/** The distance between two points. */
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
