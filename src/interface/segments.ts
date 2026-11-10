// The segmented switch's choices, with no DOM: parsing `options`, the language pair and the sky cultures.
import type { InterfaceWords } from "./words.ts";

/** One segment: the value it stands for and what it says. */
export interface Segment {
  value: string;
  label: string;
}

/** The language switch: each language in its own name, never translated. */
export const LANGUAGE_SEGMENTS: readonly Segment[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "日本語" },
];

/** The sky culture switch, in the reader's language. */
export function cultureSegments(words: Pick<InterfaceWords, "western" | "japanese" | "chinese">): Segment[] {
  return [
    { value: "western", label: words.western },
    { value: "japanese", label: words.japanese },
    { value: "chinese", label: words.chinese },
  ];
}

/**
 * The segments in an `options` attribute: `western:Western|japanese:Japanese`. A segment with no colon is its own value and label. Empty values and repeats are left out.
 * @example
 * parseSegments("a:Alpha|b"); // [{ value: "a", label: "Alpha" }, { value: "b", label: "b" }]
 */
export function parseSegments(text: string | null | undefined): Segment[] {
  const found: Segment[] = [];
  for (const part of (text ?? "").split("|")) {
    const colon = part.indexOf(":");
    const value = (colon < 0 ? part : part.slice(0, colon)).trim();
    const label = (colon < 0 ? part : part.slice(colon + 1)).trim();
    if (value !== "" && !found.some((one) => one.value === value)) found.push({ value, label: label === "" ? value : label });
  }
  return found;
}
