// The controller: the view's state (angle, tilt, zoom, pan, whether it turns by itself, what a drag does) and the hands that change it:
// buttons and sliders through its methods, a pointer, two fingers, the wheel and the keys through `bind`. It never draws anything: it
// calls `onChange` with the new state and the page applies it to a canvas, WebGL, SVG or CSS 3D scene.
import { turnOnlyInSight } from "./sight.ts";
import { TURN_SPEED } from "./levels.ts";
import { between, clamp, clampPan, type Camera, DEFAULT_LIMITS, dragRoll, dragTurn, eulerFromQuat, type Limits, PAN_STEP, pendulumTilt, type PinchStart, pinchTo, type Point, quatFromEuler, quatIdentity, type Size, spinLocal, tumbleRates, WHEEL_GESTURE_MS, wheelMove, wheelZoomFactor, wrapYaw, ZOOMED, zoomAbout } from "./math.ts";
import { nextSwayGain, swayOffset, type Sway } from "./sway.ts";

import type { ChangeInfo, Clock, KeyTilt, ViewController, ViewControllerOptions, ViewState } from "./controller-types.ts";

export type { ChangeInfo, Clock, KeyTilt, Sway, ViewController, ViewControllerOptions, ViewState };

/** What `bind` leaves alone by default: the page's own controls inside the view. */
export const DEFAULT_IGNORE = "button, a, input, select, textarea, label, [data-kazoku-ignore]";

/** How long a move to the middle takes. */
const CENTRE_MS = 250;

const HANDLED_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "0", "Home"];

const positive = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined);

const browserClock = (): Clock => ({ request: (callback) => globalThis.requestAnimationFrame(callback), cancel: (id) => globalThis.cancelAnimationFrame(id) });

/**
 * Fired on the view before a double press zooms. Cancel it to keep the zoom and do your own.
 *
 * @example
 * scene.addEventListener("kazoku-doublepress", (event) => {
 *   event.preventDefault();
 * });
 */
export const DOUBLE_PRESS_EVENT = "kazoku-doublepress";

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
  let centring = 0;
  let stepping = false;
  let tiltPhase = 0;
  let fitScale = positive(options.fitScale) ?? 1;
  let start: "fit" | number = positive(options.zoom) ?? "fit";
  let atStart = true;
  const startState = (): number => (start === "fit" ? 1 : start / fitScale);
  const state: ViewState = { yaw: 0, tilt: 0, roll: 0, orientation: quatIdentity(), zoom: 1, panX: 0, panY: 0, turning: false, ...options.initial };
  if (state.orientation === undefined) state.orientation = quatIdentity();
  state.roll ??= 0;

  if (start !== "fit") state.zoom = clamp(startState(), limits.zoomMin, limits.zoomMax);
  atStart = state.zoom === clamp(startState(), limits.zoomMin, limits.zoomMax);

  const size = (): Size | undefined => {
    const own = sizeOf?.();
    if (own !== undefined) return own;
    if (bound === undefined) return undefined;
    const r = bound.getBoundingClientRect();
    return { width: r.width, height: r.height };
  };

  /** The view may move at any zoom (`freePan` a share above 0). */
  const isFree = (): boolean => {
    const share = controller.freePan;
    return share !== undefined && share > 0 && Number.isFinite(share);
  };
  /** A zoomed view, one that may move at any zoom, or an immersive one, takes every touch; at Fit the page may scroll. */
  const touchAction = (): string => (controller.immersive || state.zoom > ZOOMED || isFree() ? "none" : "pan-y");

  let swayGain = 0;
  let swayAt = 0;
  const nowOf = options.now ?? ((): number => (typeof performance !== "undefined" ? performance.now() : 0));
  /** The picture to draw. A drift is added only on a frame the view is already drawing, and never written into `state`. A settled frame is the state itself, so a still picture sits on the angle the reader chose. */
  const drawn = (final: boolean, reason: string): ViewState => {
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    const moving = reason === "auto" || reason === "centre" || reason === "drag" || reason === "pinch" || reason === "slider";
    if (final || reduced || controller.sway === "off" || !moving) {
      swayGain = 0;
      swayAt = 0;
      return { ...state };
    }
    const now = nowOf();
    const elapsed = swayAt === 0 ? 0 : now - swayAt;
    swayAt = now;
    const held = reason === "drag" || reason === "pinch" || reason === "slider";
    swayGain = nextSwayGain(swayGain, elapsed, held);
    if (swayGain === 0) return { ...state };
    const off = swayOffset(now, controller.sway);
    const g = swayGain;
    const camera = clampPan({
      yaw: wrapYaw(state.yaw + off.yaw * g),
      tilt: clamp(state.tilt + off.tilt * g, -limits.tiltMax, limits.tiltMax),
      roll: clamp(wrapYaw((state.roll ?? 0) + off.roll * g), -limits.rollMax, limits.rollMax),
      zoom: state.zoom,
      panX: state.panX + off.panX * g,
      panY: state.panY + off.panY * g,
    }, size(), controller.objectSize, controller.freePan);
    return { ...state, ...camera, orientation: quatFromEuler(camera.yaw, camera.tilt, camera.roll ?? 0) };
  };

  const emit = (final: boolean, reason: string): void => {
    if (bound !== undefined) bound.style.touchAction = touchAction();
    options.onChange?.(drawn(final, reason), { final, reason });
  };

  const stopCentre = (): void => {
    if (centring === 0) return;
    clock.cancel(centring);
    centring = 0;
  };

  const camera = (): Camera => ({ yaw: state.yaw, tilt: state.tilt, zoom: state.zoom, panX: state.panX, panY: state.panY });
  const shot = (): Camera => ({ ...camera(), roll: state.roll ?? 0 });

  /** Take a camera in, held to the limits and, once the view's size is known, to the room the zoom gives. */
  const pose = (): void => {
    state.orientation = quatFromEuler(state.yaw, state.tilt, state.roll ?? 0);
  };

  let freePan = options.freePan;
  let immersiveOn = options.immersive ?? false;

  const take = (next: Camera): void => {
    if (!stepping) stopCentre();
    const rollMax = limits.rollMax;
    const roll = clamp(wrapYaw(next.roll ?? state.roll ?? 0), -rollMax, rollMax);
    const held = clampPan({ ...next, roll, zoom: clamp(next.zoom, limits.zoomMin, limits.zoomMax), tilt: clamp(next.tilt, -limits.tiltMax, limits.tiltMax) }, size(), controller.objectSize, controller.freePan);
    state.yaw = controller.turnable ? wrapYaw(held.yaw) : state.yaw;
    state.tilt = controller.turnable ? held.tilt : state.tilt;
    state.roll = controller.turnable ? roll : state.roll;
    if (held.zoom !== state.zoom) atStart = false;
    state.zoom = held.zoom;
    state.panX = held.panX;
    state.panY = held.panY;
    pose();
    tiltPhase = Math.asin(clamp(state.tilt / (limits.tiltMax || 1), -1, 1));
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
    if (holds > 0 || centring !== 0) {
      last = 0;
      return;
    }
    const gap = last === 0 ? 0 : (now - last) / 1000;
    // The picture moves at most a tenth of a second in one frame, so a late frame does not jump. The limit counts the time that really passed, up to a second, so a turn that stops itself does so when that time has passed.
    const dt = Math.min(0.1, gap);
    last = now;
    if (gap === 0) return;
    const rate = controller.speed;
    if (controller.turnAxis === "tilt") stepTilt(dt, rate);
    else if (controller.turnAxis === "roll") stepRoll(dt, rate);
    else if (controller.turnAxis === "all") stepAll(dt);
    else {
      state.yaw = wrapYaw(state.yaw + rate * dt);
      pose();
    }
    turned += Math.min(gap, 1);
    emit(false, "auto");
    if (limit > 0 && turned >= limit) controller.pause();
  };

  /** Tilt within the limit swings back. At 90 degrees or more it rolls over on the quaternion, so the up axis never flips. */
  const stepTilt = (dt: number, rate: number): void => {
    if (limits.tiltMax >= 90) {
      state.orientation = spinLocal(state.orientation, 0, rate * dt, 0);
      const euler = eulerFromQuat(state.orientation);
      state.yaw = euler.yaw;
      state.tilt = euler.tilt;
      state.roll = euler.roll;
      return;
    }
    tiltPhase += (rate * dt * Math.PI) / 180;
    state.tilt = pendulumTilt(tiltPhase, limits.tiltMax);
    pose();
  };

  const stepRoll = (dt: number, rate: number): void => {
    const max = limits.rollMax;
    state.roll = max >= 180 ? wrapYaw((state.roll ?? 0) + rate * dt) : clamp((state.roll ?? 0) + rate * dt, -max, max);
    pose();
  };

  const stepAll = (dt: number): void => {
    const signs = { yaw: controller.speed, tilt: controller.tiltSign, roll: controller.rollSign };
    const rates = tumbleRates(turned, Math.abs(controller.speed), signs);
    if (limits.tiltMax >= 90) {
      state.orientation = spinLocal(state.orientation, rates.yaw * dt, rates.tilt * dt, rates.roll * dt);
      const euler = eulerFromQuat(state.orientation);
      state.yaw = euler.yaw;
      state.tilt = euler.tilt;
      state.roll = euler.roll;
      return;
    }
    state.yaw = wrapYaw(state.yaw + rates.yaw * dt);
    state.roll = wrapYaw((state.roll ?? 0) + rates.roll * dt);
    tiltPhase += (rates.tilt * dt * Math.PI) / 180;
    state.tilt = pendulumTilt(tiltPhase, limits.tiltMax);
    pose();
  };

  const controller: ViewController = {
    state,
    turnable: options.turnable ?? true,
    speed: options.speed ?? TURN_SPEED,
    turnAxis: options.turnAxis ?? "angle",
    tiltSign: 1,
    rollSign: 1,
    limits,
    ignore: options.ignore ?? DEFAULT_IGNORE,
    anchor: options.anchor,
    keyTilt: options.keyTilt ?? "drag",
    stopTurn: options.stopTurn ?? false,
    sway: options.sway ?? "off",
    doublePress: options.doublePress ?? true,
    get immersive() {
      return immersiveOn;
    },
    set immersive(on: boolean) {
      immersiveOn = on;
      if (bound !== undefined) bound.style.touchAction = touchAction();
    },
    tiltStep: options.tiltStep ?? 0,
    grabRadius: options.grabRadius ?? 0,
    objectSize: options.objectSize,
    get freePan() {
      return freePan;
    },
    set freePan(share: number | undefined) {
      freePan = share;
      if (bound !== undefined) bound.style.touchAction = touchAction();
    },
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
      const { turning, ...cam } = next;
      take({ ...camera(), ...cam });
      // "show" is the view telling the controls what it already shows. The page is not told again.
      if (reason === "show") return;
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
      take({ ...camera(), yaw: 0, tilt: 0, roll: 0 });
      emit(true, "front");
    },
    fit() {
      take({ ...camera(), zoom: 1, panX: 0, panY: 0 });
      emit(true, "fit");
    },
    centre(animate = true) {
      stopCentre();
      const from = camera();
      const to: Camera = { yaw: 0, tilt: 0, roll: 0, zoom: 1, panX: 0, panY: 0 };
      const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
      const same = from.yaw === 0 && from.tilt === 0 && from.zoom === 1 && from.panX === 0 && from.panY === 0;
      if (!animate || reduced || same || destroyed) {
        take(to);
        emit(true, "centre");
        return;
      }
      let began = -1;
      const step = (now: number): void => {
        if (began < 0) began = now;
        const fraction = (now - began) / CENTRE_MS;
        stepping = true;
        take(between(from, to, fraction));
        stepping = false;
        if (fraction >= 1) {
          centring = 0;
          emit(true, "centre");
          return;
        }
        emit(false, "centre");
        centring = clock.request(step);
      };
      centring = clock.request(step);
    },
    zoomAt(next, at, final = true) {
      take(zoomAbout(camera(), next, fromMiddle(at), limits, isFree()));
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
    bind(view) {
      bound = view;
      sizeOf = options.size;
      return bindHands(view);
    },
    destroy() {
      destroyed = true;
      stopCentre();
      clock.cancel(frame);
      state.turning = false;
      unbind?.();
    },
  };

  let unbind: (() => void) | undefined;

  function bindHands(view: HTMLElement): () => void {
    type Gesture =
      | { kind: "pinch"; start: PinchStart }
      | { kind: "pan" | "turn" | "roll"; x: number; y: number; camera: Camera; moved: boolean };
    const pointers = new Map<number, Point>();
    let gesture: Gesture | undefined;
    let holding = false;
    let lastTap = 0;
    let lastTapAt: Point = { x: 0, y: 0 };
    let menuOff = false;
    let menuUntil = 0;

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
      stopCentre();
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

    let space = false;
    let over = false;
    const showHand = (): void => {
      view.style.cursor = space && over ? "grab" : "";
    };
    const onEnter = (): void => {
      over = true;
      showHand();
    };
    const onLeave = (): void => {
      over = false;
      if (gesture?.kind !== "pan") showHand();
    };
    const typing = (target: EventTarget | null): boolean => {
      const node = target as Element | null;
      if (node === null || typeof node.closest !== "function") return false;
      if (node.closest("input, textarea, select") !== null) return true;
      const box = node.closest("[contenteditable]");
      if (box === null) return false;
      return (box.getAttribute("contenteditable") ?? "").toLowerCase() !== "false";
    };
    const dropSpace = (): void => {
      space = false;
      showHand();
    };
    /** A button, link or text field inside the view, and not the view. Space belongs to it. The walk stops at the view, so a link or button wrapped around the view does not take Space. */
    const handedTo = (target: EventTarget | null): Element | null => {
      const control = (start: Element | null): Element | null => {
        if (start === null || start === view || !view.contains(start)) return null;
        let node: Element | null = start;
        while (node !== null && node !== view) {
          if (node.matches("button, a, [role='button'], input, textarea, select")) return node;
          if (node.matches("[contenteditable]") && (node.getAttribute("contenteditable") ?? "").toLowerCase() !== "false") return node;
          node = node.parentElement;
        }
        return null;
      };
      const node = target as Element | null;
      const fromEvent = control(node !== null && typeof node.matches === "function" ? node : null);
      if (fromEvent !== null) return fromEvent;
      return control(view.ownerDocument.activeElement);
    };
    const onSpace = (e?: KeyboardEvent): void => {
      if (!e || (e.key !== " " && e.key !== "Spacebar")) return;
      if (e.type === "keyup") {
        dropSpace();
        return;
      }
      if (typing(e.target) || handedTo(e.target) !== null || (!over && gesture?.kind !== "pan")) return;
      space = true;
      showHand();
      e.preventDefault();
    };
    const onHide = (): void => {
      if (view.ownerDocument.visibilityState === "hidden") dropSpace();
    };
    const onBlur = (): void => dropSpace();

    const onDown = (e: PointerEvent): void => {
      if (e.pointerType === "mouse" && e.button > 2) return;
      if (ignored(e)) return;
      // the middle button moves the view: the browser's own autoscroll (Windows and Linux) would fight the drag
      if (e.button === 1) e.preventDefault?.();
      grab();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        view.setPointerCapture(e.pointerId);
      } catch {
        /* a pointer already gone */
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        gesture = { kind: "pinch", start: { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, angle: Math.atan2(b.y - a.y, b.x - a.x), camera: shot() } };
        release();
      } else if (pointers.size === 1) {
        // A plain left press and drag (and one finger) turns the piece at every zoom, so the hand never changes under the pointer. Shift and a left drag rolls. Ctrl or Command and a left drag, the middle or the right button, and Space, move the view. A flat view cannot turn, so a drag moves it. Reduced motion leaves these hands as they are.
        const grabbed = (e.ctrlKey || e.metaKey) && e.button === 0 && e.pointerType !== "touch";
        const rolling = e.shiftKey && e.button === 0 && !space && !grabbed;
        const pan = !rolling && (space || grabbed || e.button === 1 || e.button === 2 || !canTurn());
        gesture = { kind: rolling ? "roll" : pan ? "pan" : "turn", x: e.clientX, y: e.clientY, camera: shot(), moved: false };
        menuOff = pan && (grabbed || e.button === 2);
        if (pan && (space || grabbed || e.button === 1)) view.style.cursor = "grabbing";
        if (!pan) hold();
      }
      view.dataset.grab = "1";
    };

    /** A middle-button press inside the view starts no autoscroll: it moves the view. */
    const onMouseDown = (e: MouseEvent): void => {
      if (e.button === 1 && !ignored(e)) e.preventDefault();
    };

    const onMove = (e: PointerEvent): void => {
      const p = pointers.get(e.pointerId);
      if (p === undefined || gesture === undefined) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (gesture.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()] as [Point, Point];
        take(pinchTo(gesture.start, a, b, centre(), limits, isFree()));
        emit(false, "pinch");
      } else if (gesture.kind === "pan") {
        if (Math.abs(e.clientX - gesture.x) + Math.abs(e.clientY - gesture.y) > 3) gesture.moved = true;
        if (state.zoom > 1 || isFree()) {
          take({ ...camera(), panX: gesture.camera.panX + (e.clientX - gesture.x), panY: gesture.camera.panY + (e.clientY - gesture.y) });
          emit(false, "drag");
        }
      } else if (gesture.kind === "roll") {
        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) gesture.moved = true;
        if (!canTurn()) return;
        const r = view.getBoundingClientRect();
        const radius = controller.grabRadius === "fit" ? Math.min(r.width, r.height) / 2 : controller.grabRadius;
        take({ ...gesture.camera, roll: dragRoll(gesture.camera, dx, { width: r.width, height: r.height }, radius * gesture.camera.zoom) });
        emit(false, "drag");
      } else if (gesture.kind === "turn") {
        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) gesture.moved = true;
        if (!canTurn()) return;
        const r = view.getBoundingClientRect();
        // Up and down tips it for a mouse; on a finger the browser keeps the vertical drag to scroll the page, and the tilt slider tips it.
        const radius = controller.grabRadius === "fit" ? Math.min(r.width, r.height) / 2 : controller.grabRadius;
        take({ ...camera(), ...dragTurn(gesture.camera, dx, dy, { width: r.width, height: r.height }, e.pointerType !== "touch" || controller.immersive, limits, controller.tiltStep, radius * gesture.camera.zoom) });
        emit(false, "drag");
      }
    };

    const onUp = (e: PointerEvent): void => {
      if (!pointers.delete(e.pointerId)) return;
      const wasPinch = gesture?.kind === "pinch";
      const moved = gesture?.kind !== "pinch" && gesture?.moved === true;
      if (menuOff && moved) menuUntil = e.timeStamp + 400;
      menuOff = false;
      if (pointers.size === 1) {
        // One finger left of a pinch carries on as a drag from where it is.
        const [rest] = [...pointers.values()] as [Point];
        gesture = { kind: "pan", x: rest.x, y: rest.y, camera: camera(), moved: true };
        emit(true, "pinch");
      } else if (pointers.size === 0) {
        gesture = undefined;
        release();
        delete view.dataset.grab;
        showHand();
        emit(true, "drag");
        // A double press (two quick taps or clicks, hardly moved): in to 2x where it was pressed, and again back to 1x.
        // Off, or a page that cancels kazoku-doublepress, leaves the zoom alone so the page can step its own stops.
        if (!wasPinch && !moved && e.type === "pointerup") {
          if (e.timeStamp - lastTap < 350 && Math.hypot(e.clientX - lastTapAt.x, e.clientY - lastTapAt.y) < 24) {
            lastTap = 0;
            if (controller.doublePress) {
              const next = state.zoom > ZOOMED ? 1 : 2;
              const told = new CustomEvent(DOUBLE_PRESS_EVENT, { bubbles: true, cancelable: true, detail: { x: e.clientX, y: e.clientY, zoom: state.zoom, next } });
              if (view.dispatchEvent(told)) controller.zoomAt(next, { x: e.clientX, y: e.clientY });
            }
          } else {
            lastTap = e.timeStamp;
            lastTapAt = { x: e.clientX, y: e.clientY };
          }
        }
      }
    };

    // The plain wheel moves the view, and Shift and the wheel moves it sideways. Ctrl, Command or Alt and the wheel, and a pinch, zoom about the pointer.
    // At Fit there is nothing to move, so the plain wheel scrolls the page. Once zoomed in, the wheel moves the view, and a new turn that starts already at the edge of that move scrolls the page again.
    // A turn that reaches the edge part-way through stays with the view, so the page does not jump. Only the PLAIN wheel may pass to the page: a trackpad's pinch arrives as Ctrl and the wheel,
    // and the browser turns one the view leaves alone into a zoom of the whole page, so Ctrl or Command and the wheel is always the view's, at every zoom and at both ends of the range.
    let wheelTaken = Number.NEGATIVE_INFINITY;
    const onWheel = (e: WheelEvent): void => {
      const pinch = e.ctrlKey || e.metaKey;
      if (pinch) e.preventDefault();
      const now = Number.isFinite(e.timeStamp) ? e.timeStamp : 0;
      const continuing = now - wheelTaken < WHEEL_GESTURE_MS && now >= wheelTaken;
      const asked = wheelMove(e, view.getBoundingClientRect().height || 800);
      // A sideways-only wheel has no deltaY. It is not a zoom: immersive used to call zoomAt with a factor of 1.
      if (!asked.zoom && controller.immersive && !e.shiftKey && e.deltaY === 0) return;
      // Immersive: the plain wheel zooms about the pointer. Shift still moves sideways, and Ctrl, Command and Alt still zoom.
      const zooming = asked.zoom || (controller.immersive && !e.shiftKey);
      if (zooming) {
        const factor = wheelZoomFactor(e.deltaY, e.deltaMode, pinch ? "pinch" : "wheel");
        const atEnd = factor >= 1 ? state.zoom >= limits.zoomMax : state.zoom <= limits.zoomMin;
        const own = pinch || controller.immersive;
        if (!own && atEnd && !continuing) return;
        e.preventDefault();
        wheelTaken = now;
        if (atEnd) return;
        grab();
        controller.zoomAt(state.zoom * factor, { x: e.clientX, y: e.clientY });
        return;
      }
      const next = clampPan({ ...camera(), panX: state.panX + asked.panX, panY: state.panY + asked.panY }, size(), controller.objectSize, controller.freePan);
      const moved = next.panX !== state.panX || next.panY !== state.panY;
      if (!moved && !continuing) return;
      e.preventDefault();
      wheelTaken = now;
      if (!moved) return;
      grab();
      take(next);
      emit(true, "wheel");
    };

    // Safari's trackpad pinch is not a Ctrl and wheel event but gesturestart, gesturechange and gestureend, and Safari zooms the whole page unless each is prevented. `scale` is the pinch's size since it started, so the view zooms to
    // the zoom it had at the start times the scale, about the fingers' middle. A finger pinch on a touch screen also makes these events (iOS) beside its pointer events, which already zoom the view, so then they are only prevented.
    let gestureZoom = 1;
    let gestureStarted = false;
    const onGesture = (e: Event): void => {
      e.preventDefault();
      if (e.type === "gesturestart") {
        gestureZoom = state.zoom;
        gestureStarted = true;
        return;
      }
      if (e.type === "gestureend") gestureStarted = false;
      const { scale, clientX, clientY } = e as Event & { scale?: number; clientX?: number; clientY?: number };
      if (e.type !== "gesturechange" || !gestureStarted || gesture?.kind === "pinch" || typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0) return;
      grab();
      controller.zoomAt(gestureZoom * scale, typeof clientX === "number" && typeof clientY === "number" ? { x: clientX, y: clientY } : undefined);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!HANDLED_KEYS.includes(e.key)) return;
      grab();
      const up = controller.keyTilt === "wheel" ? -5 : 5;
      const step = 15;
      const turn = (next: Partial<ViewState>): void => {
        if (canTurn()) controller.set(next, true, "key");
      };
      switch (e.key) {
        case "ArrowLeft": turn(e.shiftKey ? { roll: (state.roll ?? 0) - step } : { yaw: state.yaw - step }); break;
        case "ArrowRight": turn(e.shiftKey ? { roll: (state.roll ?? 0) + step } : { yaw: state.yaw + step }); break;
        case "ArrowUp": turn({ tilt: state.tilt + up }); break;
        case "ArrowDown": turn({ tilt: state.tilt - up }); break;
        case "+": case "=": controller.zoomBy(1.25); break;
        case "-": case "_": controller.zoomBy(1 / 1.25); break;
        case "0": case "Home": controller.front(); controller.fit(); break;
        default: return;
      }
      e.preventDefault();
    };

    // The browser's menu stays out of a pan made with Ctrl (a Ctrl-click opens it on macOS) or the right button: while the press is down, and for a moment after a moved one (Windows and Linux open it on release). A click that moves nothing leaves the menu alone.
    const onMenu = (e: Event): void => {
      if (menuOff || e.timeStamp < menuUntil) e.preventDefault();
    };
    const doc = view.ownerDocument;
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp);
    view.addEventListener("pointercancel", onUp);
    view.addEventListener("pointerenter", onEnter);
    view.addEventListener("pointerleave", onLeave);
    view.addEventListener("wheel", onWheel, { passive: false });
    view.addEventListener("gesturestart", onGesture);
    view.addEventListener("gesturechange", onGesture);
    view.addEventListener("gestureend", onGesture);
    view.addEventListener("keydown", onKey);
    doc.addEventListener?.("keydown", onSpace, true);
    doc.addEventListener?.("keyup", onSpace, true);
    doc.addEventListener?.("visibilitychange", onHide);
    doc.defaultView?.addEventListener?.("blur", onBlur);
    view.addEventListener("contextmenu", onMenu);
    view.addEventListener("mousedown", onMouseDown);
    view.style.touchAction = touchAction();
    const unwatch = turnOnlyInSight(controller, view);
    const off = (): void => {
      unwatch();
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
      view.removeEventListener("pointercancel", onUp);
      view.removeEventListener("pointerenter", onEnter);
      view.removeEventListener("pointerleave", onLeave);
      view.removeEventListener("wheel", onWheel);
      view.removeEventListener("gesturestart", onGesture);
      view.removeEventListener("gesturechange", onGesture);
      view.removeEventListener("gestureend", onGesture);
      view.removeEventListener("keydown", onKey);
      doc.removeEventListener?.("keydown", onSpace, true);
      doc.removeEventListener?.("keyup", onSpace, true);
      doc.removeEventListener?.("visibilitychange", onHide);
      doc.defaultView?.removeEventListener?.("blur", onBlur);
      view.removeEventListener("contextmenu", onMenu);
      view.removeEventListener("mousedown", onMouseDown);
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
