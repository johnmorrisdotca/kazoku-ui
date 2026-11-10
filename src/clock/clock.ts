// The family's clock: the moment a page shows, the speed it runs at, and whether it runs. Moved from wakusei-planets' `GameClock` (src/space/clock.ts), whose rules are kept:
// it counts the time that really passed between two looks, never a frame's step; it has no cap of its own; a hold keeps the moment. New here: pause and play, a speed
// that is kept while paused, an opening speed that follows the body in focus until the reader touches the speed, a reduced-motion opening that waits for Play, and
// `onChange`. Pure, no DOM: the page gives it `performance.now()`, a test gives it a clock of its own.

/** A clock's sources of time: the page's monotonic clock (`performance.now()`) and the wall clock (`Date.now()`), both in milliseconds. */
export interface ClockSource {
  /** The page's monotonic clock, from which the time that has passed is taken. */
  now(): number;
  /** The wall clock, for a clock that follows the real time (`"now"` at speed 1). */
  wall(): number;
  /** True while the tab is hidden: a hidden tab sends no `"tick"`. Left out, the document's `visibilityState` is read when there is one. */
  hidden?(): boolean;
}

/** Why a clock told its listeners. */
export type ClockReason = "tick" | "set" | "speed" | "play" | "pause";

/** What a listener is told. */
export interface ClockChange {
  /** The moment, in milliseconds since 1970. */
  time: number;
  speed: number;
  running: boolean;
  reason: ClockReason;
}

/** The clock `createFamilyClock` returns. */
export interface FamilyClock {
  /** The moment as of the last look, in milliseconds since 1970 (UTC, as JavaScript counts). */
  readonly time: number;
  /** Game seconds for each real second: 1 is real time, negative runs backwards. Kept while paused. */
  readonly speed: number;
  /** True while the moment moves: not paused, and the speed is not 0. */
  readonly running: boolean;
  /** True once the reader (or a link) has chosen the speed: from then on `openAt` leaves it alone. */
  readonly touched: boolean;
  /** Bring the moment up to the page's clock at `now` and return it: the time that really passed since the last look, at the speed it ran at, however few frames were drawn. A paused clock keeps its moment. */
  advance(now?: number): number;
  /** Set the moment: milliseconds since 1970, or `"now"` to follow the wall clock. Starts the count again from there. */
  set(time: number | "now", now?: number): void;
  /** The reader chooses the speed. The time up to this moment is worked out at the old speed first. From now on `openAt` leaves the speed alone. */
  setSpeed(speed: number, now?: number): void;
  /** Run from the moment held. A speed of 0 comes back to the speed the clock opened at (1 if it had none). */
  play(now?: number): void;
  /** Hold the moment; the speed is kept. */
  pause(now?: number): void;
  /**
   * The speed a body first shows its motion at: the speed that the body in focus asks for. It is taken only while the reader has not touched the speed, so moving the focus from the Earth to Mars
   * changes the pace of a clock nobody has set, and never of one somebody has. Returns whether it was taken. It does not start or stop the clock.
   */
  openAt(speed: number, now?: number): boolean;
  /** Hear every change: a tick at most 4 a second (none while paused or in a hidden tab), and each `set`, speed change, play and pause at once. Returns the way to stop. */
  onChange(listener: (change: ClockChange) => void): () => void;
}

/** What `createFamilyClock` starts from. Every part is optional: with none, the clock starts at the real time, running, at speed 1. */
export interface FamilyClockOptions {
  /** The moment to start from, in milliseconds since 1970, or `"now"` (the default) to follow the wall clock. A link that names a time is obeyed. */
  start?: number | "now";
  /** The speed the reader or a link chose. Left out, the clock opens at `openingSpeed` and the speed is still the reader's to choose. */
  speed?: number;
  /** The speed the body in focus opens at, in game seconds for each real second (1). */
  openingSpeed?: number;
  /** Start paused (a link that names a pause). Left out, the clock runs, unless `reducedMotion` says to wait. */
  paused?: boolean;
  /** The reader asked for reduced motion: open paused with Play ready (the speed is the opening speed, kept for Play). Left out, the browser's `prefers-reduced-motion` is read. A link's `paused` wins. */
  reducedMotion?: boolean;
  /** The page's clocks; the browser's by default (a test passes its own, such as one that gives five frames a second). */
  source?: ClockSource;
  /** Most often a `"tick"` is sent, in milliseconds (250, which is 4 a second). */
  tickMs?: number;
}

const finite = (value: number | undefined, otherwise: number): number => (typeof value === "number" && Number.isFinite(value) ? value : otherwise);

/**
 * Whether the reader asked their system for reduced motion. False where there is no `matchMedia` (a server, a test).
 * @returns True for `prefers-reduced-motion: reduce`.
 */
export function prefersReducedMotion(): boolean {
  try {
    return typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** The browser's clocks. */
export function browserSource(): ClockSource {
  return {
    now: () => globalThis.performance.now(),
    wall: () => Date.now(),
    hidden: () => (globalThis.document as Document | undefined)?.visibilityState === "hidden",
  };
}

/**
 * The family's clock. It advances by the time that really passed between two looks, never by a frame's step: at 86,400 times real time it moves a day for every real second on any machine,
 * however slowly it draws, so a view drawn five times a second keeps the same time as one drawn sixty. It has no cap of its own: a page that was out of sight finds the moment where the speed
 * would have taken it. Time that does not pass is not counted: a paused clock keeps the moment it had, and `play` starts the count again from there.
 *
 * It opens moving: with no options it starts at the real time, running, at speed 1, and a page that has a body in focus tells it that body's opening speed with `openAt` (or `openingSpeed`).
 * A link that names a time, a speed or a pause is obeyed; a reader who asked for reduced motion gets it paused, with Play ready.
 *
 * @param options - Where it starts; none by default.
 * @returns The clock.
 * @example
 * const clock = createFamilyClock({ start: Date.UTC(2026, 0, 1), speed: 3600 });
 * clock.advance();           // the moment as of this look: an hour of game time for each real second
 * clock.pause();             // the moment is held, the speed (3600) is kept
 * clock.play();              // runs on from the moment held
 * const stop = clock.onChange(({ time, running, reason }) => console.log(reason, new Date(time).toISOString(), running));
 * stop();
 */
export function createFamilyClock(options: FamilyClockOptions = {}): FamilyClock {
  const source = options.source ?? browserSource();
  const tickMs = Math.max(0, finite(options.tickMs, 250));
  const opening = finite(options.openingSpeed, 1);
  const hidden = (): boolean => (source.hidden === undefined ? false : source.hidden());
  const listeners = new Set<(change: ClockChange) => void>();

  let mode: number | "now" = options.start ?? "now";
  let time = mode === "now" ? source.wall() : mode;
  let rate = finite(options.speed, opening);
  let touched = options.speed !== undefined && Number.isFinite(options.speed);
  let resumeRate = rate !== 0 ? rate : opening !== 0 ? opening : 1;
  let paused = options.paused ?? options.reducedMotion ?? prefersReducedMotion();
  let last = source.now();
  let toldAt = -Infinity;

  const running = (): boolean => !paused && rate !== 0;
  const tell = (reason: ClockReason): void => {
    const change: ClockChange = { time, speed: rate, running: running(), reason };
    for (const listener of [...listeners]) listener(change);
  };
  /** Bring the moment up to `now` at the speed it ran at. */
  const bring = (now: number): void => {
    if (running()) {
      if (rate === 1 && mode === "now") time = source.wall();
      else time += Math.max(0, now - last) * rate;
    }
    last = Math.max(last, now);
  };
  /** From here the moment is the one held, not the wall clock's. */
  const hold = (): void => {
    mode = time;
  };

  return {
    get time() {
      return time;
    },
    get speed() {
      return rate;
    },
    get running() {
      return running();
    },
    get touched() {
      return touched;
    },
    advance(now = source.now()) {
      bring(now);
      if (running() && !hidden() && now - toldAt >= tickMs && listeners.size > 0) {
        toldAt = now;
        tell("tick");
      }
      return time;
    },
    set(value, now = source.now()) {
      mode = value;
      time = value === "now" ? source.wall() : value;
      last = now;
      tell("set");
    },
    setSpeed(value, now = source.now()) {
      bring(now);
      hold();
      rate = Number.isFinite(value) ? value : 1;
      if (rate !== 0) resumeRate = rate;
      touched = true;
      last = now;
      tell("speed");
    },
    play(now = source.now()) {
      bring(now);
      if (rate === 0) rate = resumeRate;
      paused = false;
      hold();
      last = now;
      tell("play");
    },
    pause(now = source.now()) {
      bring(now);
      hold();
      paused = true;
      last = now;
      tell("pause");
    },
    openAt(value, now = source.now()) {
      if (touched || !Number.isFinite(value)) return false;
      if (value === rate) return true;
      bring(now);
      hold();
      rate = value;
      if (rate !== 0) resumeRate = rate;
      last = now;
      tell("speed");
      return true;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
