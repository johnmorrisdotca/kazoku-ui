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
