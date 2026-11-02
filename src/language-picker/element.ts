// <kazoku-language-picker>: a button for each language the page gives, each in its own name. It writes the choice as `lang` on a target (the page's <html> by default),
// keeps it in the address and, if asked, in localStorage, and tells the page with a `kazoku-languagechange` event. It translates nothing: the page reads the event and says its words.
import { createAddressState } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { localStore, remember } from "../shared/store.ts";
import { resolveTarget } from "../shared/target.ts";
import { EVENT, TAG } from "./index.ts";
import { applyLanguage, LANGUAGE_ADDRESS_KEY, LANGUAGE_STORAGE_KEY, languageName, matchLanguage, parseLanguages, startingLanguage } from "./languages.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type PickerWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-languagechange` event carries in `detail`. */
export interface LanguageChangeDetail {
  /** The language now chosen: one of the codes the page gave, lower case ("en", "ja"). */
  lang: string;
  /** The one before; `undefined` at `init`. */
  previous: string | undefined;
  /** `init` (once, a moment after it connects), `user` (a button), `set` (the `value` property or attribute) or `external` (something else wrote the target's `lang`). */
  reason: "init" | "user" | "set" | "external";
  /** The element the choice is written on. */
  target: Element;
}

/**
 * Attributes: `languages` (the codes, `en ja` by default), `value` (the language to start in), `target` (a CSS selector for the element that gets `lang`; the page's <html>
 * by default), `address` (keep the choice in `?lang=`, or the key `address-key` names), `storage` (also remember it in localStorage under that key; a bare `storage` uses
 * `kazoku-lang`), `theme` (`light` or `dark`: its own look). The start is read, in this order, from the address, the store, `value`, the reader's languages
 * (`navigator.languages`), the target's own `lang`, then the first code.
 */
export class LanguagePickerElement extends HTMLElement {
  static observedAttributes = ["languages", "value", "target"];

  #root: ShadowRoot;
  #list: string[] = [];
  #lang = "";
  #target: Element | undefined;
  #names: Record<string, string> = {};
  #words: Partial<PickerWords> = {};
  #ready = false;
  #styled = false;
  #address = createAddressState({ delay: 0 });
  #stop: (() => void)[] = [];
  #watching: MutationObserver | undefined;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The language now chosen. Setting it applies it (event reason `set`); a code that is not in `languages` is ignored. */
  get value(): string {
    return this.#lang;
  }

  set value(code: string) {
    const match = matchLanguage(code, this.#list);
    if (match !== undefined) this.#choose(match, "set");
  }

  /** The codes the picker offers. */
  get languages(): readonly string[] {
    return this.#list;
  }

  get target(): Element | undefined {
    return this.#target;
  }

  set target(element: Element | undefined) {
    this.#aim(element);
  }

  /** Your own names over the family's, for example `{ fr: "Français (Canada)" }`. */
  set names(names: Record<string, string>) {
    this.#names = names;
    this.#render();
  }

  /** Your own words over the language's, for example `{ group: "Choose a language" }`. */
  set words(words: Partial<PickerWords>) {
    this.#words = words;
    this.#render();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this));
    this.#list = parseLanguages(this.getAttribute("languages"));
    this.#aim(resolveTarget(this, this.getAttribute("target")));
    this.#lang = startingLanguage({
      list: this.#list,
      ...(this.hasAttribute("address") ? { search: globalThis.location?.search ?? "", addressKey: this.#addressKey() } : {}),
      ...(this.hasAttribute("storage") ? { storage: localStore(), storageKey: this.#storageKey() } : {}),
      value: this.getAttribute("value"),
      preferred: globalThis.navigator?.languages ?? [],
      current: this.#target?.getAttribute("lang") ?? null,
    });
    if (this.#target !== undefined) applyLanguage(this.#target, this.#lang);
    this.#render();
    this.#ready = true;
    // Said once the page has had its turn to listen; `value` can be read at any time.
    queueMicrotask(() => {
      if (this.isConnected) this.#dispatch(undefined, "init");
    });
  }

  disconnectedCallback(): void {
    for (const stop of this.#stop.splice(0)) stop();
    this.#watching?.disconnect();
    this.#watching = undefined;
    this.#ready = false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready) return;
    if (name === "languages") {
      this.#list = parseLanguages(value);
      const kept = matchLanguage(this.#lang, this.#list);
      if (kept === undefined) this.#choose(this.#list[0] as string, "set");
      else this.#render();
    } else if (name === "value") {
      const match = matchLanguage(value, this.#list);
      if (match !== undefined) this.#choose(match, "set");
    } else if (name === "target") {
      this.#aim(resolveTarget(this, value));
      if (this.#target !== undefined) applyLanguage(this.#target, this.#lang);
    }
  }

  #addressKey(): string {
    return this.getAttribute("address-key") || LANGUAGE_ADDRESS_KEY;
  }

  #storageKey(): string {
    return this.getAttribute("storage") || LANGUAGE_STORAGE_KEY;
  }

  #aim(element: Element | undefined): void {
    if (element === this.#target) return;
    this.#watching?.disconnect();
    this.#target = element;
    if (element === undefined) return;
    // Something else writing the target's lang (a page's own script, another picker) moves this one with it, when it is one of ours.
    this.#watching = new MutationObserver(() => {
      const held = matchLanguage(element.getAttribute("lang"), this.#list);
      if (held !== undefined && held !== this.#lang) {
        const previous = this.#lang;
        this.#lang = held;
        this.#render();
        this.#dispatch(previous, "external");
      }
    });
    this.#watching.observe(element, { attributes: true, attributeFilter: ["lang"] });
  }

  #choose(code: string, reason: "user" | "set"): void {
    const previous = this.#lang;
    if (this.#target !== undefined) applyLanguage(this.#target, code);
    this.#lang = code;
    this.#render();
    if (this.hasAttribute("address")) this.#address.set(this.#addressKey(), code);
    if (this.hasAttribute("storage")) remember(this.#storageKey(), code);
    if (code !== previous || reason === "user") this.#dispatch(previous, reason);
  }

  #render(): void {
    const words = wordsFor(languageOf(this.#lang), this.#words);
    let group = this.#root.querySelector<HTMLElement>(".group");
    if (group === null) {
      group = this.ownerDocument.createElement("div");
      group.className = "group";
      group.setAttribute("part", "group");
      group.setAttribute("role", "group");
      this.#root.append(group);
    }
    group.setAttribute("aria-label", words.group);
    group.setAttribute("lang", languageOf(this.#lang));
    const have = [...group.querySelectorAll<HTMLButtonElement>("button")];
    if (have.length !== this.#list.length || have.some((button, index) => button.dataset.v !== this.#list[index])) {
      group.replaceChildren(
        ...this.#list.map((code) => {
          const button = this.ownerDocument.createElement("button");
          button.type = "button";
          button.dataset.v = code;
          button.lang = code;
          button.setAttribute("part", "button");
          button.addEventListener("click", () => this.#choose(code, "user"));
          return button;
        }),
      );
    }
    for (const button of group.querySelectorAll<HTMLButtonElement>("button")) {
      const code = button.dataset.v as string;
      button.textContent = languageName(code, this.#names);
      button.setAttribute("aria-pressed", String(code === this.#lang));
    }
  }

  #dispatch(previous: string | undefined, reason: LanguageChangeDetail["reason"]): void {
    if (this.#target === undefined) return;
    const detail: LanguageChangeDetail = { lang: this.#lang, previous, reason, target: this.#target };
    this.dispatchEvent(new CustomEvent<LanguageChangeDetail>(EVENT, { detail, bubbles: true, composed: true }));
  }
}
