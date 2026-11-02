import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The view controls on pages whose Content-Security-Policy allows no inline style (demo/csp.html: `style-src 'self'`; demo/csp-nonce.html: `style-src 'self' 'nonce-kazoku'`).
// A style the policy blocks is a `securitypolicyviolation` event, counted on the page in `data-violations`, and a blocked style leaves the buttons at the browser's default height.
const BAR = "kazoku-view-controls";
const visit = async (page, path) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(path);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  return errors;
};
const styled = (page) => page.evaluate((tag) => {
  const root = document.querySelector(tag).shadowRoot;
  const play = root.querySelector('[data-b="play"]');
  return {
    height: getComputedStyle(play).minHeight,
    appearance: getComputedStyle(play).appearance,
    adopted: root.adoptedStyleSheets.length,
    styleElements: root.querySelectorAll("style").length,
  };
}, BAR);
const switchStyled = (page) => page.evaluate(() => {
  const root = document.querySelector("kazoku-theme-switch").shadowRoot;
  if (root?.querySelector("button") == null) return {};
  return { height: getComputedStyle(root.querySelector("button")).minHeight, adopted: root.adoptedStyleSheets.length, styleElements: root.querySelectorAll("style").length };
});
const pickerStyled = (page) => page.evaluate(() => {
  const root = document.querySelector("kazoku-language-picker").shadowRoot;
  if (root?.querySelector("button") == null) return {};
  return { height: getComputedStyle(root.querySelector("button")).minHeight, adopted: root.adoptedStyleSheets.length, styleElements: root.querySelectorAll("style").length };
});
const saverStyled = (page) => page.evaluate(() => {
  const root = document.querySelector("kazoku-save-image").shadowRoot;
  if (root?.querySelector("button") == null) return {};
  return { height: getComputedStyle(root.querySelector("button")).minHeight, adopted: root.adoptedStyleSheets.length, styleElements: root.querySelectorAll("style").length };
});
const blocked = (page) => page.evaluate(() => Number(document.body.dataset.violations));

test("a strict style-src: the controls are styled from an adopted stylesheet and nothing is blocked", async ({ page }) => {
  const errors = await visit(page, "/csp.html");
  await expect.poll(() => styled(page)).toMatchObject({ height: "48px", appearance: "none", adopted: 1, styleElements: 0 });
  await expect.poll(() => switchStyled(page)).toMatchObject({ height: "48px", adopted: 1, styleElements: 0 });
  await expect.poll(() => pickerStyled(page)).toMatchObject({ height: "48px", adopted: 1, styleElements: 0 });
  await expect.poll(() => saverStyled(page)).toMatchObject({ height: "48px", adopted: 1, styleElements: 0 });
  await page.waitForTimeout(300);
  expect(await blocked(page)).toBe(0);
  expect(errors).toEqual([]);
});

test("a strict style-src: the controls still work", async ({ page }) => {
  await visit(page, "/csp.html");
  await page.locator(`${BAR} [data-b="in"]`).click();
  expect(await page.evaluate((tag) => document.querySelector(tag).state.zoom, BAR)).toBe(1.4);
  await page.locator(`${BAR} [data-b="play"]`).click();
  await expect(page.locator(`${BAR} [data-b="play"]`)).toHaveAttribute("aria-pressed", "true");
  await page.locator("kazoku-language-picker button[data-v=ja]").click();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ja");
  await page.locator("kazoku-theme-switch button[data-v=dark]").click();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
  expect(await blocked(page)).toBe(0);
});

test("a strict policy that allows data: images still lets a piece of the page be saved as a PNG", async ({ page }) => {
  await visit(page, "/csp.html");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("kazoku-save-image button[data-v=png]").click()]);
  const bytes = readFileSync(await download.path());
  expect(download.suggestedFilename()).toBe("scene.png");
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(await blocked(page)).toBe(0);
});

test("two elements share one adopted stylesheet", async ({ page }) => {
  await visit(page, "/csp.html");
  const same = await page.evaluate((tag) => {
    const second = document.createElement(tag);
    document.querySelector("main").append(second);
    return document.querySelector(tag).shadowRoot.adoptedStyleSheets[0] === second.shadowRoot.adoptedStyleSheets[0];
  }, BAR);
  expect(same).toBe(true);
});

test("without constructable stylesheets, a nonce lets the <style> route through a strict style-src", async ({ page }) => {
  const errors = await visit(page, "/csp-nonce.html?fallback");
  await expect.poll(() => styled(page)).toMatchObject({ height: "48px", appearance: "none", adopted: 0, styleElements: 1 });
  await expect.poll(() => switchStyled(page)).toMatchObject({ height: "48px", adopted: 0, styleElements: 1 });
  await expect.poll(() => pickerStyled(page)).toMatchObject({ height: "48px", adopted: 0, styleElements: 1 });
  await expect.poll(() => saverStyled(page)).toMatchObject({ height: "48px", adopted: 0, styleElements: 1 });
  await page.waitForTimeout(300);
  expect(await blocked(page)).toBe(0);
  expect(errors).toEqual([]);
});

test("a nonce page also takes the adopted route when the browser has it", async ({ page }) => {
  await visit(page, "/csp-nonce.html");
  await expect.poll(() => styled(page)).toMatchObject({ height: "48px", adopted: 1, styleElements: 0 });
  expect(await blocked(page)).toBe(0);
});

test("without constructable stylesheets and without a nonce, a strict style-src blocks the <style> (the page is told)", async ({ page }) => {
  await visit(page, "/csp.html?fallback");
  await expect.poll(() => blocked(page)).toBeGreaterThan(0);
  expect((await styled(page)).height).not.toBe("48px");
});
