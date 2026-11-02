import { expect, test } from "@playwright/test";

// createAddressState on demo/address.html, in a real browser at a phone's width and a desk's, in Chromium and WebKit.
const size = (page, value) => page.locator(`#size button[data-v="${value}"]`);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/address.html${query}`);
  await expect(page.locator("#name")).toBeVisible();
  return errors;
};
const search = (page) => page.evaluate(() => location.search);

test("every control is a finger wide and in the page's own style, with nothing wider than the screen", async ({ page }) => {
  const errors = await ready(page);
  const report = await page.evaluate(() => {
    const own = [...document.querySelectorAll("#name, #size button, #dots, #reset")];
    const shared = ["kazoku-language-picker", "kazoku-theme-switch"].flatMap((tag) => [...document.querySelector(tag).shadowRoot.querySelectorAll("button")]);
    const all = [...own, ...shared];
    return {
      count: all.length,
      small: all.filter((el) => { const r = el.getBoundingClientRect(); return r.height < 47.5 || (el.tagName === "BUTTON" && r.width < 47.5); }).length,
      plain: all.filter((el) => getComputedStyle(el).appearance !== "none").length,
      wide: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  expect(report.count).toBe(1 + 3 + 1 + 1 + 2 + 3);
  expect(report.small).toBe(0);
  expect(report.plain).toBe(0);
  expect(report.wide).toBe(false);
  expect(errors).toEqual([]);
});

test("a plain address means the starting choices, and a choice is written on it", async ({ page }) => {
  await ready(page);
  await expect(size(page, "m")).toHaveAttribute("aria-pressed", "true");
  expect(await search(page)).toBe("");
  await size(page, "l").click();
  await expect(size(page, "l")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => search(page)).toBe("?size=l");
  await page.locator("#dots").click();
  await expect.poll(() => search(page)).toBe("?size=l&dots=on");
  await expect(page.locator("#sample")).toHaveAttribute("data-dots", "on");
  await expect(page.locator("#address")).toHaveText("?size=l&dots=on");
});

test("a choice back at its start leaves the address, and Reset clears them all", async ({ page }) => {
  await ready(page);
  await size(page, "s").click();
  await page.locator("#name").fill("Ann");
  await expect.poll(() => search(page)).toBe("?size=s&name=Ann");
  await size(page, "m").click();
  await expect.poll(() => search(page)).toBe("?name=Ann");
  await page.locator("#reset").click();
  await expect.poll(() => search(page)).toBe("");
  await expect(page.locator("#name")).toHaveValue("");
});

test("a page opened on an address comes up in it, and other parameters are kept", async ({ page }) => {
  await ready(page, "?size=l&name=Ann&yaw=20&dots=on");
  await expect(size(page, "l")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#name")).toHaveValue("Ann");
  await expect(page.locator("#sample")).toHaveAttribute("data-dots", "on");
  await size(page, "s").click();
  await expect.poll(() => search(page)).toBe("?size=s&name=Ann&yaw=20&dots=on");
});

test("choices cost no history: after many, Back leaves the page", async ({ page }) => {
  await page.goto("about:blank");
  await ready(page);
  for (const value of ["s", "l", "m", "s"]) await size(page, value).click();
  await page.locator("#name").fill("A name");
  await expect.poll(() => search(page)).toContain("name=A+name");
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(2);
});

test("every change is heard by a subscriber, from this page's buttons and from the other parts", async ({ page }) => {
  await ready(page);
  await size(page, "l").click();
  await page.locator('kazoku-theme-switch button[data-v="dark"]').click();
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  const lines = await page.locator("#log li").allTextContents();
  expect(lines).toEqual(expect.arrayContaining(["set: size - -> l", "set: theme - -> dark", "set: lang - -> ja"]));
  await expect.poll(() => search(page)).toBe("?theme=dark&lang=ja&size=l");
});

test("going back and forward is heard, and the page follows", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    history.pushState(null, "", "?size=l&name=Bob");
    history.pushState(null, "", "?size=s");
  });
  await page.evaluate(() => history.back());
  await expect(size(page, "l")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#name")).toHaveValue("Bob");
  await expect(page.locator("#log li").first()).toContainText("navigation");
  await page.evaluate(() => history.forward());
  await expect(size(page, "s")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#name")).toHaveValue("");
});

test("typing is one write after a pause, not one for each key", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.__writes = 0;
    const real = history.replaceState.bind(history);
    history.replaceState = (...args) => { window.__writes += 1; return real(...args); };
  });
  await page.locator("#name").pressSequentially("abcdefgh", { delay: 20 });
  await expect.poll(() => search(page)).toBe("?name=abcdefgh");
  expect(await page.evaluate(() => window.__writes)).toBeLessThanOrEqual(2);
});

test("the labels are English or Japanese", async ({ page }) => {
  await ready(page);
  await expect(page.locator('[data-say="name"]')).toHaveText("Name");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(page.locator('[data-say="name"]')).toHaveText("名前");
  await expect(page.locator("#reset")).toHaveText("元に戻す");
});

test("the demo's colours follow the theme switch, which is in the address beside the page's own choices", async ({ page }) => {
  await ready(page, "?theme=dark&size=l");
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
  await expect(size(page, "l")).toHaveAttribute("aria-pressed", "true");
});

test("a page that cannot change its address still works", async ({ page }) => {
  await page.addInitScript(() => {
    history.replaceState = () => { throw new Error("sandboxed"); };
  });
  const errors = await ready(page);
  await size(page, "l").click();
  await expect(size(page, "l")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#sample")).toHaveAttribute("data-size", "l");
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
});
