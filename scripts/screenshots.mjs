// Takes the README's still pictures into docs/images as webp (made in the browser, so no tool beyond Chromium), light and dark: the hero (the demo at a desk's width, turned a little),
// the layouts side by side (layouts.html at a desk's width) and the layouts on a phone (horizontal, vertical and compact, one under another).
// It serves the demo on port 8402, or TEST_PORT, and stops the server it started. It needs the site built (`pnpm screenshots` builds first).
// IMAGES_OUT writes somewhere else than docs/images; PNG=1 writes png beside the webp (to look at them).
// Then the family's thumbnail, dark thumbnail and icon (scripts/family-thumbnail.mjs, always in docs/images); `--thumbnail` takes only those three.
// Chromium draws in software only (SwiftShader), never on the graphics card.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { captureDrawing, composeThumbnails } from "./family-thumbnail.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const onlyThumbnail = process.argv.includes("--thumbnail");
const out = process.env.IMAGES_OUT ?? `${root}docs/images`;
mkdirSync(out, { recursive: true });
const port = Number(process.env.TEST_PORT ?? 8402);
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
  const browser = await chromium.launch({ args: ["--headless=new", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-compositing"] });
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
  for (const scheme of onlyThumbnail ? [] : ["light", "dark"]) {
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
  for (const scheme of onlyThumbnail ? [] : ["light", "dark"]) {
    // Every layout side by side, the zoom a little in so the slider shows its fill, and More open on compact so its second step shows too.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/layouts.html`);
    await page.waitForFunction(() => [...document.querySelectorAll("kazoku-view-controls")].every((el) => el.shadowRoot?.querySelector(".bar")));
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("kazoku-view-controls")) el.set({ yaw: -28, tilt: 10, zoom: 1.6 });
      document.querySelector('[data-testid="controls-compact"]').setAttribute("controls", "advanced");
      document.activeElement?.blur();
    });
    await page.waitForTimeout(200);
    const png = await page.locator(".layouts").screenshot();
    writeFileSync(`${out}/layouts-${scheme}.webp`, await webp(png));
    if (process.env.PNG) writeFileSync(`${out}/layouts-${scheme}.png`, png);
    await context.close();
  }
  // The pictures of the guides (docs/guides): the layouts on a phone, the header's switches, the address, save-image, the renderer and the builder, light and dark.
  const GUIDE = [
    { name: "layouts-phone", viewport: { width: 390, height: 900 }, url: "/layouts.html", selector: ".layouts", ready: () => [...document.querySelectorAll("kazoku-view-controls")].every((el) => el.shadowRoot?.querySelector(".bar")), prepare: () => { for (const el of document.querySelectorAll("kazoku-view-controls")) el.set({ yaw: -28, tilt: 10, zoom: 1.6 }); } },
    { name: "switches", viewport: { width: 820, height: 300 }, url: "/", selector: ".top", ready: () => document.querySelector("kazoku-theme-switch")?.shadowRoot?.querySelector("button") && document.querySelector("kazoku-language-picker")?.shadowRoot?.querySelector("button") },
    { name: "address", viewport: { width: 820, height: 700 }, url: "/address.html?size=l&dots=on", selector: "main", ready: () => document.querySelector("kazoku-theme-switch")?.shadowRoot?.querySelector("button") },
    { name: "save-image", viewport: { width: 1000, height: 700 }, url: "/save-image.html", selector: ".targets", ready: () => [...document.querySelectorAll("kazoku-save-image")].every((el) => el.shadowRoot?.querySelector("button")) },
    { name: "renderer", viewport: { width: 1000, height: 900 }, url: "/renderer.html", selector: "main", ready: () => document.querySelector('.host[data-live="1"]') && document.querySelectorAll(".host img").length > 8, settle: 1500 },
    { name: "builder", viewport: { width: 1100, height: 900 }, url: "/builder.html?kazoku-view-controls.layout=horizontal&kazoku-view-controls.level=advanced", selector: "main", ready: () => document.querySelector("#stage kazoku-view-controls")?.shadowRoot?.querySelector(".bar") },
  ];
  for (const scheme of onlyThumbnail ? [] : ["light", "dark"]) {
    for (const guide of GUIDE) {
      const context = await browser.newContext({ viewport: guide.viewport, deviceScaleFactor: guide.viewport.width < 500 ? 2 : 1.5, colorScheme: scheme, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}${guide.url}`);
      await page.waitForFunction(guide.ready, null, { timeout: 20000 });
      if (guide.prepare) await page.evaluate(guide.prepare);
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForTimeout(guide.settle ?? 300);
      const png = await page.locator(guide.selector).first().screenshot();
      writeFileSync(`${out}/${guide.name}-${scheme}.webp`, await webp(png));
      if (process.env.PNG) writeFileSync(`${out}/${guide.name}-${scheme}.png`, png);
      await context.close();
    }
  }
  // The family's thumbnail: the demo's card, turned and tipped, over the view controls that turn it, on the family's
  // paper and its black cloth; the icon is the card alone. The dotted floor, the header and the words around are left out.
  const stage = async (page, withControls) => {
    await page.goto(`http://127.0.0.1:${port}/?yaw=-32&tilt=14&zoom=1.5`);
    await page.waitForFunction(() => document.querySelector("kazoku-view-controls")?.shadowRoot?.querySelector(".bar"));
    await page.evaluate((withControls) => {
      document.activeElement?.blur();
      const stage = document.createElement("div");
      stage.id = "thumbnail-stage";
      stage.style.cssText = "display:flex;flex-direction:column;gap:12px;width:860px;padding:8px";
      const scene = document.getElementById("scene");
      scene.style.cssText = "background:transparent;border:0;height:380px";
      for (const part of scene.querySelectorAll(".grid, .pin")) part.remove();
      stage.append(scene);
      if (withControls) stage.append(document.getElementById("controls"));
      document.querySelector("main").replaceChildren(stage);
    }, withControls);
    await page.waitForTimeout(600);
    return captureDrawing(page, "#thumbnail-stage");
  };
  const taken = {};
  for (const [kind, scheme] of [["light", "light"], ["dark", "dark"], ["icon", "light"]]) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    taken[kind] = await stage(page, kind !== "icon");
    if (kind === "icon") for (const picture of await composeThumbnails({ page, root, light: taken.light, dark: taken.dark, icon: taken.icon, label: "Kazoku UI 家族" })) console.log(picture.file, `${Math.round(picture.bytes / 1024)} KB`);
    await context.close();
  }
  await browser.close();
  console.log(`pictures written to ${out}`);
} finally {
  server.kill();
}
