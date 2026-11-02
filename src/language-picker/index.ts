// The language picker without the element: the codes, each language's own name, which one to start in and how one is applied. Nothing here touches the DOM until `applyLanguage` is called with an element.
export { applyLanguage, DEFAULT_LANGUAGES, LANGUAGE_ADDRESS_KEY, LANGUAGE_ATTRIBUTE, LANGUAGE_STORAGE_KEY, languageName, matchLanguage, normaliseCode, OWN_NAMES, parseLanguages, startingLanguage, type StartingLanguage } from "./languages.ts";
export { languageOf, WORDS, wordsFor, type Language, type PickerWords } from "./words.ts";
export const EVENT = "kazoku-languagechange";
export const TAG = "kazoku-language-picker";
