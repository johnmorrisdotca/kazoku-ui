// The "Print / save PDF" helper: a print-only copy of the sheet, then the browser's own print dialog (which saves a PDF too). No PDF library.
import { layoutOf, type Layout } from "./pages.ts";
import { printCss, ROOT_ATTRIBUTE, ROOT_CLASS } from "./css.ts";
import { LAYOUT_ATTRIBUTES } from "./sheet.ts";
import type { Language } from "./words.ts";

export interface PrintView {
  /** The print-only copy, a child of `<body>`: hidden on screen, the only thing on paper. */
  root: HTMLElement;
  /** Removes the copy, the style and the mark on `<html>`. */
  close(): void;
}

const STYLE_ID = "kazoku-print-style";

/** The layout a sheet was built with, read back from its data attributes. */
export function layoutFromSheet(sheet: Element): Layout {
  const get = (name: string): string | null => sheet.getAttribute(name);
  return layoutOf({
    page: (get(LAYOUT_ATTRIBUTES.page) ?? undefined) as Layout["page"] | undefined,
    orientation: (get(LAYOUT_ATTRIBUTES.orientation) ?? undefined) as Layout["orientation"] | undefined,
    marginMm: get(LAYOUT_ATTRIBUTES.marginMm) === null ? undefined : Number(get(LAYOUT_ATTRIBUTES.marginMm)),
    type: (get(LAYOUT_ATTRIBUTES.type) ?? undefined) as Layout["type"] | undefined,
    language: (get(LAYOUT_ATTRIBUTES.language) ?? undefined) as Language | undefined,
  });
}

/** Makes the print-only view of a sheet (a copy of it) and the page rules for its paper. Call `close` when done; a view already open is closed first. */
export function openPrintView(sheet: HTMLElement, doc: Document = document): PrintView {
  doc.querySelector(`.${ROOT_CLASS}`)?.remove();
  doc.getElementById(STYLE_ID)?.remove();
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = printCss(layoutFromSheet(sheet));
  const nonce = doc.querySelector<HTMLElement>("script[nonce], style[nonce]")?.nonce;
  if (nonce) style.nonce = nonce;
  const root = doc.createElement("div");
  root.className = ROOT_CLASS;
  root.append(sheet.cloneNode(true));
  doc.head.append(style);
  doc.body.append(root);
  doc.documentElement.setAttribute(ROOT_ATTRIBUTE, "");
  return {
    root,
    close() {
      root.remove();
      style.remove();
      doc.documentElement.removeAttribute(ROOT_ATTRIBUTE);
    },
  };
}

export interface PrintOptions {
  /** What to call instead of `window.print`, for tests. */
  print?: () => void;
}

/** Prints a sheet: opens the print-only view, calls `window.print()` (the dialog's "Save as PDF" makes the file), and removes the view when the dialog is done. */
export function printSheet(sheet: HTMLElement, options: PrintOptions = {}, doc: Document = document): PrintView {
  const view = openPrintView(sheet, doc);
  const win = doc.defaultView as Window;
  const done = (): void => {
    win.removeEventListener("afterprint", done);
    view.close();
  };
  win.addEventListener("afterprint", done);
  try {
    (options.print ?? ((): void => win.print()))();
  } catch (error) {
    done();
    throw error;
  }
  return view;
}
