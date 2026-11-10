// The words of a page, in one table, and what is made from them: the title, the line at the top and the description are the same words, so they cannot disagree.
import { type Language } from "./words.ts";

/** One language's words for one page. */
export interface PageText {
  /** The package's name as that language writes it: "Hoshi Stars". */
  name: string;
  /** What this page shows, in plain words for a person who has never heard of the package: "Every one of the 88 constellations, pictured". */
  what: string;
  /** The page's description, for a search result and a shared link: one or two sentences. */
  description: string;
}

/** A page's words in each language. English is required, and stands in for a language that is left out. */
export interface PageTexts {
  en: PageText;
  ja?: PageText;
}

/** The words for `language`: its own table, else English. */
export const pickText = (texts: PageTexts, language: Language): PageText => texts[language] ?? texts.en;

/**
 * The page's `<title>`: the package's name, then what the page shows ("Hoshi Stars: The 88 constellations"; in Japanese a full-width colon).
 *
 * @example
 * pageTitle({ name: "Hoshi Stars", what: "The 88 constellations", description: "…" }); // "Hoshi Stars: The 88 constellations"
 */
export function pageTitle(text: Pick<PageText, "name" | "what">, language: Language = "en"): string {
  if (text.what === "") return text.name;
  return `${text.name}${language === "ja" ? "：" : ": "}${text.what}`;
}

/** Text as it is written into HTML, between tags or inside a double-quoted attribute. */
export const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
