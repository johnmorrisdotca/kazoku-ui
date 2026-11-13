// <kazoku-search-box>: one box that searches many kinds of thing at once. The page's `source` answers in groups; the box draws a few rows of each, a row of kind chips narrows to one,
// and each row can carry up to three actions. It holds no data and never fetches: it asks the source, drops any answer but the newest, and reports what the reader picks. A row may carry a small icon
// and a preview; the highlighted row's preview is drawn beside the list on a wide screen and in a sheet on a narrow one, asked for only when the row is highlighted.
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { actionsFit, actionsOf, announcement, chipsOf, isActionEnabled, planLines, PREVIEW_ACTION_ID, stepIndex, toggleAnnouncement, type PlanLine, type SearchAction, type SearchGroup, type SearchPickDetail, type SearchPreview, type SearchPreviewSource, type SearchSource } from "./model.ts";
import { drawPaths, drawRowIcon } from "./draw.ts";
import { iconPaths, rowIconSpec } from "./icons.ts";
import { createPreviewPane, type PreviewPane } from "./pane.ts";
import { createPreviewLoader, type PreviewLoader, type PreviewTarget } from "./preview.ts";
import { previewView } from "./preview-view.ts";
import { highlight } from "./rank.ts";
import { createSearchRunner, type SearchRunner } from "./runner.ts";
import { STYLES } from "./styles.ts";
import { countPhrase, languageOf, wordsFor, type SearchBoxWords } from "./words.ts";

export { EVENT, TAG };
export type { SearchPickDetail };

/** The rows the keyboard can stand on, in order. */
type NavLine = Exclude<PlanLine, { type: "header" }>;

interface NavEntry {
  line: NavLine;
  el: HTMLElement;
  actions: SearchAction[];
  buttons: HTMLButtonElement[];
  /** The row's own text cell, which stands for its first action, then one cell for each action (on a narrow screen the last is the Details action, which opens the preview). */
  main: HTMLElement;
  cells: HTMLElement[];
  /** The button that holds the actions that do not fit, and how many actions are drawn on the row's line (all of them unless the row is narrow). */
  more?: HTMLButtonElement;
  shown: number;
}

type Mode = "idle" | "busy" | "answer" | "failed";

const DEFAULT_DEBOUNCE = 120;
const DEFAULT_PER_GROUP = 3;
const DEFAULT_WINDOW = 20;
/** The least width a row keeps for its name before actions go behind "more". */
const MIN_NAME_WIDTH = 96;
/** The popup's width from which the preview sits beside the list, in px; under it, the preview opens as a sheet from a Details button. */
const SIDE_MIN = 540;
/** The width the popup grows to, when the page has room, to make a second column. */
const SIDE_WIDTH = 672;
const DEFAULT_PREVIEW_DELAY = 150;
type Layout = "side" | "sheet";

const whole = (value: string | null, fallback: number, min = 0): number => {
  const n = Number(value);
  return value !== null && value.trim() !== "" && Number.isInteger(n) && n >= min ? n : fallback;
};

const editable = (target: EventTarget | undefined): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || /^(textbox|combobox|searchbox)$/.test(target.getAttribute("role") ?? "");
};

interface Chord {
  key: string;
  ctrl: boolean;
  meta: boolean;
  mod: boolean;
  alt: boolean;
}

/** The chords a `shortcut` attribute names: `/`, `mod+k`, `ctrl+k`, `meta+k`, `alt+s`, several separated by spaces. `mod` is Control or Command. */
function chordsOf(text: string | null): Chord[] {
  return (text ?? "")
    .split(/\s+/)
    .filter((token) => token !== "")
    .map((token) => {
      const parts = token === "+" ? ["+"] : token.toLowerCase().split("+");
      const key = parts[parts.length - 1] ?? "";
      const mods = parts.slice(0, -1);
      return { key, ctrl: mods.includes("ctrl"), meta: mods.includes("meta"), mod: mods.includes("mod"), alt: mods.includes("alt") };
    })
    .filter((chord) => chord.key !== "");
}

function chordMatches(chord: Chord, event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== chord.key) return false;
  if (chord.mod) return (event.ctrlKey || event.metaKey) && !event.altKey;
  return event.ctrlKey === chord.ctrl && event.metaKey === chord.meta && event.altKey === chord.alt;
}

/**
 * A search box that answers in groups. The page sets `source` (an async function `(query, { signal, group }) => groups`), and hears `kazoku-search-pick` with `{ id, group, action }`.
 * `lang` picks the labels, `theme` is `light`, `dark` or left out, `debounce` is the quiet time in ms before the source is asked (120), `per-group` is how many rows each group shows (3),
 * `window` is how many rows a narrowed group draws at a time (20), and `shortcut` names keys that focus the box (`/`, `mod+k`; off when left out),
 * and `placeholder` replaces the box's hint (the word for Search when left out). An action with `disabled` (and a `title` saying why) does nothing when pressed. A toggle's change is spoken politely (`Favourite Mars, on`).
 * A row may carry an `icon` (drawn before its name) and a `preview`; `loadPreview` is the page's function for rows that carry none. When either is there the highlighted row's preview is drawn beside the list on a wide popup
 * (about 540 px and more, which the popup grows to when the page has room) and in a sheet on a narrow one, opened by a Details button. `preview="off"` turns it off. Nothing is asked for a row that is not highlighted.
 *
 * @example
 * import "@johnmorrisdotca/kazoku-ui/search-box/define";
 * const box = document.querySelector("kazoku-search-box");
 * box.source = async (query, { signal, group }) => (await fetch(`/search?q=${encodeURIComponent(query)}&group=${group}`, { signal })).json();
 * box.addEventListener("kazoku-search-pick", (event) => console.log(event.detail.id, event.detail.action));
 */
export class SearchBoxElement extends HTMLElement {
  static observedAttributes = ["lang", "theme", "shortcut", "debounce", "per-group", "window", "placeholder", "preview"];

  #root: ShadowRoot;
  #source: SearchSource | undefined;
  #runner: SearchRunner;
  #stop?: () => void;
  #groups: SearchGroup[] = [];
  #narrowed = "";
  #windowCount = DEFAULT_WINDOW;
  #mode: Mode = "idle";
  #closed = false;
  #nav: NavEntry[] = [];
  #active = -1;
  #col = 0;
  #draws = 0;
  #flips = new Map<string, boolean>();
  #chipKey = "";
  #lines: PlanLine[] = [];
  #ro?: ResizeObserver;
  /** The row (by its index) whose overflowed actions a press on "more" opened, or -1. */
  #moreOpen = -1;
  #listening = false;
  #uid = 0;
  /** True while the box gives its own focus back to itself, so the focus handler does not reopen a popup that was just closed. */
  #refocus = false;
  #loadPreview: SearchPreviewSource | undefined;
  #loader: PreviewLoader;
  #pane: PreviewPane | undefined;
  /** True while the preview is in use for the drawn answer: a row carries one, or the page set `loadPreview`, and the attribute `preview` is not `off`. */
  #pv = false;
  #layout: Layout = "side";
  /** The width the popup is given to make room for the second column, or 0 for the box's own width. */
  #panelWidth = 0;
  /** True while the sheet is open (narrow layout only). */
  #sheet = false;
  /** True when each row has the Details action: on a narrow layout, and for a finger. */
  #info = false;
  #hasIcons = false;
  #wasOpen = false;
  #described: HTMLElement | undefined;
  #pointer = "";

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    // read at each request, so the attribute can change after the box is made
    const debounce = (): number => whole(this.getAttribute("debounce"), DEFAULT_DEBOUNCE, 0);
    this.#runner = createSearchRunner({
      source: () => this.#source,
      get debounceMs() {
        return debounce();
      },
      onStart: () => this.#onStart(),
      onAnswer: (groups, _query, group) => this.#onAnswer(groups, group),
      onFail: () => this.#onFail(),
    });
    const delay = (): number => whole(this.getAttribute("preview-delay"), DEFAULT_PREVIEW_DELAY, 0);
    this.#loader = createPreviewLoader({
      fallback: () => this.#loadPreview,
      get debounceMs() {
        return delay();
      },
      staleMs: 300,
      cacheSize: 200,
      onShow: (target, preview, failed) => this.#showPreview(target, preview, failed),
      onWait: () => this.#pane?.wait(),
      onStale: () => this.#pane?.stale(),
    });
  }

  /** The page's search: `(query, { signal, group }) => groups`. The box calls it, and only it. */
  get source(): SearchSource | undefined {
    return this.#source;
  }

  set source(source: SearchSource | undefined) {
    this.#source = source;
  }

  /**
   * The page's function for a row's preview, used for the rows that carry no `preview` of their own: `(row, { signal, group }) => preview`. It is called when a row is highlighted, after a short quiet time (`preview-delay`, 150 ms),
   * only if that row is still the highlighted one; moving on aborts the call, an answer that comes late is dropped, and an answer is kept by row and language, so the same row again asks for nothing.
   */
  get loadPreview(): SearchPreviewSource | undefined {
    return this.#loadPreview;
  }

  set loadPreview(load: SearchPreviewSource | undefined) {
    this.#loadPreview = load;
    this.#loader.clear();
    if (this.#root.querySelector(".field")) this.#redrawKeeping();
  }

  /** Forget every preview kept, so the next highlight asks again (the page's data changed). */
  clearPreviews(): void {
    this.#loader.clear();
    this.#pane?.hint();
    this.#follow();
  }

  /** The hint shown in the empty box. Left out or empty, the word for Search in the box's language. Reads as the text shown; setting it writes the `placeholder` attribute. */
  get placeholder(): string {
    return this.getAttribute("placeholder") || this.#words().search;
  }

  set placeholder(text: string) {
    this.setAttribute("placeholder", text);
  }

  /** What is in the box. Setting it asks the source, like typing. */
  get value(): string {
    return this.#input()?.value ?? "";
  }

  set value(text: string) {
    const input = this.#input();
    if (!input) return;
    input.value = text;
    this.#closed = false;
    this.#changed();
  }

  /** How many times the box has drawn its results. A test aid: one answer is one draw, and moving the active row is none. */
  get drawCount(): number {
    return this.#draws;
  }

  connectedCallback(): void {
    adoptStyles(this.#root, STYLES, this.nonce);
    this.#stop = watchScheme(this);
    this.#mount();
    this.#paintWords();
    this.#listen();
    // the popup's width decides how many actions a row can show and whether the chips fade at an edge; both are read again when it changes, and when it is first shown
    if (typeof ResizeObserver !== "undefined") {
      this.#ro ??= new ResizeObserver(() => {
        this.#relayout();
        this.#measure();
      });
      this.#ro.observe(this.#el(".panel"));
      // the box's own width decides whether the preview has a column of its own
      this.#ro.observe(this);
    }
    this.ownerDocument.defaultView?.addEventListener("resize", this.#onResize);
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#ro?.disconnect();
    this.ownerDocument.defaultView?.removeEventListener("resize", this.#onResize);
    this.#loader.cancel();
    this.#runner.cancel();
    if (this.#mode === "busy") this.#mode = this.#nav.length > 0 ? "answer" : "idle";
    this.#root.querySelector("#grid")?.removeAttribute("aria-busy");
    this.#unlisten();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === "shortcut") {
      this.#unlisten();
      this.#listen();
      this.#paintShortcut();
    } else if (name === "lang") this.#paintWords();
    else if (name === "placeholder") this.#paintPlaceholder();
    else if (name === "per-group" || name === "window") this.#draw();
    else if (name === "preview") this.#redrawKeeping();
  }

  #onResize = (): void => this.#relayout();

  /** Focus the box. */
  override focus(options?: FocusOptions): void {
    this.#input()?.focus(options);
  }

  /** Close the popup and keep the text. */
  close(): void {
    this.#closed = true;
    this.#moreOpen = -1;
    this.#sync();
  }

  /** Empty the box, close the popup, and forget the narrowing. */
  clear(): void {
    const input = this.#input();
    if (input) input.value = "";
    this.#narrowed = "";
    this.#changed();
  }

  /** Set a toggle action's state in the drawn rows without asking the source again. */
  setPressed(group: string, id: string, action: string, pressed: boolean): void {
    this.#flips.set(`${group}\u0000${id}\u0000${action}`, pressed);
    for (const entry of this.#nav) {
      if (entry.line.type !== "row" || entry.line.group.id !== group || entry.line.row.id !== id) continue;
      entry.actions.forEach((one, i) => {
        if (one.id === action && one.pressed !== undefined) entry.buttons[i]?.setAttribute("aria-pressed", String(pressed));
      });
    }
    this.#pane?.setPressed({ group, id }, action, pressed);
  }

  #lang(): "en" | "ja" {
    return languageOf(this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #words(): SearchBoxWords {
    return wordsFor(this.#lang());
  }

  #input(): HTMLInputElement | null {
    return this.#root.querySelector("input");
  }

  #el<T extends HTMLElement>(selector: string): T {
    return this.#root.querySelector(selector) as T;
  }

  #mount(): void {
    // built once: a box moved to another place on the page keeps its field and its popup
    if (this.#root.querySelector(".field")) return;
    const doc = this.ownerDocument;
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] => {
      const el = doc.createElement(tag);
      if (className) el.className = className;
      return el;
    };
    const field = make("div", "field");
    const label = make("label", "vh");
    label.setAttribute("for", "q");
    const input = make("input");
    input.id = "q";
    input.type = "text";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "grid");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "grid");
    input.autocomplete = "off";
    input.setAttribute("autocapitalize", "off");
    input.spellcheck = false;
    const panel = make("div", "panel");
    panel.hidden = true;
    const chips = make("div", "chips");
    chips.setAttribute("role", "group");
    chips.hidden = true;
    const grid = make("div");
    grid.id = "grid";
    grid.setAttribute("role", "grid");
    grid.hidden = true;
    const note = make("p", "note");
    note.hidden = true;
    const list = make("div", "list");
    list.append(chips, grid, note);
    const pane = createPreviewPane(doc, {
      action: (row, actionId) => {
        const entry = this.#nav.find((one) => one.line.type === "row" && one.line.group.id === row.group && one.line.row.id === row.id);
        if (entry) this.#activate(entry, Math.max(0, entry.actions.findIndex((one) => one.id === actionId)));
      },
      back: () => this.#closeSheet(),
    });
    this.#pane = pane;
    panel.append(list, pane.el);
    const status = make("div", "vh");
    status.id = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    field.append(label, input, panel, status);
    this.#root.append(field);

    input.addEventListener("input", () => {
      this.#closed = false;
      this.#changed();
    });
    input.addEventListener("keydown", (event) => this.#onKey(event));
    field.addEventListener("keydown", (event) => {
      // Escape from a chip closes the popup and brings the reader back to the box
      if (event.key === "Escape" && event.target !== input) {
        event.preventDefault();
        this.close();
        this.#refocus = true;
        input.focus();
        this.#refocus = false;
      }
    });
    field.addEventListener("focusout", (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && this.#root.contains(next)) return;
      if (!this.#closed) this.close();
    });
    input.addEventListener("focus", () => {
      // coming back to a box that still has an answer shows it again
      if (!this.#refocus && this.#closed && this.#mode === "answer" && this.value.trim() !== "" && this.#nav.length > 0) {
        this.#closed = false;
        this.#sync();
      }
    });
    // a press on the popup must not take the focus from the box, or the keyboard would be left behind
    chips.addEventListener("scroll", () => this.#fades(), { passive: true });
    panel.addEventListener("mousedown", (event) => event.preventDefault());
    panel.addEventListener("click", (event) => this.#onClick(event));
    panel.addEventListener("pointermove", (event) => this.#onHover(event));
  }

  #paintWords(): void {
    const words = this.#words();
    const input = this.#input();
    if (!input) return;
    (this.#root.querySelector("label") as HTMLElement).textContent = words.search;
    input.setAttribute("aria-label", words.search);
    this.#paintPlaceholder();
    this.#el("[role=group]").setAttribute("aria-label", words.kinds);
    this.#el("#grid").setAttribute("aria-label", words.results);
    this.#pane?.words(words);
    this.#paintShortcut();
    this.#chipKey = "";
    this.#draw();
  }

  #paintPlaceholder(): void {
    const input = this.#input();
    if (input) input.placeholder = this.placeholder;
  }

  #paintShortcut(): void {
    const input = this.#input();
    if (!input) return;
    const chords = chordsOf(this.getAttribute("shortcut"));
    if (chords.length === 0) {
      input.removeAttribute("aria-keyshortcuts");
      return;
    }
    const name = (c: Chord): string => [c.mod ? "Control" : c.ctrl ? "Control" : "", c.meta ? "Meta" : "", c.alt ? "Alt" : "", c.key.length === 1 ? c.key.toUpperCase() : c.key].filter(Boolean).join("+");
    input.setAttribute("aria-keyshortcuts", chords.flatMap((c) => (c.mod ? [name({ ...c, mod: false, ctrl: true }), name({ ...c, mod: false, meta: true })] : [name(c)])).join(" "));
  }

  #listen(): void {
    if (this.#listening || chordsOf(this.getAttribute("shortcut")).length === 0) return;
    this.ownerDocument.addEventListener("keydown", this.#onShortcut);
    this.#listening = true;
  }

  #unlisten(): void {
    if (!this.#listening) return;
    this.ownerDocument.removeEventListener("keydown", this.#onShortcut);
    this.#listening = false;
  }

  #onShortcut = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || event.repeat) return;
    // never take a key from a field the reader is typing in, this one included
    if (editable(event.composedPath()[0])) return;
    if (!chordsOf(this.getAttribute("shortcut")).some((chord) => chordMatches(chord, event))) return;
    event.preventDefault();
    const input = this.#input();
    input?.focus();
    input?.select();
  };

  /** The text changed: ask the source, or close when it is empty. */
  #changed(): void {
    const query = this.value.trim();
    if (query === "") {
      this.#runner.cancel();
      this.#groups = [];
      this.#narrowed = "";
      this.#mode = "idle";
      this.#flips.clear();
      this.#active = -1;
      this.#draw();
      this.#el("#grid").removeAttribute("aria-busy");
      this.#el("#status").textContent = "";
      return;
    }
    this.#runner.cancel();
    this.#runner.request(query, this.#narrowed);
    // with no source yet there is nothing to wait for
    if (this.#source !== undefined && (this.#mode === "idle" || this.#mode === "failed")) this.#mode = "busy";
    this.#sync();
  }

  #asking(group: string, immediate: boolean): void {
    const query = this.value.trim();
    if (query === "") return;
    this.#runner.request(query, group, immediate);
  }

  #onStart(): void {
    this.#el("#grid").setAttribute("aria-busy", "true");
    if (this.#mode === "idle" || this.#nav.length === 0) this.#mode = "busy";
    this.#sync();
  }

  #onAnswer(groups: readonly SearchGroup[], group: string): void {
    this.#groups = [...groups];
    this.#flips.clear();
    this.#windowCount = whole(this.getAttribute("window"), DEFAULT_WINDOW, 1);
    this.#mode = "answer";
    // the rows are new, so the highlight is gone: the pane goes back to its hint and what it kept is let go
    this.#resetPreview();
    // an answer waits for a reader who has gone elsewhere, and leaves a popup the reader closed (Escape) closed until they type or press Down
    if (this.#root.activeElement === null) this.#closed = true;
    this.#active = -1;
    this.#col = 0;
    this.#el("#grid").removeAttribute("aria-busy");
    this.#draw();
    const words = this.#words();
    const found = group === "" ? undefined : this.#groups.find((one) => one.id === group);
    this.#el("#status").textContent = found ? `${found.label}${words.join}${countPhrase(words, Math.max(found.total, found.rows.length))}` : announcement(words, this.#groups);
  }

  #onFail(): void {
    this.#mode = "failed";
    this.#el("#grid").removeAttribute("aria-busy");
    this.#el("#status").textContent = this.#words().failed;
    this.#sync();
  }

  /** The plan, drawn. The only place the rows are rebuilt: once for each answer, never for a keystroke or a move of the active row. */
  #draw(): void {
    const doc = this.ownerDocument;
    const words = this.#words();
    const grid = this.#el<HTMLElement>("#grid");
    const query = this.value.trim();
    const perGroup = whole(this.getAttribute("per-group"), DEFAULT_PER_GROUP, 1);
    this.#lines = planLines(this.#groups, this.#narrowed, perGroup, whole(this.getAttribute("window"), DEFAULT_WINDOW, 1), this.#windowCount);
    this.#hasIcons = this.#lines.some((line) => line.type === "row" && rowIconSpec(line.row.icon) !== undefined);
    // the preview is in use when a drawn row carries one, or the page can make one; a narrow popup, or a finger, gets a Details action on each row
    this.#pv = this.getAttribute("preview") !== "off" && (this.#loadPreview !== undefined || this.#lines.some((line) => line.type === "row" && line.row.preview !== undefined));
    this.#layout = this.#pv ? this.#layoutNow() : "side";
    if (!this.#pv) this.#panelWidth = 0;
    this.#info = this.#pv && (this.#layout === "sheet" || doc.defaultView?.matchMedia?.("(pointer: coarse)").matches === true);
    this.#draws += 1;
    grid.replaceChildren();
    this.#nav = [];
    this.#moreOpen = -1;
    let section: HTMLElement | undefined;
    for (const line of this.#lines) {
      if (line.type === "header") {
        section = doc.createElement("div");
        section.setAttribute("role", "rowgroup");
        const head = doc.createElement("div");
        head.setAttribute("role", "row");
        head.className = "head";
        const cell = doc.createElement("div");
        cell.setAttribute("role", "rowheader");
        cell.className = "gh";
        const name = doc.createElement("span");
        name.textContent = line.group.label;
        const count = doc.createElement("span");
        count.className = "n";
        count.textContent = String(Math.max(line.group.total, line.group.rows.length));
        cell.append(name, count);
        head.append(cell);
        section.append(head);
        // one phrase ("Stars 5"), so a screen reader does not run the name and the count together
        section.setAttribute("aria-label", words.kindCount.replace("{label}", line.group.label).replace("{n}", String(Math.max(line.group.total, line.group.rows.length))));
        grid.append(section);
      } else if (section) {
        section.append(this.#drawLine(line, query, words));
      }
    }
    this.#paintChips();
    this.#sync();
    this.#measure();
  }

  #drawLine(line: NavLine, query: string, words: SearchBoxWords): HTMLElement {
    const doc = this.ownerDocument;
    const el = doc.createElement("div");
    el.setAttribute("role", "row");
    el.className = "row";
    el.id = `r${(this.#uid += 1)}`;
    el.dataset.i = String(this.#nav.length);
    el.setAttribute("aria-selected", "false");
    const main = doc.createElement("div");
    main.setAttribute("role", "gridcell");
    main.className = "main";
    const text = doc.createElement("span");
    text.className = "label";
    main.id = `m${(this.#uid += 1)}`;
    main.setAttribute("aria-selected", "false");
    const entry: NavEntry = { line, el, actions: [], buttons: [], main, cells: [], shown: 0 };
    if (line.type === "row") {
      for (const part of highlight(line.row.label, query)) {
        if (part.match) {
          const mark = doc.createElement("mark");
          mark.textContent = part.text;
          text.append(mark);
        } else text.append(doc.createTextNode(part.text));
      }
      main.append(text);
      if (line.row.detail) {
        const detail = doc.createElement("span");
        detail.className = "detail";
        detail.textContent = line.row.detail;
        main.append(detail);
      }
      if (this.#hasIcons) el.append(drawRowIcon(doc, rowIconSpec(line.row.icon)));
      el.append(main);
      entry.actions = actionsOf(line.row, words.open);
      const own = line.row.actions !== undefined && line.row.actions.length > 0;
      if (this.#info) entry.actions.push({ id: PREVIEW_ACTION_ID, label: words.details, icon: "info" });
      entry.shown = entry.actions.length;
      // a row with no actions of its own has the default one, which has no button (the row's text is it); a placeholder keeps the cells numbered like the actions
      if (!own && this.#info) {
        entry.cells.push(doc.createElement("div"));
        entry.buttons.push(doc.createElement("button"));
      }
      entry.actions.forEach((action, c) => {
        if (!own && c === 0) return;
        const cell = this.#drawAction(entry, line, action, c);
        el.append(cell);
      });
    } else {
      el.classList.add("extra");
      el.dataset.kind = line.type;
      text.textContent = line.type === "all" ? words.seeAll.replace("{n}", String(Math.max(line.group.total, line.group.rows.length))) : words.showMore;
      main.append(text);
      el.append(main);
    }
    this.#nav.push(entry);
    return el;
  }

  /** One action's cell and button, added to the row's entry. `c` is the action's number in the row, which is its column for the arrow keys. */
  #drawAction(entry: NavEntry, line: Extract<NavLine, { type: "row" }>, action: SearchAction, c: number): HTMLElement {
    const doc = this.ownerDocument;
    const cell = doc.createElement("div");
    cell.setAttribute("role", "gridcell");
    cell.className = "cell";
    cell.id = `c${(this.#uid += 1)}`;
    cell.setAttribute("aria-selected", "false");
    const button = doc.createElement("button");
    button.type = "button";
    button.tabIndex = -1;
    button.id = `a${(this.#uid += 1)}`;
    button.dataset.act = action.id;
    const paths = iconPaths(action.icon);
    if (paths) {
      // an icon button: the picture, with the word kept for a tooltip, the menu of a narrow row, and the accessible name below
      button.className = "ic";
      button.title = action.label;
      const lab = doc.createElement("span");
      lab.className = "lab";
      lab.textContent = action.label;
      button.append(drawPaths(doc, paths), lab);
    } else button.textContent = action.label;
    button.setAttribute("aria-label", `${action.label} ${line.row.label}`);
    const flipped = this.#flips.get(`${line.group.id}\u0000${line.row.id}\u0000${action.id}`);
    const pressed = flipped ?? action.pressed;
    if (pressed !== undefined) button.setAttribute("aria-pressed", String(pressed));
    if (!isActionEnabled(action)) {
      // aria-disabled, not `disabled`: the button keeps its tooltip, and the reader who arrows onto it hears why through the hidden description
      button.setAttribute("aria-disabled", "true");
      cell.setAttribute("aria-disabled", "true");
      if (action.title) {
        button.title = action.title;
        const why = doc.createElement("span");
        why.hidden = true;
        why.id = `d${(this.#uid += 1)}`;
        why.textContent = action.title;
        cell.append(why);
        button.setAttribute("aria-describedby", why.id);
        cell.setAttribute("aria-describedby", why.id);
        // the preview pane adds its own id to the description of the active cell; these are the ones it keeps
        cell.dataset.why = why.id;
        if (c === 0) {
          entry.main.setAttribute("aria-describedby", why.id);
          entry.main.dataset.why = why.id;
        }
      }
      if (c === 0) entry.main.setAttribute("aria-disabled", "true");
    }
    cell.append(button);
    entry.buttons.push(button);
    entry.cells.push(cell);
    return cell;
  }

  #paintChips(): void {
    const box = this.#el<HTMLElement>(".chips");
    const words = this.#words();
    // the chips follow the answer; while narrowed, an answer that holds one group keeps the chips the reader chose from
    const fresh = chipsOf(this.#groups);
    const chips = fresh.length > 1 || this.#narrowed === "" ? fresh : this.#chipsKept;
    if (fresh.length > 1) this.#chipsKept = fresh;
    const show = chips.length > 1 || (this.#narrowed !== "" && chips.length > 0);
    box.hidden = !show;
    const key = JSON.stringify(chips) + words.all;
    if (key !== this.#chipKey) {
      this.#chipKey = key;
      const doc = this.ownerDocument;
      // a chip that has the focus is drawn again with its replacement, so Tab and Enter on a chip do not drop the reader out of the box
      const focused = (this.#root.activeElement as HTMLElement | null)?.dataset?.chip;
      box.replaceChildren();
      const add = (id: string, label: string, total: number | null): void => {
        const button = doc.createElement("button");
        button.type = "button";
        button.dataset.chip = id;
        button.append(doc.createTextNode(label));
        if (total !== null) {
          const n = doc.createElement("span");
          n.className = "n";
          n.textContent = String(total);
          button.append(n);
        }
        box.append(button);
      };
      add("", words.all, null);
      for (const chip of chips) add(chip.id, chip.label, chip.total);
      if (focused !== undefined) (box.querySelector<HTMLButtonElement>(`button[data-chip="${CSS.escape(focused)}"]`) ?? box.querySelector<HTMLButtonElement>("button"))?.focus();
    }
    for (const button of box.querySelectorAll("button")) button.setAttribute("aria-pressed", String((button.dataset.chip ?? "") === this.#narrowed));
    this.#fades();
  }

  /** Where the preview goes: beside the list when the popup is, or can be made, wide enough; otherwise in a sheet. Also works out the width the popup is to grow to. */
  #layoutNow(): Layout {
    const view = this.ownerDocument.defaultView;
    const rect = this.getBoundingClientRect();
    const viewport = this.ownerDocument.documentElement.clientWidth || view?.innerWidth || 0;
    const room = viewport - rect.left - 8;
    const width = Math.max(rect.width, Math.min(SIDE_WIDTH, room));
    const side = rect.width > 0 && width >= SIDE_MIN;
    this.#panelWidth = side && width > rect.width + 1 ? Math.floor(width) : 0;
    return side ? "side" : "sheet";
  }

  /** The box or the window changed size: the preview may need its own column, or lose it. The rows are drawn again only when the layout changed. */
  #relayout(): void {
    if (!this.#pv) return;
    const before = this.#layout;
    const next = this.#layoutNow();
    if (next !== before) {
      this.#sheet = false;
      this.#redrawKeeping();
    } else this.#applyPreview(this.#nav.length > 0);
  }

  /** Draw the rows again (a layout or an option changed) and put the highlight back on the same row and column. */
  #redrawKeeping(): void {
    if (!this.#root.querySelector(".field")) return;
    const at = this.#nav[this.#active];
    const keep = at?.line.type === "row" ? { group: at.line.group.id, id: at.line.row.id, col: this.#col } : undefined;
    this.#draw();
    if (keep === undefined) return;
    const i = this.#nav.findIndex((one) => one.line.type === "row" && one.line.group.id === keep.group && one.line.row.id === keep.id);
    if (i < 0) return;
    this.#active = i;
    this.#col = Math.min(keep.col, (this.#nav[i]?.actions.length ?? 1) - 1);
    this.#mark(false);
  }

  /** Show or hide the pane, and set the popup's attributes for the layout: a second column, a sheet, or neither. */
  #applyPreview(hasRows: boolean): void {
    const panel = this.#root.querySelector<HTMLElement>(".panel");
    const pane = this.#pane;
    if (!panel || !pane) return;
    const side = this.#pv && this.#layout === "side";
    panel.toggleAttribute("data-pv", this.#pv);
    panel.setAttribute("data-layout", this.#layout);
    panel.toggleAttribute("data-sheet", this.#pv && this.#layout === "sheet" && this.#sheet);
    // the popup is made wider than the box only to make room for the second column
    panel.style.width = side && this.#panelWidth > 0 ? `${this.#panelWidth}px` : "";
    panel.style.right = side && this.#panelWidth > 0 ? "auto" : "";
    pane.el.hidden = !(this.#pv && hasRows && (side || this.#sheet));
    pane.sheet(this.#layout === "sheet");
  }

  /** The reader has highlighted a row: ask for its preview, once. In the sheet layout nothing is asked for until the sheet is open. */
  #follow(): void {
    const pane = this.#pane;
    if (!this.#pv || !pane || pane.el.hidden) return;
    const entry = this.#nav[this.#active];
    if (!entry || entry.line.type !== "row") return;
    const { group, row } = entry.line;
    this.#loader.highlight(`${this.#lang()}\u0000${group.id}\u0000${row.id}`, row, group.id);
  }

  /** Back to the pane's hint, with nothing asked for and the sheet shut. What the loader has kept stays. */
  #resetPreview(): void {
    this.#loader.cancel();
    this.#pane?.hint();
    this.#sheet = false;
  }

  /** What the loader has for the pane. The pane keeps what it shows until this is called with the next row's preview. */
  #showPreview(target: PreviewTarget, preview: SearchPreview | undefined, failed: boolean): void {
    const pane = this.#pane;
    if (!pane) return;
    const words = this.#words();
    const group = this.#groups.find((one) => one.id === target.group);
    const actions = actionsOf(target.row, words.open);
    const flipped = (id: string): boolean | undefined => this.#flips.get(`${target.group}\u0000${target.row.id}\u0000${id}`) ?? actions.find((one) => one.id === id)?.pressed;
    pane.show({ group: target.group, id: target.row.id }, previewView(target.row, group?.label ?? "", preview), actions, flipped);
    if (failed) pane.fail();
  }

  /** The Details action: on a narrow popup the sheet opens on the row; with the second column present (a finger on a wide popup) the row is highlighted, which shows its preview. */
  #openDetails(entry: NavEntry, col: number): void {
    const i = this.#nav.indexOf(entry);
    if (i < 0) return;
    this.#active = i;
    this.#moreOpen = -1;
    if (this.#layout === "sheet") {
      this.#col = col;
      this.#sheet = true;
      this.#applyPreview(true);
      if (entry.line.type === "row") this.#el("#status").textContent = `${this.#words().preview}${this.#words().join}${entry.line.row.label}`;
    } else this.#col = 0;
    this.#mark();
  }

  #closeSheet(): void {
    if (!this.#sheet) return;
    this.#sheet = false;
    this.#loader.cancel();
    this.#applyPreview(this.#nav.length > 0);
    this.#measure();
    this.#mark();
  }

  /** A mouse over a row highlights it, so the pane follows the pointer. Only a real move counts: a list scrolled under a still pointer, or by the keyboard, does not. */
  #onHover(event: PointerEvent): void {
    if (!this.#pv || this.#layout === "sheet" || event.pointerType !== "mouse") return;
    const at = `${event.clientX},${event.clientY}`;
    if (at === this.#pointer) return;
    this.#pointer = at;
    const row = (event.target as Element | null)?.closest<HTMLElement>("[role=row][data-i]");
    const i = row ? Number(row.dataset.i) : -1;
    const entry = this.#nav[i];
    if (!entry || entry.line.type !== "row" || i === this.#active) return;
    this.#active = i;
    this.#col = 0;
    this.#moreOpen = -1;
    this.#mark(false);
  }

  /** Read the popup's width: which actions each row can show, and whether the chips run past an edge. Nothing is read while the popup is hidden; its first showing is a change of size, which calls this again. */
  #measure(): void {
    this.#fit();
    this.#fades();
  }

  /** The chips scroll sideways rather than wrap; an edge with more beyond it fades. */
  #fades(): void {
    const box = this.#root.querySelector<HTMLElement>(".chips");
    if (!box) return;
    const room = box.scrollWidth - box.clientWidth;
    const start = room > 1 && box.scrollLeft > 1;
    const end = room > 1 && box.scrollLeft < room - 1;
    const fade = [start ? "start" : "", end ? "end" : ""].filter(Boolean).join(" ");
    if (fade === "") box.removeAttribute("data-fade");
    else box.setAttribute("data-fade", fade);
  }

  /** On a row too narrow for its actions, the last ones go behind the "more" button. Every action stays in the grid, so the arrows still reach them; only their place on the row changes. */
  #fit(): void {
    const panel = this.#root.querySelector<HTMLElement>(".panel");
    // with the sheet open the rows are out of the page and have no width to measure; they are measured again when the list comes back
    if (!panel || panel.hidden || panel.clientWidth === 0 || panel.hasAttribute("data-sheet")) return;
    const view = this.ownerDocument.defaultView;
    for (const entry of this.#nav) {
      if (entry.actions.length < 2) continue;
      // measure with every action on the line
      entry.el.removeAttribute("data-more");
      for (const cell of entry.cells) cell.removeAttribute("data-ovf");
      if (entry.more) entry.more.hidden = true;
      const style = view?.getComputedStyle(entry.el);
      const pad = (parseFloat(style?.paddingLeft ?? "0") || 0) + (parseFloat(style?.paddingRight ?? "0") || 0);
      const gap = parseFloat(style?.columnGap ?? "0") || 0;
      const room = entry.el.clientWidth - pad - MIN_NAME_WIDTH - gap;
      const widths = entry.buttons.map((button) => button.getBoundingClientRect().width);
      let shown = actionsFit(room, widths, 0, gap);
      if (shown < widths.length) {
        // the button is made only for a row that needs it
        const more = entry.more ?? this.#makeMore(entry);
        more.hidden = false;
        shown = actionsFit(room, widths, more.getBoundingClientRect().width, gap);
      }
      entry.shown = shown;
      entry.cells.forEach((cell, c) => cell.toggleAttribute("data-ovf", c >= shown));
    }
    this.#mark();
  }

  /** The one button for the actions that do not fit: a pointer's way to them, since the keyboard reaches every action with the arrows. Hidden from a screen reader, which has them in the grid. */
  #makeMore(entry: NavEntry): HTMLButtonElement {
    const doc = this.ownerDocument;
    const more = doc.createElement("button");
    more.type = "button";
    more.tabIndex = -1;
    more.className = "ic more";
    more.setAttribute("aria-hidden", "true");
    more.setAttribute("aria-expanded", "false");
    more.title = this.#words().more;
    more.append(drawPaths(doc, ["M5.5 12h.01", "M12 12h.01", "M18.5 12h.01"]));
    const brk = doc.createElement("div");
    brk.className = "brk";
    brk.setAttribute("aria-hidden", "true");
    entry.el.append(more, brk);
    entry.more = more;
    return more;
  }

  #chipsKept: Array<{ id: string; label: string; total: number }> = [];

  /** Show or hide the popup, the note and the combobox's state to match. */
  #sync(): void {
    const words = this.#words();
    const input = this.#input();
    if (!input) return;
    const query = this.value.trim();
    const grid = this.#el<HTMLElement>("#grid");
    const note = this.#el<HTMLElement>(".note");
    const panel = this.#el<HTMLElement>(".panel");
    const hasRows = this.#nav.length > 0;
    let text = "";
    if (this.#mode === "busy" && !hasRows) text = words.searching;
    else if (this.#mode === "failed") text = words.failed;
    else if (this.#mode === "answer" && !hasRows) text = words.empty;
    grid.hidden = !hasRows;
    note.hidden = text === "";
    note.textContent = text;
    const open = query !== "" && !this.#closed && this.#mode !== "idle" && (hasRows || text !== "");
    panel.hidden = !open;
    // a popup that closes lets go of the preview: the next time it opens the pane starts from its hint
    if (!open && this.#wasOpen) this.#resetPreview();
    this.#wasOpen = open;
    const expanded = open && hasRows;
    this.#applyPreview(hasRows);
    input.setAttribute("aria-expanded", String(expanded));
    if (!expanded) {
      this.#active = -1;
      input.removeAttribute("aria-activedescendant");
    } else this.#mark();
  }

  #onKey(event: KeyboardEvent): void {
    // a reader choosing a conversion (Japanese, Chinese, Korean) uses these keys for the input method, not for the list
    if (event.isComposing || event.keyCode === 229) return;
    const input = event.currentTarget as HTMLInputElement;
    const expanded = input.getAttribute("aria-expanded") === "true";
    const key = event.key;
    if (this.#sheet) {
      // the sheet is the first thing Escape closes, and a move to another row goes back to the list
      if (key === "Escape") {
        event.preventDefault();
        this.#closeSheet();
        return;
      }
      if (key === "ArrowDown" || key === "ArrowUp") this.#closeSheet();
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      if (event.altKey && key === "ArrowDown") {
        if (this.#nav.length > 0 && this.value.trim() !== "") {
          event.preventDefault();
          this.#closed = false;
          this.#sync();
        }
        return;
      }
      if (this.#nav.length === 0) return;
      event.preventDefault();
      if (!expanded) {
        this.#closed = false;
        this.#sync();
      }
      this.#active = stepIndex(this.#active, this.#nav.length, key === "ArrowDown" ? 1 : -1);
      this.#col = 0;
      this.#moreOpen = -1;
      this.#mark();
    } else if (key === "ArrowRight" || key === "ArrowLeft") {
      // across the active row's actions; with no row active, or at the end of its actions, the arrows move the caret as they do in any field
      const entry = this.#nav[this.#active];
      if (!expanded || !entry) return;
      const next = this.#col + (key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= entry.actions.length) return;
      event.preventDefault();
      this.#col = next;
      this.#mark();
    } else if (key === "Enter") {
      const entry = this.#nav[this.#active];
      if (!expanded || !entry) return;
      event.preventDefault();
      this.#activate(entry, this.#col);
    } else if (key === "Escape") {
      if (expanded || !this.#el<HTMLElement>(".panel").hidden) {
        event.preventDefault();
        this.close();
      } else if (input.value !== "") {
        event.preventDefault();
        this.clear();
      }
    }
    // Home and End are left to the box: they move the caret, never the list
  }

  /** Move the marks. Nothing is rebuilt: the box's `aria-activedescendant` names the row (or the action) and the rows' own attributes show it. */
  #mark(scroll = true): void {
    const input = this.#input();
    if (!input) return;
    // the box's `aria-activedescendant` always names a gridcell: the row's text cell for its first action, or the cell of the action the arrows reached
    this.#nav.forEach((entry, i) => {
      const on = i === this.#active;
      // the actions behind "more" are shown under the row while the arrows stand on one of them, or after a press on the button
      const open = entry.shown < entry.actions.length && ((on && this.#col >= entry.shown) || this.#moreOpen === i);
      entry.el.toggleAttribute("data-more", open);
      entry.more?.setAttribute("aria-expanded", String(open));
      entry.el.setAttribute("aria-selected", String(on));
      entry.main.setAttribute("aria-selected", String(on && this.#col === 0));
      entry.buttons.forEach((button, c) => {
        const here = on && c === this.#col && c > 0;
        if (here) button.setAttribute("data-active", "");
        else button.removeAttribute("data-active");
        entry.cells[c]?.setAttribute("aria-selected", String(here));
      });
    });
    this.#follow();
    const entry = this.#nav[this.#active];
    // with the sheet open the list is out of the page, so the box names nothing in it
    if (!entry || this.#sheet) {
      input.removeAttribute("aria-activedescendant");
      this.#describe(undefined, false);
      return;
    }
    const target = this.#col > 0 ? (entry.cells[this.#col] ?? entry.main) : entry.main;
    input.setAttribute("aria-activedescendant", target.id);
    // the pane is the description of the cell the box names, so a screen reader hears the preview after the row
    this.#describe(target, this.#pane !== undefined && !this.#pane.el.hidden);
    if (scroll) target.scrollIntoView?.({ block: "nearest" });
  }

  /** Put the pane's id in the description of `target` (and take it off the cell that had it), keeping the ids the cell had of its own. */
  #describe(target: HTMLElement | undefined, on: boolean): void {
    const set = (el: HTMLElement, withPane: boolean): void => {
      const ids = [el.dataset.why, withPane ? "pv" : undefined].filter((id): id is string => id !== undefined && id !== "").join(" ");
      if (ids === "") el.removeAttribute("aria-describedby");
      else el.setAttribute("aria-describedby", ids);
    };
    const before = this.#described;
    if (before !== undefined && (before !== target || !on)) set(before, false);
    if (target !== undefined && on) {
      set(target, true);
      this.#described = target;
    } else this.#described = undefined;
  }

  #onClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const chip = target?.closest<HTMLElement>("button[data-chip]");
    if (chip) {
      const id = chip.dataset.chip ?? "";
      this.#narrow(id === this.#narrowed ? "" : id);
      return;
    }
    const row = target?.closest<HTMLElement>("[role=row][data-i]");
    const entry = row ? this.#nav[Number(row.dataset.i)] : undefined;
    if (!row || !entry) return;
    if (target?.closest("button.more")) {
      const i = Number(row.dataset.i);
      this.#moreOpen = this.#moreOpen === i ? -1 : i;
      this.#mark();
      return;
    }
    const button = target?.closest<HTMLButtonElement>("button[data-act]");
    this.#activate(entry, button ? Math.max(0, entry.buttons.indexOf(button)) : 0);
  }

  #narrow(group: string): void {
    if (group === this.#narrowed && this.#mode !== "failed") return;
    this.#narrowed = group;
    this.#windowCount = whole(this.getAttribute("window"), DEFAULT_WINDOW, 1);
    this.#paintChips();
    this.#asking(group, true);
  }

  #activate(entry: NavEntry, col: number): void {
    const line = entry.line;
    if (line.type === "all") {
      this.#narrow(line.group.id);
      this.#input()?.focus();
      return;
    }
    if (line.type === "more") {
      const first = this.#nav.length - 1;
      this.#windowCount += whole(this.getAttribute("window"), DEFAULT_WINDOW, 1);
      this.#draw();
      this.#active = Math.min(first, this.#nav.length - 1);
      this.#col = 0;
      this.#mark();
      return;
    }
    const action = entry.actions[col] ?? entry.actions[0];
    if (!action || !isActionEnabled(action)) return;
    if (action.id === PREVIEW_ACTION_ID) {
      this.#openDetails(entry, col);
      return;
    }
    const detail: SearchPickDetail = { id: line.row.id, group: line.group.id, action: action.id };
    if (action.pressed !== undefined) {
      const button = entry.buttons[entry.actions.indexOf(action)];
      const now = !(button?.getAttribute("aria-pressed") === "true");
      this.setPressed(line.group.id, line.row.id, action.id, now);
      detail.pressed = now;
      // focus stays in the box and screen readers rarely say aria-pressed on an active descendant, so the change is spoken through the box's own live region
      this.#el("#status").textContent = toggleAnnouncement(this.#words(), action.label, line.row.label, now);
    }
    this.dispatchEvent(new CustomEvent<SearchPickDetail>(EVENT, { bubbles: true, composed: true, detail }));
    // a plain action is the end of the search; a toggle keeps the list for the next one
    if (action.pressed === undefined) this.close();
  }
}
