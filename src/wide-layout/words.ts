// The labels, in English and Japanese. Every key is in both; a test holds that. The button names the layout a press gives: "Wide" in Normal, "Normal" in Wide.
export interface WideWords {
  /** The group's name for a screen reader. */
  group: string;
  /** The button in Normal: press for wide. */
  wide: string;
  /** The button in Wide: press for normal. */
  normal: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, WideWords> = {
  en: { group: "Page layout", wide: "Wide", normal: "Normal" },
  ja: { group: "ページの広さ", wide: "ワイド", normal: "ふつう" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<WideWords> = {}): WideWords => ({ ...WORDS[language], ...overrides });
