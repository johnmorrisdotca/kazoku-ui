// Importing this registers <kazoku-time-scrubber>, unless the tag is already taken (the first definition wins).
import { TimeScrubberElement, TAG } from "./element.ts";

export function defineTimeScrubber(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, TimeScrubberElement);
  return true;
}

defineTimeScrubber();
