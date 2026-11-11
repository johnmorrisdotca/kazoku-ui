// <kazoku-embed-panel>: the family's one "Put it in your page" panel. A package fills it with its own choices and its own code: the panel shows a compact picker for the thing
// being embedded, a size choice, a tab for each way a page is made (HTML, ES module, React, Vue, Angular, Svelte, iframe and any more the package adds, such as an image), the code
// with a Copy button that says what it does, the picture the code makes (built from the same choices, and always fitting its box), a link to the embed page, a link to the docs and
// the credit line. It draws nothing of the package's: the page gives the code (`generate`) and the picture (`preview`), and calls `update()` when its own choices change.
import { applyParams, createAddressWriter, readParam } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { DEFAULT_KINDS, DEFAULT_SIZE, filterItems, groupsOf, KIND_ADDRESS_KEY, nearestSize, parseKinds, parseSizes, type PickItem, SEARCH_FROM, SIZE_ADDRESS_KEY } from "./choices.ts";
import { EVENT, TAG } from "./index.ts";
import { STYLES } from "./styles.ts";
import { kindLabel, languageOf, type Language, type PanelWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the page's `generate`, `preview`, `credits` and `note` functions are told. */
export interface EmbedContext {
  /** The tab: `html`, `module`, `react`, `vue`, `angular`, `svelte`, `iframe`, or one the page added. */
  kind: string;
  /** The size chosen, in pixels across. */
  size: number;
  /** True when the text is for the picture beside the code, not for the reader to copy: a page may use a relative address there so the picture works from where the page is. */
  preview: boolean;
}

/** What the `kazoku-embedchange` event carries in `detail`. */
export interface EmbedChangeDetail {
  kind: string;
  size: number;
  /** The picker's choice (an item's `id`), or an empty text where there is no built-in picker. */
  value: string;
  /** The text to copy now. */
  code: string;
  /** `init` (once, when it comes up), `kind` (a tab), `size` (a size button), `pick` (the picker) or `set` (a property or attribute). */
  reason: "init" | "kind" | "size" | "pick" | "set";
}

type Text = string | ((context: EmbedContext) => string);

const SVG = "http://www.w3.org/2000/svg";

function icon(doc: Document, path: string): SVGElement {
  const svg = doc.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const shape = doc.createElementNS(SVG, "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}

/**
 * Attributes: `kinds` (the tabs, `html module react vue angular svelte iframe` by default; add your own such as `image`), `kind` (the tab to start on), `sizes` (`160 240 320 480`) and
 * `size` (the start, 320), `no-size` (no size choice), `value` (the picker's choice), `open-href` (the embed page), `docs-href` (the docs), `aspect` (the picture's height over its width, 1),
 * `no-preview` (no picture), `heading` (show the shared heading), `search` / `no-search` (force the picker's search box on or off), `pick-label` (the picker's name), `address` (keep the tab and
 * the size in the address under `kind-key`, `embed`, and `size-key`, `size`; the starts are left off it), `lang` (`en` or `ja`), `theme` (`light` or `dark`).
 * Slots: `lede` (a line under the heading), `picker` (your own picker in place of the built-in one), `options` (your own choices between the size and the tabs), `actions` (more buttons
 * beside Copy: Save SVG, Download). Parts: `panel`, `title`, `picker`, `size`, `tabs`, `tab`, `preview`, `note`, `code`, `copy`, `open`, `docs`, `credits`.
 * Custom properties: `--kazoku-preview-bg` (behind the picture, the page's surface by default), `--kazoku-preview-width` (the picture's column, 260px).
 */
export class EmbedPanelElement extends HTMLElement {
  static observedAttributes = ["kinds", "kind", "sizes", "size", "value", "open-href", "docs-href", "aspect", "lang", "heading", "no-size", "no-preview", "pick-label", "search", "no-search"];

  #root: ShadowRoot;
  #kinds: string[] = [...DEFAULT_KINDS];
  #sizes: number[] = [];
  #kind = "html";
  #size = DEFAULT_SIZE;
  #startKind = "html";
  #startSize = DEFAULT_SIZE;
  #value = "";
  #items: readonly PickItem[] = [];
  #query = "";
  #group = "";
  #generate: ((context: EmbedContext) => string) | undefined;
  #preview: ((context: EmbedContext) => Node | undefined) | undefined;
  #credits: Text = "";
  #note: Text = "";
  #labels: Record<string, string> = {};
  #words: Partial<PanelWords> = {};
  #renderItem: ((item: PickItem) => Node | string) | undefined;
  #code = "";
  #ready = false;
  #built = false;
  #styled = false;
  #previewKey = "";
  #writer = createAddressWriter({ delay: 0 });
  #stop: (() => void) | undefined;
  #sizeObserver: ResizeObserver | undefined;
  #langObserver: MutationObserver | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #reflecting = false;
  #frame = 0;
  #el: Record<string, HTMLElement> = {};

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The tab now: one of `kinds`. Setting one that is not there is ignored. */
  get kind(): string {
    return this.#kind;
  }

  set kind(kind: string) {
    if (this.#kinds.includes(kind)) this.#choose({ kind }, "set");
  }

  /** The size now, in pixels across: one of `sizes`. Setting a number that is not one takes the nearest. */
  get size(): number {
    return this.#size;
  }

  set size(size: number | string) {
    if (this.#sizes.length > 0) this.#choose({ size: nearestSize(size, this.#sizes) }, "set");
  }

  /** The tabs, in order. Setting a list (or a text such as `html react iframe`) draws them again. */
  get kinds(): readonly string[] {
    return this.#kinds;
  }

  set kinds(list: readonly string[] | string) {
    this.#aimKinds(parseKinds(typeof list === "string" ? list : list.join(" ")));
  }

  /** The sizes the buttons offer, smallest first. */
  get sizes(): readonly number[] {
    return this.#sizes;
  }

  set sizes(list: readonly number[] | string) {
    this.#aimSizes(parseSizes(typeof list === "string" ? list : list.join(" ")));
  }

  /** The picker's choice: an item's `id`. Setting one that is not in `items` is ignored. */
  get value(): string {
    return this.#value;
  }

  set value(id: string) {
    if (this.#items.some((item) => item.id === id)) this.#choose({ value: id }, "set");
  }

  /** The things the built-in picker offers. Leave it empty and give the `picker` slot for a picker of your own. */
  get items(): readonly PickItem[] {
    return this.#items;
  }

  set items(items: readonly PickItem[]) {
    this.#items = items;
    if (!items.some((item) => item.id === this.#value)) this.#value = items[0]?.id ?? "";
    this.#query = "";
    this.#group = "";
    this.#renderPicker(true);
  }

  /** How a picker button looks inside: a node (a small picture) or a text. The label by default. */
  set renderItem(render: ((item: PickItem) => Node | string) | undefined) {
    this.#renderItem = render;
    this.#renderPicker(true);
  }

  /** The text of a tab for the choices as they are. Required: without it the code box is empty. Call `update()` after the page's own choices change. */
  set generate(generate: ((context: EmbedContext) => string) | undefined) {
    this.#generate = generate;
    this.update();
  }

  /** The picture the code makes, as a node (or nothing). It is called when the picture's choices change; the iframe tab draws the iframe itself when this returns nothing for it. */
  set preview(preview: ((context: EmbedContext) => Node | undefined) | undefined) {
    this.#preview = preview;
    this.#previewKey = "";
    this.update();
  }

  /** The credit line shown under the code (and read by a screen reader): a text, or a function of the choices. */
  set credits(credits: Text) {
    this.#credits = credits;
    this.update();
  }

  /** A line above the code for the tab shown ("The embed page is for a site that cannot run script."): a text, or a function of the choices. */
  set note(note: Text) {
    this.#note = note;
    this.update();
  }

  /** The names of the tabs the family has no word for: `{ image: "Image address" }`. */
  set labels(labels: Record<string, string>) {
    this.#labels = labels;
    this.#render();
  }

  /** Your own words over the language's. */
  set words(words: Partial<PanelWords>) {
    this.#words = words;
    this.#render();
  }

  /** Where "Open the embed page" goes. Set it again when the choices change the address. */
  get openHref(): string {
    return this.getAttribute("open-href") ?? "";
  }

  set openHref(href: string) {
    this.#attr("open-href", href);
    this.#links();
  }

  /** Where "Read the docs" goes. */
  get docsHref(): string {
    return this.getAttribute("docs-href") ?? "";
  }

  set docsHref(href: string) {
    this.#attr("docs-href", href);
    this.#links();
  }

  /** The text of the tab shown: what Copy copies. */
  get code(): string {
    return this.#code;
  }

  /** Reads the page's choices again: the code, the credit, the note, the links, and the picture if its choices changed. Call it whenever the page's own choices change. It tells no one. */
  update(): void {
    if (!this.#built) return;
    this.#refresh();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce || "");
      this.#styled = true;
    }
    if (!this.#built) this.#build();
    this.#stop = watchScheme(this);
    this.#kinds = parseKinds(this.getAttribute("kinds"));
    this.#sizes = parseSizes(this.getAttribute("sizes"));
    this.#startKind = this.#kinds.includes(this.getAttribute("kind") ?? "") ? (this.getAttribute("kind") as string) : (this.#kinds[0] ?? "html");
    this.#startSize = nearestSize(this.getAttribute("size"), this.#sizes);
    const keptKind = this.hasAttribute("address") ? readParam(this.#key("kind"), globalThis.location?.search ?? "") : null;
    const keptSize = this.hasAttribute("address") ? readParam(this.#key("size"), globalThis.location?.search ?? "") : null;
    this.#kind = keptKind !== null && this.#kinds.includes(keptKind) ? keptKind : this.#startKind;
    this.#size = keptSize !== null ? nearestSize(keptSize, this.#sizes) : this.#startSize;
    this.#upgrade();
    const wished = this.getAttribute("value");
    if (wished !== null && this.#items.some((item) => item.id === wished)) this.#value = wished;
    this.#render();
    this.#ready = true;
    if (typeof ResizeObserver === "function") {
      this.#sizeObserver = new ResizeObserver(() => this.#fit());
      this.#sizeObserver.observe(this.#el["preview"] as HTMLElement);
    }
    if (typeof MutationObserver === "function") {
      this.#langObserver = new MutationObserver(() => this.#render());
      this.#langObserver.observe(this.ownerDocument.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    queueMicrotask(() => {
      if (this.isConnected) this.#dispatch("init");
    });
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#sizeObserver?.disconnect();
    this.#langObserver?.disconnect();
    this.#writer.cancel();
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    if (this.#frame !== 0) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#ready = false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready || this.#reflecting) return;
    if (name === "kinds") this.#aimKinds(parseKinds(value));
    else if (name === "sizes") this.#aimSizes(parseSizes(value));
    else if (name === "kind") {
      if (value !== null && this.#kinds.includes(value)) this.#choose({ kind: value }, "set");
    } else if (name === "size") {
      if (value !== null) this.#choose({ size: nearestSize(value, this.#sizes) }, "set");
    } else if (name === "value") {
      if (value !== null && this.#items.some((item) => item.id === value)) this.#choose({ value }, "set");
    } else if (name === "open-href" || name === "docs-href") this.#links();
    else if (name === "aspect") this.#fit();
    else this.#render();
  }

  /** A property set before the tag was defined sits on the element itself and hides the setter: take it off and set it again. */
  #upgrade(): void {
    const self = this as unknown as Record<string, unknown>;
    for (const name of ["kinds", "sizes", "items", "renderItem", "labels", "words", "generate", "preview", "credits", "note", "kind", "size", "value", "openHref", "docsHref"]) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const value = self[name];
        delete self[name];
        self[name] = value;
      }
    }
  }

  #key(which: "kind" | "size"): string {
    return which === "kind" ? this.getAttribute("kind-key") || KIND_ADDRESS_KEY : this.getAttribute("size-key") || SIZE_ADDRESS_KEY;
  }

  #attr(name: string, value: string): void {
    this.#reflecting = true;
    if (value === "") this.removeAttribute(name);
    else this.setAttribute(name, value);
    this.#reflecting = false;
  }

  #language(): Language {
    return languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #words_(): PanelWords {
    return wordsFor(this.#language(), this.#words);
  }

  #aimKinds(kinds: string[]): void {
    this.#kinds = kinds;
    this.#startKind = kinds.includes(this.#startKind) ? this.#startKind : (kinds[0] ?? "html");
    if (!kinds.includes(this.#kind)) this.#kind = this.#startKind;
    this.#render();
  }

  #aimSizes(sizes: number[]): void {
    this.#sizes = sizes;
    this.#startSize = nearestSize(this.#startSize, sizes);
    this.#size = nearestSize(this.#size, sizes);
    this.#render();
  }

  #choose(next: { kind?: string; size?: number; value?: string }, reason: EmbedChangeDetail["reason"]): void {
    const kind = next.kind ?? this.#kind;
    const size = next.size ?? this.#size;
    const value = next.value ?? this.#value;
    if (kind === this.#kind && size === this.#size && value === this.#value) return;
    this.#kind = kind;
    this.#size = size;
    this.#value = value;
    this.#refresh();
    this.#sync();
    if (this.hasAttribute("address")) {
      const [kindKey, sizeKey] = [this.#key("kind"), this.#key("size")];
      this.#writer.write((search) => applyParams(search, { [kindKey]: kind, [sizeKey]: size }, { [kindKey]: this.#startKind, [sizeKey]: String(this.#startSize) }));
    }
    this.#dispatch(reason);
  }

  /** The `value` attribute follows the picker, so a framework that watches attributes sees it. */
  #sync(): void {
    if (this.#items.length > 0 && this.getAttribute("value") !== this.#value) this.#attr("value", this.#value);
  }

  #text(text: Text, preview = false): string {
    return typeof text === "function" ? text({ kind: this.#kind, size: this.#size, preview }) : text;
  }

  #build(): void {
    const doc = this.ownerDocument;
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", part = ""): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag);
      if (className !== "") node.className = className;
      if (part !== "") node.setAttribute("part", part);
      return node;
    };
    const slot = (name: string): HTMLSlotElement => {
      const node = doc.createElement("slot");
      node.name = name;
      return node;
    };
    const panel = make("section", "panel", "panel");
    const title = make("h2", "title", "title");
    const pick = make("div", "pick", "picker");
    const builtin = make("div", "builtin");
    pick.append(slot("picker"), builtin);
    const sizeRow = make("div", "row");
    const sizeLabel = make("span", "lbl");
    sizeLabel.setAttribute("aria-hidden", "true");
    const sizeGroup = make("div", "group", "size");
    sizeGroup.setAttribute("role", "group");
    sizeRow.append(sizeLabel, sizeGroup);
    const tabs = make("div", "tabs", "tabs");
    tabs.setAttribute("role", "tablist");
    const grid = make("div", "grid");
    grid.setAttribute("role", "tabpanel");
    const preview = make("div", "preview", "preview");
    const frame = make("div", "frame");
    const fit = make("div", "fit");
    frame.append(fit);
    preview.append(frame);
    const codecol = make("div", "codecol");
    const note = make("p", "note", "note");
    const codebox = make("pre", "codebox", "code");
    codebox.tabIndex = 0;
    const code = make("code");
    codebox.append(code);
    const actions = make("div", "actions");
    const copy = make("button", "primary", "copy");
    copy.type = "button";
    const copyIcon = icon(doc, "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z");
    const copyText = make("span");
    copy.append(copyIcon, copyText);
    const open = make("a", "btn", "open");
    open.target = "_blank";
    open.rel = "noopener";
    const docs = make("a", "btn", "docs");
    const status = make("span", "status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.append(copy, open, docs, slot("actions"), status);
    const credits = make("p", "credits", "credits");
    codecol.append(note, codebox, actions, credits);
    grid.append(preview, codecol);
    panel.append(title, slot("lede"), pick, sizeRow, slot("options"), tabs, grid);
    this.#root.append(panel);
    this.#el = { title, builtin, pick, sizeRow, sizeLabel, sizeGroup, tabs, grid, preview, frame, fit, note, codebox, code, copy, copyText, open, docs, status, credits };
    tabs.addEventListener("click", (event) => {
      const tab = (event.target as Element).closest<HTMLButtonElement>("button[data-kind]");
      if (tab !== null) this.#choose({ kind: tab.dataset["kind"] as string }, "kind");
    });
    tabs.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      const edge = event.key === "Home" ? 0 : event.key === "End" ? this.#kinds.length - 1 : -1;
      if (step === 0 && edge < 0) return;
      const at = this.#kinds.indexOf(this.#kind);
      const next = this.#kinds[edge >= 0 ? edge : (at + step + this.#kinds.length) % this.#kinds.length];
      if (next === undefined) return;
      event.preventDefault();
      this.#choose({ kind: next }, "kind");
      tabs.querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)?.focus();
    });
    sizeGroup.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("button[data-size]");
      if (button !== null) this.#choose({ size: Number(button.dataset["size"]) }, "size");
    });
    builtin.addEventListener("click", (event) => {
      const target = event.target as Element;
      const item = target.closest<HTMLButtonElement>("button[data-id]");
      if (item !== null) {
        this.#choose({ value: item.dataset["id"] as string }, "pick");
        return;
      }
      const chip = target.closest<HTMLButtonElement>("button[data-group]");
      if (chip !== null) {
        this.#group = chip.dataset["group"] ?? "";
        this.#renderPicker(false);
      }
    });
    builtin.addEventListener("input", (event) => {
      if ((event.target as Element).matches("input")) {
        this.#query = (event.target as HTMLInputElement).value;
        this.#renderPicker(false);
      }
    });
    copy.addEventListener("click", () => void this.#copy());
    this.#built = true;
  }

  async #copy(): Promise<void> {
    const words = this.#words_();
    const status = this.#el["status"] as HTMLElement;
    try {
      await navigator.clipboard.writeText(this.#code);
      status.textContent = words.copied;
    } catch {
      const range = this.ownerDocument.createRange();
      range.selectNodeContents(this.#el["code"] as HTMLElement);
      const selection = this.ownerDocument.defaultView?.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      status.textContent = words.copyFail;
    }
    this.dispatchEvent(new CustomEvent("kazoku-embedcopy", { detail: { kind: this.#kind, size: this.#size, code: this.#code }, bubbles: true, composed: true }));
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (status.textContent = ""), 2500);
  }

  /** Everything the words and the lists decide: the headings, the buttons, the tabs, the picker, then the code. */
  #render(): void {
    if (!this.#built) return;
    const words = this.#words_();
    const language = this.#language();
    const doc = this.ownerDocument;
    const el = this.#el as Record<string, HTMLElement>;
    el["title"]!.textContent = words.title;
    el["title"]!.hidden = !this.hasAttribute("heading");
    el["copyText"]!.textContent = words.copy;
    el["open"]!.textContent = words.open;
    el["docs"]!.textContent = words.docs;
    el["sizeLabel"]!.textContent = words.size;
    el["sizeGroup"]!.setAttribute("aria-label", words.size);
    el["sizeRow"]!.hidden = this.hasAttribute("no-size") || this.#sizes.length < 2;
    el["tabs"]!.setAttribute("aria-label", words.kinds);
    el["preview"]!.setAttribute("aria-label", words.preview);
    el["preview"]!.hidden = this.hasAttribute("no-preview");
    el["codebox"]!.setAttribute("role", "region");
    el["codebox"]!.setAttribute("aria-label", words.code);
    const sized = [...el["sizeGroup"]!.querySelectorAll<HTMLButtonElement>("button")];
    if (sized.length !== this.#sizes.length || sized.some((button, i) => button.dataset["size"] !== String(this.#sizes[i]))) {
      el["sizeGroup"]!.replaceChildren(
        ...this.#sizes.map((size) => {
          const button = doc.createElement("button");
          button.type = "button";
          button.dataset["size"] = String(size);
          button.textContent = String(size);
          button.setAttribute("part", "size-button");
          return button;
        }),
      );
    }
    const tabbed = [...el["tabs"]!.querySelectorAll<HTMLButtonElement>("button")];
    if (tabbed.length !== this.#kinds.length || tabbed.some((tab, i) => tab.dataset["kind"] !== this.#kinds[i])) {
      el["tabs"]!.replaceChildren(
        ...this.#kinds.map((kind) => {
          const tab = doc.createElement("button");
          tab.type = "button";
          tab.setAttribute("role", "tab");
          tab.setAttribute("part", "tab");
          tab.dataset["kind"] = kind;
          return tab;
        }),
      );
    }
    for (const tab of el["tabs"]!.querySelectorAll<HTMLButtonElement>("button")) {
      const label = kindLabel(tab.dataset["kind"] as string, language, this.#labels, this.#words);
      if (tab.textContent !== label) tab.textContent = label;
    }
    this.#renderPicker(true);
    this.#refresh();
  }

  /** The pressed states, the code and everything that follows the page's choices. */
  #refresh(): void {
    if (!this.#built) return;
    const el = this.#el as Record<string, HTMLElement>;
    const words = this.#words_();
    for (const button of el["sizeGroup"]!.querySelectorAll<HTMLButtonElement>("button")) button.setAttribute("aria-pressed", String(Number(button.dataset["size"]) === this.#size));
    for (const tab of el["tabs"]!.querySelectorAll<HTMLButtonElement>("button")) {
      const on = tab.dataset["kind"] === this.#kind;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) el["grid"]!.setAttribute("aria-label", tab.textContent ?? "");
    }
    for (const button of el["builtin"]!.querySelectorAll<HTMLButtonElement>("button[data-id]")) button.setAttribute("aria-pressed", String(button.dataset["id"] === this.#value));
    this.#code = this.#generate?.({ kind: this.#kind, size: this.#size, preview: false }) ?? "";
    if (el["code"]!.textContent !== this.#code) el["code"]!.textContent = this.#code;
    const note = this.#text(this.#note);
    el["note"]!.textContent = note;
    el["note"]!.hidden = note === "";
    const credits = this.#text(this.#credits);
    el["credits"]!.textContent = credits === "" ? "" : `${words.credits}: ${credits}`;
    el["credits"]!.hidden = credits === "";
    this.#links();
    this.#picture();
  }

  #links(): void {
    if (!this.#built) return;
    const el = this.#el as Record<string, HTMLElement>;
    for (const [node, name] of [[el["open"], "open-href"], [el["docs"], "docs-href"]] as const) {
      const href = this.getAttribute(name) ?? "";
      if (href === "") node!.removeAttribute("href");
      else node!.setAttribute("href", href);
      node!.hidden = href === "";
    }
    (el["docs"] as HTMLAnchorElement).target = "_blank";
    (el["docs"] as HTMLAnchorElement).rel = "noopener";
  }

  /** The picture: rebuilt only when what it shows changes (the iframe tab, the image tab, or the choices the live picture is made from). */
  #picture(): void {
    if (this.hasAttribute("no-preview")) return;
    const el = this.#el as Record<string, HTMLElement>;
    const shows = this.#kind === "iframe" || this.#kind === "image" ? this.#kind : "live";
    const asKind = shows === "live" ? (this.#kinds.find((kind) => kind !== "iframe" && kind !== "image") ?? "html") : shows;
    const code = this.#generate?.({ kind: asKind, size: this.#size, preview: true }) ?? "";
    const key = JSON.stringify([shows, this.#size, code, this.#language()]);
    if (key === this.#previewKey) {
      this.#fit();
      return;
    }
    this.#previewKey = key;
    let node = this.#preview?.({ kind: asKind, size: this.#size, preview: true });
    if (node === undefined && shows === "image") node = this.#preview?.({ kind: this.#kinds.find((kind) => kind !== "iframe" && kind !== "image") ?? "html", size: this.#size, preview: true });
    if (node === undefined && asKind === "iframe") node = this.#iframeOf(code);
    el["fit"]!.replaceChildren(...(node === undefined ? [] : [node]));
    this.#fit();
  }

  /** The iframe of the iframe tab's text, as a live element. */
  #iframeOf(code: string): Node | undefined {
    const doc = this.ownerDocument;
    const holder = doc.createElement("template");
    holder.innerHTML = code;
    const found = holder.content.querySelector("iframe");
    if (found === null) return undefined;
    const frame = doc.createElement("iframe");
    for (const name of found.getAttributeNames()) if (name !== "style") frame.setAttribute(name, found.getAttribute(name) as string);
    frame.setAttribute("loading", "lazy");
    return frame;
  }

  /** Scales the picture to its box. The picture is laid out at its own size and shrunk to fit the width it has, so it is never cut off, at any size on any screen. */
  #fit(): void {
    if (!this.#built || this.hasAttribute("no-preview")) return;
    // One frame at a time, never cancelled: a frame already asked for reads the choices as they are when it runs.
    if (this.#frame !== 0) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      const el = this.#el as Record<string, HTMLElement>;
      const aspect = Number(this.getAttribute("aspect"));
      const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
      const fit = el["fit"]!;
      fit.style.width = `${this.#size}px`;
      fit.style.height = `${Math.round(this.#size * ratio)}px`;
      fit.style.transform = "none";
      const width = Math.max(this.#size, fit.scrollWidth);
      const height = Math.max(Math.round(this.#size * ratio), fit.scrollHeight);
      fit.style.width = `${width}px`;
      fit.style.height = `${height}px`;
      const preview = el["preview"]!;
      const room = preview.clientWidth - 16;
      const scale = room > 0 ? Math.min(1, room / width) : 1;
      fit.style.transform = scale < 1 ? `scale(${scale})` : "none";
      el["frame"]!.style.width = `${Math.floor(width * scale)}px`;
      el["frame"]!.style.height = `${Math.ceil(height * scale)}px`;
    });
  }

  #renderPicker(rebuild: boolean): void {
    if (!this.#built) return;
    const box = this.#el["builtin"] as HTMLElement;
    const words = this.#words_();
    const doc = this.ownerDocument;
    box.hidden = this.#items.length === 0;
    if (this.#items.length === 0) {
      box.replaceChildren();
      return;
    }
    const label = this.getAttribute("pick-label") || words.pick;
    const groups = groupsOf(this.#items);
    const search = this.hasAttribute("search") || (!this.hasAttribute("no-search") && this.#items.length >= SEARCH_FROM);
    if (rebuild || box.querySelector(".items") === null) {
      const children: HTMLElement[] = [];
      if (groups.length > 1) {
        const chips = doc.createElement("div");
        chips.className = "chips";
        chips.setAttribute("role", "group");
        chips.setAttribute("aria-label", label);
        for (const group of ["", ...groups]) {
          const chip = doc.createElement("button");
          chip.type = "button";
          chip.dataset["group"] = group;
          chip.textContent = group === "" ? words.all : group;
          chip.setAttribute("part", "chip");
          chips.append(chip);
        }
        children.push(chips);
      }
      if (search) {
        const input = doc.createElement("input");
        input.type = "search";
        input.className = "search";
        input.placeholder = words.search;
        input.setAttribute("aria-label", words.search);
        input.setAttribute("autocomplete", "off");
        input.setAttribute("part", "search");
        input.value = this.#query;
        children.push(input);
      }
      const list = doc.createElement("div");
      list.className = "items";
      list.setAttribute("role", "group");
      list.setAttribute("aria-label", label);
      list.setAttribute("part", "items");
      children.push(list);
      const none = doc.createElement("p");
      none.className = "none";
      none.setAttribute("role", "status");
      children.push(none);
      box.replaceChildren(...children);
    }
    for (const chip of box.querySelectorAll<HTMLButtonElement>("button[data-group]")) chip.setAttribute("aria-pressed", String(chip.dataset["group"] === this.#group));
    const shown = filterItems(this.#items, this.#query, this.#group);
    const list = box.querySelector<HTMLElement>(".items") as HTMLElement;
    list.replaceChildren(
      ...shown.map((item) => {
        const button = doc.createElement("button");
        button.type = "button";
        button.dataset["id"] = item.id;
        button.setAttribute("part", "item");
        button.setAttribute("aria-pressed", String(item.id === this.#value));
        const inside = this.#renderItem?.(item) ?? item.label;
        if (typeof inside === "string") button.textContent = inside;
        else button.append(inside);
        return button;
      }),
    );
    (box.querySelector(".none") as HTMLElement).textContent = shown.length === 0 ? words.none : "";
    // Only the list scrolls to the pressed button: scrollIntoView would also scroll the page to the panel each time it draws.
    const pressed = list.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (pressed !== null) {
      const room = list.getBoundingClientRect();
      const at = pressed.getBoundingClientRect();
      if (at.top < room.top) list.scrollTop -= room.top - at.top;
      else if (at.bottom > room.bottom) list.scrollTop += at.bottom - room.bottom;
    }
  }

  #dispatch(reason: EmbedChangeDetail["reason"]): void {
    this.dispatchEvent(new CustomEvent<EmbedChangeDetail>(EVENT, { detail: { kind: this.#kind, size: this.#size, value: this.#value, code: this.#code, reason }, bubbles: true, composed: true }));
  }
}
