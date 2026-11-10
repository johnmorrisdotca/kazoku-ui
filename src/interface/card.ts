// The object card's data and its rules, with no DOM: one layout for a star, planet, moon, galaxy, black hole or rocket, so a package fills it and does not draw its own.
import type { Bilingual } from "../shared/door.ts";
import type { Language } from "../shared/language.ts";

export type { Bilingual };

/** The place a number comes from. */
export interface SourceLink {
  /** What the link says, such as "NASA Planetary Fact Sheet". */
  label: string | Bilingual;
  href: string;
}

/** One number on the card: a label over a value. */
export interface CardStat {
  id: string;
  label: Bilingual;
  /** The value. A number is written for you (`formatValue`); text is shown as given. */
  value: string | number | null | undefined;
  /** The unit, shown after the value in the same mono type: "km", "K", "AU". */
  unit?: string;
  /** True when the page works it out for the time shown (a distance now, a phase). Such a value is never blank. */
  computed?: boolean;
  /** Where the number comes from. Every number has one. */
  source: SourceLink | undefined;
}

/** A button on the card: a link. The first is the filled one ("Open page"), the second outlined. */
export interface CardAction {
  label: Bilingual;
  href: string;
}

/** Everything the card shows. */
export interface ObjectCardData {
  /** The label line: the kind, such as "Planet · gas giant". */
  kind: Bilingual;
  /** The name, with its Japanese name beside it: "Mars 火星". */
  name: Bilingual;
  stats: readonly CardStat[];
  primary?: CardAction;
  secondary?: CardAction;
}

/** `text` in the language, or its English when the other is empty. */
export const say = (text: string | Bilingual, language: Language): string => (typeof text === "string" ? text : text[language] || text.en);

/**
 * A number as the card writes it: up to six significant figures with thousands separated, and powers of ten for the very large and the very small ("1.898e27"). Text is returned as it is;
 * a missing value is "—".
 * @example
 * formatValue(142984); // "142,984"
 * formatValue(1.898e27); // "1.898e27"
 */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() === "" ? "—" : value;
  if (!Number.isFinite(value)) return "—";
  const size = Math.abs(value);
  if (size !== 0 && (size >= 1e9 || size < 1e-3)) return Number(value.toPrecision(4)).toExponential().replace("e+", "e");
  return Number(value.toPrecision(6)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Whether a stat has a value to show. */
export const hasValue = (stat: CardStat): boolean => formatValue(stat.value) !== "—";

/**
 * What is wrong with a card, in words, for a test or a page's own check: a number with no source, a number that is computed and shows nothing, a card with no name or no stats, a second action with no first.
 * A card with none of these returns an empty list.
 */
export function cardProblems(data: ObjectCardData): string[] {
  const problems: string[] = [];
  if (data.name.en.trim() === "") problems.push("the card has no name");
  if (data.kind.en.trim() === "") problems.push("the card has no kind");
  if (data.stats.length === 0) problems.push("the card has no numbers");
  const seen = new Set<string>();
  for (const stat of data.stats) {
    if (seen.has(stat.id)) problems.push(`two numbers have the id ${stat.id}`);
    seen.add(stat.id);
    if (stat.source === undefined || stat.source.href.trim() === "") problems.push(`${stat.id} has no source link`);
    if (stat.computed === true && !hasValue(stat)) problems.push(`${stat.id} is computed and shows no value`);
  }
  if (data.secondary !== undefined && data.primary === undefined) problems.push("there is a second button and no first");
  return problems;
}
