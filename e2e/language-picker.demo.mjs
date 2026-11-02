import { expect, test } from "@playwright/test";

// <kazoku-language-picker> on the demo page, in a real browser at a phone's width and a desk's, in Chromium and WebKit.
const PICKER = "kazoku-language-picker";
const button = (page, code) => page.locator(`${PICKER} button[data-v="${code}"]`);
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/${query}`);
  await expect(page.locator(`${PICKER} button`).first()).toBeVisible();
  return errors;
};
/** Records every kazoku-languagechange from here on. */
const listen = (page) => page.evaluate(() => {
  window.__langs = [];
  document.addEventListener("kazoku-languagechange", (event) => window.__langs.push({ lang: event.detail.lang, previous: event.detail.previous, reason: event.detail.reason }));
});
const heard = (page) => page.evaluate(() => window.__langs);
const intro = (page) => page.locator('[data-say="intro"]').textContent();

test("a button for each language, each in its own name and a finger wide, with English chosen for an English reader", async ({ page }) => {
  const errors = await ready(page);
  const report = await page.evaluate(() => {
    const root = document.querySelector("kazoku-language-picker").shadowRoot;
    const buttons = [...root.querySelectorAll("button")];
    return {
      values: buttons.map((b) => b.dataset.v),
      names: buttons.map((b) => b.textContent),
      langs: buttons.map((b) => b.lang),
      pressed: buttons.map((b) => b.getAttribute("aria-pressed")),
      small: buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.height < 47.5 || r.width < 47.5; }).length,
      plain: buttons.filter((b) => getComputedStyle(b).appearance !== "none").length,
      group: root.querySelector(".group").getAttribute("aria-label"),
      wide: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  expect(report.values).toEqual(["en", "ja"]);
  expect(report.names).toEqual(["English", "日本語"]);
  expect(report.langs).toEqual(["en", "ja"]);
  expect(report.pressed).toEqual(["true", "false"]);
  expect(report.small).toBe(0);
  expect(report.plain).toBe(0);
  expect(report.group).toBe("Language");
  expect(report.wide).toBe(false);
  expect(await htmlLang(page)).toBe("en");
  expect(errors).toEqual([]);
});

test("choosing 日本語 sets lang on the page, says so in an event, and the page answers in Japanese", async ({ page }) => {
  await ready(page);
  await listen(page);
  const english = await intro(page);
  await button(page, "ja").click();
  expect(await htmlLang(page)).toBe("ja");
  await expect(button(page, "ja")).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, "en")).toHaveAttribute("aria-pressed", "false");
  expect(await intro(page)).not.toBe(english);
  expect(await page.evaluate(() => document.querySelector("kazoku-language-picker").shadowRoot.querySelector(".group").getAttribute("aria-label"))).toBe("言語");
  await button(page, "en").click();
  expect(await htmlLang(page)).toBe("en");
  expect(await intro(page)).toBe(english);
  expect(await heard(page)).toEqual([
    { lang: "ja", previous: "en", reason: "user" },
    { lang: "en", previous: "ja", reason: "user" },
  ]);
});

test("a reader whose browser asks for Japanese starts in Japanese", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ja-JP" });
  const page = await context.newPage();
  await ready(page);
  expect(await htmlLang(page)).toBe("ja");
  await expect(button(page, "ja")).toHaveAttribute("aria-pressed", "true");
  await context.close();
});

test("the choice is in the address, and a page opened on it comes up in it", async ({ page }) => {
  await ready(page);
  await button(page, "ja").click();
  await expect.poll(() => page.url()).toContain("lang=ja");
  await page.reload();
  await expect(page.locator(`${PICKER} button`).first()).toBeVisible();
  expect(await htmlLang(page)).toBe("ja");
  await button(page, "en").click();
  await expect.poll(() => page.url()).toContain("lang=en");
});

test("the address wins over what was remembered, and other parameters are kept", async ({ page }) => {
  await ready(page);
  await button(page, "ja").click();
  await page.goto("/?lang=en&yaw=20");
  await expect(page.locator(`${PICKER} button`).first()).toBeVisible();
  expect(await htmlLang(page)).toBe("en");
  await button(page, "ja").click();
  await expect.poll(() => page.url()).toContain("lang=ja");
  expect(page.url()).toContain("yaw=20");
});

test("a page with no address remembers the choice in the browser's store", async ({ page }) => {
  await ready(page);
  await button(page, "ja").click();
  await page.goto("/");
  await expect(page.locator(`${PICKER} button`).first()).toBeVisible();
  expect(await htmlLang(page)).toBe("ja");
  expect(await page.evaluate(() => window.localStorage.getItem("kazoku-demo-lang"))).toBe("ja");
});

test("a browser that keeps nothing still switches", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const errors = await ready(page);
  await button(page, "ja").click();
  expect(await htmlLang(page)).toBe("ja");
  expect(errors).toEqual([]);
});

test("something else writing lang on the page moves the picker with it", async ({ page }) => {
  await ready(page);
  await listen(page);
  await page.evaluate(() => document.documentElement.setAttribute("lang", "ja-JP"));
  await expect(button(page, "ja")).toHaveAttribute("aria-pressed", "true");
  expect(await heard(page)).toEqual([{ lang: "ja", previous: "en", reason: "external" }]);
});

test("the value property and the attribute set it, and a code that is not offered is ignored", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { document.querySelector("kazoku-language-picker").value = "ja"; });
  expect(await htmlLang(page)).toBe("ja");
  await page.evaluate(() => { document.querySelector("kazoku-language-picker").value = "fr"; });
  expect(await htmlLang(page)).toBe("ja");
  await page.evaluate(() => document.querySelector("kazoku-language-picker").setAttribute("value", "en"));
  expect(await htmlLang(page)).toBe("en");
});

test("the languages are the page's list, each in its own name, and the picker follows when the list changes", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => document.querySelector("kazoku-language-picker").setAttribute("languages", "ja fr de"));
  const names = await page.evaluate(() => [...document.querySelector("kazoku-language-picker").shadowRoot.querySelectorAll("button")].map((b) => b.textContent));
  expect(names).toEqual(["日本語", "Français", "Deutsch"]);
  // English is no longer offered, so the picker moves to the first of the list.
  expect(await htmlLang(page)).toBe("ja");
  await page.evaluate(() => { document.querySelector("kazoku-language-picker").names = { fr: "Français (Canada)" }; });
  await expect(button(page, "fr")).toHaveText("Français (Canada)");
});

test("the demo's other parts answer: the view controls and the theme switch speak the chosen language", async ({ page }) => {
  await ready(page);
  await button(page, "ja").click();
  await expect(page.locator('kazoku-view-controls [data-b="front"]')).toHaveText("正面");
  await expect(page.locator('kazoku-theme-switch button[data-v="dark"]')).toHaveText("ダーク");
});

test("it works inside another element's shadow root, for a target in that root", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "inner";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = '<p id="para">hello</p><kazoku-language-picker target="#para" languages="en fr"></kazoku-language-picker>';
    document.body.append(host);
  });
  await page.locator('#inner kazoku-language-picker button[data-v="fr"]').click();
  expect(await page.evaluate(() => document.getElementById("inner").shadowRoot.getElementById("para").getAttribute("lang"))).toBe("fr");
  expect(await htmlLang(page)).toBe("en");
});

test("a second copy of the package does not break the page: the tag already taken is left alone", async ({ page }) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const before = customElements.get("kazoku-language-picker");
    const again = await import(`./dist/language-picker/define.js?again=${Date.now()}`);
    return { same: customElements.get("kazoku-language-picker") === before, defined: again.defineLanguagePicker() };
  });
  expect(result).toEqual({ same: true, defined: false });
});
