import { expect, test } from "@playwright/test";

// The wide layout on demo/wide.html, in a real browser at a phone's width and a desk's: the toggle, the layout rule, the address, the T key and the view drawing again at its new size.
const TOGGLE = "kazoku-wide-toggle";
const button = (page) => page.locator(`${TOGGLE} button`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/wide.html${query}`);
  await expect(page.locator(".kazoku-view")).toBeVisible();
  return errors;
};
const boxes = (page) => page.evaluate(() => {
  const at = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  return { view: at(".kazoku-view"), side: at(".kazoku-side"), main: at("main"), wide: document.documentElement.getAttribute("data-wide"), window: window.innerWidth, scrolls: document.documentElement.scrollWidth > window.innerWidth + 1 };
});
const onDesk = (page) => page.viewportSize().width > 640;

test("Normal has the panel beside the view; Wide gives the view the width and puts the panel below it", async ({ page }) => {
  const errors = await ready(page);
  if (!onDesk(page)) {
    // A phone is one column already, and the toggle is hidden.
    await expect(page.locator(TOGGLE)).toBeHidden();
    const phone = await boxes(page);
    expect(phone.side.top).toBeGreaterThanOrEqual(phone.view.bottom - 1);
    expect(phone.scrolls).toBe(false);
    return;
  }
  await expect(button(page)).toHaveText("Wide");
  const normal = await boxes(page);
  expect(normal.wide).toBeNull();
  expect(normal.side.left).toBeGreaterThanOrEqual(normal.view.right - 1);
  expect(Math.abs(normal.side.top - normal.view.top)).toBeLessThan(2);
  await button(page).click();
  await expect(button(page)).toHaveText("Normal");
  const wide = await boxes(page);
  expect(wide.wide).toBe("on");
  expect(wide.view.width).toBeGreaterThan(normal.view.width + 100);
  expect(wide.view.width).toBeGreaterThan(wide.window - 60);
  expect(wide.view.height).toBeLessThanOrEqual(900 * 0.8 + 1);
  expect(wide.side.top).toBeGreaterThanOrEqual(wide.view.bottom - 1);
  expect(wide.side.width).toBeGreaterThan(normal.side.width + 100);
  const row = await page.locator(".kazoku-side .panel").evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().top))).size);
  expect(row, "the boxes of the panel are in a row, not a long column").toBe(1);
  expect(wide.scrolls).toBe(false);
  await button(page).click();
  const back = await boxes(page);
  expect(back.wide).toBeNull();
  expect(back.side.left).toBeGreaterThanOrEqual(back.view.right - 1);
  expect(Math.abs(back.view.width - normal.view.width)).toBeLessThan(2);
  expect(errors).toEqual([]);
});

test("the address keeps the choice, and so does the device", async ({ page }) => {
  test.skip(!onDesk(page), "no toggle on a phone");
  await ready(page);
  await button(page).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("wide")).toBe("on");
  await button(page).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("wide")).toBeNull();
  await ready(page, "?wide=on");
  expect((await boxes(page)).wide).toBe("on");
  await expect(button(page)).toHaveText("Normal");
  // Remembered on this device: after a press, a page opened with no address in it comes up wide.
  await button(page).click();
  await button(page).click();
  await page.goto("/wide.html");
  await expect.poll(async () => (await boxes(page)).wide).toBe("on");
  await button(page).click();
  await page.goto("/wide.html");
  await expect(button(page)).toHaveText("Wide");
  expect((await boxes(page)).wide).toBeNull();
});

test("the T key toggles it, except while typing or with Ctrl, Command or Alt held", async ({ page }) => {
  test.skip(!onDesk(page), "no toggle on a phone");
  await ready(page);
  await page.keyboard.press("t");
  await expect(button(page)).toHaveText("Normal");
  await page.keyboard.press("T");
  await expect(button(page)).toHaveText("Wide");
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "typing";
    document.querySelector("main").append(input);
    const editable = document.createElement("div");
    editable.id = "editable";
    editable.contentEditable = "true";
    editable.textContent = "x";
    document.querySelector("main").append(editable);
  });
  await page.locator("#typing").focus();
  await page.keyboard.type("tt");
  expect((await boxes(page)).wide).toBeNull();
  await expect(page.locator("#typing")).toHaveValue("tt");
  await page.locator("#editable").focus();
  await page.keyboard.press("t");
  expect((await boxes(page)).wide).toBeNull();
  await page.locator("#editable").evaluate((el) => el.blur());
  await page.keyboard.press("Alt+t");
  await page.keyboard.press("Control+t");
  expect((await boxes(page)).wide).toBeNull();
});

test("the view draws again at its new size, inside the caps, when the layout changes", async ({ page }) => {
  test.skip(!onDesk(page), "no toggle on a phone");
  await ready(page);
  const drawn = () => page.locator("#picture").evaluate((el) => ({ w: el.width, h: el.height, at: el.dataset.drawn, css: { w: el.parentElement.clientWidth, h: el.parentElement.clientHeight }, ratio: window.devicePixelRatio }));
  const first = await drawn();
  expect(first.w).toBe(Math.round(first.css.w * Math.min(first.ratio, 2)));
  await page.evaluate(() => { window.__resizes = 0; window.addEventListener("resize", () => { window.__resizes += 1; }); });
  await button(page).click();
  await expect.poll(() => page.evaluate(() => window.__resizes)).toBe(1);
  const after = await drawn();
  expect(after.w).toBeGreaterThan(first.w + 100);
  expect(after.w).toBe(Math.round(after.css.w * Math.min(after.ratio, 2)));
  expect(after.h).toBe(Math.round(after.css.h * Math.min(after.ratio, 2)));
  expect(Math.max(after.w, after.h)).toBeLessThanOrEqual(4096);
  expect(after.w * after.h).toBeLessThanOrEqual(6e6);
  await expect(page.locator("#drawn")).toContainText(`${after.w} × ${after.h}`);
});

test("resize can be turned off, and a page that sets the choice by code hears it", async ({ page }) => {
  test.skip(!onDesk(page), "no toggle on a phone");
  await ready(page);
  const heard = await page.evaluate(async () => {
    const toggle = document.querySelector("kazoku-wide-toggle");
    const seen = [];
    toggle.addEventListener("kazoku-widechange", (event) => seen.push([event.detail.wide, event.detail.reason]));
    let resizes = 0;
    window.addEventListener("resize", () => { resizes += 1; });
    toggle.setAttribute("resize", "off");
    toggle.wide = true;
    toggle.wide = true;
    toggle.toggle();
    document.documentElement.setAttribute("data-wide", "on");
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { seen, resizes, wide: toggle.wide };
  });
  expect(heard.seen).toEqual([[true, "set"], [false, "user"], [true, "external"]]);
  expect(heard.resizes).toBe(0);
  expect(heard.wide).toBe(true);
});

test("the button speaks Japanese, a finger wide, and keeps its state in its name", async ({ page }) => {
  test.skip(!onDesk(page), "no toggle on a phone");
  await ready(page, "?lang=ja");
  await expect(button(page)).toHaveText("ワイド");
  await button(page).click();
  await expect(button(page)).toHaveText("ふつう");
  const box = await button(page).boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(47.5);
  expect(box.width).toBeGreaterThanOrEqual(47.5);
  await expect(button(page)).toHaveAttribute("aria-keyshortcuts", "T");
  await expect(button(page)).not.toHaveAttribute("aria-pressed", /.*/);
});
