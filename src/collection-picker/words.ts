// The collection picker's labels, in English and Japanese. Item names are not here: the page passes those in.
export interface CollectionWords {
  search: string;
  suggestions: string;
  chosen: string;
  add: string;
  remove: string;
  up: string;
  down: string;
  empty: string;
  none: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, CollectionWords> = {
  en: {
    search: "Search",
    suggestions: "Suggestions",
    chosen: "Chosen",
    add: "Add",
    remove: "Remove",
    up: "Move up",
    down: "Move down",
    empty: "Nothing matches",
    none: "Nothing chosen yet",
  },
  ja: {
    search: "検索",
    suggestions: "候補",
    chosen: "選んだもの",
    add: "加える",
    remove: "外す",
    up: "上へ",
    down: "下へ",
    empty: "見つかりません",
    none: "まだ何も選んでいません",
  },
};

/** Japanese for a `lang` that starts with ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<CollectionWords> = {}): CollectionWords => ({ ...WORDS[language], ...overrides });
