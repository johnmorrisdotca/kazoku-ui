// The theme switch without the element: the choices, how one is applied and where one is remembered. Nothing here touches the DOM until `applyTheme` is called with an element.
export { applyTheme, parseModes, parseTheme, readTheme, resolveTheme, THEME_ADDRESS_KEY, THEME_ATTRIBUTE, THEME_STORAGE_KEY, themeOf, THEMES, type RememberedTheme, type Scheme, type Theme } from "./theme.ts";
export { languageOf, WORDS, wordsFor, type Language, type ThemeWords } from "./words.ts";
export const EVENT = "kazoku-themechange";
export const TAG = "kazoku-theme-switch";
