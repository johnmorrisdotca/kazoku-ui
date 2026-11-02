// <kazoku-save-image>: Save PNG and Save SVG buttons for a canvas, an SVG or an element on the page. It never draws the scene: it saves what the target shows, hands the picture to the
// browser as a download, and tells the page with a `kazoku-save` event (or `kazoku-saveerror`).
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, ERROR_EVENT, TAG } from "./index.ts";
import { filenameFor, formatsFor, parseFormats, type Format } from "./format.ts";
import { downloadBlob, kindOf, renderImage, type Picture } from "./render.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type SaveWords, wordsFor } from "./words.ts";

export { EVENT, ERROR_EVENT, TAG };

/** What the `kazoku-save` event carries in `detail`. */
export interface SaveDetail extends Picture {
  /** The file name offered to the browser, with the extension. */
  filename: string;
  /** `user` (a button) or `api` (`save()` called by the page). */
  reason: "user" | "api";
}

/** What the `kazoku-saveerror` event carries in `detail`. */
export interface SaveErrorDetail {
  format: Format;
  error: Error;
  reason: "user" | "api";
}

const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16.1l-5.7-5.8 1.4-1.4 3.3 3.3zM5 18h14v2H5z"/></svg>`;

/**
 * Attributes: `for` (the id of the canvas, SVG or element to save; or set `element.target`), `formats` (`png svg`, the buttons, in order; one the target cannot give is left out),
 * `name` (the file name without its extension; `image` by default), `scale` (PNG pixels for each CSS pixel of an SVG or element; 2 by default; a canvas is saved at its own size),
 * `background` (a CSS colour behind a PNG; transparent without it), `manual` (make the picture and send the event, but do not download), `no-inline-styles` (leave the computed styles out of what is saved),
 * `lang` (`en` or `ja`), `theme` (`light` or `dark`: its own look, otherwise the page's).
 */
export class SaveImageElement extends HTMLElement {
  static observedAttributes = ["for", "formats", "lang"];

  #root: ShadowRoot;
  #target: Element | undefined;
  #words: Partial<SaveWords> = {};
  #ready = false;
  #styled = false;
  #busy = false;
  #stop: (() => void)[] = [];
  #clear: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The element that is saved: the one `for` names, or the one you set. */
  get target(): Element | undefined {
    return this.#target;
  }

  set target(element: Element | undefined) {
    this.#target = element;
    this.#render();
  }

  /** Your own labels over the language's, for example `{ png: "Download PNG" }`. */
  set words(words: Partial<SaveWords>) {
    this.#words = words;
    this.#render();
  }

  /** Saves the target in a format (the first button's by default) and resolves with the picture; rejects with the error the event reports. */
  async save(format: Format = this.#formats()[0] ?? "png"): Promise<SaveDetail> {
    return this.#save(format, "api");
  }

  connectedCallback(): void {
    if (!this.#styled) {
      adoptStyles(this.#root, STYLES, this.nonce);
      this.#styled = true;
    }
    this.#stop.push(watchScheme(this));
    this.#resolveTarget();
    if (this.#target === undefined && this.ownerDocument.readyState === "loading") this.ownerDocument.addEventListener("DOMContentLoaded", () => this.#resolveTarget(), { once: true });
    this.#ready = true;
    this.#render();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stop.splice(0)) stop();
    globalThis.clearTimeout(this.#clear);
    this.#ready = false;
  }

  attributeChangedCallback(name: string): void {
    if (!this.#ready) return;
    if (name === "for") this.#resolveTarget();
    else this.#render();
  }

  #resolveTarget(): void {
    const id = this.getAttribute("for");
    if (id === null) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const found = root.getElementById?.(id) ?? this.ownerDocument.getElementById(id);
    if (found !== null && found !== undefined) {
      this.#target = found;
      this.#render();
    }
  }

  /** The formats the buttons offer: those asked for that the target can give (all of them while there is no target yet). */
  #formats(): Format[] {
    const asked = parseFormats(this.getAttribute("formats"));
    if (this.#target === undefined) return asked;
    const can = formatsFor(kindOf(this.#target));
    return asked.filter((format) => can.includes(format));
  }

  #render(): void {
    if (!this.#ready) return;
    const language = languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
    const words = wordsFor(language, this.#words);
    const formats = this.#formats();
    let group = this.#root.querySelector<HTMLElement>(".group");
    if (group === null) {
      group = this.ownerDocument.createElement("div");
      group.className = "group";
      group.setAttribute("part", "group");
      group.setAttribute("role", "group");
      const status = this.ownerDocument.createElement("span");
      status.className = "vh";
      status.setAttribute("role", "status");
      this.#root.append(group, status);
    }
    group.setAttribute("aria-label", words.group);
    group.setAttribute("lang", language);
    const have = [...group.querySelectorAll<HTMLButtonElement>("button")];
    if (have.length !== formats.length || have.some((button, index) => button.dataset.v !== formats[index])) {
      group.replaceChildren(
        ...formats.map((format) => {
          const button = this.ownerDocument.createElement("button");
          button.type = "button";
          button.dataset.v = format;
          button.setAttribute("part", "button");
          button.innerHTML = `${icon}<span class="t"></span>`;
          button.addEventListener("click", () => {
            if (!this.#busy) void this.#save(format, "user").catch(() => undefined);
          });
          return button;
        }),
      );
    }
    for (const button of group.querySelectorAll<HTMLButtonElement>("button")) (button.querySelector(".t") as HTMLElement).textContent = words[button.dataset.v as Format];
  }

  async #save(format: Format, reason: "user" | "api"): Promise<SaveDetail> {
    const words = wordsFor(languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang), this.#words);
    const say = (text: string): void => {
      const status = this.#root.querySelector(".vh");
      if (status !== null) status.textContent = text;
      globalThis.clearTimeout(this.#clear);
      this.#clear = globalThis.setTimeout(() => status !== null && (status.textContent = ""), 3000);
    };
    try {
      if (this.#target === undefined) this.#resolveTarget();
      if (this.#target === undefined) throw new Error("there is nothing to save: `for` names no element");
      if (this.#busy) throw new Error("a picture is already being made");
      this.#busy = true;
      this.#busyButtons(true);
      const scale = Number(this.getAttribute("scale"));
      const background = this.getAttribute("background") ?? undefined;
      const picture = await renderImage(this.#target, {
        format,
        scale: Number.isFinite(scale) && scale > 0 ? scale : 2,
        ...(background !== undefined ? { background } : {}),
        inlineStyles: !this.hasAttribute("no-inline-styles"),
      });
      const filename = filenameFor(this.getAttribute("name"), format);
      if (!this.hasAttribute("manual")) downloadBlob(picture.blob, filename);
      const detail: SaveDetail = { ...picture, filename, reason };
      say(words.saved);
      this.dispatchEvent(new CustomEvent<SaveDetail>(EVENT, { detail, bubbles: true, composed: true }));
      return detail;
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
      say(words.failed);
      this.dispatchEvent(new CustomEvent<SaveErrorDetail>(ERROR_EVENT, { detail: { format, error, reason }, bubbles: true, composed: true }));
      throw error;
    } finally {
      if (this.#busy) {
        this.#busy = false;
        this.#busyButtons(false);
      }
    }
  }

  #busyButtons(busy: boolean): void {
    for (const button of this.#root.querySelectorAll("button")) {
      if (busy) button.setAttribute("aria-busy", "true");
      else button.removeAttribute("aria-busy");
    }
  }
}
