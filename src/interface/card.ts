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

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

/** An exponent as superscript characters: 27 is "²⁷", -5 is "⁻⁵". */
export const superscript = (exponent: number): string => [...String(exponent)].map((char) => SUPERSCRIPT[char] ?? char).join("");

/** A number in two pieces, for a part that draws the exponent as a real superscript: `1.898 × 10` and `27`. */
export interface ScientificParts {
  mantissa: string;
  exponent: number;
}

/**
 * The pieces of a very large or very small number (a size of a billion or more, or under a thousandth): "1.898" and 27 for 1.898e27. `undefined` for any number that is written in full, and for text.
 * @example
 * scientificParts(1.8982e27); // { mantissa: "1.898", exponent: 27 }
 */
export function scientificParts(value: string | number | null | undefined): ScientificParts | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const size = Math.abs(value);
  if (size === 0 || (size < 1e9 && size >= 1e-3)) return undefined;
  const [mantissa, exponent] = Number(value.toPrecision(4)).toExponential().split("e") as [string, string];
  return { mantissa, exponent: Number(exponent) };
}

/**
 * A number as the card writes it: up to six significant figures with thousands separated, and for the very large and the very small a power of ten with a real superscript ("1.898 × 10²⁷", never "1.898e27").
 * Text is returned as it is; a missing value is "—". A part that can draw markup writes the exponent in `<sup>` from `scientificParts`; this is the same number as plain text.
 * @example
 * formatValue(142984); // "142,984"
 * formatValue(1.898e27); // "1.898 × 10²⁷"
 * formatValue(0.00001234); // "1.234 × 10⁻⁵"
 */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() === "" ? "—" : value;
  if (!Number.isFinite(value)) return "—";
  const parts = scientificParts(value);
  if (parts !== undefined) return `${parts.mantissa} × 10${superscript(parts.exponent)}`;
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
