// Importing this registers <kazoku-replay-bar>, unless the tag is already taken (the first definition wins).
import { ReplayBarElement, TAG } from "./element.ts";

export function defineReplayBar(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, ReplayBarElement);
  return true;
}

defineReplayBar();
