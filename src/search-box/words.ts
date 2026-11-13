// The search box's labels, in English and Japanese. Every key is in both; a test holds that. Result names are not here: the page's source returns those in the reader's language.
export interface SearchBoxWords {
  /** The box's accessible name and its placeholder. */
  search: string;
  /** The name of the row of kind chips. */
  kinds: string;
  /** The chip that clears the narrowing. */
  all: string;
  /** The row that narrows to one group. `{n}` is the group's total. */
  seeAll: string;
  /** The row that draws the next window of a narrowed group. */
  showMore: string;
  /** What the popup says when nothing matches. */
  empty: string;
  /** What the popup says while an answer is on its way. */
  searching: string;
  /** What the popup says when the page's source fails. */
  failed: string;
  /** The name of the popup of results. */
  results: string;
  /** One result, as a phrase. `{n}` is the number. */
  countOne: string;
  /** Several results, as a phrase. `{n}` is the number. */
  countMany: string;
  /** Said once an answer arrives: how many in all, then the kinds. `{count}` is the phrase for the total, `{kinds}` the list. */
  announce: string;
  /** One kind and its count inside the announcement. `{label}` is the kind's name, `{n}` its total. */
  kindCount: string;
  /** What separates the kinds in the announcement, and a kind from its count once narrowed. */
  join: string;
  /** What a row without actions of its own does, as an action id's label. */
  open: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, SearchBoxWords> = {
  en: {
    search: "Search",
    kinds: "Kinds",
    all: "All",
    seeAll: "See all {n}",
    showMore: "Show more",
    empty: "No matches",
    searching: "Searching…",
    failed: "The search failed",
    results: "Results",
    countOne: "{n} result",
    countMany: "{n} results",
    announce: "{count}: {kinds}",
    kindCount: "{label} {n}",
    join: ", ",
    open: "Open",
  },
  ja: {
    search: "検索",
    kinds: "種類",
    all: "すべて",
    seeAll: "{n}件すべてを見る",
    showMore: "もっと見る",
    empty: "一致するものはありません",
    searching: "検索中…",
    failed: "検索できませんでした",
    results: "検索結果",
    countOne: "{n}件",
    countMany: "{n}件",
    announce: "{count}：{kinds}",
    kindCount: "{label}{n}件",
    join: "、",
    open: "開く",
  },
};

/**
 * Japanese for a `lang` that starts with ja, English for anything else.
 *
 * @example
 * languageOf("ja-JP"); // "ja"
 */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

/**
 * The words for a language, with any key a page wants said another way replaced.
 *
 * @example
 * wordsFor("en", { search: "Find a star" }).search; // "Find a star"
 */
export const wordsFor = (language: Language, overrides: Partial<SearchBoxWords> = {}): SearchBoxWords => ({ ...WORDS[language], ...overrides });

/**
 * `n` as a phrase: "1 result", "12 results" (English), "12件" (Japanese).
 *
 * @example
 * countPhrase(WORDS.en, 12); // "12 results"
 */
export function countPhrase(words: SearchBoxWords, n: number): string {
  return (n === 1 ? words.countOne : words.countMany).replace("{n}", String(n));
}
