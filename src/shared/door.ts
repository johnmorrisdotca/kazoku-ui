// The data door's shapes as far as the interface reads them (DESIGN-831-data-door.md), and the two functions that turn them into words: a source's terms, and a credit line.
// No DOM, so the page frame, the layers panel and a build all use it.
//
// TODO(MODULES-831): `SourceInfo` and `Credit` are the data door's, and `templates/data-door.ts` is not in kazoku-ui yet. These are copies of them, kept to what the interface reads.
// When the template lands, import the types from it and delete these; `creditsText` and `licenceText` stay (the door's own `creditLine` is for a package's footer, this one is for the page frame).
import type { Language } from "./language.ts";

/** A word or name in both languages. */
export interface Bilingual {
  en: string;
  ja: string;
}

/** The data door's description of a source: its name, its credit line, its licence and its page. */
export interface DoorSourceInfo {
  id: string;
  name: Bilingual;
  credit: Bilingual;
  licence: { name: string; url: string; nonCommercial?: boolean; shareAlike?: boolean };
  url: string;
}

/** What a view's `credits()` returns for each source that drew something in the last frame. */
export interface DoorCredit {
  source: DoorSourceInfo;
  /** True for the package's own data: bundled, never switched off from the layers panel. */
  own: boolean;
  /** Marks or tiles drawn from it. */
  used: number;
}

/** The terms of a source in words: its licence name, with "non-commercial" or "share-alike" when it says so, so a page cannot hide the terms of the data it draws. */
export function licenceText(info: DoorSourceInfo, words: { nonCommercial: string; shareAlike: string }): string {
  const flags = [info.licence.nonCommercial === true ? words.nonCommercial : "", info.licence.shareAlike === true ? words.shareAlike : ""].filter((flag) => flag !== "");
  return flags.length > 0 ? `${info.licence.name} (${flags.join(", ")})` : info.licence.name;
}

/**
 * A credit line from a view's `credits()`: each source's credit with its licence, the package's own first, joined with semicolons and ending in a full stop. An empty list is an empty string.
 * @example
 * creditsText(view.credits(), "en", WORDS.en); // "Yale Bright Star Catalogue, public domain (Public domain); UCAC4 … (CC0 1.0)."
 */
export function creditsText(credits: readonly DoorCredit[], language: Language, words: { nonCommercial: string; shareAlike: string }): string {
  const ordered = [...credits.filter((credit) => credit.own), ...credits.filter((credit) => !credit.own)];
  const parts = ordered.map((credit) => `${credit.source.credit[language] || credit.source.credit.en} (${licenceText(credit.source, words)})`);
  return parts.length === 0 ? "" : `${parts.join("; ")}.`;
}
