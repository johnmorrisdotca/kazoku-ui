// The zoom slider's scale: pure, so a server or a test can use it. The slider is logarithmic, so one press of + or - moves it the same distance anywhere
// along it, and its marks are the ends and the common zooms between them (1×, 2× and so on) that have room for a label.

/** The zooms a mark goes to, the most wanted first: when two are too close for both labels, the earlier one stays. */
export const COMMON_ZOOMS: readonly number[] = [1, 2, 4, 0.5, 3, 10, 8, 5, 0.25, 6, 16, 20, 32, 50, 64, 100];

/** The least distance between two marks, as a share of the slider's length, so their labels never touch. */
export const MARK_GAP = 0.18;

/** One key press on the slider multiplies or divides the zoom by this: finer than a press of + or -. */
export const SLIDER_STEP = 1.1;

/** How near a mark a drag lets go to it, in pixels: a gentle pull, never a forced step. */
export const SNAP_PX = 8;

/** A mark of the slider: its zoom, where it sits from 0 (the least zoom) to 1 (the most), and whether it is an end. */
export interface ZoomMark {
  zoom: number;
  at: number;
  end: boolean;
}

const span = (min: number, max: number): number => Math.log(max / min);

/** Where a zoom sits on the slider, from 0 at `min` to 1 at `max`, held to that range. */
export function zoomPosition(zoom: number, min: number, max: number): number {
  const whole = span(min, max);
  if (!(whole > 0) || !(zoom > 0)) return 0;
  return Math.min(1, Math.max(0, Math.log(zoom / min) / whole));
}

/** The zoom at a place on the slider, 0 to 1. */
export function zoomAtPosition(at: number, min: number, max: number): number {
  const place = Math.min(1, Math.max(0, at));
  if (place === 0) return min;
  if (place === 1) return max;
  return min * Math.exp(place * span(min, max));
}

/** The slider's marks for the range `min` to `max`, in order: both ends, then the common zooms inside that keep `gap` from every other mark. None when there is no range. */
export function zoomMarks(min: number, max: number, gap: number = MARK_GAP): ZoomMark[] {
  if (!(min > 0) || !(max > min * 1.0001)) return [];
  const marks: ZoomMark[] = [
    { zoom: min, at: 0, end: true },
    { zoom: max, at: 1, end: true },
  ];
  for (const zoom of COMMON_ZOOMS) {
    if (zoom <= min || zoom >= max) continue;
    const at = zoomPosition(zoom, min, max);
    if (marks.every((mark) => Math.abs(mark.at - at) >= gap - 1e-9)) marks.push({ zoom, at, end: false });
  }
  return marks.sort((a, b) => a.zoom - b.zoom);
}

const NEAR = 1e-6;

/** Page Up and Page Down: the next mark above (`direction` 1) or below (-1) the zoom now, else the end. */
export function zoomToMark(zoom: number, marks: readonly ZoomMark[], direction: 1 | -1, min: number, max: number): number {
  if (direction > 0) return marks.find((mark) => mark.zoom > zoom * (1 + NEAR))?.zoom ?? max;
  return [...marks].reverse().find((mark) => mark.zoom < zoom * (1 - NEAR))?.zoom ?? min;
}

/** An arrow key: one `SLIDER_STEP` up or down, held to the range, stopping first on a mark it would pass, so 1.9× goes to 2× and the next press goes on past it. */
export function zoomStep(zoom: number, marks: readonly ZoomMark[], direction: 1 | -1, min: number, max: number, factor: number = SLIDER_STEP): number {
  const next = Math.min(max, Math.max(min, direction > 0 ? zoom * factor : zoom / factor));
  const passed = direction > 0 ? marks.find((mark) => mark.zoom > zoom * (1 + NEAR) && mark.zoom < next * (1 - NEAR)) : [...marks].reverse().find((mark) => mark.zoom < zoom * (1 - NEAR) && mark.zoom > next * (1 + NEAR));
  return passed?.zoom ?? next;
}

/** A drag that ends near a mark goes to it: within `tolerance` of the slider's length (`SNAP_PX` over its length in pixels); anywhere else it stays where it is. */
export function zoomSnap(zoom: number, marks: readonly ZoomMark[], min: number, max: number, tolerance: number): number {
  const at = zoomPosition(zoom, min, max);
  let best: ZoomMark | undefined;
  for (const mark of marks) if (Math.abs(mark.at - at) <= tolerance && (best === undefined || Math.abs(mark.at - at) < Math.abs(best.at - at))) best = mark;
  return best?.zoom ?? zoom;
}
