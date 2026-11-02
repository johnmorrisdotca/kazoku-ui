// What saving needs that is not the DOM: the formats, the file name and the size of the picture. Nothing here touches the DOM.

export const FORMATS = ["png", "svg"] as const;
export type Format = (typeof FORMATS)[number];
/** What a target is: a canvas, an SVG, or any other element (drawn through an SVG `foreignObject`). */
export type TargetKind = "canvas" | "svg" | "element";

export const MIME: Record<Format, string> = { png: "image/png", svg: "image/svg+xml" };
/** The most a picture may be on one side, and in all: past these a canvas fails in some browsers, so the scale is lowered instead. */
export const MAX_SIDE = 8192;
export const MAX_PIXELS = 36_000_000;

/** The formats of `formats="png svg"`: the known ones, once each, in the order given. Nothing usable gives `png` and `svg`. */
export function parseFormats(value: string | null | undefined): Format[] {
  const found: Format[] = [];
  for (const word of (value ?? "").toLowerCase().split(/[\s,]+/)) if ((FORMATS as readonly string[]).includes(word) && !found.includes(word as Format)) found.push(word as Format);
  return found.length > 0 ? found : [...FORMATS];
}

/** Which formats a kind of target can give: an SVG both, a canvas and any other element a PNG. */
export const formatsFor = (kind: TargetKind): readonly Format[] => (kind === "svg" ? FORMATS : ["png"]);

/** A file name that is safe on any system, with the format's extension: no path, no control or reserved characters, at most 80 characters of name. */
export function filenameFor(name: string | null | undefined, format: Format): string {
  const base = (name ?? "")
    .normalize("NFC")
    .replace(/\.(png|svg)$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\p{Cc}+/gu, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s.-]+|[\s.-]+$/g, "")
    .slice(0, 80)
    .trim();
  return `${base === "" ? "image" : base}.${format}`;
}

/** The pixels of a PNG of a target `width` by `height` CSS pixels at `scale`: whole pixels, and the scale lowered so that no side passes MAX_SIDE and the whole stays within MAX_PIXELS. */
export function pixelSize(width: number, height: number, scale: number): { width: number; height: number; scale: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  let s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  s = Math.min(s, MAX_SIDE / w, MAX_SIDE / h, Math.sqrt(MAX_PIXELS / (w * h)));
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)), scale: s };
}
