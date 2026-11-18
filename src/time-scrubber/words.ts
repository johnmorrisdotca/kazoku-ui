// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface ScrubberWords {
  /** The name of the whole control, said by a screen reader. */
  group: string;
  /** The slider's name. */
  slider: string;
  /** The date field's name. */
  field: string;
  /** The name of the row of scale buttons. */
  scales: string;
  /** The scale buttons: years, months, days. */
  year: string;
  month: string;
  day: string;
  /** What the field says when the text is not a date. */
  invalid: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, ScrubberWords> = {
  en: { group: "Date", slider: "Date slider", field: "Go to date", scales: "Step size", year: "Year", month: "Month", day: "Day", invalid: "Enter a date such as 2026-11-17" },
  ja: { group: "日付", slider: "日付スライダー", field: "日付を指定", scales: "刻み", year: "年", month: "月", day: "日", invalid: "日付を入力してください（例：2026-11-17）" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<ScrubberWords> = {}): ScrubberWords => ({ ...WORDS[language], ...overrides });
