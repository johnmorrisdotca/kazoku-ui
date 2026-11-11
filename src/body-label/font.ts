// The family's font for a name on a globe, Michroma by Vernon Adams (Copyright 2011 The Michroma Project Authors, SIL Open Font License 1.1; the licence is fonts/OFL.txt
// beside the font). The file is fetched only when a page calls `loadBodyLabelFont`, so a page that brings its own font pays nothing for it.
import { BODY_LABEL_FONT } from "./label.ts";

/** The font file's size in bytes, for a page that weighs what it loads. */
export const BODY_LABEL_FONT_BYTES = 64_344;

/**
 * Load Michroma into the page (once; again does nothing) and resolve its family name, for `createBodyLabel`'s `font`. Give `url` to load it from your own copy.
 *
 * @example
 * ```ts
 * import { loadBodyLabelFont } from "@johnmorrisdotca/kazoku-ui/body-label";
 *
 * const family = await loadBodyLabelFont(); // "Michroma"
 * ```
 */
export async function loadBodyLabelFont(url: string | URL = new URL("./fonts/Michroma-Regular.ttf", import.meta.url)): Promise<string> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return BODY_LABEL_FONT;
  const fonts = document.fonts;
  if ([...fonts].some((face) => face.family.replace(/["']/g, "") === BODY_LABEL_FONT && face.status === "loaded")) return BODY_LABEL_FONT;
  const face = new FontFace(BODY_LABEL_FONT, `url(${JSON.stringify(String(url))})`);
  await face.load();
  fonts.add(face);
  return BODY_LABEL_FONT;
}
