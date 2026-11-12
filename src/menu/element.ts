// <kazoku-menu>: one button that opens a panel. The page puts its own controls in the light DOM (a language picker, a theme switch, links) and this element shows them in the panel. It does not keep their state.
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { STYLES } from "./styles.ts";
import { languageOf, parseWhich, type MenuWhich, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-menutoggle` event carries in `detail`. */
export interface MenuToggleDetail {
  /** Whether the panel is open after the change. */
  open: boolean;
  /** `settings` or `resources`. */
  which: MenuWhich;
}

const GEAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0-.1 1.5 7.7 7.7 0 0 0 .1 1.5l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>`;
const LIST = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`;

/**
 * Attributes: `which` (`settings`, the default, or `resources`: which word the button says), `lang` (`en` or `ja`; else the page's), `open` (the panel starts open).
 * The page's controls are the element's children. They are shown in the panel and keep their own address and store. Escape, the Close button, or a press outside closes the panel and returns focus to the button. On a narrow window the panel is a sheet from the bottom.
 */
export class MenuElement extends HTMLElement {
  static observedAttributes = ["which", "lang", "open"];

  #root: ShadowRoot;
  #open = false;
  #ready = false;
  #stop: (() => void)[] = [];

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Whether the panel is open. Setting it opens or closes without a pointer. */
  get open(): boolean {
    return this.#open;
  }

  set open(next: boolean) {
    this.#setOpen(next, false);
  }

  connectedCallback(): void {
    if (!this.#ready) {
      adoptStyles(this.#root, STYLES);
      this.#root.innerHTML = `<button type="button" class="opener" aria-haspopup="dialog" aria-expanded="false" aria-controls="panel">${GEAR}<span data-label></span></button><div id="panel" class="panel" role="dialog" tabindex="-1" hidden><slot></slot><button type="button" class="close" data-close></button></div>`;
      this.#root.querySelector(".opener")?.addEventListener("click", () => this.#setOpen(!this.#open, true));
      this.#root.querySelector("[data-close]")?.addEventListener("click", () => this.#setOpen(false, true));
      this.#ready = true;
    }
    this.#stop.push(watchScheme(this));
    const onKey = (event: KeyboardEvent): void => {
      if (!this.#open || event.key !== "Escape") return;
      event.preventDefault();
      this.#setOpen(false, true);
    };
    const onPointer = (event: Event): void => {
      if (!this.#open) return;
      const path = event.composedPath();
      if (!path.includes(this)) this.#setOpen(false, true);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    this.#stop.push(() => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    });
    this.#paint();
    if (this.hasAttribute("open")) this.#setOpen(true, false);
  }

  disconnectedCallback(): void {
    for (const stop of this.#stop) stop();
    this.#stop = [];
  }

  attributeChangedCallback(name: string): void {
    if (!this.#ready) return;
    if (name === "open") this.#setOpen(this.hasAttribute("open"), false);
    else this.#paint();
  }

  #paint(): void {
    const which = parseWhich(this.getAttribute("which"));
    const words = wordsFor(languageOf(this.getAttribute("lang") ?? this.ownerDocument.documentElement.lang));
    const label = words[which];
    const opener = this.#root.querySelector(".opener");
    if (opener) opener.innerHTML = `${which === "resources" ? LIST : GEAR}<span data-label></span>`;
    const text = this.#root.querySelector("[data-label]");
    if (text) text.textContent = label;
    const panel = this.#root.querySelector("#panel");
    panel?.setAttribute("aria-label", label);
    const close = this.#root.querySelector("[data-close]");
    if (close) close.textContent = words.close;
  }

  #setOpen(next: boolean, focus: boolean): void {
    if (next === this.#open && this.#ready) return;
    this.#open = next;
    const opener = this.#root.querySelector(".opener");
    const panel = this.#root.querySelector<HTMLElement>("#panel");
    opener?.setAttribute("aria-expanded", next ? "true" : "false");
    panel?.toggleAttribute("hidden", !next);
    this.toggleAttribute("open", next);
    if (focus && !next) (opener as HTMLElement | null)?.focus();
    if (focus && next) panel?.focus();
    this.dispatchEvent(new CustomEvent<MenuToggleDetail>(EVENT, { detail: { open: next, which: parseWhich(this.getAttribute("which")) }, bubbles: true, composed: true }));
  }
}
