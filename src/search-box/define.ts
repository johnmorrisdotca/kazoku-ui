// Importing this registers <kazoku-search-box>, unless the tag is already taken (the first definition wins).
import { SearchBoxElement, TAG } from "./element.ts";

/** Registers `<kazoku-search-box>` in `registry`, and does nothing when the tag is already taken. Returns whether it registered. */
export function defineSearchBox(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, SearchBoxElement);
  return true;
}

defineSearchBox();
