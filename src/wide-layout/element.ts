// <kazoku-wide-toggle>: a button that switches a page between Normal and Wide (theatre mode, as YouTube has it). It writes `data-wide="on"` on a target (the page's <html> by default),
// keeps the choice in the address (`?wide=on`) and, if asked, in localStorage, answers the T key, and tells the page with a `kazoku-widechange` event and a window `resize`, so a view
// draws again at its new size. The layout itself is the page's CSS (`wideCss()` is one); the element draws nothing of the page.
import { createAddressState } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { localStore, remember } from "../shared/store.ts";
import { resolveTarget } from "../shared/target.ts";
import { EVENT, TAG } from "./index.ts";
import { STYLES } from "./styles.ts";
import { applyWide, isTyping, parseWide, readWide, WIDE_ADDRESS_KEY, WIDE_STORAGE_KEY, wideOf } from "./wide.ts";
import { languageOf, type Language, type WideWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-widechange` event carries in `detail`. */
export interface WideChangeDetail {
  /** Whether the page is wide now. */
  wide: boolean;
  /** `init`, `user` (the button), `key` (the T key), `set` (the `value` property or attribute) or `external` (something else wrote the target's `data-wide`). */
  reason: "init" | "user" | "key" | "set" | "external";
  /** The element the choice is written on. */
  target: Element;
}

const ICON = {
  wide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM5 8v8h14V8z" fill-rule="evenodd"/></svg>',
  normal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h10v12H7zM9 8v8h6V8z" fill-rule="evenodd"/></svg>',
};

/**
 * Attributes: `value` (`on` or `off`; the choice), `target` (a CSS selector for the element that gets `data-wide`; the page's <html> by default), `address` (keep the choice in `?wide=`, or the key
 * `address-key` names), `storage` (also remember it in localStorage under that key; a bare `storage` uses `kazoku-wide`), `keys` (`off` turns the T key off), `resize` (`off` stops the window
 * `resize` event after a change), `lang` (`en` or `ja`), `theme` (`light` or `dark`: its own look, otherwise the page's). The choice is read, in this order, from the address, the store, `value`,
 * then what the target already holds. On a phone the toggle is hidden, because the layout is one column already.
 */
export class WideToggleElement extends HTMLElement {
  static observedAttributes = ["value", "target", "lang"];

  #root: ShadowRoot;
  #wide = false;
  #target: Element | undefined;
  #words: Partial<WideWords> = {};
  #ready = false;
  #styled = false;
  #address = createAddressState({ delay: 0 });
  #stop: (() => void)[] = [];
  #watching: MutationObserver | undefined;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Whether the page is wide now. Setting it applies it (event reason `set`). */
  get wide(): boolean {
    return this.#wide;
  }

  set wide(next: boolean) {
    this.#choose(Boolean(next), "set");
  }

  /** The element the choice is written on. */
  get target(): Element | undefined {
    return this.#target;
  }

  set target(element: Element | undefined) {
    this.#aim(element);
  }

  /** Your own labels over the language's, for example `{ wide: "Theatre" }`. */
  set words(words: Partial<WideWords>) {
    this.#words = words;
    this.#render();
  }

  /** Switch between Normal and Wide, as the button does. */
  toggle(): void {
    this.#choose(!this.#wide, "user");
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this));
    this.#resolveTarget();
    const target = this.#target;
    const remembered = readWide({
      ...(this.hasAttribute("address") ? { search: globalThis.location?.search ?? "", addressKey: this.#addressKey() } : {}),
      ...(this.hasAttribute("storage") ? { storage: localStore(), storageKey: this.#storageKey() } : {}),
    });
    this.#wide = remembered ?? parseWide(this.getAttribute("value")) ?? (target !== undefined ? wideOf(target) : false);
    if (target !== undefined) applyWide(target, this.#wide);
    this.#render();
    const onKey = (event: KeyboardEvent): void => {
      if (this.getAttribute("keys") === "off" || event.defaultPrevented || event.repeat || event.key.toLowerCase() !== "t") return;
      const origin = (event.composedPath?.()[0] ?? event.target) as Element | null;
      if (isTyping(origin instanceof Element ? origin : null, event)) return;
      this.#choose(!this.#wide, "key");
    };
    this.ownerDocument.addEventListener("keydown", onKey);
    this.#stop.push(() => this.ownerDocument.removeEventListener("keydown", onKey));
    this.#ready = true;
    // Said once the page has had its turn to listen; `wide` can be read at any time.
    queueMicrotask(() => {
      if (this.isConnected) this.#dispatch("init");
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
    if (name === "value") {
      const wide = parseWide(value);
      if (wide !== undefined) this.#choose(wide, "set");
    } else if (name === "target") {
      this.#resolveTarget();
      if (this.#target !== undefined) applyWide(this.#target, this.#wide);
    } else this.#render();
  }

  #addressKey(): string {
    return this.getAttribute("address-key") || WIDE_ADDRESS_KEY;
  }

  #storageKey(): string {
    return this.getAttribute("storage") || WIDE_STORAGE_KEY;
  }

  #resolveTarget(): void {
    this.#aim(resolveTarget(this, this.getAttribute("target")));
  }

  #aim(element: Element | undefined): void {
    if (element === this.#target) return;
    this.#watching?.disconnect();
    this.#target = element;
    if (element === undefined) return;
    // Something else writing the target's data-wide (a page's own button, another toggle) moves this one with it.
    this.#watching = new MutationObserver(() => {
      const held = wideOf(element);
      if (held !== this.#wide) {
        this.#wide = held;
        this.#render();
        this.#dispatch("external");
      }
    });
    this.#watching.observe(element, { attributes: true, attributeFilter: ["data-wide"] });
  }

  #choose(wide: boolean, reason: "user" | "key" | "set"): void {
    if (this.#target !== undefined) applyWide(this.#target, wide);
    const changed = wide !== this.#wide;
    this.#wide = wide;
    this.#render();
    if (this.hasAttribute("address")) this.#address.set(this.#addressKey(), wide ? "on" : null);
    if (this.hasAttribute("storage")) remember(this.#storageKey(), wide ? "on" : "off");
    if (changed || reason !== "set") this.#dispatch(reason);
  }

  #language(): Language {
    return languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #render(): void {
    const language = this.#language();
    const words = wordsFor(language, this.#words);
    let button = this.#root.querySelector<HTMLButtonElement>("button");
    if (button === null) {
      button = this.ownerDocument.createElement("button");
      button.type = "button";
      button.setAttribute("part", "button");
      button.setAttribute("aria-keyshortcuts", "T");
      button.addEventListener("click", () => this.toggle());
      this.#root.append(button);
    }
    // The button names what a press gives, and the state is the name, so there is no aria-pressed to disagree with it.
    const label = this.#wide ? words.normal : words.wide;
    button.innerHTML = `${this.#wide ? ICON.normal : ICON.wide}<span class="t"></span>`;
    (button.querySelector(".t") as HTMLElement).textContent = label;
    button.setAttribute("lang", language);
    button.title = `${label} (T)`;
    button.dataset.wide = this.#wide ? "on" : "off";
  }

  #dispatch(reason: WideChangeDetail["reason"]): void {
    if (this.#target === undefined) return;
    const detail: WideChangeDetail = { wide: this.#wide, reason, target: this.#target };
    this.dispatchEvent(new CustomEvent<WideChangeDetail>(EVENT, { detail, bubbles: true, composed: true }));
    // A view that draws to its size listens for the window's resize; the layout has moved under it by the next frame.
    const view = this.ownerDocument.defaultView;
    if (reason !== "init" && this.getAttribute("resize") !== "off" && view !== null) view.requestAnimationFrame(() => view.dispatchEvent(new Event("resize")));
  }
}
