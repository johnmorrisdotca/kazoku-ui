import { test } from "@playwright/test";
import { checkGestures } from "../dist/testing/index.js";

// The family's shared gesture check (src/testing/gestures.ts) on this package's own demo: a CSS 3D card turned, rolled, zoomed and moved by <kazoku-view-controls>.
test("every gesture of the view controls changes the demo's view, and the picture follows the moves", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.waitForFunction(() => customElements.get("kazoku-view-controls") !== undefined);
  await checkGestures(page, "#scene", { controls: "#controls" });
});

test("an immersive bar takes the plain wheel as a zoom and a finger drag as a tip", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.waitForFunction(() => customElements.get("kazoku-view-controls") !== undefined);
  await page.locator("#controls").evaluate((el) => el.setAttribute("immersive", ""));
  await checkGestures(page, "#scene", { controls: "#controls", immersive: true });
});
