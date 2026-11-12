// A test kit for a package's freeze checks, so every 3D package asserts the same things: how many WebGL contexts, how many GPU objects stay alive, how many
// draws and animation frames a page at rest costs, and how big its biggest canvas is. It names no test framework: hand it Playwright's `page` (or anything with
// `addInitScript` and `evaluate`). Nothing here touches the DOM until the script runs in a page, so it imports on a server.
//
//   await page.addInitScript(COUNT_SCRIPT);              // before page.goto
//   await page.goto(url);
//   const before = await readCounts(page);
//   ...the changes under test...
//   const after = await readCounts(page);
//   expect(after.contexts).toBe(1);
//   expect(after.draws - before.draws).toBe(0);           // at rest
//   expect(gpuObjects(after)).toBe(gpuObjects(before));   // nothing leaked

/**
 * The launch arguments that make headless Chromium draw in software, never on the machine's graphics card: WebGL on ANGLE and SwiftShader, and the page's own
 * pictures (SVG, text, a map) on the CPU. Every package's Playwright config gives them to its Chromium projects: `use: { launchOptions: { args: [...SOFTWARE_GL_ARGS] } }`.
 * A test run on a Mac's own GPU once panicked its graphics driver. Without `--disable-gpu-rasterization`, Chromium also rasterizes a page's own pictures on the emulated
 * GPU, where one world-map SVG kept it busy for 5 to 10 seconds, in which the page drew no frame and answered no click; WebGL is drawn in software either way.
 */
export const SOFTWARE_GL_ARGS: readonly string[] = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-rasterization"];

/** The GL object kinds counted. */
export const GPU_KINDS = ["Buffer", "Texture", "VertexArray", "Program", "Framebuffer", "Renderbuffer"] as const;
export type GpuKind = (typeof GPU_KINDS)[number];

export interface GlCounts {
  /** WebGL contexts made. */
  contexts: number;
  /** Draw calls (drawArrays, drawElements and their instanced forms). */
  draws: number;
  /** `requestAnimationFrame` calls made, and the callbacks that ran. */
  rafRequests: number;
  rafCallbacks: number;
  created: Record<GpuKind, number>;
  deleted: Record<GpuKind, number>;
}

/** Install the counters in a page, before its own scripts run. A string, so `page.addInitScript(COUNT_SCRIPT)` takes it as it is. */
export const COUNT_SCRIPT = `(() => {
  const c = (window.__kazokuCount = { contexts: 0, draws: 0, rafRequests: 0, rafCallbacks: 0, created: {}, deleted: {} });
  const kinds = ${JSON.stringify(GPU_KINDS)};
  for (const k of kinds) { c.created[k] = 0; c.deleted[k] = 0; }
  const seen = new WeakSet();
  for (const proto of [window.HTMLCanvasElement && HTMLCanvasElement.prototype, window.OffscreenCanvas && OffscreenCanvas.prototype]) {
    if (!proto) continue;
    const getContext = proto.getContext;
    proto.getContext = function (type, ...rest) {
      const context = getContext.call(this, type, ...rest);
      if (context && /^(experimental-)?webgl/.test(String(type)) && !seen.has(context)) { seen.add(context); c.contexts += 1; }
      return context;
    };
  }
  for (const proto of [window.WebGLRenderingContext && WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype]) {
    if (!proto) continue;
    for (const k of kinds) {
      const make = proto["create" + k];
      const remove = proto["delete" + k];
      if (make) proto["create" + k] = function (...a) { c.created[k] += 1; return make.apply(this, a); };
      if (remove) proto["delete" + k] = function (o) { if (o) c.deleted[k] += 1; return remove.call(this, o); };
    }
    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"]) {
      const draw = proto[name];
      if (draw) proto[name] = function (...a) { c.draws += 1; return draw.apply(this, a); };
    }
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => { c.rafRequests += 1; return raf((t) => { c.rafCallbacks += 1; callback(t); }); };
})();`;

/** What the page needs to be: Playwright's `Page` fits. */
export interface PageLike {
  evaluate<R>(fn: () => R): Promise<R>;
}

/** The counters now, as a copy. */
export function readCounts(page: PageLike): Promise<GlCounts> {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as { __kazokuCount: unknown }).__kazokuCount)) as GlCounts);
}

/** GPU objects alive: made minus deleted, over every kind. Flat across a run of changes means nothing leaks. */
export function gpuObjects(counts: GlCounts): number {
  return GPU_KINDS.reduce((sum, kind) => sum + counts.created[kind] - counts.deleted[kind], 0);
}

export interface CanvasSize {
  /** The most pixels any canvas on the page holds, and the longest side of any. */
  pixels: number;
  side: number;
  count: number;
}

/** The biggest canvas on the page, in device pixels. */
export function canvasSize(page: PageLike): Promise<CanvasSize> {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("canvas")];
    return { pixels: Math.max(0, ...all.map((c) => c.width * c.height)), side: Math.max(0, ...all.map((c) => Math.max(c.width, c.height))), count: all.length };
  });
}

/** True when a canvas is within the budget (the renderer's own: 6 million pixels, 4096 a side). */
export function withinPixelBudget(size: CanvasSize, maxPixels = 6_000_000, maxSide = 4096): boolean {
  return size.pixels <= maxPixels && size.side <= maxSide;
}

/**
 * Wait until the graphics processor has finished everything the page asked it to draw, and say how long that took (ms). Software drawing (SwiftShader) is far slower
 * than the 30 frames a second a view asks for, so a test that draws for a few seconds ends with the GPU tens of seconds behind the page, and Chromium then makes the
 * next test wait for that backlog while the next test's own clock is running. A test that draws for seconds ends with this, so it pays for its own drawing. It reads
 * one pixel from every WebGL canvas on the page, shadow roots included, and that synchronous read waits for all the commands before it (`gl.finish()` does not: Chromium
 * makes it a flush). It asks each canvas for its WebGL context, so a canvas that has none gets one: call it on a page whose canvases are WebGL.
 *
 * @example
 * test("the ride draws at the rate it asks for", async ({ page }) => {
 *   await page.addInitScript(COUNT_SCRIPT);
 *   await page.goto("/ride.html");
 *   // ...seconds of drawing, and the asserts on `readCounts(page)`...
 *   await drainGpu(page); // the backlog is this test's, not the next one's
 * });
 */
export function drainGpu(page: PageLike): Promise<number> {
  return page.evaluate(() => {
    const canvases: HTMLCanvasElement[] = [];
    const walk = (root: Document | ShadowRoot): void => {
      canvases.push(...root.querySelectorAll("canvas"));
      for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
    };
    walk(document);
    const start = performance.now();
    for (const canvas of canvases) {
      try {
        const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGL2RenderingContext | null;
        gl?.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      } catch {
        // A canvas whose control went to an offscreen canvas, or that holds another kind of context, has nothing to wait for.
      }
    }
    return performance.now() - start;
  });
}

export interface UntilStillOptions {
  /** How long the reading must stay the same, in ms. Default 1000. */
  quietMs?: number;
  /** How long to wait for that before failing, in ms. Default 20000. */
  timeoutMs?: number;
}

/**
 * The draw count and the animation-frame request count now, as the pair to hand `untilStill`: nothing is drawn or asked for while both stay the same.
 *
 * @example
 * await untilStill(page, drawCounts);
 */
export async function drawCounts(page: PageLike): Promise<readonly [number, number]> {
  const counts = await readCounts(page);
  return [counts.draws, counts.rafRequests];
}

/**
 * Wait until what `read` reports has stayed the same for `quietMs`: nothing is drawn or asked for any more. Holding a clock or stopping the controls' turn leaves one
 * last frame already queued, and that frame is drawn, rightly; on a loaded machine (software drawing) it can land more than a second later. A test of "nothing is drawn
 * while held" takes its first reading after this, so it measures rest, not that last frame. If the reading keeps changing for `timeoutMs`, this throws: that is the bug it
 * is there to find. `read` returns a number or a list of numbers.
 *
 * @example
 * await untilStill(page, drawCounts, { quietMs: 1000, timeoutMs: 20_000 });
 * const before = await readCounts(page);
 */
export async function untilStill<P extends PageLike>(page: P, read: (page: P) => Promise<number | readonly number[]>, options: UntilStillOptions = {}): Promise<void> {
  const quietMs = options.quietMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 20_000;
  const key = (value: number | readonly number[]): string => (typeof value === "number" ? String(value) : value.join(","));
  const start = Date.now();
  let last = key(await read(page));
  let since = Date.now();
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.min(250, quietMs / 4))));
    const now = Date.now();
    const current = key(await read(page));
    if (current !== last) {
      last = current;
      since = now;
    } else if (now - since >= quietMs) return;
    if (now - start > timeoutMs) throw new Error(`still changing ${timeoutMs} ms after it was asked to be still (the reading is now ${last}, and last changed ${now - since} ms ago)`);
  }
}

export * from "./gestures.ts";
export * from "./lock.ts";
export { orderBrowserQueue, setBrowserPriority, type BrowserQueueTicket } from "./queue.ts";
export { browserSlots, slotsFile, type BrowserSlotKind, type BrowserSlots } from "./slots.ts";
export { ciImagePlan, playwrightVersion, runCiImage, type CiImageOptions, type CiImagePlan } from "./ci-image.ts";
