// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface ReplayWords {
  /** The name of the bar, said by a screen reader. */
  group: string;
  /** The button that starts playback. */
  play: string;
  /** The same button while playback is going. */
  pause: string;
  /** The button that goes back to the start. */
  start: string;
  /** The button that loops. */
  repeat: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, ReplayWords> = {
  en: { group: "Playback", play: "Play", pause: "Pause", start: "Start", repeat: "Repeat" },
  ja: { group: "再生の操作", play: "再生", pause: "一時停止", start: "最初へ", repeat: "繰り返し" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<ReplayWords> = {}): ReplayWords => ({ ...WORDS[language], ...overrides });
