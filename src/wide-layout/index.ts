// The wide layout without the element: the choice, how it is applied, where it is remembered, the key, and the CSS rule. Nothing here touches the DOM until a function is called with an element.
export const EVENT = "kazoku-widechange";
export const TAG = "kazoku-wide-toggle";
export { applyWide, isTyping, parseWide, readWide, WIDE_ADDRESS_KEY, WIDE_ATTRIBUTE, WIDE_MIN_WIDTH_PX, WIDE_STORAGE_KEY, wideCss, wideOf, type RememberedWide, type WideCssOptions } from "./wide.ts";
export { languageOf, WORDS, wordsFor, type Language, type WideWords } from "./words.ts";
