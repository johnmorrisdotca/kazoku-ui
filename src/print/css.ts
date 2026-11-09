// The print CSS of a sheet. Pure: a string. Every page is a box exactly the size of the paper, with the margin as padding, so the sheet looks the same in the preview and on paper;
// `@page` has no margin of its own, and the margin is never under 8 mm, so a home printer does not clip the edge.
import { layoutOf, pageSize, type Layout } from "./pages.ts";
import { TYPE_PRESETS } from "./type.ts";

/** A page box is this much shorter than the paper, so rounding never pushes a blank page out. */
const SLACK_MM = 0.5;

/** The `.kazoku-print-root` class of the print-only copy, and the attribute on `<html>` while it is open. */
export const ROOT_CLASS = "kazoku-print-root";
export const ROOT_ATTRIBUTE = "data-kazoku-print";

const mm = (n: number): string => `${Math.round(n * 100) / 100}mm`;

/** The CSS for a sheet: the page size, the print-only view (everything else on the page hidden on paper, the copy hidden on screen) and the look of the header, info box, footer and poster tiles. */
export function printCss(given: Partial<Layout> = {}): string {
  const layout = layoutOf(given);
  const size = pageSize(layout.page, layout.orientation);
  const type = TYPE_PRESETS[layout.type];
  const line = mm(type.lineMm);
  return `@page { size: ${mm(size.widthMm)} ${mm(size.heightMm)}; margin: 0; }
.${ROOT_CLASS} { display: none; }
@media print {
  html[${ROOT_ATTRIBUTE}], html[${ROOT_ATTRIBUTE}] body { margin: 0; padding: 0; background: #fff; }
  html[${ROOT_ATTRIBUTE}] body > :not(.${ROOT_CLASS}) { display: none !important; }
  html[${ROOT_ATTRIBUTE}] body > .${ROOT_CLASS} { display: block; }
  .kazoku-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
.kazoku-sheet { --kz-title: ${type.titlePt}pt; --kz-name: ${type.namePt}pt; --kz-body: ${type.bodyPt}pt; --kz-small: ${type.smallPt}pt; --kz-line: ${line}; color: #000; font: 400 var(--kz-body)/1.3 ${type.fontFamily}; }
.kazoku-sheet *, .kazoku-sheet *::before, .kazoku-sheet *::after { box-sizing: border-box; }
.kazoku-page { position: relative; display: flex; flex-direction: column; gap: 3mm; width: ${mm(size.widthMm)}; height: ${mm(size.heightMm - SLACK_MM)}; padding: ${mm(layout.marginMm)}; overflow: hidden; background: #fff; break-after: page; page-break-after: always; }
.kazoku-page:last-child { break-after: auto; page-break-after: auto; }
.kazoku-header { display: flex; flex: none; align-items: flex-start; justify-content: space-between; gap: 4mm; padding-bottom: 2mm; border-bottom: var(--kz-line) solid #000; }
.kazoku-heading { min-width: 0; }
.kazoku-brand, .kazoku-package { margin: 0; font-size: var(--kz-small); font-weight: 700; letter-spacing: 0.04em; }
.kazoku-title { margin: 1mm 0 0; font-size: var(--kz-title); font-weight: 800; line-height: 1.1; }
.kazoku-namebox { display: flex; flex: none; align-items: flex-end; gap: 2mm; font-size: var(--kz-name); font-weight: 700; line-height: 1.1; white-space: nowrap; }
.kazoku-namefield { display: inline-block; width: ${layout.type === "kid" ? "60mm" : "45mm"}; height: 1em; border: 0; border-bottom: var(--kz-line) solid #000; border-radius: 0; }
.kazoku-info { display: grid; flex: none; grid-template-columns: repeat(auto-fit, minmax(38mm, 1fr)); gap: 2mm 4mm; margin: 0; padding: 3mm; border: var(--kz-line) solid #000; border-radius: ${layout.type === "kid" ? "5mm" : "1mm"}; }
.kazoku-info div { min-width: 0; }
.kazoku-info dt { margin: 0; font-size: var(--kz-small); font-weight: 600; }
.kazoku-info dd { margin: 0; font-size: var(--kz-body); font-weight: 800; }
.kazoku-info img { display: block; height: 12mm; max-width: 100%; border: 0.3mm solid #000; }
.kazoku-body { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.kazoku-name { font-size: var(--kz-name); font-weight: 800; }
.kazoku-footer { display: flex; flex: none; align-items: flex-end; justify-content: space-between; gap: 4mm; padding-top: 2mm; border-top: 0.4mm solid #000; font-size: var(--kz-small); line-height: 1.3; }
.kazoku-footer p { margin: 0; }
.kazoku-footer .kazoku-fine { min-width: 0; }
.kazoku-address { overflow-wrap: anywhere; font-weight: 700; }
.kazoku-pageno { flex: none; font-size: var(--kz-body); font-weight: 800; white-space: nowrap; }
.kazoku-qr { flex: none; width: ${layout.type === "kid" ? "24mm" : "20mm"}; height: ${layout.type === "kid" ? "24mm" : "20mm"}; }
.kazoku-qr svg { display: block; width: 100%; height: 100%; }
.kazoku-tile { padding: ${mm(layout.marginMm)}; }
.kazoku-window { position: relative; flex: none; overflow: hidden; }
.kazoku-poster { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.kazoku-margin { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 4mm; padding: 0 ${mm(layout.marginMm + 8)}; height: ${mm(layout.marginMm)}; font-size: var(--kz-small); line-height: 1.2; }
.kazoku-margin .kazoku-cut { flex: 1; min-width: 0; }
.kazoku-margin .kazoku-cut.small { font-size: 6.5pt; line-height: 1.15; }
.kazoku-tilefoot { display: flex; flex: none; align-items: center; gap: 2mm; max-width: 60mm; max-height: 100%; overflow: hidden; }
.kazoku-tilefoot .kazoku-address { min-width: 0; font-size: 6.5pt; line-height: 1.15; }
.kazoku-tilefoot .kazoku-qr { display: block; }
.kazoku-margin.top { top: 0; }
.kazoku-margin.bottom { bottom: 0; }
.kazoku-marks { position: absolute; left: 0; top: 0; pointer-events: none; }
.kazoku-glue { position: absolute; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.08); font-size: var(--kz-small); font-weight: 700; overflow: hidden; }
.kazoku-glue.right { top: 0; bottom: 0; right: 0; border-left: 0.5mm dashed #000; writing-mode: vertical-rl; }
.kazoku-glue.bottom { left: 0; right: 0; bottom: 0; border-top: 0.5mm dashed #000; }
`;
}
