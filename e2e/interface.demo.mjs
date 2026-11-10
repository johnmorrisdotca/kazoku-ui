import { expect, test } from "@playwright/test";

// The interface parts in a real browser, at a phone's width and a desk's: each part's keyboard, its names for a screen reader, its sizes, English and Japanese, and no sideways scroll.
const PAGES = ["interface.html", "interface-parts.html", "interface-page.html"];
const phone = (page) => page.viewportSize().width <= 640;
const ready = async (page, path) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`/${path}`);
  await page.waitForFunction(() => customElements.get("kazoku-control-bar") !== undefined);
  return errors;
};
const box = async (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; });
const lang = (page, code) => page.locator(`kazoku-language-picker button[data-v="${code}"]`).click();

for (const name of PAGES) {
  test(`${name}: no errors, no sideways scroll, in English and in Japanese`, async ({ page }) => {
    const errors = await ready(page, name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no sideways scroll").toBe(true);
    await lang(page, "ja");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no sideways scroll in Japanese").toBe(true);
    expect(errors).toEqual([]);
  });
}

test("icon button: a real button with a name, 44 px, a toggle that says so, and the keyboard", async ({ page }) => {
  await ready(page, "interface-parts.html#icon");
  const names = ["slower", "play", "pause", "faster", "now", "place", "layers", "look", "flight", "close", "search", "menu"];
  for (const name of names) {
    const button = page.getByTestId(`icon-${name}`).locator("button");
    await expect(button).toHaveAttribute("aria-label", /\S/);
    const size = await box(button);
    expect(size.w).toBeGreaterThanOrEqual(44);
    expect(size.h).toBeGreaterThanOrEqual(44);
  }
  const toggle = page.getByTestId("toggle").locator("button");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("toggle-on").locator("button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("disabled").locator("button")).toBeDisabled();
  // The icon is 18 px on a desk and 20 on a phone, stroked 1.75.
  const icon = await page.getByTestId("icon-play").locator("svg").evaluate((svg) => ({ w: svg.getBoundingClientRect().width, stroke: svg.getAttribute("stroke-width"), cap: svg.getAttribute("stroke-linecap") }));
  expect(icon).toEqual({ w: phone(page) ? 20 : 18, stroke: "1.75", cap: "round" });
  // Keyboard: focus it, press Enter, a click comes out of the tag.
  await page.evaluate(() => { window.__clicks = 0; document.querySelector('[data-testid="icon-play"]').addEventListener("click", () => (window.__clicks += 1)); });
  await page.getByTestId("icon-play").locator("button").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.__clicks)).toBe(2);
  // Japanese names.
  await lang(page, "ja");
  await expect(page.getByTestId("icon-play").locator("button")).toHaveAttribute("aria-label", "再生");
});

test("control bar: the design's order, the clock's two lines, the keyboard, the picker", async ({ page }) => {
  await ready(page, "interface-parts.html#bar");
  const bar = page.getByTestId("bar");
  const labels = await bar.locator("kazoku-icon-button").evaluateAll((els) => els.map((el) => el.shadowRoot.querySelector("button").getAttribute("aria-label")));
  expect(labels.map((label) => label.split(":")[0])).toEqual(["Slower", "Pause", "Faster", "Back to now", "Your place", "Layers", "Look", "Free flight"]);
  expect(await bar.locator(".clock").evaluate((el) => el.nextElementSibling.localName)).toBe("kazoku-icon-button");
  expect(await bar.locator(".divider").count()).toBe(phone(page) ? 1 : 1);
  // The clock: the moment, then the speed in plain words, both in mono.
  await expect(bar.locator(".clock .t")).toHaveText(/^\d{1,2} [A-Z][a-z]{2} \d{4} · \d\d:\d\d [A-Z]{2,5}$/);
  await expect(bar.locator(".clock .s")).toHaveText("1 hour each second");
  expect(await bar.locator(".clock .t").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Plex Mono/);
  // A view that cannot do one leaves it out and the rest keep their order.
  const small = await page.getByTestId("bar-small").locator("kazoku-icon-button").evaluateAll((els) => els.map((el) => el.dataset.act));
  expect(small).toEqual(["slower", "play", "faster", "now", "layers", "look"]);
  // Keyboard: Faster, then Slower twice; Play pauses and says so.
  await bar.locator('kazoku-icon-button[data-act="faster"] button').focus();
  await page.keyboard.press("Enter");
  await expect(bar.locator(".clock .s")).toHaveText("1 day each second");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(bar.locator(".clock .s")).toHaveText("Paused");
  await expect(bar.locator('kazoku-icon-button[data-act="play"] button')).toHaveAttribute("aria-label", "Play");
  await page.keyboard.press("Enter");
  await expect(bar.locator('kazoku-icon-button[data-act="play"] button')).toHaveAttribute("aria-label", "Pause");
  await page.keyboard.press("Enter");
  await expect(bar.locator(".clock .s")).toHaveText("Paused");
  // Layers and Free flight are toggles that say so.
  await bar.locator('kazoku-icon-button[data-act="layers"] button').click();
  await expect(bar.locator('kazoku-icon-button[data-act="layers"] button')).toHaveAttribute("aria-expanded", "true");
  await bar.locator('kazoku-icon-button[data-act="flight"] button').click();
  await expect(bar.locator('kazoku-icon-button[data-act="flight"] button')).toHaveAttribute("aria-pressed", "true");
  await bar.locator('kazoku-icon-button[data-act="look"] button').click();
  await expect(page.getByTestId("last")).toContainText('"value":"realistic"');
  // The picker: opens on the clock, takes focus, Escape closes and gives focus back; Set moves the clock.
  const clock = bar.locator(".clock");
  await clock.click();
  await expect(bar.locator(".picker")).toBeVisible();
  await expect(bar.locator('input[type="datetime-local"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(bar.locator(".picker")).toBeHidden();
  await expect(clock).toBeFocused();
  await clock.click();
  await bar.locator('input[type="datetime-local"]').fill("2030-03-04T05:06");
  await bar.locator("[data-set]").click();
  await expect(clock.locator(".t")).toHaveText(/^4 Mar 2030 · 05:06 [A-Z]{2,5}$/);
  await bar.locator('kazoku-icon-button[data-act="now"] button').click();
  await expect(clock.locator(".t")).not.toHaveText(/2030/);
  // No overflow of the bar itself.
  const size = await box(bar);
  expect(size.r).toBeLessThanOrEqual(page.viewportSize().width + 1);
  // Japanese.
  await lang(page, "ja");
  await expect(clock.locator(".s")).toHaveText("停止中");
  await expect(clock.locator(".t")).toHaveText(/年\d+月\d+日 · \d\d:\d\d \S+$/);
});

test("control bar on a phone: full width, 116 px, the clock on one line over a row of buttons", async ({ page }) => {
  test.skip(!phone(page), "a phone's layout");
  await ready(page, "interface.html");
  const bar = page.getByTestId("bar");
  const size = await box(bar);
  expect(size.w).toBeCloseTo(page.viewportSize().width, 0);
  expect(size.h).toBeGreaterThanOrEqual(116);
  expect(size.h).toBeLessThan(140);
  const rows = await bar.evaluate((el) => { const items = [...el.shadowRoot.querySelectorAll(".bar > *")].filter((x) => x.localName === "kazoku-icon-button").map((x) => Math.round(x.getBoundingClientRect().top)); const clock = el.shadowRoot.querySelector(".clock").getBoundingClientRect(); return { distinct: new Set(items).size, below: items.every((top) => top >= clock.bottom - 1), lines: Math.round(clock.height) }; });
  expect(rows.distinct).toBe(1);
  expect(rows.below).toBe(true);
  expect(rows.lines).toBeLessThanOrEqual(44);
});

test("scale switch: five steps in order, one current, the keyboard", async ({ page }) => {
  await ready(page, "interface-parts.html#scale");
  const scale = page.getByTestId("scale");
  await expect(scale.locator("button")).toHaveText(["Surface", "Moons", "Solar system", "Stars", "Galaxy"]);
  await expect(scale.locator('button[aria-pressed="true"]')).toHaveText("Moons");
  for (const button of await scale.locator("button").all()) expect((await box(button)).h).toBeGreaterThanOrEqual(44);
  await scale.locator("button", { hasText: "Stars" }).focus();
  await page.keyboard.press("Enter");
  await expect(scale.locator('button[aria-pressed="true"]')).toHaveText("Stars");
  await expect(scale.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.getByTestId("last")).toContainText('"value":"stars"');
  if (!phone(page)) {
    const mark = await scale.locator('button[aria-pressed="true"]').evaluate((el) => { const s = getComputedStyle(el, "::before"); return { w: s.width, c: s.backgroundColor }; });
    expect(mark).toEqual({ w: "2px", c: "rgb(242, 184, 75)" });
    expect((await box(scale.locator(".group"))).w).toBeCloseTo(148, 0);
  } else {
    expect(await scale.locator('button[aria-pressed="true"] .pill').evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgb(242, 184, 75)");
    expect(await scale.locator(".group").evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
  }
  await lang(page, "ja");
  await expect(scale.locator("button")).toHaveText(["地表", "衛星", "太陽系", "恒星", "銀河"]);
});

test("object card: one layout, every number a link to its source, a computed value never blank, buttons filled first", async ({ page }) => {
  await ready(page, "interface-parts.html#card");
  await page.locator("#t-card").click();
  const card = page.getByTestId("card");
  await expect(card.locator('[part="kind"]')).toHaveText("Planet · gas giant");
  await expect(card.locator('[part="name"]')).toContainText("Jupiter");
  await expect(card.locator('[part="name"] [lang="ja"]')).toHaveText("木星");
  const stats = card.locator('[part="stat"]');
  expect(await stats.count()).toBeGreaterThanOrEqual(4);
  for (const stat of await stats.all()) {
    await expect(stat.locator("dd a")).toHaveAttribute("href", /^https:\/\//);
    expect((await stat.locator("dd").innerText()).trim()).not.toBe("");
    expect(await stat.locator("dd").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Plex Mono/);
  }
  await expect(card.locator('[data-computed] a')).toHaveText(/^\d+(\.\d+)? ?AU$/);
  await expect(card.locator(".note")).toContainText("Every number links to its source");
  // A very large number is "1.898 × 10²⁷" with a real superscript, never "1.898e27".
  const mass = card.locator("dd").filter({ hasText: "kg" });
  await expect(mass).toContainText("1.898 × 10");
  expect(await mass.locator("sup").textContent()).toBe("27");
  expect(await mass.locator("sup").evaluate((el) => getComputedStyle(el).verticalAlign)).toBe("super");
  expect(await mass.locator("a").getAttribute("aria-label")).toMatch(/1\.898 × 10²⁷ kg/);
  expect(await card.locator(".stats").innerText()).not.toMatch(/\d[eE][+-]?\d/);
  const buttons = card.locator("kazoku-button");
  await expect(buttons).toHaveCount(2);
  await expect(buttons.first()).toHaveAttribute("variant", "filled");
  await expect(buttons.nth(1)).not.toHaveAttribute("variant", "filled");
  for (const one of await buttons.all()) expect((await box(one)).h).toBeGreaterThanOrEqual(44);
  const columns = await card.locator(".stats").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(phone(page) ? 3 : 2);
  // The keyboard reaches the close button and Enter closes the card.
  await card.locator("kazoku-icon-button.close button").focus();
  await page.keyboard.press("Enter");
  await expect(card).toBeHidden();
  await lang(page, "ja");
  await page.evaluate(() => { const c = document.getElementById("card"); c.data = { ...c.data }; });
  await expect(card.locator('[part="kind"]')).toHaveText("惑星・ガス惑星");
  await expect(card.locator("kazoku-button").first()).toHaveText("ページを開く");
});

test("object card on a phone is a sheet that rises from above the control bar, with a handle", async ({ page }) => {
  test.skip(!phone(page), "a phone's layout");
  await ready(page, "interface.html");
  const card = await box(page.getByTestId("card"));
  const bar = await box(page.getByTestId("bar"));
  expect(card.b).toBeLessThanOrEqual(bar.y + 1);
  expect(card.b).toBeGreaterThan(bar.y - 12);
  expect(card.w).toBeCloseTo(page.viewportSize().width, 0);
  expect(await page.getByTestId("card").locator(".grab").evaluate((el) => getComputedStyle(el).display)).toBe("block");
  const radius = await page.getByTestId("card").locator(".card").evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(radius).toBe("16px");
});

test("layers panel: real checkboxes with labels, in two columns, and the data door's outside sources", async ({ page }) => {
  await ready(page, "interface-parts.html#layers");
  await page.locator("#t-layers").click();
  const panel = page.getByTestId("layers");
  const boxes = panel.locator('.grid:not(.one) input[type="checkbox"]');
  await expect(boxes).toHaveCount(6);
  await expect(panel.locator("label").first()).toContainText("Orbits");
  expect(await panel.locator(".grid:not(.one)").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
  expect(await boxes.first().evaluate((el) => getComputedStyle(el).accentColor)).toBe("rgb(242, 184, 75)");
  await boxes.nth(3).check();
  await boxes.nth(0).uncheck();
  await panel.locator('.grid:not(.one) input[type="checkbox"]').nth(2).focus();
  await page.keyboard.press("Space");
  await expect(boxes.nth(2)).not.toBeChecked();
  // The sources: outside ones only, each with its licence and the terms spelled out.
  const sources = panel.locator(".grid.one li");
  await expect(sources).toHaveCount(2);
  await expect(sources.nth(1)).toContainText("CC BY-NC 3.0 IGO (non-commercial)");
  await expect(panel.locator("label", { hasText: "Yale" })).toHaveCount(0);
  const events = await page.evaluate(() => new Promise((resolve) => { const seen = []; const panel = document.querySelector('[data-testid="layers"]'); panel.addEventListener("kazoku-layerchange", (e) => { seen.push(e.detail); if (seen.length === 1) resolve(seen); }); panel.shadowRoot.querySelector('.grid.one input').click(); }));
  expect(events).toEqual([{ kind: "source", id: "example-faint", checked: false }]);
  expect((await box(panel.locator(".box"))).w).toBeLessThanOrEqual(phone(page) ? page.viewportSize().width : 321);
});

test("layers panel on the view opens from the Layers button and switching a source off drops its credit", async ({ page }) => {
  await ready(page, "interface.html");
  const layers = page.getByTestId("layers");
  await expect(layers).toBeHidden();
  await page.getByTestId("bar").locator('kazoku-icon-button[data-act="layers"] button').click();
  await expect(layers).toBeVisible();
  const bar = await box(page.getByTestId("bar"));
  const panel = await box(layers);
  expect(panel.b).toBeLessThanOrEqual(bar.y + 1);
  await layers.locator('.grid.one input').nth(1).uncheck();
  await expect(page.getByTestId("last")).toContainText('"id":"example-survey"');
  await page.getByTestId("bar").locator('kazoku-icon-button[data-act="layers"] button').click();
  await expect(layers).toBeHidden();
});

test("segmented switch: aria-pressed, the language one changes the page's language, the culture one reports", async ({ page }) => {
  await ready(page, "interface.html");
  const top = page.getByTestId("top-bar");
  const language = top.locator('kazoku-segmented-switch[kind="language"]');
  await expect(language.locator("button")).toHaveText(["EN", "日本語"]);
  await expect(language.locator('button[aria-pressed="true"]')).toHaveText("EN");
  await language.locator("button", { hasText: "日本語" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(language.locator('button[aria-pressed="true"]')).toHaveText("日本語");
  await expect(page.getByTestId("card").locator('[part="kind"]')).toHaveText("惑星・ガス惑星");
  const culture = top.locator('kazoku-segmented-switch[kind="culture"]');
  await expect(culture.locator("button")).toHaveText(["西洋", "日本", "中国"]);
  await culture.locator("button", { hasText: "日本" }).focus();
  await page.keyboard.press("Enter");
  await expect(culture.locator('button[aria-pressed="true"]')).toHaveText("日本");
  await expect(page.getByTestId("last")).toContainText('"action":"culture","value":"japanese"');
  for (const button of await culture.locator("button").all()) expect((await box(button)).h).toBeGreaterThanOrEqual(phone(page) ? 44 : 40);
  // The culture switch is in the bar, not inside a menu.
  expect(await culture.evaluate((el) => el.closest('[part="menu"], .dropdown') === null)).toBe(true);
  await expect(culture).toBeVisible();
});

test("buttons: one filled button a screen, outlined for the rest, a link or a button, 44 to 48 px", async ({ page }) => {
  await ready(page, "interface-parts.html#buttons");
  await page.locator("#t-buttons").click();
  const filled = page.getByTestId("b-filled");
  const outlined = page.getByTestId("b-outlined");
  expect(await page.evaluate(() => document.querySelectorAll('#p-buttons kazoku-button[variant="filled"]').length)).toBe(1);
  expect(await filled.locator(".b").evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, tag: el.localName }))).toEqual({ bg: "rgb(242, 184, 75)", color: "rgb(20, 20, 19)", tag: "a" });
  expect(await outlined.locator(".b").evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgb(58, 72, 96)");
  const height = (await box(filled)).h;
  expect(height).toBeGreaterThanOrEqual(44);
  expect(height).toBeLessThanOrEqual(48);
  expect(await page.getByTestId("b-disabled").locator(".b").evaluate((el) => ({ tag: el.localName, disabled: el.disabled }))).toEqual({ tag: "button", disabled: true });
  // A second filled button in one screen says so.
  const warned = await page.evaluate(() => new Promise((resolve) => { const warn = console.warn; console.warn = (text) => { console.warn = warn; resolve(String(text)); }; const second = document.createElement("kazoku-button"); second.setAttribute("variant", "filled"); document.getElementById("p-buttons").append(second); }));
  expect(warned).toMatch(/more than one filled button/);
  // The whole view page has exactly one filled button in its own tree, in the card.
  await page.goto("/interface.html");
  await page.waitForFunction(() => customElements.get("kazoku-button") !== undefined);
  expect(await page.evaluate(() => document.querySelectorAll('kazoku-button[variant="filled"]').length)).toBe(0);
  expect(await page.getByTestId("card").locator('kazoku-button[variant="filled"]').count()).toBe(1);
});

test("top bar: the brand home, the trail, search with a slash, the menu on a phone, the right height", async ({ page }) => {
  await ready(page, "interface.html");
  const top = page.getByTestId("top-bar");
  await expect(top.locator(".brand")).toHaveAttribute("href", "index.html");
  await expect(top.locator(".brand")).toHaveText("Kazoku UI");
  await expect(top.locator(".trail")).toContainText("Solar system");
  await expect(top.locator('.trail [aria-current="page"]')).toContainText("Jupiter");
  expect(await top.locator(".trail [lang=ja]").textContent()).toBe("木星");
  const bar = await box(top.locator(".bar"));
  expect(bar.h).toBeCloseTo(phone(page) ? 56 : 64, 0);
  if (!phone(page)) {
    const field = top.locator('input[type="search"]');
    await expect(field).toBeVisible();
    await expect(top.locator("label.vh")).toHaveText("Search");
    await page.locator("body").click({ position: { x: 5, y: 400 } });
    await page.keyboard.press("/");
    await expect(field).toBeFocused();
    await field.fill("mars");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("last")).toContainText('"action":"search","value":"mars"');
    await expect(top.locator(".menu-button")).toBeHidden();
  } else {
    await expect(top.locator('input[type="search"]')).toBeHidden();
    await top.locator("kazoku-icon-button.opener button").click();
    await expect(top.locator('input[type="search"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(top.locator('input[type="search"]')).toBeHidden();
    await expect(top.locator("kazoku-icon-button.menu-button button")).toHaveAttribute("aria-label", "Menu");
    await top.locator("kazoku-icon-button.menu-button button").click();
    await expect(top.locator("kazoku-icon-button.menu-button button")).toHaveAttribute("aria-expanded", "true");
    // The culture switch is on a second line of the bar, not in the menu.
    expect((await box(top.locator('[part="culture"].sub'))).y).toBeGreaterThanOrEqual(bar.b - 1);
  }
});

test("footer: the view's quiet line and the reading page's footer, with the credits read from credits()", async ({ page }) => {
  await ready(page, "interface-parts.html#footer");
  await page.locator("#t-footer").click();
  const line = page.getByTestId("foot-view");
  await expect(line.locator(".line")).toContainText("Positions computed for the time shown");
  await expect(line.locator("a")).toHaveText("Data and credits");
  expect((await box(line.locator("a"))).h).toBeGreaterThanOrEqual(44);
  const foot = page.getByTestId("foot-page");
  await expect(foot.locator("li")).toHaveText([/Drawn with Kazoku UI/, /Sources for every number on this page: Data and credits/, "How to cite", "Sheets to print", "Home"]);
  await expect(foot.locator(".credits")).toContainText("Public domain");
  await expect(foot.locator(".credits")).toContainText("non-commercial");
  await lang(page, "ja");
  await expect(foot.locator("li").nth(2)).toHaveText("引用のしかた");
  await expect(line.locator(".line")).toContainText("位置は表示中の時刻で計算しています");
});

test("reading page: the picture beside the name, three tiles, the numbers with sources, related links, the footer", async ({ page }) => {
  const errors = await ready(page, "interface-page.html");
  const reading = page.getByTestId("reading");
  await expect(reading.locator("h1")).toContainText("Jupiter");
  await expect(reading.locator("h1 [lang=ja]")).toHaveText("木星");
  await expect(reading.locator(".hero kazoku-button").first()).toHaveAttribute("variant", "filled");
  await expect(reading.locator(".tile")).toHaveCount(3);
  await expect(reading.locator("h2").first()).toHaveText("Right now");
  const rows = reading.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThanOrEqual(5);
  for (const row of await rows.all()) await expect(row.locator("td.v a")).toHaveAttribute("href", /^https:\/\//);
  const width = (await box(reading.locator(".wrap"))).w;
  expect(width).toBeLessThanOrEqual(1120);
  if (phone(page)) {
    expect(await reading.locator(".hero").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
    expect(await reading.locator("th.c").evaluate((el) => getComputedStyle(el).display)).toBe("none");
    expect(await reading.locator(".tap").isVisible()).toBe(true);
    expect(await reading.locator("h1").evaluate((el) => getComputedStyle(el).fontSize)).toBe("40px");
  } else {
    expect(await reading.locator(".hero").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);
    expect(await reading.locator("h1").evaluate((el) => getComputedStyle(el).fontSize)).toBe("56px");
    await expect(reading.locator("th.c")).toBeVisible();
  }
  expect(await reading.locator("main").innerText()).not.toMatch(/\d[eE][+-]?\d/);
  await expect(reading.locator("td.v", { hasText: "kg" }).locator("sup")).toHaveText("27");
  await expect(reading.locator(".related a").first()).toBeVisible();
  await expect(page.getByTestId("footer").locator("li")).toHaveCount(5);
  await lang(page, "ja");
  await expect(reading.locator("h2").first()).toHaveText("いま");
  await expect(reading.locator(".hero kazoku-button").first()).toHaveText("宇宙で見る");
  expect(errors).toEqual([]);
});

test("reduced motion: the view opens still with Play ready; with motion it opens moving from now", async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "interface.html");
  await expect(page.getByTestId("bar").locator(".clock .s")).toHaveText("Paused");
  await expect(page.getByTestId("bar").locator('kazoku-icon-button[data-act="play"] button')).toHaveAttribute("aria-label", "Play");
  await expect(page.getByTestId("bar").locator('kazoku-icon-button[data-act="play"] button')).toBeEnabled();
  const moving = await browser.newPage({ viewport: page.viewportSize(), reducedMotion: "no-preference" });
  await ready(moving, "interface.html");
  await expect(moving.getByTestId("bar").locator(".clock .s")).toHaveText("1 hour each second");
  const first = await moving.getByTestId("bar").locator(".clock .t").textContent();
  await expect(moving.getByTestId("bar").locator(".clock .t")).not.toHaveText(first, { timeout: 6000 });
  await moving.close();
});

test("text on every part is readable: 4.5:1 or better, measured in the browser", async ({ page }) => {
  await ready(page, "interface.html");
  const ratios = await page.evaluate(() => {
    const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const pick = (host, selector) => host.shadowRoot.querySelector(selector);
    const card = document.querySelector('[data-testid="card"]');
    const bar = document.querySelector('[data-testid="bar"]');
    const scale = document.querySelector('[data-testid="scale"]');
    const panelBg = getComputedStyle(pick(card, ".card")).backgroundColor;
    return {
      name: ratio(getComputedStyle(pick(card, ".name")).color, panelBg),
      label: ratio(getComputedStyle(pick(card, ".label")).color, panelBg),
      value: ratio(getComputedStyle(pick(card, "dd a")).color, panelBg),
      clock: ratio(getComputedStyle(pick(bar, ".s")).color, getComputedStyle(pick(bar, ".bar")).backgroundColor),
      scale: ratio(getComputedStyle(pick(scale, "button")).color, getComputedStyle(pick(scale, ".group")).backgroundColor),
    };
  });
  for (const [what, ratio] of Object.entries(ratios)) expect(ratio, what).toBeGreaterThanOrEqual(4.5);
});

test("the tabs of the parts page: one part and its states on one screen, the arrow keys move between them", async ({ page }) => {
  await ready(page, "interface-parts.html");
  await expect(page.getByRole("tab")).toHaveCount(10);
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Colour and type");
  await page.getByRole("tab", { selected: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Icon button");
  await expect(page.locator('[role="tabpanel"]:not([hidden])')).toHaveCount(1);
  expect(await page.locator("details").count()).toBe(0);
});

for (const [timezoneId, name, other] of [["America/Denver", "MST", "GMT+9"], ["Asia/Tokyo", "GMT+9", "MST"], ["UTC", "UTC", "GMT+9"]]) {
  test.describe(`the time shown is the device's own: ${timezoneId}`, () => {
    test.use({ timezoneId });
    test(`the clock names ${name} and shows the local moment`, async ({ page }) => {
      await ready(page, "interface-parts.html#bar");
      const clock = page.getByTestId("bar").locator(".clock");
      await expect(clock.locator(".t")).toHaveText(new RegExp(` ${name.replace("+", "\\+")}$`));
      await expect(clock.locator(".t")).not.toHaveText(new RegExp(other.replace("+", "\\+")));
      // The picker takes and gives local time: a winter date, so Denver is MST and not MDT.
      await page.getByTestId("bar").locator('kazoku-icon-button[data-act="play"] button').click();
      await expect(clock.locator(".s")).toHaveText("Paused");
      await clock.click();
      await page.getByTestId("bar").locator('input[type="datetime-local"]').fill("2030-01-04T05:06");
      await page.getByTestId("bar").locator("[data-set]").click();
      await expect(clock.locator(".t")).toHaveText(`4 Jan 2030 · 05:06 ${name === "UTC" ? "UTC" : name}`);
      await lang(page, "ja");
      await expect(clock.locator(".t")).toHaveText(new RegExp(`^2030年1月4日 · 05:06 .+`));
    });
  });
}
