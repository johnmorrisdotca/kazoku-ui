import { expect, test } from "@playwright/test";
import { FAMILY_EMBED_BUILDER_WORDS, FAMILY_SCRIPT, familyEmbedBuilder } from "../templates/family-template.mjs";

// The family embed builder (templates/family-template.mjs) on a builder page made the way a package's site makes one: the builder emitted as a browser module
// (`familyEmbedBuilder.toString()`), the family script inline, kazoku-ui's embed panel defined by the page. With <kazoku-embed-panel id="bld-embed"> in the
// page the code section is the panel; a page with the old code section (#bld-formats, #bld-code, #bld-copy) keeps it, so a package moves when it is ready.

const BUILDER_MODULE = `export const FAMILY_EMBED_BUILDER_WORDS = ${JSON.stringify(FAMILY_EMBED_BUILDER_WORDS)};\nexport ${familyEmbedBuilder.toString()};\n`;
const FORMATS = ["element", "iframe", "module", "react", "vue", "svelte", "angular", "html", "url"];

const SCRIPT = `
import "./dist/embed-panel/define.js";
import { familyEmbedBuilder, FAMILY_EMBED_BUILDER_WORDS } from "./family-embed-builder.js";
const words = { en: { ...FAMILY_EMBED_BUILDER_WORDS.en, makerDial: "A dial", makerDialSays: "One dial." }, ja: { ...FAMILY_EMBED_BUILDER_WORDS.ja, makerDial: "ダイヤル", makerDialSays: "ダイヤルがひとつ。" } };
let mounted;
const page = globalThis.familyLanguage({ id: "kazoku-ui", words, onChange: () => mounted?.draw() });
const options = [{ id: "size", kind: "choice", group: "look", names: { dial: "size" }, say: { en: { label: "Size", help: "How big the dial is." }, ja: { label: "大きさ", help: "ダイヤルの大きさです。" } }, default: "medium", choices: ["small", "medium", "large"] }];
const builder = familyEmbedBuilder({ id: "kazoku-ui", packageName: "@scope/dial", major: "1", site: "https://example.com/dial/", title: "Dial", options, groups: { look: { en: "Look", ja: "見た目" } },
  makers: { dial: { names: "dial", element: "dial", tag: "x-dial", embed: "embed.html", description: "makerDialSays", formats: ${JSON.stringify(FORMATS)}, width: 320, height: 320 } },
  docsHref: "docs/", credits: "Dial drawn by the test." });
mounted = builder.mount({ words, language: () => page, initial: { dial: {} }, renderPreview: ({ stage, attrs }) => {
  const dial = document.createElement("div");
  dial.dataset.testid = "dial";
  dial.textContent = JSON.stringify(attrs);
  stage.append(dial);
  return { destroy() { dial.remove(); } };
} });
`;

const PREVIEW_AND_CONTROLS = `
  <section aria-labelledby="bld-preview-title">
    <h2 id="bld-preview-title" data-say="previewTitle"></h2>
    <div id="bld-stage" data-testid="bld-stage"></div>
    <p id="bld-note" aria-live="polite"></p>
  </section>
  <div id="bld-makers" role="group" data-say-label="makerLabel"><button type="button" data-maker="dial" data-say="makerDial"></button></div>
  <p id="bld-maker-says"></p>
  <div id="bld-groups" data-testid="bld-groups"></div>`;

/** The code section with the family's embed panel: "Copy a link" and "Start again" sit in its actions slot. */
const WITH_PANEL = `
  <section aria-labelledby="bld-code-title">
    <h2 id="bld-code-title" data-say="codeTitle"></h2>
    <p data-say="codeText"></p>
    <kazoku-embed-panel id="bld-embed" data-testid="bld-embed">
      <button slot="actions" id="bld-link" type="button" data-say="copyLink" data-testid="bld-link"></button>
      <button slot="actions" id="bld-reset" type="button" data-say="startAgain" data-testid="bld-reset"></button>
    </kazoku-embed-panel>
    <p id="bld-copied" data-testid="bld-copied" aria-live="polite"></p>
  </section>`;

/** The old code section, as every package's builder.html has it today. */
const OLD_SECTION = `
  <div><button id="bld-link" type="button" data-say="copyLink"></button><button id="bld-reset" type="button" data-say="startAgain"></button></div>
  <p id="bld-copied" aria-live="polite"></p>
  <section aria-labelledby="bld-code-title">
    <h2 id="bld-code-title" data-say="codeTitle"></h2>
    <div role="tablist" id="bld-formats" data-testid="bld-formats"></div>
    <div id="bld-panel" role="tabpanel"><pre><code id="bld-code" data-testid="bld-code"></code></pre><button id="bld-copy" type="button" data-say="copy" data-testid="bld-copy"></button><p id="bld-code-copied" aria-live="polite"></p></div>
  </section>`;

const html = (codeSection) => `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Builder test</title></head><body><main>${PREVIEW_AND_CONTROLS}${codeSection}</main>
<script>${FAMILY_SCRIPT}</script><script type="module" src="family-embed-builder-page.js"></script></body></html>`;

/** Serve a builder page beside the demo (so ./dist/ is the library) and open it, with a clipboard that records what is copied. */
async function open(page, codeSection, hash = "") {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const at = (name) => (url) => url.pathname.endsWith(`/${name}`);
  await page.route(at("family-builder-test.html"), (route) => route.fulfill({ contentType: "text/html", body: html(codeSection) }));
  await page.route(at("family-embed-builder.js"), (route) => route.fulfill({ contentType: "text/javascript", body: BUILDER_MODULE }));
  await page.route(at("family-embed-builder-page.js"), (route) => route.fulfill({ contentType: "text/javascript", body: SCRIPT }));
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => void window.__copied.push(text) } });
  });
  await page.goto(`/family-builder-test.html${hash}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  return errors;
}

const panel = (page) => page.getByTestId("bld-embed");
const tab = (page, name) => panel(page).getByRole("tab", { name, exact: true });
const code = (page) => panel(page).locator("[part=code]");

test("with the embed panel in the page, the builder's code section is the panel: its nine tabs, the code of the choices, the note, the links and the credit", async ({ page }) => {
  const errors = await open(page, WITH_PANEL);
  await expect(panel(page).getByRole("tab")).toHaveText(["Custom element", "iframe", "ES module", "React 19", "Vue", "Svelte", "Angular", "Plain HTML", "iframe URL"]);
  await expect(tab(page, "Custom element")).toHaveAttribute("aria-selected", "true");
  await expect(code(page)).toContainText("<x-dial");
  await expect(code(page)).not.toContainText("size=");
  await expect(panel(page).locator("[part=note]")).toHaveText("Only choices that differ from the defaults are included in the code.");
  await expect(panel(page).locator("[part=credits]")).toContainText("Dial drawn by the test.");
  await expect(panel(page).locator("[part=docs]")).toHaveAttribute("href", "docs/");
  await expect(panel(page).locator("[part=open]")).toHaveAttribute("href", "embed.html");
  // the builder's own buttons sit beside Copy, and the old code section's parts are not needed
  await expect(page.getByTestId("bld-link")).toHaveText("Copy a link to this setup");
  await expect(page.getByTestId("bld-reset")).toHaveText("Start again");
  await expect(page.locator("#bld-code, #bld-formats, #bld-copy")).toHaveCount(0);
  // no picture and no size of the panel's own: the builder's preview and its choices are the package's
  await expect(panel(page).locator("[part=preview]")).toBeHidden();
  await expect(panel(page).locator("[part=size]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("a choice reaches the code and the embed page link; a tab is kept in the address and comes back; Copy copies the code shown", async ({ page }) => {
  await open(page, WITH_PANEL);
  await page.getByTestId("bld-groups").getByRole("button", { name: "large", exact: true }).click();
  await expect(code(page)).toContainText('size="large"');
  await expect(panel(page).locator("[part=open]")).toHaveAttribute("href", "embed.html?size=large");
  await expect(page.getByTestId("dial")).toContainText('["size","large"]');
  await tab(page, "React 19").click();
  await expect(code(page)).toContainText('return <x-dial size="large" />;');
  await expect.poll(() => new URL(`http://x/?${new URL(page.url()).hash.slice(1)}`).searchParams.get("show")).toBe("react");
  await panel(page).locator("[part=copy]").click();
  await expect.poll(() => page.evaluate(() => window.__copied)).toEqual([await code(page).textContent()]);
  const kept = new URL(page.url()).hash;
  await page.goto("about:blank");
  await open(page, WITH_PANEL, kept);
  await expect(tab(page, "React 19")).toHaveAttribute("aria-selected", "true");
  await expect(code(page)).toContainText('size="large"');
  // Start again: the choices go back to the defaults, and the code follows
  await page.getByTestId("bld-reset").click();
  await expect(code(page)).not.toContainText("size=");
});

test("in Japanese the panel's tabs and note are the builder's Japanese words, and they follow a change of language", async ({ page }) => {
  await open(page, WITH_PANEL, "?lang=ja");
  await expect(panel(page).getByRole("tab").first()).toHaveText("カスタム要素");
  await expect(panel(page).locator("[part=note]")).toHaveText("初期値と異なる選択だけがコードに含まれます。");
  await expect(page.getByTestId("bld-link")).toHaveText("この設定へのリンクをコピー");
  await page.evaluate(() => document.dispatchEvent(new window.CustomEvent("kazoku-languagechange", { detail: { lang: "en" } })));
  await expect(panel(page).getByRole("tab").first()).toHaveText("Custom element");
  await expect(panel(page).locator("[part=note]")).toHaveText("Only choices that differ from the defaults are included in the code.");
});

test("a builder page with the old code section keeps it: the tabs, the code and Copy work as before", async ({ page }) => {
  const errors = await open(page, OLD_SECTION);
  await expect(page.getByTestId("bld-formats").getByRole("tab")).toHaveCount(FORMATS.length);
  await expect(page.getByTestId("bld-code")).toContainText("<x-dial");
  await page.getByTestId("bld-copy").click();
  await expect.poll(() => page.evaluate(() => window.__copied)).toEqual([await page.getByTestId("bld-code").textContent()]);
  expect(errors).toEqual([]);
});
