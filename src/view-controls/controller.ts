// The controller: the view's state (angle, tilt, zoom, pan, whether it turns by itself, what a drag does) and the hands that change it:
// buttons and sliders through its methods, a pointer, two fingers, the wheel and the keys through `bind`. It never draws anything: it
// calls `onChange` with the new state and the page applies it to a canvas, WebGL, SVG or CSS 3D scene.
import type { DragMode } from "./address.ts";
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
  set(next: Partial<ViewState>, final?: boolean, reason?: string): void;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Hold the automatic turn still while a hand (a slider being dragged) has the angle; `releaseTurn` lets it carry on from where the hand left it. Counts, so holds nest. */
  holdTurn(): void;
  releaseTurn(): void;
  front(): void;
  fit(): void;
  /** Zoom to `next` about the point `at` (client pixels; the view's middle when left out). */
  zoomAt(next: number, at?: Point, final?: boolean): void;
  zoomBy(factor: number, at?: Point): void;
  /** Move the view by whole fractions of its size: `panBy(1, 0)` is a quarter of its width to the right. */
  panBy(stepsX: number, stepsY: number): void;
  setDrag(drag: DragMode): void;
  /** Bind the pointer, pinch, wheel and key hands to `view`. Returns a function that unbinds them. */
  bind(view: HTMLElement): () => void;
  destroy(): void;
}

const browserClock = (): Clock => ({ request: (callback) => globalThis.requestAnimationFrame(callback), cancel: (id) => globalThis.cancelAnimationFrame(id) });

export function createViewController(options: ViewControllerOptions = {}): ViewController {
  const limits: Limits = { ...DEFAULT_LIMITS, ...options.limits };
  const clock = options.clock ?? browserClock();
  let sizeOf = options.size;
  let bound: HTMLElement | undefined;
  let frame = 0;
  let last = 0;
  let holds = 0;
  const state: ViewState = { yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0, turning: false, drag: "move", ...options.initial };

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
    state.zoom = held.zoom;
    state.panX = held.panX;
    state.panY = held.panY;
  };

  const centre = (): Point => {
    if (bound === undefined) return { x: 0, y: 0 };
    const r = bound.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  /** Client pixels to pixels from the view's middle. */
  const fromMiddle = (at: Point | undefined): Point => {
    if (at === undefined) return { x: 0, y: 0 };
    const c = centre();
    return { x: at.x - c.x, y: at.y - c.y };
  };

  const tick = (now: number): void => {
    if (!state.turning) return;
    frame = clock.request(tick);
    if (holds > 0) {
      last = 0;
      return;
    }
    const dt = last === 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    if (dt === 0) return;
    state.yaw = wrapYaw(state.yaw + controller.speed * dt);
    emit(false, "auto");
  };

  const controller: ViewController = {
    state,
    turnable: options.turnable ?? true,
    speed: options.speed ?? 30,
    limits,
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
    play() {
      if (state.turning || !controller.turnable) return;
      state.turning = true;
      last = 0;
      frame = clock.request(tick);
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

    const onDown = (e: PointerEvent): void => {
      if (e.pointerType === "mouse" && e.button > 2) return;
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
        take({ ...camera(), ...dragTurn(gesture.camera, dx, dy, { width: r.width, height: r.height }, e.pointerType !== "touch", limits) });
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
        controller.zoomAt(state.zoom * wheelZoomFactor(e.deltaY, e.deltaMode), { x: e.clientX, y: e.clientY });
        return;
      }
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const focused = view.ownerDocument.activeElement === view;
      // A sideways swipe turns it wherever the pointer is over it; an up and down wheel only when the view has focus, as the page's scroll comes first.
      if (!horizontal && !focused) return;
      e.preventDefault();
      if (!canTurn()) return;
      if (horizontal || e.shiftKey) controller.set({ yaw: state.yaw + (e.deltaX || e.deltaY) * 0.3 }, true, "wheel");
      else controller.set({ tilt: Math.round(state.tilt + e.deltaY * 0.15) }, true, "wheel");
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const big = e.shiftKey ? 45 : 15;
      const turn = (next: Partial<ViewState>): void => {
        if (canTurn()) controller.set(next, true, "key");
      };
      switch (e.key) {
        case "ArrowLeft": turn({ yaw: state.yaw - big }); break;
        case "ArrowRight": turn({ yaw: state.yaw + big }); break;
        case "ArrowUp": turn({ tilt: state.tilt + 5 }); break;
        case "ArrowDown": turn({ tilt: state.tilt - 5 }); break;
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
    const off = (): void => {
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
