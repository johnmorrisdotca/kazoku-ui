// The print part: page sizes, margins, the QR code, a poster tiled over pages, a printable sheet with a header, info box and footer, and "Print / save PDF".
// Nothing here touches the DOM until a function is called, so it imports on a server.
export { DEFAULT_LAYOUT, DEFAULT_MARGIN_MM, fitToPage, layoutOf, MIN_MARGIN_MM, PAGE_NAMES, PAGES, pageSize, printableSize, type Fit, type FitOptions, type Layout, type Orientation, type PageName, type PageSize, type TypeName } from "./pages.ts";
export { cutMarks, tilePoster, type PosterOptions, type PosterPlan, type Segment, type Tile } from "./tile.ts";
export { MAX_BYTES, qrMatrix, qrSvg, type QrOptions, type QrSvgOptions } from "./qr.ts";
export { TYPE_PRESETS, type TypePreset } from "./type.ts";
export { printCss, ROOT_ATTRIBUTE, ROOT_CLASS } from "./css.ts";
export { buildSheet, isoDate, LAYOUT_ATTRIBUTES, type PageNumber, type Poster, type SheetInfo, type SheetOptions, type TileFooter } from "./sheet.ts";
export { layoutFromSheet, openPrintView, printSheet, type PrintOptions, type PrintView } from "./view.ts";
export { languageOf, pageOf, WORDS, wordsFor, type Language, type PrintWords } from "./words.ts";
