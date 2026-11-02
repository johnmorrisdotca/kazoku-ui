// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface SaveWords {
  group: string;
  png: string;
  svg: string;
  saved: string;
  failed: string;
}

export type Language = "en" | "ja";

export const WORDS: Record<Language, SaveWords> = {
  en: { group: "Save image", png: "Save PNG", svg: "Save SVG", saved: "Saved", failed: "Could not save" },
  ja: { group: "画像を保存", png: "PNGで保存", svg: "SVGで保存", saved: "保存しました", failed: "保存できませんでした" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<SaveWords> = {}): SaveWords => ({ ...WORDS[language], ...overrides });
