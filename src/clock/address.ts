// A clock in the address: `?time=2026-11-10T12:00:00Z&speed=3600&play=off`. A link that names a time, a speed or a pause is obeyed, so a shared link opens where its sender was. Pure.
import type { FamilyClock, FamilyClockOptions } from "./clock.ts";

/** The address keys for the moment, the speed and playing. */
export const CLOCK_KEYS = { time: "time", speed: "speed", play: "play" } as const;

/**
 * What an address says about the clock, as the options `createFamilyClock` takes. `time` is `now`, a number of milliseconds since 1970, or a date and time (`2026-11-10T12:00:00Z`);
 * `speed` is a number; `play` is `on` or `off` (`off` is a pause). Anything else, or a key that is not there, leaves that choice to the clock's own opening.
 *
 * @param search - The address's query string, with or without the `?`, or its `URLSearchParams`.
 * @returns The options the address names.
 * @example
 * readClockAddress("?time=2026-11-10T12:00:00Z&speed=3600&play=off");
 * // { start: 1794312000000, speed: 3600, paused: true }
 */
export function readClockAddress(search: string | URLSearchParams): FamilyClockOptions {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const out: FamilyClockOptions = {};
  const time = params.get(CLOCK_KEYS.time)?.trim();
  if (time === "now") out.start = "now";
  else if (time) {
    const value = /^-?\d+$/.test(time) ? Number(time) : Date.parse(time);
    if (Number.isFinite(value)) out.start = value;
  }
  const speed = params.get(CLOCK_KEYS.speed)?.trim();
  if (speed && Number.isFinite(Number(speed))) out.speed = Number(speed);
  const play = params.get(CLOCK_KEYS.play)?.trim().toLowerCase();
  if (play === "on" || play === "true" || play === "1") out.paused = false;
  else if (play === "off" || play === "false" || play === "0") out.paused = true;
  return out;
}

/**
 * The address keys that say where a clock is, for `applyParams` or an address writer: the moment as a date and time, the speed, and `on` or `off`.
 *
 * @param clock - The clock.
 * @returns The key and value of each choice.
 * @example
 * clockAddress(createFamilyClock({ start: Date.UTC(2026, 0, 1), speed: 60 })); // { time: "2026-01-01T00:00:00.000Z", speed: "60", play: "on" }
 */
export function clockAddress(clock: Pick<FamilyClock, "time" | "speed" | "running">): Record<string, string> {
  return { [CLOCK_KEYS.time]: new Date(clock.time).toISOString(), [CLOCK_KEYS.speed]: String(clock.speed), [CLOCK_KEYS.play]: clock.running ? "on" : "off" };
}
