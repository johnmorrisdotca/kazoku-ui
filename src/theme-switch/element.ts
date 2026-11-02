// <kazoku-theme-switch>: Light, Dark and Auto as a row of buttons. It writes the choice as `data-theme` on a target (the page's <html> by default; `auto` removes it),
// keeps it in the address and, if asked, in localStorage, and tells the page with a `kazoku-themechange` event. It draws nothing of the page: the page's CSS reads `data-theme`.
import { adoptStyles } from "../shared/adopt.ts";
import { writeParam } from "../shared/query.ts";
import { watchScheme } from "../shared/scheme.ts";
import { localStore, remember } from "../shared/store.ts";
import { resolveTarget } from "../shared/target.ts";
import { EVENT, TAG } from "./index.ts";
import { STYLES } from "./styles.ts";
import { applyTheme, parseModes, parseTheme, readTheme, resolveTheme, THEME_ADDRESS_KEY, THEME_STORAGE_KEY, themeOf, type Scheme, type Theme } from "./theme.ts";
import { languageOf, type Language, type ThemeWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-themechange` event carries in `detail`. */
export interface ThemeChangeDetail {
  /** What the reader chose: `light`, `dark` or `auto`. */
  choice: Theme;
  /** The colours now showing: `light` or `dark`. Auto is the device's. */
  scheme: Scheme;
  /** `init`, `user` (a button), `set` (the `value` property or attribute), `system` (the device changed under Auto) or `external` (something else wrote the target's `data-theme`). */
  reason: "init" | "user" | "set" | "system" | "external";
  /** The element the choice is written on. */
  target: Element;
}

const icon = (body: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON: Record<Theme, string> = {
  light: icon('<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM5.6 19.8l-1.4-1.4 2.1-2.1 1.4 1.4zM17.7 7.7l-1.4-1.4 2.1-2.1 1.4 1.4z"/>'),
  dark: icon('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>'),
  auto: icon('<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z"/>'),
};

/**
 * Attributes: `value` (`light`, `dark` or `auto`; the choice), `target` (a CSS selector for the element that gets `data-theme`; the page's <html> by default),
 * `modes` (which buttons: `light dark` leaves Auto out), `address` (keep the choice in `?theme=`, or the key `address-key` names), `storage` (also remember it in
 * localStorage under that key; a bare `storage` uses `kazoku-theme`), `lang` (`en` or `ja`), `theme` (`light` or `dark`: its own look, otherwise the page's).
 * The choice is read, in this order, from the address, the store, `value`, then what the target already holds.
 */
export class ThemeSwitchElement extends HTMLElement {
  static observedAttributes = ["value", "target", "modes", "lang"];

  #root: ShadowRoot;
  #choice: Theme = "auto";
  #target: Element | undefined;
  #words: Partial<ThemeWords> = {};
  #ready = false;
  #styled = false;
  #stop: (() => void)[] = [];
  #watching: MutationObserver | undefined;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The choice now: `light`, `dark` or `auto`. Setting it applies it (event reason `set`). */
  get value(): Theme {
    return this.#choice;
  }

  set value(next: string) {
    const theme = parseTheme(next);
    if (theme !== undefined) this.#choose(theme, "set");
  }

  /** The colours showing now: `light` or `dark`. */
  get scheme(): Scheme {
    return resolveTheme(this.#choice, this.#prefersDark());
  }

  /** The element the choice is written on. */
  get target(): Element | undefined {
    return this.#target;
  }

  set target(element: Element | undefined) {
    this.#aim(element);
  }

  /** Your own labels over the language's, for example `{ auto: "System" }`. */
  set words(words: Partial<ThemeWords>) {
    this.#words = words;
    this.#render();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this));
    this.#resolveTarget();
    const target = this.#target;
    const remembered = readTheme({
      ...(this.hasAttribute("address") ? { search: globalThis.location?.search ?? "", addressKey: this.#addressKey() } : {}),
      ...(this.hasAttribute("storage") ? { storage: localStore(), storageKey: this.#storageKey() } : {}),
    });
    this.#choice = remembered ?? parseTheme(this.getAttribute("value")) ?? (target !== undefined && target.hasAttribute("data-theme") ? themeOf(target) : "auto");
    if (target !== undefined) applyTheme(target, this.#choice);
    this.#render();
    const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystem = (): void => {
      if (this.#choice === "auto") this.#dispatch("system");
    };
    media?.addEventListener("change", onSystem);
    this.#stop.push(() => media?.removeEventListener("change", onSystem));
    this.#ready = true;
    // Said once the page has had its turn to listen; `value` can be read at any time.
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
      const theme = parseTheme(value);
      if (theme !== undefined) this.#choose(theme, "set");
    } else if (name === "target") {
      this.#resolveTarget();
      if (this.#target !== undefined) applyTheme(this.#target, this.#choice);
    } else this.#render();
  }

  #addressKey(): string {
    return this.getAttribute("address-key") || THEME_ADDRESS_KEY;
  }

  #storageKey(): string {
    return this.getAttribute("storage") || THEME_STORAGE_KEY;
  }

  #prefersDark(): boolean {
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  }

  #resolveTarget(): void {
    this.#aim(resolveTarget(this, this.getAttribute("target")));
  }

  #aim(element: Element | undefined): void {
    if (element === this.#target) return;
    this.#watching?.disconnect();
    this.#target = element;
    if (element === undefined) return;
    // Something else writing the target's data-theme (a page's own button, another switch) moves this one with it.
    this.#watching = new MutationObserver(() => {
      const held = themeOf(element);
      if (held !== this.#choice) {
        this.#choice = held;
        this.#render();
        this.#dispatch("external");
      }
    });
    this.#watching.observe(element, { attributes: true, attributeFilter: ["data-theme"] });
  }

  #choose(theme: Theme, reason: "user" | "set"): void {
    if (this.#target !== undefined) applyTheme(this.#target, theme);
    const changed = theme !== this.#choice;
    this.#choice = theme;
    this.#render();
    if (this.hasAttribute("address")) writeParam(this.#addressKey(), theme === "auto" ? null : theme);
    if (this.hasAttribute("storage")) {
      remember(this.#storageKey(), theme);
    }
    if (changed || reason === "user") this.#dispatch(reason);
  }

  #language(): Language {
    return languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #render(): void {
    const language = this.#language();
    const words = wordsFor(language, this.#words);
    const modes = parseModes(this.getAttribute("modes"));
    let group = this.#root.querySelector<HTMLElement>(".group");
    if (group === null) {
      group = this.ownerDocument.createElement("div");
      group.className = "group";
      group.setAttribute("part", "group");
      group.setAttribute("role", "group");
      this.#root.append(group);
    }
    group.setAttribute("aria-label", words.group);
    group.setAttribute("lang", language);
    const have = [...group.querySelectorAll<HTMLButtonElement>("button")];
    if (have.length !== modes.length || have.some((button, index) => button.dataset.v !== modes[index])) {
      group.replaceChildren(
        ...modes.map((mode) => {
          const button = this.ownerDocument.createElement("button");
          button.type = "button";
          button.dataset.v = mode;
          button.setAttribute("part", "button");
          button.innerHTML = `${ICON[mode]}<span class="t"></span>`;
          button.addEventListener("click", () => this.#choose(mode, "user"));
          return button;
        }),
      );
    }
    for (const button of group.querySelectorAll<HTMLButtonElement>("button")) {
      const mode = button.dataset.v as Theme;
      (button.querySelector(".t") as HTMLElement).textContent = words[mode];
      button.setAttribute("aria-pressed", String(mode === this.#choice));
    }
  }

  #dispatch(reason: ThemeChangeDetail["reason"]): void {
    if (this.#target === undefined) return;
    const detail: ThemeChangeDetail = { choice: this.#choice, scheme: this.scheme, reason, target: this.#target };
    this.dispatchEvent(new CustomEvent<ThemeChangeDetail>(EVENT, { detail, bubbles: true, composed: true }));
  }
}
