// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface SpeedWords {
  /** The name of the group of buttons, said by a screen reader and shown before them. */
  group: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, SpeedWords> = {
  en: { group: "Speed" },
  ja: { group: "速さ" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<SpeedWords> = {}): SpeedWords => ({ ...WORDS[language], ...overrides });
