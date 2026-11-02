import { expect, test } from "@playwright/test";

// The view controls on the demo page, in a real browser at a phone's width and a desk's, in Chromium and WebKit.
const BAR = "kazoku-view-controls";
const stateOf = (page) => page.evaluate((tag) => ({ ...document.querySelector(tag).state }), BAR);
const button = (page, name) => page.locator(`${BAR} [data-b="${name}"]`);
const centreOf = (page, selector) => page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
/** A wheel turn with Ctrl or Command held, sent to the view: the same event a trackpad's pinch makes, and the same in every browser. */
const wheel = (page, at, deltaY, mod = "ctrlKey") => page.locator("#scene").evaluate((el, [p, dy, key]) => {
  el.dispatchEvent(new WheelEvent("wheel", { clientX: p.x, clientY: p.y, deltaY: dy, [key]: true, bubbles: true, cancelable: true }));
}, [at, deltaY, mod]);
/** A touch or pen pointer event sent to the view. */
const touch = (page, type, id, x, y) => page.locator("#scene").evaluate((el, [t, i, cx, cy]) => {
  el.dispatchEvent(new PointerEvent(t, { pointerId: i, pointerType: "touch", isPrimary: i === 1, clientX: cx, clientY: cy, bubbles: true, cancelable: true, button: 0, buttons: t === "pointerup" ? 0 : 1 }));
}, [type, id, x, y]);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  return errors;
};

test("the controls are visible without scrolling, a finger wide, and in the page's own style", async ({ page }) => {
  const errors = await ready(page);
  await button(page, "two").click();
  const report = await page.evaluate(() => {
    const root = document.querySelector("kazoku-view-controls").shadowRoot;
    const vh = window.innerHeight;
    const shown = [...root.querySelectorAll("button, input")].filter((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);
    const small = shown.filter((el) => { const r = el.getBoundingClientRect(); return r.height < 47.5 || (el.tagName === "BUTTON" && r.width < 47.5); }).map((el) => el.dataset.b ?? el.id);
    const below = shown.filter((el) => el.getBoundingClientRect().bottom > vh).map((el) => el.dataset.b ?? el.id);
    const plain = shown.filter((el) => getComputedStyle(el).appearance !== "none").map((el) => el.dataset.b ?? el.id);
    return { count: shown.length, small, below, plain, scrolled: window.scrollY, wide: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  // Angle, tilt, auto-turn, front, four zoom buttons, four arrows, two drag buttons.
  expect(report.count).toBe(14);
  expect(report.small).toEqual([]);
  expect(report.below).toEqual([]);
  expect(report.plain).toEqual([]);
  expect(report.scrolled).toBe(0);
  expect(report.wide).toBe(false);
  expect(errors).toEqual([]);
});

test("it never turns on its own until asked, and a toggle during the turn keeps the angle advancing", async ({ page }) => {
  await ready(page);
  await page.waitForTimeout(300);
  expect((await stateOf(page)).turning).toBe(false);
  expect((await stateOf(page)).yaw).toBe(0);
  await button(page, "play").click();
  await expect(button(page, "play")).toHaveAttribute("aria-pressed", "true");
  const advances = async (label) => {
    const before = (await stateOf(page)).yaw;
    await expect.poll(async () => (await stateOf(page)).yaw, { message: label, timeout: 4000 }).not.toBe(before);
    expect((await stateOf(page)).turning, label).toBe(true);
    await expect(button(page, "play"), label).toHaveAttribute("aria-pressed", "true");
  };
  await advances("turning");
  await button(page, "in").click();
  await advances("after zoom in");
  await button(page, "two").click();
  await advances("after 2x");
  await button(page, "turn").click();
  await advances("after the Turn choice");
  await button(page, "move").click();
  await advances("after the Move choice");
  await button(page, "right").click();
  await advances("after the pan pad");
  await page.locator(`${BAR} #tilt`).fill("12");
  await advances("after the tilt slider");
  await button(page, "fit").click();
  await advances("after Fit");
  await button(page, "front").click();
  expect((await stateOf(page)).tilt).toBe(0);
  await advances("after Front");
  // The angle slider sets the angle and the turn goes on from there.
  await page.locator(`${BAR} #yaw`).fill("60");
  await expect.poll(async () => (await stateOf(page)).yaw).toBeGreaterThan(60);
  expect((await stateOf(page)).yaw).toBeLessThan(100);
  expect((await stateOf(page)).turning).toBe(true);
  // Pause stops it, and only that does.
  await button(page, "play").click();
  const stopped = (await stateOf(page)).yaw;
  await page.waitForTimeout(300);
  expect((await stateOf(page)).yaw).toBe(stopped);
  expect((await stateOf(page)).turning).toBe(false);
});

test("zoom about the pointer keeps what is under it there", async ({ page }) => {
  await ready(page);
  const pin = await centreOf(page, "#pin");
  await wheel(page, pin, -50);
  const first = await stateOf(page);
  expect(first.zoom).toBeGreaterThan(1.5);
  const after = await centreOf(page, "#pin");
  expect(Math.abs(after.x - pin.x)).toBeLessThan(1.5);
  expect(Math.abs(after.y - pin.y)).toBeLessThan(1.5);
  // Another point, with Command, from a zoomed and moved view.
  const scene = await page.locator("#scene").boundingBox();
  const at = { x: scene.x + scene.width * 0.7, y: scene.y + scene.height * 0.6 };
  const mark = await page.evaluate(([p]) => {
    const z = document.querySelector("#zoomer");
    const r = z.getBoundingClientRect();
    return { u: (p.x - r.left) / r.width, v: (p.y - r.top) / r.height };
  }, [at]);
  await wheel(page, at, -40, "metaKey");
  const second = await stateOf(page);
  expect(second.zoom).toBeGreaterThan(first.zoom);
  const where = await page.evaluate(([m]) => {
    const r = document.querySelector("#zoomer").getBoundingClientRect();
    return { x: r.left + m.u * r.width, y: r.top + m.v * r.height };
  }, [mark]);
  expect(Math.abs(where.x - at.x)).toBeLessThan(1.5);
  expect(Math.abs(where.y - at.y)).toBeLessThan(1.5);
  // Ctrl and a wheel turn down zooms out, back to 1x at the end and the middle again.
  await wheel(page, at, 800);
  expect((await stateOf(page))).toMatchObject({ zoom: 1, panX: 0, panY: 0 });
});

test("the buttons zoom, the pan pad appears when zoomed and moves the view, and a drag moves it", async ({ page }) => {
  await ready(page);
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeHidden();
  await button(page, "two").click();
  expect((await stateOf(page)).zoom).toBe(2);
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeVisible();
  const width = (await page.locator("#scene").boundingBox()).width;
  const pin = await centreOf(page, "#pin");
  await button(page, "right").click();
  let s = await stateOf(page);
  expect(s.panX).toBeCloseTo(width / 4, 0);
  expect((await centreOf(page, "#pin")).x - pin.x).toBeCloseTo(width / 4, 0);
  await button(page, "down").click();
  s = await stateOf(page);
  expect(s.panY).toBeGreaterThan(0);
  // A mouse drag moves it (the Move choice); the angle does not change. A touchscreen has no mouse, so the drag is sent as touch below.
  const before = await stateOf(page);
  const scene = await page.locator("#scene").boundingBox();
  const from = { x: scene.x + scene.width / 2, y: scene.y + scene.height / 2 };
  await touch(page, "pointerdown", 1, from.x, from.y);
  await touch(page, "pointermove", 1, from.x - 40, from.y - 20);
  await touch(page, "pointerup", 1, from.x - 40, from.y - 20);
  const moved = await stateOf(page);
  expect(moved.panX - before.panX).toBeCloseTo(-40, 0);
  expect(moved.panY - before.panY).toBeCloseTo(-20, 0);
  expect(moved.yaw).toBe(before.yaw);
  // The Turn choice makes the same drag turn it.
  await button(page, "turn").click();
  await expect(button(page, "turn")).toHaveAttribute("aria-pressed", "true");
  await touch(page, "pointerdown", 1, from.x, from.y);
  await touch(page, "pointermove", 1, from.x + 60, from.y);
  await touch(page, "pointerup", 1, from.x + 60, from.y);
  const turned = await stateOf(page);
  expect(turned.yaw).toBeGreaterThan(10);
  expect(turned.panX).toBe(moved.panX);
  // Fit puts it back.
  await button(page, "fit").click();
  expect(await stateOf(page)).toMatchObject({ zoom: 1, panX: 0, panY: 0 });
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeHidden();
});

test("one finger turns at 1x and two fingers pinch", async ({ page }) => {
  await ready(page);
  const scene = await page.locator("#scene").boundingBox();
  const mid = { x: scene.x + scene.width / 2, y: scene.y + scene.height / 2 };
  await touch(page, "pointerdown", 1, mid.x, mid.y);
  await touch(page, "pointermove", 1, mid.x + scene.width / 4, mid.y + 30);
  await touch(page, "pointerup", 1, mid.x + scene.width / 4, mid.y + 30);
  let s = await stateOf(page);
  expect(s.yaw).toBeCloseTo(45, 0);
  expect(s.tilt).toBe(0);
  // A pinch: two fingers apart by 100, then by 200.
  await touch(page, "pointerdown", 1, mid.x - 50, mid.y);
  await touch(page, "pointerdown", 2, mid.x + 50, mid.y);
  await touch(page, "pointermove", 1, mid.x - 100, mid.y);
  await touch(page, "pointermove", 2, mid.x + 100, mid.y);
  s = await stateOf(page);
  expect(s.zoom).toBeCloseTo(2, 1);
  await touch(page, "pointerup", 2, mid.x + 100, mid.y);
  await touch(page, "pointerup", 1, mid.x - 100, mid.y);
  // Zoomed in, one finger moves the view.
  const before = await stateOf(page);
  await touch(page, "pointerdown", 1, mid.x, mid.y);
  await touch(page, "pointermove", 1, mid.x + 30, mid.y + 10);
  await touch(page, "pointerup", 1, mid.x + 30, mid.y + 10);
  s = await stateOf(page);
  expect(s.panX - before.panX).toBeCloseTo(30, 0);
  expect(s.yaw).toBe(before.yaw);
  expect(await page.locator("#scene").evaluate((el) => el.style.touchAction)).toBe("none");
});

test("the keys on the view zoom and turn it", async ({ page }) => {
  await ready(page);
  await page.locator("#scene").focus();
  await page.keyboard.press("ArrowRight");
  expect((await stateOf(page)).yaw).toBe(15);
  await page.keyboard.press("+");
  expect((await stateOf(page)).zoom).toBeCloseTo(1.25, 2);
  await page.keyboard.press("0");
  expect(await stateOf(page)).toMatchObject({ yaw: 0, tilt: 0, zoom: 1 });
});

test("the choices are in the address, and the address is the whole state", async ({ page }) => {
  await ready(page, "?yaw=40&tilt=10&zoom=2&drag=turn&keep=1");
  expect(await stateOf(page)).toMatchObject({ yaw: 40, tilt: 10, zoom: 2, drag: "turn", panX: 0, panY: 0 });
  await expect(page.locator(`${BAR} #yaw`)).toHaveValue("40");
  await button(page, "fit").click();
  await page.locator(`${BAR} #yaw`).fill("-90");
  await expect(page).toHaveURL(/yaw=-90/);
  await expect(page).not.toHaveURL(/zoom=/);
  await expect(page).toHaveURL(/keep=1/);
  await expect(page).toHaveURL(/drag=turn/);
  const again = page.url();
  await page.goto("about:blank");
  await page.goto(again);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  expect(await stateOf(page)).toMatchObject({ yaw: -90, tilt: 10, zoom: 1, drag: "turn" });
  // The card on the page follows the state it was started with.
  expect(await page.locator("#card").evaluate((el) => el.style.transform)).toContain("rotateY(-90deg)");
});

test("the labels are English or Japanese", async ({ page }) => {
  await ready(page);
  await expect(button(page, "front")).toHaveText("Front");
  await expect(button(page, "play")).toHaveAttribute("aria-label", "Auto-turn");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(button(page, "front")).toHaveText("正面");
  await expect(button(page, "play")).toHaveAttribute("aria-label", "自動回転");
  await expect(button(page, "fit")).toHaveText("全体");
  await expect(page.locator(`${BAR} [data-g="zoom"]`)).toHaveAttribute("aria-label", "ズーム");
  // Nothing wider than the screen in Japanese either.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("reduced motion is respected: no automatic turn unless the reader asks", async ({ page }) => {
  const make = () => page.evaluate(async () => {
    const view = document.createElement("div");
    const bar = document.createElement("kazoku-view-controls");
    bar.setAttribute("autoplay", "");
    bar.view = view;
    document.body.append(view, bar);
    await new Promise((done) => setTimeout(done, 400));
    const turning = bar.state.turning;
    bar.remove();
    view.remove();
    return turning;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  expect(await make()).toBe(false);
  // The button still works for a reader who presses it.
  await button(page, "play").click();
  await expect(button(page, "play")).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await make()).toBe(true);
});

test("a second copy of the package does not break the page: the tag already taken is left alone", async ({ page }) => {
  const errors = await ready(page);
  const result = await page.evaluate(async () => {
    const before = customElements.get("kazoku-view-controls");
    const again = await import(`/dist/view-controls/define.js?copy=2`);
    return { same: customElements.get("kazoku-view-controls") === before, defined: before !== undefined, returned: again.defineViewControls() };
  });
  expect(result).toEqual({ same: true, defined: true, returned: false });
  expect(errors).toEqual([]);
});

test("a button or link inside the view still clicks while a drag on the view still turns it", async ({ page }) => {
  const errors = await ready(page);
  await page.locator("#scene").evaluate((scene) => {
    scene.style.position = "relative";
    const add = (tag, id, left) => {
      const el = document.createElement(tag);
      el.id = id;
      el.textContent = id;
      el.style.cssText = `position:absolute;top:8px;left:${left}px;z-index:5;width:96px;height:48px;`;
      if (tag === "a") el.href = "#clicked";
      el.dataset.clicks = "0";
      el.addEventListener("click", () => { el.dataset.clicks = String(Number(el.dataset.clicks) + 1); });
      scene.append(el);
    };
    add("button", "inner-button", 8);
    add("a", "inner-link", 112);
    add("div", "inner-marked", 216);
    document.getElementById("inner-marked").dataset.kazokuIgnore = "";
  });
  for (const id of ["inner-button", "inner-link", "inner-marked"]) {
    const at = await centreOf(page, `#${id}`);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    // The browser starts its own drag on a link, so the link is pressed and released in place.
    if (id !== "inner-link") await page.mouse.move(at.x + 30, at.y + 2, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-clicks", /^[1-9]/);
    expect((await stateOf(page)).yaw, `${id} does not turn the view`).toBe(0);
    await expect(page.locator("#scene")).not.toHaveAttribute("data-grab", "1");
  }
  await page.locator("#inner-button").click();
  await expect(page.locator("#inner-button")).toHaveAttribute("data-clicks", /^[2-9]/);
  // A drag that starts on the view itself still turns it.
  const box = await page.locator("#scene").boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height - 20 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 120, from.y, { steps: 6 });
  await page.mouse.up();
  expect(Math.abs((await stateOf(page)).yaw)).toBeGreaterThan(10);
  // The selector is an option: a bare `ignore` leaves nothing alone, and a change reaches the controller.
  await page.locator(BAR).evaluate((el) => el.setAttribute("ignore", "#inner-button"));
  expect(await page.locator(BAR).evaluate((el) => el.controller.ignore)).toBe("#inner-button");
  await page.locator(BAR).evaluate((el) => el.removeAttribute("ignore"));
  expect(await page.locator(BAR).evaluate((el) => el.controller.ignore.includes("button"))).toBe(true);
  expect(errors).toEqual([]);
});

test("a button inside an open shadow root in the view still clicks while a drag on the empty view still turns it", async ({ page }) => {
  const errors = await ready(page);
  await page.locator("#scene").evaluate((scene) => {
    scene.style.position = "relative";
    const host = document.createElement("div");
    host.id = "card-host";
    host.style.cssText = "position:absolute;top:8px;left:8px;z-index:5;width:120px;height:56px;";
    host.dataset.clicks = "0";
    const root = host.attachShadow({ mode: "open" });
    const inner = document.createElement("button");
    inner.id = "card-button";
    inner.textContent = "Animate";
    inner.style.cssText = "width:120px;height:56px;";
    inner.addEventListener("click", () => { host.dataset.clicks = String(Number(host.dataset.clicks) + 1); });
    root.append(inner);
    scene.append(host);
  });
  const at = await centreOf(page, "#card-host");
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 30, at.y + 2, { steps: 4 });
  await page.mouse.up();
  await page.mouse.click(at.x, at.y);
  await expect(page.locator("#card-host")).toHaveAttribute("data-clicks", /^[1-9]/);
  expect((await stateOf(page)).yaw, "the shadow button does not turn the view").toBe(0);
  await expect(page.locator("#scene")).not.toHaveAttribute("data-grab", "1");
  const box = await page.locator("#scene").boundingBox();
  const from = { x: box.x + box.width / 2, y: box.y + box.height - 20 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 120, from.y, { steps: 6 });
  await page.mouse.up();
  expect(Math.abs((await stateOf(page)).yaw)).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test("the view can open at a zoom set against the page's fit scale, and Fit is still Fit", async ({ page }) => {
  const errors = await ready(page);
  const read = () => page.locator(BAR).evaluate((el) => ({ zoom: el.state.zoom, fitScale: el.fitScale }));
  expect(await read()).toEqual({ zoom: 1, fitScale: 1 });
  await page.locator(BAR).evaluate((el) => { el.setAttribute("zoom", "1"); el.setAttribute("fit-scale", "0.5"); });
  expect(await read()).toEqual({ zoom: 2, fitScale: 0.5 });
  await page.locator(BAR).evaluate((el) => el.setFitScale(0.25));
  expect((await read()).zoom).toBe(4);
  await button(page, "fit").click();
  expect((await read()).zoom).toBe(1);
  await page.locator(BAR).evaluate((el) => el.removeAttribute("zoom"));
  expect((await read()).zoom).toBe(1);
  expect(errors).toEqual([]);
});

test("a page that opens zoomed in leaves the plain address plain and a fresh page opens there", async ({ page }) => {
  await ready(page);
  const fresh = await page.evaluate(async () => {
    const el = document.createElement("kazoku-view-controls");
    el.setAttribute("zoom", "1");
    el.setAttribute("fit-scale", "0.5");
    document.body.append(el);
    const zoom = el.state.zoom;
    el.remove();
    return zoom;
  });
  expect(fresh).toBe(2);
});

test("with an anchor, the buttons and keys zoom about it and it stays where it is within a pixel", async ({ page }) => {
  const errors = await ready(page, "?anchor=pin");
  const pin = await centreOf(page, "#pin");
  const fixed = async (label) => {
    const now = await centreOf(page, "#pin");
    expect(Math.abs(now.x - pin.x), label).toBeLessThan(1);
    expect(Math.abs(now.y - pin.y), label).toBeLessThan(1);
  };
  await button(page, "in").click();
  expect((await stateOf(page)).zoom).toBeGreaterThan(1.3);
  await fixed("plus");
  await button(page, "out").click();
  expect((await stateOf(page)).zoom).toBeCloseTo(1, 5);
  await fixed("plus then minus");
  await button(page, "two").click();
  await fixed("2x");
  await page.locator("#scene").focus();
  await page.keyboard.press("+");
  await page.keyboard.press("-");
  await fixed("the keys");
  await button(page, "fit").click();
  // The wheel still zooms about the pointer, not the anchor.
  const scene = await page.locator("#scene").boundingBox();
  const at = { x: scene.x + scene.width * 0.8, y: scene.y + scene.height * 0.7 };
  const mark = await page.evaluate(([p]) => { const r = document.querySelector("#zoomer").getBoundingClientRect(); return { u: (p.x - r.left) / r.width, v: (p.y - r.top) / r.height }; }, [at]);
  await wheel(page, at, -50);
  const where = await page.evaluate(([m]) => { const r = document.querySelector("#zoomer").getBoundingClientRect(); return { x: r.left + m.u * r.width, y: r.top + m.v * r.height }; }, [mark]);
  expect(Math.abs(where.x - at.x)).toBeLessThan(1.5);
  expect(Math.abs(where.y - at.y)).toBeLessThan(1.5);
  expect(errors).toEqual([]);
});

test("without an anchor the buttons zoom about the middle, and the anchor attribute and setter agree", async ({ page }) => {
  await ready(page);
  await button(page, "in").click();
  expect(await stateOf(page)).toMatchObject({ panX: 0, panY: 0 });
  await button(page, "fit").click();
  await page.locator(BAR).evaluate((el) => el.setAttribute("anchor", "-40, 20"));
  expect(await page.locator(BAR).evaluate((el) => el.anchor)).toEqual({ x: -40, y: 20 });
  await page.locator(BAR).evaluate((el) => { el.anchor = { x: 10, y: 5 }; });
  expect(await page.locator(BAR).evaluate((el) => el.controller.anchor)).toEqual({ x: 10, y: 5 });
  await page.locator(BAR).evaluate((el) => { el.anchor = undefined; });
  await button(page, "in").click();
  expect(await stateOf(page)).toMatchObject({ panX: 0, panY: 0 });
});

test("Arrow Up tips like a drag up, or like a wheel up with key-tilt wheel", async ({ page }) => {
  await ready(page);
  await page.locator("#scene").focus();
  await page.keyboard.press("ArrowUp");
  expect((await stateOf(page)).tilt).toBe(5);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect((await stateOf(page)).tilt).toBe(-5);
  await page.goto("/?key-tilt=wheel");
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  await page.locator("#scene").focus();
  await page.keyboard.press("ArrowUp");
  expect((await stateOf(page)).tilt).toBe(-5);
  await page.locator("#scene").evaluate((el) => el.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })));
  expect((await stateOf(page)).tilt).toBeLessThan(-5);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect((await stateOf(page)).tilt).toBeGreaterThan(-20);
});

test("stop-turn: a press, the wheel or a key stops the automatic turn, and without it they do not", async ({ page }) => {
  for (const query of ["", "?stop-turn"]) {
    const stops = query !== "";
    for (const hand of ["press", "wheel", "key"]) {
      await page.goto(`/${query}`);
      await expect(page.locator(`${BAR} .bar`)).toBeVisible();
      await button(page, "play").click();
      await expect(button(page, "play")).toHaveAttribute("aria-pressed", "true");
      await page.locator("#scene").focus();
      if (hand === "press") {
        const at = await centreOf(page, "#scene");
        await page.mouse.move(at.x, at.y + 100);
        await page.mouse.down();
        await page.mouse.up();
      } else if (hand === "wheel") {
        await page.locator("#scene").evaluate((el) => el.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true })));
      } else await page.keyboard.press("ArrowLeft");
      expect((await stateOf(page)).turning, `${hand} ${query}`).toBe(!stops);
      await expect(button(page, "play")).toHaveAttribute("aria-pressed", String(!stops));
    }
  }
});

test("tilt-step rounds the tilt of a drag to whole degrees", async ({ page }) => {
  for (const [query, whole] of [["", false], ["?tilt-step=1", true]]) {
    await page.goto(`/${query}`);
    await expect(page.locator(`${BAR} .bar`)).toBeVisible();
    const box = await page.locator("#scene").boundingBox();
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 7, from.y - 17.3, { steps: 5 });
    await page.mouse.up();
    const tilt = (await stateOf(page)).tilt;
    expect(Number.isInteger(tilt), `${query} ${tilt}`).toBe(whole);
    expect(tilt).toBeGreaterThan(0);
  }
});
