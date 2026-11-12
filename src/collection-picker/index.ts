// The collection picker without the element: the search and the chosen order. Nothing here touches the DOM, so it imports on a server.
export { addId, indexItems, moveId, removeId, searchItems, SUGGEST_LIMIT, type CollectionItem, type IndexedItem } from "./items.ts";
export { languageOf, WORDS, wordsFor, type CollectionWords, type Language } from "./words.ts";

/** Fired on the element when the chosen ids change. `detail` is `{ ids, reason }`. */
export const EVENT = "kazoku-collectionchange";
export const TAG = "kazoku-collection-picker";
