// What a page's source returns, and the plan of what the box draws from it. Nothing here touches the DOM, so it imports on a server.
import type { RowIcon, SearchIcon } from "./icons.ts";
import { countPhrase, type SearchBoxWords } from "./words.ts";

/** What a row can do. A row carries up to three. */
export interface SearchAction {
  /** What `kazoku-search-pick` reports in `detail.action`. */
  id: string;
  /** The word for the action: its tooltip, and for a screen reader the word and the row (`Favourite Mars`). Drawn as text on the button when the action has no `icon`. */
  label: string;
  /** What the button wears: a built-in name (`star`, `show`, `go`, `dot`) or the page's own path data (`{ path: "M4 12h16" }`, on a 24 by 24 grid). Left out, the action is a small text button. */
  icon?: SearchIcon;
  /** Set (true or false) to make this a toggle: the button is pressed or not, and the pick reports the new state. Left out, it is a plain button. */
  pressed?: boolean;
  /** Set to true when the action cannot be done now (a kind with nothing to do yet). It is drawn dimmed and marked `aria-disabled`; Enter, a press and a press on the row's text (for the first action) do nothing and report nothing. The arrows still reach it, so a reader hears why. */
  disabled?: boolean;
  /** Why the action is disabled, or what it does. Shown as the button's tooltip and given to a screen reader as its description. */
  title?: string;
}

/** One result. */
export interface SearchRow {
  /** Stable id, reported by the pick. */
  id: string;
  /** The name a reader sees, in their language. The part the query matched is marked. */
  label: string;
  /** A second line (a kind, a place, a figure). Not matched, not marked. */
  detail?: string;
  /** A small picture before the name, drawn 20 px square: a built-in shape (`disc`, `ring`, `star`, `dot`, `square`) with an optional colour, path data, a few characters (a flag), or a picture's address. Rows without one keep the space so the names line up. */
  icon?: RowIcon;
  /** What the preview pane shows for this row: the preview itself, or a function that makes it when the row is highlighted. Left out, the box's `loadPreview` is used, and when that is not set the pane shows the row's name, its icon and its kind only. Nothing is asked for a row that is not highlighted. */
  preview?: SearchPreview | SearchPreviewSource;
  /** Up to three actions. The first is the default: Enter, and a press on the row's text, fire it. Left out, the row has one, `open`. */
  actions?: readonly SearchAction[];
}

/** One fact in a preview: a label and its value, drawn as a term and its description. */
export interface SearchFact {
  label: string;
  value: string;
}

/** What the preview pane shows for one row. Everything is optional: a preview with nothing in it shows the row's name, icon and kind. */
export interface SearchPreview {
  /** The name, when it should differ from the row's `label` (a longer form). */
  title?: string;
  /** The kind, in the reader's language. Left out, the group's label. */
  kind?: string;
  /** A few facts as label and value, at most `MAX_FACTS` (8). Values are text, never markup. */
  facts?: readonly SearchFact[];
  /** A picture's address, loaded only once this preview is shown (lazily), in a box of fixed size so nothing around it moves. Must pass `isSafeImageUrl`. */
  picture?: string;
  /** What the picture shows, for a screen reader. Left out, the picture is decorative. */
  pictureAlt?: string;
  /** A node the page makes (a canvas, a drawing), drawn in the picture's box instead of `picture`. It is kept and reused when the row is highlighted again. */
  element?: Node;
}

/** What the box tells a preview function with each call. */
export interface PreviewContext {
  /** Aborted when another row is highlighted before this one is ready. A function that can stop its request does; one that cannot is not harmed, because its late answer is dropped. */
  signal: AbortSignal;
  /** The id of the row's group. */
  group: string;
}

/** The page's preview function: the row, and the group and signal, to a preview or a promise of one. `undefined` means nothing more is known about the row. */
export type SearchPreviewSource = (row: SearchRow, context: PreviewContext) => Promise<SearchPreview | undefined> | SearchPreview | undefined;

/** The results of one kind. */
export interface SearchGroup {
  /** Stable id: `stars`, `planets`. Reported by the pick, and passed back to the source as `group` when the reader narrows to it. */
  id: string;
  /** The kind's name, in the reader's language. */
  label: string;
  /** How many results the kind has in all, which may be more than `rows` holds. */
  total: number;
  /** The rows to draw. The box draws a few of them (`per-group`), or a window of them once narrowed. */
  rows: readonly SearchRow[];
}

/** What the box tells a source with each call. */
export interface SearchContext {
  /** Aborted when a newer call replaces this one. A source that can stop its request does; one that cannot is not harmed, because its late answer is dropped. */
  signal: AbortSignal;
  /** The id of the group the reader narrowed to (a chip, or See all), or "" for every group. */
  group: string;
}

/**
 * The page's search. It returns groups, or a promise of them. When `group` is set it should give that group all the rows it can (the box draws them in windows) and may send
 * the other groups with `rows: []` and their `total`, so the chips keep their counts.
 */
export type SearchSource = (query: string, context: SearchContext) => Promise<readonly SearchGroup[]> | readonly SearchGroup[];

/** What `kazoku-search-pick` carries in `detail`. */
export interface SearchPickDetail {
  /** The row's id. */
  id: string;
  /** The id of the group the row is in. */
  group: string;
  /** The action's id. */
  action: string;
  /** For a toggle action: the state it is in now. Left out for a plain button. */
  pressed?: boolean;
}

/** The most actions a row shows. */
export const MAX_ACTIONS = 3;

/** The id of the action the box adds to a row on a narrow screen, which opens the preview; it is never reported by `kazoku-search-pick`. */
export const PREVIEW_ACTION_ID = "kazoku-preview";

/** One line of the plan the box draws. */
export type PlanLine =
  | { type: "header"; group: SearchGroup; shown: number }
  | { type: "row"; group: SearchGroup; row: SearchRow }
  | { type: "all"; group: SearchGroup }
  | { type: "more"; group: SearchGroup; remaining: number };

/**
 * A row's actions: its own, at most three, or the one default `open`.
 *
 * @example
 * actionsOf({ id: "mars", label: "Mars" }).map((action) => action.id); // ["open"]
 */
export function actionsOf(row: SearchRow, openLabel = "Open"): SearchAction[] {
  const own = (row.actions ?? []).slice(0, MAX_ACTIONS);
  return own.length > 0 ? own : [{ id: "open", label: openLabel }];
}

/**
 * How many of a row's actions to draw on its line. `room` is the width the actions may use (the row's width less the name's smallest share), `widths` is each action's own width,
 * `moreWidth` the width of the one button that holds the rest, and `gap` the space between buttons. All of them when they fit; otherwise as many as leave room for the "more" button,
 * and never fewer than one. A lone action is never put behind "more".
 *
 * @example
 * actionsFit(200, [30, 30, 30], 30, 4); // 3
 * actionsFit(100, [60, 40, 70], 30, 4); // 1
 */
export function actionsFit(room: number, widths: readonly number[], moreWidth: number, gap: number): number {
  if (widths.length <= 1) return widths.length;
  const need = (count: number): number => widths.slice(0, count).reduce((sum, w) => sum + w, 0) + gap * Math.max(0, count - 1);
  if (need(widths.length) <= room) return widths.length;
  for (let count = widths.length - 1; count >= 1; count -= 1) if (need(count) + gap + moreWidth <= room) return count;
  return 1;
}

/**
 * Whether an action can be done: every action can, unless the page set `disabled`.
 *
 * @example
 * isActionEnabled({ id: "go", label: "Go", disabled: true }); // false
 */
export const isActionEnabled = (action: SearchAction): boolean => action.disabled !== true;

/**
 * The sentence said politely when a toggle action changes: the action, the row, then the new state (`Favourite Mars, on`).
 *
 * @example
 * toggleAnnouncement(WORDS.en, "Favourite", "Mars", true); // "Favourite Mars, on"
 */
export function toggleAnnouncement(words: SearchBoxWords, actionLabel: string, rowLabel: string, pressed: boolean): string {
  return `${actionLabel} ${rowLabel}${words.join}${pressed ? words.on : words.off}`;
}

/**
 * What to draw for an answer. Not narrowed: each group with rows gets a header, its first `perGroup` rows, and `See all` when it has more results than it draws. Narrowed to
 * one group: that group's header and its first `windowSize` rows, then `Show more` while rows are left. Groups with no rows and no total are left out.
 *
 * @example
 * planLines([{ id: "stars", label: "Stars", total: 9, rows: [{ id: "a", label: "Vega" }] }], "", 3, 20).map((line) => line.type); // ["header", "row", "all"]
 */
export function planLines(groups: readonly SearchGroup[], narrowed: string, perGroup: number, windowSize: number, drawn = windowSize): PlanLine[] {
  const lines: PlanLine[] = [];
  for (const group of groups) {
    if (narrowed !== "" && group.id !== narrowed) continue;
    if (group.rows.length === 0) continue;
    if (narrowed === "") {
      const shown = group.rows.slice(0, Math.max(1, perGroup));
      lines.push({ type: "header", group, shown: shown.length });
      for (const row of shown) lines.push({ type: "row", group, row });
      if (group.total > shown.length) lines.push({ type: "all", group });
    } else {
      const shown = group.rows.slice(0, Math.max(1, drawn));
      lines.push({ type: "header", group, shown: shown.length });
      for (const row of shown) lines.push({ type: "row", group, row });
      if (group.rows.length > shown.length) lines.push({ type: "more", group, remaining: group.rows.length - shown.length });
    }
  }
  return lines;
}

/**
 * The chips for an answer: every group with results, in the source's order.
 *
 * @example
 * chipsOf([{ id: "stars", label: "Stars", total: 9, rows: [] }]); // [{ id: "stars", label: "Stars", total: 9 }]
 */
export function chipsOf(groups: readonly SearchGroup[]): Array<{ id: string; label: string; total: number }> {
  return groups.filter((group) => group.total > 0 || group.rows.length > 0).map((group) => ({ id: group.id, label: group.label, total: Math.max(group.total, group.rows.length) }));
}

/**
 * The sentence said politely when an answer arrives: how many results, then each kind and its count. Nothing matched gives the empty word.
 *
 * @example
 * announcement(WORDS.en, [{ id: "stars", label: "Stars", total: 9, rows: [] }]); // "9 results: Stars 9"
 */
export function announcement(words: SearchBoxWords, groups: readonly SearchGroup[]): string {
  const chips = chipsOf(groups);
  if (chips.length === 0) return words.empty;
  const total = chips.reduce((sum, chip) => sum + chip.total, 0);
  const kinds = chips.map((chip) => words.kindCount.replace("{label}", chip.label).replace("{n}", String(chip.total))).join(words.join);
  return words.announce.replace("{count}", countPhrase(words, total)).replace("{kinds}", kinds);
}

/**
 * The next place in a list of `count` rows: past either end it is `-1` (the box itself), and a move from the box goes to the first row (down) or the last (up).
 *
 * @example
 * stepIndex(-1, 3, 1); // 0, down from the box
 * stepIndex(2, 3, 1); // -1, down from the last row is the box
 */
export function stepIndex(current: number, count: number, step: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return step === 1 ? 0 : count - 1;
  const next = current + step;
  if (next < 0 || next >= count) return -1;
  return next;
}
