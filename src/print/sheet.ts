// Builds a printable sheet as DOM: pages of exactly the paper's size, each with a header (brand, package, title, a Name box), an info box (first page), a body and a footer
// (credits, version, date, the address as a QR code and as text, the page number); or a poster cut into pages with cut marks. Nothing here touches the DOM until a function is called.
import { layoutOf, pageSize, type Layout } from "./pages.ts";
import { qrSvg } from "./qr.ts";
import { cutMarks, tilePoster, type PosterPlan } from "./tile.ts";
import { pageOf, wordsFor, type PrintWords } from "./words.ts";

export interface SheetInfo {
  region?: string;
  /** The address of the flag's picture (a path or a data: address) and what it shows. */
  flagSrc?: string;
  flagAlt?: string;
  latitudeBand?: string;
  season?: string;
  level?: string;
  language?: string;
  /** More boxes after those, each a label and a value. */
  more?: { label: string; value: string }[];
}

export interface Poster {
  /** What is printed: any node (an SVG is best; a canvas does not survive being copied). Copied once for each page. */
  content: Node;
  widthMm: number;
  heightMm: number;
  /** The repeat between pages, in millimetres (10 by default). */
  overlapMm?: number;
}

/** `"all"`: every tile page carries the address and its QR code in the bottom margin; `"ends"`: the first and the last only; `"none"` (the default): neither. */
export type TileFooter = "none" | "ends" | "all";

/** `"always"` (the default); `"many"`: only a sheet of more than one page; `"never"`. */
export type PageNumber = "always" | "many" | "never";

export interface SheetOptions extends Partial<Layout> {
  /** The header's first line, such as the family's name; passed in, never built in. */
  brand?: string;
  packageName?: string;
  title: string;
  /** The "Name: ____" box in the header (on by default). */
  nameBox?: boolean;
  /** The info box under the header of the first page. */
  info?: SheetInfo;
  credits?: string;
  version?: string;
  /** A Date is written as YYYY-MM-DD; a string is written as it is. */
  date?: Date | string;
  /** The address to print: as a QR code and as text. Too long for a QR code, it is printed as text only. */
  address?: string;
  /** What each page holds, one node for each page. */
  pages?: Node[];
  /** A poster to tile over pages instead. */
  poster?: Poster;
  /** On a poster, the address as text and a small QR code in the bottom margin of the tile pages: all of them, or the first and the last. Needs `address`. Off by default. */
  tileFooter?: TileFooter;
  /** Whether the page number is printed (on sheet pages and tile pages alike). `"many"` leaves it off a one-page sheet, such as a certificate. */
  pageNumber?: PageNumber;
  /** Words to use instead of the built-in ones, for one or more keys. */
  words?: Partial<PrintWords>;
}

/** The attributes that record the layout on a sheet, so `printSheet` can read it back. */
export const LAYOUT_ATTRIBUTES = { page: "data-page", orientation: "data-orientation", marginMm: "data-margin-mm", type: "data-type", language: "data-language" } as const;

export const isoDate = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const SVG = "http://www.w3.org/2000/svg";

function make(doc: Document, tag: string, className?: string, text?: string): HTMLElement {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function header(doc: Document, options: SheetOptions, words: PrintWords): HTMLElement {
  const top = make(doc, "header", "kazoku-header");
  const heading = make(doc, "div", "kazoku-heading");
  if (options.brand) heading.append(make(doc, "p", "kazoku-brand", options.brand));
  if (options.packageName) heading.append(make(doc, "p", "kazoku-package", options.packageName));
  heading.append(make(doc, "h1", "kazoku-title", options.title));
  top.append(heading);
  if (options.nameBox !== false) {
    const box = make(doc, "div", "kazoku-namebox");
    box.append(make(doc, "span", "kazoku-namelabel", words.name), make(doc, "span", "kazoku-namefield"));
    top.append(box);
  }
  return top;
}

function infoBox(doc: Document, info: SheetInfo, words: PrintWords): HTMLElement | undefined {
  const cells: [string, string | undefined][] = [
    [words.region, info.region], [words.flag, undefined], [words.latitudeBand, info.latitudeBand], [words.season, info.season], [words.level, info.level], [words.language, info.language],
    ...(info.more ?? []).map((one): [string, string] => [one.label, one.value]),
  ];
  const box = make(doc, "dl", "kazoku-info");
  for (const [label, value] of cells) {
    const isFlag = label === words.flag && !info.more?.some((one) => one.label === label);
    if (isFlag ? !info.flagSrc : value === undefined || value === "") continue;
    const cell = make(doc, "div");
    cell.append(make(doc, "dt", undefined, label));
    const dd = make(doc, "dd");
    if (isFlag) {
      const img = doc.createElement("img");
      img.src = info.flagSrc as string;
      img.alt = info.flagAlt ?? "";
      dd.append(img);
    } else dd.textContent = value as string;
    cell.append(dd);
    box.append(cell);
  }
  return box.childElementCount ? box : undefined;
}

const showsPageNumber = (options: SheetOptions, total: number): boolean => options.pageNumber === "never" ? false : options.pageNumber === "many" ? total > 1 : true;

function footer(doc: Document, options: SheetOptions, words: PrintWords, n: number, total: number): HTMLElement {
  const foot = make(doc, "footer", "kazoku-footer");
  const fine = make(doc, "div", "kazoku-fine");
  if (options.credits) fine.append(make(doc, "p", "kazoku-credits", options.credits));
  const meta = [options.version ? `${words.version} ${options.version}` : "", options.date ? `${words.date} ${options.date instanceof Date ? isoDate(options.date) : options.date}` : ""].filter(Boolean).join(" · ");
  if (meta) fine.append(make(doc, "p", "kazoku-meta", meta));
  if (options.address) fine.append(make(doc, "p", "kazoku-address", options.address));
  foot.append(fine);
  if (options.address) {
    let svg: string | undefined;
    try { svg = qrSvg(options.address); } catch { svg = undefined; }
    if (svg) {
      const qr = make(doc, "div", "kazoku-qr");
      qr.setAttribute("role", "img");
      qr.setAttribute("aria-label", words.qr);
      qr.innerHTML = svg;
      foot.append(qr);
    }
  }
  if (showsPageNumber(options, total)) foot.append(make(doc, "p", "kazoku-pageno", pageOf(words, n, total)));
  return foot;
}

function sheetPage(doc: Document, options: SheetOptions, words: PrintWords, body: Node | undefined, n: number, total: number): HTMLElement {
  const page = make(doc, "section", "kazoku-page");
  page.append(header(doc, options, words));
  if (n === 1 && options.info) {
    const info = infoBox(doc, options.info, words);
    if (info) page.append(info);
  }
  const main = make(doc, "div", "kazoku-body");
  if (body) main.append(body);
  page.append(main, footer(doc, options, words, n, total));
  return page;
}

function svgLine(doc: Document, segment: { x1: number; y1: number; x2: number; y2: number }): Element {
  const line = doc.createElementNS(SVG, "line");
  for (const [key, value] of Object.entries(segment)) line.setAttribute(key, String(value));
  line.setAttribute("stroke", "#000");
  line.setAttribute("stroke-width", "0.4");
  return line;
}

/** The address and a small QR code for the bottom margin of a tile page. The code is as tall as the margin allows. */
function tileAddress(doc: Document, address: string, words: PrintWords, marginMm: number): HTMLElement {
  const group = make(doc, "span", "kazoku-tilefoot");
  group.append(make(doc, "span", "kazoku-address", address));
  let svg: string | undefined;
  try { svg = qrSvg(address, { quiet: 1 }); } catch { svg = undefined; }
  if (svg) {
    const qr = make(doc, "span", "kazoku-qr");
    qr.setAttribute("role", "img");
    qr.setAttribute("aria-label", words.qr);
    qr.style.width = qr.style.height = `${marginMm - 2}mm`;
    qr.innerHTML = svg;
    group.append(qr);
  }
  return group;
}

function tilePage(doc: Document, options: SheetOptions, layout: Layout, words: PrintWords, poster: Poster, plan: PosterPlan, index: number): HTMLElement {
  const tile = plan.tiles[index];
  const size = pageSize(layout.page, layout.orientation);
  const page = make(doc, "section", "kazoku-page kazoku-tile");
  page.dataset.tile = String(tile.index);
  page.dataset.row = String(tile.row);
  page.dataset.column = String(tile.column);
  const win = make(doc, "div", "kazoku-window");
  win.style.width = `${plan.windowMm.widthMm}mm`;
  win.style.height = `${plan.windowMm.heightMm}mm`;
  const sheet = make(doc, "div", "kazoku-poster");
  sheet.style.width = `${poster.widthMm}mm`;
  sheet.style.height = `${poster.heightMm}mm`;
  sheet.style.transform = `translate(${-tile.xMm}mm, ${-tile.yMm}mm)`;
  sheet.append(poster.content.cloneNode(true));
  win.append(sheet);
  if (tile.overlapRightMm > 0) {
    const glue = make(doc, "div", "kazoku-glue right", words.glue);
    glue.style.width = `${tile.overlapRightMm}mm`;
    win.append(glue);
  }
  if (tile.overlapBottomMm > 0) {
    const glue = make(doc, "div", "kazoku-glue bottom", words.glue);
    glue.style.height = `${tile.overlapBottomMm}mm`;
    win.append(glue);
  }
  page.append(win);
  const top = make(doc, "div", "kazoku-margin top");
  top.append(make(doc, "span", undefined, [options.brand, options.title].filter(Boolean).join(" · ")), make(doc, "span", undefined, words.tileOf.replace("{row}", String(tile.row + 1)).replace("{column}", String(tile.column + 1))));
  const bottom = make(doc, "div", "kazoku-margin bottom");
  const carries = options.address && (options.tileFooter === "all" || (options.tileFooter === "ends" && (tile.index === 1 || tile.index === plan.pages)));
  bottom.append(make(doc, "span", carries ? "kazoku-cut small" : "kazoku-cut", plan.pages > 1 ? words.cut : ""));
  if (carries) bottom.append(tileAddress(doc, options.address as string, words, layout.marginMm));
  if (showsPageNumber(options, plan.pages)) bottom.append(make(doc, "span", "kazoku-pageno", pageOf(words, tile.index, plan.pages)));
  page.append(top, bottom);
  const marks = doc.createElementNS(SVG, "svg");
  marks.setAttribute("class", "kazoku-marks");
  marks.setAttribute("viewBox", `0 0 ${size.widthMm} ${size.heightMm}`);
  marks.setAttribute("width", `${size.widthMm}mm`);
  marks.setAttribute("height", `${size.heightMm}mm`);
  marks.setAttribute("aria-hidden", "true");
  for (const segment of cutMarks(layout.page, layout.orientation, layout.marginMm)) marks.append(svgLine(doc, segment));
  page.append(marks);
  return page;
}

/** The sheet: one `.kazoku-sheet` holding a `.kazoku-page` for each page (or each tile of a poster). It carries its layout in data attributes. Add `printCss(layout)` once to the page and the sheet looks the same on screen and on paper. */
export function buildSheet(options: SheetOptions, doc: Document = document): HTMLElement {
  const layout = layoutOf(options);
  const words = wordsFor(layout.language, options.words);
  const sheet = make(doc, "div", "kazoku-sheet");
  sheet.lang = layout.language;
  for (const [key, attribute] of Object.entries(LAYOUT_ATTRIBUTES)) sheet.setAttribute(attribute, String(layout[key as keyof Layout]));
  if (options.poster) {
    const plan = tilePoster({ widthMm: options.poster.widthMm, heightMm: options.poster.heightMm, page: layout.page, orientation: layout.orientation, marginMm: layout.marginMm, overlapMm: options.poster.overlapMm });
    for (let i = 0; i < plan.pages; i++) sheet.append(tilePage(doc, options, layout, words, options.poster, plan, i));
    return sheet;
  }
  const bodies = options.pages?.length ? options.pages : [undefined];
  bodies.forEach((body, i) => sheet.append(sheetPage(doc, options, words, body, i + 1, bodies.length)));
  return sheet;
}
