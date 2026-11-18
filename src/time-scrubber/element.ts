// <kazoku-time-scrubber>: a date slider that goes from years down to days, and a date field. It moves nothing itself; the page hears `kazoku-timechange` and applies it.
// The slider's track shows the whole range at the Year scale, the current year at the Month scale and the current month at the Day scale, so a finger can reach a day.
// Arrow keys step one of the scale, Page Up and Page Down one of the next coarser, Home and End go to the ends. A pointer, a finger or a pen drags; nothing needs hover.
import { applyParams, createAddressWriter, readParam } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { followLanguage } from "../shared/language.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { applyMove, clamp, DATE_KEY, DEFAULT_FROM, DEFAULT_TO, fieldText, fractionOf, isoDate, keyMove, momentAt, parseDate, SCALES, scaleOf, ticksFor, valueText, windowFor, type Scale } from "./scale.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type Language, type ScrubberWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-timechange` event carries in `detail`. */
export interface TimeChangeDetail {
  /** The moment, in milliseconds since 1970 (UTC midnight of the day). */
  value: number;
  /** The same day as `2026-11-17`. */
  date: string;
  scale: Scale;
  /** `init` (once, when it comes up), `user` (the slider, a key, a scale button or the field) or `set` (a property or attribute). */
  reason: "init" | "user" | "set";
}

/**
 * Attributes: `from` and `to` (the range, `YYYY-MM-DD`; 1900-01-01 to 2100-12-31 by default), `value` (the day), `scale` (`year`, `month` or `day`),
 * `no-field` (the slider alone), `address` and `address-key` (`date` by default; the scale is kept under `<key>-scale`), `label`, `lang`, `theme`.
 * Properties: `value` (milliseconds), `scale`, `words`. The part draws nothing of the page's scene.
 */
export class TimeScrubberElement extends HTMLElement {
  static observedAttributes = ["from", "to", "value", "scale", "no-field", "lang", "label"];

  #root: ShadowRoot;
  #value = 0;
  #scale: Scale = "year";
  #ready = false;
  #styled = false;
  #words: Partial<ScrubberWords> = {};
  #writer = createAddressWriter({ delay: 0 });
  #stop: (() => void) | undefined;
  #drag: number | undefined;
  #invalid = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  get #from(): number {
    return parseDate(this.getAttribute("from")) ?? parseDate(DEFAULT_FROM)!;
  }

  get #to(): number {
    return Math.max(parseDate(this.getAttribute("to")) ?? parseDate(DEFAULT_TO)!, this.#from);
  }

  /** The day, in milliseconds since 1970 (UTC). Setting it keeps it inside the range and reports `set`. */
  get value(): number {
    return this.#value;
  }

  set value(next: number) {
    this.#move(next, this.#scale, "set");
  }

  /** `year`, `month` or `day`. */
  get scale(): Scale {
    return this.#scale;
  }

  set scale(next: Scale) {
    this.#move(this.#value, scaleOf(next), "set");
  }

  /** Your own labels over the language's. */
  set words(words: Partial<ScrubberWords>) {
    this.#words = words;
    this.#paint();
  }

  connectedCallback(): void {
    if (!this.#styled) {
      const outer = this.getRootNode();
      adoptStyles(this.#root, STYLES, this.nonce || (outer instanceof ShadowRoot ? (outer.host as HTMLElement).nonce : "") || "");
      this.#styled = true;
    }
    const stopScheme = watchScheme(this);
    const stopLanguage = followLanguage(this, () => this.#paint());
    this.#stop = (): void => {
      stopScheme();
      stopLanguage();
    };
    const keys = this.#keys();
    const fromAddress = this.hasAttribute("address");
    const asked = (fromAddress ? parseDate(readParam(keys.date)) : null) ?? parseDate(this.getAttribute("value")) ?? this.#from;
    this.#scale = scaleOf((fromAddress ? readParam(keys.scale) : null) ?? this.getAttribute("scale"));
    this.#value = clamp(asked, this.#from, this.#to);
    this.#render();
    this.#ready = true;
    queueMicrotask(() => {
      if (this.isConnected) this.#dispatch("init");
    });
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#writer.cancel();
    this.#ready = false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready) return;
    if (name === "value") {
      const next = parseDate(value);
      if (next !== null) this.#move(next, this.#scale, "set");
    } else if (name === "scale") this.#move(this.#value, scaleOf(value), "set");
    else if (name === "from" || name === "to") this.#move(this.#value, this.#scale, "set");
    else if (name === "no-field") this.#render();
    else this.#paint();
  }

  #keys(): { date: string; scale: string } {
    const key = this.getAttribute("address-key") || DATE_KEY;
    return { date: key, scale: `${key}-scale` };
  }

  /** Moves to a day and a scale, keeps both inside what is allowed, and reports a change. */
  #move(next: number, scale: Scale, reason: "user" | "set"): void {
    const value = clamp(Number.isFinite(next) ? next : this.#value, this.#from, this.#to);
    const changed = value !== this.#value || scale !== this.#scale;
    this.#value = value;
    this.#scale = scale;
    this.#invalid = false;
    this.#paint();
    if (!changed) return;
    this.#write();
    this.#dispatch(reason);
  }

  #write(): void {
    if (!this.hasAttribute("address")) return;
    const keys = this.#keys();
    this.#writer.write((search) => applyParams(search, { [keys.date]: isoDate(this.#value), [keys.scale]: this.#scale === "year" ? null : this.#scale }));
  }

  #language(): Language {
    return languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
  }

  #render(): void {
    const doc = this.ownerDocument;
    const wrap = doc.createElement("div");
    wrap.className = "wrap";
    wrap.setAttribute("role", "group");
    const slider = doc.createElement("div");
    slider.className = "slider";
    const track = doc.createElement("div");
    track.className = "track";
    track.tabIndex = 0;
    track.setAttribute("role", "slider");
    track.setAttribute("part", "slider");
    track.append(this.#el("span", "fill"), this.#el("span", "thumb"));
    track.addEventListener("keydown", (event) => this.#onKey(event));
    track.addEventListener("pointerdown", (event) => this.#onDown(event, track));
    track.addEventListener("pointermove", (event) => this.#onDrag(event, track));
    track.addEventListener("pointerup", (event) => this.#onUp(event, track));
    track.addEventListener("pointercancel", (event) => this.#onUp(event, track));
    track.addEventListener("lostpointercapture", () => { this.#drag = undefined; track.removeAttribute("data-drag"); });
    slider.append(track, this.#el("div", "ticks"));
    const scales = doc.createElement("div");
    scales.className = "scales";
    scales.setAttribute("role", "group");
    for (const scale of SCALES) {
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.scale = scale;
      button.setAttribute("part", `scale-${scale}`);
      button.addEventListener("click", () => this.#move(this.#value, scale, "user"));
      scales.append(button);
    }
    wrap.append(slider, scales);
    if (!this.hasAttribute("no-field")) {
      const field = doc.createElement("input");
      field.className = "field";
      field.type = "text";
      field.inputMode = "numeric";
      field.autocomplete = "off";
      field.spellcheck = false;
      field.setAttribute("part", "field");
      field.addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.#commit(field);
        else if (event.key === "Escape") {
          this.#invalid = false;
          this.#paint();
        }
      });
      field.addEventListener("change", () => this.#commit(field));
      const msg = this.#el("p", "msg");
      msg.setAttribute("role", "status");
      msg.id = "msg";
      wrap.append(field, msg);
    }
    this.#root.replaceChildren(wrap);
    this.#paint();
  }

  #el(tag: string, className: string): HTMLElement {
    const node = this.ownerDocument.createElement(tag);
    node.className = className;
    return node;
  }

  #commit(field: HTMLInputElement): void {
    const next = parseDate(field.value);
    if (next === null) {
      this.#invalid = true;
      this.#paint(false);
      return;
    }
    this.#move(next, this.#scale, "user");
    field.value = fieldText(this.#value, this.#language());
  }

  #onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const move = keyMove(event.key, this.#scale);
    if (!move) return;
    event.preventDefault();
    this.#move(applyMove(this.#value, move, this.#from, this.#to), this.#scale, "user");
  }

  #at(event: PointerEvent, track: HTMLElement): number {
    const box = track.getBoundingClientRect();
    const fraction = box.width > 0 ? (event.clientX - box.left) / box.width : 0;
    return momentAt(fraction, this.#scale, this.#value, this.#from, this.#to);
  }

  #onDown(event: PointerEvent, track: HTMLElement): void {
    if (event.button > 0 && event.pointerType === "mouse") return;
    this.#drag = event.pointerId;
    try {
      track.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks cannot be captured; the drag still follows the events it gets.
    }
    track.setAttribute("data-drag", "");
    track.focus({ preventScroll: true });
    this.#move(this.#at(event, track), this.#scale, "user");
  }

  #onDrag(event: PointerEvent, track: HTMLElement): void {
    if (this.#drag !== event.pointerId) return;
    this.#move(this.#at(event, track), this.#scale, "user");
  }

  #onUp(event: PointerEvent, track: HTMLElement): void {
    if (this.#drag !== event.pointerId) return;
    this.#drag = undefined;
    track.removeAttribute("data-drag");
    try {
      track.releasePointerCapture?.(event.pointerId);
    } catch {
      // Already released.
    }
  }

  /** Draws the state. `resetField` is false while a bad entry is being shown, so the reader's text stays to be fixed. */
  #paint(resetField = true): void {
    const language = this.#language();
    const words = wordsFor(language, this.#words);
    const wrap = this.#root.querySelector(".wrap");
    if (!wrap) return;
    wrap.setAttribute("aria-label", this.getAttribute("label") || words.group);
    const window = windowFor(this.#value, this.#scale, this.#from, this.#to);
    const fraction = fractionOf(this.#value, window);
    const track = wrap.querySelector<HTMLElement>(".track")!;
    track.setAttribute("aria-label", words.slider);
    track.setAttribute("aria-valuemin", String(this.#from));
    track.setAttribute("aria-valuemax", String(this.#to));
    track.setAttribute("aria-valuenow", String(this.#value));
    track.setAttribute("aria-valuetext", valueText(this.#value, this.#scale, language));
    const pct = `${(fraction * 100).toFixed(3)}%`;
    wrap.querySelector<HTMLElement>(".thumb")!.style.left = pct;
    wrap.querySelector<HTMLElement>(".fill")!.style.width = pct;
    wrap.querySelector(".ticks")!.replaceChildren(
      ...ticksFor(window, this.#scale, language).map((tick) => {
        const span = this.ownerDocument.createElement("span");
        span.textContent = tick.label;
        span.style.left = `${(tick.fraction * 100).toFixed(3)}%`;
        span.setAttribute("aria-hidden", "true");
        return span;
      }),
    );
    wrap.querySelector(".scales")!.setAttribute("aria-label", words.scales);
    for (const button of wrap.querySelectorAll<HTMLButtonElement>("button[data-scale]")) {
      const scale = button.dataset.scale as Scale;
      button.textContent = words[scale];
      button.setAttribute("aria-pressed", String(scale === this.#scale));
    }
    const field = wrap.querySelector<HTMLInputElement>(".field");
    if (field) {
      field.setAttribute("aria-label", words.field);
      if (resetField) field.value = fieldText(this.#value, language);
      field.setAttribute("aria-invalid", String(this.#invalid));
      if (this.#invalid) field.setAttribute("aria-describedby", "msg");
      else field.removeAttribute("aria-describedby");
      const msg = wrap.querySelector<HTMLElement>(".msg")!;
      msg.textContent = this.#invalid ? words.invalid : "";
      msg.hidden = !this.#invalid;
    }
  }

  #dispatch(reason: TimeChangeDetail["reason"]): void {
    this.dispatchEvent(new CustomEvent<TimeChangeDetail>(EVENT, { detail: { value: this.#value, date: isoDate(this.#value), scale: this.#scale, reason }, bubbles: true, composed: true }));
  }
}
