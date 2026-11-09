// A poster tiled over several pages: how many, where each page's window sits on the poster, and the cut marks. Pure: no DOM.
import { DEFAULT_MARGIN_MM, pageSize, printableSize, type Orientation, type PageName } from "./pages.ts";

export interface PosterOptions {
  /** The poster's size, in millimetres. */
  widthMm: number;
  heightMm: number;
  page: PageName;
  orientation?: Orientation;
  marginMm?: number;
  /** How much of one page's picture is repeated on the next, so the pages can be glued over each other. 10 mm by default. */
  overlapMm?: number;
}

export interface Tile {
  /** 1 for the first page, row by row from the top left. */
  index: number;
  column: number;
  row: number;
  /** Where this page's window starts on the poster, in millimetres from its top left. */
  xMm: number;
  yMm: number;
  /** How much of this page's picture is repeated on the page to its right, and the page below (0 for the last column and row): the glue strips. */
  overlapRightMm: number;
  overlapBottomMm: number;
}

export interface PosterPlan {
  columns: number;
  rows: number;
  pages: number;
  /** The window on each page: the printable area, which shows this much of the poster. */
  windowMm: { widthMm: number; heightMm: number };
  tiles: Tile[];
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Where each window starts along one side: the pages step by the window less the overlap, so every page repeats exactly the overlap of the one before it; the last page's window runs past the poster's edge, and is blank there. */
function starts(length: number, window: number, overlap: number): number[] {
  if (length <= window) return [0];
  const step = window - overlap;
  const count = 1 + Math.ceil((length - window) / step - 1e-9);
  return Array.from({ length: count }, (_, i) => round(i * step));
}

/** How many pages a poster needs and which part of it each page prints. Throws a RangeError for a poster of no size or an overlap as big as a page's window. */
export function tilePoster(options: PosterOptions): PosterPlan {
  const { widthMm, heightMm, page, orientation = "portrait", marginMm = DEFAULT_MARGIN_MM, overlapMm = 10 } = options;
  if (!(widthMm > 0) || !(heightMm > 0)) throw new RangeError("A poster needs a width and a height above 0");
  const window = printableSize(page, orientation, marginMm);
  if (!(overlapMm >= 0) || overlapMm >= Math.min(window.widthMm, window.heightMm)) throw new RangeError("The overlap must be 0 or more and less than a page's printable area");
  const xs = starts(widthMm, window.widthMm, overlapMm);
  const ys = starts(heightMm, window.heightMm, overlapMm);
  const tiles: Tile[] = [];
  ys.forEach((yMm, row) => xs.forEach((xMm, column) => tiles.push({
    index: row * xs.length + column + 1,
    column,
    row,
    xMm,
    yMm,
    overlapRightMm: column < xs.length - 1 ? round(xMm + window.widthMm - xs[column + 1]) : 0,
    overlapBottomMm: row < ys.length - 1 ? round(yMm + window.heightMm - ys[row + 1]) : 0,
  })));
  return { columns: xs.length, rows: ys.length, pages: tiles.length, windowMm: { widthMm: window.widthMm, heightMm: window.heightMm }, tiles };
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The cut marks of one page, in millimetres from the page's top left: at each corner of the printable window, one line along each edge pointing out into the margin, kept off the window by `gapMm`. */
export function cutMarks(page: PageName, orientation: Orientation = "portrait", marginMm: number = DEFAULT_MARGIN_MM, lengthMm = 6, gapMm = 1.5): Segment[] {
  const size = pageSize(page, orientation);
  const left = marginMm, top = marginMm, right = size.widthMm - marginMm, bottom = size.heightMm - marginMm;
  const out: Segment[] = [];
  for (const [x, y, dx, dy] of [[left, top, -1, -1], [right, top, 1, -1], [left, bottom, -1, 1], [right, bottom, 1, 1]] as const) {
    out.push({ x1: x + dx * gapMm, y1: y, x2: x + dx * (gapMm + lengthMm), y2: y });
    out.push({ x1: x, y1: y + dy * gapMm, x2: x, y2: y + dy * (gapMm + lengthMm) });
  }
  return out;
}
