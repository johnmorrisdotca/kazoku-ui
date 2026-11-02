// The controller: the view's state (angle, tilt, zoom, pan, whether it turns by itself, what a drag does) and the hands that change it:
// buttons and sliders through its methods, a pointer, two fingers, the wheel and the keys through `bind`. It never draws anything: it
// calls `onChange` with the new state and the page applies it to a canvas, WebGL, SVG or CSS 3D scene.
import type { DragMode } from "./address.ts";
import { turnOnlyInSight } from "./sight.ts";
import { clamp, clampPan, type Camera, DEFAULT_LIMITS, dragTurn, type Limits, PAN_STEP, type PinchStart, pinchTo, type Point, type Size, wheelZoomFactor, wrapYaw, ZOOMED, zoomAbout } from "./math.ts";

export interface ViewState extends Camera {
  /** True while the view turns by itself. A control never changes this; only play, pause and a grab of the view's own do not either (see `holdTurn`). */
  turning: boolean;
  /** What a plain drag does while zoomed in: move the view, or turn the piece. */
  drag: DragMode;
}

export interface ChangeInfo {
  /** False for the steps of a drag, a pinch, a slider or the automatic turn; true when something settled (a button, a release, a key, a wheel step). */
  final: boolean;
  /** What changed it: "set", "auto", "drag", "pinch", "wheel", "key", "zoom", "pan", "front", "fit", "play", "pause", "tap". */
  reason: string;
}

/** What `bind` leaves alone by default: the page's own controls inside the view. */
export const DEFAULT_IGNORE = "button, a, input, select, textarea, label, [data-kazoku-ignore]";

/** Which way Arrow Up tips the view: like a drag up (`"drag"`, the default) or the way the wheel turned up does (`"wheel"`, the other way). */
export type KeyTilt = "drag" | "wheel";

export interface Clock {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export interface ViewControllerOptions {
  initial?: Partial<ViewState>;
  /** False for a flat view that cannot turn: a drag then always moves it and the angle and tilt never change. */
  turnable?: boolean;
  /** Degrees a second when it turns by itself. */
  speed?: number;
  limits?: Partial<Limits>;
  /** The starting zoom: "fit" (the default) or a scale where 1 is the scene's natural size; it opens at that scale divided by `fitScale`. With `fitScale` left at 1 a number is a zoom as `ViewState.zoom` has it. `initial.zoom` is used only when this is left out. */
  zoom?: "fit" | number;
  /** The page's scale when the view is at Fit (`state.zoom` 1): what zoom 1 means. The scene is drawn at `state.zoom * fitScale`. 1 by default. */
  fitScale?: number;
  /** A CSS selector for what inside the view `bind` leaves alone: a press on a match is not captured, so its click goes through. An empty string leaves nothing alone. */
  ignore?: string;
  /** The point the zoom buttons and keys zoom about, in content coordinates: CSS pixels from the view's middle when it is at Fit (zoom 1, no pan). It moves with the picture, so the point stays where it is on screen while the view zooms. Left out, they zoom about the view's middle. */
  anchor?: Point;
  /** Which way Arrow Up tips the view: `"drag"` (the default, as a drag up) or `"wheel"` (as a wheel turned up). */
  keyTilt?: KeyTilt;
  /** True to stop the automatic turn when the reader presses the view, uses the wheel on it or presses a key it handles. False (the default) lets it carry on. Buttons and sliders never stop it. */
  stopTurn?: boolean;
  /** Round the tilt of a drag to a multiple of this many degrees; 0 (the default) leaves it unrounded, 1 gives whole degrees. */
  tiltStep?: number;
  /** The view's size in CSS pixels, for holding the pan; `bind` gives it from the element when this is left out. */
  size?: () => Size | undefined;
  onChange?: (state: ViewState, info: ChangeInfo) => void;
  /** Animation frames; the browser's requestAnimationFrame by default. A test passes its own. */
  clock?: Clock;
}

export interface ViewController {
  readonly state: ViewState;
  turnable: boolean;
  speed: number;
  readonly limits: Limits;
  /** What a pointer press leaves alone inside the view (see `ViewControllerOptions.ignore`). Can be changed at any time. */
  ignore: string;
  /** The point the buttons and keys zoom about (see `ViewControllerOptions.anchor`); `undefined` for the view's middle. Can be changed at any time. */
  anchor: Point | undefined;
  keyTilt: KeyTilt;
  stopTurn: boolean;
  tiltStep: number;
  /** What zoom 1 means to the page (see `ViewControllerOptions.fitScale`). */
  readonly fitScale: number;
  /** The `state.zoom` the view opens at: 1 for "fit", else the starting scale divided by `fitScale`. The address leaves a zoom at this value out. */
  readonly startZoom: number;
  /** Tell the controller what zoom 1 means. If the reader has not zoomed since the start, the view moves to the starting zoom for the new scale. */
  setFitScale(scale: number): void;
  /** Start at "fit" or at a scale relative to natural size, and go there now. */
  setStartZoom(zoom: "fit" | number): void;
  set(next: Partial<ViewState>, final?: boolean, reason?: string): void;
  /** Turn by itself (never after `destroy`). With `seconds`, stop by itself (as `pause`) after that many seconds of turning; time spent suspended does not count. `toggle` and a bare `play()` turn without a limit. */
  play(seconds?: number): void;
  pause(): void;
  toggle(): void;
  /** Stop the frame loop while nothing can see the view (it is off screen, the tab is hidden): no frames are asked for and no "auto" change is sent. `state.turning` stays true. Counts, so suspends nest. */
  suspendTurn(): void;
  /** Undo one `suspendTurn`; the turn goes on from where it was when the last one is undone. */
  resumeTurn(): void;
  /** Hold the automatic turn still while a hand (a slider being dragged) has the angle; `releaseTurn` lets it carry on from where the hand left it. Counts, so holds nest. */
  holdTurn(): void;
  releaseTurn(): void;
  front(): void;
  fit(): void;
  /** Zoom to `next` about the point `at` (client pixels); left out, about the `anchor`, else the view's middle. */
  zoomAt(next: number, at?: Point, final?: boolean): void;
  zoomBy(factor: number, at?: Point): void;
  /** Move the view by whole fractions of its size: `panBy(1, 0)` is a quarter of its width to the right. */
  panBy(stepsX: number, stepsY: number): void;
  setDrag(drag: DragMode): void;
  /** Bind the pointer, pinch, wheel and key hands to `view`, and hold the automatic turn while `view` is off screen or the tab is hidden. Returns a function that unbinds them. */
  bind(view: HTMLElement): () => void;
  destroy(): void;
}

const HANDLED_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "0", "Home"];

const positive = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined);

const browserClock = (): Clock => ({ request: (callback) => globalThis.requestAnimationFrame(callback), cancel: (id) => globalThis.cancelAnimationFrame(id) });

export function createViewController(options: ViewControllerOptions = {}): ViewController {
  const limits: Limits = { ...DEFAULT_LIMITS, ...options.limits };
  const clock = options.clock ?? browserClock();
  let sizeOf = options.size;
  let bound: HTMLElement | undefined;
  let frame = 0;
  let last = 0;
  let holds = 0;
  let suspends = 0;
  let limit = 0;
  let turned = 0;
  let destroyed = false;
  let fitScale = positive(options.fitScale) ?? 1;
  let start: "fit" | number = positive(options.zoom) ?? "fit";
  let atStart = true;
  const startState = (): number => (start === "fit" ? 1 : start / fitScale);
  const state: ViewState = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0, turning: false, drag: "move", ...options.initial };

  if (start !== "fit") state.zoom = clamp(startState(), limits.zoomMin, limits.zoomMax);
  atStart = state.zoom === clamp(startState(), limits.zoomMin, limits.zoomMax);

  const size = (): Size | undefined => {
    const own = sizeOf?.();
    if (own !== undefined) return own;
    if (bound === undefined) return undefined;
    const r = bound.getBoundingClientRect();
    return { width: r.width, height: r.height };
  };

  const emit = (final: boolean, reason: string): void => {
    if (bound !== undefined) bound.style.touchAction = state.zoom > ZOOMED ? "none" : "pan-y";
    options.onChange?.({ ...state }, { final, reason });
  };

  const camera = (): Camera => ({ yaw: state.yaw, tilt: state.tilt, zoom: state.zoom, panX: state.panX, panY: state.panY });

  /** Take a camera in, held to the limits and, once the view's size is known, to the room the zoom gives. */
  const take = (next: Camera): void => {
    const held = clampPan({ ...next, zoom: clamp(next.zoom, limits.zoomMin, limits.zoomMax), tilt: clamp(next.tilt, -limits.tiltMax, limits.tiltMax) }, size());
    state.yaw = controller.turnable ? wrapYaw(held.yaw) : state.yaw;
    state.tilt = controller.turnable ? held.tilt : state.tilt;
    if (held.zoom !== state.zoom) atStart = false;
    state.zoom = held.zoom;
    state.panX = held.panX;
    state.panY = held.panY;
  };

  const centre = (): Point => {
    if (bound === undefined) return { x: 0, y: 0 };
    const r = bound.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  /** Client pixels to pixels from the view's middle; with none, the anchor's place on screen now, else the middle. */
  const fromMiddle = (at: Point | undefined): Point => {
    if (at === undefined) {
      const a = controller.anchor;
      return a === undefined ? { x: 0, y: 0 } : { x: state.panX + state.zoom * a.x, y: state.panY + state.zoom * a.y };
    }
    const c = centre();
    return { x: at.x - c.x, y: at.y - c.y };
  };

  const tick = (now: number): void => {
    if (!state.turning || suspends > 0) return;
    frame = clock.request(tick);
    if (holds > 0) {
      last = 0;
      return;
    }
    const dt = last === 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    if (dt === 0) return;
    state.yaw = wrapYaw(state.yaw + controller.speed * dt);
    turned += dt;
    emit(false, "auto");
    if (limit > 0 && turned >= limit) controller.pause();
  };

  const controller: ViewController = {
    state,
    turnable: options.turnable ?? true,
    speed: options.speed ?? 30,
    limits,
    ignore: options.ignore ?? DEFAULT_IGNORE,
    anchor: options.anchor,
    keyTilt: options.keyTilt ?? "drag",
    stopTurn: options.stopTurn ?? false,
    tiltStep: options.tiltStep ?? 0,
    get fitScale() {
      return fitScale;
    },
    get startZoom() {
      return clamp(startState(), limits.zoomMin, limits.zoomMax);
    },
    setFitScale(scale) {
      const next = positive(scale);
      if (next === undefined || next === fitScale) return;
      fitScale = next;
      if (!atStart) return;
      const before = state.zoom;
      take({ ...camera(), zoom: startState() });
      atStart = true;
      if (state.zoom !== before) emit(true, "fit-scale");
    },
    setStartZoom(zoom) {
      start = positive(zoom) ?? "fit";
      take({ ...camera(), zoom: startState() });
      atStart = true;
      emit(true, "set");
    },
    set(next, final = true, reason = "set") {
      const { turning, drag, ...cam } = next;
      take({ ...camera(), ...cam });
      if (drag !== undefined) state.drag = drag;
      if (turning !== undefined && turning !== state.turning) {
        if (turning) controller.play();
        else controller.pause();
        return;
      }
      emit(final, reason);
    },
    play(seconds) {
      if (destroyed || state.turning || !controller.turnable) return;
      state.turning = true;
      last = 0;
      turned = 0;
      limit = positive(seconds) ?? 0;
      if (suspends === 0) frame = clock.request(tick);
      emit(true, "play");
    },
    pause() {
      if (!state.turning) return;
      state.turning = false;
      clock.cancel(frame);
      emit(true, "pause");
    },
    toggle() {
      if (state.turning) controller.pause();
      else controller.play();
    },
    suspendTurn() {
      suspends += 1;
      if (suspends === 1) clock.cancel(frame);
    },
    resumeTurn() {
      if (suspends === 0) return;
      suspends -= 1;
      if (suspends > 0 || !state.turning) return;
      last = 0;
      frame = clock.request(tick);
    },
    holdTurn() {
      holds += 1;
    },
    releaseTurn() {
      holds = Math.max(0, holds - 1);
      last = 0;
    },
    front() {
      take({ ...camera(), yaw: 0, tilt: 0 });
      emit(true, "front");
    },
    fit() {
      take({ ...camera(), zoom: 1, panX: 0, panY: 0 });
      emit(true, "fit");
    },
    zoomAt(next, at, final = true) {
      take(zoomAbout(camera(), next, fromMiddle(at), limits));
      emit(final, "zoom");
    },
    zoomBy(factor, at) {
      controller.zoomAt(state.zoom * factor, at);
    },
    panBy(stepsX, stepsY) {
      const s = size();
      take({ ...camera(), panX: state.panX + stepsX * (s?.width ?? 0) * PAN_STEP, panY: state.panY + stepsY * (s?.height ?? 0) * PAN_STEP });
      emit(true, "pan");
    },
    setDrag(drag) {
      state.drag = drag;
      emit(true, "set");
    },
    bind(view) {
      bound = view;
      sizeOf = options.size;
      return bindHands(view);
    },
    destroy() {
      destroyed = true;
      clock.cancel(frame);
      state.turning = false;
      unbind?.();
    },
  };

  let unbind: (() => void) | undefined;

  function bindHands(view: HTMLElement): () => void {
    type Gesture =
      | { kind: "pinch"; start: PinchStart }
      | { kind: "pan" | "turn"; x: number; y: number; camera: Camera; moved: boolean };
    const pointers = new Map<number, Point>();
    let gesture: Gesture | undefined;
    let holding = false;
    let lastTap = 0;
    let lastTapAt: Point = { x: 0, y: 0 };

    const hold = (): void => {
      if (!holding) controller.holdTurn();
      holding = true;
    };
    const release = (): void => {
      if (holding) controller.releaseTurn();
      holding = false;
    };
    const canTurn = (): boolean => controller.turnable;
    const grab = (): void => {
      if (controller.stopTurn) controller.pause();
    };

    const ignored = (e: Event): boolean => {
      if (controller.ignore === "") return false;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      try {
        if (path.length === 0) {
          const target = e.target as Element | null;
          const hit = typeof target?.closest === "function" ? target.closest(controller.ignore) : null;
          return hit !== null && hit !== view && view.contains(hit);
        }
        for (const node of path) {
          if (node === view) return false;
          if (typeof (node as Element).matches === "function" && (node as Element).matches(controller.ignore)) return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    const onDown = (e: PointerEvent): void => {
      if (e.pointerType === "mouse" && e.button > 2) return;
      if (ignored(e)) return;
      grab();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        view.setPointerCapture(e.pointerId);
      } catch {
        /* a pointer already gone */
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        gesture = { kind: "pinch", start: { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, camera: camera() } };
        release();
      } else if (pointers.size === 1) {
        // At 1x a plain press and drag turns the piece; zoomed in it moves the view unless the Turn choice is made. Shift, the middle or the right button always move a zoomed view. A flat view cannot turn, so a drag moves it.
        const pan = e.button === 1 || e.button === 2 || e.shiftKey || (state.zoom > ZOOMED && (!canTurn() || state.drag !== "turn"));
        gesture = { kind: pan ? "pan" : "turn", x: e.clientX, y: e.clientY, camera: camera(), moved: false };
        if (!pan) hold();
      }
      view.dataset.grab = "1";
    };

    const onMove = (e: PointerEvent): void => {
      const p = pointers.get(e.pointerId);
      if (p === undefined || gesture === undefined) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (gesture.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        take(pinchTo(gesture.start, a, b, centre(), limits));
        emit(false, "pinch");
      } else if (gesture.kind === "pan") {
        if (state.zoom > 1) {
          take({ ...camera(), panX: gesture.camera.panX + (e.clientX - gesture.x), panY: gesture.camera.panY + (e.clientY - gesture.y) });
          emit(false, "drag");
        }
      } else if (gesture.kind === "turn") {
        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) gesture.moved = true;
        if (!canTurn()) return;
        const r = view.getBoundingClientRect();
        // Up and down tips it for a mouse; on a finger the browser keeps the vertical drag to scroll the page, and the tilt slider tips it.
        take({ ...camera(), ...dragTurn(gesture.camera, dx, dy, { width: r.width, height: r.height }, e.pointerType !== "touch", limits, controller.tiltStep) });
        emit(false, "drag");
      }
    };

    const onUp = (e: PointerEvent): void => {
      if (!pointers.delete(e.pointerId)) return;
      const wasPinch = gesture?.kind === "pinch";
      const moved = gesture?.kind !== "pinch" && gesture?.moved === true;
      if (pointers.size === 1) {
        // One finger left of a pinch carries on as a drag from where it is.
        const [rest] = [...pointers.values()] as [Point];
        gesture = { kind: "pan", x: rest.x, y: rest.y, camera: camera(), moved: true };
        emit(true, "pinch");
      } else if (pointers.size === 0) {
        gesture = undefined;
        release();
        delete view.dataset.grab;
        emit(true, "drag");
        // A double press (two quick taps or clicks, hardly moved): in to 2x where it was pressed, and again back to 1x.
        if (!wasPinch && !moved && e.type === "pointerup") {
          if (e.timeStamp - lastTap < 350 && Math.hypot(e.clientX - lastTapAt.x, e.clientY - lastTapAt.y) < 24) {
            lastTap = 0;
            controller.zoomAt(state.zoom > ZOOMED ? 1 : 2, { x: e.clientX, y: e.clientY });
          } else {
            lastTap = e.timeStamp;
            lastTapAt = { x: e.clientX, y: e.clientY };
          }
        }
      }
    };

    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        // A trackpad's pinch arrives as Ctrl and the wheel; Command and the wheel does the same for a mouse.
        e.preventDefault();
        grab();
        controller.zoomAt(state.zoom * wheelZoomFactor(e.deltaY, e.deltaMode), { x: e.clientX, y: e.clientY });
        return;
      }
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const focused = view.ownerDocument.activeElement === view;
      // A sideways swipe turns it wherever the pointer is over it; an up and down wheel only when the view has focus, as the page's scroll comes first.
      if (!horizontal && !focused) return;
      e.preventDefault();
      if (!canTurn()) return;
      grab();
      if (horizontal || e.shiftKey) controller.set({ yaw: state.yaw + (e.deltaX || e.deltaY) * 0.3 }, true, "wheel");
      else controller.set({ tilt: Math.round(state.tilt + e.deltaY * 0.15) }, true, "wheel");
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!HANDLED_KEYS.includes(e.key)) return;
      grab();
      const up = controller.keyTilt === "wheel" ? -5 : 5;
      const big = e.shiftKey ? 45 : 15;
      const turn = (next: Partial<ViewState>): void => {
        if (canTurn()) controller.set(next, true, "key");
      };
      switch (e.key) {
        case "ArrowLeft": turn({ yaw: state.yaw - big }); break;
        case "ArrowRight": turn({ yaw: state.yaw + big }); break;
        case "ArrowUp": turn({ tilt: state.tilt + up }); break;
        case "ArrowDown": turn({ tilt: state.tilt - up }); break;
        case "+": case "=": controller.zoomBy(1.25); break;
        case "-": case "_": controller.zoomBy(1 / 1.25); break;
        case "0": case "Home": controller.front(); controller.fit(); break;
        default: return;
      }
      e.preventDefault();
    };

    const onMenu = (e: Event): void => e.preventDefault();
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp);
    view.addEventListener("pointercancel", onUp);
    view.addEventListener("wheel", onWheel, { passive: false });
    view.addEventListener("keydown", onKey);
    // A right press is a pan, not the browser's menu.
    view.addEventListener("contextmenu", onMenu);
    view.style.touchAction = state.zoom > ZOOMED ? "none" : "pan-y";
    const unwatch = turnOnlyInSight(controller, view);
    const off = (): void => {
      unwatch();
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
      view.removeEventListener("pointercancel", onUp);
      view.removeEventListener("wheel", onWheel);
      view.removeEventListener("keydown", onKey);
      view.removeEventListener("contextmenu", onMenu);
      view.style.touchAction = "";
      release();
      if (bound === view) bound = undefined;
      unbind = undefined;
    };
    unbind = off;
    return off;
  }

  return controller;
}
