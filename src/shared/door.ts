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
  /** `nameJa` is the name in Japanese for a Japanese line (a source's own terms, `"UCAC4の利用条件"`); left out, a plain phrase is translated and an identifier stays. */
  licence: { name: string; nameJa?: string; url: string; nonCommercial?: boolean; shareAlike?: boolean };
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

/** Licence names that are plain phrases, not identifiers, and so are translated: "Public domain" is パブリックドメイン. Identifiers such as "CC BY-NC 3.0 IGO" are names and stay as they are. The same table as the data door's template (`templates/data-door.ts`), which a test holds it to. */
export const JA_LICENCE_NAMES: Readonly<Record<string, string>> = { "public domain": "パブリックドメイン", "published for use with credit": "出典を示せば利用可" };

/** The licence's name in the language: in Japanese the source's own `nameJa` first, then a plain phrase translated; an identifier stays as it is. */
export function licenceName(info: DoorSourceInfo, language: Language = "en"): string {
  if (language !== "ja") return info.licence.name;
  return info.licence.nameJa?.trim() || JA_LICENCE_NAMES[info.licence.name.trim().toLowerCase()] || info.licence.name;
}

/**
 * The terms of a source in words: its licence name, with "non-commercial" or "share-alike" when it says so, so a page cannot hide the terms of the data it draws. In Japanese the terms follow the
 * name in full-width parentheses: "CC BY-NC 3.0 IGO（非営利のみ、同一条件で共有）".
 * @example
 * licenceText(info, WORDS.en); // "CC BY-NC 3.0 IGO (non-commercial)"
 */
export function licenceText(info: DoorSourceInfo, words: { nonCommercial: string; shareAlike: string }, language: Language = "en"): string {
  const flags = [info.licence.nonCommercial === true ? words.nonCommercial : "", info.licence.shareAlike === true ? words.shareAlike : ""].filter((flag) => flag !== "");
  const name = licenceName(info, language);
  if (flags.length === 0) return name;
  return language === "ja" ? `${name}（${flags.join("、")}）` : `${name} (${flags.join(", ")})`;
}

/**
 * A credit line from a view's `credits()`: each source's credit with its licence, the package's own first, joined with semicolons and ending in a full stop (in Japanese the licence goes in one pair of （） and the sources are joined with ／, with no full stop). An empty list is an empty string.
 * @example
 * creditsText(view.credits(), "en", WORDS.en); // "Yale Bright Star Catalogue, public domain (Public domain); UCAC4 … (CC0 1.0)."
 */
export function creditsText(credits: readonly DoorCredit[], language: Language, words: { nonCommercial: string; shareAlike: string }): string {
  const ordered = [...credits.filter((credit) => credit.own), ...credits.filter((credit) => !credit.own)];
  const ja = language === "ja";
  const parts = ordered.map((credit) => {
    const text = credit.source.credit[language] || credit.source.credit.en;
    if (!ja) return `${text} (${licenceText(credit.source, words)})`;
    // Japanese: one pair of full-width parentheses, the licence name and its terms in a flat list after "、".
    const { licence } = credit.source;
    const terms = [licenceName(credit.source, language), licence.nonCommercial === true ? words.nonCommercial : "", licence.shareAlike === true ? words.shareAlike : ""].filter((term) => term !== "");
    return `${text}（${terms.join("、")}）`;
  });
  return parts.length === 0 ? "" : ja ? parts.join("／") : `${parts.join("; ")}.`;
}
