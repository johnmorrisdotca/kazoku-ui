import { expect, test } from "@playwright/test";

// The controls' two levels, the zoom readout and the auto-turn speed, in a real browser at a phone's width and a desk's.
const BAR = "kazoku-view-controls";
const stateOf = (page) => page.evaluate((tag) => ({ ...document.querySelector(tag).state }), BAR);
const button = (page, name) => page.locator(`${BAR} [data-b="${name}"]`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/${query}`);
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
  return errors;
};
/** The page's console warnings, kept from now on, so a failed address check can say what the page said (Chromium warns instead of throwing when it refuses an address). */
const warningsOf = (page) => {
  const warnings = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  return warnings;
};
/** An address check that, when it fails, also prints the page's console warnings. */
const addressCheck = async (warnings, check) => {
  try {
    await check();
  } catch (error) {
    throw new Error(`${error.message}\nThe page's console warnings: ${warnings.join(" | ") || "none"}`);
  }
};
/** The names of the buttons and sliders a reader can see. */
const shown = (page) => page.evaluate(() => {
  const kids = (root) => [...root.querySelectorAll("button, input, kazoku-speed-buttons")].flatMap((n) => (n.localName === "kazoku-speed-buttons" ? [...n.shadowRoot.querySelectorAll("button")] : [n]));
  const root = document.querySelector("kazoku-view-controls").shadowRoot;
  return kids(root).filter((el) => el.getClientRects().length > 0).map((el) => el.dataset.b ?? (el.dataset.v === undefined ? el.id : `pace-${el.dataset.v}`));
});

test("the controls start basic: turn, Auto-turn, zoom, Fit and More, and nothing else", async ({ page }) => {
  const errors = await ready(page);
  expect(await shown(page)).toEqual(["yaw", "axis-angle", "axis-tilt", "axis-roll", "axis-all", "play", "out", "level", "in", "fit", "more"]);
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "false");
  const sizes = await page.evaluate(() => [...document.querySelector("kazoku-view-controls").shadowRoot.querySelectorAll("button, input")].filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect().height));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(47.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("More shows tilt, speed, Front and, once zoomed, the pan pad; and shows them as the page's own style", async ({ page }) => {
  await ready(page);
  await button(page, "more").click();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  expect(await shown(page)).toEqual(["yaw", "axis-angle", "axis-tilt", "axis-roll", "axis-all", "play", "pace-0.125", "pace-0.25", "pace-0.5", "pace-1", "turn-left", "turn-right", "front", "out", "level", "in", "fit", "more"]);
  await button(page, "in").click();
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeVisible();
  const plain = await page.evaluate(() => [...document.querySelector("kazoku-view-controls").shadowRoot.querySelectorAll("button, input")].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).appearance !== "none").map((el) => el.dataset.b ?? el.id));
  expect(plain).toEqual([]);
  await button(page, "more").click();
  expect(await shown(page)).toEqual(["yaw", "axis-angle", "axis-tilt", "axis-roll", "axis-all", "play", "centre", "out", "level", "in", "fit", "more"]);
  await expect(page.locator(`${BAR} [data-g="pan"]`)).toBeHidden();
});

test("the level is remembered, an attribute is only the start, and the reader's choice wins", async ({ page }) => {
  await ready(page);
  await button(page, "more").click();
  await page.reload();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  await expect(button(page, "axis-tilt")).toBeVisible();
  await expect(page.locator(`${BAR} #tilt`)).toBeHidden();
  // What the reader chose beats the controls attribute a page writes in its markup (an element made with the attribute already on it).
  const levelOf = (attribute) => page.evaluate((value) => {
    const el = document.createElement("kazoku-view-controls");
    el.setAttribute("controls", value);
    document.body.append(el);
    const level = el.dataset.level;
    el.remove();
    return level;
  }, attribute);
  expect(await levelOf("basic")).toBe("advanced");
  await button(page, "more").click();
  expect(await levelOf("advanced")).toBe("basic");
  await page.evaluate(() => window.localStorage.removeItem("kazoku-view-controls"));
  expect(await levelOf("advanced")).toBe("advanced");
  expect(await levelOf("bogus")).toBe("basic");
});

test("a page that sets controls=advanced starts advanced when nothing is remembered", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
});

test("a browser that keeps nothing still toggles", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const errors = await ready(page);
  await button(page, "more").click();
  await expect(button(page, "more")).toHaveAttribute("aria-expanded", "true");
  expect(errors).toEqual([]);
});

test("the zoom readout follows every zoom, and a tap on it is Fit", async ({ page }) => {
  await ready(page);
  const readout = button(page, "level");
  await expect(readout).toHaveText("1×");
  await button(page, "in").click();
  await expect(readout).toHaveText("1.4×");
  await expect(readout).toHaveAttribute("aria-label", "Zoom level 1.4×, back to Fit");
  await button(page, "in").click();
  await expect(readout).toHaveText("2×");
  await page.evaluate(() => document.querySelector("kazoku-view-controls").set({ zoom: 2.4 }));
  await expect(readout).toHaveText("2.4×");
  await readout.click();
  expect((await stateOf(page)).zoom).toBe(1);
  await expect(readout).toHaveText("1×");
});

test("a screen reader is told the zoom once it settles, and not on load", async ({ page }) => {
  await ready(page);
  const live = page.locator(`${BAR} [data-live]`);
  await expect(live).toHaveAttribute("role", "status");
  await page.waitForTimeout(600);
  await expect(live).toHaveText("");
  await page.evaluate(() => { const el = document.querySelector("kazoku-view-controls"); for (const z of [1.2, 1.5, 1.9, 2.4]) el.set({ zoom: z }, false); });
  await expect(live).toHaveText("Zoom level 2.4×");
});

const speed = (page, value) => page.locator(`${BAR} kazoku-speed-buttons button[data-v="${value}"]`);

test("the turn speeds say how long one turn of the view takes, change the turn's speed and keep it turning, and are kept in the attribute and the address", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const rate = () => page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed);
  // gentle unless the page asks: 12 degrees a second, one turn in 30 seconds, and three slower steps
  expect(await rate()).toBe(12);
  await expect(page.locator(`${BAR} kazoku-speed-buttons button`)).toHaveText(["4 min", "2 min", "1 min", "30 s"]);
  await expect(speed(page, 1)).toHaveAttribute("aria-pressed", "true");
  await expect(speed(page, 1)).toHaveAttribute("aria-label", "The view turns once in 30 seconds");
  await expect(speed(page, 0.25)).toHaveAttribute("aria-label", "The view turns once in 2 minutes");
  await button(page, "play").click();
  await speed(page, 0.5).click();
  expect(await rate()).toBe(6);
  expect((await stateOf(page)).turning).toBe(true);
  await expect(speed(page, 0.5)).toHaveAttribute("aria-pressed", "true");
  await expect(speed(page, 1)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(BAR)).toHaveAttribute("pace", "0.5");
  await expect(page).toHaveURL(/pace=0\.5/);
  await speed(page, 0.125).click();
  expect(await rate()).toBe(1.5);
  await expect(page.locator(BAR)).toHaveAttribute("pace", "0.125");
  await expect(page).toHaveURL(/pace=0\.125/);
  await speed(page, 1).click();
  expect(await rate()).toBe(12);
  await expect(page).not.toHaveURL(/pace=/);
});

test("Left and Right choose which way Auto-turn goes, keep the angle and the speed, and are kept in the attribute and the address", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const rate = () => page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed);
  const turn = (name) => button(page, name);
  await expect(turn("turn-right")).toHaveAttribute("aria-pressed", "true");
  await expect(turn("turn-left")).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => document.querySelector("kazoku-view-controls").set({ yaw: 40 }));
  await button(page, "play").click();
  await speed(page, 0.5).click();
  await turn("turn-left").click();
  expect(await rate()).toBe(-6);
  expect((await stateOf(page)).turning).toBe(true);
  await expect(turn("turn-left")).toHaveAttribute("aria-pressed", "true");
  await expect(turn("turn-right")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(BAR)).toHaveAttribute("direction", "left");
  await expect(page).toHaveURL(/direction=left/);
  await expect(page).toHaveURL(/pace=0\.5/);
  // It goes on from where it was, the other way: the angle comes back below the 40 it was set to.
  await expect.poll(async () => (await stateOf(page)).yaw, { timeout: 15_000 }).toBeLessThan(40);
  await turn("turn-right").click();
  expect(await rate()).toBe(6);
  await expect(page).not.toHaveURL(/direction=/);
  await expect(page).toHaveURL(/pace=0\.5/);
  expect(await page.locator(BAR).getAttribute("direction")).toBe("right");
});

test("an address that says left comes up turning left, and a negative speed starts the turn to the left", async ({ page }) => {
  await ready(page, "?controls=advanced&direction=left");
  await expect(button(page, "turn-left")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(-12);
  const made = (attributes) => page.evaluate((list) => {
    const el = document.createElement("kazoku-view-controls");
    for (const [name, value] of list) el.setAttribute(name, value);
    document.body.append(el);
    const out = { speed: el.controller.speed, left: el.shadowRoot.querySelector('[data-b="turn-left"]').getAttribute("aria-pressed") };
    el.remove();
    return out;
  }, attributes);
  expect(await made([["speed", "-20"]])).toEqual({ speed: -20, left: "true" });
  expect(await made([["speed", "-20"], ["direction", "right"]])).toEqual({ speed: 20, left: "false" });
  expect(await made([["direction", "left"]])).toEqual({ speed: -12, left: "true" });
  expect(await made([])).toEqual({ speed: 12, left: "false" });
});

test("a page that starts at another pace keeps a chosen 1 in the address, and only the page's own start is left out", async ({ page }) => {
  const warnings = warningsOf(page);
  await ready(page, "?controls=advanced");
  // the page opens on a fast pace, as a globe that turns a day a minute does
  await page.evaluate((tag) => {
    const el = document.querySelector(tag);
    el.setAttribute("paces", "0.5 1 2 1440");
    el.setAttribute("pace", "1440");
  }, BAR);
  await expect(speed(page, 1440)).toHaveAttribute("aria-pressed", "true");
  await expect(page).not.toHaveURL(/pace=/);
  await button(page, "play").click();
  await speed(page, 1).click();
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=1(&|$)/));
  // a press writes the attribute too, but it is the reader's choice, not a new start
  await expect(page.locator(BAR)).toHaveAttribute("pace", "1");
  await speed(page, 2).click();
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=2(&|$)/));
  await speed(page, 1440).click();
  await addressCheck(warnings, () => expect(page).not.toHaveURL(/pace=/));
  // the page moves its own start to 1 (another look): from then on 1 is the start and stays off the address
  await speed(page, 2).click();
  await page.evaluate((tag) => document.querySelector(tag).setAttribute("pace", "1"), BAR);
  await expect(speed(page, 1)).toHaveAttribute("aria-pressed", "true");
  await speed(page, 2).click();
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=2(&|$)/));
  await speed(page, 1).click();
  await addressCheck(warnings, () => expect(page).not.toHaveURL(/pace=/));
  // a page that takes its pace away starts at 1 again
  await page.evaluate((tag) => document.querySelector(tag).setAttribute("pace", "1440"), BAR);
  await page.evaluate((tag) => document.querySelector(tag).removeAttribute("pace"), BAR);
  await speed(page, 2).click();
  await speed(page, 1).click();
  await addressCheck(warnings, () => expect(page).not.toHaveURL(/pace=/));
  // a start set before its step is among the paces is found again when the paces come
  await page.evaluate((tag) => {
    const el = document.querySelector(tag);
    el.setAttribute("paces", "0.5 1 2");
    el.setAttribute("pace", "1440");
    el.setAttribute("paces", "0.5 1 2 1440");
  }, BAR);
  await speed(page, 1).click();
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=1(&|$)/));
  await speed(page, 1440).click();
  await addressCheck(warnings, () => expect(page).not.toHaveURL(/pace=/));
});

test("a page that starts the turn to the left keeps Right in the address, and the labels are in Japanese too", async ({ page }) => {
  await ready(page, "?controls=advanced&lang=ja");
  await page.evaluate(() => {
    const el = document.querySelector("kazoku-view-controls");
    el.setAttribute("lang", "ja");
    el.setAttribute("speed", "-30");
  });
  await expect(button(page, "turn-left")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "turn-left")).toContainText("左へ");
  await expect(button(page, "turn-right")).toContainText("右へ");
  await button(page, "turn-right").click();
  await expect(page).toHaveURL(/direction=right/);
  await button(page, "turn-left").click();
  await expect(page).not.toHaveURL(/direction=/);
});

test("the faster the pace the faster the angle moves", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const turned = async (pace) => {
    await speed(page, pace).click();
    await page.evaluate(() => document.querySelector("kazoku-view-controls").set({ yaw: 0 }));
    await page.waitForTimeout(600);
    return (await stateOf(page)).yaw;
  };
  await button(page, "play").click();
  const slow = await turned(0.25);
  const fast = await turned(1);
  expect(fast).toBeGreaterThan(slow * 2.5);
});

test("the `pace` attribute is the start and follows the buttons; `paces` names the buttons", async ({ page }) => {
  await ready(page, "?controls=advanced");
  const bar = page.locator(BAR);
  await bar.evaluate((el) => el.setAttribute("pace", "0.25"));
  await expect(speed(page, 0.25)).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(3);
  // a page that asks for faster turns can still have them, each named by its turn's time
  await bar.evaluate((el) => el.setAttribute("paces", "1 4 8"));
  await expect(page.locator(`${BAR} kazoku-speed-buttons button`)).toHaveText(["30 s", "7.5 s", "3.8 s"]);
  await expect(speed(page, 1)).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(12);
  await speed(page, 8).click();
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(96);
  // the page's own speed decides the times shown
  await bar.evaluate((el) => el.setAttribute("speed", "6"));
  await expect(page.locator(`${BAR} kazoku-speed-buttons button`)).toHaveText(["1 min", "15 s", "7.5 s"]);
});

test("with reduced motion the speed buttons still step, and a pressed Auto-turn still turns at the chosen speed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "?controls=advanced");
  await speed(page, 0.5).click();
  await expect(speed(page, 0.5)).toHaveAttribute("aria-pressed", "true");
  await button(page, "play").click();
  expect((await stateOf(page)).turning).toBe(true);
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(6);
});

test("a page opened on a pace starts at it", async ({ page }) => {
  await ready(page, "?controls=advanced&pace=0.5");
  await expect(speed(page, 0.5)).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").controller.speed)).toBe(6);
});

test("the labels are English or Japanese", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await expect(button(page, "more")).toHaveText("More");
  await expect(page.locator(`${BAR} kazoku-speed-buttons [role="group"]`)).toHaveAttribute("aria-label", "One turn in");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(button(page, "more")).toHaveText("詳細");
  await expect(speed(page, 0.5)).toHaveText("1分");
  await expect(speed(page, 1)).toHaveAttribute("aria-label", "30秒で1周します");
  await expect(page.locator(`${BAR} kazoku-speed-buttons [role="group"]`)).toHaveAttribute("aria-label", "1周");
  await expect(button(page, "level")).toHaveAttribute("aria-label", "ズーム倍率 1×, 全体に戻す");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("a flat view shows no speed, tilt or Front even when advanced", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await page.evaluate(() => document.querySelector("kazoku-view-controls").setAttribute("flat", ""));
  expect(await shown(page)).toEqual(["out", "level", "in", "fit", "more"]);
});

/** What the readout says now, against the state the page is given. */
const readsTrue = async (page, label) => {
  const expected = async () => {
    const { zoom } = await stateOf(page);
    return `${Number(zoom.toFixed(1))}×`;
  };
  await expect.poll(async () => (await button(page, "level").textContent()) === (await expected()), { message: `${label}: the readout is the state's zoom` }).toBe(true);
  const said = await button(page, "level").getAttribute("aria-label");
  expect(said, label).toBe(`Zoom level ${await expected()}, back to Fit`);
};
const zoomOf = async (page) => (await stateOf(page)).zoom;

for (const level of ["basic", "advanced"]) {
  test(`in ${level}, the readout is the only zoom number on the bar`, async ({ page }) => {
    await ready(page, `?controls=${level}&zoom-min=1&zoom-max=5`);
    await button(page, "play").click();
    await page.evaluate((tag) => document.querySelector(tag).set({ zoom: 3 }), BAR);
    const zoomNumbers = await page.evaluate((tag) => [...document.querySelector(tag).shadowRoot.querySelectorAll("button, output, span")].filter((el) => el.getClientRects().length > 0 && el.children.length === 0 && !el.closest(".pace-now") && /\d\s*[×x]/.test(el.textContent)).map((el) => el.textContent), BAR);
    expect(zoomNumbers).toEqual(["3×"]);
    await expect(button(page, "two")).toHaveCount(0);
    await page.evaluate((tag) => document.querySelector(tag).fit(), BAR);
    await expect(button(page, "out")).toBeDisabled();
    await expect(button(page, "level")).toHaveText("1×");
  });
}

test("the readout is the true zoom however the zoom changed", async ({ page }) => {
  await ready(page, "?zoom=2.4");
  const bar = page.locator(BAR);
  const scene = page.locator("#scene");
  await expect(button(page, "level")).toHaveText("2.4×");
  await readsTrue(page, "the address");
  await button(page, "in").click();
  expect(await zoomOf(page)).toBeCloseTo(3.36, 5);
  await readsTrue(page, "zoom in");
  await button(page, "out").click();
  await readsTrue(page, "zoom out");
  await button(page, "fit").click();
  await expect(button(page, "level")).toHaveText("1×");
  await readsTrue(page, "Fit");
  // The wheel with Ctrl held, as a trackpad's pinch comes.
  await scene.evaluate((el) => { const r = el.getBoundingClientRect(); el.dispatchEvent(new WheelEvent("wheel", { clientX: r.left + 50, clientY: r.top + 50, deltaY: -60, ctrlKey: true, bubbles: true, cancelable: true })); });
  expect(await zoomOf(page)).toBeGreaterThan(1.5);
  await readsTrue(page, "the wheel");
  // Two fingers.
  await scene.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const send = (type, id, cx) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: cx, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: 1 }));
    send("pointerdown", 1, x - 40);
    send("pointerdown", 2, x + 40);
    send("pointermove", 2, x + 110);
    send("pointerup", 2, x + 110);
    send("pointerup", 1, x - 40);
  });
  await readsTrue(page, "a pinch");
  // The keys.
  await scene.focus();
  await page.keyboard.press("+");
  await readsTrue(page, "the plus key");
  await page.keyboard.press("-");
  await readsTrue(page, "the minus key");
  await page.keyboard.press("0");
  await expect(button(page, "level")).toHaveText("1×");
  await readsTrue(page, "the 0 key");
  // A double press goes in to 2x where it was pressed.
  const box = await scene.boundingBox();
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button(page, "level")).toHaveText("2×");
  await readsTrue(page, "a double press");
  // The readout itself is Fit.
  await button(page, "level").click();
  await expect(button(page, "level")).toHaveText("1×");
  // The page's own calls.
  await page.evaluate((tag) => document.querySelector(tag).set({ zoom: 4.2 }), BAR);
  await expect(button(page, "level")).toHaveText("4.2×");
  await readsTrue(page, "set");
  // A limit that moves past the view takes the view with it.
  await bar.evaluate((el) => el.setAttribute("zoom-max", "2.5"));
  expect(await zoomOf(page)).toBe(2.5);
  await expect(button(page, "level")).toHaveText("2.5×");
  await expect(button(page, "in")).toBeDisabled();
  await readsTrue(page, "a lower zoom-max");
  // The zoom attribute and the fit scale move the view, and the readout with it.
  await bar.evaluate((el) => { el.removeAttribute("zoom-max"); el.setAttribute("zoom", "3"); });
  await expect(button(page, "level")).toHaveText("3×");
  await readsTrue(page, "the zoom attribute");
  await bar.evaluate((el) => el.setFitScale(2));
  await expect(button(page, "level")).toHaveText("1.5×");
  await readsTrue(page, "the fit scale");
});

test("after the element moved, the buttons drive the view the readout speaks for", async ({ page }) => {
  await ready(page);
  const told = await page.evaluate((tag) => {
    const el = document.querySelector(tag);
    el.parentElement.insertBefore(el, el.nextSibling);
    window.__told = [];
    el.addEventListener("kazoku-viewchange", (event) => window.__told.push(event.detail.zoom));
    return true;
  }, BAR);
  expect(told).toBe(true);
  await button(page, "in").click();
  await expect(button(page, "level")).toHaveText("1.4×");
  expect((await stateOf(page)).zoom).toBeCloseTo(1.4, 5);
  expect(await page.evaluate(() => window.__told.at(-1))).toBeCloseTo(1.4, 5);
  await readsTrue(page, "moved, then zoom in");
});

test("basic shows one small speed button only while it turns; it steps through the speeds, keeps turning and is kept in the address", async ({ page }) => {
  const warnings = warningsOf(page);
  await ready(page);
  const speed = () => page.evaluate((tag) => document.querySelector(tag).controller.speed, BAR);
  const now = button(page, "pace-now");
  await expect(now).toBeHidden();
  await button(page, "play").click();
  await expect(now).toBeVisible();
  expect(await shown(page)).toEqual(["yaw", "axis-angle", "axis-tilt", "axis-roll", "axis-all", "pace-now", "play", "out", "level", "in", "fit", "more"]);
  await expect(now).toHaveText("One turn in30 s");
  await expect(now).toHaveAttribute("aria-label", "The view turns once in 30 seconds");
  // from the page's own speed a press goes round to the slowest, then up again
  await now.click();
  await expect(now).toHaveAttribute("aria-label", "The view turns once in 4 minutes");
  expect(await speed()).toBe(1.5);
  expect((await stateOf(page)).turning).toBe(true);
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=0\.125/));
  await now.click();
  await expect(now).toHaveAttribute("aria-label", "The view turns once in 2 minutes");
  expect(await speed()).toBe(3);
  await now.click();
  await expect(now).toHaveAttribute("aria-label", "The view turns once in 1 minute");
  await expect(now).toHaveText("One turn in1 min");
  expect(await speed()).toBe(6);
  await addressCheck(warnings, () => expect(page).toHaveURL(/pace=0\.5/));
  await now.click();
  await expect(now).toHaveAttribute("aria-label", "The view turns once in 30 seconds");
  await addressCheck(warnings, () => expect(page).not.toHaveURL(/pace=/));
  await button(page, "play").click();
  await expect(now).toBeHidden();
  expect(await speed()).toBe(12);
});

test("a speed chosen just before the bar is taken off the page and put back is still kept in the address", async ({ page }) => {
  await ready(page);
  await button(page, "play").click();
  const now = button(page, "pace-now");
  await expect(now).toBeVisible();
  await now.click();
  // inside the address' quarter-second wait: the bar leaves the page and comes back, as a layout that moves it would do
  await page.evaluate((tag) => {
    const bar = document.querySelector(tag);
    const parent = bar.parentNode;
    const next = bar.nextSibling;
    bar.remove();
    parent.insertBefore(bar, next);
  }, BAR);
  await expect(page).toHaveURL(/pace=0\.125/);
});

test("a page opened on a speed shows it as soon as it turns, and a page's own speed attribute still works", async ({ page }) => {
  await ready(page, "?pace=0.25");
  await button(page, "play").click();
  await expect(button(page, "pace-now")).toHaveAttribute("aria-label", "The view turns once in 2 minutes");
  await page.evaluate((tag) => document.querySelector(tag).setAttribute("speed", "6"), BAR);
  expect(await page.evaluate((tag) => document.querySelector(tag).controller.speed, BAR)).toBe(1.5);
  await expect(button(page, "pace-now")).toHaveAttribute("aria-label", "The view turns once in 4 minutes");
});

test("advanced has the four turn speeds and not the small button, and a flat view has neither", async ({ page }) => {
  await ready(page, "?controls=advanced");
  await button(page, "play").click();
  await expect(button(page, "pace-now")).toBeHidden();
  await expect(speed(page, 0.125)).toBeVisible();
  await button(page, "more").click();
  await expect(button(page, "pace-now")).toBeVisible();
  await page.evaluate((tag) => document.querySelector(tag).setAttribute("flat", ""), BAR);
  await expect(button(page, "pace-now")).toBeHidden();
});

test("the speed button adds no row to the bar and leaves Auto-turn under the pointer, in English and Japanese", async ({ page }) => {
  await ready(page);
  const height = () => page.locator(`${BAR} .bar`).evaluate((el) => el.getBoundingClientRect().height);
  const playAt = async () => { const box = await button(page, "play").boundingBox(); return [box.x, box.y]; };
  for (const language of ["en", "ja"]) {
    if (language === "ja") await page.locator('kazoku-language-picker button[data-v="ja"]').click();
    const still = await height();
    const where = await playAt();
    await button(page, "play").click();
    await expect(button(page, "pace-now")).toBeVisible();
    expect(await height(), language).toBe(still);
    expect(await playAt(), `${language}: Auto-turn has not moved, so a second press stops it`).toEqual(where);
    const crossing = await page.locator(BAR).evaluate((el) => {
      const r = (s) => el.shadowRoot.querySelector(s).getBoundingClientRect();
      const a = r(".pace-now");
      const b = r(".zoom");
      return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    });
    expect(crossing, `${language}: the speed button sits clear of the zoom buttons`).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await button(page, "play").click();
  }
});

test("at any width from a tablet up, turning does not make the bar taller", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone's width is the test above");
  await ready(page);
  const height = () => page.locator(`${BAR} .bar`).evaluate((el) => el.getBoundingClientRect().height);
  for (const width of [1280, 1000, 900, 800, 768, 720, 680]) {
    await page.setViewportSize({ width, height: 900 });
    const still = await height();
    await button(page, "play").click();
    await expect(button(page, "pace-now")).toBeVisible();
    expect(await height(), `at ${width}`).toBeLessThanOrEqual(still);
    await button(page, "play").click();
    await expect(button(page, "pace-now")).toBeHidden();
  }
});
