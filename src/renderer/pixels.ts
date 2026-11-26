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

/** Most pixels along the long side of a still a host may ask for with `data-still-size` (2048 by 2048 is 4.2 million pixels, inside `MAX_PIXELS`). */
export const MAX_STILL_SIDE = 2048;

/**
 * The long side of a still, in pixels: the `data-still-size` a host asks for (`stillAskedFor`) if it is a number above 0 (held to 16 and to `MAX_STILL_SIDE` and the renderer's side limit,
 * rounded), else the renderer's own `base`. A big body drawn 1,600 CSS pixels wide asks for a still near that, and a small tile keeps the renderer's small one.
 */
export function stillSideFor(asked: string | null | undefined, base: number, limits: PixelLimits = {}): number {
  const wanted = Number(asked);
  if (asked === null || asked === undefined || asked.trim() === "" || !Number.isFinite(wanted) || wanted <= 0) return base;
  return Math.round(Math.max(16, Math.min(wanted, MAX_STILL_SIDE, limits.maxSide ?? MAX_SIDE)));
}

/** The still cache's key for a thing at a size: the thing's own key at the renderer's own size (as before), and `key@side` at any other, so one thing at two sizes is two pictures. */
export function stillKeyFor(key: string, side: number, base: number): string {
  return side === base ? key : `${key}@${side}`;
}

/** What `stillAskedFor` needs of a node: an attribute, a parent, and the shadow root it is in (whose `host` is the next one up). Duck-typed so a test needs no DOM. */
export interface StillNode {
  getAttribute?(name: string): string | null;
  parentElement?: StillNode | null;
  getRootNode?(): object | null | undefined;
}

/**
 * The `data-still-size` a view's host asks for: its own, else the nearest ancestor's, going up out of shadow roots to the element that holds them (a custom element
 * around a stage in its shadow root puts the attribute on itself, not on the stage). The first value that is a number above 0 wins, so a page may set it on the
 * element it owns; `null` when none does.
 */
export function stillAskedFor(host: StillNode | null | undefined): string | null {
  const seen = new Set<StillNode>();
  let node = host ?? null;
  while (node && !seen.has(node)) {
    seen.add(node);
    const asked = node.getAttribute?.("data-still-size") ?? null;
    if (asked !== null && asked.trim() !== "" && Number.isFinite(Number(asked)) && Number(asked) > 0) return asked;
    const root = node.getRootNode?.();
    node = node.parentElement ?? (root as { host?: StillNode | null } | null | undefined)?.host ?? null;
  }
  return null;
}
