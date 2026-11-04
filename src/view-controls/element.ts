// <kazoku-view-controls>: the view controls as a framework-free custom element. It never draws the scene. It binds the pointer, pinch, wheel and keys
// to the element named by `for`, and tells the page what the view is now with a `kazoku-viewchange` event; the page applies it to its canvas, WebGL, SVG or CSS 3D.
import { createAddressWriter } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { localStore, remember } from "../shared/store.ts";
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "./address.ts";
import { createViewController, DEFAULT_IGNORE, type ChangeInfo, type ViewController, type ViewState } from "./controller.ts";
import { EVENT, TAG } from "./index.ts";
import { type Direction, type Layout, LEVEL_STORAGE_KEY, type Level, parseDirection, parseLayout, parseLevel, zoomText } from "./levels.ts";
import { type Point, ZOOM_STEP, ZOOMED } from "./math.ts";
import { turnOnlyInSight } from "./sight.ts";
import "../speed-buttons/define.ts";
import type { SpeedButtonsElement, SpeedChangeDetail } from "../speed-buttons/element.ts";
import { EVENT as SPEED_EVENT } from "../speed-buttons/index.ts";
import { nearestStep, parseSpeed, parseSteps, speedText } from "../speed-buttons/steps.ts";
import { STYLES } from "./styles.ts";
import { languageOf, type Language, type ViewWords, wordsFor } from "./words.ts";
import { SNAP_PX, zoomAtPosition, type ZoomMark, zoomMarks, zoomPosition, zoomSnap, zoomStep, zoomToMark } from "./zoomScale.ts";

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
  centre: icon("M11 2h2v5h-2zM11 17h2v5h-2zM2 11h5v2H2zM17 11h5v2h-5zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z"),
  more: icon("M3 7h18v2H3zM3 15h18v2H3zM8 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM16 12a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"),
};

/** The zoom slider's steps from end to end, and the width of its thumb in pixels (the styles draw it 28 wide). */
const SLIDER_SPAN = 1000;
const THUMB = 28;

const HTML = `
<div class="bar" part="bar" role="group">
  <div class="field angle" part="field angle"><label data-w="angle" for="yaw"></label><input id="yaw" type="range" min="-180" max="180" step="1" value="0" part="slider" /><output for="yaw" data-o="yaw">0°</output></div>
  <div class="field tilt adv" part="field tilt"><label data-w="tilt" for="tilt"></label><input id="tilt" type="range" min="-30" max="30" step="1" value="0" part="slider" /><output for="tilt" data-o="tilt">0°</output></div>
  <button type="button" class="pace-now" data-b="pace-now" part="button" hidden><span class="lbl" data-w="speed"></span><span data-o="pace"></span></button>
  <button type="button" class="play" data-b="play" aria-pressed="false" part="button">${ICON.play}${ICON.pause}<span class="text" data-w="autoTurn"></span></button>
  <div class="pacing adv" data-g="pacing">
    <kazoku-speed-buttons class="pace" data-g="pace"></kazoku-speed-buttons>
    <div class="group dir" role="group" data-g="direction">
      <button type="button" data-b="turn-left" aria-pressed="false" part="button">${ICON.left}<span data-w="turnLeft"></span></button>
      <button type="button" data-b="turn-right" aria-pressed="true" part="button">${ICON.right}<span data-w="turnRight"></span></button>
    </div>
  </div>
  <button type="button" class="front adv" data-b="front" part="button"><span data-w="front"></span></button>
  <button type="button" class="centre" data-b="centre" part="button" hidden>${ICON.centre}<span class="text" data-w="centre"></span></button>
  <div class="group zoom" role="group" data-g="zoom">
    <div class="field zslide" part="field zoom-slider"><label data-w="zoom" for="zoom"></label><div class="zbox"><div class="ztrack" aria-hidden="true"><div class="zfill"></div></div><div class="zmarks" aria-hidden="true"></div><input id="zoom" type="range" min="0" max="1000" step="1" value="0" part="slider zoom-slider" /></div></div>
    <button type="button" data-b="out" part="button">${ICON.minus}</button>
    <button type="button" class="level" data-b="level" part="button"><span data-o="zoom">1×</span></button>
    <button type="button" data-b="in" part="button">${ICON.plus}</button>
    <button type="button" data-b="fit" part="button"><span data-w="fit"></span></button>
  </div>
  <div class="group pan adv" role="group" data-g="pan" hidden>
    <button type="button" data-b="left" part="button">${ICON.left}</button>
    <button type="button" data-b="up" part="button">${ICON.up}</button>
    <button type="button" data-b="down" part="button">${ICON.down}</button>
    <button type="button" data-b="right" part="button">${ICON.right}</button>
    <div class="group drag" role="group" data-g="drag">
      <button type="button" data-b="move" aria-pressed="true" part="button"><span data-w="dragMove"></span></button>
      <button type="button" data-b="turn" aria-pressed="false" part="button"><span data-w="dragTurn"></span></button>
    </div>
  </div>
  <button type="button" class="more" data-b="more" aria-expanded="false" part="button">${ICON.more}<span class="text" data-w="more"></span></button>
  <span class="vh" role="status" aria-live="polite" data-live></span>
</div>`;

/**
 * Attributes: `for` (the id of the view to bind), `lang` (en or ja; else the page's), `yaw`, `tilt` (the starting view), `zoom` (`fit`, the default, or a scale where 1
 * is the scene's natural size), `fit-scale` (the page's scale at Fit: what zoom 1 means), `ignore` (a selector for what inside the view a pointer press leaves alone;
 * buttons, links and form controls by default), `autoplay` (turn by itself from the start, unless the reader prefers reduced motion), `autoplay-for` (stop a turn by itself after this many seconds of turning: the one `autoplay` starts, and one the Play button or `play()` starts), `speed` (degrees a second at a pace of 1; a negative one starts the turn to the left), `direction` (`left` or `right`: which way Auto-turn goes; the reader's choice of the Left and Right buttons is written here and kept in the address as `direction`, and the angle goes on from where it was at the same speed), `pace` (the auto-turn speed as a multiple of `speed`, 1 by default; the reader's choice of the buttons is written here and kept in the address as `pace`), `paces` (the speeds the buttons stand for, `0.5 1 2` by default),
 * `anchor` (`x,y`: the point the zoom buttons and keys zoom about, in pixels from the view's middle at Fit), `key-tilt` (`drag`, the default, or `wheel`: which way Arrow Up tips; the wheel itself zooms),
 * `controls` (`basic`, the default, or `advanced`: which controls are shown, the zoom readout in both, and the speed in both while the view turns; the reader's own choice with the More button is remembered in localStorage, under `kazoku-view-controls` or the key `storage` names, and wins),
 * `layout` (`classic`, the default, `horizontal`, `vertical` or `compact`: where the controls sit; the horizontal, vertical and compact layouts have the zoom slider),
 * `stop-turn` (a press, the wheel or a key on the view stops the automatic turn), `tilt-step` (round a drag's tilt to a multiple of this many degrees), `object-size` (`w,h`: the object's size at Fit in pixels when it is smaller than the view, so a pan keeps a quarter of it in view), `grab-radius` (exact grab: the on-screen radius of the piece in pixels, or `fit`; a drag then keeps the touched point under the pointer), `flat` (the view cannot turn), `tilt-max`, `zoom-min`, `zoom-max`, `address` (keep the choices in the page's address), `address-keys` (`yaw:a,tilt:b`), `theme` (light
 * or dark), `overlay` (sit over the bottom of a positioned parent).
 */
export class ViewControlsElement extends HTMLElement {
  static observedAttributes = ["for", "lang", "yaw", "tilt", "zoom", "fit-scale", "ignore", "anchor", "key-tilt", "stop-turn", "tilt-step", "grab-radius", "object-size", "speed", "direction", "pace", "paces", "controls", "layout", "flat", "tilt-max", "zoom-min", "zoom-max", "address-keys"];

  #root: ShadowRoot;
  #controller: ViewController | undefined;
  #view: HTMLElement | undefined;
  #unbind: (() => void) | undefined;
  #words: Partial<ViewWords> = {};
  #ready = false;
  #sliderHeld = 0;
  #writer = createAddressWriter({ delay: 250 });
  #keys = DEFAULT_KEYS;
  #unwatch: (() => void) | undefined;
  #offPage = false;
  #level: Level = "basic";
  #layout: Layout = "classic";
  #marks: ZoomMark[] = [];
  #marksFor = "";
  /** The zoom the slider shows now; NaN until it has shown one, and again when the marks are redrawn for new limits. */
  #zoomShown = Number.NaN;
  #pace = 1;
  /** Which way the turn goes now, and the way the page itself starts it (its `direction`, else the sign of its `speed`): the address keeps a way only when it is not the start. */
  #direction: Direction = "right";
  #start: Direction | undefined;
  #writing = false;
  #labels: ViewWords = wordsFor("en");
  #said = "";
  #sayTimer: ReturnType<typeof setTimeout> | undefined;

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

  /** Turn by itself. With `seconds`, stop after that many seconds of turning; else the `autoplay-for` attribute's, if there is one. */
  play(seconds?: number): void {
    this.#ensure().play(seconds ?? this.#playLimit());
  }

  pause(): void {
    this.#ensure().pause();
  }

  front(): void {
    this.#ensure().front();
  }

  /** Put the object back in the middle at Fit and the default angle, with a brief move (at once for a reader who prefers reduced motion, or with `false`). */
  centre(animate = true): void {
    this.#ensure().centre(animate);
  }
  fit(): void {
    this.#ensure().fit();
  }

  set(next: Partial<ViewState>): void {
    this.#ensure().set(next);
  }

  /** The point the zoom buttons and keys zoom about: `{ x, y }` in CSS pixels from the view's middle when it is at Fit, moving with the picture. `undefined` zooms about the view's middle. The `anchor` attribute (`"x,y"`) sets the same. */
  get anchor(): Point | undefined {
    return this.#ensure().anchor;
  }

  set anchor(point: Point | undefined | null) {
    this.#ensure().anchor = point ?? undefined;
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
    if (this.#offPage) c.resumeTurn();
    this.#offPage = false;
    if (this.#root.querySelector(".bar") === null) this.#build();
    this.#keys = parseKeys(this.getAttribute("address-keys"));
    this.#arrange();
    this.#limits();
    const start: Partial<ViewState> = {};
    for (const key of ["yaw", "tilt"] as const) {
      const value = Number(this.getAttribute(key));
      if (this.hasAttribute(key) && Number.isFinite(value)) start[key] = value;
    }
    const { pace, direction, ...chosen } = this.hasAttribute("address") ? parseAddress(globalThis.location?.search ?? "", this.#keys, c.limits) : {};
    Object.assign(start, chosen);
    c.turnable = !this.hasAttribute("flat");
    this.#level = parseLevel(this.#remembered()) ?? parseLevel(this.getAttribute("controls")) ?? "basic";
    this.#pace = this.#nearestPace(pace ?? parseSpeed(this.getAttribute("pace"), this.#paces()) ?? 1);
    // Read once: put back on a page after a move, the element is still started by the page and not by the way the reader has since chosen (which is in the attribute now).
    const first = this.#start === undefined;
    this.#start ??= this.#startDirection();
    this.#direction = direction ?? (first ? this.#start : this.#direction);
    this.#speed();
    c.ignore = this.getAttribute("ignore") ?? DEFAULT_IGNORE;
    for (const name of ["key-tilt", "stop-turn", "tilt-step", "grab-radius", "object-size"]) this.#option(name);
    if (this.hasAttribute("anchor")) this.#option("anchor");
    const fitScale = Number(this.getAttribute("fit-scale"));
    if (this.hasAttribute("fit-scale")) c.setFitScale(fitScale);
    c.setStartZoom(this.#startZoom());
    c.set(start, true, "init");
    this.#label();
    this.#resolveView();
    if (this.#view === undefined && this.ownerDocument.readyState === "loading") this.ownerDocument.addEventListener("DOMContentLoaded", () => this.#resolveView(), { once: true });
    this.#ready = true;
    this.#show();
    this.#watch();
    // Said once the page has had its turn to listen; a page can also read `state` at any time.
    queueMicrotask(() => {
      // Taken off the page already, perhaps put back: then this controller is gone and a newer microtask speaks for the new one.
      if (this.#controller !== c) return;
      this.#dispatch(c.state, { final: true, reason: "init" });
      if (this.hasAttribute("autoplay") && !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) c.play(this.#playLimit());
    });
  }

  disconnectedCallback(): void {
    this.#unwatch?.();
    this.#unwatch = undefined;
    this.#unbind?.();
    this.#unbind = undefined;
    this.#controller?.destroy();
    this.#controller = undefined;
    this.#offPage = false;
    this.#view = undefined;
    this.#ready = false;
    this.#sliderHeld = 0;
    this.#writer.cancel();
    clearTimeout(this.#sayTimer);
    this.#said = "";
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
    else if (name === "anchor" || name === "key-tilt" || name === "stop-turn" || name === "tilt-step" || name === "grab-radius" || name === "object-size") this.#option(name);
    else if (name === "speed") {
      // The page's own start follows its speed's sign, unless the reader has chosen the other way.
      const start = this.#startDirection();
      if (this.#direction === (this.#start ?? start)) this.#direction = start;
      this.#start = start;
      this.#speed();
      this.#show();
    } else if (name === "direction") {
      if (this.#writing) return;
      this.#start = this.#direction = this.#startDirection();
      this.#speed();
      this.#show();
    }
    else if (name === "pace" || name === "paces") {
      this.#pace = this.#nearestPace(parseSpeed(this.getAttribute("pace"), this.#paces()) ?? this.#pace);
      this.#speed();
      this.#show();
    }
    else if (name === "layout") {
      this.#arrange();
      this.#show();
    } else if (name === "controls") {
      this.#level = parseLevel(value) ?? "basic";
      this.#show();
    }
    else if (name === "flat") {
      c.turnable = value === null;
      this.#show();
    } else if (name === "address-keys") this.#keys = parseKeys(value);
    else {
      this.#limits();
      // A limit that moved past the view takes the view with it, and the readout and the buttons say so.
      c.set({});
    }
  }

  #option(name: string): void {
    const c = this.#ensure();
    const value = this.getAttribute(name);
    if (name === "anchor") {
      const [x, y] = (value ?? "").trim().split(/[\s,]+/).map(Number);
      c.anchor = x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
    } else if (name === "key-tilt") c.keyTilt = value === "wheel" ? "wheel" : "drag";
    else if (name === "stop-turn") c.stopTurn = value !== null;
    else if (name === "tilt-step") c.tiltStep = Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : 0;
    else if (name === "object-size") {
      const [w, h] = (value ?? "").trim().split(/[\s,x]+/).map(Number);
      c.objectSize = w !== undefined && w > 0 && Number.isFinite(w) ? { width: w, height: h !== undefined && h > 0 && Number.isFinite(h) ? h : w } : undefined;
    } else if (name === "grab-radius") c.grabRadius = value?.trim() === "fit" ? "fit" : Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  #startZoom(): "fit" | number {
    const value = Number(this.getAttribute("zoom"));
    return this.hasAttribute("zoom") && Number.isFinite(value) && value > 0 ? value : "fit";
  }

  #ensure(): ViewController {
    if (this.#controller === undefined) {
      const made: ViewController = createViewController({
        onChange: (state, info) => {
          // A page may hold on to an old `controller` after a move; only the one in use speaks for the element.
          if (this.#controller === made) this.#changed(state, info);
        },
      });
      this.#controller = made;
      // Nothing can see an element that is on no page: it asks for no frame until it is put on one.
      if (!this.isConnected) {
        made.suspendTurn();
        this.#offPage = true;
      }
    }
    return this.#controller;
  }

  #build(): void {
    this.#root.innerHTML = HTML;
    adoptStyles(this.#root, STYLES, this.nonce);
    const q = <T extends Element>(selector: string): T => this.#root.querySelector(selector) as T;
    // The controller in use when a control is pressed: the element keeps these controls when it is moved, and gets a new controller.
    const c = (): ViewController => this.#ensure();
    const slider = (id: "yaw" | "tilt"): void => {
      const input = q<HTMLInputElement>(`#${id}`);
      // A hand on the angle slider holds the automatic turn still while it is down; the turn then goes on from where the hand left it.
      const hold = (): void => {
        this.#sliderHeld += 1;
        if (this.#sliderHeld === 1 && id === "yaw") c().holdTurn();
      };
      const free = (): void => {
        if (this.#sliderHeld === 0) return;
        this.#sliderHeld = 0;
        if (id === "yaw") c().releaseTurn();
      };
      input.addEventListener("pointerdown", () => hold());
      input.addEventListener("pointerup", free);
      input.addEventListener("pointercancel", free);
      input.addEventListener("input", () => c().set({ [id]: Number(input.value) }, false, "slider"));
      input.addEventListener("change", () => c().set({ [id]: Number(input.value) }, true, "slider"));
    };
    slider("yaw");
    slider("tilt");
    this.#zoomSlider(q<HTMLInputElement>("#zoom"), c);
    const on = (b: string, run: () => void): void => q<HTMLButtonElement>(`[data-b="${b}"]`).addEventListener("click", run);
    on("play", () => {
      if (c().state.turning) c().pause();
      else c().play(this.#playLimit());
    });
    on("front", () => c().front());
    on("out", () => c().zoomBy(1 / ZOOM_STEP));
    on("in", () => c().zoomBy(ZOOM_STEP));
    on("fit", () => c().fit());
    on("centre", () => c().centre());
    on("level", () => c().fit());
    on("more", () => {
      this.#level = this.#level === "basic" ? "advanced" : "basic";
      remember(this.#storageKey(), this.#level);
      this.#show();
    });
    // The speed buttons are the family's own element; its choice is the pace, kept in the attribute and the address.
    const speeds = q<SpeedButtonsElement>("kazoku-speed-buttons");
    speeds.addEventListener(SPEED_EVENT, (event) => {
      // The element's own, not one for the page to hear: the page hears `kazoku-viewchange`.
      event.stopPropagation();
      const { value, reason } = (event as CustomEvent<SpeedChangeDetail>).detail;
      if (reason === "user") this.#choosePace(value);
    });
    on("pace-now", () => speeds.step(1));
    on("turn-left", () => this.#chooseDirection("left"));
    on("turn-right", () => this.#chooseDirection("right"));
    on("left", () => c().panBy(-1, 0));
    on("right", () => c().panBy(1, 0));
    on("up", () => c().panBy(0, -1));
    on("down", () => c().panBy(0, 1));
    on("move", () => c().setDrag("move"));
    on("turn", () => c().setDrag("turn"));
  }

  /** The zoom slider: logarithmic, so a press of + or - moves it the same way anywhere; a drag that ends near a mark goes to it, and the keys step, jump between marks and go to the ends. */
  #zoomSlider(input: HTMLInputElement, c: () => ViewController): void {
    const go = (final: boolean): void => {
      const { zoomMin: min, zoomMax: max } = c().limits;
      const length = input.getBoundingClientRect().width - THUMB;
      const zoom = zoomAtPosition(Number(input.value) / SLIDER_SPAN, min, max);
      c().zoomAt(zoomSnap(zoom, this.#marks, min, max, length > 0 ? SNAP_PX / length : 0), undefined, final);
    };
    input.addEventListener("input", () => go(false));
    input.addEventListener("change", () => go(true));
    input.addEventListener("keydown", (event) => {
      const { zoomMin: min, zoomMax: max } = c().limits;
      const zoom = c().state.zoom;
      const up = event.key === "ArrowRight" || event.key === "ArrowUp";
      const down = event.key === "ArrowLeft" || event.key === "ArrowDown";
      let next: number | undefined;
      if (up || down) next = zoomStep(zoom, this.#marks, up ? 1 : -1, min, max);
      else if (event.key === "PageUp" || event.key === "PageDown") next = zoomToMark(zoom, this.#marks, event.key === "PageUp" ? 1 : -1, min, max);
      else if (event.key === "Home") next = min;
      else if (event.key === "End") next = max;
      if (next === undefined) return;
      event.preventDefault();
      c().zoomAt(next);
    });
  }

  /** The layout from the attribute, on the host as `data-layout` for the styles. */
  #arrange(): void {
    this.#layout = parseLayout(this.getAttribute("layout"));
    if (this.dataset.layout !== this.#layout) this.dataset.layout = this.#layout;
  }

  /** The slider's marks for the limits now: ticks on the track and their labels under it, made again only when the limits change. */
  #drawMarks(): void {
    const { zoomMin: min, zoomMax: max } = this.#ensure().limits;
    const key = `${min} ${max}`;
    if (key === this.#marksFor) return;
    this.#marksFor = key;
    this.#marks = zoomMarks(min, max);
    this.#zoomShown = Number.NaN;
    const track = this.#root.querySelector<HTMLElement>(".ztrack");
    const labels = this.#root.querySelector<HTMLElement>(".zmarks");
    if (track === null || labels === null) return;
    for (const tick of track.querySelectorAll(".ztick")) tick.remove();
    labels.replaceChildren();
    const doc = this.ownerDocument;
    for (const mark of this.#marks) {
      // Placed through the CSSOM, which a strict style-src allows, not a style attribute in markup.
      const tick = doc.createElement("span");
      tick.className = "ztick";
      tick.style.setProperty("--at", String(mark.at));
      track.append(tick);
      const label = doc.createElement("span");
      label.className = "zmark";
      label.dataset.zoom = String(mark.zoom);
      if (mark.end) label.dataset.end = mark.at === 0 ? "start" : "end";
      label.style.setProperty("--at", String(mark.at));
      label.textContent = zoomText(mark.zoom);
      labels.append(label);
    }
    this.#root.querySelector<HTMLElement>(".zslide")?.toggleAttribute("hidden", this.#marks.length === 0);
  }

  #storageKey(): string {
    return this.getAttribute("storage") || LEVEL_STORAGE_KEY;
  }

  #remembered(): string | null {
    try {
      return localStore()?.getItem(this.#storageKey()) ?? null;
    } catch {
      return null;
    }
  }

  /** The speeds the buttons stand for: the `paces` attribute, `0.5 1 2` by default. */
  #paces(): number[] {
    return parseSteps(this.getAttribute("paces"));
  }

  #nearestPace(value: number): number {
    return nearestStep(value, this.#paces()) ?? 1;
  }

  /** A button was pressed: the pace is the number on it. It is written to the `pace` attribute and the address. */
  #choosePace(pace: number): void {
    this.#pace = pace;
    this.#speed();
    if (this.getAttribute("pace") !== String(pace)) this.setAttribute("pace", String(pace));
    this.#show();
    if (this.hasAttribute("address")) this.#save();
  }

  /** The way the page itself starts the turn: its `direction`, else left for a negative `speed` and right for the rest. */
  #startDirection(): Direction {
    return parseDirection(this.getAttribute("direction")) ?? (Number(this.getAttribute("speed")) < 0 ? "left" : "right");
  }

  /** The seconds `autoplay-for` limits a turn to, or `undefined` for none. */
  #playLimit(): number | undefined {
    const seconds = Number(this.getAttribute("autoplay-for"));
    return seconds > 0 && Number.isFinite(seconds) ? seconds : undefined;
  }

  /** A way was pressed. It is written to the `direction` attribute and the address; the angle goes on from where it was, at the same speed. */
  #chooseDirection(direction: Direction): void {
    this.#direction = direction;
    this.#speed();
    if (this.getAttribute("direction") !== direction) {
      this.#writing = true;
      this.setAttribute("direction", direction);
      this.#writing = false;
    }
    this.#show();
    if (this.hasAttribute("address")) this.#save();
  }

  /** The turn's degrees a second: the size of the `speed` attribute (30) times the pace, going left when it is negative. */
  #speed(): void {
    this.#ensure().speed = Math.abs(Number(this.getAttribute("speed")) || 30) * this.#pace * (this.#direction === "left" ? -1 : 1);
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
    this.#drawMarks();
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
    // A view takes the keys only if it can be focused: a page that wants arrows and plus and minus on it gives it a tabindex.
    if (element !== undefined) this.#unbind = this.#ensure().bind(element);
    this.#watch();
  }

  /** The controller holds its turn while the view it is bound to cannot be seen; with no view yet, this element stands in for it. */
  #watch(): void {
    this.#unwatch?.();
    this.#unwatch = undefined;
    if (this.#view === undefined && this.isConnected) this.#unwatch = turnOnlyInSight(this.#ensure(), this);
  }

  #label(): void {
    const language: Language = languageOf(this.getAttribute("lang") ?? this.closest("[lang]")?.getAttribute("lang") ?? this.ownerDocument.documentElement.lang);
    const words = wordsFor(language, this.#words);
    this.#labels = words;
    for (const node of this.#root.querySelectorAll<HTMLElement>("[data-w]")) node.textContent = words[node.dataset.w as keyof ViewWords];
    const set = (selector: string, label: string): void => this.#root.querySelector(selector)?.setAttribute("aria-label", label);
    set(".bar", words.group);
    set('[data-b="play"]', words.autoTurn);
    set('[data-b="out"]', words.zoomOut);
    set('[data-b="in"]', words.zoomIn);
    set('[data-g="zoom"]', words.zoom);
    set('[data-g="pan"]', words.pan);
    set('[data-g="direction"]', words.direction);
    set('[data-g="drag"]', words.drag);
    const speeds = this.#root.querySelector<SpeedButtonsElement>("kazoku-speed-buttons");
    speeds?.setAttribute("lang", language);
    speeds?.setAttribute("label", words.speed);
    set('[data-b="left"]', words.panLeft);
    set('[data-b="right"]', words.panRight);
    set('[data-b="up"]', words.panUp);
    set('[data-b="down"]', words.panDown);
    this.#root.querySelector(".bar")?.setAttribute("lang", language);
    if (this.#ready) this.#show();
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
    // Centre comes in once the view has been zoomed or moved, which is when the object can be lost; it puts it back in the middle at Fit and the default angle.
    q<HTMLElement>(".centre").hidden = s.zoom === 1 && s.panX === 0 && s.panY === 0;
    q<HTMLButtonElement>('[data-b="out"]').disabled = s.zoom <= c.limits.zoomMin + 1e-6;
    q<HTMLButtonElement>('[data-b="in"]').disabled = s.zoom >= c.limits.zoomMax - 1e-6;
    const advanced = this.#level === "advanced";
    const words = this.#labels;
    const zoom = zoomText(s.zoom);
    // A frame of the automatic turn comes through here: what has not changed is not written.
    const write = (node: Element, text: string): void => {
      if (node.textContent !== text) node.textContent = text;
    };
    const say = (node: Element, label: string): void => {
      if (node.getAttribute("aria-label") !== label) node.setAttribute("aria-label", label);
    };
    write(q('[data-o="zoom"]'), zoom);
    // The slider always shows the true zoom, wherever it came from. A frame of the automatic turn leaves the zoom alone, so it costs one comparison here.
    if (s.zoom !== this.#zoomShown) {
      this.#zoomShown = s.zoom;
      const slider = q<HTMLInputElement>("#zoom");
      const at = zoomPosition(s.zoom, c.limits.zoomMin, c.limits.zoomMax);
      const value = String(Math.round(at * SLIDER_SPAN));
      if (slider.value !== value) slider.value = value;
      q<HTMLElement>(".zbox").style.setProperty("--pos", String(at));
      if (slider.getAttribute("aria-valuetext") !== zoom) slider.setAttribute("aria-valuetext", zoom);
    }
    say(q('[data-b="level"]'), `${words.zoomLevel} ${zoom}, ${words.zoomReset}`);
    this.#sayZoom(`${words.zoomLevel} ${zoom}`);
    const speeds = q<SpeedButtonsElement>("kazoku-speed-buttons");
    const paces = this.#paces();
    if (speeds.getAttribute("steps") !== paces.join(" ")) speeds.setAttribute("steps", paces.join(" "));
    this.#pace = this.#nearestPace(this.#pace);
    if (speeds.value !== this.#pace) speeds.value = this.#pace;
    const pace = speedText(this.#pace);
    write(q('[data-o="pace"]'), pace);
    say(q('[data-b="pace-now"]'), `${words.speed}: ${pace}`);
    q<HTMLButtonElement>('[data-b="turn-left"]').setAttribute("aria-pressed", String(this.#direction === "left"));
    q<HTMLButtonElement>('[data-b="turn-right"]').setAttribute("aria-pressed", String(this.#direction === "right"));
    const more = q<HTMLButtonElement>('[data-b="more"]');
    more.setAttribute("aria-expanded", String(advanced));
    this.dataset.level = this.#level;
    for (const node of this.#root.querySelectorAll<HTMLElement>(".adv")) node.hidden = !advanced;
    q<HTMLElement>('[data-g="pan"]').hidden = !advanced || s.zoom <= ZOOMED;
    q<HTMLButtonElement>('[data-b="move"]').setAttribute("aria-pressed", String(s.drag === "move"));
    q<HTMLButtonElement>('[data-b="turn"]').setAttribute("aria-pressed", String(s.drag === "turn"));
    // A flat view cannot turn: the angle, tilt, auto-turn and front are not shown, and a drag only moves.
    const flat = !c.turnable;
    for (const selector of [".angle", ".play"]) q<HTMLElement>(selector).hidden = flat;
    for (const selector of [".tilt", ".front", '[data-g="drag"]', '[data-g="pacing"]']) q<HTMLElement>(selector).hidden = flat || !advanced;
    // The speed is always in sight while the view turns: one small button in basic, which steps through the three; advanced always has the three.
    q<HTMLElement>(".pace-now").hidden = flat || advanced || !s.turning;
    this.toggleAttribute("data-turning", s.turning);
    if (this.hasAttribute("data-flat") !== flat) this.toggleAttribute("data-flat", flat);
  }

  /** Tells a screen reader the zoom once it has settled for a moment (a pinch or a wheel makes many steps). */
  #sayZoom(text: string): void {
    if (text === this.#said) return;
    const first = this.#said === "";
    this.#said = text;
    if (first) return;
    clearTimeout(this.#sayTimer);
    this.#sayTimer = setTimeout(() => {
      const live = this.#root.querySelector('[data-live]');
      if (live !== null) live.textContent = text;
    }, 400);
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
    this.#writer.write((search) => {
      const s = this.#ensure().state;
      return formatAddress(search, { ...s, pace: this.#pace, direction: this.#direction === (this.#start ?? this.#direction) ? null : this.#direction }, this.#keys, s.turning, this.#ensure().startZoom);
    });
  }
}
