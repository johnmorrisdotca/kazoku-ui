// A collection's items and the chosen order. Nothing here touches the DOM, so it imports on a server.
// Search walks a prepared line of text. Seventeen thousand items stay in the browser's time: the walk stops after `limit` hits.

export interface CollectionItem {
  /** What kind of thing this is. The page decides the words (`body`, `place`). */
  kind: string;
  /** Stable id. The chosen list stores these, in order. */
  id: string;
  /** The name a reader sees. The page passes it in the reader's language. */
  name: string;
  /** A group the name can be searched with. Left out, the item has none. */
  group?: string;
  /** Extra words the search should find, besides the name, the kind and the id. */
  keywords?: readonly string[];
}

export interface IndexedItem {
  item: CollectionItem;
  hay: string;
}

/** How many suggestions a query shows, unless a caller asks for another number. */
export const SUGGEST_LIMIT = 8;

const fold = (text: string): string => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** One folded line per item, built once when the list is handed over, so each keystroke does not rebuild it. */
export function indexItems(items: readonly CollectionItem[]): IndexedItem[] {
  return items.map((item) => ({
    item,
    hay: fold([item.name, item.kind, item.id, item.group ?? "", ...(item.keywords ?? [])].join(" ")),
  }));
}

/**
 * The first `limit` items whose folded line holds every word of `query`.
 * An empty query matches nothing, so a closed box does not list every item.
 */
export function searchItems(index: readonly IndexedItem[], query = "", limit = SUGGEST_LIMIT): CollectionItem[] {
  const needles = fold(query).split(/\s+/).filter((word) => word !== "");
  if (needles.length === 0 || limit <= 0) return [];
  const out: CollectionItem[] = [];
  for (const row of index) {
    if (!needles.every((word) => row.hay.includes(word))) continue;
    out.push(row.item);
    if (out.length >= limit) break;
  }
  return out;
}

/** `id` at the end, once. An id already chosen is left where it is. */
export function addId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

/** `id` taken out. An unknown id leaves the list as it was. */
export function removeId(ids: readonly string[], id: string): string[] {
  return ids.filter((one) => one !== id);
}

/** `id` moved by one place. A missing id, or a move past either end, leaves the list as it was. */
export function moveId(ids: readonly string[], id: string, by: number): string[] {
  const at = ids.indexOf(id);
  const next = at + by;
  if (at < 0 || next < 0 || next >= ids.length) return [...ids];
  const copy = [...ids];
  const [taken] = copy.splice(at, 1);
  copy.splice(next, 0, taken as string);
  return copy;
}
