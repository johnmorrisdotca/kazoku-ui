import assert from "node:assert/strict";
import { test } from "node:test";

import { applyMove, fieldText, fractionOf, isoDate, keyMove, momentAt, parseDate, scaleOf, stepBy, ticksFor, utc, valueText, windowFor } from "../src/time-scrubber/scale.ts";
import { WORDS, languageOf, wordsFor } from "../src/time-scrubber/words.ts";

const d = (text: string): number => parseDate(text)!;

test("a typed date is read in the ways a reader writes it, and a date that does not exist is refused", () => {
  assert.equal(isoDate(d("2026-11-17")), "2026-11-17");
  assert.equal(isoDate(d("2026/11/17")), "2026-11-17");
  assert.equal(isoDate(d("2026年11月17日")), "2026-11-17");
  assert.equal(isoDate(d("２０２６-１１-１７")), "2026-11-17");
  assert.equal(isoDate(d("2026-11")), "2026-11-01");
  assert.equal(isoDate(d("1957")), "1957-01-01");
  assert.equal(parseDate("2026-02-30"), null);
  assert.equal(parseDate("2025-02-29"), null);
  assert.equal(isoDate(d("2024-02-29")), "2024-02-29");
  assert.equal(parseDate("2026-13-01"), null);
  assert.equal(parseDate("soon"), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate(null), null);
});

test("years before 100 stay themselves, and the field and the spoken value are written in the reader's language", () => {
  assert.equal(partsYear(utc(33, 4, 3)), 33);
  assert.equal(fieldText(d("2026-11-17"), "en"), "2026-11-17");
  assert.equal(fieldText(d("2026-11-07"), "ja"), "2026年11月7日");
  assert.equal(valueText(d("2026-11-17"), "year", "en"), "2026");
  assert.equal(valueText(d("2026-11-17"), "month", "en"), "November 2026");
  assert.equal(valueText(d("2026-11-17"), "day", "en"), "17 November 2026");
  assert.equal(valueText(d("2026-11-17"), "day", "ja"), "2026年11月17日");
  assert.equal(valueText(d("2026-11-17"), "month", "ja"), "2026年11月");
});
function partsYear(ms: number): number {
  return new Date(ms).getUTCFullYear();
}

test("a step of a month or a year keeps the month and takes its last day when the day does not exist", () => {
  assert.equal(isoDate(stepBy(d("2026-01-31"), "month", 1)), "2026-02-28");
  assert.equal(isoDate(stepBy(d("2024-02-29"), "year", 1)), "2025-02-28");
  assert.equal(isoDate(stepBy(d("2026-01-15"), "month", -1)), "2025-12-15");
  assert.equal(isoDate(stepBy(d("2026-12-15"), "month", 1)), "2027-01-15");
  assert.equal(isoDate(stepBy(d("2026-03-01"), "day", -1)), "2026-02-28");
  assert.equal(isoDate(stepBy(d("2026-03-01"), "month", -26)), "2024-01-01");
});

test("the arrows step one of the scale and the page keys one of the next coarser scale", () => {
  const from = d("1900-01-01");
  const to = d("2100-12-31");
  const at = (key: string, scale: "year" | "month" | "day", start: string): string => isoDate(applyMove(d(start), keyMove(key, scale)!, from, to));
  assert.equal(at("ArrowRight", "day", "2026-11-17"), "2026-11-18");
  assert.equal(at("ArrowLeft", "day", "2026-11-17"), "2026-11-16");
  assert.equal(at("ArrowUp", "month", "2026-11-17"), "2026-12-17");
  assert.equal(at("ArrowDown", "year", "2026-11-17"), "2025-11-17");
  assert.equal(at("PageUp", "day", "2026-11-17"), "2026-12-17");
  assert.equal(at("PageDown", "month", "2026-11-17"), "2025-11-17");
  assert.equal(at("PageUp", "year", "2026-11-17"), "2036-11-17");
  assert.equal(at("Home", "day", "2026-11-17"), "1900-01-01");
  assert.equal(at("End", "month", "2026-11-17"), "2100-12-31");
  assert.equal(at("ArrowRight", "year", "2100-06-01"), "2100-12-31");
  assert.equal(keyMove("a", "day"), null);
});

test("the track shows the whole range, then the year, then the month, and a point on it means a year, a month or a day", () => {
  const from = d("1957-01-01");
  const to = d("2030-12-31");
  const now = d("2026-11-17");
  assert.deepEqual(windowFor(now, "year", from, to), { start: from, end: to });
  assert.equal(isoDate(windowFor(now, "month", from, to).start), "2026-01-01");
  assert.equal(isoDate(windowFor(now, "month", from, to).end), "2027-01-01");
  assert.equal(isoDate(windowFor(now, "day", from, to).end), "2026-12-01");
  assert.equal(isoDate(momentAt(0, "year", now, from, to)), "1957-11-17");
  assert.equal(isoDate(momentAt(1, "year", now, from, to)), "2030-11-17");
  assert.equal(isoDate(momentAt(0.5, "month", now, from, to)), "2026-07-17");
  assert.equal(isoDate(momentAt(0, "day", now, from, to)), "2026-11-01");
  assert.equal(isoDate(momentAt(0.999, "day", now, from, to)), "2026-11-30");
  assert.equal(isoDate(momentAt(-3, "day", now, from, to)), "2026-11-01");
  assert.equal(fractionOf(now, windowFor(now, "day", from, to)).toFixed(3), (16 / 30).toFixed(3));
  assert.equal(fractionOf(from - 1, { start: from, end: to }), 0);
});

test("the ticks stay few, whatever the range", () => {
  const long = ticksFor({ start: d("1900-01-01"), end: d("2100-12-31") }, "year", "en");
  assert.ok(long.length >= 3 && long.length <= 14, String(long.length));
  assert.equal(ticksFor({ start: d("2026-01-01"), end: d("2027-01-01") }, "month", "ja")[0]?.label, "1月");
  assert.equal(ticksFor({ start: d("2026-02-01"), end: d("2026-03-01") }, "day", "en").map((t) => t.label).join(" "), "1 8 15 22");
  assert.equal(scaleOf("day"), "day");
  assert.equal(scaleOf("week"), "year");
});

test("the labels are in both languages, and a page can cover one", () => {
  assert.deepEqual(Object.keys(WORDS.en).sort(), Object.keys(WORDS.ja).sort());
  for (const language of ["en", "ja"] as const) for (const [key, text] of Object.entries(WORDS[language])) assert.ok(text.length > 0, `${language}.${key}`);
  assert.equal(WORDS.ja.year, "年");
  assert.equal(languageOf("ja-JP"), "ja");
  assert.equal(languageOf("en-CA"), "en");
  assert.equal(wordsFor("en", { field: "Jump" }).field, "Jump");
  assert.equal(wordsFor("en", { field: "Jump" }).slider, "Date slider");
});
