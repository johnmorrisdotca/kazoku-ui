// <kazoku-replay-bar>: play, pause, back to the start, repeat, and the family's speed buttons, in one row. It moves nothing itself.
// The page hears `kazoku-replay` and applies it, and hears `kazoku-speedchange` from the speed buttons. Reduced motion holds back what starts by itself; the reader's own press on Play always works.
import { applyParams, createAddressWriter, readParam } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { watchScheme } from "../shared/scheme.ts";
import "../speed-buttons/define.ts";
import type { SpeedButtonsElement } from "../speed-buttons/element.ts";
import { EVENT, TAG } from "./index.ts";
import { addressKeys, DEFAULT_STEPS, flagOn, SPEED_KEY } from "./state.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type Language, type ReplayWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-replay` event carries in `detail`. */
export interface ReplayDetail {
  /** What was pressed. `play` and `pause` are the one button. */
  action: "play" | "pause" | "start" | "repeat";
  playing: boolean;
  repeat: boolean;
  /** `init` (once, when it comes up), `user` (a button) or `set` (a property or attribute). */
  reason: "init" | "user" | "set";
}

/**
 * Attributes: `playing` (present, or `on`, while it plays), `repeat` (the loop), `no-repeat` (no Repeat button, and a repeat is never reported), `back-label` (the back-to-the-start button's own words), `steps` and `speed` (handed to the speed buttons),
 * `address` (keep play, repeat and the speed in the address), `address-keys` (`play:p,repeat:r`), `speed-key` (the speed's own key, `replay-speed` by default),
 * `user-play` (kept for older pages: it changes nothing now, because a reader who asked for reduced motion always gets a Play button that is ready and works), `lang`, `theme`.
 * Reduced motion gives a still view with Play ready: `playing`, an address that says `play=on` and a property never start it, and only the reader's own press does.
 */
export class ReplayBarElement extends HTMLElement {
  static observedAttributes = ["playing", "repeat", "no-repeat", "back-label", "steps", "speed", "lang", "label", "user-play"];

  #root: ShadowRoot;
  #playing = false;
  #repeat = false;
  #ready = false;
  #styled = false;
  #words: Partial<ReplayWords> = {};
  #writer = createAddressWriter({ delay: 0 });
  #stop: (() => void) | undefined;
  #motion: MediaQueryList | undefined;
  #reflecting = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** Whether playback is going. Reduced motion keeps this false until the reader presses Play. */
  get playing(): boolean {
    return this.#playing;
  }

  set playing(next: boolean) {
    this.#play(next, "set");
  }

  /** Whether the page should loop when it reaches the end. */
  get repeat(): boolean {
    return this.#repeat;
  }

  set repeat(next: boolean) {
    this.#loop(next, "set");
  }

  /** Your own labels over the language's. */
  set words(words: Partial<ReplayWords>) {
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
    this.#motion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.#motion?.addEventListener?.("change", this.#onMotion);
    const keys = addressKeys(this.getAttribute("address-keys"));
    const askedPlay = this.hasAttribute("address") ? flagOn(readParam(keys.play)) : this.hasAttribute("playing") && this.getAttribute("playing") !== "off";
    const askedRepeat = this.hasAttribute("no-repeat") ? false : this.hasAttribute("address") ? flagOn(readParam(keys.repeat)) : this.hasAttribute("repeat") && this.getAttribute("repeat") !== "off";
    this.#playing = askedPlay && !this.#reduced();
    this.#repeat = askedRepeat;
    this.#reflect("playing", this.#playing);
    this.#reflect("repeat", this.#repeat);
    this.#render();
    this.#ready = true;
    queueMicrotask(() => {
      if (this.isConnected) this.#dispatch(this.#playing ? "play" : "pause", "init");
    });
  }

  disconnectedCallback(): void {
    this.#stop?.();
    this.#stop = undefined;
    this.#motion?.removeEventListener?.("change", this.#onMotion);
    this.#writer.cancel();
    this.#ready = false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready || this.#reflecting) return;
    if (name === "playing") this.#play(value !== "off" && value !== null, "set");
    else if (name === "repeat") this.#loop(value !== "off" && value !== null, "set");
    else if (name === "no-repeat") {
      // A loop that was already on is dropped quietly, so a repeat is never reported once the button is gone.
      if (this.hasAttribute("no-repeat") && this.#repeat) {
        this.#repeat = false;
        this.#reflect("repeat", false);
        this.#write();
      }
      this.#render();
    }
    else if (name === "steps" || name === "speed") this.#speeds();
    else this.#paint();
  }

  #reduced(): boolean {
    return this.#motion?.matches === true;
  }

  #onMotion = (): void => {
    if (this.#reduced() && this.#playing) this.#play(false, "set");
    else this.#paint();
  };

  /** Reduced motion stops anything that starts by itself; the reader's own press on Play is always honoured (`user-play` is kept for older pages and changes nothing). */
  #mayPlay(reason: "user" | "set"): boolean {
    return !this.#reduced() || reason === "user";
  }

  #play(next: boolean, reason: "user" | "set"): void {
    const on = next && this.#mayPlay(reason);
    if (on === this.#playing) {
      this.#paint();
      return;
    }
    this.#playing = on;
    this.#reflect("playing", on);
    this.#paint();
    this.#write();
    this.#dispatch(on ? "play" : "pause", reason);
  }

  #loop(next: boolean, reason: "user" | "set"): void {
    if (this.hasAttribute("no-repeat")) return;
    if (next === this.#repeat) return;
    this.#repeat = next;
    this.#reflect("repeat", next);
    this.#paint();
    this.#write();
    this.#dispatch("repeat", reason);
  }

  #reflect(name: "playing" | "repeat", on: boolean): void {
    const have = this.hasAttribute(name) && this.getAttribute(name) !== "off";
    if (have === on) return;
    this.#reflecting = true;
    if (on) this.setAttribute(name, "");
    else this.removeAttribute(name);
    this.#reflecting = false;
  }

  #write(): void {
    if (!this.hasAttribute("address")) return;
    const keys = addressKeys(this.getAttribute("address-keys"));
    this.#writer.write((search) => applyParams(search, { [keys.play]: this.#playing ? "on" : null, [keys.repeat]: this.#repeat ? "on" : null }));
  }

  #speeds(): void {
    const speeds = this.#root.querySelector("kazoku-speed-buttons") as SpeedButtonsElement | null;
    if (!speeds) return;
    speeds.setAttribute("steps", this.getAttribute("steps") || DEFAULT_STEPS);
    const speed = this.getAttribute("speed");
    if (speed) speeds.setAttribute("value", speed);
  }

  #render(): void {
    const doc = this.ownerDocument;
    const row = doc.createElement("div");
    row.className = "row";
    row.setAttribute("role", "group");
    for (const act of ["play", "start", "repeat"] as const) {
      if (act === "repeat" && this.hasAttribute("no-repeat")) continue;
      const button = doc.createElement("button");
      button.type = "button";
      button.dataset.act = act;
      button.setAttribute("part", act);
      button.addEventListener("click", () => this.#press(act));
      row.append(button);
    }
    const speeds = doc.createElement("kazoku-speed-buttons") as SpeedButtonsElement;
    speeds.setAttribute("no-label", "");
    speeds.setAttribute("steps", this.getAttribute("steps") || DEFAULT_STEPS);
    if (this.hasAttribute("address")) {
      speeds.setAttribute("address", "");
      speeds.setAttribute("address-key", this.getAttribute("speed-key") || SPEED_KEY);
    }
    const speed = this.getAttribute("speed");
    if (speed) speeds.setAttribute("value", speed);
    row.append(speeds);
    this.#root.replaceChildren(row);
    this.#paint();
  }

  #press(act: "play" | "start" | "repeat"): void {
    if (act === "play") this.#play(!this.#playing, "user");
    else if (act === "repeat") this.#loop(!this.#repeat, "user");
    else {
      if (this.#playing) {
        this.#playing = false;
        this.#reflect("playing", false);
        this.#write();
      }
      this.#paint();
      this.#dispatch("start", "user");
    }
  }

  #paint(): void {
    const language: Language = languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
    const words = wordsFor(language, this.#words);
    const row = this.#root.querySelector(".row");
    if (!row) return;
    row.setAttribute("aria-label", this.getAttribute("label") || words.group);
    const play = row.querySelector<HTMLButtonElement>('[data-act="play"]');
    const start = row.querySelector<HTMLButtonElement>('[data-act="start"]');
    const repeat = row.querySelector<HTMLButtonElement>('[data-act="repeat"]');
    if (play) {
      play.textContent = this.#playing ? words.pause : words.play;
      play.setAttribute("aria-pressed", String(this.#playing));
      play.disabled = false;
    }
    if (start) start.textContent = this.getAttribute("back-label") || words.start;
    if (repeat) {
      repeat.textContent = words.repeat;
      repeat.setAttribute("aria-pressed", String(this.#repeat));
    }
    const speeds = row.querySelector("kazoku-speed-buttons");
    speeds?.setAttribute("lang", language);
  }

  #dispatch(action: ReplayDetail["action"], reason: ReplayDetail["reason"]): void {
    this.dispatchEvent(new CustomEvent<ReplayDetail>(EVENT, { detail: { action, playing: this.#playing, repeat: this.#repeat, reason }, bubbles: true, composed: true }));
  }
}
