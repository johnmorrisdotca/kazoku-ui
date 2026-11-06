// Importing this registers <kazoku-options-window>, unless the tag is already taken (the first definition wins).
import { OptionsWindowElement, TAG } from "./element.ts";

/** Registers the options window. Returns false when the tag is already taken. */
export function defineOptionsWindow(registry: CustomElementRegistry = customElements): boolean {
  if (registry.get(TAG) !== undefined) return false;
  registry.define(TAG, OptionsWindowElement);
  return true;
}

defineOptionsWindow();
