import { expect, test } from "@playwright/test";
import { checkExactGrab, checkFollowsTheHand, dragBy, movedBy } from "../templates/e2e-ground.mjs";

// Exact grab, on demo/grab.html: a drawn globe 120 pixels in radius. The shared check of the drag rule (templates/e2e-ground.mjs) moves a real pointer and real keys and compares pictures.
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/grab.html${query}`);
  await expect(page.locator("kazoku-view-controls .bar")).toBeVisible();
  await page.locator("#scene").scrollIntoViewIfNeeded();
  return errors;
};

test("the ground follows the hand: a drag, the arrow keys and Auto-turn all move it the way the hand does", async ({ page }) => {
  const errors = await ready(page);
  await checkFollowsTheHand(page, { view: "#scene", picture: "#globe", autoTurn: "right" });
  expect(errors).toEqual([]);
});

test("with grab-radius a drag keeps the touched point under the pointer, sideways and upward", async ({ page }) => {
  const errors = await ready(page);
  await expect(page.locator("kazoku-view-controls")).toHaveAttribute("grab-radius", "120");
  await checkExactGrab(page, { view: "#scene", picture: "#globe", radius: 120 });
  expect(errors).toEqual([]);
});

test("without it a drag turns by the fixed angle across the view: a half turn over its width", async ({ page }) => {
  await ready(page, "?grab=off");
  await expect(page.locator("kazoku-view-controls")).not.toHaveAttribute("grab-radius", /.*/);
  const width = (await page.locator("#scene").boundingBox()).width;
  const scene = page.locator("#scene");
  const moved = await movedBy(page, page.locator("#globe"), () => dragBy(page, scene, 18, 0), { reach: 80 });
  const expected = 120 * Math.sin((18 / width) * Math.PI);
  expect(Math.abs(moved.x - expected), `18 px of drag over a view ${Math.round(width)} px wide moved the ground ${moved.x} px, and a half turn across the width is ${expected.toFixed(1)} px`).toBeLessThanOrEqual(3);
});
