// A few helpers every interface element builds its shadow tree with. Browser only: used by the elements, never at import.
import { ICON_STROKE, ICONS, type IconName } from "./icons.ts";

type Attributes = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

/** Makes an element: `h(doc, "button", { class: "go", type: "button" }, ["Go"])`. An attribute that is `false` or `undefined` is left off; `true` is written empty. */
export function h<K extends string>(doc: Document, tag: K, attributes: Attributes = {}, children: readonly Child[] = []): K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : HTMLElement {
  const element = doc.createElement(tag) as HTMLElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === undefined) continue;
    element.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) element.append(child);
  return element as never;
}

const SVG = "http://www.w3.org/2000/svg";

/** A built-in icon as an `<svg>`, stroked 1.75 with round caps; hidden from a screen reader, since the button around it has the name. */
export function iconElement(doc: Document, name: IconName): SVGSVGElement {
  const svg = doc.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(ICON_STROKE));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const d of ICONS[name]) {
    const path = doc.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/** Sets an element's text only when it changed, so a part that repaints often does not make the browser redo layout, or a screen reader read the same words again. */
export function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/** Sets an attribute only when it changed (and removes it for `null`). */
export function setAttr(element: Element, name: string, value: string | null): void {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Whether an attribute is on: present, and not `off` or `false`. */
export const flag = (element: Element, name: string): boolean => element.hasAttribute(name) && !["off", "false"].includes(element.getAttribute(name) ?? "");

/** Whether the reader asked the device for less motion. */
export const reducedMotion = (): boolean => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** Whether a screen is phone-sized, the one breakpoint the parts share: 640 px or less. */
export const PHONE_QUERY = "(max-width: 640px)";
