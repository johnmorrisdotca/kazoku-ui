import { expect, test } from "@playwright/test";

// The turn's frame loop, counted at requestAnimationFrame itself: how many callbacks ran, how many ran in one page frame, how many are waiting at once, and how many "auto" changes were sent.
const COUNT = () => {
  const seen = { frames: 0, auto: 0, waiting: 0, mostWaiting: 0, mostInFrame: 0, autoInFrame: 0 };
  // The frame's callbacks all run before any task, so a message posted by the first of them marks the end of the page frame. (The time they are given does not: a slow frame can repeat it.)
  let framesNow = 0;
  let autoNow = 0;
  const endOfFrame = new window.MessageChannel();
  endOfFrame.port1.onmessage = () => { framesNow = 0; autoNow = 0; };
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const live = new Set();
  window.requestAnimationFrame = (callback) => {
    const id = request((time) => {
      live.delete(id);
      seen.waiting = live.size;
      seen.frames += 1;
      if (framesNow === 0) endOfFrame.port2.postMessage(0);
      framesNow += 1;
      seen.mostInFrame = Math.max(seen.mostInFrame, framesNow);
      callback(time);
    });
    live.add(id);
    seen.waiting = live.size;
    seen.mostWaiting = Math.max(seen.mostWaiting, live.size);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    live.delete(id);
    seen.waiting = live.size;
    cancel(id);
  };
  document.addEventListener("kazoku-viewchange", (event) => {
    if (event.detail.reason !== "auto") return;
    seen.auto += 1;
    autoNow += 1;
    seen.autoInFrame = Math.max(seen.autoInFrame, autoNow);
  }, true);
  window.__loop = seen;
  window.__reset = () => Object.assign(seen, { frames: 0, auto: 0, mostInFrame: 0, autoInFrame: 0, mostWaiting: seen.waiting });
};

const during = async (page, ms) => {
  await page.evaluate(() => window.__reset());
  await page.waitForTimeout(ms);
  return page.evaluate(() => ({ ...window.__loop }));
};
const BAR = "kazoku-view-controls";
const button = (page, name) => page.locator(`${BAR} [data-b="${name}"]`);
const scrollAway = (page) => page.evaluate(() => {
  const spacer = document.createElement("div");
  spacer.style.height = "4000px";
  document.body.prepend(spacer);
  window.scrollTo(0, 0);
});
/** Waits until it is really turning: a slow software frame can hold the first one back for most of a second. */
const turns = (page) => expect.poll(() => page.evaluate(() => window.__loop.auto), { timeout: 8000 }).toBeGreaterThan(2);
/** Moves the element in one go, as a framework that reorders its children does: it is taken off the page and put back in the same task. */
const move = (page) => page.evaluate((tag) => {
  const el = document.querySelector(tag);
  el.parentElement.insertBefore(el, el.nextSibling);
}, BAR);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(COUNT);
  await page.goto("/");
  await expect(page.locator(`${BAR} .bar`)).toBeVisible();
});

test("while it turns: one frame asked for at a time, one callback and one change a page frame", async ({ page }) => {
  await button(page, "play").click();
  await turns(page);
  const on = await during(page, 800);
  expect(on.frames).toBeGreaterThan(5);
  expect(on.auto).toBeGreaterThan(5);
  expect(on.mostInFrame).toBe(1);
  expect(on.autoInFrame).toBe(1);
  expect(on.mostWaiting).toBe(1);
});

test("a press of Auto-turn after the element moved is one loop, and it stops out of sight", async ({ page }) => {
  await move(page);
  await button(page, "play").click();
  await expect(button(page, "play")).toHaveAttribute("aria-pressed", "true");
  await turns(page);
  const on = await during(page, 500);
  expect(on.auto).toBeGreaterThan(3);
  expect(on.mostInFrame).toBe(1);
  await scrollAway(page);
  await page.waitForTimeout(300);
  const off = await during(page, 700);
  expect([off.frames, off.auto, off.waiting]).toEqual([0, 0, 0]);
  await button(page, "play").click();
  await expect(button(page, "play")).toHaveAttribute("aria-pressed", "false");
});

test("an autoplay element moved at once is one loop, and it stops out of sight", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector("kazoku-view-controls").remove();
    const el = document.createElement("kazoku-view-controls");
    el.id = "again";
    el.setAttribute("for", "scene");
    el.setAttribute("autoplay", "");
    const holder = document.createElement("div");
    document.body.append(holder);
    holder.append(el);
    // Taken off and put back before the element's first microtask has run.
    document.body.prepend(el);
  });
  await turns(page);
  const on = await during(page, 600);
  expect(on.frames).toBeGreaterThan(3);
  expect(on.mostInFrame).toBe(1);
  expect(on.autoInFrame).toBe(1);
  await page.evaluate(() => { document.getElementById("scene").style.display = "none"; });
  await page.waitForTimeout(300);
  const off = await during(page, 700);
  expect([off.frames, off.auto, off.waiting]).toEqual([0, 0, 0]);
});

test("an autoplay view that opens out of sight never asks for a frame until it is seen", async ({ page }) => {
  await page.evaluate(() => {
    window.__reset();
    const far = document.createElement("div");
    far.id = "far";
    far.style.cssText = "position:absolute;top:9000px;width:100px;height:100px";
    document.body.append(far);
    const el = document.createElement("kazoku-view-controls");
    el.id = "far-controls";
    el.setAttribute("for", "far");
    el.setAttribute("autoplay", "");
    document.body.append(el);
  });
  await page.waitForTimeout(700);
  const off = await page.evaluate(() => ({ ...window.__loop }));
  expect([off.frames, off.auto]).toEqual([0, 0]);
  expect(await page.evaluate(() => document.getElementById("far-controls").state.turning)).toBe(true);
  await page.evaluate(() => document.getElementById("far").scrollIntoView());
  await turns(page);
});

test("a view put out of sight stops at the angle it had, and picks up there", async ({ page }) => {
  await button(page, "play").click();
  await turns(page);
  await scrollAway(page);
  await page.waitForTimeout(300);
  const yaw = () => page.evaluate((tag) => document.querySelector(tag).state.yaw, BAR);
  const left = await yaw();
  await page.waitForTimeout(600);
  expect(await yaw()).toBe(left);
  await page.evaluate(() => { window.scrollTo(0, 4000); window.__reset(); });
  await expect.poll(() => page.evaluate(() => window.__loop.auto), { timeout: 8000 }).toBeGreaterThan(0);
  // Picked up where it was, with no jump for the time away: each frame moves it by at most a tenth of a second's turn, three degrees.
  const { yaw: back, frames } = await page.evaluate((tag) => ({ yaw: document.querySelector(tag).state.yaw, frames: window.__loop.auto }), BAR);
  expect(back - left).toBeGreaterThan(0);
  expect(back - left).toBeLessThanOrEqual(3 * frames + 0.001);
});

test("an element that is on no page asks for no frame when told to play", async ({ page }) => {
  await page.evaluate(() => {
    window.__reset();
    const el = document.createElement("kazoku-view-controls");
    el.play();
    window.__off = el;
  });
  const off = await during(page, 500);
  expect([off.frames, off.auto, off.waiting]).toEqual([0, 0, 0]);
  await page.evaluate(() => {
    document.querySelector("kazoku-view-controls").remove();
    window.__off.setAttribute("for", "scene");
    document.body.prepend(window.__off);
  });
  await turns(page);
});

test("an element taken off the page leaves nothing running, even when told to play afterwards", async ({ page }) => {
  await button(page, "play").click();
  await turns(page);
  await page.evaluate((tag) => {
    const el = document.querySelector(tag);
    el.remove();
    el.play();
  }, BAR);
  await page.waitForTimeout(100);
  const off = await during(page, 500);
  expect([off.frames, off.auto, off.waiting]).toEqual([0, 0, 0]);
});

test("a plain controller bound to a view stops out of sight and in a hidden tab too", async ({ page }) => {
  await page.evaluate(async () => {
    document.querySelector("kazoku-view-controls").remove();
    const { createViewController } = await import("/dist/view-controls/controller.js");
    const view = document.getElementById("scene");
    const c = createViewController({ onChange: (state, info) => { if (info.reason === "auto") view.dispatchEvent(new window.CustomEvent("kazoku-viewchange", { detail: { reason: "auto" }, bubbles: true })); } });
    c.bind(view);
    c.play();
    window.__plain = c;
  });
  await turns(page);
  await page.evaluate(() => { document.getElementById("scene").style.display = "none"; });
  await page.waitForTimeout(300);
  const off = await during(page, 500);
  expect([off.frames, off.auto, off.waiting]).toEqual([0, 0, 0]);
  await page.evaluate(() => { document.getElementById("scene").style.display = ""; });
  await expect.poll(() => page.evaluate(() => window.__loop.auto), { timeout: 8000 }).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new window.Event("visibilitychange"));
  });
  await page.waitForTimeout(50);
  const hidden = await during(page, 500);
  expect([hidden.frames, hidden.auto, hidden.waiting]).toEqual([0, 0, 0]);
});
