import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The page frame on every page of the demo, in a real browser at a phone's width and a desk's: the header line with Home and Sheets, the credit line, the title, English and Japanese,
// light and dark, no sideways scroll, and the embed page's small credit line.
const PAGES = readdirSync(new URL("../demo/", import.meta.url)).filter((name) => name.endsWith(".html") && name !== "embed.html");
const header = (page) => page.locator("kazoku-page-header");
/** The page's own credit line (a page may show others as examples). */
const credits = (page) => page.getByTestId("page-credits");
const ready = async (page, path) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`/${path}`);
  await expect(header(page)).toBeVisible();
  return errors;
};

/** The contrast ratio of two rgb() colours, as WCAG reckons it. */
const contrast = (a, b) => {
  const luminance = (rgb) => {
    const [r, g, bl] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const name of PAGES) {
  test(`${name}: says what it is, goes home and to the sheets, credits its data, with no sideways scroll`, async ({ page }) => {
    const errors = await ready(page, name);
    const line = header(page).locator(".line");
    await expect(line).toContainText("Kazoku UI");
    await expect(line).toHaveText(/Kazoku UI: \S/);
    await expect(header(page).locator("a", { hasText: "Home" })).toHaveAttribute("href", "index.html");
    await expect(header(page).locator("a", { hasText: "Printable sheets" })).toHaveAttribute("href", "print.html");
    await expect(page).toHaveTitle(/^Kazoku UI: \S/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toMatch(/\S{3,} \S+ \S+ \S+/);
    // The header is in the first screen. The credit line is visible once the page is scrolled to it, in no fold, and says something.
    const top = await header(page).evaluate((el) => el.getBoundingClientRect().bottom);
    expect(top, "the header is in the first screen").toBeLessThan(page.viewportSize().height);
    await credits(page).scrollIntoViewIfNeeded();
    await expect(credits(page)).toBeVisible();
    await expect(credits(page).locator(".box")).toContainText(/MIT/);
    expect(await credits(page).evaluate((el) => el.closest("details") === null)).toBe(true);
    // Home is the current page on the home page; the Sheets link is on the sheets page.
    const current = await header(page).locator('a[aria-current="page"]').allTextContents();
    expect(current).toEqual(name === "index.html" ? ["Home"] : name === "print.html" ? ["Printable sheets"] : []);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no sideways scroll").toBe(true);
    expect(errors).toEqual([]);
  });
}

test("the header is one row of the page's top bar, not a bar of its own", async ({ page }) => {
  await ready(page, "index.html");
  const rows = await page.evaluate(() => {
    const top = document.querySelector("header.top").getBoundingClientRect();
    const frame = document.querySelector("kazoku-page-header");
    const r = frame.getBoundingClientRect();
    return { inside: frame.parentElement === document.querySelector("header.top"), contained: r.top >= top.top - 1 && r.bottom <= top.bottom + 1, background: getComputedStyle(frame).backgroundColor, border: getComputedStyle(frame).borderTopWidth };
  });
  expect(rows.inside).toBe(true);
  expect(rows.contained).toBe(true);
  expect(rows.background).toBe("rgba(0, 0, 0, 0)");
  expect(rows.border).toBe("0px");
});

test("Japanese: the picker changes the header, the credits and the title; English brings them back", async ({ page }) => {
  await ready(page, "address.html");
  await expect(page).toHaveTitle("Kazoku UI: choices in the address");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(header(page).locator(".line")).toHaveText("Kazoku UI：アドレスに残す選択");
  await expect(header(page).locator("a", { hasText: "ホーム" })).toHaveAttribute("href", "index.html");
  await expect(header(page).locator("a", { hasText: "印刷用シート" })).toHaveAttribute("href", "print.html");
  await expect(credits(page).locator(".box")).toContainText("MITライセンス");
  await expect(page).toHaveTitle("Kazoku UI：アドレスに残す選択");
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toContain("ページのアドレス");
  expect(await header(page).evaluate((el) => el.shadowRoot.querySelector(".bar").getAttribute("lang"))).toBe("ja");
  await page.locator('kazoku-language-picker button[data-v="en"]').click();
  await expect(header(page).locator(".line")).toHaveText("Kazoku UI: choices in the address");
  await expect(page).toHaveTitle("Kazoku UI: choices in the address");
  await expect(credits(page).locator(".box")).toContainText("MIT-licensed");
});

for (const scheme of ["light", "dark"]) {
  test(`${scheme}: the header line, the links and the credit line are readable`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await ready(page, "page-frame.html");
    const ratios = await page.evaluate(() => {
      const colour = (el) => getComputedStyle(el).color;
      const bg = getComputedStyle(document.body).backgroundColor;
      const of = (host, selector) => host.shadowRoot.querySelector(selector);
      const sheets = of(document.querySelector("kazoku-page-header"), "a");
      const pill = getComputedStyle(sheets).backgroundColor;
      const credits = document.querySelectorAll("kazoku-page-credits");
      const embed = [...credits].find((el) => el.hasAttribute("embed"));
      return { bg, line: colour(of(document.querySelector("kazoku-page-header"), ".line")), link: colour(sheets), pill, credit: colour(of(credits[0], "p")), embed: colour(embed), embedSize: getComputedStyle(embed).fontSize, creditSize: getComputedStyle(credits[0]).fontSize };
    });
    expect(contrast(ratios.line, ratios.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(ratios.link, ratios.pill)).toBeGreaterThanOrEqual(7);
    expect(contrast(ratios.credit, ratios.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(ratios.embed, ratios.bg), "the embed form's colour is dark, not a pale grey").toBeGreaterThanOrEqual(7);
    expect(parseFloat(ratios.creditSize)).toBeGreaterThanOrEqual(15);
    expect(parseFloat(ratios.embedSize), "even the small form is 13 px or more").toBeGreaterThanOrEqual(13);
  });
}

test("the keyboard reaches Home and Sheets, shows where it is, and Enter follows the link", async ({ page, browserName }) => {
  // Safari and WebKit do not put links in the Tab order unless the reader turns that on (Option-Tab), so the Tab walk is Chromium's to prove.
  test.skip(browserName === "webkit", "WebKit leaves links out of the Tab order by default");
  await ready(page, "address.html");
  const focused = () => page.evaluate(() => { const host = document.activeElement; const inner = host?.shadowRoot?.activeElement; return { host: host?.localName, text: inner?.textContent ?? "", outline: inner ? getComputedStyle(inner).outlineStyle : "" }; });
  let seen;
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    seen = await focused();
    if (seen.host === "kazoku-page-header") break;
  }
  expect(seen).toMatchObject({ host: "kazoku-page-header", text: "Home", outline: "solid" });
  await page.keyboard.press("Tab");
  expect(await focused()).toMatchObject({ host: "kazoku-page-header", text: "Printable sheets" });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/print\.html$/);
});

test("a screen reader finds the credits as a named region and the links as a named navigation", async ({ page }) => {
  await ready(page, "address.html");
  await expect(page.getByRole("region", { name: "Data and credits" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "This site" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
});

test("the credit line in its three forms", async ({ page }) => {
  await ready(page, "page-frame.html");
  const [line, both, embed] = ["line", "both", "embed"].map((id) => page.locator(`#${id}`));
  await expect(line.locator(".lead")).toHaveText("Data and credits:");
  await expect(line.locator("a")).toHaveCount(0);
  await expect(both.locator("a")).toHaveText("Data and credits");
  await expect(both.locator(".lead")).toHaveCount(0);
  await expect(embed.locator(".lead")).toHaveCount(0);
  await expect(embed.locator("a")).toHaveCSS("text-decoration-line", "underline");
  // in someone else's frame the credits open in a tab of their own, not in the frame; on the package's own page they open in place
  await expect(embed.locator("a")).toHaveAttribute("target", "_blank");
  await expect(embed.locator("a")).toHaveAttribute("rel", "noopener");
  await expect(both.locator("a")).not.toHaveAttribute("target", /.*/);
  await page.context().route("https://github.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<title>credits</title>" }));
  const [tab] = await Promise.all([page.context().waitForEvent("page"), embed.locator("a").click()]);
  await tab.close();
  expect(new URL(page.url()).pathname, "the page itself stayed where it was").toMatch(/page-frame\.html$/);
  const sizes = await page.evaluate(() => ["line", "embed"].map((id) => parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));
  expect(sizes[1]).toBeLessThan(sizes[0]);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(line.locator(".lead")).toHaveText("データと出典：");
  await expect(page.locator("#meta")).toContainText("このページの今のタイトル：Kazoku UI：ページの見出しとクレジット");
});

test("the embed page carries the credit line only, small, and fits a small frame", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 240 });
  await page.goto("/embed.html?color=ocean");
  await expect(credits(page)).toBeVisible();
  await expect(header(page)).toHaveCount(0);
  await expect(credits(page)).toHaveAttribute("embed", "");
  await expect(credits(page).locator(".box")).toContainText("Drawn by the Kazoku UI demo");
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("kazoku-page-credits")).fontSize))).toBeGreaterThanOrEqual(13);
  // The badge is drawn at its own 320 px, so the page may be wider than a small frame; the credit line must still fit inside it.
  expect(await credits(page).evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && el.shadowRoot.querySelector(".box").scrollWidth <= r.width; })).toBe(true);
});

test("a credit line in pieces links its licence and its source, by property or by attribute, in either language, and never an unsafe address", async ({ page }) => {
  await ready(page, "page-frame.html");
  const embed = page.locator("kazoku-page-credits#embed");
  await embed.evaluate((element) => {
    element.credits = {
      en: ["Flag: ", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }, ", ", { text: "a trick", href: "data:text/html,x" }],
      ja: ["旗：", { text: "CC BY 2.5", href: "https://creativecommons.org/licenses/by/2.5/" }],
    };
  });
  const links = embed.locator('[part="credit-link"]');
  await expect(links).toHaveText(["CC BY 2.5"]);
  await expect(links).toHaveAttribute("href", "https://creativecommons.org/licenses/by/2.5/");
  await expect(links).toHaveAttribute("target", "_blank");
  await expect(links).toHaveAttribute("rel", "noopener noreferrer");
  await expect(embed.locator('[part="text"]')).toContainText("a trick");
  await page.evaluate(() => {
    document.documentElement.lang = "ja";
  });
  await expect(embed.locator('[part="text"]')).toContainText("旗：CC BY 2.5");
  // the attribute form, for a page a build writes
  const line = page.locator("kazoku-page-credits#line");
  await line.evaluate((element) => {
    element.setAttribute("credit-parts", JSON.stringify(["Stars: ", { text: "Yale", href: "https://example.org/yale" }, " ", { text: "x", href: "vbscript:msgbox(1)" }]));
    element.setAttribute("credit-parts-ja", JSON.stringify(["星：", { text: "イェール", href: "https://example.org/yale" }]));
  });
  await expect(line.locator('[part="credit-link"]')).toHaveText(["イェール"]);
  await page.evaluate(() => {
    document.documentElement.lang = "en";
  });
  await expect(line.locator('[part="credit-link"]')).toHaveText(["Yale"]);
  await expect(line.locator('[part="text"]')).toContainText("Stars: Yale x");
});
