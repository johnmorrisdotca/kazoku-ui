// <kazoku-view-controls>: the view controls as a framework-free custom element. It never draws the scene. It binds the pointer, pinch, wheel and keys
// to the element named by `for`, and tells the page what the view is now with a `kazoku-viewchange` event; the page applies it to its canvas, WebGL, SVG or CSS 3D.
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "./address.ts";
import { createViewController, DEFAULT_IGNORE, type ChangeInfo, type ViewController, type ViewState } from "./controller.ts";
import { EVENT, TAG } from "./index.ts";
import { ZOOM_STEP, ZOOMED } from "./math.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type Language, type ViewWords, wordsFor } from "./words.ts";

export { EVENT, TAG };

/** What the `kazoku-viewchange` event carries in `detail`. */
export interface ViewChangeDetail extends ViewState {
  final: boolean;
  reason: string;
}

const icon = (path: string, cls = ""): string => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}"><path d="${path}"/></svg>`;
const ICON = {
  play: icon("M8 5v14l11-7z", "i-play"),
  pause: icon("M7 5h4v14H7zM13 5h4v14h-4z", "i-pause"),
  minus: icon("M5 11h14v2H5z"),
  plus: icon("M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"),
  left: icon("M15 5l-9 7 9 7z"),
  right: icon("M9 5l9 7-9 7z"),
  up: icon("M5 15l7-9 7 9z"),
  down: icon("M5 9l7 9 7-9z"),
};

const HTML = `
<div class="bar" part="bar" role="group">
  <div class="field angle" part="field angle"><label data-w="angle" for="yaw"></label><input id="yaw" type="range" min="-180" max="180" step="1" value="0" part="slider" /><output for="yaw" data-o="yaw">0°</output></div>
  <div class="field tilt" part="field tilt"><label data-w="tilt" for="tilt"></label><input id="tilt" type="range" min="-30" max="30" step="1" value="0" part="slider" /><output for="tilt" data-o="tilt">0°</output></div>
  <button type="button" class="play" data-b="play" aria-pressed="false" part="button">${ICON.play}${ICON.pause}<span class="text" data-w="autoTurn"></span></button>
  <button type="button" class="front" data-b="front" part="button"><span data-w="front"></span></button>
  <div class="group zoom" role="group" data-g="zoom">
    <button type="button" data-b="out" part="button">${ICON.minus}</button>
    <button type="button" class="two" data-b="two" part="button">2×</button>
    <button type="button" data-b="in" part="button">${ICON.plus}</button>
    <button type="button" data-b="fit" part="button"><span data-w="fit"></span></button>
  </div>
  <div class="group pan" role="group" data-g="pan" hidden>
    <button type="button" data-b="left" part="button">${ICON.left}</button>
    <button type="button" data-b="up" part="button">${ICON.up}</button>
    <button type="button" data-b="down" part="button">${ICON.down}</button>
    <button type="button" data-b="right" part="button">${ICON.right}</button>
    <div class="group drag" role="group" data-g="drag">
      <button type="button" data-b="move" aria-pressed="true" part="button"><span data-w="dragMove"></span></button>
      <button type="button" data-b="turn" aria-pressed="false" part="button"><span data-w="dragTurn"></span></button>
    </div>
  </div>
</div>`;

/**
 * Attributes: `for` (the id of the view to bind), `lang` (en or ja; else the page's), `yaw`, `tilt` (the starting view), `zoom` (`fit`, the default, or a scale where 1
 * is the scene's natural size), `fit-scale` (the page's scale at Fit: what zoom 1 means), `ignore` (a selector for what inside the view a pointer press leaves alone;
 * buttons, links and form controls by default), `autoplay` (turn by itself from the start, unless the reader prefers reduced motion), `speed` (degrees a second),
 * `flat` (the view cannot turn), `tilt-max`, `zoom-min`, `zoom-max`, `address` (keep the choices in the page's address), `address-keys` (`yaw:a,tilt:b`), `theme` (light
 * or dark), `overlay` (sit over the bottom of a positioned parent).
 */
export class ViewControlsElement extends HTMLElement {
  static observedAttributes = ["for", "lang", "yaw", "tilt", "zoom", "fit-scale", "ignore", "speed", "flat", "tilt-max", "zoom-min", "zoom-max", "address-keys"];

  #root: ShadowRoot;
  #controller: ViewController | undefined;
  #view: HTMLElement | undefined;
  #unbind: (() => void) | undefined;
  #words: Partial<ViewWords> = {};
  #ready = false;
  #sliderHeld = 0;
  #saveTimer: ReturnType<typeof setTimeout> | 0 = 0;
  #keys = DEFAULT_KEYS;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  /** The controller behind the element: the same methods and state a page that wants no element would use. */
  get controller(): ViewController {
    return this.#ensure();
  }

  /** The view now (a copy). */
  get state(): ViewState {
    return { ...this.#ensure().state };
  }

  get view(): HTMLElement | undefined {
    return this.#view;
  }

  /** The element the hands bind to, in place of `for`. */
  set view(element: HTMLElement | undefined) {
    this.#bindTo(element);
  }

  /** Your own labels over the language's, for example `{ front: "Home" }`. */
  set words(words: Partial<ViewWords>) {
    this.#words = words;
    this.#label();
  }

  play(): void {
    this.#ensure().play();
  }

  pause(): void {
    this.#ensure().pause();
  }

  front(): void {
    this.#ensure().front();
  }

  fit(): void {
    this.#ensure().fit();
  }

  set(next: Partial<ViewState>): void {
    this.#ensure().set(next);
  }

  /** What zoom 1 means to the page: the scene is drawn at `state.zoom * fitScale`. */
  get fitScale(): number {
    return this.#ensure().fitScale;
  }

  setFitScale(scale: number): void {
    this.#ensure().setFitScale(scale);
  }

  connectedCallback(): void {
    const c = this.#ensure();
    if (this.#root.querySelector(".bar") === null) this.#build();
    this.#keys = parseKeys(this.getAttribute("address-keys"));
    this.#limits();
    const start: Partial<ViewState> = {};
    for (const key of ["yaw", "tilt"] as const) {
      const value = Number(this.getAttribute(key));
      if (this.hasAttribute(key) && Number.isFinite(value)) start[key] = value;
    }
    if (this.hasAttribute("address")) Object.assign(start, parseAddress(globalThis.location?.search ?? "", this.#keys, c.limits));
    c.turnable = !this.hasAttribute("flat");
    c.speed = Number(this.getAttribute("speed")) || 30;
    c.ignore = this.getAttribute("ignore") ?? DEFAULT_IGNORE;
    const fitScale = Number(this.getAttribute("fit-scale"));
    if (this.hasAttribute("fit-scale")) c.setFitScale(fitScale);
    c.setStartZoom(this.#startZoom());
    c.set(start, true, "init");
    this.#label();
    this.#resolveView();
    if (this.#view === undefined && this.ownerDocument.readyState === "loading") this.ownerDocument.addEventListener("DOMContentLoaded", () => this.#resolveView(), { once: true });
    this.#ready = true;
    this.#show();
    // Said once the page has had its turn to listen; a page can also read `state` at any time.
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#dispatch(c.state, { final: true, reason: "init" });
      if (this.hasAttribute("autoplay") && !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) c.play();
    });
  }

  disconnectedCallback(): void {
    this.#unbind?.();
    this.#unbind = undefined;
    this.#controller?.destroy();
    this.#controller = undefined;
    this.#view = undefined;
    this.#ready = false;
    if (this.#saveTimer !== 0) globalThis.clearTimeout(this.#saveTimer);
    this.#saveTimer = 0;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready) return;
    const c = this.#ensure();
    if (name === "for") this.#resolveView();
    else if (name === "lang") this.#label();
    else if (name === "yaw" || name === "tilt") {
      if (value !== null && Number.isFinite(Number(value))) c.set({ [name]: Number(value) });
    } else if (name === "zoom") c.setStartZoom(this.#startZoom());
    else if (name === "fit-scale") c.setFitScale(Number(value));
    else if (name === "ignore") c.ignore = value ?? DEFAULT_IGNORE;
    else if (name === "speed") c.speed = Number(value) || 30;
    else if (name === "flat") {
      c.turnable = value === null;
      this.#show();
    } else if (name === "address-keys") this.#keys = parseKeys(value);
    else this.#limits();
  }

  #startZoom(): "fit" | number {
    const value = Number(this.getAttribute("zoom"));
    return this.hasAttribute("zoom") && Number.isFinite(value) && value > 0 ? value : "fit";
  }

  #ensure(): ViewController {
    if (this.#controller === undefined) {
      this.#controller = createViewController({ onChange: (state, info) => this.#changed(state, info) });
    }
    return this.#controller;
  }

  #build(): void {
    this.#root.innerHTML = `<style>${STYLES}</style>${HTML}`;
    const q = <T extends Element>(selector: string): T => this.#root.querySelector(selector) as T;
    const c = this.#ensure();
    const slider = (id: "yaw" | "tilt"): void => {
      const input = q<HTMLInputElement>(`#${id}`);
      // A hand on the angle slider holds the automatic turn still while it is down; the turn then goes on from where the hand left it.
      const hold = (): void => {
        this.#sliderHeld += 1;
        if (this.#sliderHeld === 1 && id === "yaw") c.holdTurn();
      };
      const free = (): void => {
        if (this.#sliderHeld === 0) return;
        this.#sliderHeld = 0;
        if (id === "yaw") c.releaseTurn();
      };
      input.addEventListener("pointerdown", () => hold());
      input.addEventListener("pointerup", free);
      input.addEventListener("pointercancel", free);
      input.addEventListener("input", () => c.set({ [id]: Number(input.value) }, false, "slider"));
      input.addEventListener("change", () => c.set({ [id]: Number(input.value) }, true, "slider"));
    };
    slider("yaw");
    slider("tilt");
    const on = (b: string, run: () => void): void => q<HTMLButtonElement>(`[data-b="${b}"]`).addEventListener("click", run);
    on("play", () => c.toggle());
    on("front", () => c.front());
    on("out", () => c.zoomBy(1 / ZOOM_STEP));
    on("in", () => c.zoomBy(ZOOM_STEP));
    on("two", () => c.zoomAt(2));
    on("fit", () => c.fit());
    on("left", () => c.panBy(-1, 0));
    on("right", () => c.panBy(1, 0));
    on("up", () => c.panBy(0, -1));
    on("down", () => c.panBy(0, 1));
    on("move", () => c.setDrag("move"));
    on("turn", () => c.setDrag("turn"));
  }

  #limits(): void {
    const c = this.#ensure();
    const read = (name: string, fallback: number): number => {
      const value = Number(this.getAttribute(name));
      return this.hasAttribute(name) && Number.isFinite(value) && value > 0 ? value : fallback;
    };
    c.limits.tiltMax = read("tilt-max", 30);
    c.limits.zoomMin = Math.min(1, read("zoom-min", 1));
    c.limits.zoomMax = Math.max(c.limits.zoomMin, read("zoom-max", 5));
    const tilt = this.#root.querySelector<HTMLInputElement>("#tilt");
    if (tilt !== null) {
      tilt.min = String(-c.limits.tiltMax);
      tilt.max = String(c.limits.tiltMax);
    }
  }

  #resolveView(): void {
    const id = this.getAttribute("for");
    if (id === null) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const found = root.getElementById?.(id) ?? this.ownerDocument.getElementById(id);
    if (found !== null && found !== undefined) this.#bindTo(found);
  }

  #bindTo(element: HTMLElement | undefined): void {
    if (element === this.#view) return;
    this.#unbind?.();
    this.#unbind = undefined;
    this.#view = element;
    if (element === undefined) return;
    // A view takes the keys only if it can be focused: a page that wants arrows and plus and minus on it gives it a tabindex.
    this.#unbind = this.#ensure().bind(element);
  }

  #label(): void {
    const language: Language = languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
    const words = wordsFor(language, this.#words);
    for (const node of this.#root.querySelectorAll<HTMLElement>("[data-w]")) node.textContent = words[node.dataset.w as keyof ViewWords];
    const set = (selector: string, label: string): void => this.#root.querySelector(selector)?.setAttribute("aria-label", label);
    set(".bar", words.group);
    set('[data-b="play"]', words.autoTurn);
    set('[data-b="out"]', words.zoomOut);
    set('[data-b="two"]', words.zoomTwo);
    set('[data-b="in"]', words.zoomIn);
    set('[data-g="zoom"]', words.zoom);
    set('[data-g="pan"]', words.pan);
    set('[data-g="drag"]', words.drag);
    set('[data-b="left"]', words.panLeft);
    set('[data-b="right"]', words.panRight);
    set('[data-b="up"]', words.panUp);
    set('[data-b="down"]', words.panDown);
    this.#root.querySelector(".bar")?.setAttribute("lang", language);
  }

  #show(): void {
    const c = this.#ensure();
    const s = c.state;
    const q = <T extends Element>(selector: string): T => this.#root.querySelector(selector) as T;
    const yaw = q<HTMLInputElement>("#yaw");
    const tilt = q<HTMLInputElement>("#tilt");
    yaw.value = String(Math.round(s.yaw));
    tilt.value = String(Math.round(s.tilt));
    q<HTMLOutputElement>('[data-o="yaw"]').value = `${Math.round(s.yaw)}°`;
    q<HTMLOutputElement>('[data-o="tilt"]').value = `${Math.round(s.tilt)}°`;
    q<HTMLButtonElement>('[data-b="play"]').setAttribute("aria-pressed", String(s.turning));
    q<HTMLButtonElement>('[data-b="out"]').disabled = s.zoom <= c.limits.zoomMin + 1e-6;
    q<HTMLButtonElement>('[data-b="in"]').disabled = s.zoom >= c.limits.zoomMax - 1e-6;
    q<HTMLElement>('[data-g="pan"]').hidden = s.zoom <= ZOOMED;
    q<HTMLButtonElement>('[data-b="move"]').setAttribute("aria-pressed", String(s.drag === "move"));
    q<HTMLButtonElement>('[data-b="turn"]').setAttribute("aria-pressed", String(s.drag === "turn"));
    // A flat view cannot turn: the angle, tilt, auto-turn and front are not shown, and a drag only moves.
    const flat = !c.turnable;
    for (const selector of [".angle", ".tilt", ".play", ".front", '[data-g="drag"]']) q<HTMLElement>(selector).hidden = flat;
    this.toggleAttribute("data-turning", s.turning);
  }

  #changed(state: ViewState, info: ChangeInfo): void {
    if (!this.#ready) return;
    this.#show();
    this.#dispatch(state, info);
    if (this.hasAttribute("address") && info.final) this.#save();
  }

  #dispatch(state: ViewState, info: ChangeInfo): void {
    this.dispatchEvent(new CustomEvent<ViewChangeDetail>(EVENT, { detail: { ...state, ...info }, bubbles: true, composed: true }));
  }

  /** The address is written at most four times a second: Safari stops a page that changes its address more than a hundred times in thirty seconds. */
  #save(): void {
    if (this.#saveTimer !== 0) return;
    this.#saveTimer = globalThis.setTimeout(() => {
      this.#saveTimer = 0;
      try {
        const s = this.#ensure().state;
        const next = formatAddress(globalThis.location.search, s, this.#keys, s.turning, this.#ensure().startZoom);
        if (next !== globalThis.location.search) globalThis.history.replaceState(globalThis.history.state, "", `${globalThis.location.pathname}${next}${globalThis.location.hash}`);
      } catch {
        /* an address that cannot be changed (a sandboxed frame): the view still works */
      }
    }, 250);
  }
}
