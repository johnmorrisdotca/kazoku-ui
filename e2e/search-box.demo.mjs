import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";

// The search box on demo/search-box.html: a reader types, narrows, moves with the keyboard, and picks. Every wait is on the page's state, never on a timer.
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const ready = async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search-box.html");
  await expect(page.locator("kazoku-search-box")).toBeVisible();
  return errors;
};
const box = (page) => page.locator("kazoku-search-box").locator("input");
const rows = (page) => page.locator("kazoku-search-box").locator("[role=row][data-i]");
const heads = (page) => page.locator("kazoku-search-box").locator("[role=rowheader]");
const chips = (page) => page.locator("kazoku-search-box").locator(".chips button");
const panel = (page) => page.locator("kazoku-search-box").locator(".panel");
const type = async (page, text) => {
  await box(page).fill(text);
  await expect(page.locator("#last")).toHaveText(new RegExp(`^${text}`));
  await expect(page.locator("kazoku-search-box").locator("#grid")).not.toHaveAttribute("aria-busy", "true");
};
const state = (page) => page.locator("kazoku-search-box").evaluate((el) => {
  const input = el.shadowRoot.querySelector("input");
  const target = el.shadowRoot.getElementById(input.getAttribute("aria-activedescendant") ?? "");
  // the box always names a gridcell: a row's text cell stands for the row, an action's cell for its button
  const button = target?.querySelector("button");
  const row = target?.closest("[role=row]");
  return { expanded: input.getAttribute("aria-expanded"), role: target?.getAttribute("role") ?? null, selected: target?.getAttribute("aria-selected") ?? null, active: target ? (button ? `button ${button.dataset.act}` : `row ${row.dataset.i}`) : null, pressed: button?.getAttribute("aria-pressed") ?? null };
});

test("typing shows each kind with its count, a few rows of each, and See all where there are more", async ({ page }) => {
  const errors = await ready(page);
  await type(page, "mar");
  await expect(heads(page)).toHaveText([/^Stars\s*1$/, /^Planets and moons\s*1$/, /^Craft\s*5$/, /^Places\s*4$/, /^Cities\s*4$/]);
  await expect(page.locator("kazoku-search-box").locator("#grid")).toHaveAttribute("role", "grid");
  await expect(page.locator("kazoku-search-box").locator("[role=rowgroup]").first()).toHaveAttribute("aria-label", "Stars 1");
  // three rows of Craft, then See all 5
  const craft = page.locator("kazoku-search-box").locator("[role=rowgroup]").nth(2);
  await expect(craft.locator("[role=row][data-i]")).toHaveCount(4);
  await expect(craft.locator("[data-kind=all]")).toHaveText("See all 5");
  await expect(craft.locator("mark").first()).toHaveText("Mar");
  // the combobox says what it controls, and the answer is announced politely
  await expect(box(page)).toHaveAttribute("role", "combobox");
  await expect(box(page)).toHaveAttribute("aria-haspopup", "grid");
  await expect(box(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("kazoku-search-box").locator("[role=status]")).toHaveText("15 results: Stars 1, Planets and moons 1, Craft 5, Places 4, Cities 4");
  expect(errors).toEqual([]);
});

test("the chips narrow to one kind and back, and are buttons with a pressed state", async ({ page }) => {
  await ready(page);
  await type(page, "mar");
  await expect(chips(page)).toHaveText(["All", "Stars1", "Planets and moons1", "Craft5", "Places4", "Cities4"]);
  await expect(chips(page).first()).toHaveAttribute("aria-pressed", "true");
  await chips(page).nth(3).click();
  await expect(page.locator("#last")).toHaveText("mar (craft)");
  await expect(chips(page).nth(3)).toHaveAttribute("aria-pressed", "true");
  await expect(chips(page).first()).toHaveAttribute("aria-pressed", "false");
  await expect(heads(page)).toHaveCount(1);
  await expect(rows(page)).toHaveCount(5);
  // the chips keep every kind's count while one is chosen
  await expect(chips(page)).toHaveCount(6);
  await chips(page).first().click();
  await expect(heads(page)).toHaveCount(5);
  // the box still has the keyboard through all of it
  await expect(box(page)).toBeFocused();
});

test("down arrow to a row and Enter does its first action, and the box lets go of the list", async ({ page }) => {
  await ready(page);
  await type(page, "mars");
  await expect(box(page)).toHaveAttribute("aria-expanded", "true");
  expect((await state(page)).active).toBeNull();
  await page.keyboard.press("ArrowDown");
  expect(await state(page)).toMatchObject({ active: "row 0", role: "gridcell", selected: "true" });
  await expect(rows(page).first()).toHaveAttribute("aria-selected", "true");
  await expect(rows(page).first()).toContainText("Mars");
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText("show planets/mars");
  await expect(panel(page)).toBeHidden();
  await expect(box(page)).toHaveValue("mars");
  await expect(box(page)).toBeFocused();
});

test("moving the active row does not draw the list again", async ({ page }) => {
  await ready(page);
  await type(page, "mar");
  const host = page.locator("kazoku-search-box");
  const before = await host.evaluate((el) => {
    window.__first = el.shadowRoot.querySelector("[role=row][data-i='0']");
    return el.drawCount;
  });
  // one answer, one draw: the source was called once for this query
  expect(before).toBeGreaterThan(0);
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  const after = await host.evaluate((el) => ({ draws: el.drawCount, same: el.shadowRoot.querySelector("[role=row][data-i='0']") === window.__first }));
  expect(after).toEqual({ draws: before, same: true });
});

test("a keystroke is one draw, however fast the typing", async ({ page }) => {
  await ready(page);
  const host = page.locator("kazoku-search-box");
  const start = await host.evaluate((el) => el.drawCount);
  await box(page).click();
  await page.keyboard.type("mars", { delay: 0 });
  await expect(page.locator("#last")).toHaveText("mars");
  await expect(page.locator("#calls")).toHaveText("1");
  await expect(heads(page).first()).toBeVisible();
  expect(await host.evaluate((el) => el.drawCount)).toBe(start + 1);
});

test("an older, slower answer never replaces a newer one", async ({ page }) => {
  await ready(page);
  await page.locator("#slow").click();
  await expect(page.locator("#slow")).toHaveAttribute("aria-pressed", "true");
  await box(page).fill("vega");
  await expect(page.locator("#last")).toHaveText("vega");
  // the slow answer for vega is on its way: the popup lies over the switch, so it is pressed from the page; then ask for something else
  await page.locator("#slow").evaluate((el) => el.click());
  await box(page).fill("mars");
  await expect(page.locator("#last")).toHaveText("mars");
  await expect(rows(page).first()).toContainText("Mars");
  // the slow answer comes back (the demo's source cannot stop it): the box still shows Mars, and no Vega
  await expect(page.locator("#answered")).toHaveText("2");
  await expect(rows(page).first()).toContainText("Mars");
  await expect(page.locator("kazoku-search-box").locator("[role=rowgroup]").filter({ hasText: "Vega" })).toHaveCount(0);
});

test("Right and Left move across a row's actions, Enter does the one it stands on, and Favourite toggles from the keyboard", async ({ page }) => {
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  const mars = rows(page).first();
  await expect(mars.locator("button")).toHaveText(["Show", "Go", "Favourite"]);
  await expect(mars.locator("button").nth(2)).toHaveAttribute("aria-pressed", "false");
  await expect(mars.locator("button").nth(2)).toHaveAccessibleName("Favourite Mars");
  await page.keyboard.press("ArrowRight");
  expect((await state(page)).active).toBe("button go");
  await page.keyboard.press("ArrowRight");
  expect(await state(page)).toMatchObject({ active: "button fav", pressed: "false" });
  // the end of the row: Right leaves the position where it is
  await page.keyboard.press("ArrowRight");
  expect((await state(page)).active).toBe("button fav");
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText("fav planets/mars on");
  await expect(page.locator("#favs")).toHaveText("planets:mars");
  expect(await state(page)).toMatchObject({ active: "button fav", pressed: "true" });
  // a toggle keeps the list open for the next one
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText("fav planets/mars off");
  await expect(page.locator("#favs")).toHaveText("none");
  expect((await state(page)).pressed).toBe("false");
  // Left walks back to the row, and a move to another row starts at its first action
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  expect((await state(page)).active).toBe("row 0");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  expect((await state(page)).active).toBe("row 1");
  // Home and End move the caret in the box, not the list
  await page.keyboard.press("Home");
  expect(await box(page).evaluate((el) => el.selectionStart)).toBe(0);
  await page.keyboard.press("End");
  expect(await box(page).evaluate((el) => el.selectionStart)).toBe(4);
  expect((await state(page)).active).toBe("row 1");
});

test("a press on an action or on a row does what a key does", async ({ page }) => {
  await ready(page);
  await type(page, "mars");
  await rows(page).first().locator("button").nth(1).click();
  await expect(page.locator("#picked")).toHaveText("go planets/mars");
  await box(page).fill("mars");
  await expect(rows(page).first()).toContainText("Mars");
  await rows(page).first().locator(".main").click();
  await expect(page.locator("#picked")).toHaveText("show planets/mars");
});

test("See all shows one kind's whole list in windows, and Show more draws the next window", async ({ page }) => {
  await ready(page);
  await type(page, "a");
  const cities = page.locator("kazoku-search-box").locator("[role=rowgroup]").filter({ has: page.locator("[role=rowheader]", { hasText: "Cities" }) });
  const total = Number((await cities.locator("[role=rowheader] .n").textContent()) ?? "0");
  expect(total).toBeGreaterThan(40);
  // the keyboard: up from the box wraps to the last row, which is Cities' See all
  await page.keyboard.press("ArrowUp");
  await expect(rows(page).last()).toHaveText(`See all ${total}`);
  await page.keyboard.press("Enter");
  await expect(page.locator("#last")).toHaveText("a (cities)");
  await expect(heads(page)).toHaveCount(1);
  await expect(rows(page)).toHaveCount(21);
  await expect(rows(page).last()).toHaveText("Show more");
  await expect(page.locator("kazoku-search-box").locator("[role=status]")).toHaveText(`Cities, ${total} results`);
  // only what is shown is drawn
  expect(await page.locator("kazoku-search-box").evaluate((el) => el.shadowRoot.querySelectorAll("*").length)).toBeLessThan(400);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(41);
  await expect(chips(page).filter({ hasText: "Cities" })).toHaveAttribute("aria-pressed", "true");
  // All brings the groups back
  await chips(page).first().click();
  await expect(heads(page)).toHaveCount(5);
});

test("Escape closes the popup, then clears the box", async ({ page }) => {
  await ready(page);
  await type(page, "mar");
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(box(page)).toHaveAttribute("aria-expanded", "false");
  await expect(box(page)).toHaveValue("mar");
  await page.keyboard.press("Escape");
  await expect(box(page)).toHaveValue("");
  // typing again brings the popup back
  await type(page, "ven");
  await expect(panel(page)).toBeVisible();
  // Down opens a closed popup again
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await page.keyboard.press("ArrowDown");
  await expect(panel(page)).toBeVisible();
  expect((await state(page)).active).toBe("row 0");
});

test("Tab reaches the kind chips, Enter on one keeps the focus there, and Escape from one closes the popup and returns to the box", async ({ page }) => {
  await ready(page);
  await type(page, "mar");
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
  await expect(chips(page).nth(3)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#last")).toHaveText("mar (craft)");
  await expect(rows(page)).toHaveCount(5);
  await expect(panel(page)).toBeVisible();
  await expect(chips(page).nth(3)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveAttribute("aria-expanded", "false");
});

test("an answer that arrives after Escape does not open the popup again", async ({ page }) => {
  await ready(page);
  await page.locator("#slow").click();
  await box(page).fill("vega");
  await expect(page.locator("#last")).toHaveText("vega");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(page.locator("#answered")).toHaveText("1");
  await expect(panel(page)).toBeHidden();
  await expect(box(page)).toHaveAttribute("aria-expanded", "false");
  // Down brings the answer back
  await page.keyboard.press("ArrowDown");
  await expect(panel(page)).toBeVisible();
});

test("the shortcut keys focus the box, and never take a key from another field", async ({ page }) => {
  await ready(page);
  await expect(box(page)).toHaveAttribute("aria-keyshortcuts", "/ Control+K Meta+K");
  await page.locator("h1").click();
  await page.keyboard.press("/");
  await expect(box(page)).toBeFocused();
  // typing a slash in the box is typing
  await page.keyboard.type("a/b");
  await expect(box(page)).toHaveValue("a/b");
  await box(page).fill("");
  // in another field, the slash is a slash and the box does not take the focus
  await page.locator("#other").focus();
  await page.keyboard.press("/");
  await expect(page.locator("#other")).toHaveValue("/");
  await expect(page.locator("#other")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.locator("#other")).toBeFocused();
  // out of any field, Control or Command and K comes back
  await page.locator("h1").click();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(box(page)).toBeFocused();
});

test("a disabled action is dimmed and described, and cannot be done by a key or a press", async ({ page }) => {
  await ready(page);
  await page.locator("kazoku-search-box").evaluate((el) => {
    window.__picks = 0;
    el.addEventListener("kazoku-search-pick", () => (window.__picks += 1));
  });
  await type(page, "mar");
  const places = page.locator("kazoku-search-box").locator("[role=rowgroup]").nth(3);
  const go = places.locator("button[data-act=go]").first();
  await expect(go).toHaveAttribute("aria-disabled", "true");
  await expect(go).toHaveAttribute("title", "Maps of places are not ready yet");
  await expect(go).toHaveAccessibleDescription("Maps of places are not ready yet");
  await expect(go).toHaveAccessibleName("Go Mare Imbrium");
  // a press does nothing
  await go.click({ force: true });
  await places.locator(".main").first().click({ force: true });
  await expect(page.locator("#picked")).toHaveText("nothing yet");
  // the keyboard reaches the row and hears why, and Enter does nothing
  await chips(page).nth(4).click();
  await expect(chips(page).nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(rows(page)).toHaveCount(4);
  await page.keyboard.press("ArrowDown");
  const active = await page.locator("kazoku-search-box").evaluate((el) => {
    const input = el.shadowRoot.querySelector("input");
    const cell = el.shadowRoot.getElementById(input.getAttribute("aria-activedescendant"));
    const why = el.shadowRoot.getElementById(cell.getAttribute("aria-describedby") ?? "");
    return { disabled: cell.getAttribute("aria-disabled"), why: why?.textContent ?? null };
  });
  expect(active).toEqual({ disabled: "true", why: "Maps of places are not ready yet" });
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  await expect(page.locator("#picked")).toHaveText("nothing yet");
  expect(await page.evaluate(() => window.__picks)).toBe(0);
  // an action that is not disabled still works, and has no aria-disabled
  await chips(page).first().click();
  const city = page.locator("kazoku-search-box").locator("[role=rowgroup]").nth(4).locator("button[data-act=go]").first();
  await expect(city).not.toHaveAttribute("aria-disabled", /.*/);
  await city.click();
  await expect(page.locator("#picked")).toHaveText(/^go cities\//);
});

test("the placeholder can be set by an attribute or a property, and the default is the word for Search", async ({ page }) => {
  await ready(page);
  await expect(box(page)).toHaveAttribute("placeholder", "Search");
  await page.locator("kazoku-search-box").evaluate((el) => el.setAttribute("placeholder", "Search stars, planets, craft, cities"));
  await expect(box(page)).toHaveAttribute("placeholder", "Search stars, planets, craft, cities");
  // the box's name is unchanged
  await expect(box(page)).toHaveAccessibleName("Search");
  expect(await page.locator("kazoku-search-box").evaluate((el) => el.placeholder)).toBe("Search stars, planets, craft, cities");
  await page.locator("kazoku-search-box").evaluate((el) => (el.placeholder = "Find a star"));
  await expect(box(page)).toHaveAttribute("placeholder", "Find a star");
  // a page's own words stay when the language changes
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(box(page)).toHaveAttribute("placeholder", "Find a star");
  // removing it brings the default back, in the language of the page
  await page.locator("kazoku-search-box").evaluate((el) => el.removeAttribute("placeholder"));
  await expect(box(page)).toHaveAttribute("placeholder", "検索");
});

test("a toggle's change is spoken through the live region, and the answer's count is spoken again after a new answer", async ({ page }) => {
  await ready(page);
  const status = page.locator("kazoku-search-box").locator("[role=status]");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Favourite Mars, on");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Favourite Mars, off");
  // a press says it too, and a plain action says nothing new
  await rows(page).first().locator("button").nth(2).click();
  await expect(status).toHaveText("Favourite Mars, on");
  await rows(page).first().locator("button").nth(1).click();
  await expect(page.locator("#picked")).toHaveText("go planets/mars");
  await expect(status).toHaveText("Favourite Mars, on");
  // in Japanese
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await type(page, "火星");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText(/^お気に入り 火星、オ[ンフ]$/);
});

test("the words are Japanese when the page is, and the count is said in Japanese", async ({ page }) => {
  await ready(page);
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(box(page)).toHaveAttribute("placeholder", "検索");
  await type(page, "mars");
  await expect(rows(page).first()).toContainText("火星");
  await expect(rows(page).first().locator("button")).toHaveText(["表示", "移動", "お気に入り"]);
  await expect(page.locator("kazoku-search-box").locator("[role=status]")).toHaveText(/^\d+件：/);
  await type(page, "mar");
  await expect(page.locator("kazoku-search-box").locator("[data-kind=all]").first()).toHaveText("5件すべてを見る");
});

test("the popup fills the box's width, actions are touch-sized, and nothing makes the page scroll sideways", async ({ page }) => {
  await ready(page);
  await type(page, "mar");
  const sizes = await page.locator("kazoku-search-box").evaluate((el) => {
    const host = el.getBoundingClientRect();
    const panelBox = el.shadowRoot.querySelector(".panel").getBoundingClientRect();
    const small = [...el.shadowRoot.querySelectorAll(".row button, .chips button, .row[data-kind]")].filter((b) => b.getBoundingClientRect().height < 47.5).length;
    return { hostWidth: Math.round(host.width), panelWidth: Math.round(panelBox.width), small, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  expect(sizes.panelWidth).toBe(sizes.hostWidth);
  expect(sizes.small).toBe(0);
  expect(sizes.overflow).toBe(false);
});

test("the open popup, with a row and an action active, has no accessibility violations in light or dark", async ({ page }) => {
  await ready(page);
  await page.addScriptTag({ path: axePath });
  await type(page, "mar");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  // the Places rows carry a disabled, described action, so the pass covers it
  await expect(page.locator("kazoku-search-box").locator("button[aria-disabled=true][aria-describedby]").first()).toBeAttached();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
    await expect(page.locator("kazoku-search-box")).toHaveAttribute("data-scheme", theme);
    const result = await page.evaluate(() => window.axe.run({ include: [["kazoku-search-box"]] }));
    expect(result.passes.length, "axe ran on the box").toBeGreaterThan(5);
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`), theme).toEqual([]);
  }
});
