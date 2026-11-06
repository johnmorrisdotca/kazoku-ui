// The labels, in English and Japanese. The gesture line is the view controls' own, so a window and a page say it once.
import { wordsFor as viewWords } from "../view-controls/words.ts";

export interface OptionsWords {
  /** The name of the window when the page gives it none. */
  group: string;
  /** The button that folds the window to its title. */
  collapse: string;
  /** The title chip that opens a folded window. */
  expand: string;
  /** The ? button. */
  help: string;
  /** The same button while help is open. */
  closeHelp: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, OptionsWords> = {
  en: { group: "Options", collapse: "Collapse", expand: "Open", help: "Help", closeHelp: "Close help" },
  ja: { group: "オプション", collapse: "しまう", expand: "開く", help: "ヘルプ", closeHelp: "ヘルプを閉じる" },
};

/** Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<OptionsWords> = {}): OptionsWords => ({ ...WORDS[language], ...overrides });

/** The view's mouse and keyboard, in the reader's language. The same sentence the view controls show. */
export const gestureHelp = (language: Language): string => viewWords(language).gestures;
