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
