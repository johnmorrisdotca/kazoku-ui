// Takes the README's still hero picture into docs/images as webp (made in the browser, so no tool beyond Chromium): the demo at a desk's width, turned a little, light and dark.
// It serves the demo on port 8102, or TEST_PORT, and stops the server it started. It needs the site built (`pnpm screenshots` builds first).
// IMAGES_OUT writes somewhere else than docs/images; PNG=1 writes png beside the webp (to look at them).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = process.env.IMAGES_OUT ?? `${root}docs/images`;
mkdirSync(out, { recursive: true });
const port = Number(process.env.TEST_PORT ?? 8102);
const server = spawn(process.execPath, ["scripts/dev.mjs"], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
try {
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = async () => {
      try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return resolve(); } catch { /* not up yet */ }
      if (Date.now() - started > 8000) return reject(new Error("the demo server did not start"));
      setTimeout(poll, 150);
    };
    poll();
  });
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const webp = async (png) => {
    const page = await browser.newPage();
    const base64 = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const blob = await new Promise((done) => canvas.toBlob(done, "image/webp", 0.86));
      const reader = new globalThis.FileReader();
      reader.readAsDataURL(blob);
      await new Promise((done) => { reader.onloadend = done; });
      return String(reader.result).split(",")[1];
    }, png.toString("base64"));
    await page.close();
    return Buffer.from(base64, "base64");
  };
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 820, height: 640 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/?yaw=-32&tilt=14&zoom=1.4`);
    await page.waitForFunction(() => document.querySelector("kazoku-view-controls")?.shadowRoot?.querySelector(".bar"));
    await page.evaluate(() => document.activeElement?.blur());
    const png = await page.locator("main").screenshot();
    writeFileSync(`${out}/hero-${scheme}.webp`, await webp(png));
    if (process.env.PNG) writeFileSync(`${out}/hero-${scheme}.png`, png);
    await context.close();
  }
  await browser.close();
  console.log(`pictures written to ${out}`);
} finally {
  server.kill();
}
