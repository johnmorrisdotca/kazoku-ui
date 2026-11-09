import { expect, test } from "@playwright/test";

// The print layout on demo/print.html, in a real browser at a phone's width and a desk's. Chromium also prints the page to a PDF (page.pdf) and the PDF is read for its paper size and page count.
const ready = async (page, query = "?theme=light&lang=en") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => { window.__printed += 1; };
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/print.html${query}`);
  await expect(page.locator(".kazoku-page").first()).toBeVisible();
  return errors;
};
const pick = (page, group, value) => page.locator(`[data-group="${group}"] button[data-value="${value}"]`).click();
/** The paper sizes and the number of pages in a PDF Chromium wrote, read from its page objects. */
const readPdf = (bytes) => {
  const text = bytes.toString("latin1");
  const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { pages: (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length, boxes };
};
const near = (got, want, slack = 1.5) => Math.abs(got - want) <= slack;
const PT = 72 / 25.4;

test("the sample sheet has the header, the info box and the footer with a QR code and the page number", async ({ page }) => {
  const errors = await ready(page);
  const sheet = page.locator(".kazoku-sheet");
  await expect(sheet.locator(".kazoku-brand")).toHaveText("Space Program X");
  await expect(sheet.locator(".kazoku-package")).toHaveText("A sample package");
  await expect(sheet.locator(".kazoku-title")).toHaveText("The planets");
  await expect(sheet.locator(".kazoku-namelabel")).toHaveText("Name:");
  await expect(sheet.locator(".kazoku-namefield")).toBeVisible();
  const cells = await sheet.locator(".kazoku-info dt").allTextContents();
  expect(cells).toEqual(["Region", "Flag", "Latitude band", "Season", "Level", "Language"]);
  await expect(sheet.locator(".kazoku-info img")).toHaveAttribute("alt", "A blue flag with a white circle");
  await expect(sheet.locator(".kazoku-credits")).toContainText("public domain");
  await expect(sheet.locator(".kazoku-meta")).toContainText(/Version demo · Date \d{4}-\d\d-\d\d/);
  await expect(sheet.locator(".kazoku-address")).toContainText("print.html");
  await expect(sheet.locator(".kazoku-qr svg path")).toHaveCount(1);
  await expect(sheet.locator(".kazoku-pageno")).toHaveText("Page 1 of 1");
  const name = await sheet.locator(".kazoku-name").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize) * 0.75);
  expect(name).toBeGreaterThanOrEqual(24);
  const line = await sheet.locator(".kazoku-namefield").evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth) * 25.4 / 96);
  expect(line).toBeGreaterThanOrEqual(2.5);
  expect(errors).toEqual([]);
});

test("the QR code on the sheet is the page's address: its modules match the encoder's", async ({ page }) => {
  await ready(page);
  const info = await page.evaluate(async () => {
    const { qrMatrix } = await import("./dist/print/index.js");
    const address = document.querySelector(".kazoku-address").textContent;
    const want = qrMatrix(address);
    const viewBox = document.querySelector(".kazoku-qr svg").getAttribute("viewBox").split(" ").map(Number);
    return { modules: want.length, box: viewBox[2], dark: want.flat().filter(Boolean).length };
  });
  expect(info.box).toBe(info.modules + 8);
  expect(info.dark).toBeGreaterThan(100);
});

test("Print / save PDF opens a print-only copy, calls window.print, and removes the copy afterwards", async ({ page }) => {
  await ready(page);
  await page.locator("#print").click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  await expect(page.locator("body > .kazoku-print-root .kazoku-sheet")).toHaveCount(1);
  expect(await page.locator("body > .kazoku-print-root").evaluate((el) => getComputedStyle(el).display)).toBe("none");
  await page.evaluate(() => window.dispatchEvent(new window.Event("afterprint")));
  await expect(page.locator(".kazoku-print-root")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-kazoku-print"))).toBe(false);
});

test("the paper buttons are a finger wide and the preview fits the screen", async ({ page }) => {
  await ready(page);
  const small = await page.locator(".pill").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height < 47.5 || el.getBoundingClientRect().width < 47.5).length);
  expect(small).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = await page.locator("#paper").boundingBox();
  const first = await page.locator(".kazoku-page").first().boundingBox();
  expect(first.width).toBeLessThanOrEqual(box.width + 1);
});

test("the sheet speaks Japanese in plain words", async ({ page }) => {
  await ready(page, "?theme=light&lang=ja");
  await expect(page.locator(".kazoku-namelabel")).toHaveText("なまえ:");
  await expect(page.locator(".kazoku-pageno")).toHaveText("1 / 1 ページ");
  await expect(page.locator(".kazoku-info dt").first()).toHaveText("ちいき");
  await expect(page.locator(".kazoku-title")).toHaveText("わくせい");
});

for (const [paper, orientation, wide, tall, tiles] of [["a4", "portrait", 210, 297, 6], ["letter", "portrait", 215.9, 279.4, 6], ["a3", "portrait", 297, 420, 2], ["tabloid", "landscape", 431.8, 279.4, 2], ["a4", "landscape", 297, 210, 4]]) {
  test(`${paper} ${orientation}: the sheet prints to one page of the paper's size, and the poster to ${tiles} pages with cut marks`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "page.pdf is Chromium's");
    await ready(page);
    await pick(page, "page", paper);
    await pick(page, "orientation", orientation);
    await page.locator("#print").click();
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    // On paper the page behind the copy is hidden and the sheet is the only thing shown.
    expect(await page.locator("main").evaluate((el) => getComputedStyle(el).display)).toBe("none");
    for (const part of [".kazoku-header", ".kazoku-info", ".kazoku-footer", ".kazoku-qr svg"]) await expect(page.locator(`.kazoku-print-root ${part}`)).toBeVisible();
    const inside = await page.locator(".kazoku-print-root .kazoku-page").evaluate((el) => {
      const kids = [...el.querySelectorAll(".kazoku-header, .kazoku-info, .kazoku-footer, .kazoku-qr")].map((k) => k.getBoundingClientRect());
      const box = el.getBoundingClientRect();
      const margin = parseFloat(getComputedStyle(el).paddingLeft);
      return { margin: margin * 25.4 / 96, fits: kids.every((r) => r.left >= box.left + margin - 1 && r.right <= box.right - margin + 1 && r.top >= box.top + margin - 1 && r.bottom <= box.bottom - margin + 1) };
    });
    expect(inside.margin).toBeGreaterThanOrEqual(12.6);
    expect(inside.fits).toBe(true);
    const sheetPdf = readPdf(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    expect(sheetPdf.pages).toBe(1);
    expect(near(sheetPdf.boxes[0][0], wide * PT)).toBe(true);
    expect(near(sheetPdf.boxes[0][1], tall * PT)).toBe(true);

    await page.evaluate(() => window.dispatchEvent(new window.Event("afterprint")));
    await page.emulateMedia({ media: "screen", colorScheme: "light" });
    await pick(page, "what", "poster");
    await expect(page.locator(".kazoku-sheet .kazoku-tile")).toHaveCount(tiles);
    await expect(page.locator(".kazoku-sheet .kazoku-tile").first().locator(".kazoku-marks line")).toHaveCount(8);
    await expect(page.locator("#info")).toContainText(`${tiles} pages`);
    await page.locator("#print").click();
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    await expect(page.locator(".kazoku-print-root .kazoku-pageno").last()).toHaveText(`Page ${tiles} of ${tiles}`);
    const posterPdf = readPdf(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    expect(posterPdf.pages).toBe(tiles);
    expect(posterPdf.boxes.every(([w, h]) => near(w, wide * PT) && near(h, tall * PT))).toBe(true);
  });
}
