// The reading page's data and its rules, with no DOM: an object's own page, the same for every kind of object.
import { type Bilingual, type CardAction, type SourceLink, formatValue } from "./card.ts";
import type { TrailItem } from "./trail.ts";

/** One of the three "Right now" tiles: a label over a mono value, worked out for the time shown. */
export interface ReadingTile {
  label: Bilingual;
  value: string | number | null | undefined;
  unit?: string;
  /** A small line under the value: "Light takes 43 minutes to arrive". */
  note?: Bilingual;
  /** A link at the foot of the tile: "Show my sky". */
  link?: CardAction;
  source: SourceLink | undefined;
}

/** One row of "The numbers": the measure, its value, a comparison, and where the number comes from. */
export interface ReadingRow {
  label: Bilingual;
  value: string | number | null | undefined;
  unit?: string;
  /** What it is compared with: "11 times Earth's radius". */
  comparison?: Bilingual;
  source: SourceLink | undefined;
}

/** A link tile to a related object. */
export interface ReadingRelated {
  label: Bilingual;
  /** What kind of thing it is, or a short line of numbers in mono: "about 22 km across · orbits in 7 h 39 min". */
  kind?: Bilingual;
  /** A small picture, as an address. */
  picture?: string;
  href: string;
}

/** A group of related objects under a heading: "Its moons", "Places to land". */
export interface ReadingGroup {
  title: Bilingual;
  items: readonly ReadingRelated[];
}

/** Everything the reading page shows. */
export interface ReadingPageData {
  picture?: { src: string; alt: Bilingual };
  /** Where this page sits: Atlas / Planets / Mars. */
  breadcrumb?: readonly TrailItem[];
  kind: Bilingual;
  name: Bilingual;
  /** One sentence. */
  summary: Bilingual;
  /** The buttons: the first is filled ("See it in the Universe"), the rest outlined. */
  actions: readonly CardAction[];
  /** Three tiles. */
  now: readonly ReadingTile[];
  numbers: readonly ReadingRow[];
  related: readonly ReadingGroup[];
}

/**
 * What is wrong with a reading page's data, in words: a number with no source, a "Right now" row that is not three tiles or has a blank, no actions, no summary.
 * An empty list means the page is fine.
 */
export function readingProblems(data: ReadingPageData): string[] {
  const problems: string[] = [];
  if (data.name.en.trim() === "") problems.push("the page has no name");
  if (data.summary.en.trim() === "") problems.push("the page has no summary sentence");
  if (data.actions.length === 0) problems.push("the page has no buttons");
  if (data.now.length !== 3) problems.push(`"Right now" is three tiles, not ${data.now.length}`);
  for (const tile of data.now) {
    if (formatValue(tile.value) === "—") problems.push(`the tile ${tile.label.en} is computed and shows no value`);
    if (tile.source === undefined || tile.source.href === "") problems.push(`the tile ${tile.label.en} has no source link`);
  }
  for (const row of data.numbers) if (row.source === undefined || row.source.href === "") problems.push(`${row.label.en} has no source link`);
  return problems;
}
