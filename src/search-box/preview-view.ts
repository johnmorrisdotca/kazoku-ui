// A preview as the page gave it, made safe to keep and to draw. Nothing here touches the DOM, so it imports on a server. A page's preview comes from its own code or from the network, so nothing about its shape is trusted: a
// value of the wrong type is left out, text is cut to a length that fits the pane, and nothing here throws.
import { isSafeImageUrl, rowIconSpec, type RowIconSpec } from "./icons.ts";
import type { SearchFact, SearchPreview, SearchRow } from "./model.ts";

/** The most facts a preview shows. */
export const MAX_FACTS = 8;
/** The most characters kept of a preview's title. */
export const MAX_TITLE = 160;
/** The most characters kept of a preview's kind. */
export const MAX_KIND = 80;
/** The most characters kept of a fact's label. */
export const MAX_FACT_LABEL = 60;
/** The most characters kept of a fact's value. */
export const MAX_FACT_VALUE = 240;
/** The most characters kept of a picture's description. */
export const MAX_PICTURE_ALT = 240;

/** A preview as the pane draws it: every part checked, with the row's own name, kind and icon where the preview leaves them out. */
export interface PreviewView {
  title: string;
  kind: string;
  facts: SearchFact[];
  picture?: string;
  pictureAlt: string;
  element?: Node;
  icon?: RowIconSpec;
}

const text = (value: unknown, max: number): string => (typeof value === "string" ? [...value.trim()].slice(0, max).join("") : "");

/**
 * What a page's preview comes to once checked, or `undefined` when it is not an object. Texts are trimmed and cut (`MAX_TITLE`, `MAX_KIND`, `MAX_FACT_LABEL`, `MAX_FACT_VALUE`, `MAX_PICTURE_ALT`); `facts` that is not an array is dropped, and a fact that is not
 * an object with a label and a value in text is dropped, and no more than `MAX_FACTS` are kept; a picture whose address is not safe is dropped; `element` is kept only when it is an object. It never throws, so a bad answer is a plain one, and the loader keeps this form.
 *
 * @example
 * sanitizePreview({ facts: 5, title: "Mars" }); // { title: "Mars" }
 * sanitizePreview("nonsense"); // undefined
 */
export function sanitizePreview(preview: unknown): SearchPreview | undefined {
  if (typeof preview !== "object" || preview === null) return undefined;
  const raw = preview as Record<string, unknown>;
  const clean: SearchPreview = {};
  const title = text(raw.title, MAX_TITLE);
  if (title !== "") clean.title = title;
  const kind = text(raw.kind, MAX_KIND);
  if (kind !== "") clean.kind = kind;
  if (Array.isArray(raw.facts)) {
    const facts: SearchFact[] = [];
    for (const fact of raw.facts as unknown[]) {
      if (facts.length >= MAX_FACTS) break;
      if (typeof fact !== "object" || fact === null) continue;
      const label = text((fact as Record<string, unknown>).label, MAX_FACT_LABEL);
      const value = text((fact as Record<string, unknown>).value, MAX_FACT_VALUE);
      if (label !== "" && value !== "") facts.push({ label, value });
    }
    clean.facts = facts;
  }
  if (typeof raw.picture === "string" && isSafeImageUrl(raw.picture)) clean.picture = raw.picture;
  const alt = text(raw.pictureAlt, MAX_PICTURE_ALT);
  if (alt !== "") clean.pictureAlt = alt;
  if (typeof raw.element === "object" && raw.element !== null) clean.element = raw.element as Node;
  return clean;
}

/**
 * A row's preview as the pane draws it. The title and the kind come from the row and its group unless the preview has its own, and the row's icon is checked here. `preview` may be `undefined` or any value a page's code
 * returned (see `sanitizePreview`), which gives the row's name, kind and icon alone.
 *
 * @example
 * previewView({ id: "mars", label: "Mars" }, "Planets", { facts: [{ label: "Moons", value: "2" }] }).facts; // [{ label: "Moons", value: "2" }]
 * previewView({ id: "mars", label: "Mars" }, "Planets", undefined).kind; // "Planets"
 */
export function previewView(row: SearchRow, groupLabel: string, preview: SearchPreview | undefined): PreviewView {
  const clean = sanitizePreview(preview);
  const view: PreviewView = { title: clean?.title ?? row.label, kind: clean?.kind ?? groupLabel, facts: [...(clean?.facts ?? [])], pictureAlt: clean?.pictureAlt ?? "" };
  if (clean?.picture !== undefined) view.picture = clean.picture;
  if (clean?.element !== undefined) view.element = clean.element;
  const icon = rowIconSpec(row.icon);
  if (icon !== undefined) view.icon = icon;
  return view;
}
