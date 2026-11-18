import { expect, test } from "@playwright/test";
import { checkGestures } from "../dist/testing/index.js";

// A view that binds its own controller (own-controller.html): no bar, no carryControls, no event on the element. checkGestures reads it with the `controller` option.
const open = async (page) => {
  // KU_THROTTLE=4 slows Chromium's CPU that many times (a busy machine); other browsers have no such switch and run as they are.
  const rate = Number(process.env.KU_THROTTLE ?? 1);
  if (rate > 1 && page.context().browser()?.browserType().name() === "chromium") await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
  await page.goto("/own-controller.html");
  await page.waitForFunction(() => window.ownView !== undefined);
};

test("a view with its own controller and no bar has every gesture checked, by the controller option", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const bars = await page.evaluate(() => [document.querySelectorAll("kazoku-view-controls").length, "controller" in document.getElementById("own"), "state" in document.getElementById("own")]);
  expect(bars, "the page has no bar, and its view has neither controller nor state").toEqual([0, false, false]);
  const report = await checkGestures(page, "#own", { controller: "ownView" });
  expect(report.filter((r) => r.result === "checked").length).toBeGreaterThan(8);
});

test("without the option the check says what to give it, and a wrong path is named", async ({ page }) => {
  await open(page);
  await expect(checkGestures(page, "#own")).rejects.toThrow(/give the page's controller as the controller option/);
  await expect(checkGestures(page, "#own", { controller: "nothing.here" })).rejects.toThrow(/window\.nothing\.here is not a controller/);
});
