// Turns a target into a picture: a canvas, an SVG or any element, as a PNG, and an SVG as an SVG. Nothing here touches the DOM until a function is called.
//
// A canvas is saved at its own pixel size. An SVG is serialised with the styles it is drawn in written into it, so it looks the same on its own. Any other element is drawn
// through an SVG `foreignObject` with every computed style written in: that carries layout, colours, borders, text and inline SVG, and draws a canvas inside it as a picture.
// What cannot come with it: web fonts (a picture made this way has only the system's fonts), `::before` and `::after`, and images that are not `data:` URLs (an <img> whose
// pixels this page may read is converted; a cross-origin one is left out).
import { filenameFor, MIME, pixelSize, type Format, type TargetKind } from "./format.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** What a target is. */
export function kindOf(target: Element): TargetKind {
  if (target.localName === "canvas") return "canvas";
  return target.localName === "svg" && target.namespaceURI === SVG_NS ? "svg" : "element";
}

/** The target's size in CSS pixels: a canvas' own, else what is drawn on the page, else an SVG's `viewBox`. */
export function sizeOf(target: Element): { width: number; height: number } {
  if (target.localName === "canvas") return { width: (target as HTMLCanvasElement).width, height: (target as HTMLCanvasElement).height };
  const box = target.getBoundingClientRect();
  if (box.width > 0 && box.height > 0) return { width: Math.ceil(box.width), height: Math.ceil(box.height) };
  const view = (target.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (view.length === 4 && view[2]! > 0 && view[3]! > 0) return { width: view[2]!, height: view[3]! };
  return { width: Math.ceil(Number(target.getAttribute("width")) || 300), height: Math.ceil(Number(target.getAttribute("height")) || 150) };
}

/** The properties of an SVG element that its stylesheet can decide, and so must travel with it. */
const SVG_PROPERTIES = [
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset",
  "opacity", "color", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "text-anchor", "dominant-baseline", "visibility", "display", "paint-order", "stop-color", "stop-opacity", "clip-rule", "mix-blend-mode",
];

function inline(source: Element, copy: Element, properties: readonly string[] | undefined): void {
  const style = (source.ownerDocument.defaultView ?? globalThis).getComputedStyle(source);
  const target = (copy as HTMLElement).style;
  // `corner-*-shape` is left out: it is a default, and a browser that writes it back as the `corner` shorthand loses the radius that the other properties carry.
  for (const name of properties ?? Array.from(style).filter((one) => !one.startsWith("corner-"))) target.setProperty(name, style.getPropertyValue(name));
}

function walk(source: Element, copy: Element, visit: (source: Element, copy: Element) => void): void {
  visit(source, copy);
  for (let i = 0; i < source.children.length; i += 1) {
    const child = copy.children[i];
    if (child !== undefined) walk(source.children[i] as Element, child, visit);
  }
}

export interface RenderOptions {
  /** Write the computed styles into what is saved, so it looks the same away from the page's stylesheets. On by default. */
  inlineStyles?: boolean;
}

/** An SVG as text that stands alone: the namespaces, a size, a `viewBox`, and (unless `inlineStyles` is false) the styles it is drawn in. */
export function serializeSvg(svg: Element, options: RenderOptions = {}): { text: string; width: number; height: number } {
  const { width, height } = sizeOf(svg);
  const copy = svg.cloneNode(true) as Element;
  if (options.inlineStyles !== false) walk(svg, copy, (from, to) => inline(from, to, SVG_PROPERTIES));
  copy.setAttribute("xmlns", SVG_NS);
  if (!copy.hasAttribute("xmlns:xlink") && /xlink:/.test(svg.outerHTML)) copy.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  // The size written is the size it is drawn at. Without a viewBox the size it was authored at becomes the viewBox, so a scaled drawing is not cropped.
  if (!copy.hasAttribute("viewBox")) {
    const own = (name: string): number | undefined => (/^\s*[\d.]+(px)?\s*$/.test(svg.getAttribute(name) ?? "") ? parseFloat(svg.getAttribute(name) as string) : undefined);
    copy.setAttribute("viewBox", `0 0 ${own("width") ?? width} ${own("height") ?? height}`);
  }
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  return { text: new globalThis.XMLSerializer().serializeToString(copy), width, height };
}

/** Any element as an SVG that draws it (a `foreignObject`), the styles written in. */
export function serializeElement(element: Element, options: RenderOptions = {}): { text: string; width: number; height: number } {
  const { width, height } = sizeOf(element);
  const copy = element.cloneNode(true) as HTMLElement;
  walk(element, copy, (from, to) => {
    if (options.inlineStyles !== false || from === element) inline(from, to, undefined);
    if (from.localName === "canvas") {
      const picture = from.ownerDocument.createElement("img");
      try {
        picture.setAttribute("src", (from as HTMLCanvasElement).toDataURL("image/png"));
      } catch {
        /* a canvas that may not be read: left empty */
      }
      picture.style.width = (to as HTMLElement).style.width;
      picture.style.height = (to as HTMLElement).style.height;
      to.replaceWith(picture);
    } else if (from.localName === "img") {
      const data = imageData(from as HTMLImageElement);
      if (data !== undefined) to.setAttribute("src", data);
      to.removeAttribute("srcset");
    }
  });
  copy.style.margin = "0";
  copy.style.position = "static";
  copy.style.width = `${width}px`;
  copy.style.height = `${height}px`;
  copy.style.boxSizing = "border-box";
  const html = new globalThis.XMLSerializer().serializeToString(copy);
  const text = `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="100%" height="100%">${html.includes("xmlns=") ? html : html.replace(/^<([a-zA-Z][^\s/>]*)/, `<$1 xmlns="${XHTML_NS}"`)}</foreignObject></svg>`;
  return { text, width, height };
}

/** An <img>'s pixels as a `data:` URL, when this page may read them (a `data:` source already is). */
function imageData(image: HTMLImageElement): string | undefined {
  if (image.src.startsWith("data:")) return image.src;
  if (!image.complete || image.naturalWidth === 0) return undefined;
  try {
    const canvas = image.ownerDocument.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((done, fail) => canvas.toBlob((blob) => (blob === null ? fail(new Error("the picture could not be made")) : done(blob)), MIME.png));
}

function paint(width: number, height: number, background: string | undefined): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("a canvas is not available");
  if (background !== undefined && background !== "") {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  return { canvas, context };
}

/** SVG text as a PNG `scale` times its size. A browser that will not draw it (or whose canvas would be tainted) rejects. */
export async function svgToPng(text: string, width: number, height: number, scale: number, background?: string): Promise<{ blob: Blob; width: number; height: number }> {
  const pixels = pixelSize(width, height, scale);
  const image = new globalThis.Image();
  const loaded = new Promise<void>((done, fail) => {
    image.onload = () => done();
    image.onerror = () => fail(new Error("the picture could not be drawn"));
  });
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  await loaded;
  const { canvas, context } = paint(pixels.width, pixels.height, background);
  context.drawImage(image, 0, 0, pixels.width, pixels.height);
  return { blob: await toBlob(canvas), width: pixels.width, height: pixels.height };
}

export interface RenderImageOptions extends RenderOptions {
  format: Format;
  /** PNG pixels for each CSS pixel of an SVG or element. 2 by default. A canvas is saved at its own size. */
  scale?: number;
  /** A CSS colour painted behind a PNG; the PNG is transparent without it. */
  background?: string;
}

/** What a render makes. */
export interface Picture {
  blob: Blob;
  format: Format;
  /** The picture's size: pixels for a PNG, CSS pixels for an SVG. */
  width: number;
  height: number;
}

/** The target as a picture. Rejects for a format the target cannot give (an SVG of a canvas) and when the browser cannot draw it. */
export async function renderImage(target: Element, options: RenderImageOptions): Promise<Picture> {
  const kind = kindOf(target);
  const { format } = options;
  if (format === "svg") {
    if (kind !== "svg") throw new Error("only an SVG can be saved as SVG");
    const { text, width, height } = serializeSvg(target, options);
    return { blob: new Blob([text], { type: MIME.svg }), format, width, height };
  }
  if (kind === "canvas") {
    const source = target as HTMLCanvasElement;
    if (options.background === undefined || options.background === "") return { blob: await toBlob(source), format, width: source.width, height: source.height };
    const { canvas, context } = paint(source.width, source.height, options.background);
    context.drawImage(source, 0, 0);
    return { blob: await toBlob(canvas), format, width: source.width, height: source.height };
  }
  const made = kind === "svg" ? serializeSvg(target, options) : serializeElement(target, options);
  const png = await svgToPng(made.text, made.width, made.height, options.scale ?? 2, options.background);
  return { blob: png.blob, format, width: png.width, height: png.height };
}

/** Hands the blob to the browser as a download of that name. */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Renders the target and downloads it as `name` with the format's extension. */
export async function saveImage(target: Element, options: RenderImageOptions & { name?: string }): Promise<Picture & { filename: string }> {
  const picture = await renderImage(target, options);
  const filename = filenameFor(options.name, options.format);
  downloadBlob(picture.blob, filename);
  return { ...picture, filename };
}
