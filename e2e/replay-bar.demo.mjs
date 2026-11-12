// <kazoku-replay-bar>: play, pause, back to the start, repeat and the speed buttons. The page moves; the bar only reports.
import { expect, test } from "@playwright/test";

const bar = (page) => page.locator('[data-testid="bar"]');
const act = (page, name) => bar(page).locator(`button[data-act="${name}"]`);

test("no-repeat leaves Repeat out, and back-label names the start button", async ({ page }) => {
  await page.goto("/replay.html");
  await page.evaluate(() => {
    window.heard = [];
    const el = document.createElement("kazoku-replay-bar");
    el.id = "plain";
    el.setAttribute("no-repeat", "");
    el.setAttribute("back-label", "Back to the date");
    el.setAttribute("repeat", "");
    el.addEventListener("kazoku-replay", (event) => window.heard.push(event.detail.action));
    document.body.append(el);
  });
  await expect(page.locator("#plain").locator('button[data-act="repeat"]')).toHaveCount(0);
  await expect(page.locator("#plain").locator('button[data-act="start"]')).toHaveText("Back to the date");
  await page.waitForFunction(() => window.heard.length > 0);
  expect(await page.evaluate(() => window.heard.includes("repeat"))).toBe(false);
  await page.evaluate(() => { document.getElementById("plain").repeat = true; });
  expect(await page.evaluate(() => window.heard.includes("repeat"))).toBe(false);
});

test("play, pause, start and repeat are one row, a finger wide, and play is in the address", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/replay.html");
  await expect(act(page, "play")).toHaveText("Play");
  await expect(act(page, "start")).toHaveText("Start");
  await expect(act(page, "repeat")).toHaveText("Repeat");
  await expect(act(page, "play")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("details, summary")).toHaveCount(0);
  const boxes = await bar(page).locator("button").evaluateAll((all) => all.map((node) => { const box = node.getBoundingClientRect(); return [box.width, box.height]; }));
  expect(boxes.length).toBeGreaterThanOrEqual(4);
  for (const [width, height] of boxes) {
    expect(width).toBeGreaterThanOrEqual(47.5);
    expect(height).toBeGreaterThanOrEqual(47.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.evaluate(() => { window.heard = []; document.getElementById("bar").addEventListener("kazoku-replay", (event) => window.heard.push(event.detail.action)); });
  await act(page, "play").click();
  await expect(act(page, "play")).toHaveText("Pause");
  await expect(bar(page)).toHaveAttribute("playing", "");
  await expect(page).toHaveURL(/play=on/);
  await act(page, "repeat").click();
  await expect(act(page, "repeat")).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/repeat=on/);
  await act(page, "start").click();
  await expect(act(page, "play")).toHaveText("Play");
  await expect(page).not.toHaveURL(/play=/);
  await expect(page.locator('[data-testid="out"]')).toContainText("at 0.0");
  expect(await page.evaluate(() => window.heard)).toEqual(["play", "repeat", "start"]);
  expect(errors).toEqual([]);
});

test("a page opened on the address starts there, and reduced motion holds the start back", async ({ page }) => {
  await page.goto("/replay.html?play=on&repeat=on&replay-speed=60");
  await expect(act(page, "play")).toHaveText("Pause");
  await expect(act(page, "repeat")).toHaveAttribute("aria-pressed", "true");
  await expect(bar(page).locator('kazoku-speed-buttons button[aria-pressed="true"]')).toHaveAttribute("data-v", "60");
  expect(await bar(page).locator("kazoku-speed-buttons").evaluate((el) => el.value)).toBe(60);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/replay.html?play=on");
  await expect(act(page, "play")).toBeEnabled();
  await expect(act(page, "play")).toHaveText("Play");
  await expect(bar(page)).not.toHaveAttribute("playing", "");
  expect(new URL(page.url()).searchParams.get("play")).toBe("on");
});

test("with no preference the bar opens playing when the page asks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/replay.html?play=on");
  await expect(act(page, "play")).toBeEnabled();
  await expect(act(page, "play")).toHaveText("Pause");
  await expect(bar(page)).toHaveAttribute("playing", "");
  await expect(page.locator('[data-testid="out"]')).toContainText("Playing");
  // And with the attribute, no address.
  await page.goto("/replay.html");
  await page.evaluate(() => { const fresh = document.createElement("kazoku-replay-bar"); fresh.id = "fresh"; fresh.setAttribute("playing", ""); document.body.append(fresh); });
  const fresh = () => page.evaluate(() => { const el = document.getElementById("fresh"); return [el.playing, el.shadowRoot.querySelector('[data-act="play"]').textContent, el.shadowRoot.querySelector('[data-act="play"]').disabled]; });
  await expect.poll(fresh).toEqual([true, "Pause", false]);
});

test("under reduced motion the view opens still with Play ready, and moves only when the reader presses Play", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/replay.html");
  await expect(act(page, "play")).toBeEnabled();
  await expect(act(page, "play")).toHaveText("Play");
  await expect(act(page, "play")).toHaveAttribute("aria-pressed", "false");
  await expect(bar(page)).not.toHaveAttribute("playing", "");
  await expect(page.locator('[data-testid="out"]')).toContainText("Paused, at 0.0");
  // Nothing moves by itself.
  await page.waitForTimeout(600);
  await expect(page.locator('[data-testid="out"]')).toContainText("Paused, at 0.0");
  // The reader's press starts it, and says so.
  await act(page, "play").click();
  await expect(act(page, "play")).toHaveText("Pause");
  await expect(act(page, "play")).toHaveAttribute("aria-pressed", "true");
  await expect(bar(page)).toHaveAttribute("playing", "");
  await expect(page.locator('[data-testid="out"]')).toContainText("Playing");
  await expect(page).toHaveURL(/play=on/);
  await expect(page.locator('[data-testid="out"]')).not.toContainText("at 0.0");
  // A second press pauses.
  await act(page, "play").click();
  await expect(act(page, "play")).toHaveText("Play");
  await expect(page.locator('[data-testid="out"]')).toContainText("Paused");
});

test("under reduced motion an address or an attribute that says play does not start it, and user-play changes nothing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/replay.html?play=on");
  await expect(act(page, "play")).toBeEnabled();
  await expect(act(page, "play")).toHaveText("Play");
  await expect(bar(page)).not.toHaveAttribute("playing", "");
  await bar(page).evaluate((el) => el.setAttribute("user-play", ""));
  await expect(act(page, "play")).toBeEnabled();
  await act(page, "play").click();
  await expect(act(page, "play")).toHaveText("Pause");
  await bar(page).evaluate((el) => { el.removeAttribute("user-play"); el.playing = false; });
  await expect(act(page, "play")).toHaveText("Play");
  // A property set by the page is not the reader: it stays held back.
  await bar(page).evaluate((el) => { el.playing = true; });
  await expect(act(page, "play")).toHaveText("Play");
  await expect(act(page, "play")).toBeEnabled();
});

test("Japanese labels follow the page", async ({ page }) => {
  await page.goto("/replay.html");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(act(page, "play")).toHaveText("再生");
  await act(page, "play").click();
  await expect(act(page, "play")).toHaveText("一時停止");
  await expect(act(page, "start")).toHaveText("最初へ");
  await expect(act(page, "repeat")).toHaveText("繰り返し");
});
