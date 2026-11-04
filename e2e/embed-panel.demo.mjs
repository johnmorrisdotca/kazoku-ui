import { expect, test } from "@playwright/test";
import { COUNT_SCRIPT, readCounts } from "../dist/testing/index.js";

// <kazoku-embed-panel> on its own page: the picker, the size, every tab, the picture that fits its box, Copy with its label, the two links, the credit line, the address, the words, light and dark.
const P = '[data-testid="panel"]';
const D = '[data-testid="data"]';
const ready = async (page, query = "") => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => void window.__copied.push(text) } });
  });
  await page.goto(`/embed-panel.html${query}`);
  await expect(page.locator(`${P} [part="copy"]`)).toBeVisible();
  return errors;
};
const code = (page, root = P) => page.locator(`${root} [part="code"]`).innerText();
const tab = (page, kind, root = P) => page.locator(`${root} button[data-kind="${kind}"]`);
const size = (page, n) => page.locator(`${P} button[data-size="${n}"]`);
const item = (page, id) => page.locator(`${P} button[data-id="${id}"]`);
const rect = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });

test("the tabs are the family's seven and one the page added, the sizes four, and none of it is a menu", async ({ page }) => {
  const errors = await ready(page);
  await expect(page.locator(`${P} [role="tab"]`)).toHaveText(["HTML", "ES module", "React", "Vue", "Angular", "Svelte", "iframe", "Image address"]);
  await expect(page.locator(`${P} [part="size-button"]`)).toHaveText(["160", "240", "320", "480"]);
  expect(await page.locator(`${P} select, ${P} option`).count()).toBe(0);
  await expect(page.locator(`${P} [role="tab"][aria-selected="true"]`)).toHaveText("HTML");
  await expect(page.locator(`${P} [part="size-button"][aria-pressed="true"]`)).toHaveText("320");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("every control is a finger wide, and the search box is not the browser's own", async ({ page }) => {
  await ready(page);
  const boxes = await page.locator(`${P} button, ${P} a.btn, ${P} input`).evaluateAll((all) => all.filter((el) => el.getBoundingClientRect().width > 0).map((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { tag: el.tagName, h: r.height, w: r.width, radius: s.borderTopLeftRadius, appearance: s.appearance, text: el.textContent.trim() }; }));
  expect(boxes.length).toBeGreaterThan(20);
  for (const box of boxes) {
    expect(box.h, `${box.tag} ${box.text}`).toBeGreaterThanOrEqual(47.5);
    expect(box.w, `${box.tag} ${box.text}`).toBeGreaterThanOrEqual(47.5);
    expect(box.appearance).toBe("none");
    expect(parseFloat(box.radius)).toBeGreaterThanOrEqual(20);
  }
});

test("each tab shows its way of putting the badge in a page", async ({ page }) => {
  await ready(page);
  const want = { html: "<script type=\"module\"", module: "document.createElement(\"demo-badge\")", react: "useEffect", vue: "<template>", angular: "CUSTOM_ELEMENTS_SCHEMA", svelte: "onMount", iframe: "<iframe", image: "<img src=" };
  for (const [kind, text] of Object.entries(want)) {
    await tab(page, kind).click();
    await expect(page.locator(`${P} [part="code"]`)).toContainText(text);
    await expect(tab(page, kind)).toHaveAttribute("aria-selected", "true");
  }
  await expect(page.locator(`${P} [part="note"]`)).toContainText("image address");
  await tab(page, "html").click();
  await expect(page.locator(`${P} [part="note"]`)).toBeHidden();
});

test("the arrow keys, Home and End move between the tabs", async ({ page }) => {
  await ready(page);
  await tab(page, "html").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "module")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(tab(page, "image")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "html")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "image")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tab(page, "html")).toHaveAttribute("aria-selected", "true");
});

test("a size changes the code and the picture, and 320 is left out of the code", async ({ page }) => {
  await ready(page);
  expect(await code(page)).not.toContain("size=");
  await size(page, 160).click();
  expect(await code(page)).toContain('size="160"');
  await expect(page.locator(`${P} demo-badge`)).toHaveAttribute("size", "160");
  await size(page, 480).click();
  expect(await code(page)).toContain('size="480"');
  await tab(page, "iframe").click();
  expect(await code(page)).toContain('width="480"');
  await expect(page.locator(`${P} [part="preview"] iframe`)).toHaveAttribute("width", "480");
});

test("the picture fits its box at every size, on this screen and in a narrow box", async ({ page }) => {
  await ready(page);
  for (const narrow of [false, true]) {
    if (narrow) await page.evaluate(() => { document.querySelector('[data-testid="panel"]').style.maxWidth = "230px"; });
    for (const n of [160, 240, 320, 480]) {
      await size(page, n).click();
      for (const kind of ["html", "iframe", "image"]) {
        await tab(page, kind).click();
        await page.waitForTimeout(120);
        const box = await rect(page.locator(`${P} [part="preview"]`));
        const frame = await rect(page.locator(`${P} .frame`));
        const inner = await rect(page.locator(`${P} .fit > *`).first());
        expect(frame.left, `${n} ${kind} ${narrow}`).toBeGreaterThanOrEqual(box.left - 0.5);
        expect(frame.right, `${n} ${kind} ${narrow}`).toBeLessThanOrEqual(box.right + 0.5);
        expect(inner.left, `${n} ${kind} ${narrow}`).toBeGreaterThanOrEqual(box.left - 0.5);
        expect(inner.right, `${n} ${kind} ${narrow}`).toBeLessThanOrEqual(box.right + 0.5);
        expect(inner.bottom, `${n} ${kind} ${narrow}`).toBeLessThanOrEqual(box.bottom + 0.5);
        expect(inner.top, `${n} ${kind} ${narrow}`).toBeGreaterThanOrEqual(box.top - 0.5);
      }
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("Copy says Copy, copies the code of the tab shown and says so", async ({ page }) => {
  await ready(page);
  await expect(page.locator(`${P} [part="copy"]`)).toHaveText("Copy code");
  await tab(page, "react").click();
  await page.locator(`${P} [part="copy"]`).click();
  await expect(page.locator(`${P} .status`)).toHaveText("Copied");
  expect(await page.evaluate(() => window.__copied)).toEqual([await code(page)]);
  expect((await code(page)).includes("useEffect")).toBe(true);
  await expect(page.locator(`${P} .status`)).toHaveText("", { timeout: 5000 });
});

test("when the browser will not copy, the code is selected and the panel says to copy by hand", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("no"); } } }));
  await page.locator(`${P} [part="copy"]`).click();
  await expect(page.locator(`${P} .status`)).toHaveText("Select the code and copy it by hand.");
});

test("Open the embed page and Read the docs are links, and the first follows the choices", async ({ page }) => {
  await ready(page);
  const open = page.locator(`${P} [part="open"]`);
  const docs = page.locator(`${P} [part="docs"]`);
  await expect(open).toHaveText("Open the embed page");
  await expect(docs).toHaveText("Read the docs");
  await expect(docs).toHaveAttribute("href", /embed-panel\.md$/);
  await item(page, "ocean").click();
  await expect(open).toHaveAttribute("href", /color=ocean/);
  await page.locator("#ring-on").click();
  await expect(open).toHaveAttribute("href", /ring=1/);
});

test("the credit line is shown, and the two panels share nothing", async ({ page }) => {
  await ready(page);
  await expect(page.locator(`${P} [part="credits"]`)).toContainText("Credit: Badges drawn for this demo");
  await expect(page.locator(`${D} [part="credits"]`)).toBeHidden();
});

test("the picker: chips by group, a search box, and a click changes the code, the picture and the value", async ({ page }) => {
  await ready(page);
  await expect(page.locator(`${P} .chips button`)).toHaveText(["All", "Warm", "Cool", "Neutral"]);
  await expect(page.locator(`${P} [part="item"]`)).toHaveCount(14);
  await page.locator(`${P} .chips button[data-group="Cool"]`).click();
  await expect(page.locator(`${P} [part="item"]`)).toHaveCount(5);
  await page.locator(`${P} .chips button[data-group=""]`).click();
  await page.locator(`${P} [part="search"]`).fill("sl");
  await expect(page.locator(`${P} [part="item"]`)).toHaveText(["Slate"]);
  await page.locator(`${P} [part="search"]`).fill("zzz");
  await expect(page.locator(`${P} .none`)).toHaveText("Nothing matches");
  await page.locator(`${P} [part="search"]`).fill("");
  await page.evaluate(() => { window.heard = []; document.querySelector('[data-testid="panel"]').addEventListener("kazoku-embedchange", (e) => window.heard.push(e.detail.reason + ":" + e.detail.value)); });
  await item(page, "iris").click();
  expect(await code(page)).toContain('color="iris"');
  await expect(page.locator(`${P} demo-badge`)).toHaveAttribute("color", "iris");
  await expect(item(page, "iris")).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(P).evaluate((el) => el.value)).toBe("iris");
  await expect(page.locator(P)).toHaveAttribute("value", "iris");
  expect(await page.evaluate(() => window.heard)).toEqual(["pick:iris"]);
});

test("the page's own choice and button sit in the panel, and a change of the page's choice updates the code", async ({ page }) => {
  await ready(page);
  await expect(page.locator('[data-testid="own"]')).toBeVisible();
  await expect(page.locator('[data-testid="download"]')).toBeVisible();
  await page.locator("#ring-on").click();
  expect(await code(page)).toContain("ring");
  await expect(page.locator(`${P} demo-badge`)).toHaveAttribute("ring", "");
  await page.locator("#ring-off").click();
  expect(await code(page)).not.toContain("ring");
});

test("a package that draws nothing gets the tabs and Copy, with no picture and no size", async ({ page }) => {
  await ready(page);
  await expect(page.locator(`${D} [role="tab"]`)).toHaveText(["HTML", "ES module"]);
  await expect(page.locator(`${D} [part="preview"]`)).toBeHidden();
  await expect(page.locator(`${D} [part="size-button"]`).first()).toBeHidden();
  await expect(page.locator(`${D} [part="copy"]`)).toHaveText("Copy code");
  await expect(page.locator(`${D} [part="open"]`)).toBeHidden();
  await tab(page, "module", D).click();
  expect(await code(page, D)).toContain('import "@example/demo-data";');
});

test("the tab and the size are kept in the address, the start is not, and a page opened on one starts there", async ({ page }) => {
  await ready(page);
  await expect(page).not.toHaveURL(/embed=|size=/);
  await tab(page, "vue").click();
  await size(page, 240).click();
  await expect(page).toHaveURL(/embed=vue/);
  await expect(page).toHaveURL(/size=240/);
  await size(page, 320).click();
  await expect(page).not.toHaveURL(/size=/);
  await ready(page, "?embed=svelte&size=480&keep=1");
  await expect(tab(page, "svelte")).toHaveAttribute("aria-selected", "true");
  await expect(size(page, 480)).toHaveAttribute("aria-pressed", "true");
  expect(await code(page)).toContain("onMount");
  await tab(page, "html").click();
  await expect(page).toHaveURL(/keep=1/);
});

test("the words follow the language: Japanese labels, English back again", async ({ page }) => {
  await ready(page, "?lang=ja");
  await expect(page.locator(`${P} [part="copy"]`)).toHaveText("コードをコピー");
  await expect(page.locator(`${P} [part="open"]`)).toHaveText("埋め込みページを開く");
  await expect(page.locator(`${P} [part="docs"]`)).toHaveText("ドキュメントを読む");
  await expect(tab(page, "module")).toHaveText("ESモジュール");
  await expect(tab(page, "image")).toHaveText("画像のアドレス");
  await expect(page.locator(`${P} [part="title"]`)).toHaveText("自分のページに入れる");
  await expect(page.locator(`${P} [part="credits"]`)).toContainText("クレジット");
  await page.locator('[data-testid="language"] button', { hasText: "English" }).click();
  await expect(page.locator(`${P} [part="copy"]`)).toHaveText("Copy code");
});

for (const scheme of ["light", "dark"]) {
  test(`${scheme}: the code, the picture's box and the Copy button have their own colours and can be read`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await ready(page);
    const look = await page.locator(P).evaluate((host) => {
      const q = (sel) => host.shadowRoot.querySelector(sel);
      const s = (el) => getComputedStyle(el);
      const luminance = (css) => {
        const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      const copy = q('[part="copy"]');
      const pressed = q('[part="size-button"][aria-pressed="true"]');
      const code = q('[part="code"]');
      return { codeBg: s(code).backgroundColor, copyRatio: ratio(s(copy).color, s(copy).backgroundColor), pressedRatio: ratio(s(pressed).color, s(pressed).backgroundColor), codeRatio: ratio(s(code).color, s(code).backgroundColor), scheme: host.getAttribute("data-scheme") };
    });
    expect(look.scheme).toBe(scheme);
    expect(look.copyRatio).toBeGreaterThanOrEqual(4.5);
    expect(look.pressedRatio).toBeGreaterThanOrEqual(4.5);
    expect(look.codeRatio).toBeGreaterThanOrEqual(7);
    expect(luminanceOf(look.codeBg) > 0.5).toBe(scheme === "light");
  });
}
const luminanceOf = (css) => { const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

test("properties set before the tag is defined still reach the panel", async ({ page }) => {
  await page.goto("/embed-panel.html");
  await expect(page.locator(`${P} [part="copy"]`)).toBeVisible();
  const text = await page.evaluate(async () => {
    const holder = document.createElement("div");
    document.body.append(holder);
    holder.innerHTML = "<kazoku-embed-panel-later></kazoku-embed-panel-later>";
    const early = holder.firstElementChild;
    early.generate = ({ kind }) => `kind is ${kind}`;
    const { EmbedPanelElement } = await import("./dist/embed-panel/element.js");
    class Later extends EmbedPanelElement {}
    customElements.define("kazoku-embed-panel-later", Later);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return early.shadowRoot.querySelector('[part="code"]').textContent;
  });
  expect(text).toBe("kind is html");
});

test("the panel asks for no frame at rest and never more than one at a time, whatever is pressed", async ({ page }) => {
  await page.addInitScript(COUNT_SCRIPT);
  await ready(page);
  await page.waitForTimeout(600);
  const before = await readCounts(page);
  await page.waitForTimeout(1500);
  const rest = await readCounts(page);
  expect(rest.rafRequests - before.rafRequests).toBe(0);
  for (const n of [160, 480, 240, 320]) {
    await size(page, n).click();
    await tab(page, n === 480 ? "iframe" : "html").click();
    await item(page, n === 160 ? "ocean" : "ember").click();
  }
  await page.waitForTimeout(600);
  const after = await readCounts(page);
  expect(after.rafRequests - after.rafCallbacks).toBeLessThanOrEqual(1);
  const settled = await readCounts(page);
  await page.waitForTimeout(1200);
  expect((await readCounts(page)).rafRequests - settled.rafRequests).toBe(0);
});
