// <kazoku-options-window>: drag, snap, collapse, help, a phone sheet, and the same content in the shelf frame.
import { expect, test } from "@playwright/test";

const win = (page) => page.locator("#win");
const title = (page) => win(page).locator('[data-act="title"]');

test("a drag snaps to a corner, Escape folds it, and the chip opens it again", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("phone"), "a phone shows a sheet, which does not drag");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto("/options.html");
  await expect(title(page)).toHaveText("Planet options");
  await expect(win(page)).toHaveAttribute("open", "");
  await expect(win(page)).toContainText("Turn speed");
  const buttons = await win(page).locator("button").evaluateAll((all) => all.map((node) => { const box = node.getBoundingClientRect(); return [box.width, box.height]; }));
  expect(buttons.length).toBeGreaterThanOrEqual(3);
  for (const [width, height] of buttons) {
    expect(width).toBeGreaterThanOrEqual(47.5);
    expect(height).toBeGreaterThanOrEqual(47.5);
  }

  const start = await win(page).evaluate((el) => ({ left: el.offsetLeft, top: el.offsetTop }));
  const bar = await title(page).boundingBox();
  await page.mouse.move(bar.x + 30, bar.y + 24);
  await page.mouse.down();
  await page.mouse.move(bar.x + 30 - start.left - 80, bar.y + 24 - start.top - 80, { steps: 10 });
  await page.mouse.up();
  await expect(win(page)).toHaveAttribute("data-snap", "tl");
  expect(await win(page).evaluate((el) => el.style.left)).toBe("0px");
  expect(await win(page).evaluate((el) => el.style.top)).toBe("0px");
  await expect(page).toHaveURL(/place=tl/);

  await title(page).focus();
  const top = await win(page).evaluate((el) => el.offsetTop);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect(await win(page).evaluate((el) => el.offsetTop)).toBeGreaterThan(top + 20);

  await win(page).locator('[data-act="help"]').click();
  await expect(win(page).locator(".help-panel")).toBeVisible();
  await expect(win(page).locator(".gestures")).toContainText("Shift and a drag");
  await expect(page.locator('#win p[slot="help"]')).toBeVisible();
  await title(page).focus();
  await page.keyboard.press("Escape");
  await expect(win(page).locator(".help-panel")).toBeHidden();
  await expect(page.locator('#win p[slot="help"]')).toBeHidden();
  await title(page).focus();
  await page.keyboard.press("Escape");
  await expect(win(page)).not.toHaveAttribute("open", "");
  await expect(page.locator("[data-testid=body]")).toBeHidden();
  await expect(page).toHaveURL(/open=off/);
  await title(page).click();
  await expect(win(page)).toHaveAttribute("open", "");
  await expect(page.locator("[data-testid=body]")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the shelf frame shows the same content, docked to the right", async ({ page }, testInfo) => {
  await page.goto("/options.html");
  const shelf = page.locator("#shelf");
  await expect(shelf).toContainText("Turn speed");
  await expect(win(page)).toContainText("Turn speed");
  await expect(shelf).toHaveAttribute("data-variant", "shelf");
  await expect(shelf).toHaveAttribute("data-presentation", "edge");
  await expect(win(page)).toHaveAttribute("data-presentation", "float");
  if (testInfo.project.name.includes("phone")) return;
  const stage = await page.locator("#shelf-stage").boundingBox();
  const box = await shelf.boundingBox();
  expect(Math.abs(box.x + box.width - (stage.x + stage.width))).toBeLessThan(4);
});

test("on a phone the card is a sheet at the bottom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("desk"), "the sheet is the phone frame");
  await page.goto("/options.html");
  await expect(win(page)).toHaveClass(/sheet/);
  const stage = await page.locator("#stage").boundingBox();
  const box = await win(page).boundingBox();
  expect(box.y + box.height).toBeGreaterThan(stage.y + stage.height - 24);
  expect(box.y).toBeGreaterThan(stage.y + 40);
});

test("Japanese labels follow the page", async ({ page }) => {
  await page.goto("/options.html");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(win(page).locator('[data-act="fold"]')).toHaveText("しまう");
  await expect(win(page).locator('[data-act="help"]')).toHaveText("ヘルプ");
  await page.locator("#win").locator('[data-act="help"]').click();
  await expect(win(page)).toContainText("ひねり");
});

test("a dark theme paints the card dark", async ({ page }) => {
  await page.goto("/options.html");
  await win(page).evaluate((el) => el.setAttribute("theme", "dark"));
  const bg = await win(page).locator(".frame").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgb(255, 255, 255)");
});
