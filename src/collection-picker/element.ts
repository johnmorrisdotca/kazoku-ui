// <kazoku-collection-picker>: search a list the page passes in, and keep a chosen list the reader can add to, remove from and reorder.
// The page hears `kazoku-collectionchange`. The element does not know what the items are.
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { addId, indexItems, moveId, removeId, searchItems, SUGGEST_LIMIT, type CollectionItem, type IndexedItem } from "./items.ts";
import { STYLES } from "./styles.ts";
import { languageOf, wordsFor, type CollectionWords } from "./words.ts";

export { EVENT, TAG };

/** What `kazoku-collectionchange` carries in `detail`. */
export interface CollectionDetail {
  /** The chosen ids, in the reader's order. */
  ids: string[];
  /** `user` is a press or a key. `set` is the `value` property. */
  reason: "user" | "set";
}

/**
 * No attributes decide the items: a page sets `items` and reads `value` (the chosen ids, in order).
 * `lang` picks the labels. `theme` is `light`, `dark` or left out.
 * `limit` is how many suggestions to show (8 when left out).
 */
export class CollectionPickerElement extends HTMLElement {
  static observedAttributes = ["lang", "theme", "limit"];

  #root: ShadowRoot;
  #items: CollectionItem[] = [];
  #index: IndexedItem[] = [];
  #byId = new Map<string, CollectionItem>();
  #ids: string[] = [];
  #active = -1;
  #stop?: () => void;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  get items(): readonly CollectionItem[] {
    return this.#items;
  }

  set items(items: readonly CollectionItem[]) {
    this.#items = [...items];
    this.#index = indexItems(this.#items);
    this.#byId = new Map(this.#items.map((item) => [item.id, item]));
    this.#paintSuggestions();
    this.#paintChosen();
  }

  /** The chosen ids, in order. Setting it reports `reason: "set"`. */
  get value(): string[] {
    return [...this.#ids];
  }

  set value(ids: readonly string[]) {
    this.#ids = [...ids];
    this.#paintChosen();
    this.#emit("set");
  }

  connectedCallback(): void {
    adoptStyles(this.#root, STYLES, this.nonce);
    this.#stop = watchScheme(this);
    this.#mount();
    this.#paint();
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#paint();
  }

  #words(): CollectionWords {
    return wordsFor(languageOf(this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang));
  }

  #limit(): number {
    const n = Number(this.getAttribute("limit"));
    return Number.isInteger(n) && n > 0 ? n : SUGGEST_LIMIT;
  }

  #mount(): void {
    // built once: a picker moved to another place on the page keeps its field and its list, not a second copy of them
    if (this.#root.querySelector(".field")) return;
    const doc = this.ownerDocument;
    const field = doc.createElement("div");
    field.className = "field";
    const label = doc.createElement("label");
    label.className = "vh";
    label.setAttribute("for", "q");
    const input = doc.createElement("input");
    input.id = "q";
    input.type = "text";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "suggestions");
    input.autocomplete = "off";
    const list = doc.createElement("ul");
    list.id = "suggestions";
    list.className = "list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    field.append(label, input, list);
    const chosen = doc.createElement("div");
    chosen.className = "chosen";
    chosen.append(doc.createElement("p"), doc.createElement("ul"));
    this.#root.append(field, chosen);
    input.addEventListener("input", () => {
      this.#active = -1;
      this.#paintSuggestions();
    });
    input.addEventListener("keydown", (event) => this.#onKey(event));
    list.addEventListener("click", (event) => {
      const id = (event.target as Element | null)?.closest?.("button")?.getAttribute("data-id");
      if (id) this.#add(id);
    });
    chosen.addEventListener("click", (event) => {
      const button = (event.target as Element | null)?.closest?.("button");
      const id = button?.getAttribute("data-id");
      const act = button?.getAttribute("data-act");
      if (!id || !act) return;
      const at = this.#ids.indexOf(id);
      if (act === "remove") this.#change(removeId(this.#ids, id));
      else if (act === "up") this.#change(moveId(this.#ids, id, -1));
      else if (act === "down") this.#change(moveId(this.#ids, id, 1));
      this.#refocus(act, id, at);
    });
  }

  #onKey(event: KeyboardEvent): void {
    const buttons = [...this.#root.querySelectorAll("#suggestions button")];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (buttons.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      this.#active = (this.#active + step + buttons.length) % buttons.length;
      this.#mark(buttons);
    } else if (event.key === "Enter") {
      const id = buttons[this.#active]?.getAttribute("data-id") ?? buttons[0]?.getAttribute("data-id");
      if (!id) return;
      event.preventDefault();
      this.#add(id);
    } else if (event.key === "Escape") {
      const input = this.#root.querySelector("input") as HTMLInputElement;
      input.value = "";
      this.#active = -1;
      this.#paintSuggestions();
    }
  }

  /** The rows were drawn again: keep a keyboard where it was. A moved item keeps its button (or the other way, at an end); a removed one gives way to the row now in its place, or the field. */
  #refocus(act: string, id: string, at: number): void {
    const row = (one: string, which: string): HTMLButtonElement | null => this.#root.querySelector<HTMLButtonElement>(`.rows button[data-id="${CSS.escape(one)}"][data-act="${which}"]`);
    let next: HTMLButtonElement | null = null;
    if (act === "remove") {
      const there = this.#ids[Math.min(at, this.#ids.length - 1)];
      next = there === undefined ? null : row(there, "remove");
    } else {
      next = row(id, act);
      if (next?.disabled) next = row(id, act === "up" ? "down" : "up");
    }
    (next ?? (this.#root.querySelector("input") as HTMLInputElement)).focus();
  }

  #mark(buttons: Element[]): void {
    const input = this.#root.querySelector("input") as HTMLInputElement;
    buttons.forEach((button, i) => {
      const on = i === this.#active;
      button.setAttribute("aria-selected", String(on));
      if (on) input.setAttribute("aria-activedescendant", button.id);
    });
    if (this.#active < 0) input.removeAttribute("aria-activedescendant");
  }

  #add(id: string): void {
    const input = this.#root.querySelector("input") as HTMLInputElement;
    input.value = "";
    this.#active = -1;
    this.#change(addId(this.#ids, id));
    this.#paintSuggestions();
    input.focus();
  }

  #change(next: string[]): void {
    if (next.length === this.#ids.length && next.every((id, i) => id === this.#ids[i])) return;
    this.#ids = next;
    this.#paintChosen();
    this.#emit("user");
  }

  #emit(reason: CollectionDetail["reason"]): void {
    this.dispatchEvent(new CustomEvent<CollectionDetail>(EVENT, { bubbles: true, composed: true, detail: { ids: this.value, reason } }));
  }

  #paint(): void {
    const words = this.#words();
    const input = this.#root.querySelector("input") as HTMLInputElement | null;
    if (!input) return;
    (this.#root.querySelector("label") as HTMLElement).textContent = words.search;
    input.setAttribute("aria-label", words.search);
    input.placeholder = words.search;
    this.#paintSuggestions();
    this.#paintChosen();
  }

  #paintSuggestions(): void {
    const words = this.#words();
    const list = this.#root.querySelector("#suggestions") as HTMLUListElement | null;
    const input = this.#root.querySelector("input") as HTMLInputElement | null;
    if (!list || !input) return;
    const found = searchItems(this.#index, input.value, this.#limit());
    list.replaceChildren();
    if (input.value.trim() === "") {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      return;
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    const doc = this.ownerDocument;
    if (found.length === 0) {
      const note = doc.createElement("li");
      note.className = "quiet";
      note.setAttribute("role", "presentation");
      note.textContent = words.empty;
      list.append(note);
      return;
    }
    found.forEach((item, i) => {
      const row = doc.createElement("li");
      // the options belong to the listbox: the row is only a holder
      row.setAttribute("role", "presentation");
      const button = doc.createElement("button");
      button.type = "button";
      button.id = `s${i}`;
      button.dataset.id = item.id;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(i === this.#active));
      button.textContent = item.group ? `${item.name} · ${item.group}` : item.name;
      button.setAttribute("aria-label", `${words.add} ${item.name}`);
      row.append(button);
      list.append(row);
    });
    this.#mark([...list.querySelectorAll("button")]);
  }

  #paintChosen(): void {
    const words = this.#words();
    const box = this.#root.querySelector(".chosen") as HTMLElement | null;
    if (!box) return;
    const heading = box.querySelector("p") as HTMLElement;
    const rows = box.querySelector("ul") as HTMLUListElement;
    heading.textContent = words.chosen;
    rows.className = "rows";
    rows.replaceChildren();
    if (this.#ids.length === 0) {
      const note = this.ownerDocument.createElement("li");
      note.className = "quiet";
      note.textContent = words.none;
      rows.append(note);
      return;
    }
    this.#ids.forEach((id, i) => {
      const item = this.#byId.get(id);
      const name = item?.name ?? id;
      const row = this.ownerDocument.createElement("li");
      row.className = "row";
      const label = this.ownerDocument.createElement("span");
      label.className = "name";
      label.textContent = name;
      row.append(label, this.#act("up", id, words.up, name, i === 0), this.#act("down", id, words.down, name, i === this.#ids.length - 1), this.#act("remove", id, words.remove, name, false));
      rows.append(row);
    });
  }

  /** A row's button: its word on it, and for a screen reader the word and the item (`Remove Mars`), so a list of rows is not a run of the same three words. */
  #act(act: string, id: string, word: string, item: string, off: boolean): HTMLButtonElement {
    const button = this.ownerDocument.createElement("button");
    button.type = "button";
    button.dataset.act = act;
    button.dataset.id = id;
    button.textContent = word;
    button.setAttribute("aria-label", `${word} ${item}`);
    button.disabled = off;
    return button;
  }
}
