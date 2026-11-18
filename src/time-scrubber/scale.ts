// The time scrubber's maths, with no DOM, so a server can read a date and a test can step one. Dates are UTC days counted in milliseconds; the time of day is always midnight.

/** The scales, coarse to fine. The scale is how far one arrow key moves and how much of the track one drag covers. */
export const SCALES = ["year", "month", "day"] as const;
export type Scale = (typeof SCALES)[number];

/** The address key for the date, and for its scale (`date-scale`), unless `address-key` names another. */
export const DATE_KEY = "date";
export const DAY_MS = 86_400_000;
/** The range when a page names none. */
export const DEFAULT_FROM = "1900-01-01";
export const DEFAULT_TO = "2100-12-31";

/** The scale a `scale` value names, or `year` for anything else. */
export const scaleOf = (value: string | null | undefined): Scale => (SCALES as readonly string[]).includes(value ?? "") ? (value as Scale) : "year";

/** The scale one step coarser: a month's Page Up moves a year. A year has none coarser, so it moves ten years. */
export const coarserOf = (scale: Scale): Scale | "decade" => (scale === "day" ? "month" : scale === "month" ? "year" : "decade");

const pad = (n: number, width = 2): string => String(Math.abs(n)).padStart(width, "0");

/** Midnight UTC of a year, month (1 to 12) and day, with a month or day that is too big clamped to the month's last day. Years 0 to 99 stay themselves. */
export function utc(year: number, month: number, day: number): number {
  const last = daysIn(year, month);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, Math.min(Math.max(day, 1), last));
  return date.getTime();
}

/** How many days a month has. */
export function daysIn(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
}

/** The year, month (1 to 12) and day of a moment. */
export function partsOf(ms: number): { year: number; month: number; day: number } {
  const date = new Date(ms);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** `2026-11-17`. */
export function isoDate(ms: number): string {
  const { year, month, day } = partsOf(ms);
  return `${year < 0 ? "-" : ""}${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/**
 * Reads a date a reader typed: `2026-11-17`, `2026/11/17`, `2026.11.17`, `2026年11月17日`, `2026-11` (the 1st) or `2026` (January 1st). Full-width digits are fine.
 * @returns The moment, or null when it is not a real date (`2026-02-30` is not one).
 */
export function parseDate(text: string | null | undefined): number | null {
  const clean = (text ?? "").trim().replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10));
  const match = /^(\d{1,4})(?:\s*[-/.年]\s*(\d{1,2})(?:\s*[-/.月]\s*(\d{1,2})\s*日?)?\s*月?)?$/.exec(clean);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] === undefined ? 1 : Number(match[2]);
  const day = match[3] === undefined ? 1 : Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null;
  return utc(year, month, day);
}

/** The reader's own way to write a date: `2026-11-17` in English, `2026年11月17日` in Japanese. */
export function fieldText(ms: number, language: "en" | "ja"): string {
  const { year, month, day } = partsOf(ms);
  return language === "ja" ? `${year}年${month}月${day}日` : isoDate(ms);
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** What a screen reader says for the value: `2026` at the year scale, `November 2026` at the month scale, `17 November 2026` at the day (`2026年11月17日` in Japanese). */
export function valueText(ms: number, scale: Scale, language: "en" | "ja"): string {
  const { year, month, day } = partsOf(ms);
  if (language === "ja") return scale === "year" ? `${year}年` : scale === "month" ? `${year}年${month}月` : `${year}年${month}月${day}日`;
  return scale === "year" ? String(year) : scale === "month" ? `${MONTHS_EN[month - 1]} ${year}` : `${day} ${MONTHS_EN[month - 1]} ${year}`;
}

/** Moves a moment by `n` years, months or days. A year or month that lands past the end of the month (31 March plus a month) keeps the month and takes its last day. */
export function stepBy(ms: number, unit: Scale, n: number): number {
  if (unit === "day") return ms + n * DAY_MS;
  const { year, month, day } = partsOf(ms);
  if (unit === "year") return utc(year + n, month, day);
  const index = year * 12 + (month - 1) + n;
  return utc(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1, day);
}

export const clamp = (ms: number, from: number, to: number): number => Math.min(Math.max(ms, from), to);

/** The stretch of time the track shows: the whole range at the year scale, the current year at the month scale, the current month at the day scale. */
export function windowFor(ms: number, scale: Scale, from: number, to: number): { start: number; end: number } {
  const { year, month } = partsOf(ms);
  if (scale === "year") return { start: from, end: to };
  if (scale === "month") return { start: utc(year, 1, 1), end: utc(year + 1, 1, 1) };
  return { start: utc(year, month, 1), end: stepBy(utc(year, month, 1), "month", 1) };
}

/** Where a moment sits on the track, 0 to 1. */
export const fractionOf = (ms: number, window: { start: number; end: number }): number => (window.end === window.start ? 0 : clamp((ms - window.start) / (window.end - window.start), 0, 1));

/**
 * The moment a point on the track means, snapped to the scale: the year under the pointer (month and day kept, clamped), the month (day kept) or the day.
 * @param fraction 0 to 1 along the track.
 * @param current The moment now, whose finer parts are kept.
 */
export function momentAt(fraction: number, scale: Scale, current: number, from: number, to: number): number {
  const window = windowFor(current, scale, from, to);
  const raw = window.start + clamp(fraction, 0, 1) * (window.end - window.start);
  const at = partsOf(raw);
  const now = partsOf(current);
  let next: number;
  if (scale === "year") next = utc(at.year, now.month, now.day);
  else if (scale === "month") next = utc(now.year, at.month, now.day);
  else next = utc(now.year, now.month, at.day);
  return clamp(next, from, to);
}

/** What a key does to the date: a step of some unit, or a jump to the start or the end of the range. Null for a key the slider ignores. */
export type KeyMove = { to: "from" | "to" } | { by: number; unit: Scale };

/** Arrow keys step one of the scale; Page Up and Page Down step one of the next coarser scale (ten years at the year scale); Home and End go to the ends of the range. */
export function keyMove(key: string, scale: Scale): KeyMove | null {
  const coarser = coarserOf(scale);
  const page = coarser === "decade" ? { by: 10, unit: "year" as const } : { by: 1, unit: coarser };
  switch (key) {
    case "ArrowRight": case "ArrowUp": return { by: 1, unit: scale };
    case "ArrowLeft": case "ArrowDown": return { by: -1, unit: scale };
    case "PageUp": return page;
    case "PageDown": return { by: -page.by, unit: page.unit };
    case "Home": return { to: "from" };
    case "End": return { to: "to" };
    default: return null;
  }
}

/** Applies a key move to a moment and keeps it inside the range. */
export function applyMove(ms: number, move: KeyMove, from: number, to: number): number {
  if ("to" in move) return move.to === "from" ? from : to;
  return clamp(stepBy(ms, move.unit, move.by), from, to);
}

/** The ticks under the track for a window: a label for each decade (year scale), each month, or the 1st, 8th, 15th, 22nd and 29th. Never more than about 14. */
export function ticksFor(window: { start: number; end: number }, scale: Scale, language: "en" | "ja"): { fraction: number; label: string }[] {
  const out: { fraction: number; label: string }[] = [];
  const add = (ms: number, label: string): void => {
    if (ms >= window.start && ms <= window.end) out.push({ fraction: fractionOf(ms, window), label });
  };
  if (scale === "year") {
    const first = partsOf(window.start).year;
    const last = partsOf(window.end).year;
    const span = last - first;
    const every = span <= 14 ? 1 : span <= 70 ? 10 : span <= 140 ? 20 : span <= 350 ? 50 : 100;
    for (let year = Math.ceil(first / every) * every; year <= last; year += every) add(utc(year, 1, 1), String(year));
  } else if (scale === "month") {
    const { year } = partsOf(window.start);
    for (let month = 1; month <= 12; month += 1) add(utc(year, month, 1), language === "ja" ? `${month}月` : MONTHS_EN[month - 1]!.slice(0, 3));
  } else {
    const { year, month } = partsOf(window.start);
    for (const day of [1, 8, 15, 22, 29]) if (day <= daysIn(year, month)) add(utc(year, month, day), String(day));
  }
  return out;
}
