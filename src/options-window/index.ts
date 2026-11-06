// The options window without the element: placement, frames and words. Nothing here touches the DOM, so it imports on a server.
export { addressKeys, frameOf, namedPlace, OPEN_KEY, parsePlace, parseVariant, PLACE_KEY, settle, SNAPS, VARIANTS, type Place, type Point, type Snap, type Variant, type ViewSize, type WindowContent } from "./place.ts";
export { gestureHelp, languageOf, WORDS, wordsFor, type Language, type OptionsWords } from "./words.ts";

export const TAG = "kazoku-options-window";
