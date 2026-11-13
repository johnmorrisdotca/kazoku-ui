// <kazoku-search-box>: one box that searches many kinds of thing at once. The page's `source` answers in groups; the box draws a few rows of each, a row of kind chips narrows to one,
// and each row can carry up to three actions. It holds no data and never fetches: it asks the source, drops any answer but the newest, and reports what the reader picks.
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { actionsOf, announcement, chipsOf, planLines, stepIndex, type PlanLine, type SearchAction, type SearchGroup, type SearchPickDetail, type SearchSource } from "./model.ts";
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
}

type Mode = "idle" | "busy" | "answer" | "failed";

const DEFAULT_DEBOUNCE = 120;
const DEFAULT_PER_GROUP = 3;
const DEFAULT_WINDOW = 20;

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
 * `window` is how many rows a narrowed group draws at a time (20), and `shortcut` names keys that focus the box (`/`, `mod+k`; off when left out).
 *
 * @example
 * import "@johnmorrisdotca/kazoku-ui/search-box/define";
 * const box = document.querySelector("kazoku-search-box");
 * box.source = async (query, { signal, group }) => (await fetch(`/search?q=${encodeURIComponent(query)}&group=${group}`, { signal })).json();
 * box.addEventListener("kazoku-search-pick", (event) => console.log(event.detail.id, event.detail.action));
 */
export class SearchBoxElement extends HTMLElement {
  static observedAttributes = ["lang", "theme", "shortcut", "debounce", "per-group", "window"];

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
  #listening = false;
  #uid = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#runner = createSearchRunner({
      source: () => this.#source,
      debounceMs: DEFAULT_DEBOUNCE,
      onStart: () => this.#onStart(),
      onAnswer: (groups, _query, group) => this.#onAnswer(groups, group),
      onFail: () => this.#onFail(),
    });
  }

  /** The page's search: `(query, { signal, group }) => groups`. The box calls it, and only it. */
  get source(): SearchSource | undefined {
    return this.#source;
  }

  set source(source: SearchSource | undefined) {
    this.#source = source;
  }

  /** What is in the box. Setting it asks the source, like typing. */
  get value(): string {
    return this.#input()?.value ?? "";
  }

  set value(text: string) {
    const input = this.#input();
    if (!input) return;
    input.value = text;
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
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#runner.cancel();
    this.#unlisten();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return;
    if (name === "shortcut") {
      this.#unlisten();
      this.#listen();
      this.#paintShortcut();
    } else if (name === "lang") this.#paintWords();
    else if (name === "per-group" || name === "window") this.#draw();
  }

  /** Focus the box. */
  override focus(options?: FocusOptions): void {
    this.#input()?.focus(options);
  }

  /** Close the popup and keep the text. */
  close(): void {
    this.#closed = true;
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
  }

  #words(): SearchBoxWords {
    return wordsFor(languageOf(this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang));
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
    panel.append(chips, grid, note);
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
        input.focus();
      }
    });
    field.addEventListener("focusout", (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && this.#root.contains(next)) return;
      if (!this.#closed) this.close();
    });
    input.addEventListener("focus", () => {
      // coming back to a box that still has an answer shows it again
      if (this.#closed && this.#mode === "answer" && this.value.trim() !== "" && this.#nav.length > 0) {
        this.#closed = false;
        this.#sync();
      }
    });
    // a press on the popup must not take the focus from the box, or the keyboard would be left behind
    panel.addEventListener("mousedown", (event) => event.preventDefault());
    panel.addEventListener("click", (event) => this.#onClick(event));
  }

  #paintWords(): void {
    const words = this.#words();
    const input = this.#input();
    if (!input) return;
    (this.#root.querySelector("label") as HTMLElement).textContent = words.search;
    input.setAttribute("aria-label", words.search);
    input.placeholder = words.search;
    this.#el("[role=group]").setAttribute("aria-label", words.kinds);
    this.#el("#grid").setAttribute("aria-label", words.results);
    this.#paintShortcut();
    this.#chipKey = "";
    this.#draw();
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
      this.#el("#status").textContent = "";
      return;
    }
    this.#runner.cancel();
    this.#runner.request(query, this.#narrowed);
    this.#mode = this.#mode === "idle" ? "busy" : this.#mode;
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
    // an answer opens the popup for a reader who is in the box, and waits for one who has gone elsewhere
    this.#closed = this.#root.activeElement === null;
    this.#active = -1;
    this.#col = 0;
    this.#el("#grid").removeAttribute("aria-busy");
    this.#draw();
    const words = this.#words();
    const found = group === "" ? undefined : this.#groups.find((one) => one.id === group);
    this.#el("#status").textContent = found ? `${found.label}, ${countPhrase(words, Math.max(found.total, found.rows.length))}` : announcement(words, this.#groups);
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
    this.#draws += 1;
    grid.replaceChildren();
    this.#nav = [];
    let section: HTMLElement | undefined;
    for (const line of this.#lines) {
      if (line.type === "header") {
        section = doc.createElement("div");
        section.setAttribute("role", "rowgroup");
        const head = doc.createElement("div");
        head.setAttribute("role", "row");
        const cell = doc.createElement("div");
        cell.setAttribute("role", "rowheader");
        cell.className = "gh";
        cell.id = `h${(this.#uid += 1)}`;
        const name = doc.createElement("span");
        name.textContent = line.group.label;
        const count = doc.createElement("span");
        count.className = "n";
        count.textContent = String(Math.max(line.group.total, line.group.rows.length));
        cell.append(name, count);
        head.append(cell);
        section.append(head);
        section.setAttribute("aria-labelledby", cell.id);
        grid.append(section);
      } else if (section) {
        section.append(this.#drawLine(line, query, words));
      }
    }
    this.#paintChips();
    this.#sync();
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
    const entry: NavEntry = { line, el, actions: [], buttons: [] };
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
      el.append(main);
      entry.actions = actionsOf(line.row, words.open);
      if (line.row.actions && line.row.actions.length > 0) {
        for (const action of entry.actions) {
          const cell = doc.createElement("div");
          cell.setAttribute("role", "gridcell");
          cell.className = "cell";
          const button = doc.createElement("button");
          button.type = "button";
          button.tabIndex = -1;
          button.id = `a${(this.#uid += 1)}`;
          button.dataset.act = action.id;
          button.textContent = action.label;
          button.setAttribute("aria-label", `${action.label} ${line.row.label}`);
          const flipped = this.#flips.get(`${line.group.id}\u0000${line.row.id}\u0000${action.id}`);
          const pressed = flipped ?? action.pressed;
          if (pressed !== undefined) button.setAttribute("aria-pressed", String(pressed));
          cell.append(button);
          el.append(cell);
          entry.buttons.push(button);
        }
      }
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
    }
    for (const button of box.querySelectorAll("button")) button.setAttribute("aria-pressed", String((button.dataset.chip ?? "") === this.#narrowed));
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
    const expanded = open && hasRows;
    input.setAttribute("aria-expanded", String(expanded));
    if (!expanded) {
      this.#active = -1;
      input.removeAttribute("aria-activedescendant");
    } else this.#mark();
  }

  #onKey(event: KeyboardEvent): void {
    const input = event.currentTarget as HTMLInputElement;
    const expanded = input.getAttribute("aria-expanded") === "true";
    const key = event.key;
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
  #mark(): void {
    const input = this.#input();
    if (!input) return;
    this.#nav.forEach((entry, i) => {
      const on = i === this.#active;
      entry.el.setAttribute("aria-selected", String(on));
      entry.buttons.forEach((button, c) => {
        if (on && c === this.#col && c > 0) button.setAttribute("data-active", "");
        else button.removeAttribute("data-active");
      });
    });
    const entry = this.#nav[this.#active];
    if (!entry) {
      input.removeAttribute("aria-activedescendant");
      return;
    }
    const target = this.#col > 0 ? (entry.buttons[this.#col] ?? entry.el) : entry.el;
    input.setAttribute("aria-activedescendant", target.id);
    target.scrollIntoView?.({ block: "nearest" });
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
    if (!action) return;
    const detail: SearchPickDetail = { id: line.row.id, group: line.group.id, action: action.id };
    if (action.pressed !== undefined) {
      const button = entry.buttons[entry.actions.indexOf(action)];
      const now = !(button?.getAttribute("aria-pressed") === "true");
      this.setPressed(line.group.id, line.row.id, action.id, now);
      detail.pressed = now;
    }
    this.dispatchEvent(new CustomEvent<SearchPickDetail>(EVENT, { bubbles: true, composed: true, detail }));
    // a plain action is the end of the search; a toggle keeps the list for the next one
    if (action.pressed === undefined) this.close();
  }
}
