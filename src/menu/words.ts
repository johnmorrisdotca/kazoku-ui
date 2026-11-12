// The labels, in English and Japanese. Every key is in both; a test holds that.
export interface MenuWords {
  settings: string;
  resources: string;
  close: string;
}

export type Language = "en" | "ja";

/** Which menu the button names. Anything else is Settings. */
export type MenuWhich = "settings" | "resources";

export const WORDS: Record<Language, MenuWords> = {
  en: { settings: "Settings", resources: "Resources", close: "Close" },
  ja: { settings: "設定", resources: "資料", close: "閉じる" },
};

/** The language to use for a `lang` value such as "ja", "ja-JP" or "en-CA": Japanese for ja, English for anything else. */
export const languageOf = (lang: string | null | undefined): Language => (/^ja\b/i.test(lang ?? "") ? "ja" : "en");

export const wordsFor = (language: Language, overrides: Partial<MenuWords> = {}): MenuWords => ({ ...WORDS[language], ...overrides });

/** `resources` names the resources menu. Anything else, including a missing value, names Settings. */
export function parseWhich(value: string | null | undefined): MenuWhich {
  return value?.trim().toLowerCase() === "resources" ? "resources" : "settings";
}
