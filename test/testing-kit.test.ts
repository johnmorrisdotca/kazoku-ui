import assert from "node:assert/strict";
import { test } from "node:test";
import { drainGpu, drawCounts, SOFTWARE_GL_ARGS, untilStill, type PageLike } from "../src/testing/index.ts";

/** A page that runs the function in this process, against the fake document the test sets up. */
const here: PageLike = { evaluate: async (fn) => fn() };

test("the software arguments keep a page's own pictures on the CPU as well as WebGL in software", () => {
  assert.ok(SOFTWARE_GL_ARGS.includes("--disable-gpu-rasterization"));
  assert.ok(SOFTWARE_GL_ARGS.includes("--use-angle=swiftshader"));
  assert.equal(new Set(SOFTWARE_GL_ARGS).size, SOFTWARE_GL_ARGS.length);
});

interface FakeCanvas {
  shadowRoot: null;
  getContext(type: string): unknown;
}
const glFake = (reads: string[], name: string) => ({ RGBA: 1, UNSIGNED_BYTE: 2, readPixels: (...a: unknown[]) => reads.push(`${name}:${a.slice(0, 4).join(",")}`) });

test("drainGpu reads one pixel from every WebGL canvas, shadow roots included, and says how long it took", async () => {
  const reads: string[] = [];
  const asked: string[] = [];
  const canvas = (name: string, kind: "webgl2" | "webgl" | "2d" | "gone"): FakeCanvas => ({
    shadowRoot: null,
    getContext(type: string) {
      asked.push(`${name}:${type}`);
      if (kind === "gone") throw new Error("InvalidStateError");
      return type === kind ? glFake(reads, name) : null;
    },
  });
  const inner = { querySelectorAll: (selector: string) => (selector === "canvas" ? [canvas("inner", "webgl2")] : []) };
  const host = { shadowRoot: inner };
  const top = [canvas("a", "webgl2"), canvas("b", "webgl"), canvas("c", "2d"), canvas("d", "gone")];
  const doc = { querySelectorAll: (selector: string) => (selector === "canvas" ? top : [host]) };
  Object.assign(globalThis, { document: doc });
  try {
    const ms = await drainGpu(here);
    assert.ok(ms >= 0 && Number.isFinite(ms));
    assert.deepEqual(reads, ["a:0,0,1,1", "b:0,0,1,1", "inner:0,0,1,1"]);
    assert.ok(asked.includes("b:webgl2") && asked.includes("b:webgl"));
  } finally {
    Reflect.deleteProperty(globalThis, "document");
  }
});

test("untilStill returns once the reading has stayed put for the quiet time", async () => {
  let reads = 0;
  const started = Date.now();
  // changes for the first five reads, then holds
  await untilStill(here, async () => Math.min(reads++, 5), { quietMs: 80, timeoutMs: 5000 });
  assert.ok(reads > 6);
  assert.ok(Date.now() - started >= 80);
});

test("untilStill takes a list of numbers, and a change in any of them restarts the quiet time", async () => {
  let n = 0;
  const seen: string[] = [];
  await untilStill(
    here,
    async () => {
      n += 1;
      const value = [1, n < 4 ? n : 4] as const;
      seen.push(value.join(","));
      return value;
    },
    { quietMs: 60, timeoutMs: 5000 },
  );
  assert.equal(seen[seen.length - 1], "1,4");
  assert.ok(seen.includes("1,2") && seen.includes("1,3"));
});

test("untilStill fails at the limit when frames keep coming", async () => {
  let n = 0;
  await assert.rejects(untilStill(here, async () => n++, { quietMs: 100, timeoutMs: 300 }), /still changing 300 ms/);
});

test("drawCounts is the draws and the frame requests", async () => {
  const counts = { contexts: 1, draws: 7, rafRequests: 9, rafCallbacks: 9, created: {}, deleted: {} };
  const page: PageLike = { evaluate: async () => counts as never };
  assert.deepEqual(await drawCounts(page), [7, 9]);
});
