import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// <kazoku-save-image> on demo/save-image.html, in a real browser at a phone's width and a desk's, in Chromium and WebKit.
// A download is read from disk, and its pixels are read by drawing the saved file back into a canvas.
const ready = async (page, query = "?theme=light&lang=en") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/save-image.html${query}`);
  await expect(page.locator("#save-canvas button").first()).toBeVisible();
  return errors;
};
const save = async (page, id, format) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(`#${id} button[data-v="${format}"]`).click()]);
  const bytes = readFileSync(await download.path());
  return { name: download.suggestedFilename(), bytes };
};
const png = (bytes) => ({ ok: bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
/** The colour of one pixel of a saved file, read by drawing it into a canvas in the page. */
const pixelOf = (page, bytes, mime, x, y) => page.evaluate(async ([data, type, px, py]) => {
  const url = URL.createObjectURL(new window.Blob([Uint8Array.from(window.atob(data), (c) => c.charCodeAt(0))], { type }));
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 150;
  canvas.height = image.naturalHeight || 210;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return [...context.getImageData(px, py, 1, 1).data];
}, [bytes.toString("base64"), mime, x, y]);
const near = (got, want, slack = 6) => want.every((v, i) => Math.abs(got[i] - v) <= slack);

test("a button for each format the picture can give, a finger wide and in the page's own style", async ({ page }) => {
  const errors = await ready(page);
  const report = await page.evaluate(() => [...document.querySelectorAll("kazoku-save-image")].map((el) => {
    const buttons = [...el.shadowRoot.querySelectorAll("button")];
    return {
      id: el.id,
      formats: buttons.map((b) => b.dataset.v),
      names: buttons.map((b) => b.textContent),
      small: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).length,
      plain: buttons.filter((b) => getComputedStyle(b).appearance !== "none").length,
      group: el.shadowRoot.querySelector(".group").getAttribute("aria-label"),
    };
  }));
  expect(report.map((r) => r.formats)).toEqual([["png"], ["png", "svg"], ["png"]]);
  expect(report[1].names).toEqual(["Save PNG", "Save SVG"]);
  for (const one of report) {
    expect(one.small).toBe(0);
    expect(one.plain).toBe(0);
    expect(one.group).toBe("Save image");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  expect(errors).toEqual([]);
});

test("a canvas is saved as a PNG at its own size, with its pixels", async ({ page }) => {
  await ready(page);
  const { name, bytes } = await save(page, "save-canvas", "png");
  expect(name).toBe("canvas-sample.png");
  expect(png(bytes)).toEqual({ ok: true, width: 360, height: 200 });
  expect(near(await pixelOf(page, bytes, "image/png", 5, 5), [36, 87, 214], 70)).toBe(true);
  expect((await pixelOf(page, bytes, "image/png", 5, 5))[3]).toBe(255);
  await expect(page.locator("#result")).toContainText("canvas-sample.png, PNG, 360 × 200");
  await expect(page.locator("#preview")).toBeVisible();
});

test("an SVG is saved as a PNG twice its size, in the colours the page drew it in, and transparent where nothing is drawn", async ({ page }) => {
  await ready(page);
  const { name, bytes } = await save(page, "save-vector", "png");
  expect(name).toBe("svg-sample.png");
  expect(png(bytes)).toEqual({ ok: true, width: 300, height: 420 });
  // The ring of the circle is painted by the page's stylesheet (.a), so the colour proves the styles were written into the picture.
  expect(near(await pixelOf(page, bytes, "image/png", 150, 100), [36, 87, 214])).toBe(true);
  expect((await pixelOf(page, bytes, "image/png", 0, 0))[3]).toBe(0);
});

test("an SVG is saved as an SVG that stands alone: it draws the same with none of the page's styles", async ({ page }) => {
  await ready(page);
  const { name, bytes } = await save(page, "save-vector", "svg");
  expect(name).toBe("svg-sample.svg");
  const text = bytes.toString("utf8");
  expect(text.startsWith("<svg")).toBe(true);
  expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(text).toContain('viewBox="0 0 150 210"');
  // Drawn as an image it has no stylesheet: the circle is still the page's blue.
  expect(near(await pixelOf(page, bytes, "image/svg+xml", 75, 48), [36, 87, 214])).toBe(true);
});

test("a piece of the page is saved as a PNG with its layout, borders, colours and text, on the colour asked for", async ({ page }) => {
  await ready(page);
  const box = await page.locator("#sheet").boundingBox();
  const chip = await page.locator("#sheet .chip").boundingBox();
  const { name, bytes } = await save(page, "save-sheet", "png");
  expect(name).toBe("sheet-sample.png");
  const size = png(bytes);
  expect(size.ok).toBe(true);
  expect(size.width).toBe(Math.ceil(box.width) * 2);
  expect(size.height).toBe(Math.ceil(box.height) * 2);
  // The corner is outside the rounded border: the colour asked for, opaque. The chip's left end is the page's blue.
  expect(await pixelOf(page, bytes, "image/png", 0, 0)).toEqual([255, 255, 255, 255]);
  expect(near(await pixelOf(page, bytes, "image/png", Math.round((chip.x - box.x + 8) * 2), Math.round((chip.y - box.y + chip.height / 2) * 2)), [36, 87, 214], 20)).toBe(true);
  // The border, in the accent colour, is there too.
  expect(near(await pixelOf(page, bytes, "image/png", Math.round(box.width), 2), [36, 87, 214], 40)).toBe(true);
});

test("the saved picture and the event agree, and the event says what was saved", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.__saved = []; document.addEventListener("kazoku-save", (event) => window.__saved.push({ format: event.detail.format, filename: event.detail.filename, width: event.detail.width, height: event.detail.height, reason: event.detail.reason, size: event.detail.blob.size })); });
  const { bytes } = await save(page, "save-vector", "png");
  const saved = await page.evaluate(() => window.__saved);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ format: "png", filename: "svg-sample.png", width: 300, height: 420, reason: "user" });
  expect(saved[0].size).toBe(bytes.length);
});

test("the scale attribute sets the pixels, and a huge one is held to what a browser can draw", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.getElementById("save-vector").setAttribute("scale", "1"));
  expect(png((await save(page, "save-vector", "png")).bytes)).toMatchObject({ width: 150, height: 210 });
  await page.evaluate(() => document.getElementById("save-vector").setAttribute("scale", "1000"));
  const big = png((await save(page, "save-vector", "png")).bytes);
  expect(Math.max(big.width, big.height)).toBeLessThanOrEqual(8192);
  expect(big.width * big.height).toBeLessThanOrEqual(36_000_000 * 1.001);
});

test("manual makes the picture and says so, but downloads nothing", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.getElementById("save-canvas").setAttribute("manual", ""));
  const download = page.waitForEvent("download", { timeout: 800 }).catch(() => null);
  await page.locator('#save-canvas button[data-v="png"]').click();
  // The picture is made from a serialised copy of the page: on a hosted runner busy with another test's software drawing, that took longer than the default 5 s (KAZOKU-UI-96, CI run 42789310715).
  await expect(page.locator("#result")).toContainText("canvas-sample.png", { timeout: 30_000 });
  expect(await download).toBeNull();
});

test("a save that cannot be made is an error event, and the page keeps working", async ({ page }) => {
  const errors = await ready(page);
  const result = await page.evaluate(async () => {
    const heard = [];
    document.addEventListener("kazoku-saveerror", (event) => heard.push({ format: event.detail.format, message: event.detail.error.message, reason: event.detail.reason }));
    const nowhere = document.createElement("kazoku-save-image");
    nowhere.setAttribute("for", "nope");
    document.body.append(nowhere);
    const failures = [];
    await nowhere.save("png").catch((error) => failures.push(error.message));
    await document.getElementById("save-canvas").save("svg").catch((error) => failures.push(error.message));
    return { heard, failures };
  });
  expect(result.failures).toHaveLength(2);
  expect(result.failures[0]).toContain("nothing to save");
  expect(result.failures[1]).toContain("only an SVG");
  expect(result.heard.map((h) => h.reason)).toEqual(["api", "api"]);
  await expect(page.locator("#result")).toContainText("Could not save");
  expect(errors).toEqual([]);
});

test("the labels are English or Japanese, and a phone keeps the icons and leaves the words to a screen reader", async ({ page }, info) => {
  await ready(page);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  const saver = page.locator("#save-vector");
  await expect(saver.locator('button[data-v="png"]')).toHaveText("PNGで保存");
  await expect(saver.locator('button[data-v="svg"]')).toHaveText("SVGで保存");
  expect(await page.evaluate(() => document.getElementById("save-vector").shadowRoot.querySelector(".group").getAttribute("aria-label"))).toBe("画像を保存");
  const wordsShown = await page.evaluate(() => [...document.getElementById("save-vector").shadowRoot.querySelectorAll(".t")].map((el) => el.getBoundingClientRect().width > 2));
  expect(wordsShown.every(Boolean)).toBe(!info.project.name.includes("phone"));
});

test("the formats attribute chooses and orders the buttons, and one the target cannot give is left out", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { document.getElementById("save-vector").setAttribute("formats", "svg png"); document.getElementById("save-canvas").setAttribute("formats", "svg"); });
  expect(await page.evaluate(() => [...document.getElementById("save-vector").shadowRoot.querySelectorAll("button")].map((b) => b.dataset.v))).toEqual(["svg", "png"]);
  expect(await page.evaluate(() => document.getElementById("save-canvas").shadowRoot.querySelectorAll("button").length)).toBe(0);
});

test("it works for a target inside another element's shadow root", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "inner";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<div id="piece" style="width:120px;height:60px;background:#c8102e"></div><kazoku-save-image for="piece" name="inner"></kazoku-save-image>';
    document.body.append(host);
  });
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#inner kazoku-save-image button").click()]);
  const bytes = readFileSync(await download.path());
  expect(download.suggestedFilename()).toBe("inner.png");
  expect(png(bytes)).toEqual({ ok: true, width: 240, height: 120 });
  expect(near(await pixelOf(page, bytes, "image/png", 100, 60), [200, 16, 46])).toBe(true);
});

test("a canvas inside a piece of the page is drawn into it, and an element saved dark follows the page's colours", async ({ page }) => {
  await ready(page, "?theme=dark&lang=en");
  await page.evaluate(() => {
    const sheet = document.getElementById("sheet");
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    canvas.id = "mini";
    const context = canvas.getContext("2d");
    context.fillStyle = "#00ff00";
    context.fillRect(0, 0, 40, 40);
    sheet.append(canvas);
  });
  const box = await page.locator("#sheet").boundingBox();
  const mini = await page.locator("#mini").boundingBox();
  const { bytes } = await save(page, "save-sheet", "png");
  expect(near(await pixelOf(page, bytes, "image/png", Math.round((mini.x - box.x + 20) * 2), Math.round((mini.y - box.y + 20) * 2)), [0, 255, 0])).toBe(true);
  // The dark page's sheet is not the light page's: the face colour under the text is the dark one.
  const dark = await pixelOf(page, bytes, "image/png", Math.round(box.width), Math.round(box.height - 6));
  expect(dark[0]).toBeLessThan(120);
});

test("a second copy of the package does not break the page: the tag already taken is left alone", async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const before = customElements.get("kazoku-save-image");
    const again = await import(`./dist/save-image/define.js?again=${Date.now()}`);
    return { same: customElements.get("kazoku-save-image") === before, defined: again.defineSaveImage() };
  });
  expect(result).toEqual({ same: true, defined: false });
});
