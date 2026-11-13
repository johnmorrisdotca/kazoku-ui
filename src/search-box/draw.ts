// The small pictures the box builds: an action's icon and a row's. Each is made node by node from checked data (never from a string of markup), so nothing a page passes can add an element, an attribute or a script.
import type { RowIconSpec } from "./icons.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

/** A 24 by 24 picture of path data. Hidden from a screen reader: the button or the row it is in carries the name. */
export function drawPaths(doc: Document, paths: readonly string[]): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const d of paths) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/**
 * A row's icon as a box of fixed size (so the names line up and nothing moves when a picture loads): a shape in the row's text colour or the icon's own, a few characters, or a picture. The colour is set through the style object, never as markup.
 *
 * @example
 * const el = drawRowIcon(document, { type: "text", text: "JP" }); // <span class="ico" aria-hidden="true">JP</span>
 */
export function drawRowIcon(doc: Document, spec: RowIconSpec | undefined): HTMLElement {
  const box = doc.createElement("span");
  box.className = "ico";
  box.setAttribute("aria-hidden", "true");
  if (spec === undefined) return box;
  if (spec.type === "shape") {
    const svg = drawPaths(doc, spec.paths);
    if (spec.filled) svg.classList.add("f");
    box.append(svg);
    if (spec.color !== undefined) box.style.setProperty("color", spec.color);
  } else if (spec.type === "text") {
    const text = doc.createElement("span");
    text.className = "tx";
    text.textContent = spec.text;
    box.append(text);
    if (spec.color !== undefined) box.style.setProperty("color", spec.color);
  } else {
    const img = doc.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.src = spec.src;
    img.addEventListener("error", () => img.remove());
    box.append(img);
  }
  return box;
}
