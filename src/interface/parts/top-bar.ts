// <kazoku-top-bar>: part 8. Left, the brand, linking home, then where you are as a short trail. Right, a search field (a search icon on a phone), the language switch and, on a phone, a menu button.
// 64 px tall on a desk, 56 on a phone. A sky view's culture switch is in the bar, never in a menu: beside the language switch on a desk, on a second line of the bar on a phone, where it fits.
import { flag, h, PHONE_QUERY, setAttr, setText } from "../dom.ts";
import { InterfacePart } from "../part.ts";
import { PHONE, UI_BASE } from "../styles.ts";
import { type SectionLink, type TrailItem } from "../trail.ts";
import { kui, RADII, SIZES } from "../tokens.ts";
import { defineBasics } from "./basics.ts";
import type { SegmentedSwitchElement } from "./segmented-switch.ts";
import { SEGMENT_EVENT, SEGMENTED_SWITCH_TAG, type SegmentChangeDetail } from "./segmented-switch.ts";

export const TOP_BAR_TAG = "kazoku-top-bar";
export const TOP_BAR_EVENT = "kazoku-topbar";

/** What `kazoku-topbar` carries in `detail`. */
export interface TopBarDetail {
  /** `search` (the field was submitted; `value` is the text), `culture` (the sky culture changed; `value` is it), `language` (the language changed), or `menu` (the menu button; `value` is whether it is open). */
  action: "search" | "culture" | "language" | "menu";
  value: string | boolean;
}

const STYLES = `${UI_BASE}
:host { position: fixed; top: 0; left: 0; right: 0; z-index: 9; display: block; }
:host([placement="absolute"]) { position: absolute; }
:host([placement="static"]) { position: relative; }
.bar { display: flex; align-items: center; gap: 12px; height: ${SIZES.topBar}px; padding: 0 16px; border-width: 0 0 1px; border-radius: 0; }
.brand { flex: none; color: ${kui("text")}; font-size: 15px; font-weight: 600; letter-spacing: 0.01em; text-decoration: none; white-space: nowrap; }
.brand:hover { color: ${kui("text")}; text-decoration: underline; }
.trail { flex: 1 1 auto; min-width: 0; overflow: hidden; }
.trail ol { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; color: ${kui("text-soft")}; font-size: 14px; white-space: nowrap; }
.trail li { display: inline-flex; align-items: baseline; gap: 0.35em; min-width: 0; }
.trail li + li::before { content: "/"; margin-right: 6px; color: ${kui("text-quiet")}; }
.trail a { color: ${kui("text-soft")}; text-decoration: none; }
.trail a:hover { color: ${kui("text")}; text-decoration: underline; }
.trail .ja { margin-left: 0.35em; color: ${kui("text-quiet")}; font-size: 0.9em; }
.trail [aria-current] { color: ${kui("text")}; font-weight: 500; }
.tools { display: flex; flex: none; align-items: center; gap: 8px; }
.find { display: flex; align-items: center; }
.find { position: relative; }
.hint { position: absolute; right: 10px; top: 50%; display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; transform: translateY(-50%); border: 1px solid ${kui("line-strong")}; border-radius: 4px; color: ${kui("text-quiet")}; font: 400 11px/1 var(--kui-font-mono, ui-monospace, monospace); pointer-events: none; }
.find input:focus ~ .hint { display: none; }
.sections { display: flex; flex: none; align-self: stretch; gap: 4px; }
.sections a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border-bottom: 2px solid transparent; margin-bottom: -1px; align-self: center; color: ${kui("text-quiet")}; font-size: 14px; text-decoration: none; }
.sections a:hover { color: ${kui("text")}; }
.sections a[aria-current="page"] { color: ${kui("text")}; border-bottom-color: ${kui("sun")}; align-self: stretch; }
.find input { width: 310px; max-width: 28vw; height: 40px; padding: 0 12px; border: 1px solid ${kui("line-strong")}; border-radius: var(--kui-radius-control, ${RADII.control}px); background: ${kui("panel")}; color: ${kui("text")}; font-size: 14px; }
.find input::placeholder { color: ${kui("text-quiet")}; }
.find input:focus-visible { outline-offset: 0; }
.opener, .menu-button { display: none; }
.sub { display: none; }
.dropdown { display: none; }
${PHONE} {
  .bar { height: ${SIZES.topBarPhone}px; gap: 6px; padding: 0 8px 0 12px; }
  .trail, .sections { display: none; }
  .brand { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .find { display: none; }
  :host([data-search-open]) .find { position: absolute; inset: 0 8px 0 12px; display: flex; align-items: center; height: ${SIZES.topBarPhone}px; background: ${kui("panel")}; }
  :host([data-search-open]) .find input { width: 100%; height: 44px; }
  .opener, .menu-button { display: inline-block; }
  .tools { gap: 2px; }
  .desk-culture { display: none; }
  .sub { display: flex; align-items: center; gap: 10px; padding: 4px 12px; border-bottom: 1px solid ${kui("line")}; background: ${kui("panel")}; }
  :host([data-menu-open]) .dropdown { display: block; padding: 8px 12px 12px; border-bottom: 1px solid ${kui("line")}; background: ${kui("panel")}; }
  .dropdown ::slotted(*) { display: flex; align-items: center; min-height: 44px; }
}
`;

/**
 * Attributes: `brand` (the name at the left), `home` (where the brand links; `/` by default), `culture` (the sky culture now, `western`, `japanese` or `chinese`; its presence shows the culture switch, which a sky view has),
 * `no-language` (leave out the language switch), `no-search` (leave out the search), `search-text` (the field's text), `placeholder` (what the empty field says; "Search" by default; "/" goes to the field), `placement` (`fixed` at the top by default, `absolute` or `static`), `lang`.
 * The `trail` property takes where you are (`[{ label, href? }]`; a label that is `{ en, ja }` shows both names side by side). Put links in the `menu` slot for the phone's menu, which opens under the bar.
 * The page hears `kazoku-topbar` with `{ action, value }` for a search, the culture, the language and the menu. While it is on the page it publishes its height as `--kui-top-offset` on the document, so the scale switch and the card sit just below it.
 * Parts: `bar`, `brand`, `trail`, `search`, `menu`.
 *
 * @example
 * bar.trail = [{ label: "Solar system", href: "solar.html" }, { label: { en: "Jupiter", ja: "木星" } }];
 */
export class TopBarElement extends InterfacePart {
  static observedAttributes = ["brand", "home", "culture", "no-language", "no-search", "search-text", "placeholder", "lang"];

  #trail: readonly TrailItem[] = [];
  #sections: readonly SectionLink[] = [];
  #sectionNav!: HTMLElement;
  #brand!: HTMLAnchorElement;
  #nav!: HTMLElement;
  #field!: HTMLInputElement;
  #opener!: HTMLElement;
  #menuButton!: HTMLElement;
  #language!: SegmentedSwitchElement;
  #culture!: SegmentedSwitchElement;
  #cultureHolder!: HTMLElement;
  #sub!: HTMLElement;
  #deskTools!: HTMLElement;
  #resize: ResizeObserver | undefined;

  /** The site's sections as links in the bar (a reading page's Now, Universe, Atlas), the current one marked; a sky view uses the trail instead. */
  get sections(): readonly SectionLink[] {
    return this.#sections;
  }

  set sections(next: readonly SectionLink[]) {
    this.#sections = next;
    if (this.ready) this.paint();
  }

  /** Where you are. */
  get trail(): readonly TrailItem[] {
    return this.#trail;
  }

  set trail(next: readonly TrailItem[]) {
    this.#trail = next;
    if (this.ready) this.paint();
  }

  protected styles(): string {
    return STYLES;
  }

  protected build(): void {
    defineBasics();
    const doc = this.ownerDocument;
    this.#brand = h(doc, "a", { class: "brand", part: "brand" });
    this.#nav = h(doc, "nav", { class: "trail", part: "trail" }, [h(doc, "ol")]);
    this.#field = h(doc, "input", { type: "search", id: "q", autocomplete: "off", enterkeyhint: "search" });
    const find = h(doc, "form", { class: "find", role: "search", part: "search" }, [h(doc, "label", { class: "vh", for: "q", "data-find": "" }), this.#field, h(doc, "kbd", { class: "hint", "aria-hidden": "true" }, ["/"])]);
    this.#sectionNav = h(doc, "nav", { class: "sections", part: "sections" });
    find.addEventListener("submit", (event) => {
      event.preventDefault();
      this.emit<TopBarDetail>(TOP_BAR_EVENT, { action: "search", value: this.#field.value });
      if (this.hasAttribute("data-search-open")) this.#setSearch(false);
    });
    find.addEventListener("keydown", (event) => event.key === "Escape" && this.hasAttribute("data-search-open") && this.#setSearch(false));
    this.#opener = h(doc, "kazoku-icon-button", { class: "opener", icon: "search", expanded: "false" });
    this.#opener.addEventListener("click", () => this.#setSearch(!this.hasAttribute("data-search-open")));
    this.#language = h(doc, SEGMENTED_SWITCH_TAG, { kind: "language", part: "language" }) as SegmentedSwitchElement;
    this.#culture = h(doc, SEGMENTED_SWITCH_TAG, { kind: "culture" }) as SegmentedSwitchElement;
    this.#cultureHolder = h(doc, "span", { class: "desk-culture", part: "culture" }, [this.#culture]);
    this.#menuButton = h(doc, "kazoku-icon-button", { class: "menu-button", icon: "menu", expanded: "false" });
    this.#menuButton.addEventListener("click", () => {
      const open = !this.hasAttribute("data-menu-open");
      this.toggleAttribute("data-menu-open", open);
      this.emit<TopBarDetail>(TOP_BAR_EVENT, { action: "menu", value: open });
      this.paint();
    });
    this.#deskTools = h(doc, "div", { class: "tools" }, [this.#cultureHolder, find, this.#opener, this.#language, this.#menuButton]);
    const bar = h(doc, "div", { class: "bar panel", part: "bar" }, [this.#brand, this.#sectionNav, this.#nav, this.#deskTools]);
    this.#sub = h(doc, "div", { class: "sub", part: "culture" });
    const dropdown = h(doc, "div", { class: "dropdown", part: "menu" }, [h(doc, "slot", { name: "menu" })]);
    this.root.append(bar, this.#sub, dropdown);
    this.root.addEventListener(SEGMENT_EVENT, (event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent<SegmentChangeDetail>).detail;
      const from = (event.target as Element).getAttribute("kind");
      if (detail.reason !== "user" || (from !== "language" && from !== "culture")) return;
      this.emit<TopBarDetail>(TOP_BAR_EVENT, { action: from, value: detail.value });
      if (from === "culture") this.setAttribute("culture", detail.value);
    });
  }

  #setSearch(open: boolean): void {
    this.toggleAttribute("data-search-open", open);
    setAttr(this.#opener, "expanded", String(open));
    if (open) this.#field.focus();
    else (this.#opener.querySelector("button") ?? this.#opener).focus();
  }

  protected listen(): (() => void)[] {
    const publish = (): void => {
      const height = this.getBoundingClientRect().height;
      if (this.getAttribute("placement") !== "static" && height > 0) this.ownerDocument.documentElement.style.setProperty("--kui-top-offset", `${Math.round(height)}px`);
    };
    this.#resize = new ResizeObserver(publish);
    this.#resize.observe(this);
    publish();
    // The culture switch sits beside the language switch on a desk and on a second line on a phone: move it when the screen crosses the breakpoint.
    const query = globalThis.matchMedia?.(PHONE_QUERY);
    const moved = (): void => this.paint();
    query?.addEventListener("change", moved);
    // "/" goes to the search field, as on most sites, unless the reader is typing somewhere.
    const slash = (event: KeyboardEvent): void => {
      const from = event.composedPath()[0] as HTMLElement | undefined;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || this.hasAttribute("no-search")) return;
      if (from !== undefined && (["INPUT", "TEXTAREA", "SELECT"].includes(from.tagName) || from.isContentEditable)) return;
      if (globalThis.matchMedia?.(PHONE_QUERY).matches === true) this.#setSearch(true);
      else this.#field.focus();
      event.preventDefault();
    };
    this.ownerDocument.addEventListener("keydown", slash);
    return [
      () => {
        this.ownerDocument.removeEventListener("keydown", slash);
        this.#resize?.disconnect();
        query?.removeEventListener("change", moved);
        this.ownerDocument.documentElement.style.removeProperty("--kui-top-offset");
      },
    ];
  }

  protected paint(): void {
    const doc = this.ownerDocument;
    const { words, language } = this;
    setText(this.#brand, this.getAttribute("brand") ?? "");
    setAttr(this.#brand, "href", this.getAttribute("home") ?? "/");
    this.#nav.setAttribute("aria-label", words.trail);
    const items = this.#trail.map((item, at) => {
      const last = at === this.#trail.length - 1;
      const text = typeof item.label === "string" ? [item.label] : [item.label.en, item.label.ja !== "" && item.label.ja !== item.label.en ? h(doc, "span", { class: "ja", lang: "ja" }, [item.label.ja]) : null];
      const inner = item.href !== undefined && !last ? h(doc, "a", { href: item.href }, text) : h(doc, "span", last ? { "aria-current": "page" } : {}, text);
      return h(doc, "li", {}, [inner]);
    });
    this.#nav.querySelector("ol")?.replaceChildren(...items);
    this.#nav.hidden = items.length === 0;
    setText(this.root.querySelector("[data-find]") as Element, words.searchField);
    setAttr(this.#field, "placeholder", this.getAttribute("placeholder") ?? words.search);
    this.#sectionNav.hidden = this.#sections.length === 0;
    this.#sectionNav.setAttribute("aria-label", words.topBar);
    this.#sectionNav.replaceChildren(...this.#sections.map((one) => h(doc, "a", { href: one.href, ...(one.current === true ? { "aria-current": "page" } : {}) }, [one.label])));
    if (this.hasAttribute("search-text") && this.#field.value !== this.getAttribute("search-text")) this.#field.value = this.getAttribute("search-text") ?? "";
    (this.root.querySelector(".find") as HTMLElement).hidden = flag(this, "no-search");
    this.#opener.hidden = flag(this, "no-search");
    setAttr(this.#opener, "lang", language);
    setAttr(this.#opener, "label", words.search);
    setAttr(this.#menuButton, "lang", language);
    setAttr(this.#menuButton, "expanded", String(this.hasAttribute("data-menu-open")));
    this.#language.hidden = flag(this, "no-language");
    const culture = this.getAttribute("culture");
    setAttr(this.#culture, "lang", language);
    if (culture !== null && culture !== "") this.#culture.setAttribute("value", culture);
    const shown = this.hasAttribute("culture");
    this.#cultureHolder.hidden = !shown;
    // On a phone the culture switch moves to the bar's second line; one switch, moved, never two.
    const phone = globalThis.matchMedia?.(PHONE_QUERY).matches === true;
    const home = shown && phone ? this.#sub : this.#cultureHolder;
    if (this.#culture.parentElement !== home) home.append(this.#culture);
    this.#sub.hidden = !(shown && phone);
  }
}
