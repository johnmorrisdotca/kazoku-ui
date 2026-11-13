// The preview feature, as one module the box loads only when it first has a preview to show (`import()` inside the element), so a page that uses the box without previews never loads the pane, the loader, the layout rules or their
// styles. The element keeps its own state (the rows, the active row and column) and gives this module a `host` to read and move it by.
import { adoptStyles } from "../shared/adopt.ts";
import { createPreviewPane, type PreviewPane } from "./pane.ts";
import { actionsOf, type PlanLine, type SearchAction, type SearchGroup, type SearchPreview, type SearchPreviewSource } from "./model.ts";
import { createPreviewLoader, type PreviewLoader, type PreviewTarget } from "./preview.ts";
import { PREVIEW_STYLES } from "./preview-styles.ts";
import { previewView } from "./preview-view.ts";
import type { SearchBoxWords } from "./words.ts";

/**
 * The popup's width from which the preview sits beside the list, in px; under it, the preview opens as a sheet from a Details button.
 *
 * @example
 * SIDE_MIN; // 540
 */
export const SIDE_MIN = 540;
/**
 * The width the popup grows to, when the page has room, to make a second column.
 *
 * @example
 * SIDE_WIDTH; // 672
 */
export const SIDE_WIDTH = 672;
/**
 * The quiet time, in ms, after a row is highlighted before its preview is asked for.
 *
 * @example
 * DEFAULT_PREVIEW_DELAY; // 150
 */
export const DEFAULT_PREVIEW_DELAY = 150;
/** Where the preview goes. */
export type Layout = "side" | "sheet";

/** A row of the box's grid, as far as the preview needs to see it. */
export interface PreviewRow {
  line: Exclude<PlanLine, { type: "header" }>;
  actions: SearchAction[];
}

/** What the element gives the preview to read and move its state by. */
export interface PreviewHost {
  root: ShadowRoot;
  element: HTMLElement;
  words(): SearchBoxWords;
  lang(): string;
  groups(): readonly SearchGroup[];
  rows(): readonly PreviewRow[];
  /** The index of the active row (-1 for none) and the active column. */
  active(): number;
  /** Move the highlight to a row and column, and close any open "more" line. */
  setActive(index: number, col: number): void;
  /** Draw the active row's marks again; `scroll` false leaves the list where it is. */
  mark(scroll: boolean): void;
  activate(entry: PreviewRow, col: number): void;
  /** Measure the rows again (the list came back after a sheet). */
  measure(): void;
  /** Draw the rows again, keeping the highlight. */
  redraw(): void;
  pressed(group: string, id: string, action: string): boolean | undefined;
  loadPreview(): SearchPreviewSource | undefined;
  delay(): number;
  say(text: string): void;
  input(): HTMLInputElement | null;
  focusInput(): void;
  nonce: string;
}

/**
 * The preview feature of one box: the pane, the loader, the layout (beside the list or a sheet), what the sheet does, the hover, and the description a screen reader gets. The element calls it at the points the preview matters, and nothing else.
 *
 * @example
 * // made by the box itself, the first time it has a preview to show
 * const control = createPreviewControl(host);
 */
export class PreviewControl {
  readonly pane: PreviewPane;
  readonly loader: PreviewLoader;
  /** True while the preview is in use for the drawn answer: a row carries one, or the page set `loadPreview`, and `preview` is not `off`. */
  on = false;
  layout: Layout = "side";
  /** True while the sheet is open (narrow layout only). */
  sheet = false;
  /** True when each row has the Details action: on a narrow layout, and for a finger. */
  info = false;
  readonly #host: PreviewHost;
  /** The width the popup is given to make room for the second column, or 0 for the box's own width. */
  #panelWidth = 0;
  #pointer = "";
  #cell: HTMLElement | undefined;
  /** What the pane was last made the description of: a cell of the grid, or the input while the sheet is open. */
  #described: HTMLElement | undefined;

  constructor(host: PreviewHost) {
    this.#host = host;
    this.pane = createPreviewPane(host.element.ownerDocument, {
      action: (row, actionId) => {
        const entry = host.rows().find((one) => one.line.type === "row" && one.line.group.id === row.group && one.line.row.id === row.id);
        if (entry) host.activate(entry, Math.max(0, entry.actions.findIndex((one) => one.id === actionId)));
        this.#refocus();
      },
      back: () => {
        this.closeSheet();
        this.#refocus();
      },
    });
    this.loader = createPreviewLoader({
      fallback: () => host.loadPreview(),
      get debounceMs() {
        return host.delay();
      },
      staleMs: 300,
      cacheSize: 200,
      onShow: (target, preview, failed) => this.#show(target, preview, failed),
      onWait: () => this.pane.wait(),
      onStale: () => this.pane.stale(),
    });
    adoptStyles(host.root, PREVIEW_STYLES, host.nonce);
    host.root.querySelector(".panel")?.append(this.pane.el);
    this.pane.words(host.words());
  }

  /** The preview's state for a draw: is it wanted, where does it go, and does each row need Details. Called at the start of each draw. */
  prepare(wanted: boolean): void {
    this.on = wanted;
    this.layout = wanted ? this.#layoutNow() : "side";
    if (!wanted) {
      // turned off: nothing waits for a preview and no sheet is open
      this.#panelWidth = 0;
      this.reset();
    }
    // a sheet belongs to the narrow layout
    if (this.layout === "side") this.sheet = false;
    this.info = wanted && (this.layout === "sheet" || this.#host.element.ownerDocument.defaultView?.matchMedia?.("(pointer: coarse)").matches === true);
  }

  /** Where the preview goes: beside the list when the popup is, or can be made, wide enough; otherwise in a sheet. Also works out the width the popup is to grow to. */
  #layoutNow(): Layout {
    const element = this.#host.element;
    const doc = element.ownerDocument;
    const rect = element.getBoundingClientRect();
    const viewport = doc.documentElement.clientWidth || doc.defaultView?.innerWidth || 0;
    const room = viewport - rect.left - 8;
    const width = Math.max(rect.width, Math.min(SIDE_WIDTH, room));
    const side = rect.width > 0 && width >= SIDE_MIN;
    this.#panelWidth = side && width > rect.width + 1 ? Math.floor(width) : 0;
    return side ? "side" : "sheet";
  }

  /** The box or the window changed size: the preview may need its own column, or lose it. The rows are drawn again only when the layout changed. */
  relayout(): void {
    if (!this.on) return;
    const before = this.layout;
    if (this.#layoutNow() !== before) {
      this.sheet = false;
      this.#host.redraw();
    } else this.apply(this.#host.rows().length > 0);
  }

  /** Show or hide the pane, and set the popup's attributes for the layout: a second column, a sheet, or neither. */
  apply(hasRows: boolean): void {
    const panel = this.#host.root.querySelector<HTMLElement>(".panel");
    if (!panel) return;
    const side = this.on && this.layout === "side";
    panel.toggleAttribute("data-pv", this.on);
    panel.setAttribute("data-layout", this.layout);
    panel.toggleAttribute("data-sheet", this.on && this.layout === "sheet" && this.sheet);
    // the popup is made wider than the box only to make room for the second column
    panel.style.width = side && this.#panelWidth > 0 ? `${this.#panelWidth}px` : "";
    panel.style.right = side && this.#panelWidth > 0 ? "auto" : "";
    this.pane.el.hidden = !(this.on && hasRows && (side || this.sheet));
    this.pane.sheet(this.layout === "sheet");
  }

  /** Back to the pane's hint, with nothing asked for and the sheet shut. What the loader has kept stays. */
  reset(): void {
    this.loader.cancel();
    this.pane.hint();
    this.sheet = false;
    this.#describe();
  }

  /** The page changed what it can show (its data, `loadPreview`): forget what was kept and ask for the highlighted row again. */
  clearAll(): void {
    this.loader.clear();
    this.pane.hint();
    this.follow();
  }

  /** The active row or column moved (or the rows were drawn again): ask for the highlighted row's preview, and say what the pane describes. `cell` is the grid cell the box names, or undefined for none. */
  marked(cell: HTMLElement | undefined): void {
    this.#cell = cell;
    this.follow();
    this.#describe();
  }

  /** The reader has highlighted a row: ask for its preview, once. In the sheet layout nothing is asked for until the sheet is open. */
  follow(): void {
    if (!this.on || this.pane.el.hidden) return;
    const entry = this.#host.rows()[this.#host.active()];
    if (!entry || entry.line.type !== "row") return;
    const { group, row } = entry.line;
    this.loader.highlight(`${this.#host.lang()}\u0000${group.id}\u0000${row.id}`, row, group.id);
  }

  /** What the loader has for the pane. The pane keeps what it shows until this is called with the next row's preview. */
  #show(target: PreviewTarget, preview: SearchPreview | undefined, failed: boolean): void {
    const host = this.#host;
    const actions = actionsOf(target.row, host.words().open);
    const label = host.groups().find((one) => one.id === target.group)?.label ?? "";
    this.pane.show({ group: target.group, id: target.row.id }, previewView(target.row, label, preview), actions, (id) => host.pressed(target.group, target.row.id, id) ?? actions.find((one) => one.id === id)?.pressed);
    if (failed) this.pane.fail();
    this.#describe();
  }

  /**
   * The pane is the description of the cell the box names (or of the box itself while the sheet is open), but only while it shows the active row's preview: while a request is out, or before the first answer, it still shows the previous
   * row, and a screen reader must not read that as the active row's.
   */
  #describe(): void {
    const host = this.#host;
    const entry = host.rows()[host.active()];
    const line = entry?.line;
    const shown = this.pane.shown;
    const match = this.on && !this.pane.el.hidden && !this.pane.busy && line?.type === "row" && shown !== undefined && shown.group === line.group.id && shown.id === line.row.id;
    const target = this.sheet ? (host.input() ?? undefined) : this.#cell;
    const before = this.#described;
    if (before !== undefined && before !== target) this.#set(before, false);
    if (target !== undefined) this.#set(target, match);
    this.#described = target;
  }

  /** Put the pane's id in an element's description, keeping the ids it had of its own (a disabled action's reason). */
  #set(el: HTMLElement, on: boolean): void {
    const ids = [el.dataset.why, on ? "pv" : undefined].filter((id): id is string => id !== undefined && id !== "").join(" ");
    if (ids === "") el.removeAttribute("aria-describedby");
    else el.setAttribute("aria-describedby", ids);
  }

  /** The Details action: on a narrow popup the sheet opens on the row; with the second column present (a finger on a wide popup) the row is highlighted, which shows its preview. */
  openDetails(entry: PreviewRow, col: number): void {
    const host = this.#host;
    const i = host.rows().indexOf(entry);
    if (i < 0) return;
    if (this.layout === "sheet") {
      host.setActive(i, col);
      this.sheet = true;
      this.apply(true);
      if (entry.line.type === "row") host.say(`${host.words().preview}${host.words().join}${entry.line.row.label}`);
    } else host.setActive(i, 0);
    host.mark(true);
  }

  closeSheet(): void {
    if (!this.sheet) return;
    this.sheet = false;
    this.loader.cancel();
    this.apply(this.#host.rows().length > 0);
    this.#host.measure();
    this.#host.mark(true);
  }

  /** A mouse over a row highlights it, so the pane follows the pointer. Only a real move counts: a list scrolled under a still pointer, or by the keyboard, does not; and only a change of row moves the highlight. */
  hover(event: PointerEvent): void {
    if (!this.on || this.layout === "sheet" || event.pointerType !== "mouse") return;
    const at = `${event.clientX},${event.clientY}`;
    if (at === this.#pointer) return;
    this.#pointer = at;
    const row = (event.target as Element | null)?.closest<HTMLElement>("[role=row][data-i]");
    const i = row ? Number(row.dataset.i) : -1;
    const entry = this.#host.rows()[i];
    if (!entry || entry.line.type !== "row" || i === this.#host.active()) return;
    this.#host.setActive(i, 0);
    this.#host.mark(false);
  }

  /** After a press in the pane (Back, an action) the focus goes back to the box, so the keyboard is not left on a button that is gone. */
  #refocus(): void {
    this.#host.focusInput();
  }
}

/**
 * Makes the preview feature for a box. The box calls this from `import("./preview-ui.ts")`, once.
 *
 * @example
 * const control = createPreviewControl(host);
 */
export function createPreviewControl(host: PreviewHost): PreviewControl {
  return new PreviewControl(host);
}
