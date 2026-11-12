// What the control bar needs of a clock, and the words and arithmetic around it: pure, so a page, a build and a test can use it.
// `BarClock` is the part of the family clock (MODULES-832's `createFamilyClock`) the bar drives. See clock-adapter.ts for where the two meet.
import type { Language } from "../shared/language.ts";
import { type InterfaceWords } from "./words.ts";

/** What a clock tells its listeners. `reason` is why: `tick` is the clock moving on by itself, the others are somebody asking. */
export interface BarClockChange {
  time: number;
  speed: number;
  running: boolean;
  reason: "tick" | "set" | "speed" | "play" | "pause";
}

/** The clock the control bar drives: a moment (milliseconds since 1970, UTC), a speed (moment seconds each real second; negative runs back; kept while paused) and a running flag. */
export interface BarClock {
  readonly time: number;
  readonly speed: number;
  readonly running: boolean;
  set(time: number | "now"): void;
  setSpeed(speed: number): void;
  play(): void;
  pause(): void;
  /** Calls `fn` on every change; returns the function that stops listening. */
  onChange(fn: (change: BarClockChange) => void): () => void;
}

/** The speeds Slower and Faster step through: real time, a minute, ten minutes, an hour, a day, a week, a month and a year each second. */
export const SPEED_LADDER: readonly number[] = [1, 60, 600, 3600, 86400, 604800, 2629800, 31557600];

const UNITS: readonly { seconds: number; en: [string, string]; ja: string }[] = [
  { seconds: 31557600, en: ["year", "years"], ja: "年" },
  { seconds: 2629800, en: ["month", "months"], ja: "か月" },
  { seconds: 604800, en: ["week", "weeks"], ja: "週間" },
  { seconds: 86400, en: ["day", "days"], ja: "日" },
  { seconds: 3600, en: ["hour", "hours"], ja: "時間" },
  { seconds: 60, en: ["minute", "minutes"], ja: "分" },
  { seconds: 1, en: ["second", "seconds"], ja: "秒" },
];

const plain = (value: number): string => String(Number(value.toPrecision(3)));

/**
 * A speed in plain words: "1 hour each second", "Real time", "Paused", "2 days each second, backwards"; in Japanese "1秒で1時間".
 * @param speed Moment seconds each real second.
 * @param running False reads "Paused" whatever the speed.
 * @example
 * speedWords(3600, "en", true, WORDS.en); // "1 hour each second"
 */
export function speedWords(speed: number, language: Language, running: boolean, words: Pick<InterfaceWords, "paused" | "realTime" | "backwards">): string {
  if (!running || speed === 0) return words.paused;
  const size = Math.abs(speed);
  let text: string;
  if (size === 1) text = words.realTime;
  else if (size < 1) text = language === "ja" ? `実時間の${plain(size)}倍` : `${plain(size)}× real time`;
  else {
    const unit = UNITS.find((one) => size >= one.seconds) as (typeof UNITS)[number];
    const count = plain(size / unit.seconds);
    text = language === "ja" ? `1秒で${count}${unit.ja}` : `${count} ${count === "1" ? unit.en[0] : unit.en[1]} each second`;
  }
  return speed < 0 ? (language === "ja" ? `${text}、${words.backwards}` : `${text}, ${words.backwards}`) : text;
}

/** The index in `ladder` of the step nearest `size` (by ratio), or -1 for an empty ladder. */
function nearest(size: number, ladder: readonly number[]): number {
  let best = -1;
  let gap = Number.POSITIVE_INFINITY;
  ladder.forEach((step, at) => {
    const far = Math.abs(Math.log((size || step) / step));
    if (far < gap) {
      gap = far;
      best = at;
    }
  });
  return best;
}

/**
 * The speed one press of Faster (`direction` 1) or Slower (-1) gives: the next step of `ladder` in the direction the clock runs, never past an end. A paused clock at 0 starts from the first step.
 * @example
 * stepSpeed(3600, 1); // 86400
 * stepSpeed(-3600, 1); // -86400: Faster keeps the direction
 */
export function stepSpeed(speed: number, direction: 1 | -1, ladder: readonly number[] = SPEED_LADDER): number {
  if (ladder.length === 0) return speed;
  const sign = speed < 0 ? -1 : 1;
  const at = nearest(Math.abs(speed), ladder);
  const next = Math.min(ladder.length - 1, Math.max(0, at + direction));
  return sign * (ladder[next] as number);
}

/** Whether Faster or Slower still has a step to go to from `speed`. */
export function canStep(speed: number, direction: 1 | -1, ladder: readonly number[] = SPEED_LADDER): boolean {
  return ladder.length > 0 && stepSpeed(speed, direction, ladder) !== speed;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The calendar parts of a moment in UTC or in the reader's own zone. */
function partsOf(ms: number, zone: "utc" | "local"): { year: number; month: number; day: number; hour: number; minute: number } {
  const date = new Date(ms);
  return zone === "utc"
    ? { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() }
    : { year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
}

const two = (n: number): string => String(n).padStart(2, "0");

/**
 * The moment as the clock shows it: "10 Nov 2026 · 21:14", in Japanese "2026年11月10日 21:14". A moment that is not a date reads "—".
 * @param zone `local` (the default) for the device's own time zone, or `utc`.
 * @param withZone Name the zone after the time: "10 Nov 2026 · 21:14 MST", "UTC".
 * @example
 * formatMoment(Date.UTC(2026, 10, 10, 21, 14), "en", "utc"); // "10 Nov 2026 · 21:14"
 * formatMoment(Date.UTC(2026, 10, 10, 21, 14), "en", "utc", true); // "10 Nov 2026 · 21:14 UTC"
 */
export function formatMoment(ms: number, language: Language, zone: "utc" | "local" = "local", withZone = false): string {
  if (!Number.isFinite(ms) || Number.isNaN(new Date(ms).getTime())) return "—";
  const p = partsOf(ms, zone);
  const date = language === "ja" ? `${p.year}年${p.month + 1}月${p.day}日` : `${p.day} ${MONTHS[p.month]} ${p.year}`;
  const name = withZone ? ` ${zoneName(ms, language, zone)}` : "";
  return `${date}${language === "ja" ? " " : " · "}${two(p.hour)}:${two(p.minute)}${name}`;
}

/**
 * The short name of the time zone a moment is shown in: "UTC", or the device's own ("MST", "JST", "GMT+1"), which the browser names for that moment (so summer time is right).
 * @example
 * zoneName(Date.UTC(2026, 10, 10, 21, 14), "en", "utc"); // "UTC"
 */
export function zoneName(ms: number, language: Language, zone: "utc" | "local" = "local"): string {
  if (zone === "utc") return "UTC";
  try {
    const part = new Intl.DateTimeFormat(language === "ja" ? "ja-JP" : "en-US", { timeZoneName: "short" }).formatToParts(new Date(ms)).find((one) => one.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** The value a `<input type="datetime-local">` takes for a moment: "2026-11-10T21:14". */
export function toInputValue(ms: number, zone: "utc" | "local" = "local"): string {
  if (!Number.isFinite(ms)) return "";
  const p = partsOf(ms, zone);
  return `${String(p.year).padStart(4, "0")}-${two(p.month + 1)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}

/** The moment a `datetime-local` value names, or `NaN` when it names none. */
export function fromInputValue(text: string, zone: "utc" | "local" = "local"): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(text.trim());
  if (match === null) return Number.NaN;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  if (zone === "utc") {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    date.setUTCFullYear(year);
    return date.getTime();
  }
  const date = new Date(year, month - 1, day, hour, minute);
  date.setFullYear(year);
  return date.getTime();
}
