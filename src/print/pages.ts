// Page sizes, margins and the layout choices every printed sheet shares. Pure: no DOM.
import type { Language } from "./words.ts";

export type PageName = "a4" | "letter" | "a3" | "tabloid";
export type Orientation = "portrait" | "landscape";
export type TypeName = "kid" | "normal";

export interface PageSize {
  widthMm: number;
  heightMm: number;
}

/** The sizes a sheet is printed on, in millimetres, in portrait. */
export const PAGES: Record<PageName, PageSize> = {
  a4: { widthMm: 210, heightMm: 297 },
  letter: { widthMm: 215.9, heightMm: 279.4 },
  a3: { widthMm: 297, heightMm: 420 },
  tabloid: { widthMm: 279.4, heightMm: 431.8 },
};

/** Half an inch. Home printers cannot print right to the edge (most stop 3 to 6 mm short), so nothing the sheet needs sits nearer than this. */
export const DEFAULT_MARGIN_MM = 12.7;

/** The least margin allowed; a smaller one is raised to it, so a sheet never loses its edge on a home printer. */
export const MIN_MARGIN_MM = 8;

export interface Layout {
  page: PageName;
  orientation: Orientation;
  marginMm: number;
  type: TypeName;
  language: Language;
}

export const DEFAULT_LAYOUT: Layout = { page: "a4", orientation: "portrait", marginMm: DEFAULT_MARGIN_MM, type: "kid", language: "en" };

export const PAGE_NAMES = Object.keys(PAGES) as PageName[];

/** A layout from whatever was given: a name that is not a page, an orientation or a type that is not one, or a margin under the least falls back. */
export function layoutOf(given: Partial<Layout> = {}): Layout {
  const margin = Number(given.marginMm);
  return {
    page: given.page !== undefined && given.page in PAGES ? given.page : DEFAULT_LAYOUT.page,
    orientation: given.orientation === "landscape" ? "landscape" : "portrait",
    marginMm: Number.isFinite(margin) && given.marginMm !== undefined ? Math.max(MIN_MARGIN_MM, margin) : DEFAULT_LAYOUT.marginMm,
    type: given.type === "normal" ? "normal" : "kid",
    language: given.language === "ja" ? "ja" : "en",
  };
}

/** The whole page, turned for the orientation. */
export function pageSize(page: PageName, orientation: Orientation = "portrait"): PageSize {
  const { widthMm, heightMm } = PAGES[page];
  return orientation === "landscape" ? { widthMm: heightMm, heightMm: widthMm } : { widthMm, heightMm };
}

/** What is left inside the margins. */
export function printableSize(page: PageName, orientation: Orientation = "portrait", marginMm: number = DEFAULT_MARGIN_MM): PageSize {
  const size = pageSize(page, orientation);
  return { widthMm: size.widthMm - marginMm * 2, heightMm: size.heightMm - marginMm * 2 };
}

export interface FitOptions {
  page: PageName;
  /** The picture's size, in any one unit (only its shape and, for `scale`, its millimetre size matter). */
  widthMm: number;
  heightMm: number;
  /** `"auto"` (the default) takes the turn that makes the picture larger. */
  orientation?: Orientation | "auto";
  marginMm?: number;
}

export interface Fit {
  orientation: Orientation;
  /** The picture's size once scaled: the largest that fits the printable area with its shape kept. */
  widthMm: number;
  heightMm: number;
  /** The scaled size over the given size. */
  scale: number;
  /** Where the scaled picture sits to be centred in the printable area, from the area's top left. */
  offsetXMm: number;
  offsetYMm: number;
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Scales a picture to the printable area of a page, keeping its shape, and says which turn of the page suits it. Throws a RangeError for a picture of no size or margins that leave no area. */
export function fitToPage(options: FitOptions): Fit {
  const { page, widthMm, heightMm, orientation = "auto", marginMm = DEFAULT_MARGIN_MM } = options;
  if (!(widthMm > 0) || !(heightMm > 0)) throw new RangeError("A picture needs a width and a height above 0");
  const scaleFor = (turn: Orientation): number => {
    const area = printableSize(page, turn, marginMm);
    return Math.min(area.widthMm / widthMm, area.heightMm / heightMm);
  };
  const portrait = scaleFor("portrait");
  const landscape = scaleFor("landscape");
  const turn: Orientation = orientation === "portrait" || orientation === "landscape" ? orientation : landscape > portrait ? "landscape" : "portrait";
  const scale = turn === "landscape" ? landscape : portrait;
  if (!(scale > 0)) throw new RangeError("The margins leave no printable area");
  const area = printableSize(page, turn, marginMm);
  const fitted = { widthMm: round3(widthMm * scale), heightMm: round3(heightMm * scale) };
  return { orientation: turn, ...fitted, scale, offsetXMm: round3((area.widthMm - fitted.widthMm) / 2), offsetYMm: round3((area.heightMm - fitted.heightMm) / 2) };
}
