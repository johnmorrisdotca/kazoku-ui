import { expect, test } from "@playwright/test";

// Every layout at both levels, still, turning, zoomed and with More pressed, at the phone's width and a desk's, and at the narrow places in between that a
// page's own panel makes: nothing may overlap, reach past the controls, be less than a finger tall, or squash a slider.
const BAR = "kazoku-view-controls";
const LAYOUTS = ["classic", "horizontal", "vertical", "compact"];
const LEVELS = ["basic", "advanced"];

const problems = (page, forced) => page.evaluate(([tag, forced]) => {
  const el = document.querySelector(tag);
  const seen = [...el.shadowRoot.querySelectorAll("button, input, .zmark, output, label")]
    .filter((node) => node.getClientRects().length > 0 && node.getBoundingClientRect().width > 2)
    .map((node) => ({ name: node.dataset?.b || node.id || node.className || node.tagName.toLowerCase(), tag: node.tagName, mark: node.classList.contains("zmark"), box: node.getBoundingClientRect() }));
  const host = el.getBoundingClientRect();
  const found = [];
  for (let i = 0; i < seen.length; i += 1) for (let j = i + 1; j < seen.length; j += 1) {
    const a = seen[i];
    const b = seen[j];
    // The marks are written over the slider's own box.
    if ((a.tag === "INPUT" && b.mark) || (b.tag === "INPUT" && a.mark)) continue;
    const across = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
    const down = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
    if (across > 1 && down > 1) found.push(`${a.name} overlaps ${b.name}`);
  }
  for (const x of seen) {
    if (x.box.right > host.right + 1 || x.box.left < host.left - 1) found.push(`${x.name} is outside the controls`);
    if (x.tag === "BUTTON" && x.box.height < 47.5) found.push(`${x.name} is ${Math.round(x.box.height)} px tall`);
    if (x.tag === "INPUT" && x.box.width < 60) found.push(`${x.name} is squashed to ${Math.round(x.box.width)} px`);
  }
  if (!forced && document.documentElement.scrollWidth > window.innerWidth + 1) found.push("the page scrolls sideways");
  return [...new Set(found)];
}, [BAR, forced]);

const widthsFor = (page) => (page.viewportSize().width < 640 ? [0, 336, 300, 280] : [0, 320, 360, 560, 700, 1040, 1100]);

for (const layout of LAYOUTS) {
  for (const level of LEVELS) {
    test(`${layout} at the ${level} level: nothing overlaps, squashes or reaches past the controls, at any width`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/?layout=${layout}&controls=${level}&zoom-min=0.25&zoom-max=16`);
      await page.evaluate(() => globalThis.localStorage.clear());
      await page.goto(`/?layout=${layout}&controls=${level}&zoom-min=0.25&zoom-max=16`);
      await expect(page.locator(`${BAR} .bar`)).toBeVisible();
      // A wide face, as a Linux machine's system font is: the controls must hold with it too.
      if (process.env.KZ_WIDE_FONT) await page.locator(BAR).evaluate((el) => { const sheet = new globalThis.CSSStyleSheet(); sheet.replaceSync(":host { font-family: Verdana, sans-serif !important; }"); el.shadowRoot.adoptedStyleSheets = [...el.shadowRoot.adoptedStyleSheets, sheet]; });
      const press = (name) => page.locator(`${BAR} [data-b="${name}"]`).click();
      const steps = [
        ["still", async () => {}],
        ["turning", () => press("play")],
        ["zoomed", async () => { await press("play"); await press("in"); await press("in"); }],
        ["with More pressed", () => press("more")],
      ];
      for (const [state, go] of steps) {
        await go();
        for (const width of widthsFor(page)) {
          await page.locator(BAR).evaluate((el, w) => { el.style.width = w > 0 ? `${w}px` : ""; el.style.maxWidth = w > 0 ? "none" : ""; }, width);
          // A layout that is a column keeps its own width: it is the page's job to give it room.
          if (layout === "vertical" && width > 0) continue;
          expect(await problems(page, width > 0), `${layout} ${level}, ${state}, ${width > 0 ? `${width} px wide` : "its own width"}`).toEqual([]);
        }
      }
      expect(errors).toEqual([]);
    });
  }
}

test("horizontal at 336 px: the zoom slider has a row of its own, so its marks never meet the buttons", async ({ page }) => {
  await page.goto("/?layout=horizontal&zoom-min=0.25&zoom-max=16");
  await page.locator(BAR).evaluate((el) => { el.style.width = "336px"; });
  const box = (selector) => page.locator(`${BAR} ${selector}`).first().boundingBox();
  const slider = await box(".zbox");
  const out = await box('[data-b="out"]');
  expect(slider.y + slider.height, "the buttons are under the slider").toBeLessThanOrEqual(out.y + 1);
  expect(slider.width).toBeGreaterThan(200);
});
