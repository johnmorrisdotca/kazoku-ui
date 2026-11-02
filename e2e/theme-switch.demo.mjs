import { expect, test } from "@playwright/test";

// <kazoku-theme-switch> on the demo page, in a real browser at a phone's width and a desk's, in Chromium and WebKit.
const SWITCH = "kazoku-theme-switch";
const button = (page, value) => page.locator(`${SWITCH} button[data-v="${value}"]`);
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const bodyColour = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/${query}`);
  await expect(page.locator(`${SWITCH} button`).first()).toBeVisible();
  return errors;
};
/** Records every kazoku-themechange from here on. */
const listen = (page) => page.evaluate(() => {
  window.__themes = [];
  document.addEventListener("kazoku-themechange", (event) => window.__themes.push({ choice: event.detail.choice, scheme: event.detail.scheme, reason: event.detail.reason }));
});
const heard = (page) => page.evaluate(() => window.__themes);

test("Light, Dark and Auto are three finger-wide buttons in the page's own style, and Auto is chosen at first", async ({ page }) => {
  const errors = await ready(page);
  const report = await page.evaluate(() => {
    const root = document.querySelector("kazoku-theme-switch").shadowRoot;
    const buttons = [...root.querySelectorAll("button")];
    return {
      values: buttons.map((b) => b.dataset.v),
      pressed: buttons.map((b) => b.getAttribute("aria-pressed")),
      small: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).length,
      plain: buttons.filter((b) => getComputedStyle(b).appearance !== "none").length,
      names: buttons.map((b) => b.textContent),
      group: root.querySelector(".group").getAttribute("aria-label"),
      wide: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  expect(report.values).toEqual(["light", "dark", "auto"]);
  expect(report.pressed).toEqual(["false", "false", "true"]);
  expect(report.small).toBe(0);
  expect(report.plain).toBe(0);
  expect(report.names).toEqual(["Light", "Dark", "Auto"]);
  expect(report.group).toBe("Colour theme");
  expect(report.wide).toBe(false);
  expect(await theme(page)).toBeNull();
  expect(errors).toEqual([]);
});

test("choosing Dark forces the page dark, Light forces it light, Auto lets the device decide, and each is an event", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await ready(page);
  await listen(page);
  const lightColour = await bodyColour(page);
  await button(page, "dark").click();
  expect(await theme(page)).toBe("dark");
  await expect(button(page, "dark")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "auto")).toHaveAttribute("aria-pressed", "false");
  expect(await bodyColour(page)).not.toBe(lightColour);
  await button(page, "light").click();
  expect(await theme(page)).toBe("light");
  expect(await bodyColour(page)).toBe(lightColour);
  await button(page, "auto").click();
  expect(await theme(page)).toBeNull();
  expect(await heard(page)).toEqual([
    { choice: "dark", scheme: "dark", reason: "user" },
    { choice: "light", scheme: "light", reason: "user" },
    { choice: "auto", scheme: "light", reason: "user" },
  ]);
});

test("Auto follows the device, and tells the page when it changes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await ready(page);
  await listen(page);
  const light = await bodyColour(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => bodyColour(page)).not.toBe(light);
  await expect.poll(() => heard(page)).toEqual([{ choice: "auto", scheme: "dark", reason: "system" }]);
  await button(page, "light").click();
  expect(await bodyColour(page)).toBe(light);
});

test("the switch itself is dark in a page forced dark on a light device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await ready(page);
  const surface = () => page.evaluate(() => getComputedStyle(document.querySelector("kazoku-theme-switch").shadowRoot.querySelector("button[data-v=light]")).backgroundColor);
  const before = await surface();
  await button(page, "dark").click();
  await expect.poll(surface).not.toBe(before);
  expect(await page.evaluate(() => document.querySelector("kazoku-theme-switch").getAttribute("data-scheme"))).toBe("dark");
});

test("the choice is in the address, and a page opened on it comes up in it; Auto leaves the address", async ({ page }) => {
  await ready(page);
  await button(page, "dark").click();
  await expect.poll(() => page.url()).toContain("theme=dark");
  await page.reload();
  await expect(page.locator(`${SWITCH} button`).first()).toBeVisible();
  expect(await theme(page)).toBe("dark");
  await expect(button(page, "dark")).toHaveAttribute("aria-pressed", "true");
  await button(page, "auto").click();
  await expect.poll(() => page.url()).not.toContain("theme");
  expect(await theme(page)).toBeNull();
});

test("the address wins over what was remembered, and other parameters are kept", async ({ page }) => {
  await ready(page);
  await button(page, "light").click();
  await page.goto("/?theme=dark&yaw=20");
  await expect(page.locator(`${SWITCH} button`).first()).toBeVisible();
  expect(await theme(page)).toBe("dark");
  await button(page, "light").click();
  await expect.poll(() => page.url()).toMatch(/theme=light/);
  expect(page.url()).toContain("yaw=20");
});

test("a page with no address remembers the choice in the browser's store", async ({ page }) => {
  await ready(page);
  await button(page, "dark").click();
  await page.goto("/");
  await expect(page.locator(`${SWITCH} button`).first()).toBeVisible();
  expect(await theme(page)).toBe("dark");
  expect(await page.evaluate(() => window.localStorage.getItem("kazoku-demo-theme"))).toBe("dark");
});

test("a browser that keeps nothing still switches", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const errors = await ready(page);
  await button(page, "dark").click();
  expect(await theme(page)).toBe("dark");
  expect(errors).toEqual([]);
});

test("something else writing data-theme moves the switch with it", async ({ page }) => {
  await ready(page);
  await listen(page);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(button(page, "light")).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await expect(button(page, "auto")).toHaveAttribute("aria-pressed", "true");
  expect((await heard(page)).map((e) => e.reason)).toEqual(["external", "external"]);
});

test("the value property and the attribute set it, the labels are English or Japanese, and the demo's view controls follow", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { document.querySelector("kazoku-theme-switch").value = "dark"; });
  expect(await theme(page)).toBe("dark");
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").getAttribute("theme"))).toBe("dark");
  await page.evaluate(() => document.querySelector("kazoku-theme-switch").setAttribute("value", "auto"));
  expect(await theme(page)).toBeNull();
  expect(await page.evaluate(() => document.querySelector("kazoku-view-controls").hasAttribute("theme"))).toBe(false);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(button(page, "dark")).toHaveText("ダーク");
  expect(await page.evaluate(() => document.querySelector("kazoku-theme-switch").shadowRoot.querySelector(".group").getAttribute("aria-label"))).toBe("テーマ");
});

test("words are only spoken on a desk; a phone shows the icons and keeps the names for a screen reader", async ({ page }, info) => {
  await ready(page);
  const visible = await page.evaluate(() => [...document.querySelector("kazoku-theme-switch").shadowRoot.querySelectorAll(".t")].map((el) => el.getBoundingClientRect().width > 2));
  expect(visible.every(Boolean)).toBe(!info.project.name.includes("phone"));
  await expect(button(page, "dark")).toHaveText("Dark");
});

test("it works inside another element's shadow root, for a target in that root", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "inner";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<div id="box">box</div><kazoku-theme-switch target="#box" modes="light dark"></kazoku-theme-switch>';
    document.body.append(host);
  });
  const inner = page.locator("#inner kazoku-theme-switch button[data-v=dark]");
  await inner.click();
  expect(await page.evaluate(() => document.getElementById("inner").shadowRoot.getElementById("box").getAttribute("data-theme"))).toBe("dark");
  expect(await theme(page)).toBeNull();
  expect(await page.evaluate(() => document.getElementById("inner").shadowRoot.querySelector("kazoku-theme-switch").shadowRoot.querySelectorAll("button").length)).toBe(2);
});

test("a second copy of the package does not break the page: the tag already taken is left alone", async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const before = customElements.get("kazoku-theme-switch");
    const again = await import(`./dist/theme-switch/define.js?again=${Date.now()}`);
    return { same: customElements.get("kazoku-theme-switch") === before, defined: again.defineThemeSwitch() };
  });
  expect(result).toEqual({ same: true, defined: false });
});
