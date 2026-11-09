import { expect, test } from "@playwright/test";

// A package's own element that carries the view controls with `carryControls` (carry.html): the drag, the pinch, the wheel, the keys and the limits, with no bar.
const view = (page, id) => page.locator(`#${id}`);
const read = (page, id) => view(page, id).evaluate((el) => ({ zoom: Number(el.dataset.zoom), yaw: Number(el.dataset.yaw), tilt: Number(el.dataset.tilt), panX: Number(el.dataset.panX) }));
const centreOf = async (page, id) => {
  const box = await view(page, id).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height };
};
/** A touch pointer event sent to the element: the same in every browser. */
const touch = (page, id, type, pointer, x, y) => view(page, id).evaluate((el, [t, i, cx, cy]) => {
  el.dispatchEvent(new PointerEvent(t, { pointerId: i, pointerType: "touch", isPrimary: i === 1, clientX: cx, clientY: cy, bubbles: true, cancelable: true, button: 0, buttons: t === "pointerup" ? 0 : 1 }));
}, [type, pointer, x, y]);
/** A wheel turn with Ctrl held, sent to the element: the event a trackpad's pinch makes, and the same in every browser (a real Ctrl and wheel is the page's own zoom on WebKit for Linux). */
const ctrlWheel = (page, id, deltaY) => view(page, id).evaluate((el, dy) => {
  const r = el.getBoundingClientRect();
  el.dispatchEvent(new WheelEvent("wheel", { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, deltaY: dy, ctrlKey: true, bubbles: true, cancelable: true }));
}, deltaY);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/carry.html${query}`);
  await expect(view(page, "plain")).toHaveAttribute("data-zoom", "1");
  return errors;
};
const press = async (page, id, key, times) => {
  await view(page, id).focus();
  for (let i = 0; i < times; i += 1) await page.keyboard.press(key);
};

test("an element that carries the controls takes a drag, with a tabindex and as a block, and a drag at Fit turns it", async ({ page }) => {
  const errors = await ready(page);
  expect(await view(page, "limited").evaluate((el) => [getComputedStyle(el).display, el.getAttribute("tabindex"), el.style.touchAction])).toEqual(["block", "0", "pan-y"]);
  expect(await view(page, "plain").getAttribute("tabindex"), "a tabindex the page gave is kept").toBe("-1");
  const at = await centreOf(page, "limited");
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 30, at.y, { steps: 4 });
  await page.mouse.up();
  const turned = await read(page, "limited");
  expect(turned.yaw).toBeGreaterThan(10);
  expect(turned.zoom).toBe(1);
  expect(errors).toEqual([]);
});

test("the plain wheel at Fit scrolls the page, and Ctrl and the wheel zooms the element about the pointer", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { document.body.style.minHeight = "400vh"; });
  await view(page, "plain").scrollIntoViewIfNeeded();
  const at = await centreOf(page, "plain");
  await page.mouse.move(at.x, at.y);
  const top = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(top);
  expect((await read(page, "plain")).zoom).toBe(1);
  await ctrlWheel(page, "plain", -80);
  expect((await read(page, "plain")).zoom).toBeGreaterThan(1);
  expect(await view(page, "plain").evaluate((el) => !el.dispatchEvent(new WheelEvent("wheel", { deltaY: -40, ctrlKey: true, bubbles: true, cancelable: true }))), "Ctrl and the wheel is the view's, not the page's").toBe(true);
  await ctrlWheel(page, "plain", 800);
  await expect.poll(async () => (await read(page, "plain")).zoom).toBeLessThan(1);
});

test("two fingers pinch it", async ({ page }) => {
  await ready(page);
  const mid = await centreOf(page, "plain");
  await touch(page, "plain", "pointerdown", 1, mid.x - 50, mid.y);
  await touch(page, "plain", "pointerdown", 2, mid.x + 50, mid.y);
  await touch(page, "plain", "pointermove", 1, mid.x - 100, mid.y);
  await touch(page, "plain", "pointermove", 2, mid.x + 100, mid.y);
  expect((await read(page, "plain")).zoom).toBeCloseTo(2, 1);
  await touch(page, "plain", "pointerup", 2, mid.x + 100, mid.y);
  await touch(page, "plain", "pointerup", 1, mid.x - 100, mid.y);
  expect(await view(page, "plain").evaluate((el) => el.style.touchAction), "zoomed in, the browser leaves the touch to the view").toBe("none");
  await touch(page, "plain", "pointerdown", 1, mid.x - 40, mid.y);
  await touch(page, "plain", "pointerdown", 2, mid.x + 40, mid.y);
  await touch(page, "plain", "pointermove", 1, mid.x - 5, mid.y);
  await touch(page, "plain", "pointermove", 2, mid.x + 5, mid.y);
  expect((await read(page, "plain")).zoom).toBeLessThan(1);
});

test("the keys zoom and turn it once it has the focus, and 0 puts it back", async ({ page }) => {
  await ready(page);
  await press(page, "plain", "+", 3);
  expect((await read(page, "plain")).zoom).toBeCloseTo(1.25 ** 3, 1);
  await page.keyboard.press("ArrowRight");
  expect((await read(page, "plain")).yaw).toBe(15);
  await page.keyboard.press("0");
  expect(await read(page, "plain")).toMatchObject({ zoom: 1, yaw: 0 });
});

test("the default range runs from a tenth of Fit to fifty times it, and zoom-min and zoom-max are its own", async ({ page }) => {
  await ready(page);
  await press(page, "plain", "-", 14);
  expect((await read(page, "plain")).zoom).toBe(0.1);
  await page.keyboard.press("0");
  for (let i = 0; i < 4; i += 1) await ctrlWheel(page, "plain", -400);
  await press(page, "plain", "+", 30);
  expect((await read(page, "plain")).zoom).toBe(50);
  await press(page, "limited", "-", 12);
  expect((await read(page, "limited")).zoom).toBe(0.5);
  await press(page, "limited", "+", 20);
  expect((await read(page, "limited")).zoom).toBe(4);
  // Changing the attributes later changes the limits, and a zoom outside them is brought in.
  await view(page, "limited").evaluate((el) => el.setAttribute("zoom-max", "2"));
  await expect.poll(async () => (await read(page, "limited")).zoom).toBe(2);
  await view(page, "limited").evaluate((el) => { el.removeAttribute("zoom-max"); el.removeAttribute("zoom-min"); });
  await press(page, "limited", "+", 30);
  expect((await read(page, "limited")).zoom).toBe(50);
});

test("controls=\"none\" takes no hands, and turning it on and off takes effect at once", async ({ page }) => {
  await ready(page);
  const at = await centreOf(page, "off");
  const drag = async () => {
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 40, at.y, { steps: 4 });
    await page.mouse.up();
  };
  await drag();
  expect((await read(page, "off")).yaw).toBe(0);
  expect(await view(page, "off").getAttribute("tabindex")).toBeNull();
  await view(page, "off").evaluate((el) => el.removeAttribute("controls"));
  await expect(view(page, "off")).toHaveAttribute("tabindex", "0");
  await drag();
  expect((await read(page, "off")).yaw).toBeGreaterThan(10);
  await view(page, "off").evaluate((el) => el.setAttribute("controls", "none"));
  await expect.poll(() => view(page, "off").getAttribute("tabindex")).toBeNull();
});

test("a bar for the element takes the hands while it is there, and gives them back when it goes", async ({ page }) => {
  await ready(page);
  await expect(view(page, "barred")).toHaveAttribute("data-kazoku-bar", "");
  await page.locator('[data-testid="bar"] [data-b="in"]').click();
  const zoomed = (await read(page, "barred")).zoom;
  expect(zoomed).toBeCloseTo(1.4, 2);
  await view(page, "barred").scrollIntoViewIfNeeded();
  await ctrlWheel(page, "barred", -50);
  // One hand zooms it once: the wheel's factor, from where the bar had it.
  expect((await read(page, "barred")).zoom).toBeCloseTo(zoomed * Math.exp(0.5), 1);
  await page.locator('[data-testid="bar"]').evaluate((el) => el.remove());
  await expect(view(page, "barred")).not.toHaveAttribute("data-kazoku-bar", "");
  await view(page, "barred").scrollIntoViewIfNeeded();
  const there = await centreOf(page, "barred");
  await page.mouse.move(there.x, there.y);
  await page.mouse.down();
  await page.mouse.move(there.x + 30, there.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await read(page, "barred")).yaw, "the element starts again from its own Fit").toBeGreaterThan(10);
});

test("a bar for an element with limits in code takes them, and the bar's own attributes win", async ({ page }) => {
  await ready(page);
  const bar = page.locator('[data-testid="coded-bar"]');
  const zoom = () => bar.evaluate((el) => el.state.zoom);
  const slider = bar.locator("#zoom");
  await view(page, "coded").scrollIntoViewIfNeeded();
  await slider.focus();
  await page.keyboard.press("End");
  expect(await zoom()).toBeCloseTo(2.5, 6);
  await page.keyboard.press("Home");
  expect(await zoom()).toBeCloseTo(1e-6, 9);
  await page.keyboard.press("End");
  for (let i = 0; i < 6; i += 1) await ctrlWheel(page, "coded", -400);
  expect(await zoom()).toBeCloseTo(2.5, 6);
  for (let i = 0; i < 40; i += 1) await ctrlWheel(page, "coded", 400);
  expect(await zoom()).toBeCloseTo(1e-6, 9);
  await bar.evaluate((el) => el.setAttribute("zoom-max", "4"));
  await slider.focus();
  await page.keyboard.press("End");
  expect(await zoom()).toBeCloseTo(4, 6);
  await bar.evaluate((el) => el.removeAttribute("zoom-max"));
  await expect.poll(zoom).toBeCloseTo(2.5, 6);
  await bar.evaluate((el) => el.remove());
  await expect(view(page, "coded")).not.toHaveAttribute("data-kazoku-bar", "");
});

test("an element that leaves the page lets its hands go, and a moved element gets them again", async ({ page }) => {
  await ready(page);
  await view(page, "limited").evaluate((el) => { window.keep = el; el.remove(); });
  expect(await page.evaluate(() => [window.keep.style.touchAction, window.keep.hasAttribute("tabindex")])).toEqual(["", false]);
  await page.evaluate(() => document.querySelector("main").append(window.keep));
  expect(await view(page, "limited").evaluate((el) => [el.getAttribute("tabindex"), el.style.touchAction])).toEqual(["0", "pan-y"]);
});
