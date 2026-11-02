// The pixel budget of a canvas, in one place: a canvas of a big screen at a high pixel ratio is tens of millions of pixels (a 5K screen at ratio 2 asked for
// 24 MP in one package), and a GPU that is asked for that stalls the page. Pure, so a server or a test can use it.

/** Most pixels a canvas may hold. */
export const MAX_PIXELS = 6_000_000;
/** Most pixels along one side (a common GPU texture limit). */
export const MAX_SIDE = 4096;
/** Most device pixels to a CSS pixel; a ratio of 3 or 4 adds detail nobody sees on a moving 3D view. */
export const MAX_RATIO = 2;

export interface PixelLimits {
  maxPixels?: number;
  maxSide?: number;
  maxRatio?: number;
}

/**
 * The pixel ratio to draw a `width` by `height` CSS pixel canvas at: the device's, held to `maxRatio`, then lowered until the canvas fits `maxPixels` and
 * `maxSide`. Rounded down, so `floor(width * ratio)` never passes a limit. A view bigger than the limits on its own is drawn below 1 and scaled up by CSS.
 */
export function pixelRatioFor(width: number, height: number, deviceRatio: number, limits: PixelLimits = {}): number {
  const { maxPixels = MAX_PIXELS, maxSide = MAX_SIDE, maxRatio = MAX_RATIO } = limits;
  if (!(width > 0) || !(height > 0)) return 1;
  let ratio = Math.min(Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1, maxRatio);
  ratio = Math.min(ratio, maxSide / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
  const floored = Math.floor(ratio * 1000) / 1000;
  // Floating point can leave the product a pixel over a limit; step down until it is not.
  let r = Math.max(floored, 0.001);
  while (r > 0.001 && (Math.floor(width * r) * Math.floor(height * r) > maxPixels || Math.max(Math.floor(width * r), Math.floor(height * r)) > maxSide)) r = Math.floor((r - 0.001) * 1000) / 1000;
  return r;
}
