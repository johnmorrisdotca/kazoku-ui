import { expect, test } from "@playwright/test";

// The layouts (horizontal, vertical, compact; classic is every other file) and the zoom slider, in a real browser at a phone's width and a desk's.
const BAR = "kazoku-view-controls";
const stateOf = (page) => page.evaluate((tag) => ({ ...document.querySelector(tag).state }), BAR);
const button = (page, name) => page.locator(`${BAR} [data-b="${name}"]`);
const slider = (page) => page.locator(`${BAR} #zoom`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  return errors;
};
/** The controls a reader can see, in the order they come, with the rows they make and the least height of any. */
const look = (page) => page.evaluate((tag) => {
  const el = document.querySelector(tag);
  const kids = (root) => [...root.querySelectorAll("button, input, kazoku-speed-buttons")].flatMap((n) => (n.localName === "kazoku-speed-buttons" ? [...n.shadowRoot.querySelectorAll("button")] : [n]));
  const seen = kids(el.shadowRoot).filter((node) => node.getClientRects().length > 0);
  // Rows: the middles in order, a new row wherever the next middle is more than half a button below.
  const middles = seen.map((node) => { const r = node.getBoundingClientRect(); return (r.top + r.bottom) / 2; }).sort((a, b) => a - b);
  const rows = middles.filter((y, i) => i === 0 || y - middles[i - 1] > 24);
  return {
    shown: seen.map((node) => node.dataset.b ?? (node.dataset.v === undefined ? node.id : `pace-${node.dataset.v}`)),
    rows: rows.length,
    least: Math.min(...seen.map((node) => node.getBoundingClientRect().height)),
    width: el.shadowRoot.querySelector(".bar").getBoundingClientRect().width,
    height: el.shadowRoot.querySelector(".bar").getBoundingClientRect().height,
    fits: document.documentElement.scrollWidth <= window.innerWidth + 1,
  };
}, BAR);
/** A phone's width (WebKit's phone project is a desktop browser at a phone's size, so `isMobile` is Chromium's alone). */
const narrow = (page) => page.viewportSize().width < 640;
const marks = (page) => page.locator(`${BAR} .zmark`).allTextContents();

test("horizontal: the turn on one row and the zoom slider on the next, finger wide, no row added while it turns", async ({ page }) => {
  const errors = await ready(page, "?layout=horizontal");
  const phone = narrow(page);
  const still = await look(page);
  // On a phone the readout is Fit, which leaves the slider room for its marks.
  expect(still.shown).toEqual(phone ? ["yaw", "play", "zoom", "out", "level", "in", "more"] : ["yaw", "play", "zoom", "out", "level", "in", "fit", "more"]);
  // On a phone the slider has a row of its own, so its marks have room, and the buttons sit under it.
  const rows = phone ? 3 : 2;
  expect(still.rows).toBe(rows);
  expect(still.least).toBeGreaterThanOrEqual(47.5);
  expect(still.fits).toBe(true);
  const where = await button(page, "play").boundingBox();
  await button(page, "play").click();
  await expect(button(page, "pace-now")).toBeVisible();
  const turning = await look(page);
  expect(turning.rows).toBe(rows);
  expect(turning.height).toBeLessThanOrEqual(still.height);
  expect(await button(page, "play").boundingBox(), "Auto-turn stays under the pointer").toEqual(where);
  await button(page, "play").click();
  await button(page, "more").click();
  await button(page, "in").click();
  const advanced = await look(page);
  expect(advanced.shown).toEqual(expect.arrayContaining(["tilt", "pace-0.5", "pace-1", "pace-2", "front", "left", "up", "down", "right", "move", "turn"]));
  expect(advanced.fits).toBe(true);
  expect(errors).toEqual([]);
});

test("horizontal: one row when its own width allows", async ({ page }) => {
  test.skip(narrow(page), "a phone is narrower than that");
  await ready(page, "?layout=horizontal");
  await page.locator(BAR).evaluate((el) => { el.closest("main").style.maxWidth = "1240px"; });
  await expect.poll(async () => (await look(page)).rows).toBe(1);
});

test("vertical: a column beside the view, Auto-turn and More at the top, and More stays put when it opens", async ({ page }) => {
  const errors = await ready(page, "?layout=vertical");
  const still = await look(page);
  expect(still.shown).toEqual(["yaw", "play", "zoom", "out", "level", "in", "fit", "more"]);
  expect(still.width).toBeLessThanOrEqual(16 * 16 + 1);
  expect(still.least).toBeGreaterThanOrEqual(47.5);
  const top = (name) => button(page, name).evaluate((node) => Math.round(node.getBoundingClientRect().top));
  expect(await top("more")).toBe(await top("play"));
  const more = await button(page, "more").boundingBox();
  await button(page, "more").click();
  expect(await button(page, "more").boundingBox()).toEqual(more);
  expect((await look(page)).shown).toEqual(expect.arrayContaining(["tilt", "pace-0.5", "front"]));
  expect(errors).toEqual([]);
});

test("compact: one row, the same row while it turns, and the rest one press of More away", async ({ page }) => {
  const errors = await ready(page, "?layout=compact");
  const still = await look(page);
  expect(still.shown).toEqual(["play", "out", "level", "in", "more"]);
  expect(still.rows).toBe(1);
  expect(still.height, "a button, its 2 px above and below, the padding and the border").toBeLessThanOrEqual(60);
  expect(still.least).toBeGreaterThanOrEqual(47.5);
  expect(still.width).toBeLessThanOrEqual(330);
  await button(page, "play").click();
  const turning = await look(page);
  expect(turning.rows, "turning adds no row").toBe(1);
  expect(turning.height).toBe(still.height);
  await button(page, "play").click();
  await expect(button(page, "level")).toHaveText("1×");
  await button(page, "more").click();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  expect((await look(page)).shown).toEqual(["yaw", "tilt", "play", "pace-0.5", "pace-1", "pace-2", "turn-left", "turn-right", "front", "zoom", "out", "level", "in", "fit", "more"]);
  expect((await look(page)).fits).toBe(true);
  await button(page, "more").click();
  expect((await look(page)).rows).toBe(1);
  expect(errors).toEqual([]);
});

test("Centre comes in beside the zoom once the view is zoomed, adding no row to the turn and none to compact's one row", async ({ page }) => {
  for (const layout of ["horizontal", "vertical", "compact"]) {
    await ready(page, `?layout=${layout}`);
    const still = await look(page);
    const play = await button(page, "play").boundingBox();
    const more = await button(page, "more").boundingBox();
    await button(page, "in").click();
    const zoomed = await look(page);
    expect(zoomed.rows, layout).toBe(layout === "vertical" ? still.rows + 1 : still.rows);
    expect(await button(page, "play").boundingBox(), `${layout}: Auto-turn stays put`).toEqual(play);
    expect(await button(page, "more").boundingBox(), `${layout}: More stays put`).toEqual(more);
    if (layout === "compact") {
      expect(zoomed.shown, "compact keeps Centre with Fit behind More").not.toContain("centre");
      await button(page, "more").click();
    }
    await expect(button(page, "centre"), layout).toBeVisible();
    expect((await look(page)).least, layout).toBeGreaterThanOrEqual(47.5);
    await button(page, "centre").click();
    await expect.poll(async () => (await stateOf(page)).zoom, { message: layout }).toBe(1);
    await expect(button(page, "centre")).toBeHidden();
    await expect(slider(page)).toHaveAttribute("aria-valuetext", "1×");
  }
});

test("a flat view in each layout shows no turn controls", async ({ page }) => {
  for (const layout of ["horizontal", "vertical", "compact"]) {
    await ready(page, `?layout=${layout}`);
    await page.locator(BAR).evaluate((el) => el.setAttribute("flat", ""));
    const { shown } = await look(page);
    expect(shown, layout).not.toContain("yaw");
    expect(shown, layout).not.toContain("play");
    expect(shown, layout).toContain("level");
  }
});

test("the layout can change after the page has loaded, and an unknown one is classic", async ({ page }) => {
  await ready(page);
  const bar = page.locator(BAR);
  await expect(bar).toHaveAttribute("data-layout", "classic");
  await expect(slider(page)).toBeHidden();
  await bar.evaluate((el) => el.setAttribute("layout", "compact"));
  await expect(bar).toHaveAttribute("data-layout", "compact");
  expect((await look(page)).rows).toBe(1);
  await bar.evaluate((el) => el.setAttribute("layout", "sideways"));
  await expect(bar).toHaveAttribute("data-layout", "classic");
  await expect(slider(page)).toBeHidden();
});

test("the slider's marks are the ends and the common zooms between them, and follow the limits", async ({ page }) => {
  await ready(page, "?layout=horizontal");
  expect(await marks(page)).toEqual(["1×", "2×", "3×", "5×"]);
  const bar = page.locator(BAR);
  await bar.evaluate((el) => { el.setAttribute("zoom-min", "0.5"); el.setAttribute("zoom-max", "4"); });
  expect(await marks(page)).toEqual(["0.5×", "1×", "2×", "4×"]);
  await bar.evaluate((el) => { el.setAttribute("zoom-min", "1"); el.setAttribute("zoom-max", "10"); });
  expect(await marks(page)).toEqual(["1×", "2×", "4×", "10×"]);
  // Each mark sits over the place on the track that the slider gives its zoom.
  const off = await bar.evaluate((el) => {
    const root = el.shadowRoot;
    const track = root.querySelector(".ztrack").getBoundingClientRect();
    return [...root.querySelectorAll(".zmark")].map((label) => {
      const zoom = Number(label.dataset.zoom);
      const at = Math.log(zoom) / Math.log(10);
      const box = label.getBoundingClientRect();
      const tick = [...root.querySelectorAll(".ztick")].map((t) => t.getBoundingClientRect()).find((t) => Math.abs(t.left + t.width / 2 - (track.left + at * track.width)) < 1.5);
      return { zoom, tick: tick !== undefined, inside: box.left >= track.left - 16 && box.right <= track.right + 16 };
    });
  });
  for (const mark of off) expect(mark, String(mark.zoom)).toEqual({ zoom: mark.zoom, tick: true, inside: true });
});

test("the slider by keys: arrows step and stop on a mark, Page Up and Down jump between marks, Home and End go to the ends", async ({ page }) => {
  await ready(page, "?layout=horizontal");
  const zoom = async () => (await stateOf(page)).zoom;
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  expect(await zoom()).toBeCloseTo(1.1, 6);
  await page.keyboard.press("PageUp");
  expect(await zoom()).toBe(2);
  await page.keyboard.press("PageUp");
  expect(await zoom()).toBe(3);
  await page.keyboard.press("PageDown");
  expect(await zoom()).toBe(2);
  await page.keyboard.press("End");
  expect(await zoom()).toBe(5);
  await expect(button(page, "in")).toBeDisabled();
  await page.keyboard.press("Home");
  expect(await zoom()).toBe(1);
  await page.locator(BAR).evaluate((el) => el.set({ zoom: 1.9 }));
  await slider(page).focus();
  await page.keyboard.press("ArrowUp");
  expect(await zoom(), "an arrow stops on the mark it would pass").toBe(2);
  await page.keyboard.press("ArrowUp");
  expect(await zoom()).toBeCloseTo(2.2, 6);
  await page.keyboard.press("ArrowDown");
  expect(await zoom()).toBe(2);
  await page.keyboard.press("ArrowLeft");
  expect(await zoom()).toBeCloseTo(2 / 1.1, 6);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "1.8×");
  await expect(button(page, "level")).toHaveText("1.8×");
});

/** A press on the slider's track at a zoom, `dx` pixels to one side of where that zoom sits. */
const trackPoint = (page, zoom, dx = 0) => page.locator(BAR).evaluate((el, [z, d]) => {
  const track = el.shadowRoot.querySelector(".ztrack").getBoundingClientRect();
  const { zoomMin, zoomMax } = el.controller.limits;
  const at = Math.log(z / zoomMin) / Math.log(zoomMax / zoomMin);
  return { x: track.left + at * track.width + d, y: track.top + track.height / 2 };
}, [zoom, dx]);

test("the slider by mouse: a press near a mark goes to it, anywhere else to that zoom, and a drag follows", async ({ page, hasTouch }) => {
  test.skip(hasTouch, "a touch screen runs the touch test");
  await ready(page, "?layout=horizontal");
  let at = await trackPoint(page, 2, 4);
  await page.mouse.click(at.x, at.y);
  expect((await stateOf(page)).zoom, "a gentle pull to the mark").toBe(2);
  await expect(button(page, "level")).toHaveText("2×");
  at = await trackPoint(page, 2.5);
  await page.mouse.click(at.x, at.y);
  const free = (await stateOf(page)).zoom;
  expect(free).toBeGreaterThan(2.3);
  expect(free).toBeLessThan(2.7);
  await expect(button(page, "level")).toHaveText(`${Number(free.toFixed(1))}×`);
  // A drag from the thumb to the end.
  const from = await trackPoint(page, free);
  const to = await trackPoint(page, 5, 20);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, to.y, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
  expect((await stateOf(page)).zoom).toBe(5);
  await expect(button(page, "in")).toBeDisabled();
});

test("the slider by touch: a tap near a mark goes to it", async ({ page, hasTouch }) => {
  test.skip(!hasTouch, "a desk has a mouse");
  await ready(page, "?layout=horizontal");
  const at = await trackPoint(page, 3, -3);
  await page.touchscreen.tap(at.x, at.y);
  await expect.poll(async () => (await stateOf(page)).zoom).toBe(3);
  await expect(button(page, "level")).toHaveText("3×");
});

test("the slider always shows the true zoom, however it changed, and − and + still step", async ({ page }) => {
  await ready(page, "?layout=horizontal&zoom=2.4");
  const agrees = async (label) => {
    const seen = await page.locator(BAR).evaluate((el) => {
      const input = el.shadowRoot.querySelector("#zoom");
      const { zoom } = el.state;
      const { zoomMin, zoomMax } = el.controller.limits;
      const at = Math.log(zoom / zoomMin) / Math.log(zoomMax / zoomMin);
      return { value: Number(input.value), want: Math.round(Math.min(1, Math.max(0, at)) * 1000), said: input.getAttribute("aria-valuetext"), readout: el.shadowRoot.querySelector('[data-b="level"]').textContent };
    });
    expect(seen.value, label).toBe(seen.want);
    expect(seen.said, label).toBe(seen.readout);
  };
  await agrees("the address");
  await button(page, "in").click();
  expect((await stateOf(page)).zoom).toBeCloseTo(3.36, 5);
  await agrees("zoom in");
  await button(page, "out").click();
  await agrees("zoom out");
  await page.locator("#scene").evaluate((el) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new WheelEvent("wheel", { clientX: r.left + 50, clientY: r.top + 50, deltaY: -60, ctrlKey: true, bubbles: true, cancelable: true })); });
  await agrees("the wheel");
  await page.locator(BAR).evaluate((el) => el.fit());
  await agrees("Fit");
  await expect(button(page, "level")).toHaveText("1×");
  await page.locator(BAR).evaluate((el) => el.set({ zoom: 4.2 }));
  await agrees("set");
  await page.locator(BAR).evaluate((el) => el.setAttribute("zoom-max", "3"));
  expect((await stateOf(page)).zoom).toBe(3);
  await agrees("a lower zoom-max");
  expect(await marks(page)).toEqual(["1×", "2×", "3×"]);
});

test("the slider is read as its zoom, and named", async ({ page }) => {
  await ready(page, "?layout=compact&controls=advanced&zoom=2");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2×");
  await expect(page.getByRole("slider", { name: "Zoom" })).toHaveCount(1);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(page.getByRole("slider", { name: "ズーム" })).toHaveCount(1);
});

test("the layouts page shows every layout with its code, and the range changes every slider's marks", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/layouts.html");
  const layouts = ["horizontal", "vertical", "compact", "classic"];
  for (const layout of layouts) {
    const code = page.locator(`[data-code="${layout}"]`);
    await expect(code).toContainText("<kazoku-view-controls");
    if (layout !== "classic") await expect(code).toContainText(`layout="${layout}"`);
    await expect(page.locator(`[data-testid="controls-${layout}"]`)).toHaveAttribute("data-layout", layout);
  }
  if (page.viewportSize().width < 1100) {
    // One at a time below 1100 pixels, picked from a row.
    await expect(page.locator('[data-layout="horizontal"].layout')).toBeVisible();
    await expect(page.locator('[data-layout="compact"].layout')).toBeHidden();
    await page.locator('[data-pick="compact"]').click();
    await expect(page.locator('[data-layout="compact"].layout')).toBeVisible();
    await expect(page.locator('[data-layout="horizontal"].layout')).toBeHidden();
  } else {
    for (const layout of layouts) await expect(page.locator(`[data-layout="${layout}"].layout`)).toBeVisible();
  }
  await page.locator('[data-range="0.5-4"]').click();
  await expect(page.locator('[data-code="horizontal"]')).toContainText('zoom-min="0.5" zoom-max="4"');
  for (const layout of ["horizontal", "vertical", "compact"]) {
    expect(await page.locator(`[data-testid="controls-${layout}"] .zmark`).allTextContents(), layout).toEqual(["0.5×", "1×", "2×", "4×"]);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
