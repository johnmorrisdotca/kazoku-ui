// The picker's one label, in English and Japanese. The names of the languages are not here: each is written in its own language (`languageName`).
export interface PickerWords {
  group: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, PickerWords> = {
  en: { group: "Language" },
  ja: { group: "言語" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<PickerWords> = {}): PickerWords => ({ ...WORDS[language], ...overrides });
