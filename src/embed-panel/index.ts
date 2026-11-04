// The embed panel without the element: the seven ways a page is made and their text, the sizes, the tab and picker choices, the words. Nothing here touches the DOM, so it imports on a server.
export { DEFAULT_KINDS, DEFAULT_SIZE, DEFAULT_SIZES, filterItems, groupsOf, KIND_ADDRESS_KEY, nearestSize, parseKinds, parseSizes, SEARCH_FROM, SIZE_ADDRESS_KEY, type PickItem } from "./choices.ts";
export { attrText, EMBED_KINDS, embedSnippet, type EmbedKind, type SnippetSpec } from "./snippets.ts";
export { kindLabel, languageOf, WORDS, wordsFor, type Language, type PanelWords } from "./words.ts";
export const EVENT = "kazoku-embedchange";
export const TAG = "kazoku-embed-panel";
