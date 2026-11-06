// <kazoku-options-window>: a small window a package fills with its own controls. Card floats and snaps. Shelf docks to the right. Inspector is a wider card.
// The content (the default slot, the help slot, the title) is the same in every frame. variant picks the frame.
import { applyParams, createAddressWriter, readParam } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { localStore, remember } from "../shared/store.ts";
import { TAG } from "./index.ts";
import { addressKeys, frameOf, namedPlace, parsePlace, parseVariant, settle, type Snap } from "./place.ts";
import { STYLES } from "./styles.ts";
import { gestureHelp, languageOf, type Language, type OptionsWords, wordsFor } from "./words.ts";

export { TAG };

const STORAGE_KEY = "kazoku-options-window";
const SHEET = "(max-width: 700px)";

/**
 * Attributes: `title` (the name in the title bar), `variant` (`card`, `shelf` or `inspector`), `address` (keep open and place in the address),
 * `address-keys` (`open:ow,place:op`), `storage` (the device key when there is no address), `lang`, `theme`.
 * The default slot is the page's controls. The `help` slot is that window's own help, under the shared gesture line.
 */
export class OptionsWindowElement extends HTMLElement {
  static observedAttributes = ["title", "variant", "lang", "open"];

  #root: ShadowRoot;
  #open = true;
  #helpOpen = false;
  #snap: Snap = "tr";
  #point: { x: number; y: number } | undefined;
  #ready = false;
  #styled = false;
  #reflecting = false;
  #words: Partial<OptionsWords> = {};
  #writer = createAddressWriter({ delay: 0 });
  #stop: (() => void) | undefined;
  #sheetMedia: MediaQueryList | undefined;
  #observer: ResizeObserver | undefined;
  #drag: { id: number; x: number; y: number; left: number; top: number; moved: boolean } | undefined;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Whether the window is open. A folded window is its title chip. */
  get open(): boolean {
    return this.#open;
  }

  set open(next: boolean) {
    this.#setOpen(next);
  }

  /** Your own labels over the language's. */
  set words(words: Partial<OptionsWords>) {
    this.#words = words;
    this.#paint();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      const outer = this.getRootNode();
      adoptStyles(this.#root, STYLES, this.nonce || (outer instanceof ShadowRoot ? (outer.host as HTMLElement).nonce : "") || "");
      this.#styled = true;
    }
    this.#stop = watchScheme(this);
    this.#sheetMedia = globalThis.matchMedia?.(SHEET);
    this.#sheetMedia?.addEventListener?.("change", this.#onSheet);
    const remembered = this.#read();
    this.#open = remembered.open;
    this.#snap = remembered.snap;
    this.#point = remembered.at;
    this.#reflectOpen();
    this.#render();
    this.classList.toggle("as-sheet", this.#sheet());
    this.#ready = true;
    this.#placeNow();
    requestAnimationFrame(() => {
      if (this.#ready) this.#placeNow();
    });
    const parent = this.offsetParent;
    if (parent instanceof Element && typeof ResizeObserver !== "undefined") {
      this.#observer = new ResizeObserver(() => this.#placeNow());
      this.#observer.observe(parent);
    }
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#sheetMedia?.removeEventListener?.("change", this.#onSheet);
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#writer.cancel();
    this.#ready = false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready || this.#reflecting) return;
    if (name === "open") this.#setOpen(value !== null && value !== "off");
    else if (name === "variant") this.#placeNow();
    else this.#paint();
  }

  #sheet(): boolean {
    return this.#sheetMedia?.matches === true;
  }

  #onSheet = (): void => {
    this.classList.toggle("as-sheet", this.#sheet());
    this.#placeNow();
  };

  #language(): Language {
    return languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #title(words: OptionsWords): string {
    return this.getAttribute("title") || words.group;
  }

  #read(): { open: boolean; snap: Snap; at?: { x: number; y: number } } {
    if (this.hasAttribute("address")) {
      const keys = addressKeys(this.getAttribute("address-keys"));
      return this.#fromPlace(readParam(keys.open) !== "off", readParam(keys.place));
    }
    const key = this.getAttribute("storage") || STORAGE_KEY;
    try {
      const raw = localStore()?.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { open?: boolean; place?: string };
        return this.#fromPlace(parsed.open !== false, parsed.place ?? null);
      }
    } catch {
      /* a store that throws is the same as an empty one */
    }
    return { open: true, snap: "tr" };
  }

  #fromPlace(open: boolean, place: string | null): { open: boolean; snap: Snap; at?: { x: number; y: number } } {
    const parsed = parsePlace(place);
    if (!parsed) return { open, snap: "tr" };
    if ("snap" in parsed) return { open, snap: parsed.snap };
    return { open, snap: "free", at: parsed };
  }

  #view(): { width: number; height: number } {
    const parent = this.offsetParent;
    if (!(parent instanceof HTMLElement)) return { width: 800, height: 600 };
    return { width: parent.clientWidth, height: parent.clientHeight };
  }

  #size(): { width: number; height: number } {
    const variant = parseVariant(this.getAttribute("variant"));
    return { width: this.offsetWidth || (variant === "inspector" ? 420 : 280), height: this.offsetHeight || 64 };
  }

  #placeNow(): void {
    const variant = parseVariant(this.getAttribute("variant"));
    this.dataset.variant = variant;
    const frame = frameOf(variant, { title: this.#title(wordsFor(this.#language(), this.#words)), help: "", open: this.#open });
    this.dataset.presentation = frame.presentation;
    if (this.#sheet() || variant === "shelf") {
      this.style.left = "";
      this.style.top = "";
      return;
    }
    const view = this.#view();
    const size = this.#size();
    const origin = this.#point ?? { x: this.offsetLeft, y: this.offsetTop };
    this.#point = undefined;
    const at = this.#snap === "free" ? settle(view, size, origin, 0) : { ...namedPlace(view, size, this.#snap), snap: this.#snap };
    this.#snap = at.snap;
    this.dataset.snap = at.snap;
    this.style.left = `${at.x}px`;
    this.style.top = `${at.y}px`;
  }

  #commit(placed: { x: number; y: number; snap: Snap }): void {
    const named = placed.snap === "free" ? null : namedPlace(this.#view(), this.#size(), placed.snap);
    const exact = named !== null && Math.abs(named.x - placed.x) < 1 && Math.abs(named.y - placed.y) < 1;
    this.#snap = exact ? placed.snap : "free";
    this.dataset.snap = this.#snap;
    this.style.left = `${placed.x}px`;
    this.style.top = `${placed.y}px`;
    this.#remember();
  }

  #remember(): void {
    const place = this.#snap === "free" ? `${Math.round(this.offsetLeft)},${Math.round(this.offsetTop)}` : this.#snap;
    if (this.hasAttribute("address")) {
      const keys = addressKeys(this.getAttribute("address-keys"));
      this.#writer.write((search) => applyParams(search, { [keys.open]: this.#open ? null : "off", [keys.place]: place === "tr" ? null : place }));
      return;
    }
    remember(this.getAttribute("storage") || STORAGE_KEY, JSON.stringify({ open: this.#open, place }));
  }

  #setOpen(next: boolean): void {
    if (next === this.#open) return;
    this.#open = next;
    if (!next) this.#helpOpen = false;
    this.#reflectOpen();
    this.#paint();
    this.#placeNow();
    this.#remember();
  }

  #reflectOpen(): void {
    const have = this.hasAttribute("open") && this.getAttribute("open") !== "off";
    if (have === this.#open) return;
    this.#reflecting = true;
    if (this.#open) this.setAttribute("open", "");
    else this.removeAttribute("open");
    this.#reflecting = false;
  }

  #render(): void {
    const doc = this.ownerDocument;
    const frame = doc.createElement("div");
    frame.className = "frame";
    frame.setAttribute("role", "region");
    const grab = doc.createElement("div");
    grab.className = "grab";
    grab.dataset.act = "handle";
    const bar = doc.createElement("div");
    bar.className = "bar";
    const handle = doc.createElement("span");
    handle.className = "handle";
    handle.dataset.act = "handle";
    handle.setAttribute("part", "handle");
    for (let dot = 0; dot < 6; dot += 1) handle.append(doc.createElement("i"));
    const name = doc.createElement("span");
    name.className = "name";
    name.dataset.act = "title";
    name.tabIndex = 0;
    name.setAttribute("part", "title");
    bar.append(handle, name);
    for (const act of ["help", "fold"] as const) {
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.act = act;
      button.setAttribute("part", act);
      bar.append(button);
    }
    const body = doc.createElement("div");
    body.className = "body";
    body.setAttribute("part", "body");
    body.append(doc.createElement("slot"));
    const help = doc.createElement("div");
    help.className = "help-panel";
    help.setAttribute("part", "help-panel");
    const gestures = doc.createElement("table");
    gestures.className = "gestures";
    const extra = doc.createElement("slot");
    extra.name = "help";
    help.append(gestures, extra);
    frame.append(grab, bar, body, help);
    bar.addEventListener("pointerdown", this.#down);
    bar.addEventListener("pointermove", this.#move);
    bar.addEventListener("pointerup", this.#up);
    bar.addEventListener("pointercancel", this.#up);
    this.#root.addEventListener("keydown", (event: Event) => {
      if (event instanceof KeyboardEvent) this.#key(event);
    });
    this.#root.replaceChildren(frame);
    this.#paint();
  }

  #paint(): void {
    const words = wordsFor(this.#language(), this.#words);
    const frame = this.#root.querySelector(".frame");
    const title = this.#root.querySelector<HTMLElement>('[data-act="title"]');
    const help = this.#root.querySelector<HTMLButtonElement>('[data-act="help"]');
    const fold = this.#root.querySelector<HTMLButtonElement>('[data-act="fold"]');
    const body = this.#root.querySelector<HTMLElement>(".body");
    const panel = this.#root.querySelector<HTMLElement>(".help-panel");
    const gestures = this.#root.querySelector(".gestures");
    const name = this.#title(words);
    if (frame) frame.setAttribute("aria-label", name);
    if (title) {
      title.textContent = name;
      title.setAttribute("aria-expanded", String(this.#open));
      title.setAttribute("aria-label", this.#open ? name : `${words.expand}: ${name}`);
    }
    if (help) {
      help.textContent = "?";
      help.setAttribute("aria-label", this.#helpOpen ? words.closeHelp : words.help);
      help.setAttribute("aria-pressed", String(this.#helpOpen));
      help.hidden = !this.#open;
    }
    if (fold) {
      fold.textContent = "−";
      fold.setAttribute("aria-label", words.collapse);
      fold.hidden = !this.#open;
    }
    if (body) body.hidden = !this.#open;
    if (panel) panel.hidden = !this.#open || !this.#helpOpen;
    if (gestures) this.#gestureTable(gestures, gestureHelp(this.#language()));
  }

  /** The shared gesture line as two columns, one row per gesture. */
  #gestureTable(table: Element, text: string): void {
    table.replaceChildren();
    const mark = text.includes("。") ? "。" : ". ";
    const split = text.includes("：") ? "：" : ": ";
    for (const part of text.split(mark)) {
      const line = part.trim().replace(/\.$/, "");
      if (!line) continue;
      const at = line.indexOf(split);
      const row = table.ownerDocument.createElement("tr");
      const label = table.ownerDocument.createElement("th");
      const detail = table.ownerDocument.createElement("td");
      label.textContent = at === -1 ? line : line.slice(0, at);
      detail.textContent = at === -1 ? "" : line.slice(at + split.length);
      row.append(label, detail);
      table.append(row);
    }
  }

  #down = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const act = target.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "help") {
      this.#helpOpen = !this.#helpOpen;
      this.#paint();
      return;
    }
    if (act === "fold") {
      this.#setOpen(false);
      return;
    }
    if ((act !== "title" && act !== "handle") || this.#sheet() || parseVariant(this.getAttribute("variant")) === "shelf") return;
    this.#drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: this.offsetLeft, top: this.offsetTop, moved: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  #move = (event: PointerEvent): void => {
    if (!this.#drag || event.pointerId !== this.#drag.id) return;
    const dx = event.clientX - this.#drag.x;
    const dy = event.clientY - this.#drag.y;
    if (Math.hypot(dx, dy) > 4) this.#drag.moved = true;
    const at = settle(this.#view(), this.#size(), { x: this.#drag.left + dx, y: this.#drag.top + dy }, 0);
    this.style.left = `${at.x}px`;
    this.style.top = `${at.y}px`;
  };

  #up = (event: PointerEvent): void => {
    if (!this.#drag || event.pointerId !== this.#drag.id) return;
    const moved = this.#drag.moved;
    this.#drag = undefined;
    if (!moved) {
      if (!this.#open) this.#setOpen(true);
      return;
    }
    this.#commit(settle(this.#view(), this.#size(), { x: this.offsetLeft, y: this.offsetTop }));
  };

  #key = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      if (this.#helpOpen) {
        this.#helpOpen = false;
        this.#paint();
      } else if (this.#open) this.#setOpen(false);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const onTitle = event.composedPath().some((node) => node instanceof HTMLElement && node.dataset.act === "title");
    if (!onTitle || this.#sheet() || parseVariant(this.getAttribute("variant")) === "shelf") return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 16;
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    this.#commit(settle(this.#view(), this.#size(), { x: this.offsetLeft + dx, y: this.offsetTop + dy }, 0));
  };
}
