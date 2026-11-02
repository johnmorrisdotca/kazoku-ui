import assert from "node:assert/strict";
import { test } from "node:test";

import { createAssetCache, disposeDeep, type Timers } from "../src/renderer/cache.ts";
import { MAX_PIXELS, MAX_SIDE, pixelRatioFor } from "../src/renderer/pixels.ts";
import { createScheduler, type FrameClock, type Job } from "../src/renderer/scheduler.ts";
import { createStillCache, type Still } from "../src/renderer/stills.ts";
import { COUNT_SCRIPT, gpuObjects, GPU_KINDS, SOFTWARE_GL_ARGS, withinPixelBudget, type GlCounts } from "../src/testing/index.ts";

/** A frame clock the test steps by hand; it also counts the requests. */
function fakeClock() {
  let callback: ((now: number) => void) | undefined;
  let now = 0;
  let requests = 0;
  let cancels = 0;
  const clock: FrameClock = { request: (cb) => { requests += 1; callback = cb; return requests; }, cancel: () => { cancels += 1; callback = undefined; }, now: () => now };
  return { clock, requests: () => requests, cancels: () => cancels, pending: () => callback !== undefined, advance: (ms: number) => { now += ms; }, frame: (ms = 16) => { now += ms; const run = callback; callback = undefined; run?.(now); } };
}

test("a 5K screen at pixel ratio 2 is brought inside 6 million pixels and 4096 a side", () => {
  for (const [w, h, dpr] of [[5120, 2880, 2], [2963, 2037, 2], [1280, 800, 2], [900, 900, 3], [8000, 300, 2], [320, 240, 4]] as const) {
    const r = pixelRatioFor(w, h, dpr);
    const cw = Math.floor(w * r);
    const ch = Math.floor(h * r);
    assert.ok(cw * ch <= MAX_PIXELS, `${w}x${h}@${dpr} gives ${cw * ch} pixels`);
    assert.ok(Math.max(cw, ch) <= MAX_SIDE, `${w}x${h}@${dpr} gives a side of ${Math.max(cw, ch)}`);
    assert.ok(r <= 2);
  }
});

test("a small view keeps the device's ratio up to 2, and a view of no size is 1", () => {
  assert.equal(pixelRatioFor(400, 300, 1), 1);
  assert.equal(pixelRatioFor(400, 300, 2), 2);
  assert.equal(pixelRatioFor(400, 300, 3), 2);
  assert.equal(pixelRatioFor(0, 300, 2), 1);
  assert.equal(pixelRatioFor(400, 300, Number.NaN), 1);
});

test("the limits can be changed", () => {
  const r = pixelRatioFor(1000, 1000, 2, { maxPixels: 1_000_000 });
  assert.equal(r, 1);
  assert.equal(pixelRatioFor(1000, 1000, 2, { maxRatio: 1.5 }), 1.5);
});

test("nothing is drawn, and no frame is asked for, until a job asks", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock });
  assert.equal(s.pending, false);
  f.frame();
  assert.equal(f.requests(), 0);
  assert.equal(s.stats.draws, 0);
});

test("one frame is requested however many jobs and invalidations ask, and a change during a draw adds none", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock });
  let again = 0;
  const a: Job = { draw: () => { again += 1; s.invalidate(a); s.invalidate(b); } };
  const b: Job = { draw: () => undefined };
  for (let i = 0; i < 10; i += 1) s.invalidate(a);
  s.invalidate(b);
  assert.equal(f.requests(), 1);
  f.frame();
  // The draw invalidated again from inside: one request for the next frame, not one for each ask.
  assert.equal(f.requests(), 2);
  assert.equal(again, 1);
  f.frame();
  assert.equal(f.requests(), 3);
});

test("a job that returns true is drawn again next frame, with the time since its last draw, and one that does not goes quiet", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock });
  const seen: number[] = [];
  let left = 3;
  const job: Job = { draw: (_now, dt) => { seen.push(dt); left -= 1; return left > 0; } };
  s.invalidate(job);
  f.frame(16);
  f.frame(16);
  f.frame(16);
  assert.deepEqual(seen.map((dt) => Math.round(dt * 1000)), [0, 16, 16]);
  assert.equal(s.pending, false);
  assert.equal(f.requests(), 3);
  s.invalidate(job);
  f.frame(5000);
  assert.equal(seen[3], 0, "a job that rested starts again from 0, not from a long gap");
});

test("the focused job is drawn before an ambient one, and the budget defers the rest to the next frame", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock, maxDraws: 1 });
  const order: string[] = [];
  const ambient: Job = { draw: () => { order.push("ambient"); } };
  const focus: Job = { draw: () => { order.push("focus"); } };
  s.invalidate(ambient, "ambient");
  s.invalidate(focus, "focus");
  f.frame();
  assert.deepEqual(order, ["focus"]);
  assert.equal(s.pending, true);
  f.frame();
  assert.deepEqual(order, ["focus", "ambient"]);
  assert.equal(s.pending, false);
  assert.equal(s.stats.deferred, 1);
});

test("a spent time budget stops a frame after the job that spent it", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock, maxDraws: 5, budgetMs: 10 });
  const order: string[] = [];
  const slow: Job = { draw: () => { order.push("slow"); f.advance(30); } };
  const next: Job = { draw: () => { order.push("next"); } };
  s.invalidate(slow);
  s.invalidate(next);
  f.frame();
  assert.deepEqual(order, ["slow"]);
  f.frame();
  assert.deepEqual(order, ["slow", "next"]);
});

test("while paused no frame is asked for, a pending one is cancelled, and it comes back when the last pause is undone", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock });
  const job: Job = { draw: () => undefined };
  s.invalidate(job);
  s.pause();
  s.pause();
  assert.equal(f.cancels(), 1);
  assert.equal(s.pending, false);
  s.invalidate(job);
  assert.equal(f.requests(), 1);
  s.resume();
  assert.equal(s.pending, false);
  s.resume();
  assert.equal(s.pending, true);
  assert.equal(f.requests(), 2);
  f.frame();
  assert.equal(s.stats.draws, 1);
});

test("a job that throws leaves the others for the next frame", () => {
  const f = fakeClock();
  const s = createScheduler({ clock: f.clock, maxDraws: 5 });
  const bad: Job = { draw: () => { throw new Error("boom"); } };
  let drawn = 0;
  const good: Job = { draw: () => { drawn += 1; } };
  s.invalidate(bad);
  s.invalidate(good);
  assert.throws(() => f.frame(), /boom/);
  assert.equal(s.pending, true);
  f.frame();
  assert.equal(drawn, 1);
});

/** Timers the test runs by hand. */
function fakeTimers() {
  const waiting = new Map<number, () => void>();
  let next = 1;
  const timers: Timers = { set: (callback) => { waiting.set(next, callback); return next++; }, clear: (handle) => { waiting.delete(handle as number); } };
  return { timers, run: () => { for (const [id, callback] of [...waiting]) { waiting.delete(id); callback(); } }, count: () => waiting.size };
}

test("the second user of a key shares the first one's asset, and it is disposed after the last lets go", () => {
  const t = fakeTimers();
  const cache = createAssetCache({ lingerMs: 1000, timers: t.timers });
  let made = 0;
  const freed: string[] = [];
  const make = (): { id: number } => ({ id: ++made });
  const a = cache.acquire("geometry:box", make, (g) => freed.push(`box${g.id}`));
  const b = cache.acquire("geometry:box", make, (g) => freed.push(`box${g.id}`));
  assert.equal(a, b);
  assert.equal(made, 1);
  assert.deepEqual(cache.stats(), { entries: 1, refs: 2, hits: 1, misses: 1, disposed: 0 });
  cache.release("geometry:box");
  cache.release("geometry:box");
  assert.deepEqual(freed, []);
  assert.equal(cache.stats().refs, 0);
  t.run();
  assert.deepEqual(freed, ["box1"]);
  assert.equal(cache.stats().entries, 0);
});

test("an asset taken again during the linger is not disposed, and with no linger it goes at once", () => {
  const t = fakeTimers();
  const cache = createAssetCache({ lingerMs: 1000, timers: t.timers });
  const freed: number[] = [];
  const dispose = (n: number): void => { freed.push(n); };
  cache.acquire("k", () => 1, dispose);
  cache.release("k");
  cache.acquire("k", () => 2, dispose);
  t.run();
  assert.deepEqual(freed, []);
  assert.equal(cache.stats().hits, 1);
  const now = createAssetCache({ lingerMs: 0 });
  now.acquire("k", () => 7, dispose);
  now.release("k");
  assert.deepEqual(freed, [7]);
});

test("a scope lets go of everything it took with one call, and a stray release does nothing", () => {
  const cache = createAssetCache({ lingerMs: 0 });
  const freed: string[] = [];
  const scope = cache.scope();
  scope.acquire("a", () => "A", (v) => freed.push(v));
  scope.acquire("b", () => "B", (v) => freed.push(v));
  const other = cache.scope();
  other.acquire("a", () => "A2", (v) => freed.push(v));
  scope.release();
  assert.deepEqual(freed, ["B"]);
  scope.release();
  cache.release("nothing");
  other.release();
  assert.deepEqual(freed, ["B", "A"]);
  assert.equal(cache.stats().entries, 0);
});

test("clear disposes what is held, used or not", () => {
  const cache = createAssetCache();
  let freed = 0;
  cache.acquire("a", () => 1, () => { freed += 1; });
  cache.clear();
  assert.equal(freed, 1);
});

test("disposeDeep frees a model's geometry, materials and their textures once each", () => {
  const log: string[] = [];
  const thing = (name: string, extra: object = {}) => ({ dispose: () => log.push(name), ...extra });
  const map = thing("map", { isTexture: true });
  const material = thing("material", { map, normalMap: map });
  const nodes = [{ geometry: thing("g1"), material }, { geometry: thing("g2"), material: [material, thing("m2")] }, {}];
  disposeDeep({ traverse: (visit: (node: unknown) => void) => nodes.forEach(visit) });
  assert.deepEqual([...log].sort(), ["g1", "g2", "m2", "map", "material"]);
});

const still = (bytes: number): Still => ({ url: `blob:${bytes}`, width: 1, height: 1, bytes });

test("stills are kept while they fit, the least recently used go first, and the one just set stays", () => {
  const freed: string[] = [];
  const evicted: string[] = [];
  const cache = createStillCache({ maxBytes: 100, free: (s) => freed.push(s.url), onEvict: (k) => evicted.push(k) });
  cache.set("a", still(40));
  cache.set("b", still(40));
  cache.get("a");
  cache.set("c", still(40));
  assert.deepEqual(cache.keys(), ["a", "c"]);
  assert.deepEqual(evicted, ["b"]);
  assert.equal(cache.bytes, 80);
  cache.set("big", still(500));
  assert.deepEqual(cache.keys(), ["big"]);
  assert.equal(cache.bytes, 500);
  assert.equal(freed.length, 3);
  cache.set("big", still(10));
  assert.equal(cache.bytes, 10);
  cache.clear();
  assert.equal(cache.size, 0);
});

test("the test kit's counts add up, and its script installs on a page without throwing", () => {
  const zero = Object.fromEntries(GPU_KINDS.map((k) => [k, 0])) as GlCounts["created"];
  const counts: GlCounts = { contexts: 1, draws: 0, rafRequests: 0, rafCallbacks: 0, created: { ...zero, Buffer: 5, Texture: 2 }, deleted: { ...zero, Buffer: 3 } };
  assert.equal(gpuObjects(counts), 4);
  assert.equal(withinPixelBudget({ pixels: 5_900_000, side: 4000, count: 1 }), true);
  assert.equal(withinPixelBudget({ pixels: 24_000_000, side: 5926, count: 1 }), false);
  assert.doesNotThrow(() => new Function(COUNT_SCRIPT));
  // tests draw in software, never on the machine's graphics card
  assert.ok(SOFTWARE_GL_ARGS.includes("--use-angle=swiftshader") && SOFTWARE_GL_ARGS.includes("--enable-unsafe-swiftshader"));
});
