// The clock a view follows. A view (a package's element) has a clock of its own until a page hands it another: while it follows an outside clock it reads the moment from that clock, and
// when it lets go it keeps going from the moment it had. Pure, no DOM, so every package's element does it the same way.
import { createFamilyClock, type ClockChange, type FamilyClock, type FamilyClockOptions } from "./clock.ts";

/** What `createClockSlot` returns. */
export interface ClockSlot {
  /** The clock to read the moment from: the outside clock while one is attached, else the view's own. */
  readonly clock: FamilyClock;
  /** True while an outside clock is attached. */
  readonly attached: boolean;
  /** Follow an outside clock. The view's own clock is let go; its listeners now hear the outside one. */
  attach(outside: FamilyClock): void;
  /** Let go of the outside clock and make an own clock that starts from the moment, the speed and the pause the outside one had. Returns it. Nothing happens when none is attached. */
  detach(): FamilyClock;
  /** Hear changes of whichever clock is in use, one subscription for the life of the slot. Returns the way to stop. */
  onChange(listener: (change: ClockChange) => void): () => void;
  /** Stop hearing the clock in use. */
  dispose(): void;
}

/**
 * The holder of a view's clock. A view asks `slot.clock` at each draw, asks to be drawn again when `onChange` fires, and a page that wants one clock for many views calls `attach` on each.
 * While a clock is attached the view ignores its own `time` and `speed` attributes: a write to either goes to the shared clock (`slot.clock.set`, `slot.clock.setSpeed`).
 *
 * @param options - What the view's own clock starts from; the same as `createFamilyClock`.
 * @returns The slot.
 * @example
 * const slot = createClockSlot({ start: Date.UTC(2026, 0, 1), speed: 60 });
 * const stop = slot.onChange(() => requestDraw());
 * slot.attach(sharedClock);      // the moment now comes from sharedClock
 * slot.clock.time;               // sharedClock's moment
 * slot.detach();                 // an own clock, from that moment, at that speed
 * stop();
 */
export function createClockSlot(options: FamilyClockOptions = {}): ClockSlot {
  const listeners = new Set<(change: ClockChange) => void>();
  let current = createFamilyClock(options);
  let outside = false;
  let unhook: (() => void) | undefined;
  const hook = (): void => {
    unhook?.();
    unhook = current.onChange((change) => {
      for (const listener of [...listeners]) listener(change);
    });
  };
  hook();
  return {
    get clock() {
      return current;
    },
    get attached() {
      return outside;
    },
    attach(clock) {
      if (clock === current) return;
      current = clock;
      outside = true;
      hook();
    },
    detach() {
      if (!outside) return current;
      const gone = current;
      current = createFamilyClock({ ...options, start: gone.time, speed: gone.speed, paused: !gone.running });
      outside = false;
      hook();
      return current;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      unhook?.();
      unhook = undefined;
      listeners.clear();
    },
  };
}
