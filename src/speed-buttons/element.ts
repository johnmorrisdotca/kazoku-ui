// <kazoku-speed-buttons>: one button for each speed (0.5×, 1×, 2× by default), no menu. It is the one speed control of the family: the view controls use it for Auto-turn,
// and a solar system, a replay bar or a race takes it with the steps it needs. The choice is the `value` (an attribute, a property and, if asked, the address) and the
// page hears every change as a `kazoku-speedchange` event. It moves nothing itself: the page applies the number.
import { applyParams, createAddressWriter, readParam } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import { EVENT, TAG } from "./index.ts";
import { DEFAULT_STEPS, DEFAULT_UNIT, nearestStep, parseSpeed, parseSteps, SPEED_ADDRESS_KEY, speedText, startStep, stepFrom } from "./steps.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type Language, type SpeedWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-speedchange` event carries in `detail`. */
export interface SpeedChangeDetail {
  /** The speed now: one of `steps`. */
  value: number;
  steps: readonly number[];
  /** `init` (once, when it comes up), `user` (a button or `step()`) or `set` (the `value` property or attribute). */
  reason: "init" | "user" | "set";
}

/**
 * Attributes: `steps` (the speeds, `0.5 1 2` by default; any numbers, `1 10 100`, `0 1 3600 86400 -3600`), `value` (the one that is on; the start, and it follows the reader's choice),
 * `unit` (the word after each number, `×` by default), `label` (the group's name, shown before the buttons and read by a screen reader; "Speed" or 速さ by default), `no-label`
 * (hide the name from the eye), `address` (keep the choice in the address under `address-key`, `speed` by default; the start is left off it), `lang` (`en` or `ja`), `theme` (`light` or `dark`).
 */
export class SpeedButtonsElement extends HTMLElement {
  static observedAttributes = ["steps", "value", "unit", "label", "lang"];

  #root: ShadowRoot;
  #steps: number[] = [...DEFAULT_STEPS];
  #value = 1;
  #start = 1;
  #ready = false;
  #styled = false;
  #words: Partial<SpeedWords> = {};
  #writer = createAddressWriter({ delay: 0 });
  #stop: (() => void) | undefined;
  #reflecting = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The speed now. Setting it to a speed that is not a step takes the nearest step. */
  get value(): number {
    return this.#value;
  }

  set value(next: number | string) {
    const value = typeof next === "number" ? next : Number(next);
    if (Number.isFinite(value)) this.#choose(nearestStep(value, this.#steps) ?? this.#value, "set");
  }

  /** The speeds the buttons stand for. Setting a list (or a text such as `1 10 100`) draws them again, keeping the nearest to the speed now. */
  get steps(): readonly number[] {
    return this.#steps;
  }

  set steps(list: readonly number[] | string) {
    this.#aim(typeof list === "string" ? parseSteps(list) : parseSteps(list.join(" ")));
  }

  /** Your own label over the language's, for example `{ group: "Time" }`. */
  set words(words: Partial<SpeedWords>) {
    this.#words = words;
    this.#render();
  }

  /** One press of a single button that cycles: the next speed (`direction` 1) or the one before (-1), going round at the ends. */
  step(direction: 1 | -1 = 1): void {
    this.#choose(stepFrom(this.#value, this.#steps, direction), "user");
  }

  connectedCallback(): void {
    if (!this.#styled) {
      // Inside another part's shadow root (the view controls) it carries no nonce of its own: the part it sits in has the page's.
      const outer = this.getRootNode();
      adoptStyles(this.#root, STYLES, this.nonce || (outer instanceof ShadowRoot ? (outer.host as HTMLElement).nonce : "") || "");
      this.#styled = true;
    }
    this.#stop = watchScheme(this);
    this.#steps = parseSteps(this.getAttribute("steps"));
    this.#start = parseSpeed(this.getAttribute("value"), this.#steps) ?? startStep(this.#steps);
    const kept = this.hasAttribute("address") ? parseSpeed(readParam(this.#key(), globalThis.location?.search ?? ""), this.#steps) : undefined;
    this.#value = kept ?? this.#start;
    this.#render();
    this.#ready = true;
    // Said once the page has had its turn to listen; `value` can be read at any time.
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
    if (!this.#ready || this.#reflecting) return;
    if (name === "steps") this.#aim(parseSteps(value));
    else if (name === "value") {
      const next = parseSpeed(value, this.#steps);
      if (next !== undefined) this.#choose(next, "set");
    } else this.#render();
  }

  #key(): string {
    return this.getAttribute("address-key") || SPEED_ADDRESS_KEY;
  }

  #aim(steps: number[]): void {
    this.#steps = steps;
    this.#start = nearestStep(this.#start, steps) ?? startStep(steps);
    const kept = nearestStep(this.#value, steps) ?? this.#start;
    if (kept !== this.#value) this.#value = kept;
    this.#render();
    if (kept !== this.#value) this.#dispatch("set");
  }

  #choose(next: number, reason: "user" | "set"): void {
    if (next === this.#value) return;
    this.#value = next;
    this.#render();
    this.#reflect();
    if (this.hasAttribute("address")) {
      const key = this.#key();
      this.#writer.write((search) => applyParams(search, { [key]: next }, { [key]: String(this.#start) }));
    }
    this.#dispatch(reason);
  }

  /** The `value` attribute follows the reader's choice, so the page and a framework that watches attributes see it. */
  #reflect(): void {
    if (this.getAttribute("value") === String(this.#value)) return;
    this.#reflecting = true;
    this.setAttribute("value", String(this.#value));
    this.#reflecting = false;
  }

  #render(): void {
    const language: Language = languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
    const group = this.getAttribute("label") || wordsFor(language, this.#words).group;
    const unit = this.getAttribute("unit") ?? DEFAULT_UNIT;
    const doc = this.ownerDocument;
    let box = this.#root.querySelector<HTMLElement>(".group");
    if (box === null) {
      const label = doc.createElement("span");
      label.className = "lbl";
      label.setAttribute("part", "label");
      label.setAttribute("aria-hidden", "true");
      box = doc.createElement("div");
      box.className = "group";
      box.setAttribute("part", "group");
      box.setAttribute("role", "group");
      this.#root.append(label, box);
      box.addEventListener("click", (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>("button[data-v]");
        if (button !== null) this.#choose(Number(button.dataset["v"]), "user");
      });
    }
    const label = this.#root.querySelector<HTMLElement>(".lbl");
    if (label !== null && label.textContent !== group) label.textContent = group;
    box.setAttribute("aria-label", group);
    const stale = [...box.querySelectorAll<HTMLButtonElement>("button")];
    const same = stale.length === this.#steps.length && stale.every((button, i) => button.dataset["v"] === String(this.#steps[i]));
    if (!same) {
      box.replaceChildren(
        ...this.#steps.map((step) => {
          const button = doc.createElement("button");
          button.type = "button";
          button.dataset["v"] = String(step);
          button.setAttribute("part", "button");
          return button;
        }),
      );
    }
    for (const button of box.querySelectorAll<HTMLButtonElement>("button")) {
      const step = Number(button.dataset["v"]);
      const text = speedText(step, unit);
      if (button.textContent !== text) button.textContent = text;
      button.setAttribute("aria-pressed", String(step === this.#value));
    }
  }

  #dispatch(reason: SpeedChangeDetail["reason"]): void {
    this.dispatchEvent(new CustomEvent<SpeedChangeDetail>(EVENT, { detail: { value: this.#value, steps: this.#steps, reason }, bubbles: true, composed: true }));
  }
}
