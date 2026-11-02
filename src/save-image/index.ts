// The save-image part without the element: the formats, the file name, the size, and the functions that turn a canvas, an SVG or an element into a picture and download it.
// Nothing here touches the DOM until a function is called, so it imports on a server.
export { filenameFor, FORMATS, formatsFor, MAX_PIXELS, MAX_SIDE, MIME, parseFormats, pixelSize, type Format, type TargetKind } from "./format.ts";
export { downloadBlob, kindOf, renderImage, saveImage, serializeElement, serializeSvg, sizeOf, svgToPng, type Picture, type RenderImageOptions, type RenderOptions } from "./render.ts";
export { languageOf, WORDS, wordsFor, type Language, type SaveWords } from "./words.ts";
export const EVENT = "kazoku-save";
export const ERROR_EVENT = "kazoku-saveerror";
export const TAG = "kazoku-save-image";
