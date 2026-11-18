// <kazoku-time-scrubber>: keys, a pointer and a finger, the date field, the address, both languages, and inside the replay bar.
// Events are recorded in the page (window.heard) and read afterwards, so a slow machine cannot slip between a read and an action. Nothing here depends on today's date or a clock.
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, browserName }) => {
  // KU_THROTTLE=4 runs the page with a CPU four times slower (Chromium only), for the load check.
  if (process.env.KU_THROTTLE && browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.KU_THROTTLE) });
  }
});

const scrub = (page) => page.locator('[data-testid="scrub"]');
const slider = (page) => scrub(page).locator('[role="slider"]');
const field = (page) => scrub(page).locator("input");
const scale = (page, name) => scrub(page).locator(`button[data-scale="${name}"]`);

async function ready(page, query = "") {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`/scrubber.html${query}`);
  await expect(slider(page)).toBeVisible();
  await page.evaluate(() => {
    window.heard = [];
    document.getElementById("scrub").addEventListener("kazoku-timechange", (event) => window.heard.push({ date: event.detail.date, scale: event.detail.scale, reason: event.detail.reason }));
  });
  return errors;
}
const heard = (page) => page.evaluate(() => window.heard);

test("arrows step one of the scale, Page keys one of the next coarser, Home and End go to the ends, and the value is spoken as a date", async ({ page }) => {
  const errors = await ready(page);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026");
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2027");
  await page.keyboard.press("PageDown");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2017");
  await scale(page, "month").click();
  await slider(page).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "October 2017");
  await page.keyboard.press("PageUp");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "October 2018");
  await scale(page, "day").click();
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "18 October 2018");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "16 October 2018");
  await page.keyboard.press("PageUp");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "16 November 2018");
  await page.keyboard.press("End");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "31 December 2030");
  await page.keyboard.press("Home");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "4 October 1957");
  await page.keyboard.press("ArrowLeft");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "4 October 1957");
  await expect(slider(page)).toHaveAttribute("role", "slider");
  expect((await heard(page)).every((one) => one.reason === "user")).toBe(true);
  expect(errors).toEqual([]);
});

test("a press or a drag on the track picks a year, a month or a day, and a finger does the same", async ({ page }) => {
  await ready(page);
  await scale(page, "day").click();
  const box = await slider(page).boundingBox();
  const at = (fraction) => ({ x: box.x + box.width * fraction, y: box.y + box.height / 2 });
  await page.mouse.click(at(0.52).x, at(0.52).y);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "16 November 2026");
  await page.mouse.move(at(0.1).x, at(0.1).y);
  await page.mouse.down();
  await page.mouse.move(at(0.5).x, at(0.5).y, { steps: 4 });
  await page.mouse.move(at(0.92).x, at(0.92).y, { steps: 4 });
  await page.mouse.up();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "28 November 2026");
  // Moving the pointer after the button is up changes nothing.
  await page.mouse.move(at(0.1).x, at(0.1).y);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "28 November 2026");
  await scale(page, "month").click();
  await page.mouse.click(at(0.52).x, at(0.52).y);
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "July 2026");
  // A finger: pointer events of type touch, sent in one call.
  await slider(page).evaluate((track, point) => {
    const send = (type, x) => track.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: x, clientY: point.y, bubbles: true, composed: true }));
    send("pointerdown", point.x1);
    send("pointermove", point.x2);
    send("pointerup", point.x2);
  }, { x1: at(0.02).x, x2: at(0.95).x, y: at(0.5).y });
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "December 2026");
  expect((await heard(page)).at(-1)).toEqual({ date: "2026-12-28", scale: "month", reason: "user" });
});

test("the year scale reaches the ends of the range, and the track never leaves it", async ({ page }) => {
  await ready(page);
  const box = await slider(page).boundingBox();
  await page.mouse.click(box.x, box.y + box.height / 2);
  expect(await slider(page).getAttribute("aria-valuetext")).toBe("1957");
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  expect(await slider(page).getAttribute("aria-valuetext")).toBe("2030");
  const now = await slider(page).evaluate((track) => [Number(track.getAttribute("aria-valuemin")), Number(track.getAttribute("aria-valuenow")), Number(track.getAttribute("aria-valuemax"))]);
  expect(now[0]).toBeLessThanOrEqual(now[1]);
  expect(now[1]).toBeLessThanOrEqual(now[2]);
});

test("the date field reads what a reader types, refuses what is not a date, and Escape gives the old date back", async ({ page }) => {
  await ready(page);
  await field(page).fill("2026年12月3日");
  await field(page).press("Enter");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026");
  await expect(field(page)).toHaveValue("2026-12-03");
  await scale(page, "day").click();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "3 December 2026");
  await field(page).fill("2026-02-30");
  await field(page).press("Enter");
  await expect(field(page)).toHaveAttribute("aria-invalid", "true");
  await expect(scrub(page).locator(".msg")).toHaveText("Enter a date such as 2026-11-17");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "3 December 2026");
  await field(page).press("Escape");
  await expect(field(page)).toHaveAttribute("aria-invalid", "false");
  await expect(field(page)).toHaveValue("2026-12-03");
  await field(page).fill("1800-01-01");
  await field(page).press("Enter");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "4 October 1957");
  await expect(field(page)).toHaveValue("1957-10-04");
});

test("the date and the scale are kept in the address and read back", async ({ page }) => {
  await ready(page);
  await scale(page, "day").click();
  await slider(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/date=2026-11-18/);
  await expect(page).toHaveURL(/date-scale=day/);
  await page.goto("/scrubber.html?date=2020-02-29&date-scale=month");
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "February 2020");
  await expect(scale(page, "month")).toHaveAttribute("aria-pressed", "true");
  await expect(field(page)).toHaveValue("2020-02-29");
});

test("in Japanese the buttons, the spoken value and the field are Japanese", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.documentElement.setAttribute("lang", "ja"));
  await expect(scrub(page).locator("button[data-scale]")).toHaveText(["年", "月", "日"]);
  await expect(slider(page)).toHaveAttribute("aria-label", "日付スライダー");
  await scale(page, "day").click();
  await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026年11月17日");
  await expect(field(page)).toHaveValue("2026年11月17日");
  await field(page).fill("abc");
  await field(page).press("Enter");
  await expect(scrub(page).locator(".msg")).toHaveText("日付を入力してください（例：2026-11-17）");
});

test("targets are a finger wide, the page does not scroll sideways and nothing needs hover", async ({ page }) => {
  await ready(page);
  const boxes = await page.locator('[data-testid="scrub"], [data-testid="bar"]').evaluateAll((hosts) => hosts.flatMap((host) => [...host.shadowRoot.querySelectorAll('button, input, [role="slider"]')].map((node) => { const r = node.getBoundingClientRect(); return [node.tagName, r.width, r.height]; })));
  expect(boxes.length).toBeGreaterThanOrEqual(7);
  for (const [, width, height] of boxes) {
    expect(width).toBeGreaterThanOrEqual(47.5);
    expect(height).toBeGreaterThanOrEqual(47.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("inside the replay bar the date slider reports to the page and never plays, pauses or restarts", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.bar = [];
    const bar = document.getElementById("bar");
    bar.addEventListener("kazoku-timechange", (event) => window.bar.push(event.detail.date));
    bar.addEventListener("kazoku-replay", (event) => window.bar.push(`replay:${event.detail.action}`));
  });
  const inside = page.locator('[data-testid="bar"] kazoku-time-scrubber');
  await page.locator('[data-testid="bar"] button[data-act="play"]').click();
  await expect(page.locator('[data-testid="bar"] button[data-act="play"]')).toHaveAttribute("aria-pressed", "true");
  const before = await page.evaluate(() => window.bar.length);
  await inside.locator("button[data-scale=day]").click();
  await inside.locator('[role="slider"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(inside.locator('[role="slider"]')).toHaveAttribute("aria-valuetext", "18 November 2026");
  expect(await page.evaluate((from) => window.bar.slice(from), before)).toEqual(["2026-11-17", "2026-11-18"]);
  await expect(page.locator('[data-testid="bar"] button[data-act="play"]')).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.getElementById("bar").playing)).toBe(true);
  await page.evaluate(() => document.getElementById("bar").setAttribute("date", "2030-01-02"));
  await expect(inside.locator("input")).toHaveValue("2030-01-02");
});
