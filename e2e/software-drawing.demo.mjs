import { chromium, expect, test } from "@playwright/test";
import { COUNT_SCRIPT, drainGpu, drawCounts, readCounts, SOFTWARE_GL_ARGS, untilStill } from "../dist/testing/index.js";

// The test kit's software drawing (KAZOKU-UI-93): SOFTWARE_GL_ARGS keeps WebGL in software and the page's own pictures on the CPU, and drainGpu and untilStill work on a real page.
// Chromium only, once (the desk project); the first test starts its own browsers, one at a time, so it can compare the old list with the new.
test.describe.configure({ mode: "serial" });
test.beforeEach(({ browserName }, info) => test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "Chromium, once"));

/** Open a page made of this HTML at an address nobody serves, so the counting script installed first runs before the page's own. */
const open = async (page, html) => {
  await page.route("http://kit.test/", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto("http://kit.test/");
};

/** One draw call a WebGL page makes: a full-canvas triangle in a flat colour, three times, with one buffer and one program. */
const GL_PAGE = `<canvas id="c" width="64" height="64"></canvas><script>
const gl = document.getElementById("c").getContext("webgl");
const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
const program = gl.createProgram();
gl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
gl.attachShader(program, shader(gl.FRAGMENT_SHADER, "precision mediump float; void main() { gl_FragColor = vec4(0.2, 0.6, 1.0, 1.0); }"));
gl.linkProgram(program);
gl.useProgram(program);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const at = gl.getAttribLocation(program, "p");
gl.enableVertexAttribArray(at);
gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
for (let i = 0; i < 3; i += 1) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); }
// read in the same task as the draw: the drawing buffer is cleared once the page has been shown
const out = new Uint8Array(4);
gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
window.pixel = () => Array.from(out);
</script>`;

/** Open a browser with these arguments, play the WebGL page, and report what the browser says about its drawing, the pixel and the counts. */
async function play(args) {
  const browser = await chromium.launch({ headless: true, args });
  try {
    const status = (await (await browser.newBrowserCDPSession()).send("SystemInfo.getInfo")).gpu.featureStatus;
    const page = await browser.newPage();
    await page.addInitScript(COUNT_SCRIPT);
    await open(page, GL_PAGE);
    const pixel = await page.evaluate(() => window.pixel());
    return { rasterization: status.rasterization, webgl: status.webgl, pixel, counts: await readCounts(page) };
  } finally {
    await browser.close();
  }
}

test("--disable-gpu-rasterization moves the page's pictures to the CPU, and WebGL still draws, with the same counts", async () => {
  expect(SOFTWARE_GL_ARGS).toContain("--disable-gpu-rasterization");
  const without = await play(SOFTWARE_GL_ARGS.filter((a) => a !== "--disable-gpu-rasterization"));
  const kept = await play([...SOFTWARE_GL_ARGS]);
  // the flag does what it says: pictures on the CPU, not the emulated GPU
  expect(without.rasterization).toBe("enabled");
  expect(kept.rasterization).toBe("disabled_software");
  // WebGL is still there and still draws: the flat colour of the triangle reaches the pixel
  expect(kept.webgl).toBe("enabled");
  expect(kept.pixel).toEqual([51, 153, 255, 255]);
  // the counts are the same with and without it: one context, three draws, one program and one buffer
  expect(kept.pixel).toEqual(without.pixel);
  expect(kept.counts).toEqual(without.counts);
  expect(kept.counts.contexts).toBe(1);
  expect(kept.counts.draws).toBe(3);
  expect(kept.counts.created.Buffer).toBe(1);
  expect(kept.counts.created.Program).toBe(1);
});

test("drainGpu reads a pixel from every WebGL canvas, shadow roots included, and says how long", async ({ page }) => {
  await page.addInitScript(COUNT_SCRIPT);
  await open(page, `<canvas id="a" width="32" height="32"></canvas><div id="host"></div><canvas id="plain" width="8" height="8"></canvas><script>
    window.reads = 0;
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const read = proto.readPixels;
      proto.readPixels = function (...a) { window.reads += 1; return read.apply(this, a); };
    }
    document.getElementById("a").getContext("webgl2");
    const root = document.getElementById("host").attachShadow({ mode: "open" });
    const inner = document.createElement("canvas");
    root.append(inner);
    inner.getContext("webgl");
    document.getElementById("plain").getContext("2d");
  </script>`);
  const ms = await drainGpu(page);
  expect(ms).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => window.reads)).toBe(2);
  // the 2D canvas was left alone, and asking made no new WebGL context
  expect((await readCounts(page)).contexts).toBe(2);
});

test("drainGpu waits for queued drawing: after it, the page is not behind", async ({ page }) => {
  await open(page, `<canvas id="c" width="1024" height="1024"></canvas><script>
    const gl = document.getElementById("c").getContext("webgl");
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, "precision highp float; void main() { float v = 0.0; for (int i = 0; i < 400; i += 1) v += sin(gl_FragCoord.x * float(i)) * cos(gl_FragCoord.y * float(i)); gl_FragColor = vec4(v * 0.001 + 0.5, 0.2, 0.4, 1.0); }"));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    window.queue = (n) => { for (let i = 0; i < n; i += 1) gl.drawArrays(gl.TRIANGLES, 0, 3); };
  </script>`);
  await page.evaluate(() => window.queue(30));
  // the page returned at once, with the drawing still queued: draining pays for it, and a second drain, with nothing queued, is quick
  const first = await drainGpu(page);
  const second = await drainGpu(page);
  expect(first).toBeGreaterThan(second);
  expect(second).toBeLessThan(first / 2);
});

/** A page that draws every frame for `ms`, or for ever. */
const frames = (page, ms) =>
  open(page, `<canvas id="c" width="16" height="16"></canvas><script>
    const gl = document.getElementById("c").getContext("webgl");
    const end = ${ms === Infinity ? "Infinity" : `performance.now() + ${ms}`};
    const tick = () => { gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.POINTS, 0, 1); if (performance.now() < end) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  </script>`);

test("untilStill waits for the last frame, and after it nothing is drawn or asked for", async ({ page }) => {
  await page.addInitScript(COUNT_SCRIPT);
  await frames(page, 1200);
  await untilStill(page, drawCounts, { quietMs: 500, timeoutMs: 15_000 });
  const before = await readCounts(page);
  await page.waitForTimeout(800);
  const after = await readCounts(page);
  expect(before.draws).toBeGreaterThan(0);
  expect(after.draws).toBe(before.draws);
  expect(after.rafRequests).toBe(before.rafRequests);
});

test("untilStill fails at its limit when frames keep coming", async ({ page }) => {
  await page.addInitScript(COUNT_SCRIPT);
  await frames(page, Infinity);
  await expect(untilStill(page, drawCounts, { quietMs: 500, timeoutMs: 1500 })).rejects.toThrow(/still changing 1500 ms/);
});
