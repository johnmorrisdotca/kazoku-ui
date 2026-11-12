// <kazoku-view-controls>: the view controls as a framework-free custom element. It never draws the scene. It binds the pointer, pinch, wheel and keys
// to the element named by `for`, and tells the page what the view is now with a `kazoku-viewchange` event; the page applies it to its canvas, WebGL, SVG or CSS 3D.
import { createAddressWriter } from "../address-state/address.ts";
import { adoptStyles } from "../shared/adopt.ts";
import { localStore, remember } from "../shared/store.ts";
import { DEFAULT_KEYS, formatAddress, parseAddress, parseKeys } from "./address.ts";
import { BAR_EVENT, BAR_MARK, CARRY_EVENT, SHOW_EVENT } from "./carry.ts";
import { createViewController, DEFAULT_IGNORE, type ChangeInfo, type ViewController, type ViewState } from "./controller.ts";
import { EVENT, TAG } from "./index.ts";
import { type Direction, type Layout, LEVEL_STORAGE_KEY, type Level, parseAxis, parseDirection, parseLayout, parseLevel, TURN_PACES, TURN_SPEED, type TurnAxis, turnSeconds, zoomText } from "./levels.ts";
import { DEFAULT_LIMITS, type Limits, type Point, readLimits, ZOOM_STEP, ZOOMED } from "./math.ts";
import { turnOnlyInSight } from "./sight.ts";
import "../speed-buttons/define.ts";
import type { SpeedButtonsElement, SpeedChangeDetail } from "../speed-buttons/element.ts";
import { EVENT as SPEED_EVENT } from "../speed-buttons/index.ts";
import { nearestStep, parseSpeed, parseSteps, speedValue } from "../speed-buttons/steps.ts";
import { parseSway } from "./sway.ts";
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
  <div class="field tilt" part="field tilt"><label data-w="tilt" for="tilt"></label><input id="tilt" type="range" min="-30" max="30" step="1" value="0" part="slider" /><output for="tilt" data-o="tilt">0°</output></div>
  <div class="field roll" part="field roll"><label data-w="roll" for="roll"></label><input id="roll" type="range" min="-180" max="180" step="1" value="0" part="slider" /><output for="roll" data-o="roll">0°</output></div>
  <div class="group axes" role="group" data-g="axes">
    <button type="button" data-b="axis-angle" aria-pressed="true" part="button"><span data-w="angle"></span></button>
    <button type="button" data-b="axis-tilt" aria-pressed="false" part="button"><span data-w="tilt"></span></button>
    <button type="button" data-b="axis-roll" aria-pressed="false" part="button"><span data-w="roll"></span></button>
    <button type="button" data-b="axis-all" aria-pressed="false" part="button"><span data-w="tumble"></span></button>
  </div>
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
  </div>
  <button type="button" class="more" data-b="more" aria-expanded="false" part="button">${ICON.more}<span class="text" data-w="more"></span></button>
  <span class="vh" data-w="gestures"></span>
  <span class="vh" role="status" aria-live="polite" data-live></span>
</div>`;

/**
 * Attributes: `for` (the id of the view to bind), `lang` (en or ja; else the page's), `yaw`, `tilt` (the starting view), `zoom` (`fit`, the default, or a scale where 1
 * is the scene's natural size), `fit-scale` (the page's scale at Fit: what zoom 1 means), `ignore` (a selector for what inside the view a pointer press leaves alone;
 * buttons, links and form controls by default), `autoplay` (turn by itself from the start, unless the reader prefers reduced motion), `autoplay-for` (stop a turn by itself after this many seconds of turning: the one `autoplay` starts, and one the Play button or `play()` starts), `speed` (degrees a second at a pace of 1; a negative one starts the turn to the left), `direction` (`left` or `right`: which way Auto-turn goes; the reader's choice, from the Left and Right buttons or from the address, is written here and kept in the address as `direction`, and the angle goes on from where it was at the same speed), `pace` (the auto-turn speed as a multiple of `speed`, 1 by default; the reader's choice, from the buttons or from the address the page opened with, is written here and kept in the address as `pace`), `paces` (the speeds the buttons stand for, `0.5 1 2` by default),
 * `anchor` (`x,y`: the point the zoom buttons and keys zoom about, in pixels from the view's middle at Fit), `key-tilt` (`drag`, the default, or `wheel`: which way Arrow Up tips; the wheel itself moves),
 * `controls` (`basic`, the default, or `advanced`: which controls are shown, the zoom readout in both, and the speed in both while the view turns; the reader's own choice with the More button is remembered in localStorage, under `kazoku-view-controls` or the key `storage` names, and wins),
 * `layout` (`classic`, the default, `horizontal`, `vertical` or `compact`: where the controls sit; the horizontal, vertical and compact layouts have the zoom slider),
 * `stop-turn` (a press, the wheel or a key on the view stops the automatic turn), `double-press` (`off` leaves a double-click or a double tap alone; otherwise the view fires a cancelable `kazoku-doublepress` and then zooms to 2× and back), `immersive` (a plain wheel zooms about the pointer, and a finger drag turns and tips instead of scrolling), `tilt-step` (round a drag's tilt to a multiple of this many degrees), `object-size` (`w,h`: the object's size at Fit in pixels when it is smaller than the view, so a pan keeps a quarter of it in view), `free-pan` (the view moves at any zoom, zoomed out too, by up to this share of its size either way; bare is 0.5, for a 3D space whose zoom is far below 1), `grab-radius` (exact grab: the on-screen radius of the piece in pixels, or `fit`; a drag then keeps the touched point under the pointer), `flat` (the view cannot turn), `tilt-max`, `zoom-min`, `zoom-max`, `address` (keep the choices in the page's address), `address-keys` (`yaw:a,tilt:b`), `theme` (light
 * or dark), `overlay` (sit over the bottom of a positioned parent), `sway` (`off`, the default, `gentle` or `more`: a small drift of the picture while the view is already moving; it is not the angle, and a still view asks for no frame).
 */
export class ViewControlsElement extends HTMLElement {
  static observedAttributes = ["for", "lang", "yaw", "tilt", "roll", "zoom", "fit-scale", "ignore", "anchor", "key-tilt", "stop-turn", "double-press", "immersive", "tilt-step", "grab-radius", "object-size", "free-pan", "sway", "speed", "direction", "tilt-direction", "roll-direction", "axis", "pace", "paces", "controls", "layout", "flat", "tilt-max", "roll-max", "zoom-min", "zoom-max", "address-keys"];

  #root: ShadowRoot;
  #controller: ViewController | undefined;
  #view: HTMLElement | undefined;
  #unbind: (() => void) | undefined;
  /** The limits of a view that carries its own controls, which this bar's attributes win over; the defaults otherwise. */
  #carried: Limits = DEFAULT_LIMITS;
  /** The bound element's own `immersive`, from `CARRY_EVENT`. The bar's attribute still counts on its own. */
  #carriedImmersive = false;
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
  /** The `direction` attribute as the page itself last set it (`null`: none), read before the controls write a reader's choice there; `undefined` until first read. */
  #pageDirection: Direction | null | undefined;
  #axis: TurnAxis = "angle";
  #tiltWay: Direction = "right";
  #rollWay: Direction = "right";
  #writing = false;
  /** The pace the page starts at: its `pace` attribute as the page last set it, unsnapped (a button press writes the attribute too, and is not a start). */
  #startPace: number | undefined;
  #labels: ViewWords = wordsFor("en");
  #language: Language = "en";
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

  /** The share of the view's size it may move at any zoom, zoomed out too (see the `free-pan` attribute); `undefined` for none. */
  get freePan(): number | undefined {
    return this.#ensure().freePan;
  }

  set freePan(share: number | undefined | null) {
    this.#ensure().freePan = share ?? undefined;
    if (this.#ready) this.#show();
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
    for (const key of ["yaw", "tilt", "roll"] as const) {
      const value = Number(this.getAttribute(key));
      if (this.hasAttribute(key) && Number.isFinite(value)) start[key] = value;
    }
    const { pace, direction, axis, tiltDirection, rollDirection, ...chosen } = this.hasAttribute("address") ? parseAddress(globalThis.location?.search ?? "", this.#keys, c.limits) : {};
    Object.assign(start, chosen);
    this.#axis = axis ?? parseAxis(this.getAttribute("axis")) ?? this.#axis;
    if (tiltDirection) this.#tiltWay = tiltDirection;
    else {
      const tiltWay = parseDirection(this.getAttribute("tilt-direction"));
      if (tiltWay !== undefined) this.#tiltWay = tiltWay;
    }
    if (rollDirection) this.#rollWay = rollDirection;
    else {
      const rollWay = parseDirection(this.getAttribute("roll-direction"));
      if (rollWay !== undefined) this.#rollWay = rollWay;
    }
    c.turnable = !this.hasAttribute("flat");
    this.#level = parseLevel(this.#remembered()) ?? parseLevel(this.getAttribute("controls")) ?? "basic";
    this.#startPace ??= speedValue(this.getAttribute("pace")) ?? 1;
    this.#pace = this.#nearestPace(pace ?? parseSpeed(this.getAttribute("pace"), this.#paces()) ?? 1);
    // A pace from the address is the reader's choice, as a press is: the attribute says it too (a page reads the choice there), and the page's start stays as it was.
    if (pace !== undefined) this.#writePace(this.#pace);
    // Read once: put back on a page after a move, the element is still started by the page and not by the way the reader has since chosen (which is in the attribute now).
    const first = this.#start === undefined;
    // the page's own direction, read before a choice from the address is written over it
    if (this.#pageDirection === undefined) this.#pageDirection = parseDirection(this.getAttribute("direction")) ?? null;
    this.#start ??= this.#startDirection();
    this.#direction = direction ?? (first ? this.#start : this.#direction);
    // The other choices from the address are the reader's too, and are written to their attributes the same way (after the page's start is read, so it stays the page's).
    if (direction !== undefined) this.#writeAttribute("direction", direction);
    if (tiltDirection !== undefined) this.#writeAttribute("tilt-direction", tiltDirection);
    if (rollDirection !== undefined) this.#writeAttribute("roll-direction", rollDirection);
    if (axis !== undefined) this.#writeAttribute("axis", axis === "angle" ? null : axis);
    this.#speed();
    c.ignore = this.getAttribute("ignore") ?? DEFAULT_IGNORE;
    for (const name of ["key-tilt", "stop-turn", "double-press", "immersive", "tilt-step", "grab-radius", "object-size", "free-pan", "sway"]) this.#option(name);
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
    // a choice still waiting for the address is written now, while its state is here (a layout that moves the element would otherwise drop it)
    this.#writer.flush();
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
    clearTimeout(this.#sayTimer);
    this.#said = "";
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#ready) return;
    const c = this.#ensure();
    if (name === "for") this.#resolveView();
    else if (name === "lang") this.#label();
    else if (name === "yaw" || name === "tilt" || name === "roll") {
      if (value !== null && Number.isFinite(Number(value))) c.set({ [name]: Number(value) });
    } else if (name === "axis") {
      this.#axis = parseAxis(value) ?? "angle";
      this.#speed();
      this.#show();
    } else if (name === "zoom") c.setStartZoom(this.#startZoom());
    else if (name === "fit-scale") c.setFitScale(Number(value));
    else if (name === "ignore") c.ignore = value ?? DEFAULT_IGNORE;
    else if (name === "anchor" || name === "key-tilt" || name === "stop-turn" || name === "double-press" || name === "immersive" || name === "tilt-step" || name === "grab-radius" || name === "object-size" || name === "sway") this.#option(name);
    else if (name === "free-pan") {
      this.#option(name);
      if (this.#ready) this.#show();
    }
    else if (name === "speed") {
      // The page's own start follows its speed's sign, unless the reader has chosen the other way.
      const start = this.#startDirection();
      if (this.#direction === (this.#start ?? start)) this.#direction = start;
      this.#start = start;
      this.#speed();
      this.#show();
    } else if (name === "direction") {
      if (this.#writing) return;
      this.#pageDirection = parseDirection(value) ?? null;
      this.#start = this.#direction = this.#startDirection();
      this.#speed();
      this.#show();
    }
    else if (name === "tilt-direction" || name === "roll-direction") {
      if (this.#writing) return;
      const way = parseDirection(value) ?? "right";
      if (name === "tilt-direction") this.#tiltWay = way;
      else this.#rollWay = way;
      this.#speed();
      this.#show();
    }
    else if (name === "pace" || name === "paces") {
      this.#pace = this.#nearestPace(parseSpeed(this.getAttribute("pace"), this.#paces()) ?? this.#pace);
      // The page set its pace (or took it away: back to 1): that is the start now. A button press sets the attribute while writing, and is the reader's choice.
      if (name === "pace" && !this.#writing) this.#startPace = value === null ? 1 : (speedValue(value) ?? this.#startPace);
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
    else if (name === "double-press") c.doublePress = (value ?? "").trim().toLowerCase() !== "off";
    else if (name === "immersive") this.#applyImmersive();
    else if (name === "tilt-step") c.tiltStep = Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : 0;
    else if (name === "object-size") {
      const [w, h] = (value ?? "").trim().split(/[\s,x]+/).map(Number);
      c.objectSize = w !== undefined && w > 0 && Number.isFinite(w) ? { width: w, height: h !== undefined && h > 0 && Number.isFinite(h) ? h : w } : undefined;
    } else if (name === "free-pan") {
      // a share of the view's size from above 0 to 4; bare, or anything else, is 0.5 (the middle may go to the edge). Left out, no free pan.
      const share = Number(value);
      c.freePan = value === null ? undefined : share > 0 && share <= 4 ? share : 0.5;
    } else if (name === "grab-radius") c.grabRadius = value?.trim() === "fit" ? "fit" : Number(value) > 0 && Number.isFinite(Number(value)) ? Number(value) : 0;
    else if (name === "sway") c.sway = parseSway(value);
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
    const slider = (id: "yaw" | "tilt" | "roll"): void => {
      const input = q<HTMLInputElement>(`#${id}`);
      // A hand on a turn slider holds the automatic turn still while it is down; the turn then goes on from where the hand left it.
      const hold = (): void => {
        this.#sliderHeld += 1;
        if (this.#sliderHeld === 1) c().holdTurn();
      };
      const free = (): void => {
        if (this.#sliderHeld === 0) return;
        this.#sliderHeld = 0;
        c().releaseTurn();
      };
      input.addEventListener("pointerdown", () => hold());
      input.addEventListener("pointerup", free);
      input.addEventListener("pointercancel", free);
      input.addEventListener("input", () => c().set({ [id === "yaw" ? this.#hand() : id]: Number(input.value) }, false, "slider"));
      input.addEventListener("change", () => c().set({ [id === "yaw" ? this.#hand() : id]: Number(input.value) }, true, "slider"));
    };
    slider("yaw");
    slider("tilt");
    slider("roll");
    for (const axis of ["angle", "tilt", "roll", "all"] as const) {
      q<HTMLButtonElement>(`[data-b="axis-${axis}"]`).addEventListener("click", () => this.#chooseAxis(axis));
    }
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

  /** The speeds the buttons stand for: the `paces` attribute, `0.125 0.25 0.5 1` by default. */
  #paces(): number[] {
    return parseSteps(this.getAttribute("paces"), TURN_PACES);
  }

  #nearestPace(value: number): number {
    return nearestStep(value, this.#paces()) ?? 1;
  }

  /** A button was pressed: the pace is the number on it. It is written to the `pace` attribute and the address. */
  #choosePace(pace: number): void {
    this.#pace = pace;
    this.#speed();
    this.#writePace(pace);
    this.#show();
    if (this.hasAttribute("address")) this.#save();
  }

  /** Writes the reader's pace to the `pace` attribute, marked as written here so it is not taken for the page's new start. */
  #writePace(pace: number): void {
    this.#writeAttribute("pace", String(pace));
  }

  /** Writes a reader's choice to its attribute (`null` takes it off), marked as written here so it is not taken for a change the page made. */
  #writeAttribute(name: string, value: string | null): void {
    if (this.getAttribute(name) === value) return;
    this.#writing = true;
    if (value === null) this.removeAttribute(name);
    else this.setAttribute(name, value);
    this.#writing = false;
  }

  /** How long one turn of the view takes at `pace`, as a button shows it ("30 s", "2 min") and as a screen reader says it, in the bar's language. */
  #turnTime(pace: number): { text: string; label: string } {
    const words = this.#labels;
    const seconds = turnSeconds(Number(this.getAttribute("speed")) || TURN_SPEED, pace);
    const minutes = seconds >= 60;
    const n = String(Number((minutes ? seconds / 60 : seconds).toPrecision(2)));
    const text = (minutes ? words.minutes : words.seconds).replace("{n}", n);
    const one = n === "1";
    const long = (minutes ? (one ? words.minuteLong : words.minutesLong) : one ? words.secondLong : words.secondsLong).replace("{n}", n);
    return { text, label: words.turnEvery.replace("{t}", long) };
  }

  /**
   * The way the page itself starts the turn: its own `direction`, else left for a negative `speed` and right for the rest. Never the attribute as it is now, which also holds the reader's choice (a press,
   * or the address), so a change of `speed` cannot make the reader's choice the page's start.
   */
  #startDirection(): Direction {
    const own = this.#pageDirection === undefined ? parseDirection(this.getAttribute("direction")) : this.#pageDirection;
    return own ?? (Number(this.getAttribute("speed")) < 0 ? "left" : "right");
  }

  /** The seconds `autoplay-for` limits a turn to, or `undefined` for none. */
  #playLimit(): number | undefined {
    const seconds = Number(this.getAttribute("autoplay-for"));
    return seconds > 0 && Number.isFinite(seconds) ? seconds : undefined;
  }

  /** A way was pressed. It sets the active axis's direction (all three when All is on). The angle goes on from where it was. */
  #chooseDirection(direction: Direction): void {
    const axes: TurnAxis[] = this.#axis === "all" ? ["angle", "tilt", "roll"] : [this.#axis];
    for (const axis of axes) this.#putWay(axis, direction);
    this.#speed();
    this.#show();
    if (this.hasAttribute("address")) this.#save();
  }

  #putWay(axis: TurnAxis, direction: Direction): void {
    const name = axis === "tilt" ? "tilt-direction" : axis === "roll" ? "roll-direction" : "direction";
    if (axis === "tilt") this.#tiltWay = direction;
    else if (axis === "roll") this.#rollWay = direction;
    else this.#direction = direction;
    if (this.getAttribute(name) !== direction) {
      this.#writing = true;
      this.setAttribute(name, direction);
      this.#writing = false;
    }
  }

  /** Which axis Auto-turn drives, and which slider a reader last named. Angle is the start, so it leaves the attribute. */
  #chooseAxis(axis: TurnAxis): void {
    this.#axis = axis;
    const written = axis === "angle" ? null : axis;
    if (this.getAttribute("axis") !== written) {
      this.#writing = true;
      if (written === null) this.removeAttribute("axis");
      else this.setAttribute("axis", written);
      this.#writing = false;
    }
    this.#speed();
    this.#show();
    if (this.hasAttribute("address")) this.#save();
  }

  /** The slider shows this axis. All is a tumble, so the slider stays on the angle. */
  #hand(): "yaw" | "tilt" | "roll" {
    if (this.#axis === "tilt") return "tilt";
    if (this.#axis === "roll") return "roll";
    return "yaw";
  }

  /** The way Left and Right show for the axis that is on. All shows the angle's way. */
  #activeWay(): Direction {
    if (this.#axis === "tilt") return this.#tiltWay;
    if (this.#axis === "roll") return this.#rollWay;
    return this.#direction;
  }

  /** The turn's degrees a second: the size of the `speed` attribute (`TURN_SPEED`, 12) times the pace, going left when the active axis says so. */
  #speed(): void {
    const c = this.#ensure();
    const size = Math.abs(Number(this.getAttribute("speed")) || TURN_SPEED) * this.#pace;
    c.turnAxis = this.#axis;
    c.tiltSign = this.#tiltWay === "left" ? -1 : 1;
    c.rollSign = this.#rollWay === "left" ? -1 : 1;
    c.speed = size * (this.#activeWay() === "left" ? -1 : 1);
    // the buttons show how long a turn takes, which the page's speed decides: they say it again
    const speeds = this.#root.querySelector<SpeedButtonsElement>("kazoku-speed-buttons");
    if (speeds?.format) speeds.format = (step) => this.#turnTime(step);
  }

  /** Immersive when this bar says so, or when the element it is bound to says so. */
  #applyImmersive(): void {
    this.#ensure().immersive = this.hasAttribute("immersive") || this.#carriedImmersive;
  }

  #limits(): void {
    const c = this.#ensure();
    Object.assign(c.limits, readLimits((name) => this.getAttribute(name), this.#carried));
    const tilt = this.#root.querySelector<HTMLInputElement>("#tilt");
    if (tilt !== null) {
      tilt.min = String(-c.limits.tiltMax);
      tilt.max = String(c.limits.tiltMax);
    }
    const roll = this.#root.querySelector<HTMLInputElement>("#roll");
    if (roll !== null) {
      roll.min = String(-c.limits.rollMax);
      roll.max = String(c.limits.rollMax);
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
    if (element !== undefined) {
      // A package element that carries the controls itself stands down while this bar is bound to it.
      const carried = (event: Event): void => {
        const detail = (event as CustomEvent<{ limits: Limits; immersive?: boolean }>).detail;
        this.#carried = detail.limits;
        this.#carriedImmersive = detail.immersive === true;
        this.#limits();
        this.#applyImmersive();
        this.#ensure().set({});
      };
      element.addEventListener(CARRY_EVENT, carried);
      const shown = (event: Event): void => {
        const detail = (event as CustomEvent<Partial<ViewState>>).detail;
        if (detail === null || typeof detail !== "object") return;
        this.#ensure().set(detail, true, "show");
        if (this.#ready) this.#show();
      };
      element.addEventListener(SHOW_EVENT, shown);
      element.setAttribute(BAR_MARK, "");
      element.dispatchEvent(new Event(BAR_EVENT));
      const off = this.#ensure().bind(element);
      this.#unbind = () => {
        off();
        element.removeEventListener(CARRY_EVENT, carried);
        element.removeEventListener(SHOW_EVENT, shown);
        element.removeAttribute(BAR_MARK);
        element.dispatchEvent(new Event(BAR_EVENT));
        this.#carried = DEFAULT_LIMITS;
        this.#carriedImmersive = false;
        this.#limits();
        this.#applyImmersive();
      };
    }
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
    this.#language = language;
    for (const node of this.#root.querySelectorAll<HTMLElement>("[data-w]")) node.textContent = words[node.dataset.w as keyof ViewWords];
    const set = (selector: string, label: string): void => this.#root.querySelector(selector)?.setAttribute("aria-label", label);
    set(".bar", words.group);
    set('[data-b="play"]', words.autoTurn);
    set('[data-b="out"]', words.zoomOut);
    set('[data-b="in"]', words.zoomIn);
    set('[data-g="zoom"]', words.zoom);
    set('[data-g="pan"]', words.pan);
    set('[data-g="direction"]', words.direction);
    set('[data-g="axes"]', words.axis);
    const speeds = this.#root.querySelector<SpeedButtonsElement>("kazoku-speed-buttons");
    speeds?.setAttribute("lang", language);
    speeds?.setAttribute("label", words.speed);
    // The turn speeds say how long one turn of the view takes ("30 s"), not a bare 1×, so they are not read as the speed of time.
    if (speeds) speeds.format = (step) => this.#turnTime(step);
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
    const roll = q<HTMLInputElement>("#roll");
    tilt.value = String(Math.round(s.tilt));
    roll.value = String(Math.round(s.roll ?? 0));
    // The one slider shows the axis the chips have chosen. All keeps the angle, which is where a tumble is read from.
    const hand = this.#hand();
    const span = hand === "tilt" ? c.limits.tiltMax : hand === "roll" ? c.limits.rollMax : 180;
    const value = hand === "tilt" ? s.tilt : hand === "roll" ? (s.roll ?? 0) : s.yaw;
    const text = String(Math.round(value));
    if (yaw.max !== String(span)) {
      yaw.max = String(span);
      yaw.min = String(-span);
    }
    if (yaw.value !== text) yaw.value = text;
    const words = this.#labels;
    const name = hand === "tilt" ? words.tilt : hand === "roll" ? words.roll : words.angle;
    const label = q<HTMLLabelElement>('[data-w="angle"]');
    if (label.textContent !== name) label.textContent = name;
    q<HTMLOutputElement>('[data-o="yaw"]').value = `${text}°`;
    q<HTMLOutputElement>('[data-o="tilt"]').value = `${Math.round(s.tilt)}°`;
    q<HTMLOutputElement>('[data-o="roll"]').value = `${Math.round(s.roll ?? 0)}°`;
    for (const axis of ["angle", "tilt", "roll", "all"] as const) {
      q<HTMLButtonElement>(`[data-b="axis-${axis}"]`).setAttribute("aria-pressed", String(this.#axis === axis));
    }
    q<HTMLButtonElement>('[data-b="play"]').setAttribute("aria-pressed", String(s.turning));
    // Centre comes in once the view has been zoomed or moved, which is when the object can be lost; it puts it back in the middle at Fit and the default angle.
    q<HTMLElement>(".centre").hidden = s.zoom === 1 && s.panX === 0 && s.panY === 0;
    q<HTMLButtonElement>('[data-b="out"]').disabled = s.zoom <= c.limits.zoomMin + 1e-6;
    q<HTMLButtonElement>('[data-b="in"]').disabled = s.zoom >= c.limits.zoomMax - 1e-6;
    const advanced = this.#level === "advanced";
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
    say(q('[data-b="level"]'), `${words.zoomLevel} ${zoom}${this.#language === "ja" ? "、" : ", "}${words.zoomReset}`);
    this.#sayZoom(`${words.zoomLevel} ${zoom}`);
    const speeds = q<SpeedButtonsElement>("kazoku-speed-buttons");
    const paces = this.#paces();
    if (speeds.getAttribute("steps") !== paces.join(" ")) speeds.setAttribute("steps", paces.join(" "));
    this.#pace = this.#nearestPace(this.#pace);
    if (speeds.value !== this.#pace) speeds.value = this.#pace;
    const pace = this.#turnTime(this.#pace);
    write(q('[data-o="pace"]'), pace.text);
    say(q('[data-b="pace-now"]'), pace.label);
    const way = this.#activeWay();
    q<HTMLButtonElement>('[data-b="turn-left"]').setAttribute("aria-pressed", String(way === "left"));
    q<HTMLButtonElement>('[data-b="turn-right"]').setAttribute("aria-pressed", String(way === "right"));
    const more = q<HTMLButtonElement>('[data-b="more"]');
    more.setAttribute("aria-expanded", String(advanced));
    this.dataset.level = this.#level;
    for (const node of this.#root.querySelectorAll<HTMLElement>(".adv")) node.hidden = !advanced;
    const free = c.freePan !== undefined && c.freePan > 0 && Number.isFinite(c.freePan);
    q<HTMLElement>('[data-g="pan"]').hidden = !advanced || (s.zoom <= ZOOMED && !free);
    // A flat view cannot turn: the angle, tilt, auto-turn and front are not shown, and a drag only moves.
    const flat = !c.turnable;
    for (const selector of [".angle", ".tilt", ".roll", ".play", '[data-g="axes"]']) q<HTMLElement>(selector).hidden = flat;
    for (const selector of [".front", '[data-g="pacing"]']) q<HTMLElement>(selector).hidden = flat || !advanced;
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
      return formatAddress(search, {
        ...s,
        pace: this.#pace,
        direction: this.#direction === (this.#start ?? this.#direction) ? null : this.#direction,
        axis: this.#axis,
        tiltDirection: this.#tiltWay === "right" ? null : this.#tiltWay,
        rollDirection: this.#rollWay === "right" ? null : this.#rollWay,
      }, this.#keys, s.turning, this.#ensure().startZoom, this.#nearestPace(this.#startPace ?? 1));
    });
  }
}
