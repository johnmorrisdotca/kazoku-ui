// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface ThemeWords {
  group: string;
  light: string;
  dark: string;
  auto: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, ThemeWords> = {
  en: { group: "Colour theme", light: "Light", dark: "Dark", auto: "Auto" },
  ja: { group: "テーマ", light: "ライト", dark: "ダーク", auto: "自動" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<ThemeWords> = {}): ThemeWords => ({ ...WORDS[language], ...overrides });
