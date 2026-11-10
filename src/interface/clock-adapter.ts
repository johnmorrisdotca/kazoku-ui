// The one place the control bar meets the family clock.
//
// TODO(MODULES-832): `feat/scene` is building `@johnmorrisdotca/kazoku-ui/clock` (`createFamilyClock`, `FamilyClock`) and it is not on main yet. `BarClock` (clock.ts) is the
// part of the design's `FamilyClock` the bar drives, so a `FamilyClock` is already a `BarClock` and the bar needs no change when it lands. When it does: delete `createStandInClock`
// below, make `BarClock` an alias of `Pick<FamilyClock, ...>` imported from `../clock/index.ts`, and have the demo use `createFamilyClock`.
// Nothing outside the demo and the tests uses `createStandInClock`, and it is not exported from the package.
import type { BarClock, BarClockChange } from "./clock.ts";

/** A clock the demo and the tests drive the bar with until the family clock is on main: a moment, a speed, play and pause, and a count of the real time that passed. */
export function createStandInClock(options: { time?: number | "now"; speed?: number; running?: boolean; now?: () => number } = {}): BarClock & { advance(): void } {
  const real = options.now ?? (() => Date.now());
  let time = options.time === undefined || options.time === "now" ? real() : options.time;
  let speed = options.speed ?? 1;
  // Reduced motion: it opens still, with Play ready (the family clock does the same).
  let running = options.running ?? globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches !== true;
  let last = real();
  const listeners = new Set<(change: BarClockChange) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  // The family clock says "tick" at most four times a second, and not at all while paused or in a hidden tab: so does this.
  const schedule = (): void => {
    const wanted = listeners.size > 0 && running && speed !== 0 && (globalThis.document === undefined || globalThis.document.visibilityState === "visible");
    if (wanted && timer === undefined) {
      timer = setInterval(() => {
        advance();
        tell("tick");
      }, 250);
    } else if (!wanted && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  const tell = (reason: BarClockChange["reason"]): void => {
    listeners.forEach((fn) => fn({ time, speed, running: running && speed !== 0, reason }));
    schedule();
  };
  globalThis.document?.addEventListener("visibilitychange", () => {
    advance();
    schedule();
  });
  const advance = (): void => {
    const at = real();
    if (running) time += (at - last) * speed;
    last = at;
  };
  return {
    get time() {
      advance();
      return time;
    },
    get speed() {
      return speed;
    },
    get running() {
      return running && speed !== 0;
    },
    advance,
    set(next) {
      advance();
      time = next === "now" ? real() : next;
      tell("set");
    },
    setSpeed(next) {
      advance();
      speed = next;
      tell("speed");
    },
    play() {
      advance();
      running = true;
      tell("play");
    },
    pause() {
      advance();
      running = false;
      tell("pause");
    },
    onChange(fn) {
      listeners.add(fn);
      schedule();
      return () => {
        listeners.delete(fn);
        schedule();
      };
    },
  };
}
