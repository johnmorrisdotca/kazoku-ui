import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { cardProblems, formatValue, type ObjectCardData } from "../src/interface/card.ts";
import { canStep, formatMoment, fromInputValue, speedWords, SPEED_LADDER, stepSpeed, toInputValue, zoneName } from "../src/interface/clock.ts";
import { createStandInClock } from "../src/interface/clock-adapter.ts";
import { CONTROL_ORDER, nextLook, parseControls, parseLooks } from "../src/interface/controls.ts";
import { ICON_NAMES, ICONS, iconSvg } from "../src/interface/icons.ts";
import { licenceText, sourcesFromCredits, type DoorCredit } from "../src/interface/layers.ts";
import { readingProblems, type ReadingPageData } from "../src/interface/reading.ts";
import { parseScaleSteps, SCALE_STEPS } from "../src/interface/scale.ts";
import { cultureSegments, parseSegments } from "../src/interface/segments.ts";
import { COLOURS, contrastRatio, READABLE_PAIRS, TOKEN_PROPERTIES, tokensCss, unreadablePairs } from "../src/interface/tokens.ts";
import { trailText } from "../src/interface/trail.ts";
import { WORDS, wordsFor } from "../src/interface/words.ts";
import { pageFooterHtml } from "../src/page-frame/html.ts";
import { WORDS as FRAME_WORDS } from "../src/page-frame/words.ts";
import { creditsText } from "../src/shared/door.ts";

test("every word is in both languages, none empty, and every icon has a name", () => {
  assert.deepEqual(Object.keys(WORDS.en).sort(), Object.keys(WORDS.ja).sort());
  for (const language of ["en", "ja"] as const) for (const text of Object.values(WORDS[language])) assert.notEqual(text, "");
  for (const name of ICON_NAMES) if (name in WORDS.en) assert.ok((WORDS.en as unknown as Record<string, string>)[name]);
  assert.equal(wordsFor("en", { close: "Dismiss" }).close, "Dismiss");
  assert.deepEqual(Object.keys(FRAME_WORDS.en).sort(), Object.keys(FRAME_WORDS.ja).sort(), "the page frame's words, with the footer's, are in both too");
});

test("the tokens are the design's, and every text and icon colour keeps 4.5:1 on its grounds", () => {
  assert.equal(COLOURS.space, "#070A10");
  assert.equal(COLOURS.sun, "#F2B84B");
  assert.equal(COLOURS["on-sun"], "#141413");
  assert.equal(TOKEN_PROPERTIES["--kui-panel"], "#121722");
  assert.ok(tokensCss().includes("--kui-line-strong: #3A4860;"));
  assert.ok(!tokensCss().includes("color-scheme"), "the tokens never force the page's colour scheme");
  assert.deepEqual(unreadablePairs(), []);
  for (const [foreground, ground] of READABLE_PAIRS) assert.ok(contrastRatio(COLOURS[foreground], COLOURS[ground]) >= 4.5, `${foreground} on ${ground}`);
  assert.ok(contrastRatio("#E8ECF2", "#121722") > 15 && contrastRatio("#E8ECF2", "#121722") < 15.2);
  assert.ok(contrastRatio("#777777", "#121722") < 4.5);
  assert.deepEqual(unreadablePairs({ ...COLOURS, "text-quiet": "#3A4860" }).slice(0, 1), ["text-quiet on space"]);
});

test("no part loads a font or anything else from Google", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
  for (const file of walk("src/interface")) assert.doesNotMatch(readFileSync(file, "utf8"), /fonts\.(googleapis|gstatic)\.com/, file);
});

test("the clock's words are plain, in both languages", () => {
  const say = (speed: number, language: "en" | "ja", running = true): string => speedWords(speed, language, running, WORDS[language]);
  assert.equal(say(3600, "en"), "1 hour each second");
  assert.equal(say(7200, "en"), "2 hours each second");
  assert.equal(say(600, "en"), "10 minutes each second");
  assert.equal(say(86400, "en"), "1 day each second");
  assert.equal(say(1, "en"), "Real time");
  assert.equal(say(0.5, "en"), "0.5× real time");
  assert.equal(say(-3600, "en"), "1 hour each second, backwards");
  assert.equal(say(3600, "en", false), "Paused");
  assert.equal(say(3600, "ja"), "1秒で1時間");
  assert.equal(say(86400 * 2, "ja"), "1秒で2日");
  assert.equal(say(-60, "ja"), "1秒で1分、逆向き");
  assert.equal(say(1, "ja"), "実時間");
});

test("Faster and Slower walk the ladder and keep the direction", () => {
  assert.equal(stepSpeed(3600, 1), 86400);
  assert.equal(stepSpeed(3600, -1), 600);
  assert.equal(stepSpeed(-3600, 1), -86400);
  assert.equal(stepSpeed(1, -1), 1, "never below the first step");
  assert.equal(stepSpeed(SPEED_LADDER.at(-1) as number, 1), SPEED_LADDER.at(-1));
  assert.equal(stepSpeed(0, 1), 60);
  assert.equal(canStep(1, -1), false);
  assert.equal(canStep(1, 1), true);
  assert.equal(stepSpeed(5, 1), 60, "a speed between steps goes from the nearest step");
});

test("the moment reads the way the design shows it, and goes to and from the picker", () => {
  const ms = Date.UTC(2026, 10, 10, 21, 14);
  assert.equal(formatMoment(ms, "en", "utc"), "10 Nov 2026 · 21:14");
  assert.equal(formatMoment(ms, "ja", "utc"), "2026年11月10日 · 21:14");
  assert.equal(formatMoment(Number.NaN, "en", "utc"), "—");
  assert.equal(formatMoment(ms, "en", "utc", true), "10 Nov 2026 · 21:14 UTC");
  assert.equal(zoneName(ms, "ja", "utc"), "UTC");
  assert.match(zoneName(ms, "en"), /^[A-Z]{2,5}$|^GMT[+-−]\d/, "the device's own zone is named");
  assert.equal(toInputValue(ms, "utc"), "2026-11-10T21:14");
  assert.equal(fromInputValue("2026-11-10T21:14", "utc"), ms);
  assert.equal(fromInputValue("2026-11-10T21:14", "local"), new Date(2026, 10, 10, 21, 14).getTime());
  assert.ok(Number.isNaN(fromInputValue("tomorrow", "utc")));
});

test("the stand-in clock counts passed time, keeps its speed while paused and tells its listeners", () => {
  let real = 1_000;
  const clock = createStandInClock({ time: 0, speed: 10, running: true, now: () => real });
  const seen: string[] = [];
  const stop = clock.onChange((change) => seen.push(change.reason));
  real += 1_000;
  assert.equal(clock.time, 10_000);
  clock.pause();
  real += 5_000;
  assert.equal(clock.time, 10_000);
  assert.equal(clock.running, false);
  assert.equal(clock.speed, 10);
  clock.setSpeed(60);
  clock.set(42);
  clock.play();
  assert.deepEqual(seen, ["pause", "speed", "set", "play"]);
  stop();
});

test("the control bar keeps the design's order, and a view leaves out what it cannot do", () => {
  assert.deepEqual([...CONTROL_ORDER], ["slower", "play", "faster", "clock", "now", "place", "layers", "look", "flight"]);
  assert.deepEqual(parseControls(null), [...CONTROL_ORDER]);
  assert.deepEqual(parseControls("flight layers clock play"), ["play", "clock", "layers", "flight"]);
  assert.deepEqual(parseControls("nonsense play"), ["play"]);
  assert.deepEqual(parseLooks("painted line"), ["line", "painted"]);
  assert.equal(nextLook("painted"), "line");
  assert.equal(nextLook("line", ["line", "painted"]), "painted");
});

test("the scale switch has five steps in one order", () => {
  assert.deepEqual([...SCALE_STEPS], ["surface", "moons", "solar", "stars", "galaxy"]);
  assert.deepEqual(parseScaleSteps("galaxy surface"), ["surface", "galaxy"]);
  assert.deepEqual(parseScaleSteps(""), [...SCALE_STEPS]);
});

test("the segmented switch parses its choices; the cultures are three", () => {
  assert.deepEqual(parseSegments("a:Alpha|b|a:Again|:x"), [{ value: "a", label: "Alpha" }, { value: "b", label: "b" }]);
  assert.deepEqual(cultureSegments(WORDS.en).map((one) => one.value), ["western", "japanese", "chinese"]);
  assert.deepEqual(cultureSegments(WORDS.ja).map((one) => one.label), ["西洋", "日本", "中国"]);
});

const SOURCE = { label: "NASA", href: "https://example.org/nasa" };
const CARD: ObjectCardData = {
  kind: { en: "Planet", ja: "惑星" },
  name: { en: "Jupiter", ja: "木星" },
  stats: [
    { id: "radius", label: { en: "Radius", ja: "半径" }, value: 69911, unit: "km", source: SOURCE },
    { id: "sun", label: { en: "From the Sun", ja: "太陽から" }, value: 5.2, unit: "AU", computed: true, source: SOURCE },
  ],
  primary: { label: { en: "Open page", ja: "ページを開く" }, href: "x.html" },
};

test("a card is checked: every number has a source and a computed value is never blank", () => {
  assert.deepEqual(cardProblems(CARD), []);
  const bad: ObjectCardData = { ...CARD, stats: [{ id: "a", label: CARD.stats[0]!.label, value: 1, source: undefined }, { id: "b", label: CARD.stats[0]!.label, value: null, computed: true, source: SOURCE }, { id: "b", label: CARD.stats[0]!.label, value: 2, source: SOURCE }] };
  const problems = cardProblems(bad);
  assert.ok(problems.includes("a has no source link"));
  assert.ok(problems.includes("b is computed and shows no value"));
  assert.ok(problems.includes("two numbers have the id b"));
  assert.ok(cardProblems({ ...CARD, primary: undefined, secondary: CARD.primary! }).includes("there is a second button and no first"));
  assert.ok(cardProblems({ ...CARD, stats: [] }).includes("the card has no numbers"));
});

test("numbers are written the way a card shows them", () => {
  assert.equal(formatValue(142984), "142,984");
  assert.equal(formatValue(1.898e27), "1.898e27");
  assert.equal(formatValue(0.00001234), "1.234e-5");
  assert.equal(formatValue(5.20288), "5.20288");
  assert.equal(formatValue("9 h 56 min"), "9 h 56 min");
  assert.equal(formatValue(null), "—");
  assert.equal(formatValue(Number.NaN), "—");
  assert.equal(formatValue(""), "—");
});

const CREDITS: DoorCredit[] = [
  { own: true, used: 5080, source: { id: "own", name: { en: "Own", ja: "自前" }, credit: { en: "Yale", ja: "イェール" }, licence: { name: "Public domain", url: "https://example.org/pd" }, url: "https://example.org" } },
  { own: false, used: 3, source: { id: "x", name: { en: "X", ja: "エックス" }, credit: { en: "Survey X", ja: "サーベイX" }, licence: { name: "CC BY-NC 3.0 IGO", url: "https://example.org/nc", nonCommercial: true, shareAlike: true }, url: "https://example.org/x" } },
];

test("the layers panel lists outside sources only, and the terms are never hidden", () => {
  const sources = sourcesFromCredits(CREDITS, (id) => id !== "x");
  assert.deepEqual(sources.map((one) => [one.info.id, one.enabled]), [["x", false]]);
  assert.equal(licenceText(CREDITS[1]!.source, WORDS.en), "CC BY-NC 3.0 IGO (non-commercial, share-alike)");
  assert.equal(licenceText(CREDITS[0]!.source, WORDS.en), "Public domain");
  assert.equal(creditsText(CREDITS, "en", WORDS.en), "Yale (Public domain); Survey X (CC BY-NC 3.0 IGO (non-commercial, share-alike)).");
  assert.equal(creditsText([...CREDITS].reverse(), "ja", WORDS.ja).startsWith("イェール"), true, "the package's own data comes first");
  assert.equal(creditsText([], "en", WORDS.en), "");
});

test("the trail reads as text", () => {
  assert.equal(trailText([{ label: "Solar system", href: "a" }, { label: { en: "Jupiter", ja: "木星" } }]), "Solar system / Jupiter 木星");
});

test("a reading page is checked: three tiles, sources, summary", () => {
  const page: ReadingPageData = {
    kind: CARD.kind, name: CARD.name, summary: { en: "A planet.", ja: "惑星です。" }, actions: [CARD.primary!],
    now: [1, 2, 3].map((n) => ({ label: { en: `T${n}`, ja: `T${n}` }, value: n, source: SOURCE })),
    numbers: [{ label: { en: "R", ja: "R" }, value: 1, source: SOURCE }], related: [],
  };
  assert.deepEqual(readingProblems(page), []);
  assert.ok(readingProblems({ ...page, now: page.now.slice(0, 2) }).length > 0);
  assert.ok(readingProblems({ ...page, numbers: [{ label: { en: "R", ja: "R" }, value: 1, source: undefined }] }).includes("R has no source link"));
  assert.ok(readingProblems({ ...page, now: [{ ...page.now[0]!, value: null }, page.now[1]!, page.now[2]!] })[0]!.includes("shows no value"));
});

test("every icon is stroked paths, and the page footer is written for a build", () => {
  for (const name of ICON_NAMES) assert.ok(ICONS[name].length > 0 && ICONS[name].every((d) => /^M/.test(d)), name);
  assert.match(iconSvg("play"), /stroke-width="1.75" stroke-linecap="round"/);
  const footer = pageFooterHtml({ variant: "page", package: "Hoshi Stars", href: "credits.html", citeHref: "cite.html", sheetsHref: "sheets.html" });
  assert.match(footer, /^<kazoku-page-footer variant="page" href="credits.html" package="Hoshi Stars"/);
  assert.match(footer, /Drawn with Hoshi Stars/);
  assert.match(footer, /Sources for every number on this page: <a href="credits.html">Data and credits<\/a>/);
  assert.match(footer, /How to cite/);
  assert.match(footer, /Sheets to print/);
  assert.match(pageFooterHtml({ href: "c.html" }), /Positions computed for the time shown · <a href="c.html">Data and credits<\/a>/);
});
