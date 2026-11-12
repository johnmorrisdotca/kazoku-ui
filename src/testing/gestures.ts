// The family's gesture check: every interactive view answers every gesture of the view controls the same way, on every page (kazoku-ui docs/guides/view-controls.md, "Gestures").
// A Playwright helper takes the page and the selector of the view the hands are bound to, does each gesture with a real mouse, keyboard or (for two fingers) pointer events,
// and reads the view from the controls' own `kazoku-viewchange` events: the turn, the roll, the zoom and the move must each change by what the gesture asks. It then photographs
// the view and checks the picture moved by as many pixels as the controls say, so a page that ignores the move (the controls change, the picture does not) fails.
//
//   import { checkGestures } from "@johnmorrisdotca/kazoku-ui/testing";
//   test("every gesture", async ({ page }) => { await open(page); await checkGestures(page, "#view"); });
//
// A view that has no turn or roll (a flat map) says so, with the reason, and nothing else is skipped:
//   await checkGestures(page, "#map", { lacks: { turn: "a flat map", roll: "a flat map", "key-turn": "a flat map" } });

/** Every gesture the check does, and what it asks of the view. */
export const GESTURES = {
  turn: "a plain drag turns the view (yaw) at Fit and zoomed in, and does not roll or move it",
  roll: "Shift and a drag rolls it",
  "key-turn": "the arrow keys turn and tip it",
  "key-zoom": "+ and - zoom in and out",
  "wheel-zoom": "Ctrl, Command or Alt with the wheel zooms about the pointer (up is in, down is out)",
  "pinch-zoom": "two fingers moving apart zoom in and moving together zoom out",
  "wheel-pan": "the wheel, and Shift and the wheel, move a zoomed view",
  "ctrl-drag-pan": "Ctrl or Command and a left drag moves a zoomed view, and the browser's menu stays out of it",
  "space-drag-pan": "Space and a drag moves a zoomed view",
  "middle-drag-pan": "the middle button and a drag moves a zoomed view",
  "right-drag-pan": "the right button and a drag moves a zoomed view, and the browser's menu stays out of it",
  "touch-pan": "two fingers dragging together move a zoomed view",
  fit: "a double-click on a zoomed view, and Home, fit it",
} as const;

export type GestureName = keyof typeof GESTURES;

/** The names in the order the check runs them. */
export const GESTURE_NAMES = Object.keys(GESTURES) as GestureName[];

/** The pan gestures: each also has its picture checked against the controls. */
const PANS: readonly GestureName[] = ["wheel-pan", "ctrl-drag-pan", "space-drag-pan", "middle-drag-pan", "right-drag-pan", "touch-pan"];

/** What the check needs of a Playwright locator. */
export interface GestureLocator {
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
  screenshot(options?: { scale?: "css" | "device" }): Promise<Uint8Array>;
  focus(): Promise<void>;
}

/** What the check needs of a Playwright page: `Page` fits. */
export interface GesturePage {
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  locator(selector: string): GestureLocator;
  waitForTimeout(ms: number): Promise<void>;
  mouse: {
    move(x: number, y: number): Promise<void>;
    down(options?: { button?: "left" | "right" | "middle" }): Promise<void>;
    up(options?: { button?: "left" | "right" | "middle" }): Promise<void>;
    wheel(deltaX: number, deltaY: number): Promise<void>;
    dblclick(x: number, y: number): Promise<void>;
  };
  keyboard: { down(key: string): Promise<void>; up(key: string): Promise<void>; press(key: string): Promise<void> };
}

export interface GestureOptions {
  /** The selector of the `<kazoku-view-controls>` whose events and controller are read. `"kazoku-view-controls"`. */
  controls?: string;
  /** The selector of what is photographed (the view by default; the canvas or the picture itself when the view is bigger than it). */
  picture?: string;
  /**
   * The gestures this view intentionally does not have, each with the reason, for example `{ roll: "a flat map has no roll" }`. A gesture not named here is checked, and one named
   * here is reported as skipped with its reason. `"picture"` stands for the picture check of the moves: a view whose picture cannot be photographed says why.
   */
  lacks?: Partial<Record<GestureName | "picture", string>>;
  /** The part of the picture that is followed, as shares `[left, right, top, bottom]` (the middle 40%). Give the part that holds the object when it is small. */
  window?: [number, number, number, number];
  /** The package's own signal that its draw is done, awaited before each picture. */
  ready?: () => Promise<unknown>;
  /** The longest wait, in ms, for the view or its picture to come to rest (5000). */
  timeout?: number;
  /** The zoom the moves are made at (3). */
  zoom?: number;
  /** The view is immersive: a plain wheel zooms about the pointer, and a finger drag tips as well as turns. Shift and the wheel still moves. A test then does not name `wheel-pan` as lacked. */
  immersive?: boolean;
}

export interface GestureReport {
  gesture: GestureName | "picture";
  result: "checked" | "lacks";
  /** The reason given for a gesture the view lacks. */
  reason?: string;
}

const EVENT = "kazoku-viewchange";

interface Seen {
  yaw: number;
  tilt: number;
  roll: number;
  zoom: number;
  panX: number;
  panY: number;
  reason: string;
}

interface Watch {
  last: Seen | null;
  menus: boolean[];
  off(): void;
}

/** Start reading the view from the controls' events, and note every context menu and whether the page held it back. */
function watch(page: GesturePage, controls: string): Promise<void> {
  return page.evaluate(
    ({ controls, event }) => {
      const w = window as unknown as { __kazokuGestures?: Watch };
      w.__kazokuGestures?.off();
      const el = document.querySelector(controls);
      if (el === null) throw new Error(`no ${controls} on the page`);
      const g: Watch = { last: null, menus: [], off: () => undefined };
      const onChange = (e: Event): void => {
        const d = (e as CustomEvent<Seen>).detail;
        g.last = { yaw: d.yaw, tilt: d.tilt, roll: d.roll ?? 0, zoom: d.zoom, panX: d.panX, panY: d.panY, reason: d.reason };
      };
      const onMenu = (e: Event): void => {
        g.menus.push(e.defaultPrevented);
      };
      el.addEventListener(event, onChange);
      document.addEventListener("contextmenu", onMenu);
      g.off = () => {
        el.removeEventListener(event, onChange);
        document.removeEventListener("contextmenu", onMenu);
      };
      w.__kazokuGestures = g;
      (el as unknown as { pause?: () => void }).pause?.();
    },
    { controls, event: EVENT },
  );
}

const unwatch = (page: GesturePage): Promise<void> => page.evaluate(() => (window as unknown as { __kazokuGestures?: Watch }).__kazokuGestures?.off(), undefined);

/** The pause the page gets to draw: two frames. */
const frames = (page: GesturePage, count = 2): Promise<void> =>
  page.evaluate(
    (left) =>
      new Promise<void>((resolve) => {
        const step = (n: number): void => (n <= 0 ? resolve() : void window.requestAnimationFrame(() => step(n - 1)));
        step(left);
      }),
    count,
  );

const sameView = (a: Seen, b: Seen): boolean => (["yaw", "tilt", "roll", "zoom", "panX", "panY"] as const).every((k) => Math.abs(a[k] - b[k]) < 1e-6);

/** The best shift of `after` against `before` (grey values, row by row, `w` by `h`): slide a window of `before` over `after` up to `reach` pixels each way. `zero` is how different they are with no shift. */
export function bestShift(before: ArrayLike<number>, after: ArrayLike<number>, w: number, h: number, reach: number, window: [number, number, number, number] = [0.3, 0.7, 0.3, 0.7]): { x: number; y: number; error: number; zero: number } {
  const x0 = Math.round(w * window[0]);
  const x1 = Math.round(w * window[1]);
  const y0 = Math.round(h * window[2]);
  const y1 = Math.round(h * window[3]);
  const order: [number, number][] = [];
  for (let dy = -reach; dy <= reach; dy += 1) for (let dx = -reach; dx <= reach; dx += 1) order.push([dx, dy]);
  order.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
  const most = Math.ceil((y1 - y0) / 3) * Math.ceil((x1 - x0) / 3);
  const errorAt = (dx: number, dy: number, limit: number): number => {
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y += 3) {
      const ys = y + dy;
      if (ys < 0 || ys >= h) continue;
      for (let x = x0; x < x1; x += 3) {
        const xs = x + dx;
        if (xs < 0 || xs >= w) continue;
        sum += Math.abs(before[y * w + x]! - after[ys * w + xs]!);
        n += 1;
      }
      if (sum / most > limit) return Infinity;
    }
    return n === 0 ? Infinity : sum / n;
  };
  let best = { x: 0, y: 0, error: Infinity };
  let bestAt = Infinity;
  for (const [dx, dy] of order) {
    const error = errorAt(dx, dy, best.error);
    const at = (dy + reach) * (2 * reach + 1) + dx + reach;
    if (error < best.error || (error === best.error && at < bestAt)) {
      best = { x: dx, y: dy, error };
      bestAt = at;
    }
  }
  return { ...best, zero: errorAt(0, 0, Infinity) };
}

const base64 = (bytes: Uint8Array): string => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};

/** A PNG as grey values, decoded in the page. */
async function grey(page: GesturePage, png: Uint8Array): Promise<{ w: number; h: number; data: Uint8Array }> {
  const out = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const rgba = ctx.getImageData(0, 0, img.width, img.height).data;
    const bytes = new Uint8Array(img.width * img.height);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.round(rgba[i * 4]! * 0.3 + rgba[i * 4 + 1]! * 0.59 + rgba[i * 4 + 2]! * 0.11);
    let text = "";
    for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { w: img.width, h: img.height, text: btoa(text) };
  }, base64(png));
  const raw = atob(out.text);
  const data = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) data[i] = raw.charCodeAt(i);
  return { w: out.w, h: out.h, data };
}

/**
 * Run the family's gesture check on one view. Each gesture is done with a real mouse and keyboard (two fingers with pointer events) and must change the view as the family's rule says;
 * every gesture that fails is named, all in one error. Resolves with what was checked and what the view says it lacks.
 * @param page Playwright's `page`, with the view's page already open and drawn.
 * @param view The selector of the element the hands are bound to (what `for` names, or the element that calls `carryControls`). Give it a `tabindex`: the keys need the focus.
 * @param options See `GestureOptions`.
 */
export async function checkGestures(page: GesturePage, view: string, options: GestureOptions = {}): Promise<GestureReport[]> {
  const { controls = "kazoku-view-controls", picture = view, lacks = {}, window, ready, timeout = 5000, zoom = 3, immersive = false } = options;
  for (const [name, reason] of Object.entries(lacks)) {
    if (name !== "picture" && !(name in GESTURES)) throw new Error(`checkGestures: "${name}" is not a gesture (${GESTURE_NAMES.join(", ")}, or "picture")`);
    if (typeof reason !== "string" || reason.trim() === "") throw new Error(`checkGestures: say why the view lacks "${name}"`);
  }
  const target = page.locator(view);
  const photo = page.locator(picture);
  const failures: string[] = [];
  const report: GestureReport[] = [];

  await page.evaluate((selector) => (document.querySelector(selector) as HTMLElement | null)?.scrollIntoView({ block: "center", inline: "center" }), view);
  await watch(page, controls);

  /** The view as the controls' events last said it, checked against the controls' own state. */
  const read = async (): Promise<Seen> => {
    const both = await page.evaluate(
      (selector) => {
        const g = (window as unknown as { __kazokuGestures?: Watch }).__kazokuGestures;
        const s = (document.querySelector(selector) as unknown as { state: Seen }).state;
        return { last: g?.last ?? null, state: { yaw: s.yaw, tilt: s.tilt, roll: s.roll ?? 0, zoom: s.zoom, panX: s.panX, panY: s.panY, reason: "" } };
      },
      controls,
    );
    if (both.last === null) throw new Error(`${controls} sent no ${EVENT} event`);
    if (!sameView(both.last, both.state)) throw new Error(`the last ${EVENT} event (${JSON.stringify(both.last)}) is not the view the controls hold (${JSON.stringify(both.state)})`);
    return both.last;
  };
  const put = async (next: Partial<Seen>): Promise<void> => {
    await page.evaluate(([selector, v]) => (document.querySelector(selector as string) as unknown as { controller: { set(v: object, final: boolean, reason: string): void } }).controller.set(v as object, true, "set"), [controls, { yaw: 0, tilt: 0, roll: 0, zoom: 1, panX: 0, panY: 0, ...next }] as const);
    await frames(page);
    await ready?.();
  };
  /** Wait until `done` holds of the view (or the time is up) and return the view. */
  const until = async (done: (s: Seen) => boolean): Promise<Seen> => {
    const end = Date.now() + timeout;
    let now = await read();
    while (!done(now) && Date.now() < end) {
      await page.waitForTimeout(50);
      now = await read();
    }
    await frames(page);
    return read();
  };
  const centre = async (): Promise<{ x: number; y: number }> => {
    const box = await target.boundingBox();
    if (box === null) throw new Error(`${view} has no box to act on`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const held = async (keys: string[], act: () => Promise<void>): Promise<void> => {
    for (const key of keys) await page.keyboard.down(key);
    try {
      await act();
    } finally {
      for (const key of [...keys].reverse()) await page.keyboard.up(key);
    }
  };
  const drag = async (dx: number, dy: number, how: { keys?: string[]; button?: "left" | "right" | "middle" } = {}): Promise<void> => {
    const at = await centre();
    await page.mouse.move(at.x, at.y);
    await held(how.keys ?? [], async () => {
      await page.mouse.down({ button: how.button ?? "left" });
      for (let i = 1; i <= 10; i += 1) await page.mouse.move(at.x + (dx * i) / 10, at.y + (dy * i) / 10);
      await page.mouse.up({ button: how.button ?? "left" });
    });
  };
  /** Two fingers, as pointer events on the view: each starts at `from` and ends at `to` (CSS pixels). */
  const fingers = async (from: [{ x: number; y: number }, { x: number; y: number }], to: [{ x: number; y: number }, { x: number; y: number }]): Promise<void> => {
    await page.evaluate(
      ([selector, a, b]) => {
        const el = document.querySelector(selector as string)!;
        const send = (type: string, id: number, p: { x: number; y: number }): void => {
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, composed: true, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
        };
        const [f0, f1] = a as [{ x: number; y: number }, { x: number; y: number }];
        const [t0, t1] = b as [{ x: number; y: number }, { x: number; y: number }];
        send("pointerdown", 1, f0);
        send("pointerdown", 2, f1);
        for (let i = 1; i <= 8; i += 1) {
          const k = i / 8;
          send("pointermove", 1, { x: f0.x + (t0.x - f0.x) * k, y: f0.y + (t0.y - f0.y) * k });
          send("pointermove", 2, { x: f1.x + (t1.x - f1.x) * k, y: f1.y + (t1.y - f1.y) * k });
        }
        send("pointerup", 1, t0);
        send("pointerup", 2, t1);
      },
      [view, from, to] as const,
    );
  };
  const settled = async (before?: Uint8Array): Promise<Uint8Array> => {
    const end = Date.now() + timeout;
    let last: Uint8Array | null = null;
    for (;;) {
      await frames(page);
      await ready?.();
      const now = await photo.screenshot({ scale: "css" });
      const same = last !== null && now.length === last.length && now.every((v, i) => v === last![i]);
      const differs = before === undefined || now.length !== before.length || now.some((v, i) => v !== before[i]);
      if (same && differs) return now;
      if (Date.now() > end) return now;
      last = now;
    }
  };
  const near = (a: number, b: number, share = 0.2, least = 6): boolean => Math.abs(a - b) <= Math.max(least, Math.abs(b) * share);

  /** Do a move at `zoom`, check the controls say the view moved and did not turn, and (unless the view says it cannot be photographed) that the picture moved by the same pixels. */
  const moves = async (label: string, act: () => Promise<void>, expectReason?: string): Promise<void> => {
    await put({ zoom });
    const was = await read();
    const before = lacks.picture === undefined ? await settled() : undefined;
    await act();
    const now = await until((s) => Math.hypot(s.panX - was.panX, s.panY - was.panY) > 10);
    const dx = now.panX - was.panX;
    const dy = now.panY - was.panY;
    if (Math.hypot(dx, dy) <= 10) throw new Error(`${label} did not move the view (pan ${was.panX},${was.panY} to ${now.panX},${now.panY})`);
    if (expectReason !== undefined && now.reason !== expectReason) throw new Error(`${label}: the last change's reason is "${now.reason}", not "${expectReason}"`);
    if (Math.abs(now.yaw - was.yaw) > 1e-6 || Math.abs(now.roll - was.roll) > 1e-6) throw new Error(`${label} turned or rolled the view (yaw ${was.yaw} to ${now.yaw}, roll ${was.roll} to ${now.roll})`);
    if (Math.abs(now.zoom - was.zoom) > 0.02 * was.zoom) throw new Error(`${label} changed the zoom (${was.zoom} to ${now.zoom})`);
    if (before === undefined) return;
    const after = await settled(before);
    const reach = Math.min(160, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))) + 20);
    const [p, q] = [await grey(page, before), await grey(page, after)];
    const moved = bestShift(p.data, q.data, p.w, p.h, reach, window);
    const ok = near(moved.x, dx) && near(moved.y, dy);
    if (!ok) throw new Error(`${label}: the controls say the view moved ${dx.toFixed(0)},${dy.toFixed(0)} pixels but the picture moved ${moved.x},${moved.y} (a page must draw the pan it is told: panX and panY are CSS pixels from the middle)`);
  };

  const checks: Record<GestureName, () => Promise<void>> = {
    async turn() {
      await put({});
      await drag(80, 0);
      const now = await until((s) => Math.abs(s.yaw) > 5);
      if (Math.abs(now.yaw) <= 5) throw new Error(`a drag did not turn the view (yaw ${now.yaw})`);
      if (now.roll !== 0 || now.panX !== 0 || now.panY !== 0 || now.zoom !== 1) throw new Error(`a drag turned the view and also changed something else (${JSON.stringify(now)})`);
      // Zoomed in, a plain drag turns too (it never moves the view: the middle button, Ctrl or Command, Space and the wheel do that).
      await put({ zoom });
      const was = await read();
      await drag(80, 0);
      const zoomed = await until((s) => Math.abs(s.yaw - was.yaw) > 1);
      if (Math.abs(zoomed.yaw - was.yaw) <= 1) throw new Error(`a drag did not turn the view zoomed in at ${zoom}x (yaw ${was.yaw} to ${zoomed.yaw}): a plain drag turns at every zoom`);
      if (Math.abs(zoomed.panX - was.panX) > 1e-6 || Math.abs(zoomed.panY - was.panY) > 1e-6 || Math.abs(zoomed.roll - was.roll) > 1e-6) throw new Error(`a drag zoomed in at ${zoom}x moved or rolled the view as well as turning it (${JSON.stringify(was)} to ${JSON.stringify(zoomed)})`);
      if (!immersive) return;
      await put({});
      const at = await centre();
      await page.evaluate(([selector, x, y]) => {
        const el = document.querySelector(selector as string)!;
        const send = (type: string, p: { x: number; y: number }): void => {
          el.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: p.x, clientY: p.y, bubbles: true, cancelable: true, composed: true, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
        };
        send("pointerdown", { x: x as number, y: y as number });
        send("pointermove", { x: x as number, y: (y as number) - 80 });
        send("pointerup", { x: x as number, y: (y as number) - 80 });
      }, [view, at.x, at.y] as const);
      const tipped = await until((s) => Math.abs(s.tilt) > 2);
      if (Math.abs(tipped.tilt) <= 2) throw new Error(`a finger drag did not tip the view (tilt ${tipped.tilt})`);
    },
    async roll() {
      await put({});
      await drag(80, 0, { keys: ["Shift"] });
      const now = await until((s) => Math.abs(s.roll) > 5);
      if (Math.abs(now.roll) <= 5) throw new Error(`Shift and a drag did not roll the view (roll ${now.roll})`);
      if (now.yaw !== 0 || now.panX !== 0 || now.panY !== 0) throw new Error(`Shift and a drag rolled the view and also turned or moved it (${JSON.stringify(now)})`);
    },
    async "key-turn"() {
      await put({});
      await target.focus();
      await page.keyboard.press("ArrowRight");
      const right = await until((s) => s.yaw !== 0);
      if (right.yaw === 0) throw new Error("the right arrow did not turn the view (give the view a tabindex so it takes the keys)");
      await page.keyboard.press("ArrowUp");
      const up = await until((s) => s.tilt !== 0);
      if (up.tilt === 0) throw new Error("the up arrow did not tip the view");
    },
    async "key-zoom"() {
      await put({});
      await target.focus();
      await page.keyboard.press("Equal");
      const closer = await until((s) => s.zoom > 1.1);
      if (closer.zoom <= 1.1) throw new Error(`+ did not zoom in (zoom ${closer.zoom}; give the view a tabindex so it takes the keys)`);
      await page.keyboard.press("Minus");
      const back = await until((s) => s.zoom < closer.zoom - 0.05);
      if (back.zoom >= closer.zoom - 0.05) throw new Error(`- did not zoom out (zoom ${closer.zoom} to ${back.zoom})`);
    },
    async "wheel-zoom"() {
      const at = await centre();
      for (const key of ["Control", "Meta", "Alt"]) {
        await put({ zoom: 2 });
        await page.mouse.move(at.x, at.y);
        await held([key], () => page.mouse.wheel(0, -120));
        const closer = await until((s) => s.zoom > 2.05);
        if (closer.zoom <= 2.05) throw new Error(`${key} and the wheel up did not zoom in (zoom ${closer.zoom})`);
        await put({ zoom: 2 });
        await held([key], () => page.mouse.wheel(0, 120));
        const further = await until((s) => s.zoom < 1.95);
        if (further.zoom >= 1.95) throw new Error(`${key} and the wheel down did not zoom out (zoom ${further.zoom})`);
      }
      if (!immersive) return;
      await put({ zoom: 2 });
      await page.mouse.move(at.x, at.y);
      await page.mouse.wheel(0, -120);
      const plain = await until((s) => s.zoom > 2.05);
      if (plain.zoom <= 2.05) throw new Error(`a plain wheel did not zoom in (zoom ${plain.zoom})`);
    },
    async "pinch-zoom"() {
      const at = await centre();
      const pair = (gap: number): [{ x: number; y: number }, { x: number; y: number }] => [{ x: at.x - gap / 2, y: at.y }, { x: at.x + gap / 2, y: at.y }];
      await put({ zoom: 1.5 });
      await fingers(pair(60), pair(140));
      const closer = await until((s) => s.zoom > 1.8);
      if (closer.zoom <= 1.8) throw new Error(`two fingers moving apart did not zoom in (zoom ${closer.zoom})`);
      await put({ zoom: 2 });
      await fingers(pair(140), pair(60));
      const further = await until((s) => s.zoom < 1.7);
      if (further.zoom >= 1.7) throw new Error(`two fingers moving together did not zoom out (zoom ${further.zoom})`);
    },
    async "wheel-pan"() {
      const at = await centre();
      if (!immersive) {
        await moves("the wheel", async () => {
          await page.mouse.move(at.x, at.y);
          await page.mouse.wheel(0, 60);
        }, "wheel");
      }
      await moves("Shift and the wheel", async () => {
        await page.mouse.move(at.x, at.y);
        await held(["Shift"], () => page.mouse.wheel(0, 60));
      }, "wheel");
    },
    async "ctrl-drag-pan"() {
      for (const key of ["Control", "Meta"]) {
        await moves(`${key} and a drag`, () => drag(60, 30, { keys: [key] }));
        const menus = await page.evaluate(() => (window as unknown as { __kazokuGestures: Watch }).__kazokuGestures.menus, undefined);
        if (menus.some((prevented) => !prevented)) throw new Error(`${key} and a drag let the browser's context menu open`);
      }
    },
    async "space-drag-pan"() {
      const at = await centre();
      await moves("Space and a drag", async () => {
        await page.mouse.move(at.x, at.y);
        await held(["Space"], async () => {
          await page.mouse.down();
          for (let i = 1; i <= 10; i += 1) await page.mouse.move(at.x + 6 * i, at.y + 3 * i);
          await page.mouse.up();
        });
      });
    },
    async "middle-drag-pan"() {
      await moves("the middle button and a drag", () => drag(60, 30, { button: "middle" }));
    },
    async "right-drag-pan"() {
      await moves("the right button and a drag", () => drag(60, 30, { button: "right" }));
      const menus = await page.evaluate(() => (window as unknown as { __kazokuGestures: Watch }).__kazokuGestures.menus, undefined);
      if (menus.some((prevented) => !prevented)) throw new Error("the right button and a drag let the browser's context menu open");
    },
    async "touch-pan"() {
      const at = await centre();
      await moves("two fingers dragging together", () =>
        fingers(
          [{ x: at.x - 40, y: at.y }, { x: at.x + 40, y: at.y }],
          [{ x: at.x - 40 + 50, y: at.y + 25 }, { x: at.x + 40 + 50, y: at.y + 25 }],
        ),
      );
    },
    async fit() {
      const at = await centre();
      await put({ zoom, panX: 30, panY: 20 });
      await page.mouse.move(at.x, at.y);
      await page.mouse.dblclick(at.x, at.y);
      const fitted = await until((s) => s.zoom <= 1.01);
      if (fitted.zoom > 1.01) throw new Error(`a double-click on a zoomed view did not fit it (zoom ${fitted.zoom})`);
      if (fitted.panX !== 0 || fitted.panY !== 0) throw new Error(`a double-click fitted the view off centre (pan ${fitted.panX},${fitted.panY})`);
      await put({ zoom, panX: 30, panY: 20 });
      await target.focus();
      await page.keyboard.press("Home");
      const home = await until((s) => s.zoom <= 1.01);
      if (home.zoom > 1.01 || home.panX !== 0 || home.panY !== 0) throw new Error(`Home did not fit the view (${JSON.stringify(home)})`);
    },
  };

  try {
    for (const gesture of GESTURE_NAMES) {
      const reason = lacks[gesture];
      if (reason !== undefined) {
        report.push({ gesture, result: "lacks", reason });
        continue;
      }
      try {
        await checks[gesture]();
        report.push({ gesture, result: "checked" });
      } catch (error) {
        failures.push(`${gesture} (${GESTURES[gesture]}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (lacks.picture !== undefined) report.push({ gesture: "picture", result: "lacks", reason: lacks.picture });
    else if (PANS.every((name) => lacks[name] !== undefined)) report.push({ gesture: "picture", result: "lacks", reason: "no move gesture was checked" });
    else report.push({ gesture: "picture", result: "checked" });
  } finally {
    await unwatch(page).catch(() => undefined);
  }
  if (failures.length > 0) throw new Error(`${failures.length} of ${GESTURE_NAMES.length} gestures failed on ${view}:\n - ${failures.join("\n - ")}`);
  return report;
}
