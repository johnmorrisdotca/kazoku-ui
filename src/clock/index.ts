// The family's clock: one moment, one speed, running or paused, for every view on a page. Pure, no DOM, so it imports on a server.
export { browserSource, createFamilyClock, prefersReducedMotion, type ClockChange, type ClockReason, type ClockSource, type FamilyClock, type FamilyClockOptions } from "./clock.ts";
export { createClockSlot, type ClockSlot } from "./slot.ts";
export { clockAddress, CLOCK_KEYS, readClockAddress } from "./address.ts";
