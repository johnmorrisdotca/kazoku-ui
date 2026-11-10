// The labels, in English and Japanese. Every key is in both; a test holds that. They are the words the part says itself (Home, the sheets link, the credits link, the
// landmark names); the page's own words (its name, what the page shows, its credits) come from the page.
export interface PageFrameWords {
  /** The link to the demo's home page. */
  home: string;
  /** The link to the printable sheets. */
  sheets: string;
  /** The link to the credits page, and the lead-in to a page's own credit line. */
  credits: string;
  /** The name of the header's links for a screen reader. */
  site: string;
  /** What stands between the package's name and what the page shows: a colon. */
  colon: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, PageFrameWords> = {
  en: { home: "Home", sheets: "Printable sheets", credits: "Data and credits", site: "This site", colon: ": " },
  ja: { home: "ホーム", sheets: "印刷用シート", credits: "データと出典", site: "このサイト", colon: "：" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<PageFrameWords> = {}): PageFrameWords => ({ ...WORDS[language], ...overrides });
