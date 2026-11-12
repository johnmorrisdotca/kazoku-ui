// A package's own custom element carries the view controls: the drag, the pinch, the wheel and the keys, with no bar. It touches the DOM only when called.
import { type ChangeInfo, createViewController, type ViewController, type ViewControllerOptions, type ViewState } from "./controller.ts";
import { DEFAULT_LIMITS, type Limits, readLimits } from "./math.ts";

/** A `<kazoku-view-controls for="...">` marks the view it is bound to with this attribute and says so with `BAR_EVENT`: the bar's hands are then the only ones, and the element's stand down until the bar goes. */
export const BAR_MARK = "data-kazoku-bar";
export const BAR_EVENT = "kazoku-viewbar";
/** While a bar is bound, the element says what its limits are with this event, whenever they may have changed: `detail.limits`, and whether the view is immersive: `detail.immersive`. The bar uses the limits under its own `zoom-min`, `zoom-max`, `tilt-max` and `roll-max`, and follows `immersive` unless the bar itself has that attribute. */
export const CARRY_EVENT = "kazoku-viewcarry";
/** The view the element is showing now, so a bound bar keeps it: `detail` is a partial view (`yaw`, `tilt`, `zoom`, and `roll`, `panX`, `panY` when the element has them). The bar takes it and does not send `kazoku-viewchange`. */
export const SHOW_EVENT = "kazoku-viewshow";

export interface CarryOptions extends Omit<ViewControllerOptions, "onChange"> {
  /** The page's own drawing: apply the state. The element's drag, pinch, wheel and keys all arrive here. */
  onChange: (state: ViewState, info: ChangeInfo) => void;
  /** Whether the element carries its controls when it has no `controls` attribute. True by default; a still picture passes false. `controls="none"` always turns them off. */
  on?: boolean;
}

export interface ElementControls {
  /** The controller behind the hands, for the element's own `set`, `fit` and `state`. */
  readonly controller: ViewController;
  /** Change the package's own limits after setup, for a view whose detail changes (map tiles found, a body ridden). The attributes `zoom-min`, `zoom-max`, `tilt-max` and `roll-max` still win. A zoom outside the new limits is moved inside them, and a bar bound to the element hears the new limits (`CARRY_EVENT`). */
  setLimits(limits: Partial<Limits>): void;
  /**
   * The view the element is showing now, after it moved itself (a chosen place, not a drag). The controller takes it and `onChange` is not called.
   * While a bar is bound, the element sends `SHOW_EVENT` and the bar takes the same view, so the bar's next change keeps this yaw and tilt.
   */
  show(view: Partial<ViewState>): void;
  /** Let the hands go and destroy the controller. Call it in `disconnectedCallback`. */
  unbind(): void;
}

/**
 * Give `element` the shared hands, from `connectedCallback`. A drag turns it (and moves it once zoomed), two fingers pinch, Ctrl or Command and the wheel zoom about the pointer, the plain wheel moves it
 * and, at Fit, scrolls the page; the arrow keys, + and -, 0 and Home work once it is focused, so it gets `tabindex="0"` unless it has one (also when a bar was bound to it first). `touch-action` follows the zoom, and a view that is inline
 * becomes a block, or no touch would reach it. Nothing starts by itself, so reduced motion has nothing to hold back.
 *
 * The element's attributes are read now and watched: `controls="none"` takes the hands off, and `zoom-min` and `zoom-max` (also `tilt-max` and `roll-max`) set the limits over the `limits` given here,
 * which sit over `DEFAULT_LIMITS`. `immersive` (the attribute, or `immersive: true`) makes a plain wheel zoom about the pointer and a finger drag turn and tip; a bound bar follows it (`CARRY_EVENT`).
 * `double-press="off"` (or `doublePress: false`) leaves a double tap alone. Both are read again only when that attribute changes, so a value set on the controller by hand survives a later `zoom-min` change.
 * A `<kazoku-view-controls>` for the same element takes the hands over while it is there. The bar has its own `double-press`; the element's `double-press` applies to the element's own hands, which stand down while the bar is bound.
 *
 * @example
 * const hands = carryControls(element, { immersive: true, doublePress: false, onChange: (state) => draw(state) });
 * element.setAttribute("immersive", "");
 */
export function carryControls(element: HTMLElement, options: CarryOptions): ElementControls {
  const { on = true, limits, immersive, doublePress, ...rest } = options;
  const base = { ...DEFAULT_LIMITS, ...limits };
  const get = (name: string): string | null => element.getAttribute(name);
  const immersiveNow = (): boolean => immersive === true || element.hasAttribute("immersive");
  const doublePressNow = (): boolean => {
    const attr = get("double-press");
    if (attr !== null) return attr.trim().toLowerCase() !== "off";
    return doublePress !== false;
  };
  const controller = createViewController({ ...rest, immersive: immersiveNow(), doublePress: doublePressNow(), limits: readLimits(get, base) });
  let off: (() => void) | undefined;
  let gaveTab = false;
  let gaveBlock = false;

  /** Let go of the hands; with `all`, of the tabindex and the block too (a bar standing in still needs them). */
  const hold = (all: boolean): void => {
    off?.();
    off = undefined;
    if (!all) return;
    if (gaveBlock) element.style.removeProperty("display");
    if (gaveTab) element.removeAttribute("tabindex");
    gaveBlock = false;
    gaveTab = false;
  };

  const apply = (changed?: string): void => {
    Object.assign(controller.limits, readLimits(get, base));
    if (changed === "immersive") controller.immersive = immersiveNow();
    if (changed === "double-press") controller.doublePress = doublePressNow();
    const { zoom } = controller.state;
    const { zoomMin, zoomMax } = controller.limits;
    if (zoom < zoomMin || zoom > zoomMax) controller.set({ zoom: Math.min(zoomMax, Math.max(zoomMin, zoom)) });
    if (element.hasAttribute(BAR_MARK)) element.dispatchEvent(new CustomEvent<{ limits: Limits; immersive: boolean }>(CARRY_EVENT, { detail: { limits: readLimits(get, base), immersive: immersiveNow() } }));
    const asked = get("controls");
    const wanted = asked === null ? on : asked !== "none";
    if (!wanted) hold(true);
    else {
      // A bar standing in, bound before the element started, still needs the focus for its keys and a block for its touch.
      if (!element.hasAttribute("tabindex")) {
        element.tabIndex = 0;
        gaveTab = true;
      }
      if (!gaveBlock && element.ownerDocument.defaultView?.getComputedStyle(element).display === "inline") {
        element.style.display = "block";
        gaveBlock = true;
      }
      if (element.hasAttribute(BAR_MARK)) hold(false);
      else if (off === undefined) off = controller.bind(element);
    }
  };

  const watch = typeof MutationObserver === "function" ? new MutationObserver((records) => {
    const names = records.map((record) => record.attributeName).filter((name): name is string => name !== null);
    if (names.length === 0) apply();
    else for (const name of names) apply(name);
  }) : undefined;
  watch?.observe(element, { attributes: true, attributeFilter: ["controls", "immersive", "double-press", "zoom-min", "zoom-max", "tilt-max", "roll-max", BAR_MARK] });
  const onBar = (): void => apply();
  element.addEventListener(BAR_EVENT, onBar);
  apply();

  return {
    controller,
    setLimits(next) {
      Object.assign(base, next);
      apply();
    },
    show(view) {
      controller.set(view, true, "show");
      if (element.hasAttribute(BAR_MARK)) element.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: view }));
    },
    unbind() {
      watch?.disconnect();
      element.removeEventListener(BAR_EVENT, onBar);
      hold(true);
      controller.destroy();
    },
  };
}
