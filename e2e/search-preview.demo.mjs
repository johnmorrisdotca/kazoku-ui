import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";

// The search box's icons and preview pane on demo/search-preview.html. A wide popup draws the highlighted row's preview beside the list (arrow keys or a pointer); a narrow one opens it as a sheet from a Details action.
// Stars carry their preview; planets, craft and cities are asked for with loadPreview, only when highlighted. Every wait is on the page's state, never on a timer.
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const ready = async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search-preview.html");
  await expect(page.locator("#pbox")).toBeVisible();
  return errors;
};
const isPhone = (page) => (page.viewportSize()?.width ?? 1280) < 640;
const host = (page) => page.locator("#pbox");
const box = (page) => host(page).locator("input");
const rows = (page) => host(page).locator("[role=row][data-i]");
const panel = (page) => host(page).locator(".panel");
const pane = (page) => host(page).locator(".preview");
const list = (page) => host(page).locator(".list");
const chips = (page) => host(page).locator(".chips button");
const type = async (page, text) => {
  // the old rows stay until the new answer is drawn, so wait for a new draw
  const before = await host(page).evaluate((el) => el.drawCount);
  await box(page).fill(text);
  await expect.poll(() => host(page).evaluate((el) => el.drawCount)).toBeGreaterThan(before);
  await expect(rows(page).first()).toBeVisible();
  await expect(host(page).locator("#grid")).not.toHaveAttribute("aria-busy", "true");
};
/** Narrow to one kind by its chip, so every row on the list is one that is asked for. */
const narrow = async (page, name) => {
  await chips(page).filter({ hasText: name }).click();
  await expect(chips(page).filter({ hasText: name })).toHaveAttribute("aria-pressed", "true");
  await expect(host(page).locator("[role=rowheader]")).toHaveCount(1);
};
const title = (page) => pane(page).locator(".pv-title");
const calls = (page) => page.locator("#pcalls");

test("each row has its icon: a shape in its own colour, path data, and a flag", async ({ page }) => {
  const errors = await ready(page);
  await type(page, "mars");
  const mars = rows(page).filter({ hasText: "Mars" }).first();
  await expect(mars.locator(".ico svg")).toBeVisible();
  const look = await mars.locator(".ico").evaluate((el) => ({ color: getComputedStyle(el).color, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, filled: getComputedStyle(el.querySelector("svg")).fill }));
  expect(look.color).toBe("rgb(193, 68, 14)");
  expect(look.filled).toBe("rgb(193, 68, 14)");
  expect(look.w).toBeGreaterThanOrEqual(20);
  expect(look.w).toBeLessThanOrEqual(24);
  expect(look.h).toBeLessThanOrEqual(24);
  // the icon is decoration: the row's name is still just its name
  await expect(host(page).locator(".ico").first()).toHaveAttribute("aria-hidden", "true");
  await type(page, "tok");
  await expect(rows(page).filter({ hasText: "Tokyo" }).locator(".ico")).toHaveText("🇯🇵");
  await type(page, "voy");
  await expect(rows(page).filter({ hasText: "Voyager 1" }).locator(".ico svg path")).toHaveAttribute("d", "M12 3.5l4.5 13-4.5-2.8-4.5 2.8z");
  expect(errors).toEqual([]);
});

test("beside the list, the highlighted row's preview: its element, name, kind, facts and actions; the list does not move", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  const errors = await ready(page);
  await type(page, "mars");
  // before a row is highlighted the pane gives a hint and nothing is asked for
  await expect(pane(page)).toBeVisible();
  await expect(pane(page).locator(".pv-note")).toHaveText(/Point at a result/);
  await expect(calls(page)).toHaveText("0");
  const before = await rows(page).first().evaluate((el) => el.getBoundingClientRect().toJSON());
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await expect(pane(page).locator(".pv-kind")).toHaveText("Planet");
  await expect(pane(page).locator(".pv-facts dt")).toHaveText(["Moons", "Day", "From the Sun"]);
  await expect(pane(page).locator(".pv-facts dd")).toHaveText(["2", "24.6 h", "1.52 AU"]);
  // the page's own node is drawn in the picture's box
  await expect(pane(page).locator(".pv-pic .disc")).toBeVisible();
  await expect(pane(page).locator(".pv-acts button")).toHaveText(["Show", "Go", "Favourite"]);
  await expect(calls(page)).toHaveText("1");
  const after = await rows(page).first().evaluate((el) => el.getBoundingClientRect().toJSON());
  expect(after).toEqual(before);
  // it is a second column: to the right of the list, inside the popup
  const geometry = await host(page).evaluate((el) => {
    const l = el.shadowRoot.querySelector(".list").getBoundingClientRect();
    const p = el.shadowRoot.querySelector(".preview").getBoundingClientRect();
    const o = el.shadowRoot.querySelector(".panel");
    return { listRight: l.right, paneLeft: p.left, paneRight: p.right, panelRight: o.getBoundingClientRect().right, over: o.scrollWidth - o.clientWidth };
  });
  expect(geometry.paneLeft).toBeGreaterThanOrEqual(geometry.listRight - 1);
  expect(geometry.paneRight).toBeLessThanOrEqual(geometry.panelRight + 1);
  expect(geometry.over).toBeLessThanOrEqual(0);
  // a picture comes from an address, in a box of its own
  await type(page, "jup");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Jupiter");
  await expect(pane(page).locator(".pv-pic img")).toHaveAttribute("alt", "Jupiter, from the demo's own drawing");
  await expect(pane(page).locator(".pv-pic img")).toHaveAttribute("src", "interface-jupiter.svg");
  expect(errors).toEqual([]);
});

test("a row that carries its preview shows it at once and asks for nothing; the others are asked for only when highlighted", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "sir");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Sirius");
  await expect(pane(page).locator(".pv-facts dd")).toHaveText(["-1.46", "Canis Major", "8.6 ly"]);
  await expect(calls(page)).toHaveText("0");
  // a whole list of rows is drawn and none is asked for
  await type(page, "u");
  await expect(calls(page)).toHaveText("0");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText(/./);
  await expect(calls(page)).toHaveText("0");
});

test("moving through rows asks for the one the reader stops on, and never for the ones passed", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  // Uranus first (it starts with the query), then Mercury, Venus, Jupiter, Saturn, Neptune
  await expect(rows(page)).toHaveCount(6);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Neptune");
  await expect(calls(page)).toHaveText("1");
  await expect(page.locator("#plast")).toHaveText("planets/neptune");
});

test("the pane keeps the last preview until the next is ready, an answer that comes late is dropped, and a row seen again asks for nothing", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await expect(rows(page)).toHaveCount(6);
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Uranus");
  await expect(calls(page)).toHaveText("1");
  // slow answers from here on
  await page.locator("#slowpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#plast")).toHaveText("planets/mercury");
  // Mercury is on its way, and the pane still shows Uranus, without a blank between
  await expect(pane(page)).toHaveAttribute("aria-busy", "true");
  await expect(title(page)).toHaveText("Uranus");
  // moving on stops that request: its answer, which the page does not hold back, is never shown
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#plast")).toHaveText("planets/venus");
  await expect(page.locator("#paborts")).toHaveText("1");
  await expect(title(page)).toHaveText("Venus");
  await expect(pane(page)).not.toHaveAttribute("aria-busy", "true");
  await expect(calls(page)).toHaveText("3");
  // back to Uranus: from the kept previews, at once, and no call
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(title(page)).toHaveText("Uranus");
  await expect(calls(page)).toHaveText("3");
});

test("a preview that cannot be had shows the row's name and says so, and the next highlight asks again", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await page.locator("#failpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(pane(page).locator(".pv-note")).toHaveText("The preview could not be loaded.");
  await expect(title(page)).toHaveText("Uranus");
  await expect(pane(page).locator(".pv-facts")).toBeHidden();
  await page.locator("#failpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mercury");
  await page.keyboard.press("ArrowUp");
  await expect(title(page)).toHaveText("Uranus");
  await expect(pane(page).locator(".pv-facts dd").first()).toHaveText("28");
  await expect(pane(page).locator(".pv-note")).toBeHidden();
  await expect(calls(page)).toHaveText("3");
});

test("a pointer over a row highlights it and the pane follows; only a real move counts", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await expect(rows(page)).toHaveCount(6);
  await rows(page).nth(1).hover();
  await expect(title(page)).toHaveText("Mercury");
  await expect(rows(page).nth(1)).toHaveAttribute("aria-selected", "true");
  // the keyboard takes over from where the pointer was, and the still pointer does not take it back
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Venus");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Saturn");
  await expect(rows(page).nth(4)).toHaveAttribute("aria-selected", "true");
});

test("the pane's buttons do what the row's do: a toggle keeps the list, a plain action ends the search", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await pane(page).locator("button[data-act=fav]").click();
  await expect(page.locator("#picked")).toHaveText("fav planets/mars on");
  await expect(pane(page).locator("button[data-act=fav]")).toHaveAttribute("aria-pressed", "true");
  await expect(rows(page).first().locator("button[data-act=fav]")).toHaveAttribute("aria-pressed", "true");
  await expect(panel(page)).toBeVisible();
  await expect(box(page)).toBeFocused();
  // the row's own button changes the pane's
  await rows(page).first().locator("button[data-act=fav]").click();
  await expect(pane(page).locator("button[data-act=fav]")).toHaveAttribute("aria-pressed", "false");
  await pane(page).locator("button[data-act=show]").click();
  await expect(page.locator("#picked")).toHaveText("show planets/mars");
  await expect(panel(page)).toBeHidden();
});

test("the pane is a region that describes the active cell, is not a focus trap, and its buttons are not tab stops", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await expect(pane(page)).toHaveAttribute("role", "region");
  await expect(pane(page)).toHaveAccessibleName("Preview");
  const described = await host(page).evaluate((el) => {
    const input = el.shadowRoot.querySelector("input");
    const target = el.shadowRoot.getElementById(input.getAttribute("aria-activedescendant"));
    return { ids: target.getAttribute("aria-describedby"), exists: el.shadowRoot.getElementById("pv") !== null, focused: el.shadowRoot.activeElement === input };
  });
  expect(described).toEqual({ ids: "pv", exists: true, focused: true });
  // arrowing to an action keeps the description, and leaving the list takes it off
  await page.keyboard.press("ArrowRight");
  expect(await host(page).evaluate((el) => el.shadowRoot.getElementById(el.shadowRoot.querySelector("input").getAttribute("aria-activedescendant")).getAttribute("aria-describedby"))).toBe("pv");
  expect(await host(page).evaluate((el) => [...el.shadowRoot.querySelectorAll("[aria-describedby='pv']")].length)).toBe(1);
  expect(await host(page).evaluate((el) => [...el.shadowRoot.querySelectorAll(".preview button")].every((b) => b.tabIndex === -1))).toBe(true);
  // Tab leaves the box for the chips and carries on out of the popup, as it did before
  await page.keyboard.press("Tab");
  await expect(page.locator("#slowpv")).toBeFocused();
});

test("Escape closes the popup, and the pane starts from its hint the next time", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(panel(page)).toBeVisible();
  await expect(pane(page).locator(".pv-note")).toHaveText(/Point at a result/);
  await expect(pane(page).locator(".pv-body")).toBeHidden();
});

test("on a narrow popup there is no pane: each row has a Details action that opens the preview as a sheet, and Back returns to the list", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  const errors = await ready(page);
  await type(page, "mars");
  await expect(panel(page)).toHaveAttribute("data-layout", "sheet");
  await expect(pane(page)).toBeHidden();
  await expect(calls(page)).toHaveText("0");
  const mars = rows(page).first();
  const details = mars.locator("button[data-act=kazoku-preview]");
  await expect(details).toHaveAccessibleName("Details Mars");
  await details.click({ force: true });
  await expect(pane(page)).toBeVisible();
  await expect(list(page)).toBeHidden();
  await expect(title(page)).toHaveText("Mars");
  await expect(pane(page).locator(".pv-facts dd")).toHaveText(["2", "24.6 h", "1.52 AU"]);
  // opening it is not a pick
  await expect(page.locator("#picked")).toHaveText("nothing yet");
  await expect(pane(page).locator(".pv-back")).toBeVisible();
  const phoneSize = await pane(page).evaluate((el) => el.getBoundingClientRect().width);
  expect(phoneSize).toBeLessThanOrEqual(390);
  expect(await panel(page).evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await pane(page).locator(".pv-back").click();
  await expect(list(page)).toBeVisible();
  await expect(pane(page)).toBeHidden();
  expect(errors).toEqual([]);
});

test("the Details action is reached by the arrow keys and Escape closes the sheet before the popup", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  // Show, Go, Favourite, then Details
  for (let i = 0; i < 3; i += 1) await page.keyboard.press("ArrowRight");
  const active = await host(page).evaluate((el) => el.shadowRoot.getElementById(el.shadowRoot.querySelector("input").getAttribute("aria-activedescendant")).querySelector("button")?.dataset.act);
  expect(active).toBe("kazoku-preview");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("Mars");
  await expect(page.locator("#picked")).toHaveText("nothing yet");
  // with the sheet open the list is out of the page, so the box names nothing in it
  await expect(box(page)).not.toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Escape");
  await expect(pane(page)).toBeHidden();
  await expect(panel(page)).toBeVisible();
  await expect(box(page)).toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
});

test("the sheet's actions work, and a new search closes it", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  await ready(page);
  await type(page, "mars");
  await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
  await expect(title(page)).toHaveText("Mars");
  await pane(page).locator("button[data-act=fav]").click();
  await expect(page.locator("#picked")).toHaveText("fav planets/mars on");
  await expect(pane(page).locator("button[data-act=fav]")).toHaveAttribute("aria-pressed", "true");
  await box(page).fill("jupiter");
  await expect(rows(page).first()).toContainText("Jupiter");
  await expect(pane(page)).toBeHidden();
  await expect(list(page)).toBeVisible();
});

test("the layout follows the width: a popup made narrow turns to the sheet and keeps the highlighted row, and wide again it is beside the list", async ({ page }) => {
  test.skip(isPhone(page), "this resizes a desk window");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(panel(page)).toHaveAttribute("data-layout", "side");
  await expect(rows(page).first().locator("button[data-act=kazoku-preview]")).toHaveCount(0);
  await page.setViewportSize({ width: 480, height: 900 });
  await expect(panel(page)).toHaveAttribute("data-layout", "sheet");
  await expect(pane(page)).toBeHidden();
  await expect(rows(page).first().locator("button[data-act=kazoku-preview]")).toHaveCount(1);
  await expect(rows(page).first()).toHaveAttribute("aria-selected", "true");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(panel(page)).toHaveAttribute("data-layout", "side");
  await expect(rows(page).first().locator("button[data-act=kazoku-preview]")).toHaveCount(0);
  await expect(rows(page).first()).toHaveAttribute("aria-selected", "true");
  await expect(title(page)).toHaveText("Mars");
});

test("the words are in Japanese, and the kept previews are not shown in the other language", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(pane(page).locator(".pv-kind")).toHaveText("Planet");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await expect(pane(page)).toHaveAccessibleName("プレビュー");
  await type(page, "火星");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("火星");
  await expect(pane(page).locator(".pv-kind")).toHaveText("惑星");
  await expect(pane(page).locator(".pv-facts dt")).toHaveText(["衛星", "1日", "太陽から"]);
  await expect(pane(page).locator(".pv-acts button")).toHaveText(["表示", "移動", "お気に入り"]);
});

test("the open popup with a preview has no accessibility violations in light or dark", async ({ page }) => {
  await ready(page);
  await page.addScriptTag({ path: axePath });
  await type(page, "mars");
  if (isPhone(page)) {
    await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
    await expect(pane(page)).toBeVisible();
  } else await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await expect(pane(page).locator(".pv-facts dd").first()).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
    await expect(host(page)).toHaveAttribute("data-scheme", theme);
    const result = await page.evaluate(() => window.axe.run({ include: [["#pbox"]] }));
    expect(result.passes.length, "axe ran on the box").toBeGreaterThan(5);
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`), theme).toEqual([]);
  }
});

/** The box's description target: what the active cell (or, with the sheet open, the box) says it is described by. */
const describedBy = (page) => host(page).evaluate((el) => {
  const input = el.shadowRoot.querySelector("input");
  const cell = el.shadowRoot.getElementById(input.getAttribute("aria-activedescendant") ?? "");
  return { cell: cell?.getAttribute("aria-describedby") ?? null, input: input.getAttribute("aria-describedby") };
});
/** A moment for something that must NOT happen. The only wait on a clock in this file, and only for a negative. */
const quiet = (page, ms) => page.evaluate((wait) => new Promise((resolve) => setTimeout(resolve, wait)), ms);

test("a screen reader is never told the previous row's preview is the active row's: the pane describes the cell only once it shows that row", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await page.locator("#slowpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  // nothing is shown yet: no description
  expect((await describedBy(page)).cell).toBeNull();
  await expect(title(page)).toHaveText("Uranus");
  await expect.poll(async () => (await describedBy(page)).cell).toBe("pv");
  // the next row is on its way; the pane still shows Uranus, which must not be read as Mercury's
  await page.keyboard.press("ArrowDown");
  await expect(pane(page)).toHaveAttribute("aria-busy", "true");
  expect((await describedBy(page)).cell).toBeNull();
  await expect(title(page)).toHaveText("Mercury");
  await expect.poll(async () => (await describedBy(page)).cell).toBe("pv");
});

test("a failed preview is asked for again only after another row, not by every arrow along the row", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await page.locator("#failpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(pane(page).locator(".pv-note")).toHaveText("The preview could not be loaded.");
  await expect(calls(page)).toHaveText("1");
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
  }
  // longer than the quiet time, so a repeat would have been asked for by now
  await quiet(page, 500);
  await expect(calls(page)).toHaveText("1");
  await page.locator("#failpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mercury");
  await page.keyboard.press("ArrowUp");
  await expect(title(page)).toHaveText("Uranus");
  await expect(pane(page).locator(".pv-note")).toBeHidden();
  await expect(calls(page)).toHaveText("3");
});

test("turning the preview off while a call is waiting asks for nothing, and while the sheet is open closes it", async ({ page }) => {
  await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  if (isPhone(page)) {
    await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
    await expect(title(page)).toHaveText("Uranus");
    await host(page).evaluate((el) => el.setAttribute("preview", "off"));
    await expect(pane(page)).toBeHidden();
    await expect(list(page)).toBeVisible();
    await expect(box(page)).toHaveAttribute("aria-activedescendant", /.+/);
    // the first Escape closes the popup: the sheet is not still holding it
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    return;
  }
  await page.keyboard.press("ArrowDown");
  await host(page).evaluate((el) => el.setAttribute("preview", "off"));
  await expect(pane(page)).toBeHidden();
  await quiet(page, 400);
  await expect(calls(page)).toHaveText("0");
  await host(page).evaluate((el) => el.removeAttribute("preview"));
  await expect(pane(page)).toBeVisible();
});

test("a sheet left open when the popup grows wide closes, and the list and the highlight are back", async ({ page }) => {
  test.skip(isPhone(page), "this resizes a desk window");
  await ready(page);
  await page.setViewportSize({ width: 480, height: 900 });
  await type(page, "mars");
  await expect(panel(page)).toHaveAttribute("data-layout", "sheet");
  await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
  await expect(pane(page)).toBeVisible();
  await expect(list(page)).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(panel(page)).toHaveAttribute("data-layout", "side");
  await expect(panel(page)).not.toHaveAttribute("data-sheet", "");
  await expect(list(page)).toBeVisible();
  await expect(box(page)).toHaveAttribute("aria-activedescendant", /.+/);
  await expect(title(page)).toHaveText("Mars");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
});

/** A box whose one preview has labels, kinds and values with no place to break. */
const longText = async (page) => {
  const long = "Supercalifragilisticexpialidocious".repeat(4);
  await page.evaluate((word) => {
    const b = document.querySelector("#pbox");
    b.loadPreview = undefined;
    b.source = () => [{ id: "k", label: "Things", total: 1, rows: [{ id: "x", label: "Thing", preview: { title: word, kind: word, facts: [{ label: word, value: word }, { label: "Short", value: "ok" }] } }] }];
  }, long);
};

test("long unbroken text in a preview wraps inside the pane, on a 320 px screen and a wide one, and nothing scrolls sideways", async ({ page }) => {
  await ready(page);
  await longText(page);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await box(page).fill("");
    await type(page, "thing");
    if (width < 540) await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
    else await page.keyboard.press("ArrowDown");
    await expect(pane(page).locator(".pv-facts dt").first()).toBeVisible();
    const over = await host(page).evaluate((el) => {
      const panelEl = el.shadowRoot.querySelector(".panel");
      const p = el.shadowRoot.querySelector(".preview").getBoundingClientRect();
      const o = panelEl.getBoundingClientRect();
      return { scroll: panelEl.scrollWidth - panelEl.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth, inside: p.left >= o.left - 1 && p.right <= o.right + 1 };
    });
    expect(over, `${width} px`).toEqual({ scroll: 0, page: 0, inside: true });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  }
});

test("with the sheet open the box is described by the sheet, Tab reaches Back and the actions, and a press there returns the focus to the box", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  for (let i = 0; i < 3; i += 1) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("Mars");
  await expect.poll(async () => (await describedBy(page)).input).toBe("pv");
  // Tab: Back first, then the actions; none of them is hidden from a screen reader in the sheet
  await page.keyboard.press("Tab");
  expect(await host(page).evaluate((el) => el.shadowRoot.activeElement?.className)).toBe("pv-back");
  await expect(pane(page).locator(".pv-acts")).not.toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("Tab");
  expect(await host(page).evaluate((el) => el.shadowRoot.activeElement?.dataset.act)).toBe("show");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(list(page)).toBeVisible();
  await expect(panel(page)).toBeVisible();
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveAttribute("aria-activedescendant", /.+/);
  // an action pressed from the keyboard does it, and the focus is back in the box
  await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
  await expect(title(page)).toHaveText("Mars");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#picked")).toHaveText("show planets/mars");
  await expect(box(page)).toBeFocused();
});

test("clearPreviews and a new loadPreview during a call end it and ask again; the box leaving the page during a call is quiet", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  const errors = await ready(page);
  await type(page, "u");
  await narrow(page, "Planets");
  await page.locator("#slowpv").evaluate((el) => el.click());
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#plast")).toHaveText("planets/uranus");
  await host(page).evaluate((el) => el.clearPreviews());
  await expect(page.locator("#paborts")).toHaveText("1");
  await expect(calls(page)).toHaveText("2");
  const load = await host(page).evaluate((el) => (window.__load = el.loadPreview, 1));
  expect(load).toBe(1);
  await host(page).evaluate((el) => { el.loadPreview = window.__load; });
  await expect(page.locator("#paborts")).toHaveText("2");
  await expect(calls(page)).toHaveText("3");
  await expect(title(page)).toHaveText("Uranus");
  // a new call is out, and the box leaves the page: it is stopped, and nothing is drawn or thrown
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#plast")).toHaveText("planets/mercury");
  await host(page).evaluate((el) => el.remove());
  await expect(page.locator("#paborts")).toHaveText("3");
  await quiet(page, 1200);
  expect(errors).toEqual([]);
});

test("preview-delay is an attribute: a longer quiet time asks later", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await host(page).evaluate((el) => el.setAttribute("preview-delay", "700"));
  await type(page, "u");
  await narrow(page, "Planets");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#pcalls")).toHaveText("0");
  await expect(title(page)).toHaveText("Uranus");
  await expect(calls(page)).toHaveText("1");
});

test("a kept preview is for one language: the same row in the other language is asked for again", async ({ page }) => {
  test.skip(isPhone(page), "a narrow popup has a sheet instead");
  await ready(page);
  await type(page, "mars");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("Mars");
  await expect(calls(page)).toHaveText("1");
  await page.locator('kazoku-language-picker button[data-v="ja"]').click();
  await type(page, "火星");
  await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("火星");
  await expect(calls(page)).toHaveText("2");
});

test("a row icon picture that cannot be loaded is taken away and leaves the box in place", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    document.querySelector("#pbox").source = () => [{ id: "k", label: "Things", total: 2, rows: [{ id: "a", label: "Alpha", icon: { src: "/no-such-flag.svg" } }, { id: "b", label: "Beta", icon: { name: "disc" } }] }];
  });
  await type(page, "a");
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first().locator(".ico")).toHaveCount(1);
  await expect(rows(page).first().locator(".ico img")).toHaveCount(0);
  const widths = await rows(page).evaluateAll((els) => els.map((el) => el.querySelector(".ico").getBoundingClientRect().width));
  expect(widths[0]).toBe(widths[1]);
});

test("on a finger the sheet's Back and action buttons are 44 px tall", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  await ready(page);
  const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  test.skip(!coarse, "this browser does not report a coarse pointer at phone width");
  await type(page, "mars");
  await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
  await expect(title(page)).toHaveText("Mars");
  const sizes = await pane(page).evaluate((el) => [el.querySelector(".pv-back"), ...el.querySelectorAll(".pv-acts button")].map((b) => b.getBoundingClientRect().height));
  expect(sizes.length).toBeGreaterThan(2);
  for (const height of sizes) expect(height).toBeGreaterThanOrEqual(44);
});

test("Escape on one of the sheet's own buttons closes the sheet, not the popup, and the focus is in the box", async ({ page }) => {
  test.skip(!isPhone(page), "a wide popup has the pane beside the list");
  await ready(page);
  await type(page, "mars");
  await rows(page).first().locator("button[data-act=kazoku-preview]").click({ force: true });
  await expect(title(page)).toHaveText("Mars");
  await page.keyboard.press("Tab");
  expect(await host(page).evaluate((el) => el.shadowRoot.activeElement?.className)).toBe("pv-back");
  await page.keyboard.press("Escape");
  await expect(list(page)).toBeVisible();
  await expect(panel(page)).toBeVisible();
  await expect(box(page)).toBeFocused();
});
