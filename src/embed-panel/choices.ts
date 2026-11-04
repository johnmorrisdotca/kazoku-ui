// What the panel's choices are, without the element: the tabs, the sizes and the compact picker's list. Nothing here touches the DOM, so it imports on a server.
import { EMBED_KINDS } from "./snippets.ts";

/** The sizes (pixels across) the size buttons offer by default. */
export const DEFAULT_SIZES: readonly number[] = [160, 240, 320, 480];

/** The size the panel starts on when the page names none and it is one of the sizes. */
export const DEFAULT_SIZE = 320;

/** The tabs the panel shows when the page names none: the seven ways a page is made. */
export const DEFAULT_KINDS: readonly string[] = EMBED_KINDS;

/** The address parameters the panel keeps its two choices in. */
export const KIND_ADDRESS_KEY = "embed";
export const SIZE_ADDRESS_KEY = "size";

/** More than this many things to pick from and the picker shows a search box. */
export const SEARCH_FROM = 12;

/**
 * One thing the compact picker offers: a planet, a jersey, a stadium.
 *
 * @example
 * ```ts
 * import { type PickItem } from "@johnmorrisdotca/kazoku-ui/embed-panel";
 *
 * const mars: PickItem = { id: "mars", label: "Mars", group: "Planets" };
 * console.log(mars.label);
 * ```
 */
export interface PickItem {
  /** What the page reads back from `value`. */
  id: string;
  /** What the button says. */
  label: string;
  /** The row of choices it is under (chips above the list); items with no group are only under All. */
  group?: string;
  /** More words the search matches (another name, a country). */
  words?: string;
}

/** The tab ids from a text such as `html module react`: lower case, once each, in order; no usable id is the default list. */
export function parseKinds(text: string | null | undefined, fallback: readonly string[] = DEFAULT_KINDS): string[] {
  const found = [...new Set((text ?? "").toLowerCase().split(/[\s,]+/).filter((id) => /^[a-z][a-z0-9-]*$/.test(id)))];
  return found.length > 0 ? found : [...fallback];
}

/** The sizes from a text such as `160 240 320`: whole numbers from 16 up to 4096, once each, smallest first; no usable number is the default sizes. */
export function parseSizes(text: string | null | undefined, fallback: readonly number[] = DEFAULT_SIZES): number[] {
  const found = [...new Set((text ?? "").split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 16 && n <= 4096))].sort((a, b) => a - b);
  return found.length > 0 ? found : [...fallback];
}

/** The size to use for a wish: the wish if it is one of the sizes, else the sizes' nearest to it, else the one nearest `DEFAULT_SIZE`. */
export function nearestSize(wish: number | string | null | undefined, sizes: readonly number[]): number {
  const want = Number(wish);
  const aim = Number.isFinite(want) && wish !== null && wish !== undefined && String(wish).trim() !== "" ? want : DEFAULT_SIZE;
  let best = sizes[0] ?? DEFAULT_SIZE;
  for (const size of sizes) if (Math.abs(size - aim) < Math.abs(best - aim)) best = size;
  return best;
}

/** The groups of a list, once each, in the order they first appear. */
export function groupsOf(items: readonly PickItem[]): string[] {
  return [...new Set(items.flatMap((item) => (item.group !== undefined && item.group !== "" ? [item.group] : [])))];
}

/** The items that are in `group` (all of them when it is empty) and have every word of `query` in their label, id, group or words, ignoring case and accents. */
export function filterItems(items: readonly PickItem[], query = "", group = ""): PickItem[] {
  const fold = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const needles = fold(query).split(/\s+/).filter((word) => word !== "");
  return items.filter((item) => {
    if (group !== "" && item.group !== group) return false;
    const hay = fold(`${item.label} ${item.id} ${item.group ?? ""} ${item.words ?? ""}`);
    return needles.every((word) => hay.includes(word));
  });
}
